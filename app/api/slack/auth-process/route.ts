import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAppBaseUrl } from '@/lib/ngrok-url'
import { authLogger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Slack code is required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      authLogger.error({
        userError: userError?.message,
        hasUser: !!user,
        cookieCount: request.headers.get('cookie')?.split(';').length || 0
      }, 'Authentication error in auth-process')
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const logger = authLogger.child({ userId: user.id })
    logger.info('Processing Slack authentication')

    // ユーザーデータベースレコードの存在確認と作成
    const { error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (userCheckError && userCheckError.code === 'PGRST116') {
      // ユーザーレコードが存在しない場合は作成
      logger.debug('Creating user record')
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          display_name: user.email || user.user_metadata?.full_name || 'Unknown User'
        })

      if (createUserError) {
        logger.error({ error: createUserError }, 'Failed to create user record')
        return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 })
      }
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
      return NextResponse.json({ error: 'Slack token exchange failed' }, { status: 400 })
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
      return NextResponse.json({ error: 'Failed to save Slack connection' }, { status: 500 })
    }

    // Slack User IDの取得を試みる
    let slackUserId = tokenData.authed_user?.id
    logger.info({
      initialSlackUserId: slackUserId,
      hasAuthedUser: !!tokenData.authed_user
    }, 'Initial Slack User ID from OAuth response')

    // authed_user.idが存在しない場合、auth.test APIを使用
    if (!slackUserId) {
      // 優先順位: 1. ユーザートークン, 2. ボットトークン
      const accessToken = tokenData.authed_user?.access_token || tokenData.access_token
      const tokenType = tokenData.authed_user?.access_token ? 'user' : 'bot'

      logger.info({
        hasAccessToken: !!accessToken,
        tokenType,
        tokenPrefix: accessToken?.substring(0, 5)
      }, 'Attempting to get user ID via auth.test')

      try {
        const authTestResponse = await fetch('https://slack.com/api/auth.test', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        const authTestData = await authTestResponse.json()
        logger.info({
          authTestOk: authTestData.ok,
          authTestUserId: authTestData.user_id,
          authTestUser: authTestData.user,
          authTestUrl: authTestData.url,
          authTestBotId: authTestData.bot_id,
          usedTokenType: tokenType
        }, 'auth.test API response for OAuth')

        if (authTestData.ok && authTestData.user_id) {
          slackUserId = authTestData.user_id
          logger.info({
            retrievedUserId: slackUserId,
            method: 'auth.test',
            tokenType
          }, 'Successfully retrieved Slack User ID via auth.test')
        } else {
          logger.warn({
            authTestOk: authTestData.ok,
            error: authTestData.error,
            tokenType
          }, 'auth.test failed or returned no user_id')
        }
      } catch (authTestError) {
        logger.error({ error: authTestError, tokenType }, 'Failed to call auth.test API')
      }
    } else {
      logger.info({
        slackUserId,
        method: 'OAuth response'
      }, 'Slack User ID available directly from OAuth response')
    }

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
      }, 'Could not determine Slack User ID from OAuth response or auth.test')
    }

    return NextResponse.json({
      message: 'Slack connection successful',
      workspace: tokenData.team.name,
      slackUserId
    })

  } catch (error) {
    authLogger.error({ error }, 'Slack auth processing error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
