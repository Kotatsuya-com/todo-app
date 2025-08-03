import { NextRequest, NextResponse } from 'next/server'
import { requireAuthentication } from '@/lib/auth/authentication'
import { createServices } from '@/lib/services/ServiceFactory'
import { getAppBaseUrl } from '@/lib/ngrok-url'
import { authLogger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // エラーハンドリング
  if (error) {
    authLogger.error({ slackError: error }, 'Slack OAuth error received')
    return NextResponse.redirect(new URL('/settings?slack_error=access_denied', getAppBaseUrl(request)))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?slack_error=no_code', getAppBaseUrl(request)))
  }

  try {
    // 認証処理
    const userId = await requireAuthentication(request)

    authLogger.debug({
      hasUserId: !!userId,
      origin: request.headers.get('origin'),
      host: request.headers.get('host')
    }, 'Slack auth callback - User authentication check')

    const logger = authLogger.child({ userId })
    logger.info('Processing Slack authentication')

    // サービス層でOAuth処理
    const { slackAuthService } = createServices()

    const tokenExchangeRequest = {
      code,
      clientId: process.env.SLACK_CLIENT_ID!,
      clientSecret: process.env.SLACK_CLIENT_SECRET!,
      redirectUri: `${getAppBaseUrl(request)}/api/slack/auth`
    }

    const result = await slackAuthService.processOAuthCallback(
      code,
      userId,
      tokenExchangeRequest
    )

    if (!result.success) {
      logger.error({ error: result.error }, 'Slack OAuth processing failed')

      const errorParam = result.statusCode === 404 ? 'user_not_found' :
        result.statusCode === 400 ? 'token_exchange' :
          'server_error'

      return NextResponse.redirect(new URL(`/settings?slack_error=${errorParam}`, getAppBaseUrl(request)))
    }

    const { slackUserId, connection, webhookCreated, webhookId } = result.data!

    logger.info({
      workspace: connection.workspace_name,
      slackUserId,
      webhookCreated,
      webhookId,
      autoConfigured: !!slackUserId && webhookCreated
    }, 'Slack authentication completed')

    return NextResponse.redirect(new URL('/settings?slack_success=true', getAppBaseUrl(request)))

  } catch (error: any) {
    // 認証エラーの場合
    if (error.message && error.message.includes('Authentication')) {
      authLogger.info('User not authenticated, redirecting with auth prompt')
      const redirectUrl = new URL('/', getAppBaseUrl(request))
      redirectUrl.searchParams.set('slack_auth_required', 'true')
      redirectUrl.searchParams.set('slack_code', code)
      return NextResponse.redirect(redirectUrl)
    }

    authLogger.error({ error }, 'Slack OAuth callback error')
    return NextResponse.redirect(new URL('/settings?slack_error=server_error', getAppBaseUrl(request)))
  }
}
