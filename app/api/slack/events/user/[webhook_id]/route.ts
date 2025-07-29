import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSlackMessage } from '@/lib/slack-message'
import { generateTaskTitle } from '@/lib/openai-title'
import { SlackEventPayload, SlackReactionEvent } from '@/types'
import { webhookLogger } from '@/lib/logger'
import crypto from 'crypto'

// デフォルト絵文字設定（ユーザー設定がない場合のフォールバック）
const DEFAULT_EMOJI_SETTINGS = {
  today_emoji: 'fire',
  tomorrow_emoji: 'calendar',
  later_emoji: 'memo'
}

interface RouteParams {
  params: {
    webhook_id: string
  }
}

async function verifySlackSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  const signature = request.headers.get('x-slack-signature')
  const timestamp = request.headers.get('x-slack-request-timestamp')

  // Slack App全体で共通のSigning Secretを使用
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET

  webhookLogger.debug({
    hasSignature: !!signature,
    hasTimestamp: !!timestamp,
    hasSigningSecret: !!slackSigningSecret
  }, 'Verifying Slack signature')

  if (!signature || !timestamp || !slackSigningSecret) {
    webhookLogger.error('Missing required headers or signing secret')
    return false
  }

  // タイムスタンプの検証（5分以内）
  const currentTime = Math.floor(Date.now() / 1000)
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    webhookLogger.error('Request timestamp too old')
    return false
  }

  // 署名の検証
  const sigBasestring = `v0:${timestamp}:${body}`
  const expectedSignature = `v0=${crypto
    .createHmac('sha256', slackSigningSecret)
    .update(sigBasestring)
    .digest('hex')}`

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )

  webhookLogger.debug({
    isValid,
    receivedSignature: signature.substring(0, 20) + '...',
    expectedSignature: expectedSignature.substring(0, 20) + '...'
  }, 'Signature verification result')

  return isValid
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { webhook_id } = params
    const body = await request.text()
    const logger = webhookLogger.child({ webhookId: webhook_id })
    logger.info({ bodyPreview: body.substring(0, 200) }, 'Webhook event received')

    // webhook設定を取得 - service_roleキーを使用してRLSをバイパス
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    logger.debug({ webhookId: webhook_id }, 'Looking for webhook in database')

    // まず全てのwebhookを確認
    const { data: allWebhooks } = await supabase
      .from('user_slack_webhooks')
      .select('webhook_id, is_active, user_id')

    logger.debug({ webhookCount: allWebhooks?.length || 0 }, 'All webhooks in database')

    // webhookの基本情報を取得
    const { data: webhook, error: webhookError } = await supabase
      .from('user_slack_webhooks')
      .select('id, user_id, webhook_secret, is_active, event_count, slack_connection_id')
      .eq('webhook_id', webhook_id)
      .eq('is_active', true)
      .single()

    if (webhookError || !webhook) {
      logger.error({ error: webhookError?.message }, 'Webhook not found or inactive')
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    // ユーザー情報と絵文字設定を取得（強制的に最新データを取得）
    logger.debug({
      webhookUserId: webhook.user_id,
      action: 'fetching_user_data'
    }, 'Fetching user data and emoji settings')

    const { data: userWithSettings, error: userFetchError } = await supabase
      .from('users')
      .select(`
        slack_user_id,
        user_emoji_settings (
          today_emoji,
          tomorrow_emoji,
          later_emoji
        )
      `)
      .eq('id', webhook.user_id)
      .single()

    if (userFetchError) {
      logger.error({
        error: userFetchError,
        webhookUserId: webhook.user_id
      }, 'Failed to fetch user data')
    }

    // 追加で直接ユーザーテーブルからSlack User IDだけを取得して確認
    const { data: userSlackIdData, error: slackIdError } = await supabase
      .from('users')
      .select('slack_user_id')
      .eq('id', webhook.user_id)
      .single()

    logger.debug({
      webhookUserId: webhook.user_id,
      userWithSettingsSlackId: userWithSettings?.slack_user_id,
      directQuerySlackId: userSlackIdData?.slack_user_id,
      userFetchError: userFetchError?.message,
      slackIdError: slackIdError?.message
    }, 'User Slack ID lookup results comparison')

    // Slack接続情報を取得
    const { data: slackConnection } = await supabase
      .from('slack_connections')
      .select('access_token, workspace_id, workspace_name')
      .eq('id', webhook.slack_connection_id)
      .single()

    logger.debug({
      webhookFound: true,
      userId: webhook.user_id,
      userSlackId: userWithSettings?.slack_user_id,
      hasSlackConnection: !!slackConnection
    }, 'Webhook and related data query result')

    let payload: SlackEventPayload
    try {
      payload = JSON.parse(body)
    } catch (error) {
      logger.error({ error }, 'Invalid JSON payload')
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // URL verification (初回設定時のチャレンジレスポンス)
    if (payload.type === 'url_verification') {
      logger.info({ challenge: payload.challenge }, 'URL verification challenge received')
      return NextResponse.json({ challenge: payload.challenge })
    }

    // 署名検証（セキュリティ）
    const isValidSignature = await verifySlackSignature(
      request,
      body
    )

    if (!isValidSignature) {
      logger.error('Invalid Slack signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // イベント処理
    if (payload.type === 'event_callback' && payload.event.type === 'reaction_added') {
      const event = payload.event

      logger.info({
        reaction: event.reaction,
        user: event.user,
        channel: event.item.channel,
        ts: event.item.ts
      }, 'Processing reaction_added event')

      // ユーザー検証：リアクションしたユーザーが連携を行ったユーザー本人かチェック
      // 複数ソースからSlack User IDを取得
      const userSlackId = userWithSettings?.slack_user_id || userSlackIdData?.slack_user_id

      logger.info({
        webhookUserId: webhook.user_id,
        reactionUser: event.user,
        configuredSlackUserId: userSlackId,
        hasUserWithSettings: !!userWithSettings,
        hasDirectQuery: !!userSlackIdData,
        dataSourceUsed: userWithSettings?.slack_user_id ? 'userWithSettings' : 'directQuery'
      }, 'User verification data for reaction')

      if (!userSlackId) {
        logger.warn({
          webhookUserId: webhook.user_id,
          reactionUser: event.user,
          userFetchError: userFetchError?.message,
          slackIdError: slackIdError?.message,
          userWithSettings: !!userWithSettings,
          userSlackIdData: !!userSlackIdData
        }, 'User has not configured Slack User ID - cannot verify reaction ownership')
        return NextResponse.json({
          error: 'Slack User ID not configured. Please set your Slack User ID in the settings.'
        }, { status: 400 })
      }

      if (event.user !== userSlackId) {
        logger.debug({
          webhookUserId: webhook.user_id,
          expectedSlackUser: userSlackId,
          actualReactionUser: event.user,
          userMismatch: true
        }, 'Reaction from different user - ignoring (not the webhook owner)')
        return NextResponse.json({
          message: 'Reaction ignored - only the webhook owner can create tasks'
        })
      }

      logger.debug({
        verifiedUser: event.user,
        webhookUserId: webhook.user_id
      }, 'User verification successful')

      // イベント重複チェック
      const eventKey = `${event.item.channel}:${event.item.ts}:${event.reaction}:${event.user}`
      logger.debug({
        eventKey,
        channel: event.item.channel,
        messageTs: event.item.ts,
        reaction: event.reaction,
        user: event.user
      }, 'Checking for duplicate event')

      const { data: existingEvent } = await supabase
        .from('slack_event_processed')
        .select('id, todo_id, processed_at')
        .eq('event_key', eventKey)
        .single()

      if (existingEvent) {
        logger.info({
          eventKey,
          existingTodoId: existingEvent.todo_id,
          processedAt: existingEvent.processed_at,
          duplicateDetected: true
        }, 'Duplicate event detected - skipping processing')

        return NextResponse.json({
          message: 'Event already processed',
          existingTodoId: existingEvent.todo_id
        })
      }

      logger.debug({ eventKey }, 'Event is new - proceeding with processing')

      // ユーザーの絵文字設定を取得（設定が存在しない場合はデフォルト値を使用）
      let userEmojiSettings = DEFAULT_EMOJI_SETTINGS

      if (userWithSettings?.user_emoji_settings && Array.isArray(userWithSettings.user_emoji_settings) && userWithSettings.user_emoji_settings.length > 0) {
        userEmojiSettings = userWithSettings.user_emoji_settings[0]
      } else if (userWithSettings?.user_emoji_settings && !Array.isArray(userWithSettings.user_emoji_settings)) {
        userEmojiSettings = userWithSettings.user_emoji_settings
      }

      const taskEmojis = [
        userEmojiSettings.today_emoji,
        userEmojiSettings.tomorrow_emoji,
        userEmojiSettings.later_emoji
      ]

      logger.debug({
        userEmojiSettings,
        taskEmojis,
        reaction: event.reaction
      }, 'Using emoji settings for task creation')

      // 対象絵文字かチェック
      if (!taskEmojis.includes(event.reaction)) {
        logger.debug({
          reaction: event.reaction,
          configuredEmojis: taskEmojis
        }, 'Ignoring non-configured emoji')
        return NextResponse.json({ message: 'Emoji not configured for task creation' })
      }

      // 非同期でタスク処理を実行（Slackへの高速レスポンスのため）
      processReactionEvent(event, webhook, userEmojiSettings, slackConnection, eventKey)
        .then((todoId) => {
          if (todoId) {
            webhookLogger.info({
              eventKey,
              todoId,
              webhook_id: webhook.id
            }, 'Background task processing completed')
          }
        })
        .catch((error) => {
          webhookLogger.error({
            error,
            eventKey,
            webhook_id: webhook.id
          }, 'Background task processing failed')
        })

      // 即座にSlackにレスポンスを返す（3秒制限内）
      logger.info({
        eventKey,
        backgroundProcessing: true
      }, 'Event queued for background processing')
    }

    // イベント統計更新（非同期で実行しつつエラーはログのみ）
    supabase
      .from('user_slack_webhooks')
      .update({
        last_event_at: new Date().toISOString(),
        event_count: webhook.event_count + 1
      })
      .eq('id', webhook.id)
      .then(({ error }) => {
        if (error) {
          webhookLogger.warn({ error, webhook_id: webhook.id }, 'Failed to update webhook stats')
        } else {
          webhookLogger.debug({ webhook_id: webhook.id }, 'Webhook stats updated')
        }
      })

    return NextResponse.json({ message: 'Event received and queued for processing' })

  } catch (error) {
    webhookLogger.error({ error }, 'Slack event processing error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processReactionEvent(
  event: SlackReactionEvent,
  webhook: any,
  emojiSettings: any,
  slackConnection: any,
  eventKey: string
): Promise<string | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    // Slack接続からアクセストークンを取得
    if (!slackConnection) {
      webhookLogger.error({ webhookId: webhook.id }, 'No Slack connection found for webhook')
      return null
    }
    const slackToken = slackConnection.access_token

    const logger = webhookLogger.child({
      userId: webhook.user_id,
      channel: event.item.channel,
      messageTs: event.item.ts
    })
    logger.debug('Fetching Slack message')

    // メッセージ内容を取得
    const messageData = await getSlackMessage(event.item.channel, event.item.ts, slackToken)

    if (!messageData) {
      logger.warn('No message data found for reaction')
      return null
    }

    if (!messageData.text) {
      logger.warn({ messageUser: messageData.user }, 'Message found but no text content')
      return null
    }

    logger.debug('Message content retrieved successfully')

    // タイトルを自動生成
    let title: string
    try {
      title = await generateTaskTitle(messageData.text)
      logger.debug({ title }, 'Generated title from AI')
    } catch (titleError) {
      title = `Slack reaction: ${event.reaction}`
      logger.warn({ error: titleError, fallbackTitle: title }, 'Title generation failed, using fallback')
    }

    // 緊急度を絵文字から決定
    let urgency: 'today' | 'tomorrow' | 'later' = 'later'
    if (event.reaction === emojiSettings.today_emoji) {
      urgency = 'today'
    } else if (event.reaction === emojiSettings.tomorrow_emoji) {
      urgency = 'tomorrow'
    } else if (event.reaction === emojiSettings.later_emoji) {
      urgency = 'later'
    }
    // 期限を設定
    let deadline: string | null = null
    const today = new Date()
    if (urgency === 'today') {
      deadline = today.toISOString().split('T')[0]
    } else if (urgency === 'tomorrow') {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      deadline = tomorrow.toISOString().split('T')[0]
    }

    // 初期重要度スコアを設定（READMEの仕様に基づく）
    let importance_score = 0.5
    if (deadline) {
      const deadlineDate = new Date(deadline)
      const todayDate = new Date(today.toISOString().split('T')[0])

      if (deadlineDate < todayDate) {
        // 期限切れ
        importance_score = 0.7
      } else if (deadlineDate.getTime() === todayDate.getTime()) {
        // 今日期限
        importance_score = 0.6
      } else {
        // その他（0.3-0.7のランダム値）
        importance_score = 0.3 + Math.random() * 0.4
      }
    }

    // タスクを作成（urgencyフィールドは削除）
    const { data: newTodo, error: createError } = await supabase
      .from('todos')
      .insert({
        user_id: webhook.user_id,
        title,
        body: messageData.text,
        deadline,
        status: 'open',
        importance_score
      })
      .select()
      .single()

    if (createError) {
      logger.error({ error: createError }, 'Failed to create todo')
      return null
    }

    logger.info({
      todoId: newTodo.id,
      title: newTodo.title,
      deadline: newTodo.deadline,
      importanceScore: newTodo.importance_score
    }, 'Task created successfully')

    // イベント処理完了を記録（重複防止用）
    const { error: recordError } = await supabase
      .from('slack_event_processed')
      .insert({
        event_key: eventKey,
        user_id: webhook.user_id,
        channel_id: event.item.channel,
        message_ts: event.item.ts,
        reaction: event.reaction,
        todo_id: newTodo.id
      })

    if (recordError) {
      logger.warn({
        error: recordError,
        eventKey,
        todoId: newTodo.id
      }, 'Failed to record processed event - may allow duplicates')
    } else {
      logger.debug({
        eventKey,
        todoId: newTodo.id
      }, 'Event processing recorded successfully')
    }

    return newTodo.id

  } catch (error) {
    webhookLogger.error({ error }, 'Error processing reaction event')
    throw error
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { webhook_id } = params
  return NextResponse.json({
    webhook_id,
    status: 'active',
    message: 'Slack Events API webhook endpoint'
  })
}
