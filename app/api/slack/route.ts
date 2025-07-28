import { NextRequest, NextResponse } from 'next/server'
import { getSlackMessageFromUrl, parseSlackUrl } from '@/lib/slack-message'
import { createClient } from '@/lib/supabase'
import { slackLogger } from '@/lib/logger'

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

    // ユーザー認証
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // URLからワークスペースIDを特定する方法を実装する必要があります
    // 現在は最初に見つかったSlack接続を使用
    const { data: connections, error: connectionError } = await supabase
      .from('slack_connections')
      .select('access_token, workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (connectionError || !connections) {
      return NextResponse.json(
        { error: 'Slackワークスペースに接続されていません。設定画面で接続してください。' },
        { status: 400 }
      )
    }

    // 共通関数を使用してメッセージを取得（ユーザー固有のトークンを使用）
    const messageResult = await getSlackMessageFromUrl(slackUrl, connections.access_token)

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
    slackLogger.error({ error }, 'Slack API integration error')
    return NextResponse.json(
      { error: 'Slackメッセージの取得に失敗しました' },
      { status: 500 }
    )
  }
}
