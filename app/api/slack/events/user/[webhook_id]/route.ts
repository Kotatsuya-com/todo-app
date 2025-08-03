import { NextRequest, NextResponse } from 'next/server'
import { SlackEventPayload } from '@/types'
import { webhookLogger } from '@/lib/logger'
import { verifySlackSignature } from '@/lib/slack-signature'
import { SlackService } from '@/lib/services/SlackService'
import { SlackRepository } from '@/lib/repositories/SlackRepository'
import { TodoRepository } from '@/lib/repositories/TodoRepository'
import { SupabaseRepositoryContext } from '@/lib/repositories/BaseRepository'

interface RouteParams {
  params: {
    webhook_id: string
  }
}

// サービス層のインスタンス作成
const createServices = () => {
  const context = new SupabaseRepositoryContext()
  const slackRepo = new SlackRepository(context)
  const todoRepo = new TodoRepository(context)
  const slackService = new SlackService(slackRepo, todoRepo)

  return { slackService }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { webhook_id } = params
    const body = await request.text()
    const logger = webhookLogger.child({ webhookId: webhook_id })
    logger.info({ bodyPreview: body.substring(0, 200) }, 'Webhook event received')

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
    const isValidSignature = await verifySlackSignature(request, body)

    if (!isValidSignature) {
      logger.error('Invalid Slack signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // サービス層でイベント処理
    const { slackService } = createServices()
    const result = await slackService.processWebhookEvent(webhook_id, payload)

    if (!result.success) {
      logger.error({ error: result.error }, 'Webhook processing failed')
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
    }

    logger.info({ result: result.data }, 'Webhook processing completed')
    return NextResponse.json(result.data)

  } catch (error) {
    webhookLogger.error({ error }, 'Slack event processing error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
