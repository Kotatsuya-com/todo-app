/**
 * @jest-environment node
 */

/**
 * Slack Message Retrieval API routes unit tests
 * Dependency Injection version tests
 */

import { NextRequest } from 'next/server'
import { createSlackMessageHandlers } from '@/lib/factories/HandlerFactory'
import { TestContainer } from '@/lib/containers/TestContainer'

// Mock the production container import
jest.mock('@/lib/containers/ProductionContainer')

describe('/api/slack API Routes', () => {
  let container: TestContainer
  let mockRequest: NextRequest
  let handlers: { POST: any }

  beforeEach(() => {
    // Create test container
    container = new TestContainer()

    // Create handlers with test container
    handlers = createSlackMessageHandlers(container)

    // Mock request
    mockRequest = {
      json: jest.fn()
    } as any
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/slack', () => {
    it('should retrieve slack message successfully', async () => {
      const requestBody = { slackUrl: 'https://workspace.slack.com/archives/C1234567890/p1640995200000100' }
      const mockResponse = {
        success: true,
        data: {
          message: {
            text: 'Mock Slack message content',
            user: 'U12345',
            channel: 'C1234567890',
            timestamp: '1640995200.000100'
          },
          channelInfo: {
            id: 'C1234567890',
            name: 'general'
          },
          userInfo: {
            id: 'U12345',
            name: 'testuser'
          }
        }
      }

      mockRequest.json = jest.fn().mockResolvedValue(requestBody)
      container.updateServiceMock('slackMessageService', {
        retrieveMessage: jest.fn().mockResolvedValue(mockResponse)
      })

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(container.auth.requireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(mockRequest.json).toHaveBeenCalled()
      expect(container.services.slackMessageService.retrieveMessage).toHaveBeenCalledWith(requestBody.slackUrl, 'mock-user-id')
      expect(response.status).toBe(200)
      expect(responseBody).toEqual(mockResponse.data)
    })

    it('should handle missing slackUrl', async () => {
      const requestBody = {}
      mockRequest.json = jest.fn().mockResolvedValue(requestBody)

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(400)
      expect(responseBody).toEqual({ error: 'SlackURLが必要です' })
    })

    it('should handle invalid slackUrl type', async () => {
      const requestBody = { slackUrl: 123 }
      mockRequest.json = jest.fn().mockResolvedValue(requestBody)

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(400)
      expect(responseBody).toEqual({ error: 'SlackURLが必要です' })
    })

    it('should handle service errors', async () => {
      const requestBody = { slackUrl: 'https://workspace.slack.com/archives/C1234567890/p1640995200000100' }
      const mockErrorResponse = {
        success: false,
        error: 'Failed to retrieve slack message',
        statusCode: 500
      }

      mockRequest.json = jest.fn().mockResolvedValue(requestBody)
      container.updateServiceMock('slackMessageService', {
        retrieveMessage: jest.fn().mockResolvedValue(mockErrorResponse)
      })

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Failed to retrieve slack message' })
    })

    it('should handle authentication errors', async () => {
      const requestBody = { slackUrl: 'https://workspace.slack.com/archives/C1234567890/p1640995200000100' }
      mockRequest.json = jest.fn().mockResolvedValue(requestBody)

      container.updateAuthMock({
        requireAuthentication: jest.fn().mockRejectedValue(new Error('Authentication failed'))
      })

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(401)
      expect(responseBody).toEqual({ error: 'Authentication failed' })
    })

    it('should handle unexpected errors', async () => {
      const requestBody = { slackUrl: 'https://workspace.slack.com/archives/C1234567890/p1640995200000100' }
      mockRequest.json = jest.fn().mockResolvedValue(requestBody)

      container.updateServiceMock('slackMessageService', {
        retrieveMessage: jest.fn().mockRejectedValue(new Error('Unexpected error'))
      })

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody.error).toBe('Slackメッセージの取得に失敗しました')
      expect(responseBody.details).toBe('Unexpected error')
    })
  })

  describe('Dependency Injection compliance', () => {
    it('should use test container for all dependencies', async () => {
      const requestBody = { slackUrl: 'https://workspace.slack.com/archives/C1234567890/p1640995200000100' }
      mockRequest.json = jest.fn().mockResolvedValue(requestBody)

      await handlers.POST(mockRequest)

      expect(container.auth.requireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(container.services.slackMessageService.retrieveMessage).toHaveBeenCalled()
    })

    it('should allow mock updates for testing different scenarios', async () => {
      const requestBody = { slackUrl: 'https://workspace.slack.com/archives/C1234567890/p1640995200000100' }
      const customResponse = {
        success: true,
        data: { message: { text: 'Custom message' } }
      }

      mockRequest.json = jest.fn().mockResolvedValue(requestBody)
      container.updateServiceMock('slackMessageService', {
        retrieveMessage: jest.fn().mockResolvedValue(customResponse)
      })

      const response = await handlers.POST(mockRequest)
      const responseBody = await response.json()

      expect(responseBody).toEqual(customResponse.data)
    })
  })
})
