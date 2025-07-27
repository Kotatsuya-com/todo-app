import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAppBaseUrl } from '@/lib/ngrok-url'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Slack code is required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Auth error in auth-process:', {
        userError: userError?.message,
        hasUser: !!user,
        cookieCount: request.headers.get('cookie')?.split(';').length || 0
      })
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    console.log('Processing Slack auth for user:', user.id)

    // ユーザーデータベースレコードの存在確認と作成
    const { error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (userCheckError && userCheckError.code === 'PGRST116') {
      // ユーザーレコードが存在しない場合は作成
      console.log('Creating user record for:', user.id)
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          display_name: user.email || user.user_metadata?.full_name || 'Unknown User'
        })

      if (createUserError) {
        console.error('Failed to create user record:', createUserError)
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
      console.error('Slack token exchange error:', tokenData.error)
      return NextResponse.json({ error: 'Slack token exchange failed' }, { status: 400 })
    }

    console.log('Slack token exchange successful:', {
      team: tokenData.team?.name,
      hasUserToken: !!tokenData.authed_user?.access_token
    })

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
      return NextResponse.json({ error: 'Failed to save Slack connection' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Slack connection successful',
      workspace: tokenData.team.name
    })

  } catch (error) {
    console.error('Slack auth processing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
