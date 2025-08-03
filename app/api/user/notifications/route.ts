import { NextRequest, NextResponse } from 'next/server'
import { requireAuthentication } from '@/lib/auth/authentication'
import { createServices } from '@/lib/services/ServiceFactory'

export async function GET(request: NextRequest) {
  try {
    // 認証処理
    const userId = await requireAuthentication(request)

    // サービス層で処理
    const { notificationSettingsService } = createServices()
    const result = await notificationSettingsService.getUserNotificationSettings(userId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
    }

    return NextResponse.json(result.data)

  } catch (error: any) {
    // 認証エラーの場合は401を返す
    if (error.message && error.message.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    const statusCode = error.statusCode || 500
    const message = error.message || 'Internal server error'
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 認証処理
    const userId = await requireAuthentication(request)

    // リクエストボディの取得
    const updateRequest = await request.json()

    // サービス層で処理
    const { notificationSettingsService } = createServices()
    const result = await notificationSettingsService.updateUserNotificationSettings(userId, updateRequest)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
    }

    return NextResponse.json(result.data)

  } catch (error: any) {
    // 認証エラーの場合は401を返す
    if (error.message && error.message.includes('Authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    const statusCode = error.statusCode || 500
    const message = error.message || 'Internal server error'
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
