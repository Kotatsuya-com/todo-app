import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAppBaseUrl } from '@/lib/ngrok-url'
import { authLogger } from '@/lib/logger'
import crypto from 'crypto'

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
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    authLogger.debug({
      hasUser: !!user,
      userError: userError?.message,
      cookieCount: request.headers.get('cookie')?.split(';').length || 0,
      origin: request.headers.get('origin'),
      host: request.headers.get('host')
    }, 'Slack auth callback - User authentication check')

    if (userError || !user) {
      authLogger.info('User not authenticated, redirecting with auth prompt')
      // 認証が必要な場合は、ログインページに適切にリダイレクト
      const redirectUrl = new URL('/', getAppBaseUrl(request))
      redirectUrl.searchParams.set('slack_auth_required', 'true')
      redirectUrl.searchParams.set('slack_code', code)
      return NextResponse.redirect(redirectUrl)
    }

    const logger = authLogger.child({ userId: user.id })
    logger.info('Processing Slack authentication')

    // ユーザーデータベースレコードの存在確認
    const { error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (userCheckError && userCheckError.code === 'PGRST116') {
      // ユーザーレコードが存在しない場合はエラー
      logger.error({ userId: user.id }, 'User record not found in database')
      return NextResponse.redirect(new URL('/settings?slack_error=user_not_found', getAppBaseUrl(request)))
    }

    if (userCheckError) {
      logger.error({ error: userCheckError }, 'Failed to check user record')
      return NextResponse.redirect(new URL('/settings?slack_error=user_check_failed', getAppBaseUrl(request)))
    }

    // Slack OAuth トークン交換
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: `${getAppBaseUrl(request)}/api/slack/auth`
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.ok) {
      logger.error({ slackError: tokenData.error }, 'Slack token exchange failed')
      return NextResponse.redirect(new URL('/settings?slack_error=token_exchange', getAppBaseUrl(request)))
    }

    logger.info({
      teamName: tokenData.team?.name,
      hasUserToken: !!tokenData.authed_user?.access_token,
      authedUserId: tokenData.authed_user?.id,
      tokenDataStructure: Object.keys(tokenData),
      authedUserStructure: tokenData.authed_user ? Object.keys(tokenData.authed_user) : null,
      userTokenType: tokenData.authed_user?.access_token?.substring(0, 5),
      botTokenType: tokenData.access_token?.substring(0, 5)
    }, 'Slack token exchange successful - debugging structure')

    // デバッグ用: tokenDataの完全な内容をログ出力（センシティブ情報はマスク）
    logger.debug({
      tokenData: {
        ok: tokenData.ok,
        app_id: tokenData.app_id,
        team: tokenData.team,
        authed_user: tokenData.authed_user ? {
          id: tokenData.authed_user.id,
          scope: tokenData.authed_user.scope,
          access_token: tokenData.authed_user.access_token ? '[MASKED]' : undefined,
          token_type: tokenData.authed_user.token_type
        } : null,
        scope: tokenData.scope,
        bot_user_id: tokenData.bot_user_id,
        access_token: tokenData.access_token ? '[MASKED]' : undefined,
        token_type: tokenData.token_type,
        enterprise: tokenData.enterprise,
        is_enterprise_install: tokenData.is_enterprise_install
      }
    }, 'Complete tokenData structure (sensitive tokens masked)')

    // データベースに保存
    const { error: insertError } = await supabase
      .from('slack_connections')
      .upsert({
        user_id: user.id,
        workspace_id: tokenData.team.id,
        workspace_name: tokenData.team.name,
        team_name: tokenData.team.name,
        access_token: tokenData.authed_user?.access_token || tokenData.access_token,
        bot_user_id: tokenData.bot_user_id,
        scope: tokenData.authed_user?.scope || tokenData.scope
      })

    if (insertError) {
      logger.error({ error: insertError }, 'Failed to save Slack connection to database')
      return NextResponse.redirect(new URL('/settings?slack_error=db_error', getAppBaseUrl(request)))
    }

    // Slack User IDの取得
    const slackUserId = tokenData.authed_user?.id
    logger.info({
      slackUserId,
      hasAuthedUser: !!tokenData.authed_user,
      method: 'OAuth response'
    }, 'Slack User ID from OAuth response')

    // Slack User IDをusersテーブルに保存
    if (slackUserId) {
      logger.info({
        userId: user.id,
        slackUserId,
        action: 'attempting_save'
      }, 'Attempting to save Slack User ID to database')

      // リトライロジック付きでユーザーデータを更新
      let updateResult = null
      let updateUserError = null
      let retryCount = 0
      const maxRetries = 3

      while (retryCount < maxRetries) {
        const result = await supabase
          .from('users')
          .update({ slack_user_id: slackUserId })
          .eq('id', user.id)
          .select('slack_user_id')

        updateResult = result.data
        updateUserError = result.error

        if (!updateUserError) {
          break // 成功した場合はループを抜ける
        }

        retryCount++
        logger.warn({
          retryCount,
          maxRetries,
          error: updateUserError,
          slackUserId,
          userId: user.id
        }, `Database update retry ${retryCount}/${maxRetries}`)

        if (retryCount < maxRetries) {
          // 次のリトライまで少し待機
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        }
      }

      if (updateUserError) {
        logger.error({
          error: updateUserError,
          slackUserId,
          userId: user.id
        }, 'Failed to update user Slack ID')
        // エラーがあってもSlack接続自体は成功しているので、処理は続行
      } else {
        logger.info({
          slackUserId,
          userId: user.id,
          updateResult
        }, 'Successfully updated user Slack ID')

        // 即座に確認してデータが正しく保存されているかチェック
        const { data: verificationData, error: verificationError } = await supabase
          .from('users')
          .select('slack_user_id')
          .eq('id', user.id)
          .single()

        if (verificationError || !verificationData?.slack_user_id) {
          logger.error({
            verificationError,
            verificationData,
            userId: user.id,
            expectedSlackUserId: slackUserId
          }, 'Verification failed: Slack User ID not found after save')
        } else if (verificationData.slack_user_id !== slackUserId) {
          logger.error({
            savedSlackUserId: verificationData.slack_user_id,
            expectedSlackUserId: slackUserId,
            userId: user.id
          }, 'Verification failed: Slack User ID mismatch after save')
        } else {
          logger.info({
            verifiedSlackUserId: verificationData.slack_user_id,
            userId: user.id
          }, 'Verification successful: Slack User ID correctly saved and retrievable')
        }
      }
    } else {
      logger.warn({
        userId: user.id,
        hadAuthedUser: !!tokenData.authed_user,
        hadAuthedUserId: !!tokenData.authed_user?.id
      }, 'Could not determine Slack User ID from OAuth response or fallback APIs')
    }

    // OAuth成功後、自動でWebhookを作成
    let webhookCreated = false
    let webhookId = null

    if (slackUserId) {
      try {
        logger.info({
          userId: user.id,
          slackConnectionExists: true
        }, 'Attempting to auto-create webhook after OAuth')

        // 作成したSlack接続のIDを取得
        const { data: newConnection, error: connectionFetchError } = await supabase
          .from('slack_connections')
          .select('id')
          .eq('user_id', user.id)
          .eq('workspace_id', tokenData.team.id)
          .single()

        if (connectionFetchError || !newConnection) {
          logger.error({
            error: connectionFetchError,
            workspaceId: tokenData.team.id
          }, 'Failed to fetch created connection for webhook')
        } else {
          // Webhookを自動作成
          const { data: webhook, error: webhookError } = await supabase
            .from('user_slack_webhooks')
            .insert({
              user_id: user.id,
              slack_connection_id: newConnection.id,
              webhook_id: Buffer.from(crypto.randomBytes(32)).toString('base64url'),
              webhook_secret: crypto.randomBytes(32).toString('hex'),
              is_active: true,
              event_count: 0
            })
            .select('webhook_id')
            .single()

          if (webhookError) {
            logger.error({
              error: webhookError,
              connectionId: newConnection.id
            }, 'Failed to auto-create webhook')
          } else {
            webhookCreated = true
            webhookId = webhook.webhook_id
            logger.info({
              webhookId: webhook.webhook_id,
              connectionId: newConnection.id
            }, 'Successfully auto-created webhook after OAuth')
          }
        }
      } catch (webhookCreationError) {
        logger.error({
          error: webhookCreationError
        }, 'Error during webhook auto-creation')
      }
    }

    logger.info({
      workspace: tokenData.team.name,
      slackUserId,
      webhookCreated,
      webhookId,
      autoConfigured: !!slackUserId && webhookCreated
    }, 'Slack authentication completed')

    return NextResponse.redirect(new URL('/settings?slack_success=true', getAppBaseUrl(request)))

  } catch (error) {
    authLogger.error({ error }, 'Slack OAuth callback error')
    return NextResponse.redirect(new URL('/settings?slack_error=server_error', getAppBaseUrl(request)))
  }
}
