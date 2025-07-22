import { NextRequest, NextResponse } from 'next/server'
import { getSlackMessageFromUrl, parseSlackUrl } from '@/lib/slack-message'

export async function POST(request: NextRequest) {
  try {
    const { slackUrl } = await request.json()
    
    if (!slackUrl || typeof slackUrl !== 'string') {
      return NextResponse.json(
        { error: 'SlackURLが必要です' },
        { status: 400 }
      )
    }

    // SlackURLの形式をチェック
    const parsed = parseSlackUrl(slackUrl)
    if (!parsed) {
      return NextResponse.json(
        { error: '有効なSlackURLではありません' },
        { status: 400 }
      )
    }

    // Slack API用のトークンを環境変数から取得
    const slackToken = process.env.SLACK_BOT_TOKEN
    
    if (!slackToken) {
      return NextResponse.json(
        { error: 'Slack APIトークンが設定されていません' },
        { status: 500 }
      )
    }

    // 共通関数を使用してメッセージを取得
    const messageResult = await getSlackMessageFromUrl(slackUrl)
    
    if (!messageResult) {
      return NextResponse.json(
        { error: 'メッセージが見つかりませんでした' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      text: messageResult.text,
      user: messageResult.user,
      timestamp: messageResult.timestamp,
      channel: messageResult.channel,
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