import { NextRequest, NextResponse } from 'next/server'
import { getSlackMessageFromUrl, parseSlackUrl } from '@/lib/slack-message'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { slackLogger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  let slackUrl: string | undefined
  try {
    const requestBody = await request.json()
    slackUrl = requestBody.slackUrl

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

    // ユーザー認証（サーバーサイド）
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // URLからワークスペース名を抽出して該当する接続を探す
    let connection = null

    // 全ての接続を取得
    const { data: allConnections, error: connectionError } = await supabase
      .from('slack_connections')
      .select('access_token, workspace_id, workspace_name, team_name')
      .eq('user_id', user.id)

    if (connectionError || !allConnections || allConnections.length === 0) {
      return NextResponse.json(
        { error: 'Slackワークスペースに接続されていません。設定画面で接続してください。' },
        { status: 400 }
      )
    }

    // URLのワークスペース名と一致する接続を探す
    connection = allConnections.find(conn =>
      conn.workspace_id === parsed.workspace ||
      conn.workspace_name.toLowerCase() === parsed.workspace.toLowerCase() ||
      conn.team_name.toLowerCase() === parsed.workspace.toLowerCase()
    )

    // 見つからない場合は最初の接続を使用
    if (!connection) {
      slackLogger.warn({
        urlWorkspace: parsed.workspace,
        availableWorkspaces: allConnections.map(c => ({ id: c.workspace_id, name: c.workspace_name, team: c.team_name }))
      }, 'No matching workspace found, using first connection')
      connection = allConnections[0]
    }

    slackLogger.debug({
      urlWorkspace: parsed.workspace,
      selectedWorkspace: { id: connection.workspace_id, name: connection.workspace_name },
      totalConnections: allConnections.length
    }, 'Selected Slack connection')

    // 共通関数を使用してメッセージを取得（ユーザー固有のトークンを使用）
    const messageResult = await getSlackMessageFromUrl(slackUrl, connection.access_token)

    if (!messageResult) {
      return NextResponse.json(
        {
          error: 'メッセージが見つかりませんでした',
          details: 'Slackメッセージへのアクセス権限がないか、メッセージが削除されている可能性があります。',
          workspace: connection.workspace_name
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      text: messageResult.text,
      user: messageResult.user,
      timestamp: messageResult.timestamp,
      channel: messageResult.channel,
      url: slackUrl,
      workspace: connection.workspace_name
    })

  } catch (error) {
    slackLogger.error({ error, slackUrl }, 'Slack API integration error')
    return NextResponse.json(
      {
        error: 'Slackメッセージの取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
