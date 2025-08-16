/**
 * API Handler Factory
 * 依存性注入を使用したAPIハンドラーの生成
 */

import { NextRequest, NextResponse } from 'next/server'
import { DependencyContainer } from '@/lib/containers/DependencyContainer'

/**
 * APIハンドラーの型定義
 */
export type APIHandler = (_request: NextRequest, _context?: any) => Promise<NextResponse>

/**
 * Webhook API ハンドラーのファクトリー
 */
export function createWebhookHandlers(container: DependencyContainer) {
  const GET: APIHandler = async (request: NextRequest) => {
    try {
      // 認証処理
      const userId = await container.auth.requireAuthentication(request)

      // サービス層で処理
      const result = await container.services.webhookService.getUserWebhooks(userId)

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
      }

      return NextResponse.json(result.data)

    } catch (error: any) {
      // 認証エラーの場合は401を返す
      if (error.message && (
        error.message.includes('Authentication') ||
        error.message.includes('Auth service') ||
        error.message.includes('Unauthorized')
      )) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      container?.utils?.webhookLogger.error({ error }, 'Webhook GET error')
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  const POST: APIHandler = async (request: NextRequest) => {
    try {
      container?.utils?.webhookLogger.info('POST /api/slack/webhook called')

      // 認証処理
      const userId = await container.auth.requireAuthentication(request)

      // リクエストボディの取得
      const { slack_connection_id } = await request.json()
      container?.utils?.webhookLogger.debug({ slack_connection_id }, 'Request data received')

      if (!slack_connection_id) {
        container?.utils?.webhookLogger.warn('slack_connection_id is missing from request')
        return NextResponse.json(
          { error: 'slack_connection_id is required' },
          { status: 400 }
        )
      }

      // サービス層で処理
      const result = await container.services.webhookService.createUserWebhook({
        userId,
        slackConnectionId: slack_connection_id,
        appBaseUrl: container?.utils?.getAppBaseUrl(request)
      })

      if (!result.success) {
        const logger = container?.utils?.webhookLogger.child({ userId, slackConnectionId: slack_connection_id })
        logger.error({ error: result.error }, 'Webhook creation failed')
        return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
      }

      const logger = container?.utils?.webhookLogger.child({ userId, slackConnectionId: slack_connection_id })
      logger.info({
        webhookId: result.data!.webhook.webhook_id,
        message: result.data!.message
      }, 'Webhook operation completed')

      return NextResponse.json(result.data, { status: result.statusCode || 200 })

    } catch (error: any) {
      // 認証エラーの場合は401を返す
      if (error.message && (
        error.message.includes('Authentication') ||
        error.message.includes('Auth service') ||
        error.message.includes('Unauthorized')
      )) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      container?.utils?.webhookLogger.error({ error }, 'Webhook POST error')
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  const DELETE: APIHandler = async (request: NextRequest) => {
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
      const userId = await container.auth.requireAuthentication(request)

      // サービス層で処理
      const result = await container.services.webhookService.deactivateWebhook(webhookId, userId)

      if (!result.success) {
        container?.utils?.webhookLogger.error({ error: result.error, webhookId }, 'Failed to deactivate webhook')
        return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
      }

      return NextResponse.json({ message: 'Webhook deactivated successfully' })

    } catch (error: any) {
      // 認証エラーの場合は401を返す
      if (error.message && (
        error.message.includes('Authentication') ||
        error.message.includes('Auth service') ||
        error.message.includes('Unauthorized')
      )) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      container?.utils?.webhookLogger.error({ error }, 'Webhook DELETE error')
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  return { GET, POST, DELETE }
}

/**
 * Slack Events API ハンドラーのファクトリー
 */
export function createSlackEventsHandlers(container: DependencyContainer) {
  const POST: APIHandler = async (request: NextRequest, { params }: { params: { webhook_id: string } }) => {
    try {
      const { webhook_id } = params
      const body = await request.text()
      const logger = container?.utils?.webhookLogger?.child ?
        container?.utils?.webhookLogger.child({ webhookId: webhook_id }) :
        console
      logger.info({ bodyPreview: body.substring(0, 200) }, 'Webhook event received')

      let payload: any
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
      const isValidSignature = container?.utils?.verifySlackSignature ?
        await container?.utils?.verifySlackSignature(request, body) :
        true

      if (!isValidSignature) {
        logger.error('Invalid Slack signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }

      // サービス層でイベント処理
      if (!container?.services?.slackService) {
        throw new Error('Slack service not available')
      }
      const result = await container.services.slackService.processWebhookEvent(webhook_id, payload)

      if (!result.success) {
        logger.error({ error: result.error }, 'Webhook processing failed')
        return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
      }

      logger.info({ result: result.data }, 'Webhook processing completed')
      return NextResponse.json(result.data)

    } catch (error) {
      const logger = container?.utils?.webhookLogger || console
      logger.error({ error }, 'Slack event processing error')
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }

  const GET: APIHandler = async (request: NextRequest, { params }: { params: { webhook_id: string } }) => {
    const { webhook_id } = params
    return NextResponse.json({
      webhook_id,
      status: 'active',
      message: 'Slack Events API webhook endpoint'
    })
  }

  return { GET, POST }
}

/**
 * 汎用的なAPIハンドラーファクトリー
 */
export interface HandlerFactoryConfig {
  requireAuth?: boolean
  logRequests?: boolean
}

export function createGenericHandlers(
  container: DependencyContainer,
  handlerLogic: {
    GET?: (_request: NextRequest, _userId?: string) => Promise<NextResponse>
    POST?: (_request: NextRequest, _userId?: string) => Promise<NextResponse>
    PUT?: (_request: NextRequest, _userId?: string) => Promise<NextResponse>
    DELETE?: (_request: NextRequest, _userId?: string) => Promise<NextResponse>
  },
  config: HandlerFactoryConfig = {}
) {
  const createHandler = (method: keyof typeof handlerLogic): APIHandler => {
    return async (request: NextRequest, _context?: any) => {
      try {
        if (config.logRequests && container?.utils?.webhookLogger) {
          container?.utils?.webhookLogger.info(`${method} ${request.url} called`)
        }

        let userId: string | undefined

        if (config.requireAuth !== false) {
          if (!container?.auth?.requireAuthentication) {
            throw new Error('Authentication service not available')
          }
          userId = await container.auth.requireAuthentication(request)
        }

        const handlerFn = handlerLogic[method]
        if (!handlerFn) {
          return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
        }

        return await handlerFn(request, userId)

      } catch (error: any) {
        if (error.message && (
          error.message.includes('Authentication') ||
          error.message.includes('Auth service') ||
          error.message.includes('Unauthorized')
        )) {
          return NextResponse.json({ error: error.message }, { status: 401 })
        }
        const logger = container?.utils?.webhookLogger || console
        logger.error({ error }, `${method} handler error`)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }
    }
  }

  const handlers: Record<string, APIHandler> = {}

  Object.keys(handlerLogic).forEach(method => {
    handlers[method] = createHandler(method as keyof typeof handlerLogic)
  })

  return handlers
}

/**
 * Slack Integration Disconnect API ハンドラーのファクトリー
 */
export function createDisconnectHandlers(container: DependencyContainer) {
  const DELETE: APIHandler = async (request: NextRequest) => {
    try {
      // 1. ユーザー認証 (SlackDisconnectionService経由)
      const authResult = await container.services.slackDisconnectionService.authenticateUser(request)
      if (!authResult.success) {
        return NextResponse.json(
          { error: authResult.error },
          { status: authResult.statusCode || 401 }
        )
      }

      const user = authResult.data!

      // 2. Slack統合の完全切断
      const disconnectionResult = await container.services.slackDisconnectionService.disconnectSlackIntegration(
        request,
        user.id
      )

      if (!disconnectionResult.success) {
        return NextResponse.json(
          { error: disconnectionResult.error },
          { status: disconnectionResult.statusCode || 500 }
        )
      }

      return NextResponse.json(disconnectionResult.data)

    } catch (error) {
      const logger = container?.utils?.webhookLogger || console
      logger.error({ error }, 'Slack disconnect error')
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }

  return { DELETE }
}

/**
 * Emoji Settings API ハンドラーのファクトリー
 */
export function createEmojiSettingsHandlers(container: DependencyContainer) {
  const GET: APIHandler = async (request: NextRequest) => {
    try {
      // 認証処理
      const userId = await container.auth.requireAuthentication(request)

      // サービス層で処理
      const result = await container.services.emojiSettingsService.getUserEmojiSettings(userId)

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
      }

      return NextResponse.json(result.data)

    } catch (error: any) {
      if (error.message && (
        error.message.includes('Authentication') ||
        error.message.includes('Auth service') ||
        error.message.includes('Unauthorized')
      )) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      const statusCode = error.statusCode || 500
      const message = error.message || 'Internal server error'
      return NextResponse.json({ error: message }, { status: statusCode })
    }
  }

  const PUT: APIHandler = async (request: NextRequest) => {
    try {
      // 認証処理
      const userId = await container.auth.requireAuthentication(request)

      // リクエストボディの取得
      const updateRequest = await request.json()

      // サービス層で処理
      const result = await container.services.emojiSettingsService.updateUserEmojiSettings(userId, updateRequest)

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
      }

      return NextResponse.json(result.data)

    } catch (error: any) {
      if (error.message && (
        error.message.includes('Authentication') ||
        error.message.includes('Auth service') ||
        error.message.includes('Unauthorized')
      )) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      const statusCode = error.statusCode || 500
      const message = error.message || 'Internal server error'
      return NextResponse.json({ error: message }, { status: statusCode })
    }
  }

  const POST: APIHandler = async (request: NextRequest) => {
    try {
      // 認証処理
      const userId = await container.auth.requireAuthentication(request)

      // サービス層で処理
      const result = await container.services.emojiSettingsService.resetUserEmojiSettings(userId)

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
      }

      return NextResponse.json(result.data)

    } catch (error: any) {
      if (error.message && (
        error.message.includes('Authentication') ||
        error.message.includes('Auth service') ||
        error.message.includes('Unauthorized')
      )) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      const statusCode = error.statusCode || 500
      const message = error.message || 'Internal server error'
      return NextResponse.json({ error: message }, { status: statusCode })
    }
  }

  return { GET, PUT, POST }
}

/**
 * Notification Settings API ハンドラーのファクトリー
 */
export function createNotificationSettingsHandlers(container: DependencyContainer) {
  const GET: APIHandler = async (request: NextRequest) => {
    try {
      // 認証処理
      const userId = await container.auth.requireAuthentication(request)

      // サービス層で処理
      const result = await container.services.notificationSettingsService.getUserNotificationSettings(userId)

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
      }

      return NextResponse.json(result.data)

    } catch (error: any) {
      // 認証エラーの場合は401を返す
      if (error.message && (
        error.message.includes('Authentication') ||
        error.message.includes('Auth service') ||
        error.message.includes('Unauthorized')
      )) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      const statusCode = error.statusCode || 500
      const message = error.message || 'Internal server error'
      return NextResponse.json({ error: message }, { status: statusCode })
    }
  }

  const POST: APIHandler = async (request: NextRequest) => {
    try {
      // 認証処理
      const userId = await container.auth.requireAuthentication(request)

      // リクエストボディの取得
      const updateRequest = await request.json()

      // サービス層で処理
      const result = await container.services.notificationSettingsService.updateUserNotificationSettings(userId, updateRequest)

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
      }

      return NextResponse.json(result.data)

    } catch (error: any) {
      // 認証エラーの場合は401を返す
      if (error.message && (
        error.message.includes('Authentication') ||
        error.message.includes('Auth service') ||
        error.message.includes('Unauthorized')
      )) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      const statusCode = error.statusCode || 500
      const message = error.message || 'Internal server error'
      return NextResponse.json({ error: message }, { status: statusCode })
    }
  }

  return { GET, POST }
}

/**
 * Slack Connections API ハンドラーのファクトリー
 */
export function createSlackConnectionsHandlers(container: DependencyContainer) {
  const GET: APIHandler = async (request: NextRequest) => {
    try {
      // 認証処理
      const userId = await container.auth.requireAuthentication(request)

      // サービス層で処理
      const result = await container.services.slackConnectionService.getUserConnections(userId)

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
      }

      return NextResponse.json({ connections: result.data?.connections })

    } catch (error: any) {
      // 認証エラーの場合は401を返す
      if (error.message && (
        error.message.includes('Authentication') ||
        error.message.includes('Auth service') ||
        error.message.includes('Unauthorized')
      )) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      const statusCode = error.statusCode || 500
      const message = error.message || 'Server error'
      return NextResponse.json({ error: message }, { status: statusCode })
    }
  }

  const DELETE: APIHandler = async (request: NextRequest) => {
    try {
      // 認証処理
      const userId = await container.auth.requireAuthentication(request)

      // リクエストボディの取得
      const { connectionId } = await request.json()

      if (!connectionId) {
        return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 })
      }

      // サービス層で処理
      const result = await container.services.slackConnectionService.deleteUserConnection(connectionId, userId)

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
      }

      return NextResponse.json({ success: true })

    } catch (error: any) {
      // 認証エラーの場合は401を返す
      if (error.message && (
        error.message.includes('Authentication') ||
        error.message.includes('Auth service') ||
        error.message.includes('Unauthorized')
      )) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      const statusCode = error.statusCode || 500
      const message = error.message || 'Server error'
      return NextResponse.json({ error: message }, { status: statusCode })
    }
  }

  return { GET, DELETE }
}

/**
 * Slack Auth API ハンドラーのファクトリー
 */
export function createSlackAuthHandlers(container: DependencyContainer) {
  const GET: APIHandler = async (request: NextRequest) => {
    try {
      const searchParams = request.nextUrl.searchParams
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      // エラーハンドリング
      if (error) {
        container?.utils?.webhookLogger.error({ slackError: error }, 'Slack OAuth error received')
        return NextResponse.redirect(new URL('/settings?slack_error=access_denied', container?.utils?.getAppBaseUrl(request)))
      }

      if (!code) {
        return NextResponse.redirect(new URL('/settings?slack_error=no_code', container?.utils?.getAppBaseUrl(request)))
      }

      // 認証処理
      const userId = await container.auth.requireAuthentication(request)

      container?.utils?.webhookLogger.debug({
        hasUserId: !!userId,
        origin: request.headers.get('origin'),
        host: request.headers.get('host')
      }, 'Slack auth callback - User authentication check')

      const logger = container?.utils?.webhookLogger.child({ userId })
      logger.info('Processing Slack authentication')

      // サービス層でOAuth処理
      const tokenExchangeRequest = {
        code,
        clientId: process.env.SLACK_CLIENT_ID!,
        clientSecret: process.env.SLACK_CLIENT_SECRET!,
        redirectUri: `${container?.utils?.getAppBaseUrl(request)}/api/slack/auth`
      }

      const result = await container.services.slackAuthService.processOAuthCallback(
        code,
        userId,
        tokenExchangeRequest
      )

      if (!result.success) {
        logger.error({ error: result.error }, 'Slack OAuth processing failed')

        const errorParam = result.statusCode === 404 ? 'user_not_found' :
          result.statusCode === 400 ? 'token_exchange' :
            'server_error'

        return NextResponse.redirect(new URL(`/settings?slack_error=${errorParam}`, container?.utils?.getAppBaseUrl(request)))
      }

      const { slackUserId, connection, webhookCreated, webhookId } = result.data!

      logger.info({
        workspace: connection.workspace_name,
        slackUserId,
        webhookCreated,
        webhookId,
        autoConfigured: !!slackUserId && webhookCreated
      }, 'Slack authentication completed')

      return NextResponse.redirect(new URL('/settings?slack_success=true', container?.utils?.getAppBaseUrl(request)))

    } catch (error: any) {
      // 認証エラーの場合
      if (error.message && error.message.includes('Authentication')) {
        container?.utils?.webhookLogger.info('User not authenticated, redirecting with auth prompt')
        const redirectUrl = new URL('/', container?.utils?.getAppBaseUrl(request))
        redirectUrl.searchParams.set('slack_auth_required', 'true')
        redirectUrl.searchParams.set('slack_code', request.nextUrl.searchParams.get('code') || '')
        return NextResponse.redirect(redirectUrl)
      }

      container?.utils?.webhookLogger.error({ error }, 'Slack OAuth callback error')
      return NextResponse.redirect(new URL('/settings?slack_error=server_error', container?.utils?.getAppBaseUrl(request)))
    }
  }

  return { GET }
}

/**
 * Slack Message Retrieval API ハンドラーのファクトリー
 */
export function createSlackMessageHandlers(container: DependencyContainer) {
  const POST: APIHandler = async (request: NextRequest) => {
    let slackUrl: string | undefined
    try {
      // リクエストボディを解析
      const requestBody = await request.json()
      slackUrl = requestBody.slackUrl

      // 基本的な入力バリデーション
      if (!slackUrl || typeof slackUrl !== 'string') {
        return NextResponse.json(
          { error: 'SlackURLが必要です' },
          { status: 400 }
        )
      }

      // ユーザー認証
      const userId = await container.auth.requireAuthentication(request)

      // サービス層でメッセージ取得処理
      const result = await container.services.slackMessageService.retrieveMessage(slackUrl, userId)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.statusCode || 500 }
        )
      }

      return NextResponse.json(result.data)

    } catch (error: any) {
      // 認証エラーの処理
      if (error.message && (
        error.message.includes('Authentication') ||
        error.message.includes('Auth service') ||
        error.message.includes('Unauthorized')
      )) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }

      container?.utils?.webhookLogger.error({ error, slackUrl }, 'Slack API integration error')
      return NextResponse.json(
        {
          error: 'Slackメッセージの取得に失敗しました',
          details: error.message || 'Unknown error'
        },
        { status: 500 }
      )
    }
  }

  return { POST }
}

/**
 * Title Generation API ハンドラーのファクトリー
 */
export function createTitleGenerationHandlers(container: DependencyContainer) {
  const POST: APIHandler = async (request: NextRequest) => {
    try {
      // リクエストボディを解析
      const { content } = await request.json()

      // 基本的な入力バリデーション
      if (!content || typeof content !== 'string') {
        return NextResponse.json(
          { error: 'Content is required' },
          { status: 400 }
        )
      }

      // サービス層でタイトル生成処理
      const result = await container.services.titleGenerationService.generateTitle(content)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.statusCode || 500 }
        )
      }

      return NextResponse.json({ title: result.data!.title })

    } catch (error: any) {
      container?.utils?.webhookLogger.error({ error }, 'Failed to generate title')
      return NextResponse.json(
        { error: 'Failed to generate title' },
        { status: 500 }
      )
    }
  }

  return { POST }
}

/**
 * App URL Detection API ハンドラーのファクトリー
 */
export function createAppUrlDetectionHandlers(container: DependencyContainer) {
  const GET: APIHandler = async (request: NextRequest) => {
    try {
      // サービス層でURL検出処理
      const result = await container.services.urlDetectionService.detectAppUrlSimple(
        request.url,
        {
          protocol: request.nextUrl.protocol,
          hostname: request.nextUrl.hostname,
          port: request.nextUrl.port
        }
      )

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.statusCode || 500 }
        )
      }

      return NextResponse.json(result.data)

    } catch (error: any) {
      const logger = container?.utils?.webhookLogger || console
      logger.error({ error }, 'Failed to detect app URL')
      return NextResponse.json(
        { error: 'Failed to detect app URL' },
        { status: 500 }
      )
    }
  }

  return { GET }
}
