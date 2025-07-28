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
      hasUserToken: !!tokenData.authed_user?.access_token
    }, 'Slack token exchange successful')

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

    return NextResponse.json({
      message: 'Slack connection successful',
      workspace: tokenData.team.name
    })

  } catch (error) {
    authLogger.error({ error }, 'Slack auth processing error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
