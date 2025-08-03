import { NextRequest, NextResponse } from 'next/server'
import { requireAuthentication } from '@/lib/auth/authentication'
import { createServices } from '@/lib/services/ServiceFactory'

export async function GET(request: NextRequest) {
  try {
    // 認証処理
    const userId = await requireAuthentication(request)

    // サービス層で処理
    const { slackConnectionService } = createServices()
    const result = await slackConnectionService.getUserConnections(userId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
    }

    return NextResponse.json({ connections: result.data?.connections })

  } catch (error: any) {
    // 認証エラーの場合は401を返す
    if (error.message && error.message.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    const statusCode = error.statusCode || 500
    const message = error.message || 'Server error'
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 認証処理
    const userId = await requireAuthentication(request)

    // リクエストボディの取得
    const { connectionId } = await request.json()

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 })
    }

    // サービス層で処理
    const { slackConnectionService } = createServices()
    const result = await slackConnectionService.deleteUserConnection(connectionId, userId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    // 認証エラーの場合は401を返す
    if (error.message && error.message.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    const statusCode = error.statusCode || 500
    const message = error.message || 'Server error'
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
