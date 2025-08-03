import { NextRequest, NextResponse } from 'next/server'
import { createServices } from '@/lib/services/ServiceFactory'

export async function DELETE(request: NextRequest) {
  try {
    const { slackDisconnectionService } = createServices()

    // 1. ユーザー認証
    const authResult = await slackDisconnectionService.authenticateUser(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      )
    }

    const user = authResult.data!

    // 2. Slack統合の完全切断
    const disconnectionResult = await slackDisconnectionService.disconnectSlackIntegration(
      request,
      user.id
    )

    if (!disconnectionResult.success) {
      return NextResponse.json(
        { error: disconnectionResult.error },
        { status: disconnectionResult.statusCode || 500 }
      )
    }

    return NextResponse.json(disconnectionResult.data)

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
