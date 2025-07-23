import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * OpenAIを使用してタスクの内容から簡潔な見出しを生成する
 * @param content タスクの内容
 * @returns 生成された見出し
 */
export async function generateTaskTitle(content: string): Promise<string> {
  if (!content || typeof content !== 'string') {
    throw new Error('Content is required and must be a string')
  }

  try {
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
      max_tokens: 50
    })

    const title = completion.choices[0]?.message?.content?.trim() || 'タスク'
    return title
  } catch (error) {
    console.error('Failed to generate title with OpenAI:', error)
    throw new Error('Failed to generate title')
  }
}
