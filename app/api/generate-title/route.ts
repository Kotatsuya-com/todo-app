import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'あなたはタスクの内容から簡潔で分かりやすい見出しを生成するアシスタントです。見出しは15文字以内で、タスクの本質を表すものにしてください。'
        },
        {
          role: 'user',
          content: `以下のタスクの内容から、簡潔な見出しを生成してください：\n\n${content}`
        }
      ],
      temperature: 0.7,
      max_tokens: 50,
    })

    const title = completion.choices[0]?.message?.content?.trim() || 'タスク'

    return NextResponse.json({ title })
  } catch (error: any) {
    console.error('Failed to generate title:', error)
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    )
  }
}