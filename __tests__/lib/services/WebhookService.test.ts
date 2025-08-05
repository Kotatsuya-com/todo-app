/**
 * @jest-environment jsdom
 */

import { WebhookService } from '@/lib/services/WebhookService'
import { SlackRepositoryInterface } from '@/lib/repositories/SlackRepository'
import { RepositoryResult, RepositoryListResult } from '@/lib/repositories/BaseRepository'
import { SlackConnection, SlackWebhook } from '@/lib/entities/SlackConnection'
import {
  createMockSlackConnection,
  createMockSlackWebhook,
  createMockInactiveSlackWebhook,
  createMockSlackWebhookWithEvents
} from '@/__tests__/fixtures/entities.fixture'

describe('WebhookService', () => {
  let service: WebhookService
  let mockSlackRepo: jest.Mocked<SlackRepositoryInterface>

  beforeEach(() => {
    mockSlackRepo = {
      // Connection methods
      findConnectionById: jest.fn(),
      findConnectionsByUserId: jest.fn(),
      createConnection: jest.fn(),
      upsertConnection: jest.fn(),
      deleteConnection: jest.fn(),

      // User methods
      updateUserSlackId: jest.fn(),

      // Webhook methods
      findWebhookById: jest.fn(),
      findWebhooksByUserId: jest.fn(),
      findWebhookByConnectionId: jest.fn(),
      createWebhook: jest.fn(),
      updateWebhook: jest.fn(),
      updateWebhookStats: jest.fn(),

      // Event processing methods
      findProcessedEvent: jest.fn(),
      createProcessedEvent: jest.fn(),

      // User data methods
      findUserWithSettings: jest.fn(),
      getDirectSlackUserId: jest.fn()
    }

    service = new WebhookService(mockSlackRepo)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserWebhooks', () => {
    it('should successfully return user webhooks', async () => {
      const mockWebhooks = [
        createMockSlackWebhook(),
        createMockSlackWebhookWithEvents(3),
        createMockInactiveSlackWebhook()
      ]
      
      mockSlackRepo.findWebhooksByUserId.mockResolvedValue({
        success: true,
        data: mockWebhooks
      })

      const result = await service.getUserWebhooks('user-123')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.webhooks).toEqual(mockWebhooks)
      expect(mockSlackRepo.findWebhooksByUserId).toHaveBeenCalledWith('user-123')
    })

    it('should return empty array when no webhooks found', async () => {
      mockSlackRepo.findWebhooksByUserId.mockResolvedValue({
        success: true,
        data: []
      })

      const result = await service.getUserWebhooks('user-123')

      expect(result.success).toBe(true)
      expect(result.data!.webhooks).toEqual([])
    })

    it('should handle repository error', async () => {
      mockSlackRepo.findWebhooksByUserId.mockResolvedValue({
        success: false,
        error: { message: 'Database error', code: 'DB_ERROR' }
      })

      const result = await service.getUserWebhooks('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toEqual({ message: 'Database error', code: 'DB_ERROR' })
      expect(result.statusCode).toBe(500)
    })

    it('should handle service exception', async () => {
      mockSlackRepo.findWebhooksByUserId.mockRejectedValue(new Error('Network error'))

      const result = await service.getUserWebhooks('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('createUserWebhook', () => {
    const mockConnection = createMockSlackConnection()
    const mockParams = {
      userId: 'user-123',
      slackConnectionId: 'slack-conn-123',
      appBaseUrl: 'https://example.com'
    }

    it('should create new webhook successfully', async () => {
      const mockNewWebhook = createMockSlackWebhook()

      mockSlackRepo.findConnectionById.mockResolvedValue({
        success: true,
        data: mockConnection
      })

      mockSlackRepo.findWebhookByConnectionId.mockResolvedValue({
        success: false,
        error: { message: 'Not found', code: 'NOT_FOUND' }
      })

      mockSlackRepo.createWebhook.mockResolvedValue({
        success: true,
        data: mockNewWebhook
      })

      const result = await service.createUserWebhook(mockParams)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.webhook).toEqual(mockNewWebhook)
      expect(result.data!.webhook_url).toBe(`${mockParams.appBaseUrl}/api/slack/events/user/${mockNewWebhook.webhook_id}`)
      expect(result.data!.message).toBe('Webhook created successfully')
      expect(result.statusCode).toBe(201)
    })

    it('should reactivate existing webhook', async () => {
      const mockExistingWebhook = createMockInactiveSlackWebhook()
      const mockUpdatedWebhook = createMockSlackWebhook()

      mockSlackRepo.findConnectionById.mockResolvedValue({
        success: true,
        data: mockConnection
      })

      mockSlackRepo.findWebhookByConnectionId.mockResolvedValue({
        success: true,
        data: mockExistingWebhook
      })

      mockSlackRepo.updateWebhook.mockResolvedValue({
        success: true,
        data: mockUpdatedWebhook
      })

      const result = await service.createUserWebhook(mockParams)

      expect(result.success).toBe(true)
      expect(result.data!.message).toBe('Webhook reactivated successfully')
      expect(mockSlackRepo.updateWebhook).toHaveBeenCalledWith(
        mockExistingWebhook.id,
        { is_active: true }
      )
    })

    it('should return error when Slack connection not found', async () => {
      mockSlackRepo.findConnectionById.mockResolvedValue({
        success: false,
        error: { message: 'Not found', code: 'NOT_FOUND' }
      })

      const result = await service.createUserWebhook(mockParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Slack connection not found')
      expect(result.statusCode).toBe(404)
    })

    it('should return error when user does not own connection', async () => {
      const mockConnectionDifferentUser = createMockSlackConnection({ user_id: 'different-user' })

      mockSlackRepo.findConnectionById.mockResolvedValue({
        success: true,
        data: mockConnectionDifferentUser
      })

      const result = await service.createUserWebhook(mockParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized access to Slack connection')
      expect(result.statusCode).toBe(403)
    })

    it('should handle error when webhook creation fails', async () => {
      mockSlackRepo.findConnectionById.mockResolvedValue({
        success: true,
        data: mockConnection
      })

      mockSlackRepo.findWebhookByConnectionId.mockResolvedValue({
        success: false,
        error: { message: 'Not found', code: 'NOT_FOUND' }
      })

      mockSlackRepo.createWebhook.mockResolvedValue({
        success: false,
        error: { message: 'Creation failed', code: 'CREATION_ERROR' }
      })

      const result = await service.createUserWebhook(mockParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create webhook')
      expect(result.statusCode).toBe(500)
    })

    it('should handle error when webhook reactivation fails', async () => {
      const mockExistingWebhook = createMockInactiveSlackWebhook()

      mockSlackRepo.findConnectionById.mockResolvedValue({
        success: true,
        data: mockConnection
      })

      mockSlackRepo.findWebhookByConnectionId.mockResolvedValue({
        success: true,
        data: mockExistingWebhook
      })

      mockSlackRepo.updateWebhook.mockResolvedValue({
        success: false,
        error: { message: 'Update failed', code: 'UPDATE_ERROR' }
      })

      const result = await service.createUserWebhook(mockParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to reactivate webhook')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service exception', async () => {
      mockSlackRepo.findConnectionById.mockRejectedValue(new Error('Network error'))

      const result = await service.createUserWebhook(mockParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('deactivateWebhook', () => {
    it('should successfully deactivate webhook', async () => {
      const mockWebhooks = [
        createMockSlackWebhook({ id: 'webhook-123' }),
        createMockSlackWebhook({ id: 'webhook-456' })
      ]

      mockSlackRepo.findWebhooksByUserId.mockResolvedValue({
        success: true,
        data: mockWebhooks
      })

      mockSlackRepo.updateWebhook.mockResolvedValue({
        success: true,
        data: createMockInactiveSlackWebhook()
      })

      const result = await service.deactivateWebhook('webhook-123', 'user-123')

      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
      expect(mockSlackRepo.updateWebhook).toHaveBeenCalledWith('webhook-123', { is_active: false })
    })

    it('should return error when webhook not found', async () => {
      const mockWebhooks = [
        createMockSlackWebhook({ id: 'webhook-456' })
      ]

      mockSlackRepo.findWebhooksByUserId.mockResolvedValue({
        success: true,
        data: mockWebhooks
      })

      const result = await service.deactivateWebhook('webhook-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Webhook not found or access denied')
      expect(result.statusCode).toBe(404)
      expect(mockSlackRepo.updateWebhook).not.toHaveBeenCalled()
    })

    it('should return error when user has no webhooks', async () => {
      mockSlackRepo.findWebhooksByUserId.mockResolvedValue({
        success: true,
        data: []
      })

      const result = await service.deactivateWebhook('webhook-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Webhook not found or access denied')
      expect(result.statusCode).toBe(404)
    })

    it('should handle error when fetching user webhooks fails', async () => {
      mockSlackRepo.findWebhooksByUserId.mockResolvedValue({
        success: false,
        error: { message: 'Database error', code: 'DB_ERROR' }
      })

      const result = await service.deactivateWebhook('webhook-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch user webhooks')
      expect(result.statusCode).toBe(500)
    })

    it('should handle error when webhook update fails', async () => {
      const mockWebhooks = [
        createMockSlackWebhook({ id: 'webhook-123' })
      ]

      mockSlackRepo.findWebhooksByUserId.mockResolvedValue({
        success: true,
        data: mockWebhooks
      })

      mockSlackRepo.updateWebhook.mockResolvedValue({
        success: false,
        error: { message: 'Update failed', code: 'UPDATE_ERROR' }
      })

      const result = await service.deactivateWebhook('webhook-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to deactivate webhook')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service exception', async () => {
      mockSlackRepo.findWebhooksByUserId.mockRejectedValue(new Error('Network error'))

      const result = await service.deactivateWebhook('webhook-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('edge cases and input validation', () => {
    it('should handle empty userId in getUserWebhooks', async () => {
      mockSlackRepo.findWebhooksByUserId.mockResolvedValue({
        success: true,
        data: []
      })

      const result = await service.getUserWebhooks('')

      expect(result.success).toBe(true)
      expect(result.data!.webhooks).toEqual([])
      expect(mockSlackRepo.findWebhooksByUserId).toHaveBeenCalledWith('')
    })

    it('should handle empty webhookId in deactivateWebhook', async () => {
      mockSlackRepo.findWebhooksByUserId.mockResolvedValue({
        success: true,
        data: [createMockSlackWebhook()]
      })

      const result = await service.deactivateWebhook('', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Webhook not found or access denied')
      expect(result.statusCode).toBe(404)
    })

    it('should handle special characters in webhook URLs', async () => {
      const mockConnection = createMockSlackConnection()
      const mockNewWebhook = createMockSlackWebhook({ webhook_id: 'webhook-with-special-chars-123' })
      const mockParams = {
        userId: 'user-123',
        slackConnectionId: 'slack-conn-123',
        appBaseUrl: 'https://example.com:8080/app'
      }

      mockSlackRepo.findConnectionById.mockResolvedValue({
        success: true,
        data: mockConnection
      })

      mockSlackRepo.findWebhookByConnectionId.mockResolvedValue({
        success: false,
        error: { message: 'Not found', code: 'NOT_FOUND' }
      })

      mockSlackRepo.createWebhook.mockResolvedValue({
        success: true,
        data: mockNewWebhook
      })

      const result = await service.createUserWebhook(mockParams)

      expect(result.success).toBe(true)
      expect(result.data!.webhook_url).toBe(`${mockParams.appBaseUrl}/api/slack/events/user/${mockNewWebhook.webhook_id}`)
    })
  })
})