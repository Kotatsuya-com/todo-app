/**
 * @jest-environment node
 */

/**
 * Slack Auth API routes unit tests
 * Dependency Injection version tests
 */

import { NextRequest } from 'next/server'
import { createSlackAuthHandlers } from '@/lib/factories/HandlerFactory'
import { TestContainer } from '@/lib/containers/TestContainer'

// Mock the production container import
jest.mock('@/lib/containers/ProductionContainer')

describe('/api/slack/auth API Routes', () => {
  let container: TestContainer
  let mockRequest: NextRequest
  let handlers: { GET: any }

  beforeEach(() => {
    // Create test container
    container = new TestContainer()

    // Create handlers with test container
    handlers = createSlackAuthHandlers(container)

    // Mock request with URL
    const url = new URL('http://localhost:3000/api/slack/auth')
    mockRequest = {
      nextUrl: url,
      headers: {
        get: jest.fn()
      },
      json: jest.fn()
    } as any

    // Set environment variables
    process.env.SLACK_CLIENT_ID = 'test-client-id'
    process.env.SLACK_CLIENT_SECRET = 'test-client-secret'
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/slack/auth', () => {
    it('should process OAuth callback successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          slackUserId: 'U12345',
          connection: {
            id: 'mock-connection-id',
            workspace_id: 'TWORKSPACE123',
            workspace_name: 'Test Workspace',
            team_name: 'Test Team',
            access_token: 'xoxb-mock-token',
            scope: 'chat:write,files:read',
            created_at: '2025-01-01T00:00:00Z'
          },
          webhookCreated: true,
          webhookId: 'mock-webhook-id'
        }
      }

      // Mock OAuth callback parameters
      mockRequest.nextUrl.searchParams.set('code', 'oauth-code-123')

      container.updateServiceMock('slackAuthService', {
        processOAuthCallback: jest.fn().mockResolvedValue(mockResponse)
      })

      container.updateUtilsMock({
        getAppBaseUrl: jest.fn().mockReturnValue('http://localhost:3000')
      })

      const response = await handlers.GET(mockRequest)

      expect(container.auth.requireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(container.services.slackAuthService.processOAuthCallback).toHaveBeenCalledWith(
        'oauth-code-123',
        'mock-user-id',
        {
          code: 'oauth-code-123',
          clientId: process.env.SLACK_CLIENT_ID,
          clientSecret: process.env.SLACK_CLIENT_SECRET,
          redirectUri: 'http://localhost:3000/api/slack/auth'
        }
      )
      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toContain('/settings?slack_success=true')
    })

    it('should handle OAuth error parameter', async () => {
      // Mock OAuth error parameter
      mockRequest.nextUrl.searchParams.set('error', 'access_denied')

      container.updateUtilsMock({
        getAppBaseUrl: jest.fn().mockReturnValue('http://localhost:3000')
      })

      const response = await handlers.GET(mockRequest)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toContain('/settings?slack_error=access_denied')
      expect(container.utils.webhookLogger.error).toHaveBeenCalledWith(
        { slackError: 'access_denied' },
        'Slack OAuth error received'
      )
    })

    it('should handle missing code parameter', async () => {
      // No code parameter set
      container.updateUtilsMock({
        getAppBaseUrl: jest.fn().mockReturnValue('http://localhost:3000')
      })

      const response = await handlers.GET(mockRequest)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toContain('/settings?slack_error=no_code')
    })

    it('should handle OAuth processing failure', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Token exchange failed',
        statusCode: 400
      }

      // Mock OAuth callback parameters
      mockRequest.nextUrl.searchParams.set('code', 'oauth-code-123')

      container.updateServiceMock('slackAuthService', {
        processOAuthCallback: jest.fn().mockResolvedValue(mockErrorResponse)
      })

      container.updateUtilsMock({
        getAppBaseUrl: jest.fn().mockReturnValue('http://localhost:3000')
      })

      const response = await handlers.GET(mockRequest)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toContain('/settings?slack_error=token_exchange')
    })

    it('should handle authentication errors', async () => {
      // Mock OAuth callback parameters
      mockRequest.nextUrl.searchParams.set('code', 'oauth-code-123')

      container.updateAuthMock({
        requireAuthentication: jest.fn().mockRejectedValue(new Error('Authentication failed'))
      })

      container.updateUtilsMock({
        getAppBaseUrl: jest.fn().mockReturnValue('http://localhost:3000')
      })

      const response = await handlers.GET(mockRequest)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toContain('slack_auth_required=true')
      expect(response.headers.get('location')).toContain('slack_code=oauth-code-123')
    })

    it('should handle service errors with different status codes', async () => {
      const testCases = [
        { statusCode: 404, expectedError: 'user_not_found' },
        { statusCode: 400, expectedError: 'token_exchange' },
        { statusCode: 500, expectedError: 'server_error' }
      ]

      for (const testCase of testCases) {
        const mockErrorResponse = {
          success: false,
          error: 'Service error',
          statusCode: testCase.statusCode
        }

        // Mock OAuth callback parameters
        mockRequest.nextUrl.searchParams.set('code', 'oauth-code-123')

        container.updateServiceMock('slackAuthService', {
          processOAuthCallback: jest.fn().mockResolvedValue(mockErrorResponse)
        })

        container.updateUtilsMock({
          getAppBaseUrl: jest.fn().mockReturnValue('http://localhost:3000')
        })

        const response = await handlers.GET(mockRequest)

        expect(response.status).toBe(307) // Redirect
        expect(response.headers.get('location')).toContain(`slack_error=${testCase.expectedError}`)
      }
    })

    it('should handle unexpected errors', async () => {
      // Mock OAuth callback parameters
      mockRequest.nextUrl.searchParams.set('code', 'oauth-code-123')

      container.updateServiceMock('slackAuthService', {
        processOAuthCallback: jest.fn().mockRejectedValue(new Error('Unexpected error'))
      })

      container.updateUtilsMock({
        getAppBaseUrl: jest.fn().mockReturnValue('http://localhost:3000')
      })

      const response = await handlers.GET(mockRequest)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toContain('/settings?slack_error=server_error')
    })
  })

  describe('Dependency Injection compliance', () => {
    it('should use test container for all dependencies', async () => {
      // Mock OAuth callback parameters
      mockRequest.nextUrl.searchParams.set('code', 'oauth-code-123')

      container.updateUtilsMock({
        getAppBaseUrl: jest.fn().mockReturnValue('http://localhost:3000')
      })

      await handlers.GET(mockRequest)

      expect(container.auth.requireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(container.services.slackAuthService.processOAuthCallback).toHaveBeenCalled()
      expect(container.utils.getAppBaseUrl).toHaveBeenCalled()
    })

    it('should allow mock updates for testing different scenarios', async () => {
      const customResponse = {
        success: true,
        data: {
          slackUserId: 'U67890',
          connection: { workspace_name: 'Custom Workspace' },
          webhookCreated: false,
          webhookId: null
        }
      }

      // Mock OAuth callback parameters
      mockRequest.nextUrl.searchParams.set('code', 'oauth-code-123')

      container.updateServiceMock('slackAuthService', {
        processOAuthCallback: jest.fn().mockResolvedValue(customResponse)
      })

      container.updateUtilsMock({
        getAppBaseUrl: jest.fn().mockReturnValue('http://localhost:3000')
      })

      const response = await handlers.GET(mockRequest)

      expect(response.status).toBe(307) // Redirect
      expect(response.headers.get('location')).toContain('/settings?slack_success=true')
    })
  })
})
