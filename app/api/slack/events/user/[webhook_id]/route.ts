import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSlackMessage } from '@/lib/slack-message'
import { generateTaskTitle } from '@/lib/openai-title'
import { SlackEventPayload, SlackReactionEvent } from '@/types'
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

  console.log('🔐 Verifying Slack signature:', {
    hasSignature: !!signature,
    hasTimestamp: !!timestamp,
    hasSigningSecret: !!slackSigningSecret
  })

  if (!signature || !timestamp || !slackSigningSecret) {
    console.error('❌ Missing required headers or signing secret')
    return false
  }

  // タイムスタンプの検証（5分以内）
  const currentTime = Math.floor(Date.now() / 1000)
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    console.error('❌ Request timestamp too old')
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

  console.log('🔐 Signature verification result:', {
    isValid,
    receivedSignature: signature.substring(0, 20) + '...',
    expectedSignature: expectedSignature.substring(0, 20) + '...'
  })

  return isValid
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { webhook_id } = params
    const body = await request.text()
    console.log('🔔 Webhook event received:', { webhook_id, body: body.substring(0, 200) })

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
    console.log('🔍 Looking for webhook_id:', webhook_id)

    // まず全てのwebhookを確認
    const { data: allWebhooks } = await supabase
      .from('user_slack_webhooks')
      .select('webhook_id, is_active, user_id')

    console.log('📋 All webhooks in DB:', allWebhooks)

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
        )
      `)
      .eq('webhook_id', webhook_id)
      .eq('is_active', true)
      .single()

    console.log('🔍 Webhook query result:', { webhook, webhookError })

    if (webhookError || !webhook) {
      console.error('❌ Webhook not found or inactive:', webhookError)
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    let payload: SlackEventPayload
    try {
      payload = JSON.parse(body)
    } catch (error) {
      console.error('❌ Invalid JSON payload:', error)
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // URL verification (初回設定時のチャレンジレスポンス)
    if (payload.type === 'url_verification') {
      console.log('✅ URL verification challenge:', payload.challenge)
      return NextResponse.json({ challenge: payload.challenge })
    }

    // 署名検証（セキュリティ）
    const isValidSignature = await verifySlackSignature(
      request,
      body
    )

    if (!isValidSignature) {
      console.error('❌ Invalid Slack signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // イベント処理
    if (payload.type === 'event_callback' && payload.event.type === 'reaction_added') {
      const event = payload.event

      console.log('🎯 Processing reaction_added event:', {
        reaction: event.reaction,
        user: event.user,
        channel: event.item.channel,
        ts: event.item.ts
      })

      // 対象絵文字かチェック
      if (!TASK_EMOJIS.includes(event.reaction)) {
        console.log('⏭️ Ignoring non-target emoji:', event.reaction)
        return NextResponse.json({ message: 'Emoji not configured for task creation' })
      }

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
    console.error('❌ Slack event processing error:', error)
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

    console.log('📝 Fetching Slack message:', {
      channel: event.item.channel,
      ts: event.item.ts
    })

    // メッセージ内容を取得
    const messageData = await getSlackMessage(event.item.channel, event.item.ts, slackToken)

    if (!messageData) {
      console.warn('⚠️ No message data found for reaction:', {
        channel: event.item.channel,
        ts: event.item.ts
      })
      return
    }

    if (!messageData.text) {
      console.warn('⚠️ Message found but no text content:', {
        channel: event.item.channel,
        ts: event.item.ts,
        user: messageData.user
      })
      return
    }

    console.log('✅ Message content retrieved successfully')

    // タイトルを自動生成
    let title: string
    try {
      title = await generateTaskTitle(messageData.text)
      console.log('🤖 Generated title:', title)
    } catch (titleError) {
      console.error('⚠️ Title generation failed, using fallback:', titleError)
      title = `Slack reaction: ${event.reaction}`
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
      console.error('❌ Failed to create todo:', createError)
      return
    }

    console.log('✅ Task created successfully:', {
      id: newTodo.id,
      title: newTodo.title,
      urgency: newTodo.urgency,
      deadline: newTodo.deadline
    })

  } catch (error) {
    console.error('❌ Error processing reaction event:', error)
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
