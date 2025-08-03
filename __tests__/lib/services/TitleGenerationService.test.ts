/**
 * @jest-environment jsdom
 */

import { TitleGenerationService } from '@/lib/services/TitleGenerationService'
import {
  createMockTitleGenerationOptions,
  VALID_CONTENTS,
  INVALID_CONTENTS,
  COMPLEXITY_CONTENTS,
  EDGE_CASE_DATA
} from '@/__tests__/fixtures/title-generation.fixture'

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    },
    models: {
      retrieve: jest.fn()
    }
  }))
})

// Mock logger
jest.mock('@/lib/logger', () => ({
  apiLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    child: jest.fn().mockReturnValue({
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
    }),
  },
}))

import OpenAI from 'openai'

const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>

describe('TitleGenerationService', () => {
  let service: TitleGenerationService
  let mockOpenAIInstance: jest.Mocked<OpenAI>

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()

    // Create mock OpenAI instance
    mockOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn()
        }
      },
      models: {
        retrieve: jest.fn()
      }
    } as any

    // Mock OpenAI constructor to return our mock instance
    MockedOpenAI.mockImplementation(() => mockOpenAIInstance)

    // Create service instance
    service = new TitleGenerationService('test-api-key')
  })

  describe('constructor', () => {
    it('should create service with provided API key', () => {
      const customService = new TitleGenerationService('custom-key')
      expect(customService).toBeInstanceOf(TitleGenerationService)
      expect(MockedOpenAI).toHaveBeenCalledWith({ apiKey: 'custom-key' })
    })

    it('should use environment variable when no API key provided', () => {
      process.env.OPENAI_API_KEY = 'env-key'
      const envService = new TitleGenerationService()
      expect(MockedOpenAI).toHaveBeenCalledWith({ apiKey: 'env-key' })
    })

    it('should throw error when no API key available', () => {
      delete process.env.OPENAI_API_KEY
      expect(() => new TitleGenerationService()).toThrow('OpenAI API key is required')
    })
  })

  describe('generateTitle', () => {
    beforeEach(() => {
      // Set up default environment
      process.env.OPENAI_API_KEY = 'test-key'
    })

    it('should generate title successfully for valid content', async () => {
      const content = 'プロジェクトの企画書を作成する'
      const mockResponse = {
        choices: [{
          message: {
            content: '企画書作成'
          }
        }],
        usage: { total_tokens: 25 }
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      const result = await service.generateTitle(content)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.title).toBe('企画書作成')
      expect(result.data!.metadata).toBeDefined()
      expect(result.data!.metadata!.contentLength).toBe(content.length)
      expect(result.data!.metadata!.model).toBe('gpt-4o-mini')
    })

    it('should fail validation for invalid content', async () => {
      const result = await service.generateTitle('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Content is required')
      expect(result.statusCode).toBe(400)
      expect(mockOpenAIInstance.chat.completions.create).not.toHaveBeenCalled()
    })

    it('should handle OpenAI API errors gracefully', async () => {
      const content = 'valid content'
      const error = new Error('API Error')
      error.code = 'api_error'

      mockOpenAIInstance.chat.completions.create.mockRejectedValue(error)

      const result = await service.generateTitle(content)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error during title generation')
      expect(result.statusCode).toBe(500)
    })

    it('should handle quota exceeded error', async () => {
      const content = 'valid content'
      const error = new Error('Quota exceeded')
      error.code = 'insufficient_quota'

      mockOpenAIInstance.chat.completions.create.mockRejectedValue(error)

      const result = await service.generateTitle(content)

      expect(result.success).toBe(false)
      expect(result.error).toBe('AI service quota exceeded')
      expect(result.statusCode).toBe(429)
    })

    it('should handle rate limit exceeded error', async () => {
      const content = 'valid content'
      const error = new Error('Rate limit exceeded')
      error.code = 'rate_limit_exceeded'

      mockOpenAIInstance.chat.completions.create.mockRejectedValue(error)

      const result = await service.generateTitle(content)

      expect(result.success).toBe(false)
      expect(result.error).toBe('AI service rate limit exceeded')
      expect(result.statusCode).toBe(429)
    })

    it('should handle null response from OpenAI', async () => {
      const content = 'valid content'
      const mockResponse = {
        choices: [{
          message: {
            content: null
          }
        }]
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      const result = await service.generateTitle(content)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to generate title from AI service')
      expect(result.statusCode).toBe(500)
    })

    it('should use custom options when provided', async () => {
      const content = 'test content'
      const options = createMockTitleGenerationOptions({
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 30
      })

      const mockResponse = {
        choices: [{
          message: {
            content: 'Test Title'
          }
        }]
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      const result = await service.generateTitle(content, options)

      expect(result.success).toBe(true)
      expect(result.data!.metadata!.model).toBe('gpt-4')
      expect(result.data!.metadata!.temperature).toBe(0.5)

      // Verify API was called with correct parameters
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          temperature: 0.5,
          max_tokens: 30
        })
      )
    })

    it('should process generated title correctly', async () => {
      const content = 'test content'
      const mockResponse = {
        choices: [{
          message: {
            content: '  Generated Title  '
          }
        }]
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      const result = await service.generateTitle(content)

      expect(result.success).toBe(true)
      expect(result.data!.title).toBe('Generated Title') // Trimmed
    })

    it('should use fallback title when OpenAI returns empty content', async () => {
      const content = 'test content'
      const mockResponse = {
        choices: [{
          message: {
            content: ''
          }
        }]
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      const result = await service.generateTitle(content)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to generate title from AI service')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('generateTitlesBatch', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-key'
    })

    it('should process multiple contents successfully', async () => {
      const contents = ['タスク1', 'タスク2', 'タスク3']
      const mockResponse = {
        choices: [{
          message: {
            content: 'Generated Title'
          }
        }]
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      const result = await service.generateTitlesBatch(contents)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(3)
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledTimes(3)
    })

    it('should fail for empty contents array', async () => {
      const result = await service.generateTitlesBatch([])

      expect(result.success).toBe(false)
      expect(result.error).toBe('No content provided for batch processing')
      expect(result.statusCode).toBe(400)
    })

    it('should fail for batch size exceeding limit', async () => {
      const contents = Array(11).fill('content') // Exceeds max batch size of 10

      const result = await service.generateTitlesBatch(contents)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Batch size cannot exceed 10 items')
      expect(result.statusCode).toBe(400)
    })

    it('should handle partial success in batch processing', async () => {
      const contents = ['valid content', ''] // Second is invalid
      const mockResponse = {
        choices: [{
          message: {
            content: 'Generated Title'
          }
        }]
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      const result = await service.generateTitlesBatch(contents)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1) // Only one success
    })

    it('should fail when all items in batch fail', async () => {
      const contents = ['', '   '] // All invalid

      const result = await service.generateTitlesBatch(contents)

      expect(result.success).toBe(false)
      expect(result.error).toBe('All items in batch failed to process')
      expect(result.statusCode).toBe(500)
    })

    it('should handle batch processing with custom options', async () => {
      const contents = ['タスク1', 'タスク2']
      const options = createMockTitleGenerationOptions({ temperature: 0.3 })
      const mockResponse = {
        choices: [{
          message: {
            content: 'Generated Title'
          }
        }]
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      const result = await service.generateTitlesBatch(contents, options)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      
      // Verify all calls used the custom temperature
      const calls = mockOpenAIInstance.chat.completions.create.mock.calls
      calls.forEach(call => {
        expect(call[0].temperature).toBe(0.3)
      })
    })
  })

  describe('healthCheck', () => {
    it('should return healthy status when service is available', async () => {
      const mockModelResponse = {
        id: 'gpt-4o-mini',
        object: 'model'
      }

      mockOpenAIInstance.models.retrieve.mockResolvedValue(mockModelResponse as any)

      const result = await service.healthCheck()

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        status: 'healthy',
        model: 'gpt-4o-mini'
      })
    })

    it('should return unavailable status when service fails', async () => {
      mockOpenAIInstance.models.retrieve.mockRejectedValue(new Error('Service unavailable'))

      const result = await service.healthCheck()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Service unavailable')
      expect(result.statusCode).toBe(503)
    })
  })

  describe('edge cases and content complexity', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-key'
    })

    it('should handle simple content correctly', async () => {
      const content = COMPLEXITY_CONTENTS.simple[0]
      const mockResponse = {
        choices: [{
          message: {
            content: 'Simple Title'
          }
        }]
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      const result = await service.generateTitle(content)

      expect(result.success).toBe(true)
      expect(result.data!.metadata!.complexity).toBe('simple')
    })

    it('should handle medium complexity content', async () => {
      const content = COMPLEXITY_CONTENTS.medium[0]
      const mockResponse = {
        choices: [{
          message: {
            content: 'Medium Title'
          }
        }]
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      const result = await service.generateTitle(content)

      expect(result.success).toBe(true)
      expect(result.data!.metadata!.complexity).toBe('medium')
    })

    it('should handle complex content correctly', async () => {
      const content = COMPLEXITY_CONTENTS.complex[0]
      const mockResponse = {
        choices: [{
          message: {
            content: 'Complex Title'
          }
        }]
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      const result = await service.generateTitle(content)

      expect(result.success).toBe(true)
      expect(result.data!.metadata!.complexity).toBe('complex')
    })

    it('should handle special characters in content', async () => {
      const content = EDGE_CASE_DATA.specialCharacters.content
      const mockResponse = {
        choices: [{
          message: {
            content: 'Special Title'
          }
        }]
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      const result = await service.generateTitle(content)

      expect(result.success).toBe(true)
      expect(result.data!.title).toBe('Special Title')
    })

    it('should handle emoji content', async () => {
      const content = EDGE_CASE_DATA.emojiContent.content
      const mockResponse = {
        choices: [{
          message: {
            content: '🚀 Title'
          }
        }]
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      const result = await service.generateTitle(content)

      expect(result.success).toBe(true)
      expect(result.data!.title).toBe('🚀 Title')
    })

    it('should handle mixed language content', async () => {
      const content = EDGE_CASE_DATA.mixedLanguages.content
      const mockResponse = {
        choices: [{
          message: {
            content: 'Mixed Title'
          }
        }]
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      const result = await service.generateTitle(content)

      expect(result.success).toBe(true)
      expect(result.data!.title).toBe('Mixed Title')
    })

    it('should handle maximum length content', async () => {
      const content = EDGE_CASE_DATA.boundaryValues.maxLength
      const mockResponse = {
        choices: [{
          message: {
            content: 'Max Length Title'
          }
        }]
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      const result = await service.generateTitle(content)

      expect(result.success).toBe(true)
      expect(result.data!.metadata!.contentLength).toBe(2000)
    })
  })

  describe('API parameter generation', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-key'
    })

    it('should call OpenAI with correct parameters', async () => {
      const content = 'test content'
      const mockResponse = {
        choices: [{
          message: {
            content: 'Generated Title'
          }
        }]
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      await service.generateTitle(content)

      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 50,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('15文字以内')
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining(content)
            })
          ])
        })
      )
    })

    it('should include content in user message', async () => {
      const content = 'プロジェクト管理'
      const mockResponse = {
        choices: [{
          message: {
            content: 'Title'
          }
        }]
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      await service.generateTitle(content)

      const call = mockOpenAIInstance.chat.completions.create.mock.calls[0]
      const userMessage = call[0].messages.find(m => m.role === 'user')
      
      expect(userMessage.content).toContain(content)
    })
  })

  describe('error handling and logging', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-key'
    })

    it('should handle unexpected errors gracefully', async () => {
      const content = 'valid content'
      mockOpenAIInstance.chat.completions.create.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const result = await service.generateTitle(content)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error during title generation')
      expect(result.statusCode).toBe(500)
    })

    it('should handle OpenAI response without choices', async () => {
      const content = 'valid content'
      const mockResponse = {
        choices: []
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse as any)

      const result = await service.generateTitle(content)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to generate title from AI service')
      expect(result.statusCode).toBe(500)
    })

    it('should maintain consistent error response format', async () => {
      const errorScenarios = [
        () => service.generateTitle(''),
        () => service.generateTitle('a'.repeat(2001)),
        async () => {
          mockOpenAIInstance.chat.completions.create.mockRejectedValue(new Error('API Error'))
          return service.generateTitle('valid content')
        }
      ]

      for (const scenario of errorScenarios) {
        const result = await scenario()
        expect(result.success).toBe(false)
        expect(typeof result.error).toBe('string')
        expect(typeof result.statusCode).toBe('number')
        expect(result.data).toBeUndefined()
      }
    })
  })
})