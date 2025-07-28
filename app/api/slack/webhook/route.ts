import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getAppBaseUrl } from '@/lib/ngrok-url'

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
      console.error('Failed to fetch webhooks:', webhookError)
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 })
    }

    return NextResponse.json({ webhooks })

  } catch (error) {
    console.error('Webhook GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 POST /api/slack/webhook called')
    const { slack_connection_id } = await request.json()
    console.log('📝 Request data:', { slack_connection_id })

    if (!slack_connection_id) {
      console.log('❌ slack_connection_id is missing')
      return NextResponse.json(
        { error: 'slack_connection_id is required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('👤 User auth result:', { user: user?.id, userError })

    if (userError || !user) {
      console.log('❌ Authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Slack接続の存在確認
    console.log('🔍 Checking Slack connection:', { slack_connection_id, user_id: user.id })
    const { data: connection, error: connectionError } = await supabase
      .from('slack_connections')
      .select('id, workspace_name')
      .eq('id', slack_connection_id)
      .eq('user_id', user.id)
      .single()

    console.log('📋 Connection check result:', { connection, connectionError })

    if (connectionError || !connection) {
      console.log('❌ Slack connection not found')
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
        console.error('Failed to reactivate webhook:', updateError)
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
    console.log('🔄 Creating webhook for user:', user.id, 'connection:', slack_connection_id)
    const { data: webhookResult, error: createError } = await supabase
      .rpc('create_user_slack_webhook', {
        p_user_id: user.id,
        p_slack_connection_id: slack_connection_id
      })

    console.log('📝 Webhook creation result:', { webhookResult, createError })

    if (createError || !webhookResult) {
      console.error('Failed to create webhook:', createError)
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
    }

    // RPCの結果は配列で返される場合があるので、最初の要素を取得
    const newWebhook = Array.isArray(webhookResult) ? webhookResult[0] : webhookResult

    if (!newWebhook) {
      console.error('No webhook data returned from RPC')
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
    }

    const webhookUrl = `${getAppBaseUrl(request)}/api/slack/events/user/${newWebhook.webhook_id}`

    return NextResponse.json({
      webhook: newWebhook,
      webhook_url: webhookUrl,
      message: 'Webhook created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Webhook POST error:', error)
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
      console.error('Failed to deactivate webhook:', deleteError)
      return NextResponse.json({ error: 'Failed to deactivate webhook' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Webhook deactivated successfully' })

  } catch (error) {
    console.error('Webhook DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
