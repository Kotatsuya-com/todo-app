import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { authLogger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { connectionId } = await request.json()

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const logger = authLogger.child({ userId: user.id })

    // 指定されたSlack接続を取得
    const { data: connection, error: connectionError } = await supabase
      .from('slack_connections')
      .select('access_token, workspace_name, workspace_id')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single()

    if (connectionError || !connection) {
      logger.error({ error: connectionError, connectionId }, 'Failed to fetch Slack connection')
      return NextResponse.json({ error: 'Slack connection not found' }, { status: 404 })
    }

    // トークンの種類を確認
    const tokenType = connection.access_token.startsWith('xoxp-') ? 'user' : 'bot'

    logger.info({
      tokenType,
      tokenPrefix: connection.access_token.substring(0, 5),
      workspace: connection.workspace_name,
      workspaceId: connection.workspace_id
    }, 'Using token for auth.test API call')

    // auth.test APIを使用してユーザーIDを取得
    const authTestResponse = await fetch('https://slack.com/api/auth.test', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    const authTestData = await authTestResponse.json()

    logger.info({
      authTestOk: authTestData.ok,
      authTestUserId: authTestData.user_id,
      authTestBotId: authTestData.bot_id,
      authTestUser: authTestData.user,
      tokenType,
      workspace: connection.workspace_name
    }, 'auth.test API response for manual fetch')

    if (!authTestData.ok) {
      logger.error({
        error: authTestData.error,
        workspace: connection.workspace_name
      }, 'auth.test failed')
      return NextResponse.json({
        error: 'Failed to fetch Slack user ID',
        details: authTestData.error || 'Unknown error'
      }, { status: 400 })
    }

    if (!authTestData.user_id) {
      return NextResponse.json({
        error: 'No user ID found in Slack response'
      }, { status: 404 })
    }

    // usersテーブルを更新
    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update({ slack_user_id: authTestData.user_id })
      .eq('id', user.id)
      .select('slack_user_id')

    if (updateError) {
      logger.error({ error: updateError }, 'Failed to update user Slack ID')
      return NextResponse.json({
        error: 'Failed to save Slack user ID'
      }, { status: 500 })
    }

    logger.info({
      slackUserId: authTestData.user_id,
      workspace: connection.workspace_name,
      updateResult
    }, 'Successfully fetched and saved Slack user ID')

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
        expectedSlackUserId: authTestData.user_id
      }, 'Verification failed: Slack User ID not found after manual save')
    } else if (verificationData.slack_user_id !== authTestData.user_id) {
      logger.error({
        savedSlackUserId: verificationData.slack_user_id,
        expectedSlackUserId: authTestData.user_id
      }, 'Verification failed: Slack User ID mismatch after manual save')
    } else {
      logger.info({
        verifiedSlackUserId: verificationData.slack_user_id
      }, 'Verification successful: Slack User ID correctly saved via manual fetch')
    }

    return NextResponse.json({
      slackUserId: authTestData.user_id,
      workspace: connection.workspace_name,
      message: 'Slack User ID successfully updated'
    })

  } catch (error) {
    authLogger.error({ error }, 'Error fetching Slack user ID')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
