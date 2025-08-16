/**
 * @jest-environment node
 */

/**
 * Emoji Settings API routes unit tests
 * Dependency Injection version tests
 */

import { NextRequest } from 'next/server'
import { createEmojiSettingsHandlers } from '@/lib/factories/HandlerFactory'
import { TestContainer } from '@/lib/containers/TestContainer'

// Mock the production container import
jest.mock('@/lib/containers/ProductionContainer')

describe('/api/user/emoji-settings API Routes', () => {
  let container: TestContainer
  let mockRequest: NextRequest
  let handlers: { GET: any, PUT: any, POST: any }

  beforeEach(() => {
    // Create test container
    container = new TestContainer()
    
    // Create handlers with test container
    handlers = createEmojiSettingsHandlers(container)

    // Mock request
    mockRequest = {
      json: jest.fn()
    } as any
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/user/emoji-settings', () => {
    it('should return user emoji settings successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'mock-settings-id',
          userId: 'mock-user-id',
          emojiSettings: {
            urgent_important: '🔥',
            not_urgent_important: '📋',
            urgent_not_important: '⚡',
            not_urgent_not_important: '💡',
            completed: '✅'
          }
        }
      }

      container.updateServiceMock('emojiSettingsService', {
        getUserEmojiSettings: jest.fn().mockResolvedValue(mockResponse)
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(container.auth.requireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(container.services.emojiSettingsService.getUserEmojiSettings).toHaveBeenCalledWith('mock-user-id')
      expect(response.status).toBe(200)
      expect(responseBody).toEqual(mockResponse.data)
    })

    it('should handle service errors', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Failed to fetch emoji settings',
        statusCode: 500
      }

      container.updateServiceMock('emojiSettingsService', {
        getUserEmojiSettings: jest.fn().mockResolvedValue(mockErrorResponse)
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Failed to fetch emoji settings' })
    })

    it('should handle authentication errors', async () => {
      container.updateAuthMock({
        requireAuthentication: jest.fn().mockRejectedValue(new Error('Authentication failed'))
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(401)
      expect(responseBody).toEqual({ error: 'Authentication failed' })
    })
  })

  describe('PUT /api/user/emoji-settings', () => {
    it('should update user emoji settings successfully', async () => {
      const updateRequest = {
        today_emoji: 'fire',
        tomorrow_emoji: 'memo',
        later_emoji: 'bookmark'
      }
      const mockResponse = {
        success: true,
        data: {
          id: 'mock-settings-id',
          userId: 'mock-user-id',
          emojiSettings: updateRequest
        }
      }

      mockRequest.json = jest.fn().mockResolvedValue(updateRequest)
      container.updateServiceMock('emojiSettingsService', {
        updateUserEmojiSettings: jest.fn().mockResolvedValue(mockResponse)
      })

      const response = await handlers.PUT(mockRequest)
      const responseBody = await response.json()

      expect(container.auth.requireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(mockRequest.json).toHaveBeenCalled()
      expect(container.services.emojiSettingsService.updateUserEmojiSettings).toHaveBeenCalledWith('mock-user-id', updateRequest)
      expect(response.status).toBe(200)
      expect(responseBody).toEqual(mockResponse.data)
    })

    it('should reject invalid emoji selections', async () => {
      const invalidRequest = {
        today_emoji: 'invalid_emoji'
      }
      const mockErrorResponse = {
        success: false,
        error: 'Invalid emoji selection: Invalid today_emoji: invalid_emoji',
        statusCode: 400
      }

      mockRequest.json = jest.fn().mockResolvedValue(invalidRequest)
      container.updateServiceMock('emojiSettingsService', {
        updateUserEmojiSettings: jest.fn().mockResolvedValue(mockErrorResponse)
      })

      const response = await handlers.PUT(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(400)
      expect(responseBody).toEqual({ error: mockErrorResponse.error })
    })

    it('should handle authentication errors', async () => {
      container.updateAuthMock({
        requireAuthentication: jest.fn().mockRejectedValue(new Error('Unauthorized'))
      })

      const response = await handlers.PUT(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(401)
      expect(responseBody).toEqual({ error: 'Unauthorized' })
    })
  })

  describe('POST /api/user/emoji-settings (reset)', () => {
    it('should reset user emoji settings to defaults', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'mock-settings-id',
          userId: 'mock-user-id',
          message: 'Emoji settings reset to defaults'
        }
      }

      container.updateServiceMock('emojiSettingsService', {
        resetUserEmojiSettings: jest.fn().mockResolvedValue(mockResponse)
      })

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(container.auth.requireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(container.services.emojiSettingsService.resetUserEmojiSettings).toHaveBeenCalledWith('mock-user-id')
      expect(response.status).toBe(200)
      expect(responseBody).toEqual(mockResponse.data)
    })

    it('should handle service errors during reset', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Failed to reset emoji settings',
        statusCode: 500
      }

      container.updateServiceMock('emojiSettingsService', {
        resetUserEmojiSettings: jest.fn().mockResolvedValue(mockErrorResponse)
      })

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Failed to reset emoji settings' })
    })

    it('should handle authentication errors', async () => {
      container.updateAuthMock({
        requireAuthentication: jest.fn().mockRejectedValue(new Error('Authentication failed'))
      })

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(401)
      expect(responseBody).toEqual({ error: 'Authentication failed' })
    })
  })

  describe('Dependency Injection compliance', () => {
    it('should use test container for all dependencies', async () => {
      await handlers.GET(mockRequest)

      expect(container.auth.requireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(container.services.emojiSettingsService.getUserEmojiSettings).toHaveBeenCalled()
    })

    it('should allow mock updates for testing different scenarios', async () => {
      const customResponse = {
        success: true,
        data: { custom: 'response' }
      }

      container.updateServiceMock('emojiSettingsService', {
        getUserEmojiSettings: jest.fn().mockResolvedValue(customResponse)
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(responseBody).toEqual(customResponse.data)
    })
  })
})