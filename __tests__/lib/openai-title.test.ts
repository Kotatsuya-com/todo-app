/**
 * @jest-environment node
 */

jest.mock('@/lib/logger', () => ({
  apiLogger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }
}))

// OpenAIを完全にモック
jest.mock('openai')

import { generateTaskTitle } from '@/lib/openai-title'
import OpenAI from 'openai'

describe('openai-title.ts', () => {
  let mockCreate: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockCreate = jest.fn()
    ;(OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }) as any)
  })

  describe('generateTaskTitle', () => {
    it('should validate input parameters', async () => {
      await expect(generateTaskTitle('')).rejects.toThrow('Content is required and must be a string')
      await expect(generateTaskTitle(null as any)).rejects.toThrow('Content is required and must be a string')
    })
  })
})