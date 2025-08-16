/**
 * @jest-environment node
 */

/**
 * Title Generation API routes unit tests
 * Dependency Injection version tests
 */

import { NextRequest } from 'next/server'
import { createTitleGenerationHandlers } from '@/lib/factories/HandlerFactory'
import { TestContainer } from '@/lib/containers/TestContainer'

// Mock the production container import
jest.mock('@/lib/containers/ProductionContainer')

describe('/api/generate-title API Routes', () => {
  let container: TestContainer
  let mockRequest: NextRequest
  let handlers: { POST: any }

  beforeEach(() => {
    // Create test container
    container = new TestContainer()
    
    // Create handlers with test container
    handlers = createTitleGenerationHandlers(container)

    // Mock request
    mockRequest = {
      json: jest.fn()
    } as any
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/generate-title', () => {
    it('should generate title successfully', async () => {
      const requestBody = { content: 'This is a sample content for generating a title' }
      const mockResponse = {
        success: true,
        data: {
          title: 'Generated Task Title'
        }
      }

      mockRequest.json = jest.fn().mockResolvedValue(requestBody)
      container.updateServiceMock('titleGenerationService', {
        generateTitle: jest.fn().mockResolvedValue(mockResponse)
      })

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(mockRequest.json).toHaveBeenCalled()
      expect(container.services.titleGenerationService.generateTitle).toHaveBeenCalledWith(requestBody.content)
      expect(response.status).toBe(200)
      expect(responseBody).toEqual({ title: mockResponse.data.title })
    })

    it('should handle missing content', async () => {
      const requestBody = {}
      mockRequest.json = jest.fn().mockResolvedValue(requestBody)

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(400)
      expect(responseBody).toEqual({ error: 'Content is required' })
    })

    it('should handle invalid content type', async () => {
      const requestBody = { content: 123 }
      mockRequest.json = jest.fn().mockResolvedValue(requestBody)

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(400)
      expect(responseBody).toEqual({ error: 'Content is required' })
    })

    it('should handle empty content string', async () => {
      const requestBody = { content: '' }
      mockRequest.json = jest.fn().mockResolvedValue(requestBody)

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(400)
      expect(responseBody).toEqual({ error: 'Content is required' })
    })

    it('should handle service errors', async () => {
      const requestBody = { content: 'Sample content' }
      const mockErrorResponse = {
        success: false,
        error: 'OpenAI API error',
        statusCode: 500
      }

      mockRequest.json = jest.fn().mockResolvedValue(requestBody)
      container.updateServiceMock('titleGenerationService', {
        generateTitle: jest.fn().mockResolvedValue(mockErrorResponse)
      })

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'OpenAI API error' })
    })

    it('should handle service errors without status code', async () => {
      const requestBody = { content: 'Sample content' }
      const mockErrorResponse = {
        success: false,
        error: 'Unknown service error'
      }

      mockRequest.json = jest.fn().mockResolvedValue(requestBody)
      container.updateServiceMock('titleGenerationService', {
        generateTitle: jest.fn().mockResolvedValue(mockErrorResponse)
      })

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Unknown service error' })
    })

    it('should handle unexpected errors', async () => {
      const requestBody = { content: 'Sample content' }
      mockRequest.json = jest.fn().mockResolvedValue(requestBody)

      container.updateServiceMock('titleGenerationService', {
        generateTitle: jest.fn().mockRejectedValue(new Error('Unexpected error'))
      })

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Failed to generate title' })
    })

    it('should handle JSON parsing errors', async () => {
      mockRequest.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Failed to generate title' })
    })
  })

  describe('Dependency Injection compliance', () => {
    it('should use test container for all dependencies', async () => {
      const requestBody = { content: 'Sample content' }
      mockRequest.json = jest.fn().mockResolvedValue(requestBody)

      await handlers.POST(mockRequest)

      expect(container.services.titleGenerationService.generateTitle).toHaveBeenCalled()
    })

    it('should allow mock updates for testing different scenarios', async () => {
      const requestBody = { content: 'Sample content' }
      const customResponse = {
        success: true,
        data: { title: 'Custom Generated Title' }
      }

      mockRequest.json = jest.fn().mockResolvedValue(requestBody)
      container.updateServiceMock('titleGenerationService', {
        generateTitle: jest.fn().mockResolvedValue(customResponse)
      })

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(responseBody).toEqual({ title: customResponse.data.title })
    })
  })
})