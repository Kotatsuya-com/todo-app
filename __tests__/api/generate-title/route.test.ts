/**
 * @jest-environment node
 */

import { POST } from '@/app/api/generate-title/route'
import { TitleGenerationService } from '@/lib/services/TitleGenerationService'
import { createServices } from '@/lib/services/ServiceFactory'
import { 
  createMockNextRequest,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from '@/__tests__/mocks'

// Mock dependencies
jest.mock('@/lib/services/ServiceFactory')
jest.mock('@/lib/logger', () => ({
  apiLogger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}))

const mockCreateServices = createServices as jest.MockedFunction<typeof createServices>

describe('/api/generate-title/route.ts - Clean Architecture', () => {
  let mockTitleGenerationService: jest.Mocked<TitleGenerationService>

  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()

    // Create mock service
    mockTitleGenerationService = {
      generateTitle: jest.fn(),
      generateTitlesBatch: jest.fn(),
      healthCheck: jest.fn(),
    } as any

    // Mock createServices to return our mock service
    mockCreateServices.mockReturnValue({
      titleGenerationService: mockTitleGenerationService,
    } as any)
  })

  afterEach(() => {
    cleanupTestEnvironment()
    jest.clearAllMocks()
  })

  describe('Input validation', () => {
    it('should return 400 when content is missing', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: {},
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Content is required')
      expect(mockTitleGenerationService.generateTitle).not.toHaveBeenCalled()
    })

    it('should return 400 when content is not a string', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: { content: 123 },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Content is required')
      expect(mockTitleGenerationService.generateTitle).not.toHaveBeenCalled()
    })

    it('should return 400 when content is empty string', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: { content: '' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Content is required')
      expect(mockTitleGenerationService.generateTitle).not.toHaveBeenCalled()
    })

    it('should return 400 when content is null', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: { content: null },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Content is required')
      expect(mockTitleGenerationService.generateTitle).not.toHaveBeenCalled()
    })
  })

  describe('Service integration', () => {
    it('should generate title successfully for valid content', async () => {
      const content = 'プロジェクトの企画書を作成する'
      const mockResponse = {
        title: '企画書作成',
        metadata: {
          model: 'gpt-4o-mini',
          contentLength: content.length,
          complexity: 'medium',
          temperature: 0.7
        }
      }

      mockTitleGenerationService.generateTitle.mockResolvedValue({
        success: true,
        data: mockResponse
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { content },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('企画書作成')
      expect(mockTitleGenerationService.generateTitle).toHaveBeenCalledWith(content)
    })

    it('should handle service validation errors (400)', async () => {
      const content = 'a'.repeat(2001) // Too long content

      mockTitleGenerationService.generateTitle.mockResolvedValue({
        success: false,
        error: 'Content cannot exceed 2000 characters',
        statusCode: 400
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { content },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Content cannot exceed 2000 characters')
    })

    it('should handle service rate limit errors (429)', async () => {
      const content = 'valid content'

      mockTitleGenerationService.generateTitle.mockResolvedValue({
        success: false,
        error: 'AI service rate limit exceeded',
        statusCode: 429
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { content },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('AI service rate limit exceeded')
    })

    it('should handle service server errors (500)', async () => {
      const content = 'valid content'

      mockTitleGenerationService.generateTitle.mockResolvedValue({
        success: false,
        error: 'Internal server error during title generation',
        statusCode: 500
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { content },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error during title generation')
    })

    it('should handle service errors without status code', async () => {
      const content = 'valid content'

      mockTitleGenerationService.generateTitle.mockResolvedValue({
        success: false,
        error: 'Unknown service error'
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { content },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Unknown service error')
    })
  })

  describe('Service Factory integration', () => {
    it('should create services correctly', async () => {
      const content = 'test content'
      mockTitleGenerationService.generateTitle.mockResolvedValue({
        success: true,
        data: { title: 'Test Title', metadata: { model: 'gpt-4o-mini', contentLength: 12, complexity: 'simple', temperature: 0.3 } }
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { content },
      })

      await POST(request as any)

      expect(mockCreateServices).toHaveBeenCalledTimes(1)
      expect(mockCreateServices).toHaveBeenCalledWith()
    })

    it('should use titleGenerationService from factory', async () => {
      const content = 'test content'
      mockTitleGenerationService.generateTitle.mockResolvedValue({
        success: true,
        data: { title: 'Test Title', metadata: { model: 'gpt-4o-mini', contentLength: 12, complexity: 'simple', temperature: 0.3 } }
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { content },
      })

      await POST(request as any)

      // Verify that the service from the factory was used
      expect(mockTitleGenerationService.generateTitle).toHaveBeenCalledWith(content)
    })
  })

  describe('Content types and complexity', () => {
    it('should handle simple Japanese content', async () => {
      const content = 'タスク'
      const mockResponse = {
        title: 'タスク',
        metadata: {
          model: 'gpt-4o-mini',
          contentLength: content.length,
          complexity: 'simple',
          temperature: 0.3
        }
      }

      mockTitleGenerationService.generateTitle.mockResolvedValue({
        success: true,
        data: mockResponse
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { content },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('タスク')
    })

    it('should handle English content', async () => {
      const content = 'Create a meeting agenda for the quarterly review'
      const mockResponse = {
        title: 'Quarterly Review Agenda',
        metadata: {
          model: 'gpt-4o-mini',
          contentLength: content.length,
          complexity: 'medium',
          temperature: 0.7
        }
      }

      mockTitleGenerationService.generateTitle.mockResolvedValue({
        success: true,
        data: mockResponse
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { content },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('Quarterly Review Agenda')
    })

    it('should handle content with special characters', async () => {
      const content = 'Task with @symbols and #hashtags & special chars!'
      const mockResponse = {
        title: 'Special Task',
        metadata: {
          model: 'gpt-4o-mini',
          contentLength: content.length,
          complexity: 'medium',
          temperature: 0.7
        }
      }

      mockTitleGenerationService.generateTitle.mockResolvedValue({
        success: true,
        data: mockResponse
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { content },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('Special Task')
    })

    it('should handle content with emojis', async () => {
      const content = '🎉 Plan a birthday party for next week 🎂'
      const mockResponse = {
        title: '🎂 Birthday Party',
        metadata: {
          model: 'gpt-4o-mini',
          contentLength: content.length,
          complexity: 'simple',
          temperature: 0.3
        }
      }

      mockTitleGenerationService.generateTitle.mockResolvedValue({
        success: true,
        data: mockResponse
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { content },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('🎂 Birthday Party')
    })

    it('should handle multiline content', async () => {
      const content = 'Line 1\nLine 2\nLine 3'
      const mockResponse = {
        title: 'Multi-line Task',
        metadata: {
          model: 'gpt-4o-mini',
          contentLength: content.length,
          complexity: 'simple',
          temperature: 0.3
        }
      }

      mockTitleGenerationService.generateTitle.mockResolvedValue({
        success: true,
        data: mockResponse
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { content },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('Multi-line Task')
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle JSON parsing errors gracefully', async () => {
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

    it('should handle service exceptions gracefully', async () => {
      const content = 'valid content'
      mockTitleGenerationService.generateTitle.mockRejectedValue(new Error('Service exception'))

      const request = createMockNextRequest({
        method: 'POST',
        body: { content },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate title')
    })

    it('should maintain consistent response format', async () => {
      const errorScenarios = [
        async () => {
          const request = createMockNextRequest({ method: 'POST', body: {} })
          return await POST(request as any)
        },
        async () => {
          mockTitleGenerationService.generateTitle.mockResolvedValue({
            success: false,
            error: 'Service error',
            statusCode: 400
          })
          const request = createMockNextRequest({ method: 'POST', body: { content: 'test' } })
          return await POST(request as any)
        }
      ]

      for (const scenario of errorScenarios) {
        const response = await scenario()
        const data = await response.json()
        
        expect(typeof response.status).toBe('number')
        expect(typeof data.error).toBe('string')
        expect(data.error.length).toBeGreaterThan(0)
      }
    })

    it('should handle long content gracefully', async () => {
      const longContent = 'a'.repeat(1999) // Just under the limit
      const mockResponse = {
        title: 'Long Content Summary',
        metadata: {
          model: 'gpt-4o-mini',
          contentLength: longContent.length,
          complexity: 'complex',
          temperature: 0.9
        }
      }

      mockTitleGenerationService.generateTitle.mockResolvedValue({
        success: true,
        data: mockResponse
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { content: longContent },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('Long Content Summary')
    })
  })

  describe('Response format', () => {
    it('should return correct success response format', async () => {
      const content = 'test content'
      const mockResponse = {
        title: 'Test Title',
        metadata: {
          model: 'gpt-4o-mini',
          contentLength: content.length,
          complexity: 'simple',
          temperature: 0.3
        }
      }

      mockTitleGenerationService.generateTitle.mockResolvedValue({
        success: true,
        data: mockResponse
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { content },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(data).toHaveProperty('title')
      expect(typeof data.title).toBe('string')
      expect(data.title).toBe('Test Title')
      // Note: API only returns title, not metadata
      expect(data).not.toHaveProperty('metadata')
    })

    it('should return correct error response format', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: {},
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data).not.toHaveProperty('title')
    })
  })
})