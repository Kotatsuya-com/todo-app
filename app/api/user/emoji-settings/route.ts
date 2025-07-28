import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// デフォルト絵文字設定
const DEFAULT_EMOJIS = {
  today_emoji: 'fire',      // 🔥
  tomorrow_emoji: 'calendar', // 📅
  later_emoji: 'memo'       // 📝
}

// 利用可能な絵文字リスト（拡張可能）
const AVAILABLE_EMOJIS = [
  { name: 'fire', display: '🔥', label: '緊急' },
  { name: 'calendar', display: '📅', label: '計画' },
  { name: 'memo', display: '📝', label: 'メモ' },
  { name: 'warning', display: '⚠️', label: '警告' },
  { name: 'clock', display: '🕐', label: '時計' },
  { name: 'hourglass', display: '⏳', label: '砂時計' },
  { name: 'pushpin', display: '📌', label: 'ピン' },
  { name: 'bookmark', display: '🔖', label: 'ブックマーク' },
  { name: 'bulb', display: '💡', label: 'アイデア' },
  { name: 'star', display: '⭐', label: 'スター' },
  { name: 'zap', display: '⚡', label: '稲妻' },
  { name: 'bell', display: '🔔', label: 'ベル' }
]

export async function GET(_request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーの絵文字設定を取得
    const { data: settings, error } = await supabase
      .from('user_emoji_settings')
      .select('today_emoji, tomorrow_emoji, later_emoji')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // 設定が存在しない場合はデフォルト値を返す
    const emojiSettings = settings || DEFAULT_EMOJIS

    return NextResponse.json({
      settings: emojiSettings,
      availableEmojis: AVAILABLE_EMOJIS
    })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { today_emoji, tomorrow_emoji, later_emoji } = body

    // バリデーション
    const validEmojiNames = AVAILABLE_EMOJIS.map(e => e.name)
    if (!validEmojiNames.includes(today_emoji) ||
        !validEmojiNames.includes(tomorrow_emoji) ||
        !validEmojiNames.includes(later_emoji)) {
      return NextResponse.json({ error: 'Invalid emoji selection' }, { status: 400 })
    }

    // 設定を更新（UPSERT）
    const { data, error } = await supabase
      .from('user_emoji_settings')
      .upsert({
        user_id: user.id,
        today_emoji,
        tomorrow_emoji,
        later_emoji
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to update settings',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: {
        today_emoji: data.today_emoji,
        tomorrow_emoji: data.tomorrow_emoji,
        later_emoji: data.later_emoji
      }
    })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(_request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // デフォルト設定にリセット
    const { data, error } = await supabase
      .from('user_emoji_settings')
      .upsert({
        user_id: user.id,
        ...DEFAULT_EMOJIS
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to reset settings',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Settings reset to default',
      settings: {
        today_emoji: data.today_emoji,
        tomorrow_emoji: data.tomorrow_emoji,
        later_emoji: data.later_emoji
      }
    })

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
