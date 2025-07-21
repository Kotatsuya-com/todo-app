import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateTaskTitle } from '@/lib/openai-title'

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

// Service Role Keyを使用するSupabaseクライアントを作成
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log('Service client configuration:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
    urlPrefix: supabaseUrl?.substring(0, 30) + '...',
    serviceKeyPrefix: supabaseServiceKey?.substring(0, 20) + '...',
    serviceKeyType: supabaseServiceKey?.includes('eyJ') ? 'JWT format' : 'Invalid format'
  })
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration: URL or Service Role Key not found')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

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
    console.log('Processing reaction task creation:', {
      user: event.user,
      reaction: event.reaction,
      channel: event.item.channel,
      ts: event.item.ts
    })

    // メッセージ内容を取得
    const messageData = await getSlackMessage(event.item.channel, event.item.ts)
    
    if (!messageData) {
      console.warn('No message data found for reaction:', {
        channel: event.item.channel,
        ts: event.item.ts
      })
      return
    }

    if (!messageData.text) {
      console.warn('Message found but no text content:', {
        channel: event.item.channel,
        ts: event.item.ts,
        messageKeys: Object.keys(messageData)
      })
      return
    }

    // リアクションしたユーザーのSlack IDから内部ユーザーIDを取得
    const userId = await getUserIdFromSlackUserId(event.user)
    
    if (!userId) {
      console.warn('User not found for Slack user ID:', event.user)
      return
    }

    console.log('Creating task for user:', userId)

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

    console.log('Attempting to fetch message:', { channel, ts })

    // 最初にチャンネルのメッセージ履歴から検索
    let message = await tryGetChannelMessage(slackToken, channel, ts)
    
    if (message) {
      console.log('Found message in channel history:', { 
        channel, 
        ts, 
        text: message.text?.substring(0, 100) + '...',
        hasText: !!message.text 
      })
      return message
    }

    console.log('Message not found in channel history, checking for thread messages...')

    // チャンネル履歴で見つからない場合、スレッド内メッセージを検索
    message = await tryGetThreadMessage(slackToken, channel, ts)
    
    if (message) {
      console.log('Found message in thread:', { 
        channel, 
        ts, 
        text: message.text?.substring(0, 100) + '...',
        hasText: !!message.text 
      })
      return message
    }

    console.warn('No message found in channel or threads for:', { channel, ts })
    return null

  } catch (error) {
    console.error('Error fetching Slack message:', error)
    throw error
  }
}

async function tryGetChannelMessage(slackToken: string, channel: string, ts: string) {
  try {
    const queryParams = new URLSearchParams({
      channel,
      latest: ts,
      oldest: ts,
      inclusive: 'true',
      limit: '1'
    })

    const response = await fetch(`https://slack.com/api/conversations.history?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    
    if (!data.ok) {
      console.error('Slack API error in conversations.history:', data.error)
      return null
    }

    return data.messages?.[0] || null
  } catch (error) {
    console.error('Error in tryGetChannelMessage:', error)
    return null
  }
}

async function tryGetThreadMessage(slackToken: string, channel: string, ts: string) {
  try {
    // まず、チャンネル内の全てのメッセージを取得して、スレッドがあるメッセージを探す
    const channelResponse = await fetch(`https://slack.com/api/conversations.history?channel=${channel}&limit=100`, {
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json',
      },
    })

    const channelData = await channelResponse.json()
    
    if (!channelData.ok) {
      console.error('Slack API error in channel scan:', channelData.error)
      return null
    }

    // スレッドを持つメッセージを探す
    const threadsParents = channelData.messages?.filter((msg: any) => msg.reply_count > 0) || []
    
    console.log(`Found ${threadsParents.length} messages with threads`)

    // 各スレッドを検索
    for (const parent of threadsParents) {
      const queryParams = new URLSearchParams({
        channel,
        ts: parent.ts,
        limit: '200',
        inclusive: 'true'
      })

      const threadResponse = await fetch(`https://slack.com/api/conversations.replies?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${slackToken}`,
          'Content-Type': 'application/json',
        },
      })

      const threadData = await threadResponse.json()
      
      if (threadData.ok && threadData.messages) {
        // 指定されたタイムスタンプのメッセージを探す
        const targetMessage = threadData.messages.find((msg: any) => msg.ts === ts)
        if (targetMessage) {
          console.log('Found target message in thread with parent ts:', parent.ts)
          return targetMessage
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error in tryGetThreadMessage:', error)
    return null
  }
}

async function getUserIdFromSlackUserId(slackUserId: string) {
  try {
    const supabase = createServiceClient()
    
    console.log('Looking up user with Slack ID:', slackUserId)
    
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

    if (data) {
      console.log('Found user ID:', data.id)
      return data.id
    }

    console.warn('No user found for Slack user ID:', slackUserId)
    return null

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
    const supabase = createServiceClient()

    // メッセージURLを構築
    const messageUrl = `https://slack.com/archives/${event.item.channel}/p${event.item.ts.replace('.', '')}`
    
    // タスク本文を構築
    const taskBody = `${messageData.text}\n\n[Slack message](${messageUrl})`
    
    // OpenAIを使ってタイトルを生成
    let generatedTitle = `Slack: ${event.reaction}`
    try {
      generatedTitle = await generateTaskTitle(messageData.text)
      console.log('Generated title from OpenAI:', generatedTitle)
    } catch (titleError) {
      console.warn('Failed to generate title with OpenAI, using fallback:', titleError)
      // フォールバック: リアクション名を使用
    }
    
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
        title: generatedTitle,
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