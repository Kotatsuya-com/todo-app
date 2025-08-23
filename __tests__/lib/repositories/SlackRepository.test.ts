/**
 * @jest-environment node
 */

import { SlackRepository, SlackRepositoryInterface } from '@/lib/repositories/SlackRepository'
import { RepositoryContext, RepositoryUtils } from '@/lib/repositories/BaseRepository'
import { SupabaseClient } from '@supabase/supabase-js'
import { mock, MockProxy } from 'jest-mock-extended'
import {
  createMockSlackConnection,
  createMockSlackWebhook,
  createMockSlackEventProcessed,
  createMockUserWithSettings
} from '@/__tests__/fixtures/entities.fixture'
import { createSupabaseSuccessResponse, createSupabaseErrorResponse } from '@/__tests__/utils/testUtilities'

describe('SlackRepository', () => {
  let repository: SlackRepository
  let mockSupabaseClient: MockProxy<SupabaseClient>
  let mockContext: MockProxy<RepositoryContext>

  beforeEach(() => {
    mockSupabaseClient = mock<SupabaseClient>()
    mockContext = mock<RepositoryContext>()
    mockContext.getServiceClient.mockReturnValue(mockSupabaseClient)
    repository = new SlackRepository(mockContext)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findConnectionById', () => {
    it('should return connection successfully', async () => {
      const mockConnection = createMockSlackConnection()
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockConnection, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findConnectionById('conn-123')

      expect(result.data).toEqual(mockConnection)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slack_connections')
      expect(mockFromResult.select).toHaveBeenCalledWith('*')
      expect(mockFromResult.eq).toHaveBeenCalledWith('id', 'conn-123')
      expect(mockFromResult.single).toHaveBeenCalled()
    })

    it('should handle not found error', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findConnectionById('non-existent')

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('JSON object requested')
    })

    it('should handle database error', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'DB_ERROR', message: 'Database connection failed' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findConnectionById('conn-123')

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Database connection failed')
    })
  })

  describe('findConnectionsByUserId', () => {
    it('should return connections list successfully', async () => {
      const mockConnections = [
        createMockSlackConnection({ id: 'conn-1' }),
        createMockSlackConnection({ id: 'conn-2' })
      ]
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockConnections, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findConnectionsByUserId('user-123')

      expect(result.data).toEqual(mockConnections)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slack_connections')
      expect(mockFromResult.eq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(mockFromResult.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('should return empty array when no connections found', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findConnectionsByUserId('user-123')

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })
  })

  describe('createConnection', () => {
    it('should create connection successfully', async () => {
      const connectionData = {
        user_id: 'user-123',
        workspace_id: 'T1234567890',
        workspace_name: 'Test Workspace',
        team_name: 'Test Team',
        access_token: 'xoxb-token',
        scope: 'channels:read,chat:write'
      }
      const mockCreatedConnection = createMockSlackConnection(connectionData)

      const mockFromResult = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedConnection, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.createConnection(connectionData)

      expect(result.data).toEqual(mockCreatedConnection)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slack_connections')
      expect(mockFromResult.insert).toHaveBeenCalledWith(connectionData)
    })

    it('should handle creation failure', async () => {
      const connectionData = {
        user_id: 'user-123',
        workspace_id: 'T1234567890',
        workspace_name: 'Test Workspace',
        team_name: 'Test Team',
        access_token: 'xoxb-token',
        scope: 'channels:read,chat:write'
      }

      const mockFromResult = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'UNIQUE_VIOLATION', message: 'Connection already exists' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.createConnection(connectionData)

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Connection already exists')
    })
  })

  describe('deleteConnection', () => {
    it('should delete connection successfully', async () => {
      const mockFromResult = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        mockImplementation: jest.fn().mockResolvedValue({ error: null })
      }
      // Mock chaining for two eq calls
      mockFromResult.eq.mockReturnValueOnce(mockFromResult).mockReturnValueOnce({
        ...mockFromResult,
        mockImplementation: jest.fn().mockResolvedValue({ error: null })
      })

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.deleteConnection('conn-123', 'user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slack_connections')
      expect(mockFromResult.delete).toHaveBeenCalled()
    })
  })

  describe('findWebhookById', () => {
    it('should return webhook successfully', async () => {
      const mockWebhook = createMockSlackWebhook()
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockWebhook, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findWebhookById('webhook-123')

      expect(result.data).toEqual(mockWebhook)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_slack_webhooks')
    })

    it('should handle webhook not found', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No webhook found' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findWebhookById('non-existent')

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
    })
  })

  describe('findWebhooksByUserId', () => {
    it('should return user webhooks successfully', async () => {
      const mockWebhooks = [
        createMockSlackWebhook({ id: 'webhook-1' }),
        createMockSlackWebhook({ id: 'webhook-2' })
      ]
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockWebhooks, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findWebhooksByUserId('user-123')

      expect(result.data).toEqual(mockWebhooks)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_slack_webhooks')
      expect(mockFromResult.eq).toHaveBeenCalledWith('user_id', 'user-123')
    })
  })

  describe('createWebhook', () => {
    it('should create webhook successfully', async () => {
      const webhookData = {
        user_id: 'user-123',
        slack_connection_id: 'conn-123',
        webhook_id: 'wh-123',
        webhook_secret: 'secret-123',
        is_active: true,
        event_count: 0
      }
      const mockCreatedWebhook = createMockSlackWebhook(webhookData)

      // Mock RPC function call instead of from/insert
      mockSupabaseClient.rpc.mockResolvedValue(createSupabaseSuccessResponse(mockCreatedWebhook))

      const result = await repository.createWebhook(webhookData)

      expect(result.data).toEqual(mockCreatedWebhook)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_user_slack_webhook', {
        p_user_id: webhookData.user_id,
        p_slack_connection_id: webhookData.slack_connection_id
      })
    })
  })

  describe('updateWebhook', () => {
    it('should update webhook successfully', async () => {
      const updates = { is_active: false, event_count: 5 }
      const mockUpdatedWebhook = createMockSlackWebhook({ ...updates })

      const mockFromResult = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUpdatedWebhook, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.updateWebhook('webhook-123', updates)

      expect(result.data).toEqual(mockUpdatedWebhook)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_slack_webhooks')
      expect(mockFromResult.update).toHaveBeenCalledWith(updates)
      expect(mockFromResult.eq).toHaveBeenCalledWith('id', 'webhook-123')
    })
  })

  describe('findProcessedEvent', () => {
    it('should return processed event successfully', async () => {
      const mockEvent = createMockSlackEventProcessed()
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockEvent, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findProcessedEvent('event-key-123')

      expect(result.data).toEqual(mockEvent)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slack_event_processed')
      expect(mockFromResult.eq).toHaveBeenCalledWith('event_key', 'event-key-123')
    })

    it('should handle event not found', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No event found' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findProcessedEvent('non-existent')

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
    })
  })

  describe('createProcessedEvent', () => {
    it('should create processed event successfully', async () => {
      const eventData = {
        event_key: 'C1234567890:1234567890.123456:fire:U1234567890',
        user_id: 'user-123',
        channel_id: 'C1234567890',
        message_ts: '1234567890.123456',
        reaction: 'fire',
        todo_id: 'todo-123'
      }
      const mockCreatedEvent = createMockSlackEventProcessed(eventData)

      const mockFromResult = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedEvent, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.createProcessedEvent(eventData)

      expect(result.data).toEqual(mockCreatedEvent)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slack_event_processed')
      expect(mockFromResult.insert).toHaveBeenCalledWith(expect.objectContaining({
        ...eventData,
        processed_at: expect.any(String)
      }))
    })
  })

  describe('findUserWithSettings', () => {
    it('should return user with settings successfully', async () => {
      const mockUser = createMockUserWithSettings()
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUser, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findUserWithSettings('user-123')

      expect(result.data).toEqual(mockUser)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users')
    })

    it('should handle user not found', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No user found' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findUserWithSettings('non-existent')

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
    })

    it('should use fallback when nested query fails (user without emoji settings)', async () => {
      // Mock user data without emoji settings
      const mockUserData = {
        id: 'user-123',
        slack_user_id: 'U1234567890',
        enable_webhook_notifications: true,
        created_at: '2023-01-01T00:00:00Z'
      }

      // First call (nested query) fails
      const mockNestedQueryResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST204', message: 'No rows found' }
        })
      }

      // Second call (fallback user query) succeeds
      const mockUserQueryResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUserData,
          error: null
        })
      }

      // Third call (emoji settings query) returns empty
      const mockEmojiQueryResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      // Setup mock to return different results for each call
      mockSupabaseClient.from
        .mockReturnValueOnce(mockNestedQueryResult as any) // First call: nested query fails
        .mockReturnValueOnce(mockUserQueryResult as any)   // Second call: user query succeeds
        .mockReturnValueOnce(mockEmojiQueryResult as any)  // Third call: emoji settings query

      const result = await repository.findUserWithSettings('user-123')

      // Verify the result has user data with empty emoji settings
      expect(result.error).toBeNull()
      expect(result.data).toEqual({
        ...mockUserData,
        user_emoji_settings: []
      })

      // Verify all three queries were made
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(3)
      expect(mockSupabaseClient.from).toHaveBeenNthCalledWith(1, 'users')
      expect(mockSupabaseClient.from).toHaveBeenNthCalledWith(2, 'users')
      expect(mockSupabaseClient.from).toHaveBeenNthCalledWith(3, 'user_emoji_settings')
    })

    it('should handle user with null emoji settings', async () => {
      const mockUser = {
        id: 'user-123',
        slack_user_id: 'U1234567890',
        enable_webhook_notifications: true,
        created_at: '2023-01-01T00:00:00Z',
        user_emoji_settings: null
      }

      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUser, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findUserWithSettings('user-123')

      expect(result.data).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle user with empty emoji settings array', async () => {
      const mockUser = {
        id: 'user-123',
        slack_user_id: 'U1234567890',
        enable_webhook_notifications: true,
        created_at: '2023-01-01T00:00:00Z',
        user_emoji_settings: []
      }

      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUser, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findUserWithSettings('user-123')

      expect(result.data).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle fallback when both user queries fail', async () => {
      // Both nested and fallback queries fail
      const mockFailedResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'User not found' }
        })
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockFailedResult as any) // First call: nested query fails
        .mockReturnValueOnce(mockFailedResult as any) // Second call: fallback also fails

      const result = await repository.findUserWithSettings('non-existent-user')

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('User not found')
    })

    it('should handle user with multiple emoji settings', async () => {
      const mockUser = {
        id: 'user-123',
        slack_user_id: 'U1234567890',
        enable_webhook_notifications: true,
        created_at: '2023-01-01T00:00:00Z',
        user_emoji_settings: [
          {
            id: 'emoji-1',
            user_id: 'user-123',
            today_emoji: 'fire',
            tomorrow_emoji: 'calendar',
            later_emoji: 'memo',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          },
          {
            id: 'emoji-2',
            user_id: 'user-123',
            today_emoji: 'rocket',
            tomorrow_emoji: 'clock',
            later_emoji: 'bookmark',
            created_at: '2023-02-01T00:00:00Z',
            updated_at: '2023-02-01T00:00:00Z'
          }
        ]
      }

      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUser, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findUserWithSettings('user-123')

      expect(result.data).toEqual(mockUser)
      expect(result.data?.user_emoji_settings).toHaveLength(2)
      expect(result.error).toBeNull()
    })

    it('should handle emoji settings query failure in fallback', async () => {
      const mockUserData = {
        id: 'user-123',
        slack_user_id: 'U1234567890',
        enable_webhook_notifications: true,
        created_at: '2023-01-01T00:00:00Z'
      }

      // First call (nested query) fails
      const mockNestedQueryResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST204', message: 'No rows found' }
        })
      }

      // Second call (fallback user query) succeeds
      const mockUserQueryResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUserData,
          error: null
        })
      }

      // Third call (emoji settings query) fails
      const mockEmojiQueryResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST301', message: 'Database error' }
        })
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockNestedQueryResult as any)
        .mockReturnValueOnce(mockUserQueryResult as any)
        .mockReturnValueOnce(mockEmojiQueryResult as any)

      const result = await repository.findUserWithSettings('user-123')

      // Should still return user data with empty emoji settings
      expect(result.error).toBeNull()
      expect(result.data).toEqual({
        ...mockUserData,
        user_emoji_settings: []
      })
    })
  })

  describe('getDirectSlackUserId', () => {
    it('should return slack user id successfully', async () => {
      const mockResult = { slack_user_id: 'U1234567890' }
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockResult, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.getDirectSlackUserId('user-123')

      expect(result.data).toEqual(mockResult)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users')
      expect(mockFromResult.select).toHaveBeenCalledWith('slack_user_id')
    })
  })

  describe('bulk operations', () => {
    describe('deleteWebhooksByConnectionIds', () => {
      it('should delete webhooks by connection IDs successfully', async () => {
        const connectionIds = ['conn-1', 'conn-2', 'conn-3']
        const mockFromResult = {
          delete: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ error: null })
        }

        mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

        const result = await repository.deleteWebhooksByConnectionIds(connectionIds)

        expect(result.error).toBeNull()
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_slack_webhooks')
        expect(mockFromResult.in).toHaveBeenCalledWith('slack_connection_id', connectionIds)
      })
    })

    describe('deleteConnectionsByUserId', () => {
      it('should delete connections by user ID successfully', async () => {
        const mockFromResult = {
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null })
        }

        mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

        const result = await repository.deleteConnectionsByUserId('user-123')

        expect(result.error).toBeNull()
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('slack_connections')
        expect(mockFromResult.eq).toHaveBeenCalledWith('user_id', 'user-123')
      })
    })

    describe('updateUserSlackId', () => {
      it('should update user slack ID successfully', async () => {
        const mockFromResult = {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockResolvedValue({ error: null })
        }

        mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

        const result = await repository.updateUserSlackId('user-123', 'U1234567890')

        expect(result.error).toBeNull()
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('users')
        expect(mockFromResult.update).toHaveBeenCalledWith({ slack_user_id: 'U1234567890' })
      })
    })

    describe('resetUserSlackId', () => {
      it('should reset user slack ID successfully', async () => {
        const mockFromResult = {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null })
        }

        mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

        const result = await repository.resetUserSlackId('user-123')

        expect(result.error).toBeNull()
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('users')
        expect(mockFromResult.update).toHaveBeenCalledWith({ slack_user_id: null })
      })
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Network error'))
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      await expect(repository.findConnectionById('conn-123')).rejects.toThrow('Network error')
    })

    it('should handle empty parameters', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findConnectionById('')

      expect(mockFromResult.eq).toHaveBeenCalledWith('id', '')
    })

    it('should handle null/undefined data gracefully', async () => {
      const mockFromResult = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.createConnection({
        user_id: 'user-123',
        workspace_id: 'T1234567890',
        workspace_name: 'Test',
        team_name: 'Test',
        access_token: 'token',
        scope: 'read'
      })

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })
  })
})
