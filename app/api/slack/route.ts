import { NextRequest, NextResponse } from 'next/server'

interface SlackMessage {
  text: string
  user?: string
  ts: string
  channel?: string
}

export async function POST(request: NextRequest) {
  try {
    const { slackUrl } = await request.json()
    
    if (!slackUrl || typeof slackUrl !== 'string') {
      return NextResponse.json(
        { error: 'SlackURLが必要です' },
        { status: 400 }
      )
    }

    // SlackURLの形式をチェック（スレッド対応）
    const slackUrlPattern = /https:\/\/[a-zA-Z0-9-]+\.slack\.com\/archives\/([A-Z0-9]+)\/p([0-9]+)(?:\?thread_ts=([0-9.]+))?/
    const match = slackUrl.match(slackUrlPattern)
    
    if (!match) {
      return NextResponse.json(
        { error: '有効なSlackURLではありません' },
        { status: 400 }
      )
    }

    const [, channel, timestamp, threadTs] = match
    
    // Slack API用のトークンを環境変数から取得
    const slackToken = process.env.SLACK_BOT_TOKEN
    
    if (!slackToken) {
      return NextResponse.json(
        { error: 'Slack APIトークンが設定されていません' },
        { status: 500 }
      )
    }

    // タイムスタンプをSlack APIで使用できる形式に変換
    const ts = timestamp.substring(0, 10) + '.' + timestamp.substring(10)

    let response: Response
    let slackData: any

    // スレッドメッセージかどうかを判断
    if (threadTs) {
      // スレッド内のメッセージを取得
      const queryParams = new URLSearchParams({
        channel: channel,
        ts: threadTs,
        limit: '200', // スレッド内の全メッセージを取得
        inclusive: 'true'
      })
      
      response = await fetch(`https://slack.com/api/conversations.replies?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${slackToken}`,
          'Content-Type': 'application/json',
        }
      })
    } else {
      // チャンネル内のメッセージを取得
      const queryParams = new URLSearchParams({
        channel: channel,
        latest: ts,
        oldest: ts,
        limit: '1',
        inclusive: 'true'
      })
      
      response = await fetch(`https://slack.com/api/conversations.history?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${slackToken}`,
          'Content-Type': 'application/json',
        }
      })
    }

    slackData = await response.json()

    if (!slackData.ok) {
      console.error('Slack API error:', slackData.error)
      return NextResponse.json(
        { error: `Slack API エラー: ${slackData.error}` },
        { status: 400 }
      )
    }

    if (!slackData.messages || slackData.messages.length === 0) {
      return NextResponse.json(
        { error: 'メッセージが見つかりませんでした' },
        { status: 404 }
      )
    }

    // 特定のタイムスタンプに一致するメッセージを見つける
    const targetMessage = slackData.messages.find((msg: SlackMessage) => msg.ts === ts)
    
    if (!targetMessage) {
      return NextResponse.json(
        { error: '指定されたメッセージが見つかりませんでした' },
        { status: 404 }
      )
    }

    const message = targetMessage as SlackMessage

    return NextResponse.json({
      text: message.text,
      user: message.user,
      timestamp: message.ts,
      channel: channel,
      url: slackUrl
    })

  } catch (error) {
    console.error('Slack API 連携エラー:', error)
    return NextResponse.json(
      { error: 'Slackメッセージの取得に失敗しました' },
      { status: 500 }
    )
  }
}