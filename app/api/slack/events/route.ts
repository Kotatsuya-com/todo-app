import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

interface SlackReactionEvent {
  type: 'reaction_added'
  user: string
  reaction: string
  item_user: string
  item: {
    type: 'message'
    channel: string
    ts: string
  }
  event_ts: string
}

interface SlackEventPayload {
  token: string
  team_id: string
  api_app_id: string
  event: SlackReactionEvent
  type: 'event_callback'
  challenge?: string
}

// タスク作成対象の絵文字リスト
const TASK_EMOJIS = ['memo', 'clipboard', 'pencil', 'spiral_note_pad', 'page_with_curl']

export async function POST(request: NextRequest) {
  try {
    const payload: SlackEventPayload = await request.json()

    // URL verification (初回設定時のチャレンジレスポンス)
    if (payload.challenge) {
      return NextResponse.json({ challenge: payload.challenge })
    }

    // イベント検証
    if (payload.type !== 'event_callback') {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const event = payload.event

    // reaction_addedイベントのみ処理
    if (event.type !== 'reaction_added') {
      return NextResponse.json({ ok: true })
    }

    // 対象絵文字でのリアクションかチェック
    if (!TASK_EMOJIS.includes(event.reaction)) {
      return NextResponse.json({ ok: true })
    }

    // 非同期でタスク作成処理を実行（3秒制限対応）
    processReactionTaskCreation(event).catch(error => {
      console.error('Failed to process reaction task creation:', error)
    })

    // 即座にレスポンス返却
    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Slack events webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processReactionTaskCreation(event: SlackReactionEvent) {
  try {
    // メッセージ内容を取得
    const messageData = await getSlackMessage(event.item.channel, event.item.ts)
    
    if (!messageData || !messageData.text) {
      console.warn('No message text found for reaction')
      return
    }

    // リアクションしたユーザーのSlack IDから内部ユーザーIDを取得
    const userId = await getUserIdFromSlackUserId(event.user)
    
    if (!userId) {
      console.warn('User not found for Slack user ID:', event.user)
      return
    }

    // タスクを作成
    await createTaskFromReaction(userId, messageData, event)

  } catch (error) {
    console.error('Error processing reaction task creation:', error)
    throw error
  }
}

async function getSlackMessage(channel: string, ts: string) {
  try {
    const slackToken = process.env.SLACK_BOT_TOKEN
    if (!slackToken) {
      throw new Error('SLACK_BOT_TOKEN is not configured')
    }

    const response = await fetch('https://slack.com/api/conversations.history', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json',
      },
      body: null,
    })

    const queryParams = new URLSearchParams({
      channel,
      latest: ts,
      oldest: ts,
      inclusive: 'true',
      limit: '1'
    })

    const apiResponse = await fetch(`https://slack.com/api/conversations.history?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await apiResponse.json()
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`)
    }

    return data.messages?.[0] || null

  } catch (error) {
    console.error('Error fetching Slack message:', error)
    throw error
  }
}

async function getUserIdFromSlackUserId(slackUserId: string) {
  try {
    const supabase = createClient()
    
    // slackUserId から対応するユーザーを検索
    // 注: この実装では、usersテーブルにslack_user_idカラムがあることを前提とします
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('slack_user_id', slackUserId)
      .single()

    if (error) {
      console.error('Error finding user by Slack ID:', error)
      return null
    }

    return data?.id || null

  } catch (error) {
    console.error('Error looking up user:', error)
    return null
  }
}

async function createTaskFromReaction(
  userId: string, 
  messageData: any, 
  event: SlackReactionEvent
) {
  try {
    const supabase = createClient()

    // メッセージURLを構築
    const messageUrl = `https://slack.com/archives/${event.item.channel}/p${event.item.ts.replace('.', '')}`
    
    // タスク本文を構築
    const taskBody = `${messageData.text}\n\n[Slack message](${messageUrl})`
    
    // 緊急度を絵文字に基づいて設定
    const urgencyMap: { [key: string]: string } = {
      'memo': 'today',
      'clipboard': 'today',  
      'pencil': 'tomorrow',
      'spiral_note_pad': 'later',
      'page_with_curl': 'later'
    }
    
    const urgency = urgencyMap[event.reaction] || 'today'
    
    // 期限を設定
    let deadline = null
    const now = new Date()
    
    switch (urgency) {
      case 'today':
        deadline = now.toISOString().split('T')[0]
        break
      case 'tomorrow':
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        deadline = tomorrow.toISOString().split('T')[0]
        break
      case 'later':
        deadline = null
        break
    }

    // タスクを作成
    const { data, error } = await supabase
      .from('todos')
      .insert({
        user_id: userId,
        body: taskBody,
        title: `Slack: ${event.reaction}`,
        deadline,
        status: 'open',
        importance_score: 0.5 // デフォルト値
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    console.log('Task created from Slack reaction:', data.id)
    return data

  } catch (error) {
    console.error('Error creating task from reaction:', error)
    throw error
  }
}