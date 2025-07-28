import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSlackMessage } from '@/lib/slack-message'
import { generateTaskTitle } from '@/lib/openai-title'
import { SlackEventPayload, SlackReactionEvent } from '@/types'
import { webhookLogger } from '@/lib/logger'
import crypto from 'crypto'

// タスク作成対象の絵文字リスト
const TASK_EMOJIS = ['memo', 'clipboard', 'pencil', 'spiral_note_pad', 'page_with_curl']

// 緊急度マッピング
const URGENCY_MAPPING: Record<string, 'today' | 'tomorrow' | 'later'> = {
  'memo': 'today',
  'clipboard': 'today',
  'pencil': 'tomorrow',
  'spiral_note_pad': 'tomorrow',
  'page_with_curl': 'later'
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

    const { data: webhook, error: webhookError } = await supabase
      .from('user_slack_webhooks')
      .select(`
        id,
        user_id,
        webhook_secret,
        is_active,
        event_count,
        slack_connection_id,
        slack_connections (
          access_token,
          workspace_id,
          workspace_name
        ),
        users (
          slack_user_id
        )
      `)
      .eq('webhook_id', webhook_id)
      .eq('is_active', true)
      .single()

    logger.debug({
      webhookFound: !!webhook,
      error: webhookError?.message,
      userId: webhook?.user_id,
      userSlackId: (Array.isArray(webhook?.users) ? webhook?.users[0] : webhook?.users)?.slack_user_id
    }, 'Webhook query result')

    if (webhookError || !webhook) {
      logger.error({ error: webhookError?.message }, 'Webhook not found or inactive')
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

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

      // 対象絵文字かチェック
      if (!TASK_EMOJIS.includes(event.reaction)) {
        logger.debug({ reaction: event.reaction }, 'Ignoring non-target emoji')
        return NextResponse.json({ message: 'Emoji not configured for task creation' })
      }

      // ユーザー検証：リアクションしたユーザーが連携を行ったユーザー本人かチェック
      const userData = Array.isArray(webhook.users) ? webhook.users[0] : webhook.users
      const userSlackId = userData?.slack_user_id

      if (!userSlackId) {
        logger.debug({
          webhookUserId: webhook.user_id,
          reactionUser: event.user
        }, 'User has not configured Slack User ID - cannot verify reaction ownership')
        return NextResponse.json({
          error: 'Slack User ID not configured. Please set your Slack User ID in the settings.'
        }, { status: 400 })
      }

      if (event.user !== userSlackId) {
        logger.debug({
          webhookUserId: webhook.user_id,
          expectedSlackUser: userSlackId,
          actualReactionUser: event.user
        }, 'Reaction from unauthorized user - ignoring')
        return NextResponse.json({
          message: 'Reaction ignored - only the webhook owner can create tasks'
        })
      }

      logger.debug({
        verifiedUser: event.user,
        webhookUserId: webhook.user_id
      }, 'User verification successful')

      await processReactionEvent(event, webhook)
    }

    // イベント統計更新
    await supabase
      .from('user_slack_webhooks')
      .update({
        last_event_at: new Date().toISOString(),
        event_count: webhook.event_count + 1
      })
      .eq('id', webhook.id)

    return NextResponse.json({ message: 'Event processed successfully' })

  } catch (error) {
    webhookLogger.error({ error }, 'Slack event processing error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processReactionEvent(
  event: SlackReactionEvent,
  webhook: any
) {
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
    // slack_connectionsは配列で返される可能性があるため対応
    const slackConnection = Array.isArray(webhook.slack_connections)
      ? webhook.slack_connections[0]
      : webhook.slack_connections
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
      return
    }

    if (!messageData.text) {
      logger.warn({ messageUser: messageData.user }, 'Message found but no text content')
      return
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
    const urgency = URGENCY_MAPPING[event.reaction] || 'later'
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
      return
    }

    logger.info({
      todoId: newTodo.id,
      title: newTodo.title,
      deadline: newTodo.deadline,
      importanceScore: newTodo.importance_score
    }, 'Task created successfully')

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
