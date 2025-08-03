import { NextRequest, NextResponse } from 'next/server'
import { createServices } from '@/lib/services/ServiceFactory'
import { apiLogger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを解析
    const { content } = await request.json()

    // 基本的な入力バリデーション
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // サービス層でタイトル生成処理
    const { titleGenerationService } = createServices()
    const result = await titleGenerationService.generateTitle(content)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode || 500 }
      )
    }

    return NextResponse.json({ title: result.data!.title })

  } catch (error: any) {
    apiLogger.error({ error }, 'Failed to generate title')
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    )
  }
}
