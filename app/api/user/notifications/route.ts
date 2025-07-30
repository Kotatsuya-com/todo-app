import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createLogger } from '@/lib/logger'

const logger = createLogger({ module: 'api-user-notifications' })

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーの通知設定を取得
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('enable_webhook_notifications')
      .eq('id', user.id)
      .single()

    if (fetchError) {
      logger.error({ error: fetchError, userId: user.id }, 'Failed to fetch notification preferences')
      return NextResponse.json({ error: 'Failed to fetch notification settings' }, { status: 500 })
    }

    return NextResponse.json({
      enable_webhook_notifications: userData?.enable_webhook_notifications ?? true
    })

  } catch (error) {
    logger.error({ error }, 'Error in GET /api/user/notifications')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { enable_webhook_notifications } = body

    if (typeof enable_webhook_notifications !== 'boolean') {
      return NextResponse.json(
        { error: 'enable_webhook_notifications must be a boolean' },
        { status: 400 }
      )
    }

    // ユーザーの通知設定を更新
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ enable_webhook_notifications })
      .eq('id', user.id)
      .select('enable_webhook_notifications')
      .single()

    if (updateError) {
      logger.error({ error: updateError, userId: user.id }, 'Failed to update notification preferences')
      return NextResponse.json({ error: 'Failed to update notification settings' }, { status: 500 })
    }

    logger.info(
      { userId: user.id, enable_webhook_notifications },
      'Notification preferences updated'
    )

    return NextResponse.json({
      enable_webhook_notifications: updatedUser.enable_webhook_notifications,
      message: 'Notification preferences updated successfully'
    })

  } catch (error) {
    logger.error({ error }, 'Error in POST /api/user/notifications')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
