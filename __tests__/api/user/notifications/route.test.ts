/**
 * @jest-environment node
 */

/**
 * Notification Settings API routes unit tests
 * Dependency Injection version tests
 */

import { NextRequest } from 'next/server'
import { createNotificationSettingsHandlers } from '@/lib/factories/HandlerFactory'
import { TestContainer } from '@/lib/containers/TestContainer'

// Mock the production container import
jest.mock('@/lib/containers/ProductionContainer')

describe('/api/user/notifications API Routes', () => {
  let container: TestContainer
  let mockRequest: NextRequest
  let handlers: { GET: any, POST: any }

  beforeEach(() => {
    // Create test container
    container = new TestContainer()

    // Create handlers with test container
    handlers = createNotificationSettingsHandlers(container)

    // Mock request
    mockRequest = {
      json: jest.fn()
    } as any
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/user/notifications', () => {
    it('should return user notification settings successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'mock-notification-settings-id',
          userId: 'mock-user-id',
          email_enabled: true,
          push_enabled: false,
          slack_enabled: true,
          frequency: 'daily'
        }
      }

      container.updateServiceMock('notificationSettingsService', {
        getUserNotificationSettings: jest.fn().mockResolvedValue(mockResponse)
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(container.auth.requireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(container.services.notificationSettingsService.getUserNotificationSettings).toHaveBeenCalledWith('mock-user-id')
      expect(response.status).toBe(200)
      expect(responseBody).toEqual(mockResponse.data)
    })

    it('should handle service errors', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Failed to fetch notification settings',
        statusCode: 500
      }

      container.updateServiceMock('notificationSettingsService', {
        getUserNotificationSettings: jest.fn().mockResolvedValue(mockErrorResponse)
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Failed to fetch notification settings' })
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

  describe('POST /api/user/notifications', () => {
    it('should update user notification settings successfully', async () => {
      const updateRequest = {
        email_enabled: false,
        push_enabled: true,
        slack_enabled: true,
        frequency: 'weekly'
      }
      const mockResponse = {
        success: true,
        data: {
          id: 'mock-notification-settings-id',
          userId: 'mock-user-id',
          ...updateRequest
        }
      }

      mockRequest.json = jest.fn().mockResolvedValue(updateRequest)
      container.updateServiceMock('notificationSettingsService', {
        updateUserNotificationSettings: jest.fn().mockResolvedValue(mockResponse)
      })

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(container.auth.requireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(mockRequest.json).toHaveBeenCalled()
      expect(container.services.notificationSettingsService.updateUserNotificationSettings).toHaveBeenCalledWith('mock-user-id', updateRequest)
      expect(response.status).toBe(200)
      expect(responseBody).toEqual(mockResponse.data)
    })

    it('should handle service errors during update', async () => {
      const updateRequest = { email_enabled: false }
      const mockErrorResponse = {
        success: false,
        error: 'Failed to update notification settings',
        statusCode: 500
      }

      mockRequest.json = jest.fn().mockResolvedValue(updateRequest)
      container.updateServiceMock('notificationSettingsService', {
        updateUserNotificationSettings: jest.fn().mockResolvedValue(mockErrorResponse)
      })

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Failed to update notification settings' })
    })

    it('should handle authentication errors', async () => {
      container.updateAuthMock({
        requireAuthentication: jest.fn().mockRejectedValue(new Error('Unauthorized'))
      })

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(401)
      expect(responseBody).toEqual({ error: 'Unauthorized' })
    })
  })

  describe('Dependency Injection compliance', () => {
    it('should use test container for all dependencies', async () => {
      await handlers.GET(mockRequest)

      expect(container.auth.requireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(container.services.notificationSettingsService.getUserNotificationSettings).toHaveBeenCalled()
    })

    it('should allow mock updates for testing different scenarios', async () => {
      const customResponse = {
        success: true,
        data: { custom: 'notification settings' }
      }

      container.updateServiceMock('notificationSettingsService', {
        getUserNotificationSettings: jest.fn().mockResolvedValue(customResponse)
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(responseBody).toEqual(customResponse.data)
    })
  })
})
