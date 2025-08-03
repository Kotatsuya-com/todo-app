import { NextRequest, NextResponse } from 'next/server'
import { createServices } from '@/lib/services/ServiceFactory'

export async function GET(request: NextRequest) {
  try {
    // サービス層でURL検出処理
    const { urlDetectionService } = createServices()
    const result = await urlDetectionService.detectAppUrlSimple(
      request.url,
      {
        protocol: request.nextUrl.protocol,
        hostname: request.nextUrl.hostname,
        port: request.nextUrl.port
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode || 500 }
      )
    }

    return NextResponse.json(result.data)

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to detect app URL' },
      { status: 500 }
    )
  }
}
