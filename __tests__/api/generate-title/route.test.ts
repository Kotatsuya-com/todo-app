/**
 * @jest-environment node
 */

import { POST } from '@/app/api/generate-title/route'
import { 
  createMockNextRequest,
  createMockOpenAIResponse,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from '@/__tests__/mocks'

// OpenAI のモック
jest.mock('@/lib/openai-title', () => ({
  generateTaskTitle: jest.fn()
}))

const { generateTaskTitle } = require('@/lib/openai-title')

describe('/api/generate-title/route.ts - POST', () => {
  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()
    generateTaskTitle.mockClear()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('入力検証', () => {
    it('textが提供されていない場合、400エラーを返す', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: {},
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Content is required')
    })

    it('textが文字列でない場合、400エラーを返す', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: { content: 123 },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Content is required')
    })

    it('textが空文字列の場合、400エラーを返す', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: { content: '' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Content is required')
    })

    it('textが長すぎる場合、正常に処理される', async () => {
      const longText = 'a'.repeat(2001) // 2000文字を超える
      generateTaskTitle.mockResolvedValue('Very Long Text Title')

      const request = createMockNextRequest({
        method: 'POST',
        body: { content: longText },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('Very Long Text Title')
    })
  })

  describe('OpenAI API連携', () => {
    it('正常なテキストでタイトルを生成する', async () => {
      const generatedTitle = 'Generated Task Title'
      generateTaskTitle.mockResolvedValue(generatedTitle)

      const request = createMockNextRequest({
        method: 'POST',
        body: { content: 'This is a task description that needs a title' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe(generatedTitle)
    })

    it('OpenAI APIに正しいパラメータを送信する', async () => {
      const inputText = 'Create a meeting agenda for the quarterly review'
      generateTaskTitle.mockResolvedValue('Quarterly Review Meeting Agenda')

      const request = createMockNextRequest({
        method: 'POST',
        body: { content: inputText },
      })

      await POST(request as any)

      expect(generateTaskTitle).toHaveBeenCalledWith(inputText)
    })

    it('OpenAI APIエラー（HTTPエラー）の場合、500エラーを返す', async () => {
      generateTaskTitle.mockRejectedValue(new Error('Rate limit exceeded'))

      const request = createMockNextRequest({
        method: 'POST',
        body: { content: 'Test task description' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate title')
    })

    it('OpenAI APIレスポンス形式エラーの場合、500エラーを返す', async () => {
      generateTaskTitle.mockRejectedValue(new Error('Invalid response format'))

      const request = createMockNextRequest({
        method: 'POST',
        body: { content: 'Test task description' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate title')
    })

    it('OpenAI APIレスポンスにcontentがない場合、500エラーを返す', async () => {
      generateTaskTitle.mockRejectedValue(new Error('No content in response'))

      const request = createMockNextRequest({
        method: 'POST',
        body: { content: 'Test task description' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate title')
    })

    it('ネットワークエラーの場合、500エラーを返す', async () => {
      generateTaskTitle.mockRejectedValue(new Error('Network error'))

      const request = createMockNextRequest({
        method: 'POST',
        body: { content: 'Test task description' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate title')
    })
  })

  describe('文字数制限テスト', () => {
    it('2000文字ちょうどのテキストを受け入れる', async () => {
      const maxLengthText = 'a'.repeat(2000)
      generateTaskTitle.mockResolvedValue('Long Text Summary')

      const request = createMockNextRequest({
        method: 'POST',
        body: { content: maxLengthText },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('Long Text Summary')
    })

    it('1文字のテキストを受け入れる', async () => {
      const shortText = 'a'
      generateTaskTitle.mockResolvedValue('A')

      const request = createMockNextRequest({
        method: 'POST',
        body: { content: shortText },
      })

      const response = await POST(request as any)

      expect(response.status).toBe(200)
    })
  })

  describe('特殊文字・多言語テキスト', () => {
    it('日本語テキストを正しく処理する', async () => {
      const japaneseText = '会議の議題を作成する必要があります'
      generateTaskTitle.mockResolvedValue('会議議題作成')

      const request = createMockNextRequest({
        method: 'POST',
        body: { content: japaneseText },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('会議議題作成')
    })

    it('絵文字を含むテキストを正しく処理する', async () => {
      const emojiText = '🎉 Plan a birthday party for next week 🎂'
      generateTaskTitle.mockResolvedValue('Plan Birthday Party')

      const request = createMockNextRequest({
        method: 'POST',
        body: { content: emojiText },
      })

      const response = await POST(request as any)

      expect(response.status).toBe(200)
    })

    it('改行を含むテキストを正しく処理する', async () => {
      const multilineText = 'Line 1\nLine 2\nLine 3'
      generateTaskTitle.mockResolvedValue('Multi-line Task')

      const request = createMockNextRequest({
        method: 'POST',
        body: { content: multilineText },
      })

      const response = await POST(request as any)

      expect(response.status).toBe(200)
    })
  })

  describe('JSON解析エラー', () => {
    it('不正なJSONの場合、500エラーを返す', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: { content: 'test' },
      })

      request.json = jest.fn().mockRejectedValue(new Error('JSON parse error'))

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate title')
    })
  })

  describe('環境変数チェック', () => {
    it('OpenAI APIキーが設定されていない場合でも正常に動作する', async () => {
      // 環境変数を一時的に削除
      const originalApiKey = process.env.OPENAI_API_KEY
      delete process.env.OPENAI_API_KEY

      generateTaskTitle.mockResolvedValue('Generated Title')

      const request = createMockNextRequest({
        method: 'POST',
        body: { content: 'Test task' },
      })

      const response = await POST(request as any)

      // APIキーを復元
      process.env.OPENAI_API_KEY = originalApiKey

      // 処理は続行される
      expect(response.status).toBe(200)
    })
  })

  describe('レスポンス形式', () => {
    it('正常レスポンスが期待される形式を返す', async () => {
      const generatedTitle = 'Task Title'
      generateTaskTitle.mockResolvedValue(generatedTitle)

      const request = createMockNextRequest({
        method: 'POST',
        body: { content: 'Task description' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(data).toHaveProperty('title')
      expect(typeof data.title).toBe('string')
      expect(data.title).toBe(generatedTitle)
    })

    it('エラーレスポンスが期待される形式を返す', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: {},
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
    })
  })
})