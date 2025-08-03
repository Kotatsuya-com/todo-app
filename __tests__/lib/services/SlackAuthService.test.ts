/**
 * @jest-environment jsdom
 */

import { SlackAuthService } from '@/lib/services/SlackAuthService'
import { SlackRepositoryInterface } from '@/lib/repositories/SlackRepository'
import { RepositoryResult } from '@/lib/repositories/BaseRepository'
import { SlackConnection } from '@/lib/entities/SlackConnection'
import { UserWithSettings } from '@/lib/entities/User'
import {
  createMockSlackOAuthTokenData,
  createMockSlackOAuthError,
  createMockSlackOAuthInvalidUserId,
  createMockSlackOAuthIncomplete,
  EXPECTED_CONNECTION_DATA
} from '@/__tests__/fixtures/slack-oauth.fixture'
import {
  createMockSlackConnection
} from '@/__tests__/fixtures/slack-connection.fixture'

// Mock global fetch
global.fetch = jest.fn()

describe('SlackAuthService', () => {
  let service: SlackAuthService
  let mockSlackRepo: jest.Mocked<SlackRepositoryInterface>

  beforeEach(() => {
    mockSlackRepo = {
      findConnectionById: jest.fn(),
      findConnectionsByUserId: jest.fn(),
      createConnection: jest.fn(),
      upsertConnection: jest.fn(),
      deleteConnection: jest.fn(),
      updateUserSlackId: jest.fn(),
      findWebhookById: jest.fn(),
      findWebhooksByUserId: jest.fn(),
      findWebhookByConnectionId: jest.fn(),
      createWebhook: jest.fn(),
      updateWebhook: jest.fn(),
      updateWebhookStats: jest.fn(),
      findProcessedEvent: jest.fn(),
      createProcessedEvent: jest.fn(),
      findUserWithSettings: jest.fn(),
      getDirectSlackUserId: jest.fn()
    }

    service = new SlackAuthService(mockSlackRepo)
    
    // Reset fetch mock
    jest.clearAllMocks()
  })

  describe('processOAuthCallback', () => {
    const validTokenExchangeRequest = {
      code: 'test-code',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/api/slack/auth'
    }

    it('should complete full OAuth flow successfully', async () => {
      const userId = 'user-123'
      const mockConnection = createMockSlackConnection()
      const mockTokenData = createMockSlackOAuthTokenData()
      
      // Mock successful user validation
      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        success: true,
        data: { id: userId } as UserWithSettings
      })

      // Mock successful token exchange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenData)
      } as Response)

      // Mock successful connection creation
      mockSlackRepo.upsertConnection.mockResolvedValue({
        success: true,
        data: mockConnection
      })

      // Mock successful user update
      mockSlackRepo.updateUserSlackId.mockResolvedValue({
        success: true,
        data: undefined
      })

      // Mock successful verification
      mockSlackRepo.getDirectSlackUserId.mockResolvedValue({
        success: true,
        data: { slack_user_id: 'U1234567890' }
      })

      // Mock successful webhook creation
      mockSlackRepo.createWebhook.mockResolvedValue({
        success: true,
        data: { webhook_id: 'webhook-123' } as any
      })

      const result = await service.processOAuthCallback(
        'test-code',
        userId,
        validTokenExchangeRequest
      )

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.slackUserId).toBe('U1234567890')
      expect(result.data!.connection).toEqual(mockConnection)
      expect(result.data!.webhookCreated).toBe(true)
      expect(result.data!.webhookId).toBe('webhook-123')
    })

    it('should fail when user does not exist', async () => {
      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        success: false,
        error: { code: 'PGRST116', message: 'User not found' }
      })

      const result = await service.processOAuthCallback(
        'test-code',
        'non-existent-user',
        validTokenExchangeRequest
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('User record not found in database')
      expect(result.statusCode).toBe(404)
    })

    it('should fail when token exchange fails', async () => {
      const userId = 'user-123'
      
      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        success: true,
        data: { id: userId } as UserWithSettings
      })

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createMockSlackOAuthError())
      } as Response)

      const result = await service.processOAuthCallback(
        'test-code',
        userId,
        validTokenExchangeRequest
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Slack OAuth error')
      expect(result.statusCode).toBe(400)
    })

    it('should continue even if webhook creation fails', async () => {
      const userId = 'user-123'
      const mockConnection = createMockSlackConnection()
      const mockTokenData = createMockSlackOAuthTokenData()
      
      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        success: true,
        data: { id: userId } as UserWithSettings
      })

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenData)
      } as Response)

      mockSlackRepo.upsertConnection.mockResolvedValue({
        success: true,
        data: mockConnection
      })

      mockSlackRepo.updateUserSlackId.mockResolvedValue({
        success: true,
        data: undefined
      })

      mockSlackRepo.getDirectSlackUserId.mockResolvedValue({
        success: true,
        data: { slack_user_id: 'U1234567890' }
      })

      // Mock webhook creation failure
      mockSlackRepo.createWebhook.mockResolvedValue({
        success: false,
        error: { message: 'Webhook creation failed' }
      })

      const result = await service.processOAuthCallback(
        'test-code',
        userId,
        validTokenExchangeRequest
      )

      expect(result.success).toBe(true)
      expect(result.data!.webhookCreated).toBe(false)
      expect(result.data!.webhookId).toBeNull()
    })

    it('should handle service exceptions', async () => {
      mockSlackRepo.findUserWithSettings.mockRejectedValue(new Error('Database error'))

      const result = await service.processOAuthCallback(
        'test-code',
        'user-123',
        validTokenExchangeRequest
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error during user validation')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('validateUserExists', () => {
    it('should validate existing user successfully', async () => {
      const userId = 'user-123'
      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        success: true,
        data: { id: userId } as UserWithSettings
      })

      const result = await service.validateUserExists(userId)

      expect(result.success).toBe(true)
      expect(mockSlackRepo.findUserWithSettings).toHaveBeenCalledWith(userId)
    })

    it('should return 404 for non-existent user', async () => {
      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        success: false,
        error: { code: 'PGRST116', message: 'User not found' }
      })

      const result = await service.validateUserExists('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toBe('User record not found in database')
      expect(result.statusCode).toBe(404)
    })

    it('should return 500 for other database errors', async () => {
      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        success: false,
        error: { code: 'DB_ERROR', message: 'Database connection failed' }
      })

      const result = await service.validateUserExists('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to check user record')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service exceptions', async () => {
      mockSlackRepo.findUserWithSettings.mockRejectedValue(new Error('Network error'))

      const result = await service.validateUserExists('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error during user validation')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('exchangeCodeForTokens', () => {
    const validRequest = {
      code: 'test-code',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/api/slack/auth'
    }

    it('should exchange code for tokens successfully', async () => {
      const mockTokenData = createMockSlackOAuthTokenData()
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenData)
      } as Response)

      const result = await service.exchangeCodeForTokens(validRequest)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.teamId).toBe('T1234567890')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/oauth.v2.access',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
      )
    })

    it('should handle Slack API errors', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createMockSlackOAuthError())
      } as Response)

      const result = await service.exchangeCodeForTokens(validRequest)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Slack OAuth error')
      expect(result.statusCode).toBe(400)
    })

    it('should handle HTTP errors from Slack API', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      } as Response)

      const result = await service.exchangeCodeForTokens(validRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to communicate with Slack API')
      expect(result.statusCode).toBe(500)
    })

    it('should handle invalid token response structure', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createMockSlackOAuthIncomplete())
      } as Response)

      const result = await service.exchangeCodeForTokens(validRequest)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid token response from Slack')
      expect(result.statusCode).toBe(400)
    })

    it('should handle network errors', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await service.exchangeCodeForTokens(validRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error during token exchange')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('createSlackConnection', () => {
    it('should create connection successfully', async () => {
      const userId = 'user-123'
      const mockTokenData = createMockSlackOAuthTokenData()
      const mockConnection = createMockSlackConnection()
      const oauthEntity = SlackAuthService.prototype.exchangeCodeForTokens.bind({
        _slackRepo: mockSlackRepo
      })

      mockSlackRepo.upsertConnection.mockResolvedValue({
        success: true,
        data: mockConnection
      })

      // Create a mock OAuth entity
      const mockOAuthEntity = {
        isValidTokenResponse: () => true,
        toConnectionData: (userId: string) => ({
          user_id: userId,
          workspace_id: 'T1234567890',
          workspace_name: 'Test Workspace',
          team_name: 'Test Workspace',
          access_token: 'test-token',
          scope: 'channels:read'
        })
      }

      const result = await service.createSlackConnection(userId, mockOAuthEntity as any)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockConnection)
      expect(mockSlackRepo.upsertConnection).toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      const userId = 'user-123'
      const mockOAuthEntity = {
        isValidTokenResponse: () => true,
        toConnectionData: (userId: string) => ({
          user_id: userId,
          workspace_id: 'T1234567890',
          workspace_name: 'Test Workspace',
          team_name: 'Test Workspace',
          access_token: 'test-token',
          scope: 'channels:read'
        })
      }

      mockSlackRepo.upsertConnection.mockResolvedValue({
        success: false,
        error: { message: 'Database error' }
      })

      const result = await service.createSlackConnection(userId, mockOAuthEntity as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to save Slack connection to database')
      expect(result.statusCode).toBe(500)
    })

    it('should handle invalid OAuth entity', async () => {
      const userId = 'user-123'
      const mockOAuthEntity = {
        isValidTokenResponse: () => true,
        toConnectionData: () => {
          throw new Error('Invalid token data cannot be converted to connection')
        }
      }

      const result = await service.createSlackConnection(userId, mockOAuthEntity as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error during connection creation')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('updateUserSlackId', () => {
    it('should update user Slack ID successfully', async () => {
      const userId = 'user-123'
      const slackUserId = 'U1234567890'

      mockSlackRepo.updateUserSlackId.mockResolvedValue({
        success: true,
        data: undefined
      })

      mockSlackRepo.getDirectSlackUserId.mockResolvedValue({
        success: true,
        data: { slack_user_id: slackUserId }
      })

      const result = await service.updateUserSlackId(userId, slackUserId)

      expect(result.success).toBe(true)
      expect(mockSlackRepo.updateUserSlackId).toHaveBeenCalledWith(userId, slackUserId)
      expect(mockSlackRepo.getDirectSlackUserId).toHaveBeenCalledWith(userId)
    })

    it('should reject invalid Slack User ID format', async () => {
      const userId = 'user-123'
      const invalidSlackUserId = 'INVALID_ID'

      const result = await service.updateUserSlackId(userId, invalidSlackUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid Slack User ID format')
      expect(result.statusCode).toBe(400)
      expect(mockSlackRepo.updateUserSlackId).not.toHaveBeenCalled()
    })

    it('should retry on update failures', async () => {
      const userId = 'user-123'
      const slackUserId = 'U1234567890'

      // First two attempts fail, third succeeds
      mockSlackRepo.updateUserSlackId
        .mockResolvedValueOnce({ success: false, error: { message: 'DB Error 1' } })
        .mockResolvedValueOnce({ success: false, error: { message: 'DB Error 2' } })
        .mockResolvedValueOnce({ success: true, data: undefined })

      mockSlackRepo.getDirectSlackUserId.mockResolvedValue({
        success: true,
        data: { slack_user_id: slackUserId }
      })

      const result = await service.updateUserSlackId(userId, slackUserId)

      expect(result.success).toBe(true)
      expect(mockSlackRepo.updateUserSlackId).toHaveBeenCalledTimes(3)
    })

    it('should fail after maximum retries', async () => {
      const userId = 'user-123'
      const slackUserId = 'U1234567890'

      mockSlackRepo.updateUserSlackId.mockResolvedValue({
        success: false,
        error: { message: 'Persistent DB Error' }
      })

      const result = await service.updateUserSlackId(userId, slackUserId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to update user Slack ID after 3 attempts')
      expect(result.statusCode).toBe(500)
      expect(mockSlackRepo.updateUserSlackId).toHaveBeenCalledTimes(3)
    })

    it('should fail if verification fails', async () => {
      const userId = 'user-123'
      const slackUserId = 'U1234567890'

      mockSlackRepo.updateUserSlackId.mockResolvedValue({
        success: true,
        data: undefined
      })

      mockSlackRepo.getDirectSlackUserId.mockResolvedValue({
        success: true,
        data: { slack_user_id: 'U9999999999' } // Different ID
      })

      const result = await service.updateUserSlackId(userId, slackUserId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to update user Slack ID after 3 attempts')
    })
  })

  describe('verifyUserSlackIdUpdate', () => {
    it('should verify successful update', async () => {
      const userId = 'user-123'
      const slackUserId = 'U1234567890'

      mockSlackRepo.getDirectSlackUserId.mockResolvedValue({
        success: true,
        data: { slack_user_id: slackUserId }
      })

      const result = await service.verifyUserSlackIdUpdate(userId, slackUserId)

      expect(result.success).toBe(true)
    })

    it('should fail when Slack User ID not found', async () => {
      const userId = 'user-123'
      const slackUserId = 'U1234567890'

      mockSlackRepo.getDirectSlackUserId.mockResolvedValue({
        success: true,
        data: { slack_user_id: null }
      })

      const result = await service.verifyUserSlackIdUpdate(userId, slackUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Slack User ID not found after update')
    })

    it('should fail when Slack User ID mismatch', async () => {
      const userId = 'user-123'
      const expectedSlackUserId = 'U1234567890'
      const actualSlackUserId = 'U9999999999'

      mockSlackRepo.getDirectSlackUserId.mockResolvedValue({
        success: true,
        data: { slack_user_id: actualSlackUserId }
      })

      const result = await service.verifyUserSlackIdUpdate(userId, expectedSlackUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Slack User ID mismatch after update')
    })

    it('should handle repository errors', async () => {
      const userId = 'user-123'
      const slackUserId = 'U1234567890'

      mockSlackRepo.getDirectSlackUserId.mockResolvedValue({
        success: false,
        error: { message: 'Database error' }
      })

      const result = await service.verifyUserSlackIdUpdate(userId, slackUserId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to verify Slack User ID update')
    })
  })

  describe('autoCreateWebhook', () => {
    it('should create webhook successfully', async () => {
      const userId = 'user-123'
      const connectionId = 'conn-123'

      mockSlackRepo.createWebhook.mockResolvedValue({
        success: true,
        data: { webhook_id: 'webhook-123' } as any
      })

      const result = await service.autoCreateWebhook(userId, connectionId)

      expect(result.success).toBe(true)
      expect(result.data!.webhook_id).toBe('webhook-123')
      expect(mockSlackRepo.createWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          slack_connection_id: connectionId,
          is_active: true,
          event_count: 0
        })
      )
    })

    it('should handle webhook creation failure', async () => {
      const userId = 'user-123'
      const connectionId = 'conn-123'

      mockSlackRepo.createWebhook.mockResolvedValue({
        success: false,
        error: { message: 'Webhook creation failed' }
      })

      const result = await service.autoCreateWebhook(userId, connectionId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to auto-create webhook')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service exceptions', async () => {
      const userId = 'user-123'
      const connectionId = 'conn-123'

      mockSlackRepo.createWebhook.mockRejectedValue(new Error('Network error'))

      const result = await service.autoCreateWebhook(userId, connectionId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error during webhook creation')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('findConnectionByWorkspace', () => {
    it('should find connection by workspace successfully', async () => {
      const userId = 'user-123'
      const workspaceId = 'T1234567890'
      const mockConnections = [
        createMockSlackConnection({ workspace_id: workspaceId }),
        createMockSlackConnection({ workspace_id: 'T0987654321' })
      ]

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        success: true,
        data: mockConnections
      })

      const result = await service.findConnectionByWorkspace(userId, workspaceId)

      expect(result.success).toBe(true)
      expect(result.data!.workspace_id).toBe(workspaceId)
    })

    it('should return 404 when connection not found', async () => {
      const userId = 'user-123'
      const workspaceId = 'T1234567890'
      const mockConnections = [
        createMockSlackConnection({ workspace_id: 'T0987654321' })
      ]

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        success: true,
        data: mockConnections
      })

      const result = await service.findConnectionByWorkspace(userId, workspaceId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection not found for workspace')
      expect(result.statusCode).toBe(404)
    })

    it('should handle repository errors', async () => {
      const userId = 'user-123'
      const workspaceId = 'T1234567890'

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        success: false,
        error: { message: 'Database error' }
      })

      const result = await service.findConnectionByWorkspace(userId, workspaceId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch user connections')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle null/undefined parameters gracefully', async () => {
      const result = await service.validateUserExists('')

      expect(mockSlackRepo.findUserWithSettings).toHaveBeenCalledWith('')
    })

    it('should handle special characters in user IDs', async () => {
      const specialUserId = 'user-with-special@chars#123'
      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        success: true,
        data: { id: specialUserId } as UserWithSettings
      })

      const result = await service.validateUserExists(specialUserId)

      expect(result.success).toBe(true)
      expect(mockSlackRepo.findUserWithSettings).toHaveBeenCalledWith(specialUserId)
    })

    it('should maintain consistent error response format', async () => {
      const methods = [
        () => service.validateUserExists('user-123'),
        () => service.updateUserSlackId('user-123', 'U1234567890'),
        () => service.autoCreateWebhook('user-123', 'conn-123'),
        () => service.findConnectionByWorkspace('user-123', 'T1234567890')
      ]

      // Make all repository calls fail
      mockSlackRepo.findUserWithSettings.mockRejectedValue(new Error('Test error'))
      mockSlackRepo.updateUserSlackId.mockRejectedValue(new Error('Test error'))
      mockSlackRepo.createWebhook.mockRejectedValue(new Error('Test error'))
      mockSlackRepo.findConnectionsByUserId.mockRejectedValue(new Error('Test error'))

      for (const method of methods) {
        const result = await method()
        expect(result.success).toBe(false)
        expect(result.statusCode).toBe(500)
        expect(typeof result.error).toBe('string')
      }
    })
  })
})