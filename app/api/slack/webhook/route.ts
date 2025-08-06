import { NextRequest, NextResponse } from 'next/server'
import { requireAuthentication } from '@/lib/auth/authentication'
import { createServices } from '@/lib/services/ServiceFactory'
import { getAppBaseUrl } from '@/lib/ngrok-url'
import { webhookLogger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // 認証処理
    const userId = await requireAuthentication(request)

    // サービス層で処理
    const { webhookService } = createServices()
    const result = await webhookService.getUserWebhooks(userId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
    }

    return NextResponse.json(result.data)

  } catch (error: any) {
    // 認証エラーの場合は401を返す
    if (error.message && error.message.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    webhookLogger.error({ error }, 'Webhook GET error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    webhookLogger.info('POST /api/slack/webhook called')

    // 認証処理
    const userId = await requireAuthentication(request)
    // リクエストボディの取得
    const { slack_connection_id } = await request.json()
    webhookLogger.debug({ slack_connection_id }, 'Request data received')

    if (!slack_connection_id) {
      webhookLogger.warn('slack_connection_id is missing from request')
      return NextResponse.json(
        { error: 'slack_connection_id is required' },
        { status: 400 }
      )
    }

    // サービス層で処理
    const { webhookService } = createServices()
    const result = await webhookService.createUserWebhook({
      userId,
      slackConnectionId: slack_connection_id,
      appBaseUrl: getAppBaseUrl(request)
    })

    if (!result.success) {
      const logger = webhookLogger.child({ userId, slackConnectionId: slack_connection_id })
      logger.error({ error: result.error }, 'Webhook creation failed')
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
    }

    const logger = webhookLogger.child({ userId, slackConnectionId: slack_connection_id })
    logger.info({
      webhookId: result.data!.webhook.webhook_id,
      message: result.data!.message
    }, 'Webhook operation completed')

    return NextResponse.json(result.data, { status: result.statusCode || 200 })

  } catch (error: any) {
    // 認証エラーの場合は401を返す
    if (error.message && error.message.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    webhookLogger.error({ error }, 'Webhook POST error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('id')

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      )
    }

    // 認証処理
    const userId = await requireAuthentication(request)

    // サービス層で処理
    const { webhookService } = createServices()
    const result = await webhookService.deactivateWebhook(webhookId, userId)

    if (!result.success) {
      webhookLogger.error({ error: result.error, webhookId }, 'Failed to deactivate webhook')
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
    }

    return NextResponse.json({ message: 'Webhook deactivated successfully' })

  } catch (error: any) {
    // 認証エラーの場合は401を返す
    if (error.message && error.message.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    webhookLogger.error({ error }, 'Webhook DELETE error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
