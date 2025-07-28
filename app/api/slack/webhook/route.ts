import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAppBaseUrl } from '@/lib/ngrok-url'
import { webhookLogger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーのwebhook設定を取得
    const { data: webhooks, error: webhookError } = await supabase
      .from('user_slack_webhooks')
      .select(`
        id,
        slack_connection_id,
        webhook_id,
        is_active,
        last_event_at,
        event_count,
        created_at,
        updated_at,
        slack_connections:slack_connection_id (
          workspace_name,
          team_name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (webhookError) {
      webhookLogger.error({ error: webhookError }, 'Failed to fetch webhooks')
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 })
    }

    return NextResponse.json({ webhooks })

  } catch (error) {
    webhookLogger.error({ error }, 'Webhook GET error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    webhookLogger.info('POST /api/slack/webhook called')
    const { slack_connection_id } = await request.json()
    webhookLogger.debug({ slack_connection_id }, 'Request data received')

    if (!slack_connection_id) {
      webhookLogger.warn('slack_connection_id is missing from request')
      return NextResponse.json(
        { error: 'slack_connection_id is required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    webhookLogger.debug({ userId: user?.id, hasError: !!userError }, 'User authentication result')

    if (userError || !user) {
      webhookLogger.warn('User authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Slack接続の存在確認
    const logger = webhookLogger.child({ userId: user.id, slackConnectionId: slack_connection_id })
    logger.debug('Checking Slack connection')
    const { data: connection, error: connectionError } = await supabase
      .from('slack_connections')
      .select('id, workspace_name')
      .eq('id', slack_connection_id)
      .eq('user_id', user.id)
      .single()

    logger.debug({
      connectionFound: !!connection,
      workspaceName: connection?.workspace_name,
      error: connectionError?.message
    }, 'Connection check result')

    if (connectionError || !connection) {
      logger.warn('Slack connection not found')
      return NextResponse.json(
        { error: 'Slack connection not found' },
        { status: 404 }
      )
    }

    // 既存のwebhookがあるかチェック
    const { data: existingWebhook } = await supabase
      .from('user_slack_webhooks')
      .select('id, webhook_id, is_active')
      .eq('user_id', user.id)
      .eq('slack_connection_id', slack_connection_id)
      .single()

    if (existingWebhook) {
      // 既存のwebhookがある場合は再有効化
      const { data: updatedWebhook, error: updateError } = await supabase
        .from('user_slack_webhooks')
        .update({ is_active: true })
        .eq('id', existingWebhook.id)
        .select()
        .single()

      if (updateError) {
        logger.error({ error: updateError }, 'Failed to reactivate webhook')
        return NextResponse.json({ error: 'Failed to reactivate webhook' }, { status: 500 })
      }

      const webhookUrl = `${getAppBaseUrl(request)}/api/slack/events/user/${existingWebhook.webhook_id}`
      return NextResponse.json({
        webhook: updatedWebhook,
        webhook_url: webhookUrl,
        message: 'Webhook reactivated successfully'
      })
    }

    // 新しいwebhookを作成
    logger.info('Creating new webhook')
    const { data: webhookResult, error: createError } = await supabase
      .rpc('create_user_slack_webhook', {
        p_user_id: user.id,
        p_slack_connection_id: slack_connection_id
      })

    logger.debug({
      hasResult: !!webhookResult,
      error: createError?.message
    }, 'Webhook creation result')

    if (createError || !webhookResult) {
      logger.error({ error: createError }, 'Failed to create webhook')
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
    }

    // RPCの結果は配列で返される場合があるので、最初の要素を取得
    const newWebhook = Array.isArray(webhookResult) ? webhookResult[0] : webhookResult

    if (!newWebhook) {
      logger.error('No webhook data returned from RPC function')
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
    }

    const webhookUrl = `${getAppBaseUrl(request)}/api/slack/events/user/${newWebhook.webhook_id}`

    return NextResponse.json({
      webhook: newWebhook,
      webhook_url: webhookUrl,
      message: 'Webhook created successfully'
    }, { status: 201 })

  } catch (error) {
    webhookLogger.error({ error }, 'Webhook POST error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('id')

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Webhook ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // webhookを無効化（完全削除ではなく無効化）
    const { error: deleteError } = await supabase
      .from('user_slack_webhooks')
      .update({ is_active: false })
      .eq('id', webhookId)
      .eq('user_id', user.id)

    if (deleteError) {
      webhookLogger.error({ error: deleteError, webhookId }, 'Failed to deactivate webhook')
      return NextResponse.json({ error: 'Failed to deactivate webhook' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Webhook deactivated successfully' })

  } catch (error) {
    webhookLogger.error({ error }, 'Webhook DELETE error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
