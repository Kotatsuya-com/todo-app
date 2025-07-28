import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { slackLogger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: connections, error } = await supabase
      .from('slack_connections')
      .select('id, workspace_id, workspace_name, team_name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      slackLogger.error({ error }, 'Failed to fetch Slack connections')
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    return NextResponse.json({ connections })

  } catch (error) {
    slackLogger.error({ error }, 'Slack connections API error')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { connectionId } = await request.json()

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('slack_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', user.id)

    if (error) {
      slackLogger.error({ error, connectionId }, 'Failed to delete Slack connection')
      return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    slackLogger.error({ error }, 'Slack connection delete API error')
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
