import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { authLogger } from '@/lib/logger'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const logger = authLogger.child({ userId: user.id })
    logger.info('Starting complete Slack integration disconnect')

    // 1. ユーザーのSlack接続を取得
    const { data: connections, error: connectionsError } = await supabase
      .from('slack_connections')
      .select('id, workspace_name')
      .eq('user_id', user.id)

    if (connectionsError) {
      logger.error({ error: connectionsError }, 'Failed to fetch connections for disconnect')
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    if (!connections || connections.length === 0) {
      logger.info('No connections found to disconnect')
      return NextResponse.json({ message: 'No connections to disconnect' })
    }

    const connectionIds = connections.map(c => c.id)
    const workspaceNames = connections.map(c => c.workspace_name)

    logger.info({
      connectionCount: connections.length,
      connectionIds,
      workspaceNames
    }, 'Found connections to disconnect')

    // 2. Webhookを無効化・削除
    const { error: webhookError } = await supabase
      .from('user_slack_webhooks')
      .delete()
      .in('slack_connection_id', connectionIds)

    if (webhookError) {
      logger.error({ error: webhookError }, 'Failed to delete webhooks')
      return NextResponse.json({ error: 'Failed to delete webhooks' }, { status: 500 })
    }

    logger.info({ connectionIds }, 'Successfully deleted webhooks')

    // 3. Slack接続を削除
    const { error: connectionDeleteError } = await supabase
      .from('slack_connections')
      .delete()
      .eq('user_id', user.id)

    if (connectionDeleteError) {
      logger.error({ error: connectionDeleteError }, 'Failed to delete connections')
      return NextResponse.json({ error: 'Failed to delete connections' }, { status: 500 })
    }

    logger.info({ connectionIds }, 'Successfully deleted connections')

    // 4. ユーザーのSlack User IDをリセット
    const { error: userResetError } = await supabase
      .from('users')
      .update({ slack_user_id: null })
      .eq('id', user.id)

    if (userResetError) {
      logger.error({ error: userResetError }, 'Failed to reset user Slack ID')
      return NextResponse.json({ error: 'Failed to reset user Slack ID' }, { status: 500 })
    }

    logger.info('Successfully reset user Slack ID')

    // 5. 完了確認のため、データが正しく削除されたかチェック
    const { data: verificationConnections } = await supabase
      .from('slack_connections')
      .select('id')
      .eq('user_id', user.id)

    const { data: verificationWebhooks } = await supabase
      .from('user_slack_webhooks')
      .select('id')
      .eq('user_id', user.id)

    const { data: verificationUser } = await supabase
      .from('users')
      .select('slack_user_id')
      .eq('id', user.id)
      .single()

    logger.info({
      remainingConnections: verificationConnections?.length || 0,
      remainingWebhooks: verificationWebhooks?.length || 0,
      userSlackIdCleared: !verificationUser?.slack_user_id,
      workspacesDisconnected: workspaceNames
    }, 'Verification of complete disconnect')

    return NextResponse.json({
      message: 'Slack integration completely disconnected',
      disconnectedWorkspaces: workspaceNames,
      itemsRemoved: {
        connections: connections.length,
        webhooks: connectionIds.length,
        userIdCleared: true
      }
    })

  } catch (error) {
    authLogger.error({ error }, 'Error during complete Slack disconnect')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
