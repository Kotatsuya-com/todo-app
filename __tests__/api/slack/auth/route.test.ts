/**
 * @jest-environment node
 */

import { GET } from '@/app/api/slack/auth/route'
import { SlackAuthService } from '@/lib/services/SlackAuthService'
import { requireAuthentication } from '@/lib/auth/authentication'
import { createServices } from '@/lib/services/ServiceFactory'
import { getAppBaseUrl } from '@/lib/ngrok-url'
import {
  createMockNextRequest,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from '@/__tests__/mocks'
import {
  createMockSlackConnection
} from '@/__tests__/fixtures/slack-connection.fixture'

// Mock dependencies
jest.mock('@/lib/auth/authentication')
jest.mock('@/lib/services/ServiceFactory')
jest.mock('@/lib/ngrok-url')
jest.mock('@/lib/logger', () => ({
  authLogger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    child: jest.fn().mockReturnValue({
      error: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    }),
  },
}))

const mockRequireAuthentication = requireAuthentication as jest.MockedFunction<typeof requireAuthentication>
const mockCreateServices = createServices as jest.MockedFunction<typeof createServices>
const mockGetAppBaseUrl = getAppBaseUrl as jest.MockedFunction<typeof getAppBaseUrl>

describe('/api/slack/auth - Clean Architecture', () => {
  let mockSlackAuthService: jest.Mocked<SlackAuthService>

  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()

    // Create mock service
    mockSlackAuthService = {
      processOAuthCallback: jest.fn(),
      validateUserExists: jest.fn(),
      exchangeCodeForTokens: jest.fn(),
      createSlackConnection: jest.fn(),
      updateUserSlackId: jest.fn(),
      verifyUserSlackIdUpdate: jest.fn(),
      autoCreateWebhook: jest.fn(),
      findConnectionByWorkspace: jest.fn(),
    } as any

    // Mock createServices to return our mock service
    mockCreateServices.mockReturnValue({
      slackAuthService: mockSlackAuthService,
    } as any)

    // Mock getAppBaseUrl
    mockGetAppBaseUrl.mockReturnValue('http://localhost:3000')

    // Set environment variables
    process.env.SLACK_CLIENT_ID = 'test-client-id'
    process.env.SLACK_CLIENT_SECRET = 'test-client-secret'
  })

  afterEach(() => {
    cleanupTestEnvironment()
    jest.clearAllMocks()
  })

  describe('Error parameter handling', () => {
    it('should redirect with error when error parameter is present', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?error=access_denied',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=access_denied')
      expect(mockSlackAuthService.processOAuthCallback).not.toHaveBeenCalled()
    })

    it('should redirect with error when code parameter is missing', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=no_code')
      expect(mockSlackAuthService.processOAuthCallback).not.toHaveBeenCalled()
    })

    it('should handle empty code parameter', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=no_code')
    })
  })

  describe('User authentication', () => {
    it('should complete OAuth flow successfully for authenticated user', async () => {
      const userId = 'user-123'
      const mockConnection = createMockSlackConnection()
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackAuthService.processOAuthCallback.mockResolvedValue({
        success: true,
        data: {
          slackUserId: 'U1234567890',
          connection: mockConnection,
          webhookCreated: true,
          webhookId: 'webhook-123'
        }
      })

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_success=true')
      expect(mockRequireAuthentication).toHaveBeenCalledWith(request)
      expect(mockSlackAuthService.processOAuthCallback).toHaveBeenCalledWith(
        'test_code',
        userId,
        {
          code: 'test_code',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUri: 'http://localhost:3000/api/slack/auth'
        }
      )
    })

    it('should redirect for authentication required when user not authenticated', async () => {
      mockRequireAuthentication.mockRejectedValue(new Error('Authentication required'))

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/?slack_auth_required=true&slack_code=test_code')
      expect(mockSlackAuthService.processOAuthCallback).not.toHaveBeenCalled()
    })

    it('should handle authentication error containing "Authentication"', async () => {
      mockRequireAuthentication.mockRejectedValue(new Error('Authentication token expired'))

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/?slack_auth_required=true&slack_code=test_code')
    })

    it('should handle non-authentication errors as server errors', async () => {
      mockRequireAuthentication.mockRejectedValue(new Error('Database connection failed'))

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=server_error')
    })
  })

  describe('OAuth service integration', () => {
    it('should handle user not found error (404)', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackAuthService.processOAuthCallback.mockResolvedValue({
        success: false,
        error: 'User record not found in database',
        statusCode: 404
      })

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=user_not_found')
    })

    it('should handle token exchange error (400)', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackAuthService.processOAuthCallback.mockResolvedValue({
        success: false,
        error: 'Slack OAuth error: invalid_code',
        statusCode: 400
      })

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=invalid_code',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=token_exchange')
    })

    it('should handle server error (500)', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackAuthService.processOAuthCallback.mockResolvedValue({
        success: false,
        error: 'Internal server error during OAuth processing',
        statusCode: 500
      })

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=server_error')
    })

    it('should handle service error without status code', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackAuthService.processOAuthCallback.mockResolvedValue({
        success: false,
        error: 'Database error'
      })

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=server_error')
    })

    it('should handle OAuth with only partial webhook creation', async () => {
      const userId = 'user-123'
      const mockConnection = createMockSlackConnection()
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackAuthService.processOAuthCallback.mockResolvedValue({
        success: true,
        data: {
          slackUserId: 'U1234567890',
          connection: mockConnection,
          webhookCreated: false,
          webhookId: null
        }
      })

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_success=true')
    })

    it('should handle OAuth without Slack User ID', async () => {
      const userId = 'user-123'
      const mockConnection = createMockSlackConnection()
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackAuthService.processOAuthCallback.mockResolvedValue({
        success: true,
        data: {
          slackUserId: null,
          connection: mockConnection,
          webhookCreated: false,
          webhookId: null
        }
      })

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_success=true')
    })
  })

  describe('Service Factory integration', () => {
    it('should create services correctly', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackAuthService.processOAuthCallback.mockResolvedValue({
        success: true,
        data: {
          slackUserId: null,
          connection: createMockSlackConnection(),
          webhookCreated: false,
          webhookId: null
        }
      })

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code',
      })

      await GET(request as any)

      expect(mockCreateServices).toHaveBeenCalledTimes(1)
      expect(mockCreateServices).toHaveBeenCalledWith()
    })

    it('should use slackAuthService from factory', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackAuthService.processOAuthCallback.mockResolvedValue({
        success: true,
        data: {
          slackUserId: null,
          connection: createMockSlackConnection(),
          webhookCreated: false,
          webhookId: null
        }
      })

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code',
      })

      await GET(request as any)

      // Verify that the service from the factory was used
      expect(mockSlackAuthService.processOAuthCallback).toHaveBeenCalledWith(
        'test_code',
        userId,
        expect.objectContaining({
          code: 'test_code',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUri: 'http://localhost:3000/api/slack/auth'
        })
      )
    })
  })

  describe('URL construction and parameters', () => {
    it('should construct correct token exchange request', async () => {
      const userId = 'user-123'
      const mockConnection = createMockSlackConnection()
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackAuthService.processOAuthCallback.mockResolvedValue({
        success: true,
        data: {
          slackUserId: 'U1234567890',
          connection: mockConnection,
          webhookCreated: true,
          webhookId: 'webhook-123'
        }
      })

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=custom_code&state=custom_state',
      })

      await GET(request as any)

      expect(mockSlackAuthService.processOAuthCallback).toHaveBeenCalledWith(
        'custom_code',
        userId,
        {
          code: 'custom_code',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          redirectUri: 'http://localhost:3000/api/slack/auth'
        }
      )
    })

    it('should handle multiple query parameters correctly', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackAuthService.processOAuthCallback.mockResolvedValue({
        success: true,
        data: {
          slackUserId: null,
          connection: createMockSlackConnection(),
          webhookCreated: false,
          webhookId: null
        }
      })

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code&state=test_state&extra=param',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_success=true')
    })

    it('should use correct redirect URI based on app base URL', async () => {
      const userId = 'user-123'
      
      // Change the base URL
      mockGetAppBaseUrl.mockReturnValue('https://example.com')
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackAuthService.processOAuthCallback.mockResolvedValue({
        success: true,
        data: {
          slackUserId: null,
          connection: createMockSlackConnection(),
          webhookCreated: false,
          webhookId: null
        }
      })

      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://example.com/api/slack/auth?code=test_code',
      })

      await GET(request as any)

      expect(mockSlackAuthService.processOAuthCallback).toHaveBeenCalledWith(
        'test_code',
        userId,
        expect.objectContaining({
          redirectUri: 'https://example.com/api/slack/auth'
        })
      )
    })
  })

  describe('Error response consistency', () => {
    it('should handle service exception gracefully', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackAuthService.processOAuthCallback.mockRejectedValue(new Error('Unexpected service error'))

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=server_error')
    })

    it('should handle missing environment variables gracefully', async () => {
      const userId = 'user-123'
      
      // Remove environment variables
      delete process.env.SLACK_CLIENT_ID
      delete process.env.SLACK_CLIENT_SECRET

      mockRequireAuthentication.mockResolvedValue(userId)

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=server_error')
    })

    it('should handle all error scenarios with consistent redirect format', async () => {
      const errorScenarios = [
        { error: 'access_denied', expected: 'access_denied' },
        { code: null, expected: 'no_code' },
        { statusCode: 404, expected: 'user_not_found' },
        { statusCode: 400, expected: 'token_exchange' },
        { statusCode: 500, expected: 'server_error' },
        { statusCode: undefined, expected: 'server_error' }
      ]

      for (const scenario of errorScenarios) {
        jest.clearAllMocks()

        if (scenario.error) {
          const request = createMockNextRequest({
            method: 'GET',
            url: `http://localhost:3000/api/slack/auth?error=${scenario.error}`,
          })
          const response = await GET(request as any)
          expect(response.headers.get('location')).toContain(`slack_error=${scenario.expected}`)
        } else if (scenario.code === null) {
          const request = createMockNextRequest({
            method: 'GET',
            url: 'http://localhost:3000/api/slack/auth',
          })
          const response = await GET(request as any)
          expect(response.headers.get('location')).toContain(`slack_error=${scenario.expected}`)
        } else {
          const userId = 'user-123'
          mockRequireAuthentication.mockResolvedValue(userId)
          mockSlackAuthService.processOAuthCallback.mockResolvedValue({
            success: false,
            error: 'Test error',
            statusCode: scenario.statusCode
          })

          const request = createMockNextRequest({
            method: 'GET',
            url: 'http://localhost:3000/api/slack/auth?code=test_code',
          })
          const response = await GET(request as any)
          expect(response.headers.get('location')).toContain(`slack_error=${scenario.expected}`)
        }
      }
    })
  })
})