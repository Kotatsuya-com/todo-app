/**
 * SlackService unit tests
 * SlackServiceのユニットテスト
 */

import { SlackService } from '@/lib/services/SlackService'
import { NextRequest } from 'next/server'
import { SlackEventPayload } from '@/types'

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

// Mock repository interfaces directly to avoid Supabase import issues
const createMockSlackRepository = () => ({
  findConnectionById: jest.fn(),
  findConnectionsByUserId: jest.fn(),
  createConnection: jest.fn(),
  deleteConnection: jest.fn(),
  findWebhookById: jest.fn(),
  findWebhooksByUserId: jest.fn(),
  findWebhookByConnectionId: jest.fn(),
  createWebhook: jest.fn(),
  updateWebhook: jest.fn(),
  updateWebhookStats: jest.fn(),
  findProcessedEvent: jest.fn(),
  createProcessedEvent: jest.fn(),
  findUserWithSettings: jest.fn(),
  getAllWebhooks: jest.fn(),
  getDirectSlackUserId: jest.fn()
})

const createMockTodoRepository = () => ({
  findById: jest.fn(),
  findByUserId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createViaRPC: jest.fn(),
  findComparisonsByUserId: jest.fn(),
  createComparison: jest.fn(),
  deleteComparisonsForTodo: jest.fn(),
  createCompletionLog: jest.fn(),
  deleteCompletionLogForTodo: jest.fn(),
  updateImportanceScores: jest.fn()
})

// Result helpers
const mockRepositorySuccess = <T>(data: T) => ({ success: true, data, error: null })
const mockRepositoryListSuccess = <T>(data: T[]) => ({ success: true, data, error: null })
const mockRepositoryError = <T>(message: string) => ({ success: false, data: null, error: new Error(message) })
const mockRepositoryNotFound = <T>() => ({ success: false, data: null, error: new Error('Not found') })

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
  let mockSlackRepo: any
  let mockTodoRepo: any

  beforeEach(() => {
    mockSlackRepo = createMockSlackRepository()
    mockTodoRepo = createMockTodoRepository()
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
        mockRepositoryListSuccess(mockConnections)
      )

      const result = await slackService.getConnections(userId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockConnections)
      expect(mockSlackRepo.findConnectionsByUserId).toHaveBeenCalledWith(userId)
    })

    it('should handle repository error', async () => {
      const userId = 'user-123'
      
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue(
        mockRepositoryError('Database error')
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
        mockRepositorySuccess(undefined)
      )

      const result = await slackService.deleteConnection(connectionId, userId)

      expect(result.success).toBe(true)
      expect(mockSlackRepo.deleteConnection).toHaveBeenCalledWith(connectionId, userId)
    })

    it('should handle repository error', async () => {
      const connectionId = 'conn-123'
      const userId = 'user-123'
      
      mockSlackRepo.deleteConnection.mockResolvedValue(
        mockRepositoryError('Database error')
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
        mockRepositoryListSuccess(mockWebhooks)
      )

      const result = await slackService.getWebhooks(userId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockWebhooks)
      expect(mockSlackRepo.findWebhooksByUserId).toHaveBeenCalledWith(userId)
    })

    it('should handle repository error', async () => {
      const userId = 'user-123'
      
      mockSlackRepo.findWebhooksByUserId.mockResolvedValue(
        mockRepositoryError('Database error')
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

      mockSlackRepo.findConnectionById.mockResolvedValue(mockRepositorySuccess(mockConnection))
      mockSlackRepo.findWebhookByConnectionId.mockResolvedValue(mockRepositoryNotFound())
      mockSlackRepo.createWebhook.mockResolvedValue(mockRepositorySuccess(mockWebhook))

      const result = await slackService.createWebhook(userId, connectionId, mockRequest)

      expect(result.success).toBe(true)
      expect(result.data?.webhook).toEqual(mockWebhook)
      expect(result.data?.webhook_url).toBe(`https://app.example.com/api/slack/events/user/${mockWebhook.webhook_id}`)
      expect(result.data?.message).toBe('Webhook created successfully')
    })

    it('should return error when connection not found', async () => {
      mockSlackRepo.findConnectionById.mockResolvedValue(mockRepositoryNotFound())

      const result = await slackService.createWebhook(userId, connectionId, mockRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Slack connection not found')
      expect(result.statusCode).toBe(404)
    })

    it('should return error when connection belongs to different user', async () => {
      const mockConnection = createMockSlackConnection({ user_id: 'different-user' })
      
      mockSlackRepo.findConnectionById.mockResolvedValue(mockRepositorySuccess(mockConnection))

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

      mockSlackRepo.findWebhookById.mockResolvedValue(mockRepositorySuccess(mockWebhook))
      mockSlackRepo.findUserWithSettings.mockResolvedValue(mockRepositorySuccess(mockUserWithSettings))
      mockSlackRepo.getDirectSlackUserId.mockResolvedValue(mockRepositorySuccess({ slack_user_id: 'U1234567890' }))
      mockSlackRepo.findConnectionById.mockResolvedValue(mockRepositorySuccess(mockConnection))
      mockSlackRepo.findProcessedEvent.mockResolvedValue(mockRepositoryNotFound())

      const result = await slackService.processWebhookEvent(webhookId, mockPayload)

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Event received and queued for processing')
    })

    it('should return error when webhook not found', async () => {
      mockSlackRepo.findWebhookById.mockResolvedValue(mockRepositoryNotFound())

      const result = await slackService.processWebhookEvent(webhookId, mockPayload)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Webhook not found')
      expect(result.statusCode).toBe(404)
    })

    it('should return error when slack user ID not configured', async () => {
      const mockWebhook = createMockSlackWebhook()
      const mockUserWithSettings = createMockUserWithSettings({ slack_user_id: null })
      const mockConnection = createMockSlackConnection()

      mockSlackRepo.findWebhookById.mockResolvedValue(mockRepositorySuccess(mockWebhook))
      mockSlackRepo.findUserWithSettings.mockResolvedValue(mockRepositorySuccess(mockUserWithSettings))
      mockSlackRepo.getDirectSlackUserId.mockResolvedValue(mockRepositorySuccess({ slack_user_id: null }))
      mockSlackRepo.findConnectionById.mockResolvedValue(mockRepositorySuccess(mockConnection))
      mockSlackRepo.findProcessedEvent.mockResolvedValue(mockRepositoryNotFound())

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

      mockSlackRepo.findWebhookById.mockResolvedValue(mockRepositorySuccess(mockWebhook))
      mockSlackRepo.findUserWithSettings.mockResolvedValue(mockRepositorySuccess(mockUserWithSettings))
      mockSlackRepo.getDirectSlackUserId.mockResolvedValue(mockRepositorySuccess({ slack_user_id: 'U1234567890' }))
      mockSlackRepo.findConnectionById.mockResolvedValue(mockRepositorySuccess(mockConnection))
      mockSlackRepo.findProcessedEvent.mockResolvedValue(mockRepositoryNotFound())

      const result = await slackService.processWebhookEvent(webhookId, differentUserPayload)

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Reaction ignored - only the webhook owner can create tasks')
    })

    it('should handle already processed events', async () => {
      const mockWebhook = createMockSlackWebhook()
      const mockUserWithSettings = createMockUserWithSettings()
      const mockConnection = createMockSlackConnection()
      const mockProcessedEvent = createMockSlackEventProcessed({ todo_id: 'existing-todo-123' })

      mockSlackRepo.findWebhookById.mockResolvedValue(mockRepositorySuccess(mockWebhook))
      mockSlackRepo.findUserWithSettings.mockResolvedValue(mockRepositorySuccess(mockUserWithSettings))
      mockSlackRepo.getDirectSlackUserId.mockResolvedValue(mockRepositorySuccess({ slack_user_id: 'U1234567890' }))
      mockSlackRepo.findConnectionById.mockResolvedValue(mockRepositorySuccess(mockConnection))
      mockSlackRepo.findProcessedEvent.mockResolvedValue(mockRepositorySuccess(mockProcessedEvent))

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

      mockSlackRepo.findWebhookById.mockResolvedValue(mockRepositorySuccess(mockWebhook))
      mockSlackRepo.findUserWithSettings.mockResolvedValue(mockRepositorySuccess(mockUserWithSettings))
      mockSlackRepo.getDirectSlackUserId.mockResolvedValue(mockRepositorySuccess({ slack_user_id: 'U1234567890' }))
      mockSlackRepo.findConnectionById.mockResolvedValue(mockRepositorySuccess(mockConnection))
      mockSlackRepo.findProcessedEvent.mockResolvedValue(mockRepositoryNotFound())

      const result = await slackService.processWebhookEvent(webhookId, nonConfiguredEmojiPayload)

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Emoji not configured for task creation')
    })

    it('should handle exceptions gracefully', async () => {
      mockSlackRepo.findWebhookById.mockRejectedValue(new Error('Database connection failed'))

      const result = await slackService.processWebhookEvent(webhookId, mockPayload)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })
  })
})