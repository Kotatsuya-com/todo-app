/**
 * @jest-environment node
 */

/**
 * Emoji Settings API routes unit tests
 * Clean Architecture version tests
 */

import { NextRequest, NextResponse } from 'next/server'
import { GET, PUT, POST } from '@/app/api/user/emoji-settings/route'
import { EmojiSettingsService } from '@/lib/services/EmojiSettingsService'
import {
  createMockEmojiSetting,
  createMockValidEmojiUpdateRequest,
  createMockInvalidEmojiUpdateRequest
} from '@/__tests__/fixtures/emoji-settings.fixture'
import { AVAILABLE_EMOJIS, DEFAULT_EMOJI_SETTINGS } from '@/lib/entities/EmojiSettings'

// Mock dependencies
jest.mock('@/lib/auth/authentication')
jest.mock('@/lib/services/ServiceFactory')

const mockRequireAuthentication = require('@/lib/auth/authentication').requireAuthentication as jest.Mock
const mockCreateServices = require('@/lib/services/ServiceFactory').createServices as jest.Mock

describe('/api/user/emoji-settings API Routes', () => {
  let mockEmojiSettingsService: jest.Mocked<EmojiSettingsService>
  let mockRequest: NextRequest

  beforeEach(() => {
    // Mock authentication
    mockRequireAuthentication.mockResolvedValue('user-123')

    // Mock service
    mockEmojiSettingsService = {
      getUserEmojiSettings: jest.fn(),
      updateUserEmojiSettings: jest.fn(),
      resetUserEmojiSettings: jest.fn(),
      getAvailableEmojis: jest.fn(),
      getEmojiByName: jest.fn(),
      getDefaultSettings: jest.fn(),
      getEmojiUsageStats: jest.fn(),
      findUsersByEmoji: jest.fn()
    } as any

    mockCreateServices.mockReturnValue({
      emojiSettingsService: mockEmojiSettingsService
    })

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
      const mockSettings = createMockEmojiSetting()
      const mockResponse = {
        success: true,
        data: {
          settings: mockSettings,
          availableEmojis: AVAILABLE_EMOJIS
        }
      }

      mockEmojiSettingsService.getUserEmojiSettings.mockResolvedValue(mockResponse)

      const response = await GET(mockRequest)
      const responseBody = await response.json()

      expect(mockRequireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(mockEmojiSettingsService.getUserEmojiSettings).toHaveBeenCalledWith('user-123')
      expect(response.status).toBe(200)
      expect(responseBody).toEqual(mockResponse.data)
    })

    it('should return default settings when user has no settings', async () => {
      const mockResponse = {
        success: true,
        data: {
          settings: {
            id: '',
            user_id: 'user-123',
            ...DEFAULT_EMOJI_SETTINGS,
            created_at: '',
            updated_at: ''
          },
          availableEmojis: AVAILABLE_EMOJIS
        }
      }

      mockEmojiSettingsService.getUserEmojiSettings.mockResolvedValue(mockResponse)

      const response = await GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody.settings.user_id).toBe('user-123')
      expect(responseBody.settings.today_emoji).toBe(DEFAULT_EMOJI_SETTINGS.today_emoji)
      expect(responseBody.availableEmojis).toEqual(AVAILABLE_EMOJIS)
    })

    it('should handle service errors', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Failed to fetch emoji settings',
        statusCode: 500
      }

      mockEmojiSettingsService.getUserEmojiSettings.mockResolvedValue(mockErrorResponse)

      const response = await GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Failed to fetch emoji settings' })
    })

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication required')
      ;(authError as any).statusCode = 401
      mockRequireAuthentication.mockRejectedValue(authError)

      const response = await GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(401)
      expect(responseBody).toEqual({ error: 'Authentication required' })
    })

    it('should handle unexpected errors', async () => {
      mockRequireAuthentication.mockRejectedValue(new Error('Unexpected error'))

      const response = await GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Unexpected error' })
    })

    it('should use default status code when service error has no statusCode', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Some error without status code'
      }

      mockEmojiSettingsService.getUserEmojiSettings.mockResolvedValue(mockErrorResponse)

      const response = await GET(mockRequest)

      expect(response.status).toBe(500)
    })
  })

  describe('PUT /api/user/emoji-settings', () => {
    it('should update user emoji settings successfully', async () => {
      const updateRequest = createMockValidEmojiUpdateRequest()
      const updatedSettings = createMockEmojiSetting(updateRequest)
      const mockResponse = {
        success: true,
        data: {
          message: 'Settings updated successfully',
          settings: updatedSettings
        }
      }

      mockRequest.json = jest.fn().mockResolvedValue(updateRequest)
      mockEmojiSettingsService.updateUserEmojiSettings.mockResolvedValue(mockResponse)

      const response = await PUT(mockRequest)
      const responseBody = await response.json()

      expect(mockRequireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(mockRequest.json).toHaveBeenCalled()
      expect(mockEmojiSettingsService.updateUserEmojiSettings).toHaveBeenCalledWith('user-123', updateRequest)
      expect(response.status).toBe(200)
      expect(responseBody).toEqual(mockResponse.data)
    })

    it('should reject invalid emoji selections', async () => {
      const invalidRequest = createMockInvalidEmojiUpdateRequest()
      const mockErrorResponse = {
        success: false,
        error: 'Invalid emoji selection: Invalid today_emoji: invalid_emoji',
        statusCode: 400
      }

      mockRequest.json = jest.fn().mockResolvedValue(invalidRequest)
      mockEmojiSettingsService.updateUserEmojiSettings.mockResolvedValue(mockErrorResponse)

      const response = await PUT(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(400)
      expect(responseBody).toEqual({ error: mockErrorResponse.error })
    })

    it('should handle duplicate emoji validation', async () => {
      const duplicateRequest = {
        today_emoji: 'fire',
        tomorrow_emoji: 'fire', // Duplicate
        later_emoji: 'memo'
      }
      const mockErrorResponse = {
        success: false,
        error: 'Invalid emoji selection: Each emoji must be unique across today, tomorrow, and later settings',
        statusCode: 400
      }

      mockRequest.json = jest.fn().mockResolvedValue(duplicateRequest)
      mockEmojiSettingsService.updateUserEmojiSettings.mockResolvedValue(mockErrorResponse)

      const response = await PUT(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(400)
      expect(responseBody.error).toContain('must be unique')
    })

    it('should handle service errors during update', async () => {
      const validRequest = createMockValidEmojiUpdateRequest()
      const mockErrorResponse = {
        success: false,
        error: 'Failed to update emoji settings',
        statusCode: 500
      }

      mockRequest.json = jest.fn().mockResolvedValue(validRequest)
      mockEmojiSettingsService.updateUserEmojiSettings.mockResolvedValue(mockErrorResponse)

      const response = await PUT(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Failed to update emoji settings' })
    })

    it('should handle malformed JSON in request body', async () => {
      mockRequest.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

      const response = await PUT(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Invalid JSON' })
    })

    it('should handle authentication errors', async () => {
      const authError = new Error('Unauthorized')
      ;(authError as any).statusCode = 401
      mockRequireAuthentication.mockRejectedValue(authError)

      const response = await PUT(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(401)
      expect(responseBody).toEqual({ error: 'Unauthorized' })
    })

    it('should create new settings for users without existing settings', async () => {
      const newUserRequest = createMockValidEmojiUpdateRequest()
      const newSettings = createMockEmojiSetting({ user_id: 'new-user-456', ...newUserRequest })
      const mockResponse = {
        success: true,
        data: {
          message: 'Settings updated successfully',
          settings: newSettings
        }
      }

      mockRequireAuthentication.mockResolvedValue('new-user-456')
      mockRequest.json = jest.fn().mockResolvedValue(newUserRequest)
      mockEmojiSettingsService.updateUserEmojiSettings.mockResolvedValue(mockResponse)

      const response = await PUT(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody.settings.user_id).toBe('new-user-456')
      expect(mockEmojiSettingsService.updateUserEmojiSettings).toHaveBeenCalledWith('new-user-456', newUserRequest)
    })
  })

  describe('POST /api/user/emoji-settings (reset)', () => {
    it('should reset user emoji settings to defaults', async () => {
      const resetSettings = createMockEmojiSetting({
        today_emoji: DEFAULT_EMOJI_SETTINGS.today_emoji,
        tomorrow_emoji: DEFAULT_EMOJI_SETTINGS.tomorrow_emoji,
        later_emoji: DEFAULT_EMOJI_SETTINGS.later_emoji
      })
      const mockResponse = {
        success: true,
        data: {
          message: 'Settings reset to default',
          settings: resetSettings
        }
      }

      mockEmojiSettingsService.resetUserEmojiSettings.mockResolvedValue(mockResponse)

      const response = await POST(mockRequest)
      const responseBody = await response.json()

      expect(mockRequireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(mockEmojiSettingsService.resetUserEmojiSettings).toHaveBeenCalledWith('user-123')
      expect(response.status).toBe(200)
      expect(responseBody).toEqual(mockResponse.data)
      expect(responseBody.message).toBe('Settings reset to default')
      expect(responseBody.settings.today_emoji).toBe(DEFAULT_EMOJI_SETTINGS.today_emoji)
    })

    it('should handle service errors during reset', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Failed to reset emoji settings',
        statusCode: 500
      }

      mockEmojiSettingsService.resetUserEmojiSettings.mockResolvedValue(mockErrorResponse)

      const response = await POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Failed to reset emoji settings' })
    })

    it('should handle authentication errors', async () => {
      const authError = new Error('Token expired')
      ;(authError as any).statusCode = 401
      mockRequireAuthentication.mockRejectedValue(authError)

      const response = await POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(401)
      expect(responseBody).toEqual({ error: 'Token expired' })
    })

    it('should handle unexpected errors', async () => {
      mockEmojiSettingsService.resetUserEmojiSettings.mockRejectedValue(new Error('Unexpected error'))

      const response = await POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Unexpected error' })
    })

    it('should reset custom settings back to defaults', async () => {
      const customSettings = createMockEmojiSetting({
        today_emoji: 'warning',
        tomorrow_emoji: 'clock',
        later_emoji: 'bookmark'
      })
      const resetSettings = createMockEmojiSetting({
        ...customSettings,
        today_emoji: DEFAULT_EMOJI_SETTINGS.today_emoji,
        tomorrow_emoji: DEFAULT_EMOJI_SETTINGS.tomorrow_emoji,
        later_emoji: DEFAULT_EMOJI_SETTINGS.later_emoji
      })
      const mockResponse = {
        success: true,
        data: {
          message: 'Settings reset to default',
          settings: resetSettings
        }
      }

      mockEmojiSettingsService.resetUserEmojiSettings.mockResolvedValue(mockResponse)

      const response = await POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody.settings.today_emoji).toBe(DEFAULT_EMOJI_SETTINGS.today_emoji)
      expect(responseBody.settings.tomorrow_emoji).toBe(DEFAULT_EMOJI_SETTINGS.tomorrow_emoji)
      expect(responseBody.settings.later_emoji).toBe(DEFAULT_EMOJI_SETTINGS.later_emoji)
    })
  })

  describe('Clean Architecture compliance', () => {
    it('should delegate all business logic to service layer', async () => {
      // Test that API routes only handle HTTP concerns
      const updateRequest = createMockValidEmojiUpdateRequest()
      mockRequest.json = jest.fn().mockResolvedValue(updateRequest)
      
      const mockResponse = {
        success: true,
        data: {
          message: 'Settings updated successfully',
          settings: createMockEmojiSetting(updateRequest)
        }
      }
      mockEmojiSettingsService.updateUserEmojiSettings.mockResolvedValue(mockResponse)

      await PUT(mockRequest)

      // Verify no business logic in API route
      expect(mockEmojiSettingsService.updateUserEmojiSettings).toHaveBeenCalledWith('user-123', updateRequest)
      expect(mockCreateServices).toHaveBeenCalled()
    })

    it('should not perform validation in API layer', async () => {
      // API should delegate validation to service layer
      const invalidRequest = createMockInvalidEmojiUpdateRequest()
      mockRequest.json = jest.fn().mockResolvedValue(invalidRequest)
      
      const mockErrorResponse = {
        success: false,
        error: 'Invalid emoji selection',
        statusCode: 400
      }
      mockEmojiSettingsService.updateUserEmojiSettings.mockResolvedValue(mockErrorResponse)

      const response = await PUT(mockRequest)

      expect(response.status).toBe(400)
      expect(mockEmojiSettingsService.updateUserEmojiSettings).toHaveBeenCalledWith('user-123', invalidRequest)
    })

    it('should use authentication abstraction', async () => {
      await GET(mockRequest)

      expect(mockRequireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(mockRequireAuthentication).toHaveReturnedWith(expect.any(Promise))
    })

    it('should use service factory for dependency injection', async () => {
      await GET(mockRequest)

      expect(mockCreateServices).toHaveBeenCalled()
      expect(mockCreateServices).toHaveReturnedWith(
        expect.objectContaining({
          emojiSettingsService: expect.any(Object)
        })
      )
    })
  })

  describe('error response format consistency', () => {
    it('should return consistent error format for authentication errors', async () => {
      const authError = new Error('Authentication failed')
      ;(authError as any).statusCode = 401
      mockRequireAuthentication.mockRejectedValue(authError)

      const response = await GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(401)
      expect(responseBody).toEqual({ error: 'Authentication failed' })
    })

    it('should return consistent error format for service errors', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Service specific error',
        statusCode: 422
      }
      mockEmojiSettingsService.getUserEmojiSettings.mockResolvedValue(mockErrorResponse)

      const response = await GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(422)
      expect(responseBody).toEqual({ error: 'Service specific error' })
    })

    it('should return consistent error format for unexpected errors', async () => {
      mockRequireAuthentication.mockRejectedValue(new Error('Random error'))

      const response = await GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Random error' })
    })
  })

  describe('HTTP method separation', () => {
    it('should handle GET for reading settings', async () => {
      const mockResponse = {
        success: true,
        data: {
          settings: createMockEmojiSetting(),
          availableEmojis: AVAILABLE_EMOJIS
        }
      }
      mockEmojiSettingsService.getUserEmojiSettings.mockResolvedValue(mockResponse)

      const response = await GET(mockRequest)

      expect(response.status).toBe(200)
      expect(mockEmojiSettingsService.getUserEmojiSettings).toHaveBeenCalled()
    })

    it('should handle PUT for updating settings', async () => {
      const updateRequest = createMockValidEmojiUpdateRequest()
      mockRequest.json = jest.fn().mockResolvedValue(updateRequest)
      
      const mockResponse = {
        success: true,
        data: {
          message: 'Settings updated successfully',
          settings: createMockEmojiSetting(updateRequest)
        }
      }
      mockEmojiSettingsService.updateUserEmojiSettings.mockResolvedValue(mockResponse)

      const response = await PUT(mockRequest)

      expect(response.status).toBe(200)
      expect(mockEmojiSettingsService.updateUserEmojiSettings).toHaveBeenCalled()
    })

    it('should handle POST for resetting settings', async () => {
      const mockResponse = {
        success: true,
        data: {
          message: 'Settings reset to default',
          settings: createMockEmojiSetting()
        }
      }
      mockEmojiSettingsService.resetUserEmojiSettings.mockResolvedValue(mockResponse)

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
      expect(mockEmojiSettingsService.resetUserEmojiSettings).toHaveBeenCalled()
    })
  })
})