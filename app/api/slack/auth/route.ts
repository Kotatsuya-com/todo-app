import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAppBaseUrl } from '@/lib/ngrok-url'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // エラーハンドリング
  if (error) {
    console.error('Slack OAuth error:', error)
    return NextResponse.redirect(new URL('/settings?slack_error=access_denied', getAppBaseUrl(request)))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?slack_error=no_code', getAppBaseUrl(request)))
  }

  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    console.log('Slack auth callback - User check:', {
      hasUser: !!user,
      userError: userError?.message,
      cookieCount: request.headers.get('cookie')?.split(';').length || 0,
      origin: request.headers.get('origin'),
      host: request.headers.get('host')
    })

    if (userError || !user) {
      console.log('User not authenticated, redirecting with auth prompt')
      // 認証が必要な場合は、ログインページに適切にリダイレクト
      const redirectUrl = new URL('/', getAppBaseUrl(request))
      redirectUrl.searchParams.set('slack_auth_required', 'true')
      redirectUrl.searchParams.set('slack_code', code)
      return NextResponse.redirect(redirectUrl)
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
      console.error('Slack token exchange error:', tokenData.error)
      return NextResponse.redirect(new URL('/settings?slack_error=token_exchange', getAppBaseUrl(request)))
    }

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
      console.error('Database insert error:', insertError)
      return NextResponse.redirect(new URL('/settings?slack_error=db_error', getAppBaseUrl(request)))
    }

    return NextResponse.redirect(new URL('/settings?slack_success=true', getAppBaseUrl(request)))

  } catch (error) {
    console.error('Slack OAuth callback error:', error)
    return NextResponse.redirect(new URL('/settings?slack_error=server_error', getAppBaseUrl(request)))
  }
}
