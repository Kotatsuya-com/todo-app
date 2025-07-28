import { NextRequest, NextResponse } from 'next/server'
import { generateTaskTitle } from '@/lib/openai-title'
import { apiLogger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const title = await generateTaskTitle(content)

    return NextResponse.json({ title })
  } catch (error: any) {
    apiLogger.error({ error }, 'Failed to generate title')
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    )
  }
}
