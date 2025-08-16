/**
 * @jest-environment node
 */

jest.mock('@/lib/logger', () => ({
  apiLogger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}))

// OpenAIを完全にモック - まずモック関数を定義
let mockCreate: jest.Mock

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args: any[]) => mockCreate(...args)
      }
    }
  }))
})

import { generateTaskTitle } from '@/lib/openai-title'

describe('openai-title.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreate = jest.fn()
  })

  describe('generateTaskTitle', () => {
    it('should validate input parameters', async () => {
      await expect(generateTaskTitle('')).rejects.toThrow('Content is required and must be a string')
      await expect(generateTaskTitle(null as any)).rejects.toThrow('Content is required and must be a string')
    })

    it('should generate title successfully with valid response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'プロジェクト企画書作成'
            }
          }
        ]
      }

      mockCreate.mockResolvedValue(mockResponse)

      const result = await generateTaskTitle('来週までにプロジェクトの企画書を作成して、チームメンバーに共有する必要がある')

      expect(result).toBe('プロジェクト企画書作成')
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたはタスクの内容から簡潔で分かりやすい見出しを生成するアシスタントです。見出しは15文字以内で、タスクの本質を表すものにしてください。'
          },
          {
            role: 'user',
            content: '以下のタスクの内容から、簡潔な見出しを生成してください：\n\n来週までにプロジェクトの企画書を作成して、チームメンバーに共有する必要がある'
          }
        ],
        temperature: 0.7,
        max_tokens: 50
      })
    })

    it('should handle empty response content and return default', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null
            }
          }
        ]
      }

      mockCreate.mockResolvedValue(mockResponse)

      const result = await generateTaskTitle('テスト用のタスク内容')

      expect(result).toBe('タスク')
    })

    it('should handle empty choices array and return default', async () => {
      const mockResponse = {
        choices: []
      }

      mockCreate.mockResolvedValue(mockResponse)

      const result = await generateTaskTitle('テスト用のタスク内容')

      expect(result).toBe('タスク')
    })

    it('should handle undefined message content and return default', async () => {
      const mockResponse = {
        choices: [
          {
            message: {}
          }
        ]
      }

      mockCreate.mockResolvedValue(mockResponse)

      const result = await generateTaskTitle('テスト用のタスク内容')

      expect(result).toBe('タスク')
    })

    it('should trim whitespace from generated title', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '  プロジェクト管理  \n'
            }
          }
        ]
      }

      mockCreate.mockResolvedValue(mockResponse)

      const result = await generateTaskTitle('プロジェクト管理システムの導入')

      expect(result).toBe('プロジェクト管理')
    })

    it('should handle OpenAI API error and throw generic error', async () => {
      const mockError = new Error('OpenAI API rate limit exceeded')
      mockCreate.mockRejectedValue(mockError)

      await expect(generateTaskTitle('タスクの内容')).rejects.toThrow('Failed to generate title')

      const { apiLogger } = require('@/lib/logger')
      expect(apiLogger.error).toHaveBeenCalledWith(
        { error: mockError, contentLength: 6 },
        'Failed to generate title with OpenAI'
      )
    })

    it('should handle network error', async () => {
      const networkError = new Error('Network error')
      mockCreate.mockRejectedValue(networkError)

      await expect(generateTaskTitle('ネットワークテスト')).rejects.toThrow('Failed to generate title')

      const { apiLogger } = require('@/lib/logger')
      expect(apiLogger.error).toHaveBeenCalledWith(
        { error: networkError, contentLength: 9 },
        'Failed to generate title with OpenAI'
      )
    })
  })
})
