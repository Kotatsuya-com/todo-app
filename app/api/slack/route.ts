import { NextRequest, NextResponse } from 'next/server'
import { requireAuthentication } from '@/lib/auth/authentication'
import { createServices } from '@/lib/services/ServiceFactory'
import { slackLogger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  let slackUrl: string | undefined
  try {
    // リクエストボディを解析
    const requestBody = await request.json()
    slackUrl = requestBody.slackUrl

    // 基本的な入力バリデーション
    if (!slackUrl || typeof slackUrl !== 'string') {
      return NextResponse.json(
        { error: 'SlackURLが必要です' },
        { status: 400 }
      )
    }

    // ユーザー認証
    const userId = await requireAuthentication(request)

    // サービス層でメッセージ取得処理
    const { slackMessageService } = createServices()
    const result = await slackMessageService.retrieveMessage(slackUrl, userId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode || 500 }
      )
    }

    return NextResponse.json(result.data)

  } catch (error) {
    // 認証エラーの処理
    if (error instanceof Error && error.message.includes('Authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
