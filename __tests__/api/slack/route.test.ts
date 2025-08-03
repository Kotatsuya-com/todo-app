/**
 * @jest-environment node
 */

import { POST } from '@/app/api/slack/route'
import { SlackMessageService } from '@/lib/services/SlackMessageService'
import { requireAuthentication } from '@/lib/auth/authentication'
import { createServices } from '@/lib/services/ServiceFactory'
import {
  createMockNextRequest,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from '@/__tests__/mocks'
import { createMockSlackMessageData } from '@/__tests__/fixtures/slack-message.fixture'

// Mock dependencies
jest.mock('@/lib/auth/authentication')
jest.mock('@/lib/services/ServiceFactory')
jest.mock('@/lib/logger', () => ({
  slackLogger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}))

const mockRequireAuthentication = requireAuthentication as jest.MockedFunction<typeof requireAuthentication>
const mockCreateServices = createServices as jest.MockedFunction<typeof createServices>

describe('/api/slack/route.ts - Clean Architecture', () => {
  let mockSlackMessageService: jest.Mocked<SlackMessageService>

  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()

    // Create mock service
    mockSlackMessageService = {
      retrieveMessage: jest.fn(),
    } as any

    // Mock createServices to return our mock service
    mockCreateServices.mockReturnValue({
      slackMessageService: mockSlackMessageService,
    } as any)
  })

  afterEach(() => {
    cleanupTestEnvironment()
    jest.clearAllMocks()
  })

  describe('Input validation', () => {
    it('should return 400 when slackUrl is missing', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: {},
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('SlackURLが必要です')
      expect(mockSlackMessageService.retrieveMessage).not.toHaveBeenCalled()
    })

    it('should return 400 when slackUrl is not a string', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl: 123 },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('SlackURLが必要です')
      expect(mockSlackMessageService.retrieveMessage).not.toHaveBeenCalled()
    })

    it('should return 400 when slackUrl is empty string', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl: '' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('SlackURLが必要です')
      expect(mockSlackMessageService.retrieveMessage).not.toHaveBeenCalled()
    })
  })

  describe('Authentication', () => {
    it('should retrieve message successfully for authenticated user', async () => {
      const userId = 'user-123'
      const slackUrl = 'https://test.slack.com/archives/C123/p123'
      const mockMessageData = createMockSlackMessageData()
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackMessageService.retrieveMessage.mockResolvedValue({
        success: true,
        data: mockMessageData
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockMessageData)
      expect(mockRequireAuthentication).toHaveBeenCalledWith(request)
      expect(mockSlackMessageService.retrieveMessage).toHaveBeenCalledWith(slackUrl, userId)
    })

    it('should return 401 when user is not authenticated', async () => {
      const slackUrl = 'https://test.slack.com/archives/C123/p123'
      
      mockRequireAuthentication.mockRejectedValue(new Error('Authentication required'))

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(mockSlackMessageService.retrieveMessage).not.toHaveBeenCalled()
    })

    it('should handle authentication error containing "Authentication"', async () => {
      const slackUrl = 'https://test.slack.com/archives/C123/p123'
      
      mockRequireAuthentication.mockRejectedValue(new Error('Authentication token expired'))

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle non-authentication errors as server errors', async () => {
      const slackUrl = 'https://test.slack.com/archives/C123/p123'
      
      mockRequireAuthentication.mockRejectedValue(new Error('Database connection failed'))

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Slackメッセージの取得に失敗しました')
    })
  })

  describe('Service integration', () => {
    it('should handle service validation errors (400)', async () => {
      const userId = 'user-123'
      const slackUrl = 'invalid-url'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackMessageService.retrieveMessage.mockResolvedValue({
        success: false,
        error: 'Valid Slack URL is required',
        statusCode: 400
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Valid Slack URL is required')
    })

    it('should handle service authorization errors (401)', async () => {
      const userId = 'invalid-user'
      const slackUrl = 'https://test.slack.com/archives/C123/p123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackMessageService.retrieveMessage.mockResolvedValue({
        success: false,
        error: 'User not found',
        statusCode: 401
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('User not found')
    })

    it('should handle service not found errors (404)', async () => {
      const userId = 'user-123'
      const slackUrl = 'https://test.slack.com/archives/C123/p123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackMessageService.retrieveMessage.mockResolvedValue({
        success: false,
        error: 'メッセージが見つかりませんでした',
        statusCode: 404
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('メッセージが見つかりませんでした')
    })

    it('should handle service server errors (500)', async () => {
      const userId = 'user-123'
      const slackUrl = 'https://test.slack.com/archives/C123/p123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackMessageService.retrieveMessage.mockResolvedValue({
        success: false,
        error: 'Internal server error',
        statusCode: 500
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle service errors without status code', async () => {
      const userId = 'user-123'
      const slackUrl = 'https://test.slack.com/archives/C123/p123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackMessageService.retrieveMessage.mockResolvedValue({
        success: false,
        error: 'Unknown error'
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Unknown error')
    })
  })

  describe('Service Factory integration', () => {
    it('should create services correctly', async () => {
      const userId = 'user-123'
      const slackUrl = 'https://test.slack.com/archives/C123/p123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackMessageService.retrieveMessage.mockResolvedValue({
        success: true,
        data: createMockSlackMessageData()
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl },
      })

      await POST(request as any)

      expect(mockCreateServices).toHaveBeenCalledTimes(1)
      expect(mockCreateServices).toHaveBeenCalledWith()
    })

    it('should use slackMessageService from factory', async () => {
      const userId = 'user-123'
      const slackUrl = 'https://test.slack.com/archives/C123/p123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackMessageService.retrieveMessage.mockResolvedValue({
        success: true,
        data: createMockSlackMessageData()
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl },
      })

      await POST(request as any)

      // Verify that the service from the factory was used
      expect(mockSlackMessageService.retrieveMessage).toHaveBeenCalledWith(slackUrl, userId)
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle JSON parsing errors gracefully', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: {},
      })

      request.json = jest.fn().mockRejectedValue(new Error('JSON parse error'))

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Slackメッセージの取得に失敗しました')
      expect(data.details).toBe('JSON parse error')
    })

    it('should handle service exceptions gracefully', async () => {
      const userId = 'user-123'
      const slackUrl = 'https://test.slack.com/archives/C123/p123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackMessageService.retrieveMessage.mockRejectedValue(new Error('Service exception'))

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Slackメッセージの取得に失敗しました')
    })

    it('should maintain consistent error response format', async () => {
      const errorScenarios = [
        async () => {
          const request = createMockNextRequest({ method: 'POST', body: {} })
          return await POST(request as any)
        },
        async () => {
          mockRequireAuthentication.mockRejectedValue(new Error('Auth error'))
          const request = createMockNextRequest({ method: 'POST', body: { slackUrl: 'test' } })
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

    it('should handle empty request body', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: {},
      })
      
      // Override json method to reject when body is empty/null
      request.json = jest.fn().mockRejectedValue(new Error('JSON parse error'))

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Slackメッセージの取得に失敗しました')
    })

    it('should handle extremely long URLs', async () => {
      const longUrl = 'https://very-long-workspace-name-that-might-cause-issues.slack.com/archives/C1234567890/p1234567890123456'
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackMessageService.retrieveMessage.mockResolvedValue({
        success: true,
        data: createMockSlackMessageData({ url: longUrl })
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl: longUrl },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe(longUrl)
    })
  })
})