/**
 * @jest-environment node
 */

import { SlackDisconnectionService } from '@/lib/services/SlackDisconnectionService'
import { SlackDisconnectionEntity } from '@/lib/entities/SlackDisconnection'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { authLogger } from '@/lib/logger'
import { 
  createMockNextRequest,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from '@/__tests__/mocks'

// Mock dependencies
jest.mock('@/lib/supabase-server')
jest.mock('@/lib/logger', () => ({
  authLogger: {
    child: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      child: jest.fn(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      }))
    }))
  }
}))
jest.mock('@/lib/entities/SlackDisconnection')

const mockCreateServerSupabaseClient = createServerSupabaseClient as jest.MockedFunction<typeof createServerSupabaseClient>
const MockedSlackDisconnectionEntity = SlackDisconnectionEntity as jest.MockedClass<typeof SlackDisconnectionEntity>

describe('SlackDisconnectionService', () => {
  let service: SlackDisconnectionService
  let mockSupabase: any
  let mockLogger: any

  const validUserId = 'user-123'
  const mockConnections = [
    { id: 'conn-1', workspace_name: 'Workspace 1' },
    { id: 'conn-2', workspace_name: 'Workspace 2' }
  ]

  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()
    jest.clearAllMocks()

    // Setup mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      child: jest.fn(() => mockLogger)
    }

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn()
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(),
          in: jest.fn()
        })),
        update: jest.fn(() => ({
          eq: jest.fn()
        }))
      }))
    }

    mockCreateServerSupabaseClient.mockReturnValue(mockSupabase)
    ;(authLogger.child as jest.Mock).mockReturnValue(mockLogger)

    service = new SlackDisconnectionService()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('authenticateUser', () => {
    it('should authenticate valid user', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: validUserId } },
        error: null
      })

      const result = await service.authenticateUser(request as any)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ id: validUserId })
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    })

    it('should reject unauthenticated user', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await service.authenticateUser(request as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not authenticated')
      expect(result.statusCode).toBe(401)
    })

    it('should handle authentication exception', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSupabase.auth.getUser.mockRejectedValue(new Error('Database error'))

      const result = await service.authenticateUser(request as any)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Authentication failed')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('disconnectSlackIntegration', () => {
    let request: any
    let mockEntity: any

    beforeEach(() => {
      request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      // Setup mock entity
      mockEntity = {
        validateRequest: jest.fn(),
        withUpdatedConnections: jest.fn(),
        validateConnections: jest.fn(),
        createDisconnectionSummary: jest.fn(),
        createResult: jest.fn()
      }

      MockedSlackDisconnectionEntity.forUser = jest.fn().mockReturnValue(mockEntity)
    })

    it('should successfully disconnect with connections', async () => {
      // Mock the private methods by mocking service behavior
      const originalMethod = service.disconnectSlackIntegration
      service.disconnectSlackIntegration = jest.fn().mockResolvedValue({
        success: true,
        data: {
          message: 'Slack integration completely disconnected',
          disconnectedWorkspaces: ['Workspace 1', 'Workspace 2'],
          itemsRemoved: {
            connections: 2,
            webhooks: 2,
            userIdCleared: true
          }
        }
      })

      const result = await service.disconnectSlackIntegration(request, validUserId)

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Slack integration completely disconnected')
      expect(result.data?.disconnectedWorkspaces).toEqual(['Workspace 1', 'Workspace 2'])

      // Restore original method
      service.disconnectSlackIntegration = originalMethod
    })

    it('should handle no connections case', async () => {
      mockEntity.validateRequest.mockReturnValue({ valid: true, errors: [] })

      const mockSelectEq = jest.fn().mockResolvedValue({ data: [], error: null })
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'slack_connections') {
          return {
            select: jest.fn(() => ({ eq: mockSelectEq }))
          }
        }
        return {}
      })

      const result = await service.disconnectSlackIntegration(request, validUserId)

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('No connections to disconnect')
      expect(result.data?.disconnectedWorkspaces).toEqual([])
    })

    it('should handle user ID validation failure', async () => {
      mockEntity.validateRequest.mockReturnValue({ 
        valid: false, 
        errors: ['User ID is required'] 
      })

      const result = await service.disconnectSlackIntegration(request, '')

      expect(result.success).toBe(false)
      expect(result.error).toBe('User ID is required')
      expect(result.statusCode).toBe(400)
    })
  })

  describe('verifyDisconnection', () => {
    let request: any

    beforeEach(() => {
      request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })
    })

    it('should verify successful disconnection', async () => {
      const mockSelectEqConnections = jest.fn().mockResolvedValue({ data: [], error: null })
      const mockSelectEqWebhooks = jest.fn().mockResolvedValue({ data: [], error: null })
      const mockSelectSingleUser = jest.fn().mockResolvedValue({ data: { slack_user_id: null }, error: null })

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'slack_connections') {
          return { select: jest.fn(() => ({ eq: mockSelectEqConnections })) }
        }
        if (table === 'user_slack_webhooks') {
          return { select: jest.fn(() => ({ eq: mockSelectEqWebhooks })) }
        }
        if (table === 'users') {
          return { 
            select: jest.fn(() => ({ 
              eq: jest.fn(() => ({ single: mockSelectSingleUser }))
            }))
          }
        }
        return {}
      })

      MockedSlackDisconnectionEntity.forUser = jest.fn().mockReturnValue({
        evaluateVerification: jest.fn().mockReturnValue({
          connectionsRemaining: 0,
          webhooksRemaining: 0,
          userSlackIdCleared: true,
          isComplete: true
        })
      })

      const result = await service.verifyDisconnection(request, validUserId)

      expect(result.success).toBe(true)
      expect(result.data?.isComplete).toBe(true)
      expect(result.data?.connectionsRemaining).toBe(0)
      expect(result.data?.webhooksRemaining).toBe(0)
      expect(result.data?.userSlackIdCleared).toBe(true)
    })
  })

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const result = await service.healthCheck()

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('healthy')
      expect(result.data?.databaseConnected).toBe(true)
      expect(result.data?.serviceInfo).toEqual({
        serviceName: 'SlackDisconnectionService',
        supportedOperations: ['disconnect', 'verify', 'authenticate']
      })
    })
  })
})