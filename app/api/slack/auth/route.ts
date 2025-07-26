import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // エラーハンドリング
  if (error) {
    console.error('Slack OAuth error:', error)
    return NextResponse.redirect(new URL('/settings?slack_error=access_denied', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?slack_error=no_code', request.url))
  }

  try {
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.redirect(new URL('/login', request.url))
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
        redirect_uri: `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/supabase', '')}/api/slack/auth`
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.ok) {
      console.error('Slack token exchange error:', tokenData.error)
      return NextResponse.redirect(new URL('/settings?slack_error=token_exchange', request.url))
    }

    // データベースに保存
    const { error: insertError } = await supabase
      .from('slack_connections')
      .upsert({
        user_id: user.id,
        workspace_id: tokenData.team.id,
        workspace_name: tokenData.team.name,
        team_name: tokenData.team.name,
        access_token: tokenData.access_token,
        bot_user_id: tokenData.bot_user_id,
        scope: tokenData.scope
      })

    if (insertError) {
      console.error('Database insert error:', insertError)
      return NextResponse.redirect(new URL('/settings?slack_error=db_error', request.url))
    }

    return NextResponse.redirect(new URL('/settings?slack_success=true', request.url))

  } catch (error) {
    console.error('Slack OAuth callback error:', error)
    return NextResponse.redirect(new URL('/settings?slack_error=server_error', request.url))
  }
}
