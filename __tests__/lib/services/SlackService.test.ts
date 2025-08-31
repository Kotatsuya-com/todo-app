/**
 * SlackService unit tests
 * SlackServiceのユニットテスト
 */

import { SlackService } from '@/lib/services/SlackService'
import { NextRequest } from 'next/server'
import { SlackEventPayload } from '@/src/domain/types'

// Mock external dependencies
jest.mock('@/lib/slack-message', () => ({
  getSlackMessage: jest.fn()
}))

jest.mock('@/lib/openai-title', () => ({
  generateTaskTitle: jest.fn()
}))

jest.mock('@/lib/ngrok-url', () => ({
  getAppBaseUrl: jest.fn()
}))

import { getSlackMessage } from '@/lib/slack-message'
import { generateTaskTitle } from '@/lib/openai-title'
import { getAppBaseUrl } from '@/lib/ngrok-url'

const mockGetSlackMessage = getSlackMessage as jest.MockedFunction<typeof getSlackMessage>
const mockGenerateTaskTitle = generateTaskTitle as jest.MockedFunction<typeof generateTaskTitle>
const mockGetAppBaseUrl = getAppBaseUrl as jest.MockedFunction<typeof getAppBaseUrl>

// NEW: Import flexible mocking utilities
import { mockResult } from '@/__tests__/utils/autoMock'
import { MockProxy } from 'jest-mock-extended'
import { repositoryMock } from '@/__tests__/utils/mockBuilder'
import { SlackRepositoryInterface } from '@/lib/repositories/SlackRepository'
import { TodoRepositoryInterface } from '@/lib/repositories/TodoRepository'

// Mock entity fixtures to avoid import issues
const createMockSlackConnection = (overrides: any = {}) => ({
  id: 'conn-123',
  user_id: 'user-123',
  workspace_id: 'T1234567890',
  workspace_name: 'Test Workspace',
  team_name: 'Test Team',
  access_token: 'xoxb-token',
  scope: 'channels:read,chat:write,reactions:read',
  created_at: '2023-01-15T00:00:00Z',
  ...overrides
})

const createMockSlackWebhook = (overrides: any = {}) => ({
  id: 'webhook-123',
  user_id: 'user-123',
  slack_connection_id: 'conn-123',
  webhook_id: 'wh-123',
  webhook_secret: 'secret-123',
  is_active: true,
  last_event_at: null,
  event_count: 0,
  created_at: '2023-01-15T00:00:00Z',
  updated_at: '2023-01-15T00:00:00Z',
  ...overrides
})

const createMockUserWithSettings = (overrides: any = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  slack_user_id: 'U1234567890',
  enable_webhook_notifications: true,
  user_emoji_settings: [{
    today_emoji: 'fire',
    tomorrow_emoji: 'calendar',
    later_emoji: 'memo'
  }],
  ...overrides
})

const createMockTodo = (overrides: any = {}) => ({
  id: 'todo-123',
  user_id: 'user-123',
  title: 'Test Todo',
  body: 'Test body',
  status: 'open',
  deadline: null,
  importance_score: 0.5,
  created_via: 'manual',
  created_at: '2023-01-15T00:00:00Z',
  updated_at: '2023-01-15T00:00:00Z',
  completed_at: null,
  ...overrides
})

const createMockSlackEventProcessed = (overrides: any = {}) => ({
  id: 'event-123',
  event_key: 'C1234567890:1234567890.123456:fire:U1234567890',
  user_id: 'user-123',
  channel_id: 'C1234567890',
  message_ts: '1234567890.123456',
  reaction: 'fire',
  todo_id: 'todo-123',
  created_at: '2023-01-15T00:00:00Z',
  ...overrides
})

describe('SlackService', () => {
  let slackService: SlackService
  let mockSlackRepo: MockProxy<SlackRepositoryInterface>
  let mockTodoRepo: MockProxy<TodoRepositoryInterface>

  beforeEach(() => {
    // NEW: Use flexible mocking approach - create fresh mocks for each test
    mockSlackRepo = repositoryMock<SlackRepositoryInterface>().build()
    mockTodoRepo = repositoryMock<TodoRepositoryInterface>().build()
    slackService = new SlackService(mockSlackRepo, mockTodoRepo)

    // External dependency mocks
    mockGetSlackMessage.mockClear()
    mockGenerateTaskTitle.mockClear()
    mockGetAppBaseUrl.mockClear()
  })

  describe('getConnections', () => {
    it('should return connections successfully', async () => {
      const userId = 'user-123'
      const mockConnections = [createMockSlackConnection(), createMockSlackConnection()]

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue(
        mockResult.success(mockConnections)
      )

      const result = await slackService.getConnections(userId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockConnections)
      expect(mockSlackRepo.findConnectionsByUserId).toHaveBeenCalledWith(userId)
    })

    it('should handle repository error', async () => {
      const userId = 'user-123'

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue(
        mockResult.errorList('Database error')
      )

      const result = await slackService.getConnections(userId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch connections')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('deleteConnection', () => {
    it('should delete connection successfully', async () => {
      const connectionId = 'conn-123'
      const userId = 'user-123'

      mockSlackRepo.deleteConnection.mockResolvedValue(
        mockResult.success(undefined)
      )

      const result = await slackService.deleteConnection(connectionId, userId)

      expect(result.success).toBe(true)
      expect(mockSlackRepo.deleteConnection).toHaveBeenCalledWith(connectionId, userId)
    })

    it('should handle repository error', async () => {
      const connectionId = 'conn-123'
      const userId = 'user-123'

      mockSlackRepo.deleteConnection.mockResolvedValue(
        mockResult.error('Database error')
      )

      const result = await slackService.deleteConnection(connectionId, userId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to delete connection')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('getWebhooks', () => {
    it('should return webhooks successfully', async () => {
      const userId = 'user-123'
      const mockWebhooks = [createMockSlackWebhook(), createMockSlackWebhook()]

      mockSlackRepo.findWebhooksByUserId.mockResolvedValue(
        mockResult.success(mockWebhooks)
      )

      const result = await slackService.getWebhooks(userId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockWebhooks)
      expect(mockSlackRepo.findWebhooksByUserId).toHaveBeenCalledWith(userId)
    })

    it('should handle repository error', async () => {
      const userId = 'user-123'

      mockSlackRepo.findWebhooksByUserId.mockResolvedValue(
        mockResult.errorList('Database error')
      )

      const result = await slackService.getWebhooks(userId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch webhooks')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('createWebhook', () => {
    const userId = 'user-123'
    const connectionId = 'conn-123'
    let mockRequest: NextRequest

    beforeEach(() => {
      mockRequest = {} as NextRequest
      mockGetAppBaseUrl.mockReturnValue('https://app.example.com')
    })

    it('should create new webhook successfully', async () => {
      const mockConnection = createMockSlackConnection({ user_id: userId })
      const mockWebhook = createMockSlackWebhook()

      mockSlackRepo.findConnectionById.mockResolvedValue(mockResult.success(mockConnection))
      mockSlackRepo.findWebhookByConnectionId.mockResolvedValue(mockResult.error('Not found'))
      mockSlackRepo.createWebhook.mockResolvedValue(mockResult.success(mockWebhook))

      const result = await slackService.createWebhook(userId, connectionId, mockRequest)

      expect(result.success).toBe(true)
      expect(result.data?.webhook).toEqual(mockWebhook)
      expect(result.data?.webhook_url).toBe(`https://app.example.com/api/slack/events/user/${mockWebhook.webhook_id}`)
      expect(result.data?.message).toBe('Webhook created successfully')
    })

    it('should return error when connection not found', async () => {
      mockSlackRepo.findConnectionById.mockResolvedValue(mockResult.error('Not found'))

      const result = await slackService.createWebhook(userId, connectionId, mockRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Slack connection not found')
      expect(result.statusCode).toBe(404)
    })

    it('should return error when connection belongs to different user', async () => {
      const mockConnection = createMockSlackConnection({ user_id: 'different-user' })

      mockSlackRepo.findConnectionById.mockResolvedValue(mockResult.success(mockConnection))

      const result = await slackService.createWebhook(userId, connectionId, mockRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
      expect(result.statusCode).toBe(401)
    })
  })

  describe('processWebhookEvent', () => {
    const webhookId = 'webhook-123'
    let mockPayload: SlackEventPayload

    beforeEach(() => {
      mockPayload = {
        type: 'event_callback',
        event: {
          type: 'reaction_added',
          user: 'U1234567890',
          reaction: 'fire',
          item: {
            type: 'message',
            channel: 'C1234567890',
            ts: '1234567890.123456'
          },
          item_user: 'U0987654321',
          event_ts: '1234567890.123456'
        }
      } as SlackEventPayload

      // Mock external dependencies
      mockGetSlackMessage.mockResolvedValue({
        text: 'This is a Slack message content',
        user: 'U1234567890',
        ts: '1234567890.123456'
      })

      mockGenerateTaskTitle.mockResolvedValue('Generated Task Title')
    })

    it('should process reaction event successfully', async () => {
      const mockWebhook = createMockSlackWebhook()
      const mockUserWithSettings = createMockUserWithSettings()
      const mockConnection = createMockSlackConnection()

      mockSlackRepo.findWebhookById.mockResolvedValue(mockResult.success(mockWebhook))
      mockSlackRepo.findUserWithSettings.mockResolvedValue(mockResult.success(mockUserWithSettings))
      mockSlackRepo.getDirectSlackUserId.mockResolvedValue(mockResult.success({ slack_user_id: 'U1234567890' }))
      mockSlackRepo.findConnectionById.mockResolvedValue(mockResult.success(mockConnection))
      mockSlackRepo.findProcessedEvent.mockResolvedValue(mockResult.error('Not found'))

      const result = await slackService.processWebhookEvent(webhookId, mockPayload)

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Event received and queued for processing')
    })

    it('should return error when webhook not found', async () => {
      mockSlackRepo.findWebhookById.mockResolvedValue(mockResult.error('Not found'))

      const result = await slackService.processWebhookEvent(webhookId, mockPayload)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Webhook not found')
      expect(result.statusCode).toBe(404)
    })

    it('should return error when slack user ID not configured', async () => {
      const mockWebhook = createMockSlackWebhook()
      const mockUserWithSettings = createMockUserWithSettings({ slack_user_id: null })
      const mockConnection = createMockSlackConnection()

      mockSlackRepo.findWebhookById.mockResolvedValue(mockResult.success(mockWebhook))
      mockSlackRepo.findUserWithSettings.mockResolvedValue(mockResult.success(mockUserWithSettings))
      mockSlackRepo.getDirectSlackUserId.mockResolvedValue(mockResult.success({ slack_user_id: null }))
      mockSlackRepo.findConnectionById.mockResolvedValue(mockResult.success(mockConnection))
      mockSlackRepo.findProcessedEvent.mockResolvedValue(mockResult.error('Not found'))

      const result = await slackService.processWebhookEvent(webhookId, mockPayload)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Slack User ID not configured. Please set your Slack User ID in the settings.')
      expect(result.statusCode).toBe(400)
    })

    it('should ignore reactions from other users', async () => {
      const differentUserPayload = {
        ...mockPayload,
        event: {
          ...mockPayload.event,
          user: 'U9999999999'
        }
      } as SlackEventPayload

      const mockWebhook = createMockSlackWebhook()
      const mockUserWithSettings = createMockUserWithSettings()
      const mockConnection = createMockSlackConnection()

      mockSlackRepo.findWebhookById.mockResolvedValue(mockResult.success(mockWebhook))
      mockSlackRepo.findUserWithSettings.mockResolvedValue(mockResult.success(mockUserWithSettings))
      mockSlackRepo.getDirectSlackUserId.mockResolvedValue(mockResult.success({ slack_user_id: 'U1234567890' }))
      mockSlackRepo.findConnectionById.mockResolvedValue(mockResult.success(mockConnection))
      mockSlackRepo.findProcessedEvent.mockResolvedValue(mockResult.error('Not found'))

      const result = await slackService.processWebhookEvent(webhookId, differentUserPayload)

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Reaction ignored - only the webhook owner can create tasks')
    })

    it('should handle already processed events', async () => {
      const mockWebhook = createMockSlackWebhook()
      const mockUserWithSettings = createMockUserWithSettings()
      const mockConnection = createMockSlackConnection()
      const mockProcessedEvent = createMockSlackEventProcessed({ todo_id: 'existing-todo-123' })

      mockSlackRepo.findWebhookById.mockResolvedValue(mockResult.success(mockWebhook))
      mockSlackRepo.findUserWithSettings.mockResolvedValue(mockResult.success(mockUserWithSettings))
      mockSlackRepo.getDirectSlackUserId.mockResolvedValue(mockResult.success({ slack_user_id: 'U1234567890' }))
      mockSlackRepo.findConnectionById.mockResolvedValue(mockResult.success(mockConnection))
      mockSlackRepo.findProcessedEvent.mockResolvedValue(mockResult.success(mockProcessedEvent))

      const result = await slackService.processWebhookEvent(webhookId, mockPayload)

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Event already processed')
      expect(result.data?.existingTodoId).toBe('existing-todo-123')
    })

    it('should ignore non-configured emojis', async () => {
      const nonConfiguredEmojiPayload = {
        ...mockPayload,
        event: {
          ...mockPayload.event,
          reaction: 'random_emoji'
        }
      } as SlackEventPayload

      const mockWebhook = createMockSlackWebhook()
      const mockUserWithSettings = createMockUserWithSettings()
      const mockConnection = createMockSlackConnection()

      mockSlackRepo.findWebhookById.mockResolvedValue(mockResult.success(mockWebhook))
      mockSlackRepo.findUserWithSettings.mockResolvedValue(mockResult.success(mockUserWithSettings))
      mockSlackRepo.getDirectSlackUserId.mockResolvedValue(mockResult.success({ slack_user_id: 'U1234567890' }))
      mockSlackRepo.findConnectionById.mockResolvedValue(mockResult.success(mockConnection))
      mockSlackRepo.findProcessedEvent.mockResolvedValue(mockResult.error('Not found'))

      const result = await slackService.processWebhookEvent(webhookId, nonConfiguredEmojiPayload)

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Emoji not configured for task creation')
    })

    it('should handle exceptions gracefully', async () => {
      mockSlackRepo.findWebhookById.mockRejectedValue(new Error('Database connection failed'))

      const result = await slackService.processWebhookEvent(webhookId, mockPayload)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Processing failed: Database connection failed')
      expect(result.statusCode).toBe(500)
    })

    it('should handle user without emoji settings using default fallback', async () => {
      const mockWebhook = createMockSlackWebhook()
      // User without emoji settings - empty array
      const mockUserWithoutSettings = {
        id: 'user-123',
        email: 'test@example.com',
        slack_user_id: 'U1234567890',
        enable_webhook_notifications: true,
        created_at: '2023-01-01T00:00:00Z',
        user_emoji_settings: [] // Empty array - no emoji settings
      }
      const mockConnection = createMockSlackConnection()

      mockSlackRepo.findWebhookById.mockResolvedValue(mockResult.success(mockWebhook))
      mockSlackRepo.findUserWithSettings.mockResolvedValue(mockResult.success(mockUserWithoutSettings))
      mockSlackRepo.getDirectSlackUserId.mockResolvedValue(mockResult.success({ slack_user_id: 'U1234567890' }))
      mockSlackRepo.findConnectionById.mockResolvedValue(mockResult.success(mockConnection))
      mockSlackRepo.findProcessedEvent.mockResolvedValue(mockResult.error('Not found'))

      const result = await slackService.processWebhookEvent(webhookId, mockPayload)

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Event received and queued for processing')
      // Verify it processes with default emoji settings
    })

    it('should handle user with null emoji settings', async () => {
      const mockWebhook = createMockSlackWebhook()
      // User with null emoji settings - cast as any to simulate runtime condition
      const mockUserWithNullSettings = {
        id: 'user-123',
        email: 'test@example.com',
        slack_user_id: 'U1234567890',
        enable_webhook_notifications: true,
        created_at: '2023-01-01T00:00:00Z',
        user_emoji_settings: null as any // Null emoji settings (runtime condition)
      }
      const mockConnection = createMockSlackConnection()

      mockSlackRepo.findWebhookById.mockResolvedValue(mockResult.success(mockWebhook))
      mockSlackRepo.findUserWithSettings.mockResolvedValue(mockResult.success(mockUserWithNullSettings as any))
      mockSlackRepo.getDirectSlackUserId.mockResolvedValue(mockResult.success({ slack_user_id: 'U1234567890' }))
      mockSlackRepo.findConnectionById.mockResolvedValue(mockResult.success(mockConnection))
      mockSlackRepo.findProcessedEvent.mockResolvedValue(mockResult.error('Not found'))

      const result = await slackService.processWebhookEvent(webhookId, mockPayload)

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Event received and queued for processing')
      // Verify it falls back to default emoji settings
    })

    it('should handle user data fetch failure gracefully', async () => {
      const mockWebhook = createMockSlackWebhook()

      mockSlackRepo.findWebhookById.mockResolvedValue(mockResult.success(mockWebhook))
      // Simulate user data fetch failure
      mockSlackRepo.findUserWithSettings.mockResolvedValue(mockResult.error('Failed to fetch user data'))

      const result = await slackService.processWebhookEvent(webhookId, mockPayload)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch user data')
      expect(result.statusCode).toBe(500)
    })

    it('should handle connection not found gracefully', async () => {
      const mockWebhook = createMockSlackWebhook()
      const mockUserWithSettings = createMockUserWithSettings()

      mockSlackRepo.findWebhookById.mockResolvedValue(mockResult.success(mockWebhook))
      mockSlackRepo.findUserWithSettings.mockResolvedValue(mockResult.success(mockUserWithSettings))
      mockSlackRepo.getDirectSlackUserId.mockResolvedValue(mockResult.success({ slack_user_id: 'U1234567890' }))
      // Simulate connection not found
      mockSlackRepo.findConnectionById.mockResolvedValue(mockResult.error('Connection not found'))

      const result = await slackService.processWebhookEvent(webhookId, mockPayload)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Slack connection not found')
      expect(result.statusCode).toBe(500)
    })

    it('should handle user with undefined emoji settings property', async () => {
      const mockWebhook = createMockSlackWebhook()
      // User with undefined emoji settings property
      const mockUserWithUndefinedSettings = {
        id: 'user-123',
        email: 'test@example.com',
        slack_user_id: 'U1234567890',
        enable_webhook_notifications: true,
        created_at: '2023-01-01T00:00:00Z'
        // user_emoji_settings is undefined (property doesn't exist)
      }
      const mockConnection = createMockSlackConnection()

      mockSlackRepo.findWebhookById.mockResolvedValue(mockResult.success(mockWebhook))
      mockSlackRepo.findUserWithSettings.mockResolvedValue(mockResult.success(mockUserWithUndefinedSettings))
      mockSlackRepo.getDirectSlackUserId.mockResolvedValue(mockResult.success({ slack_user_id: 'U1234567890' }))
      mockSlackRepo.findConnectionById.mockResolvedValue(mockResult.success(mockConnection))
      mockSlackRepo.findProcessedEvent.mockResolvedValue(mockResult.error('Not found'))

      const result = await slackService.processWebhookEvent(webhookId, mockPayload)

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Event received and queued for processing')
      // Verify it uses default emoji settings when property is undefined
    })

    it('should handle user with non-array emoji settings gracefully', async () => {
      const mockWebhook = createMockSlackWebhook()
      // User with non-array emoji settings (single object instead of array) - cast as any to simulate runtime condition
      const mockUserWithSingleSettings = {
        id: 'user-123',
        email: 'test@example.com',
        slack_user_id: 'U1234567890',
        enable_webhook_notifications: true,
        created_at: '2023-01-01T00:00:00Z',
        user_emoji_settings: {
          today_emoji: 'custom_fire',
          tomorrow_emoji: 'custom_calendar',
          later_emoji: 'custom_memo'
        } as any // Single object instead of array (runtime condition)
      }
      const mockConnection = createMockSlackConnection()

      mockSlackRepo.findWebhookById.mockResolvedValue(mockResult.success(mockWebhook))
      mockSlackRepo.findUserWithSettings.mockResolvedValue(mockResult.success(mockUserWithSingleSettings as any))
      mockSlackRepo.getDirectSlackUserId.mockResolvedValue(mockResult.success({ slack_user_id: 'U1234567890' }))
      mockSlackRepo.findConnectionById.mockResolvedValue(mockResult.success(mockConnection))
      mockSlackRepo.findProcessedEvent.mockResolvedValue(mockResult.error('Not found'))

      const customPayload = {
        ...mockPayload,
        event: {
          ...mockPayload.event,
          reaction: 'custom_fire' // Using custom emoji
        }
      } as SlackEventPayload

      const result = await slackService.processWebhookEvent(webhookId, customPayload)

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Event received and queued for processing')
      // Verify it handles non-array emoji settings correctly
    })
  })
})
