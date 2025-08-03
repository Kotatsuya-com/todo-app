/**
 * SlackConnection and SlackWebhook Entity unit tests
 */

import { SlackConnectionEntity, SlackWebhookEntity } from '@/lib/entities/SlackConnection'
import {
  createMockSlackConnection,
  createMockSlackConnectionWithInvalidWorkspaceId,
  createMockSlackConnectionWithLimitedScope,
  createMockSlackWebhook,
  createMockInactiveSlackWebhook,
  createMockSlackWebhookWithEvents,
  VALID_SLACK_WORKSPACE_IDS,
  INVALID_SLACK_WORKSPACE_IDS
} from '@/__tests__/fixtures/entities.fixture'
import { setupDateMocks, cleanupDateMocks } from '@/__tests__/helpers/date-helpers.helper'

describe('SlackConnectionEntity', () => {
  describe('constructor and getters', () => {
    it('should create SlackConnectionEntity with correct properties', () => {
      const mockConnection = createMockSlackConnection()
      const connectionEntity = new SlackConnectionEntity(mockConnection)

      expect(connectionEntity.id).toBe(mockConnection.id)
      expect(connectionEntity.userId).toBe(mockConnection.user_id)
      expect(connectionEntity.workspaceId).toBe(mockConnection.workspace_id)
      expect(connectionEntity.accessToken).toBe(mockConnection.access_token)
      expect(connectionEntity.workspaceName).toBe(mockConnection.workspace_name)
      expect(connectionEntity.teamName).toBe(mockConnection.team_name)
    })
  })

  describe('isValidWorkspaceId', () => {
    it('should validate correct Slack Workspace ID formats', () => {
      VALID_SLACK_WORKSPACE_IDS.forEach(workspaceId => {
        const mockConnection = createMockSlackConnection({ workspace_id: workspaceId })
        const connectionEntity = new SlackConnectionEntity(mockConnection)
        
        expect(connectionEntity.isValidWorkspaceId()).toBe(true)
      })
    })

    it('should reject invalid Slack Workspace ID formats', () => {
      INVALID_SLACK_WORKSPACE_IDS.forEach(workspaceId => {
        const mockConnection = createMockSlackConnection({ workspace_id: workspaceId })
        const connectionEntity = new SlackConnectionEntity(mockConnection)
        
        expect(connectionEntity.isValidWorkspaceId()).toBe(false)
      })
    })

    it('should validate edge case: minimum valid length', () => {
      const mockConnection = createMockSlackConnection({ workspace_id: 'T12345678' })
      const connectionEntity = new SlackConnectionEntity(mockConnection)
      
      expect(connectionEntity.isValidWorkspaceId()).toBe(true)
    })
  })

  describe('hasValidScope', () => {
    it('should return true when all required scopes are present', () => {
      const mockConnection = createMockSlackConnection({ 
        scope: 'channels:read,chat:write,reactions:read' 
      })
      const connectionEntity = new SlackConnectionEntity(mockConnection)

      expect(connectionEntity.hasValidScope(['channels:read'])).toBe(true)
      expect(connectionEntity.hasValidScope(['channels:read', 'chat:write'])).toBe(true)
      expect(connectionEntity.hasValidScope(['channels:read', 'chat:write', 'reactions:read'])).toBe(true)
    })

    it('should return false when required scopes are missing', () => {
      const mockConnection = createMockSlackConnectionWithLimitedScope()
      const connectionEntity = new SlackConnectionEntity(mockConnection)

      expect(connectionEntity.hasValidScope(['chat:write'])).toBe(false)
      expect(connectionEntity.hasValidScope(['channels:read', 'chat:write'])).toBe(false)
      expect(connectionEntity.hasValidScope(['reactions:read'])).toBe(false)
    })

    it('should handle empty required scopes array', () => {
      const mockConnection = createMockSlackConnection()
      const connectionEntity = new SlackConnectionEntity(mockConnection)

      expect(connectionEntity.hasValidScope([])).toBe(true)
    })

    it('should handle scopes with whitespace', () => {
      const mockConnection = createMockSlackConnection({ 
        scope: ' channels:read , chat:write , reactions:read ' 
      })
      const connectionEntity = new SlackConnectionEntity(mockConnection)

      expect(connectionEntity.hasValidScope(['channels:read', 'chat:write'])).toBe(true)
    })

    it('should be case sensitive for scope validation', () => {
      const mockConnection = createMockSlackConnection({ 
        scope: 'channels:read,chat:write' 
      })
      const connectionEntity = new SlackConnectionEntity(mockConnection)

      expect(connectionEntity.hasValidScope(['CHANNELS:READ'])).toBe(false)
      expect(connectionEntity.hasValidScope(['channels:READ'])).toBe(false)
    })
  })

  describe('toPlainObject and fromPlainObject', () => {
    it('should convert to plain object correctly', () => {
      const mockConnection = createMockSlackConnection()
      const connectionEntity = new SlackConnectionEntity(mockConnection)
      const plainObject = connectionEntity.toPlainObject()

      expect(plainObject).toEqual(mockConnection)
      expect(plainObject).not.toBe(mockConnection)
    })

    it('should create entity from plain object correctly', () => {
      const mockConnection = createMockSlackConnection()
      const connectionEntity = SlackConnectionEntity.fromPlainObject(mockConnection)

      expect(connectionEntity).toBeInstanceOf(SlackConnectionEntity)
      expect(connectionEntity.id).toBe(mockConnection.id)
      expect(connectionEntity.workspaceId).toBe(mockConnection.workspace_id)
    })
  })
})

describe('SlackWebhookEntity', () => {
  beforeEach(() => {
    setupDateMocks('2023-01-15T12:00:00Z')
  })

  afterEach(() => {
    cleanupDateMocks()
  })

  describe('constructor and getters', () => {
    it('should create SlackWebhookEntity with correct properties', () => {
      const mockWebhook = createMockSlackWebhook()
      const webhookEntity = new SlackWebhookEntity(mockWebhook)

      expect(webhookEntity.id).toBe(mockWebhook.id)
      expect(webhookEntity.userId).toBe(mockWebhook.user_id)
      expect(webhookEntity.webhookId).toBe(mockWebhook.webhook_id)
      expect(webhookEntity.webhookSecret).toBe(mockWebhook.webhook_secret)
      expect(webhookEntity.isActive).toBe(mockWebhook.is_active)
      expect(webhookEntity.eventCount).toBe(mockWebhook.event_count)
    })
  })

  describe('incrementEventCount', () => {
    it('should create new entity with incremented event count', () => {
      const mockWebhook = createMockSlackWebhook()
      const webhookEntity = new SlackWebhookEntity(mockWebhook)
      const incrementedEntity = webhookEntity.incrementEventCount()

      expect(incrementedEntity).toBeInstanceOf(SlackWebhookEntity)
      expect(incrementedEntity).not.toBe(webhookEntity)
      expect(incrementedEntity.eventCount).toBe(1)
      expect(incrementedEntity.toPlainObject().last_event_at).toBe('2023-01-15T12:00:00.000Z')
      expect(incrementedEntity.toPlainObject().updated_at).toBe('2023-01-15T12:00:00.000Z')
    })

    it('should preserve original entity immutability', () => {
      const mockWebhook = createMockSlackWebhook()
      const webhookEntity = new SlackWebhookEntity(mockWebhook)
      const originalEventCount = webhookEntity.eventCount

      webhookEntity.incrementEventCount()

      expect(webhookEntity.eventCount).toBe(originalEventCount)
    })

    it('should increment from existing event count', () => {
      const mockWebhook = createMockSlackWebhookWithEvents(5)
      const webhookEntity = new SlackWebhookEntity(mockWebhook)
      const incrementedEntity = webhookEntity.incrementEventCount()

      expect(incrementedEntity.eventCount).toBe(6)
    })
  })

  describe('activate', () => {
    it('should create new entity with is_active set to true', () => {
      const mockWebhook = createMockInactiveSlackWebhook()
      const webhookEntity = new SlackWebhookEntity(mockWebhook)
      const activatedEntity = webhookEntity.activate()

      expect(activatedEntity).toBeInstanceOf(SlackWebhookEntity)
      expect(activatedEntity).not.toBe(webhookEntity)
      expect(activatedEntity.isActive).toBe(true)
      expect(activatedEntity.toPlainObject().updated_at).toBe('2023-01-15T12:00:00.000Z')
    })

    it('should preserve original entity immutability', () => {
      const mockWebhook = createMockInactiveSlackWebhook()
      const webhookEntity = new SlackWebhookEntity(mockWebhook)

      webhookEntity.activate()

      expect(webhookEntity.isActive).toBe(false)
    })

    it('should work on already active webhook', () => {
      const mockWebhook = createMockSlackWebhook()
      const webhookEntity = new SlackWebhookEntity(mockWebhook)
      const activatedEntity = webhookEntity.activate()

      expect(activatedEntity.isActive).toBe(true)
    })
  })

  describe('deactivate', () => {
    it('should create new entity with is_active set to false', () => {
      const mockWebhook = createMockSlackWebhook()
      const webhookEntity = new SlackWebhookEntity(mockWebhook)
      const deactivatedEntity = webhookEntity.deactivate()

      expect(deactivatedEntity).toBeInstanceOf(SlackWebhookEntity)
      expect(deactivatedEntity).not.toBe(webhookEntity)
      expect(deactivatedEntity.isActive).toBe(false)
      expect(deactivatedEntity.toPlainObject().updated_at).toBe('2023-01-15T12:00:00.000Z')
    })

    it('should preserve original entity immutability', () => {
      const mockWebhook = createMockSlackWebhook()
      const webhookEntity = new SlackWebhookEntity(mockWebhook)

      webhookEntity.deactivate()

      expect(webhookEntity.isActive).toBe(true)
    })

    it('should work on already inactive webhook', () => {
      const mockWebhook = createMockInactiveSlackWebhook()
      const webhookEntity = new SlackWebhookEntity(mockWebhook)
      const deactivatedEntity = webhookEntity.deactivate()

      expect(deactivatedEntity.isActive).toBe(false)
    })
  })

  describe('generateEventKey', () => {
    it('should generate correct event key format', () => {
      const mockWebhook = createMockSlackWebhook()
      const webhookEntity = new SlackWebhookEntity(mockWebhook)

      const eventKey = webhookEntity.generateEventKey(
        'C1234567890',
        '1234567890.123456',
        'fire',
        'U1234567890'
      )

      expect(eventKey).toBe('C1234567890:1234567890.123456:fire:U1234567890')
    })

    it('should handle special characters in parameters', () => {
      const mockWebhook = createMockSlackWebhook()
      const webhookEntity = new SlackWebhookEntity(mockWebhook)

      const eventKey = webhookEntity.generateEventKey(
        'C-test',
        '123.456',
        'thumbs_up',
        'U-user'
      )

      expect(eventKey).toBe('C-test:123.456:thumbs_up:U-user')
    })

    it('should handle empty parameters', () => {
      const mockWebhook = createMockSlackWebhook()
      const webhookEntity = new SlackWebhookEntity(mockWebhook)

      const eventKey = webhookEntity.generateEventKey('', '', '', '')

      expect(eventKey).toBe(':::')
    })
  })

  describe('toPlainObject and fromPlainObject', () => {
    it('should convert to plain object correctly', () => {
      const mockWebhook = createMockSlackWebhook()
      const webhookEntity = new SlackWebhookEntity(mockWebhook)
      const plainObject = webhookEntity.toPlainObject()

      expect(plainObject).toEqual(mockWebhook)
      expect(plainObject).not.toBe(mockWebhook)
    })

    it('should create entity from plain object correctly', () => {
      const mockWebhook = createMockSlackWebhook()
      const webhookEntity = SlackWebhookEntity.fromPlainObject(mockWebhook)

      expect(webhookEntity).toBeInstanceOf(SlackWebhookEntity)
      expect(webhookEntity.id).toBe(mockWebhook.id)
      expect(webhookEntity.webhookId).toBe(mockWebhook.webhook_id)
      expect(webhookEntity.isActive).toBe(mockWebhook.is_active)
    })
  })

  describe('immutability and state changes', () => {
    it('should not modify original webhook when performing state changes', () => {
      const mockWebhook = createMockSlackWebhook()
      const originalWebhook = { ...mockWebhook }
      const webhookEntity = new SlackWebhookEntity(mockWebhook)

      webhookEntity.incrementEventCount()
      webhookEntity.activate()
      webhookEntity.deactivate()

      expect(mockWebhook).toEqual(originalWebhook)
    })

    it('should chain state changes correctly', () => {
      const mockWebhook = createMockInactiveSlackWebhook()
      const webhookEntity = new SlackWebhookEntity(mockWebhook)

      const result = webhookEntity
        .activate()
        .incrementEventCount()
        .incrementEventCount()

      expect(result.isActive).toBe(true)
      expect(result.eventCount).toBe(2)
    })
  })

  describe('edge cases', () => {
    it('should handle very large event counts', () => {
      const mockWebhook = createMockSlackWebhook({ event_count: 999999 })
      const webhookEntity = new SlackWebhookEntity(mockWebhook)
      const incrementedEntity = webhookEntity.incrementEventCount()

      expect(incrementedEntity.eventCount).toBe(1000000)
    })

    it('should handle webhook with null last_event_at', () => {
      const mockWebhook = createMockSlackWebhook({ last_event_at: null })
      const webhookEntity = new SlackWebhookEntity(mockWebhook)
      const incrementedEntity = webhookEntity.incrementEventCount()

      expect(incrementedEntity.toPlainObject().last_event_at).toBe('2023-01-15T12:00:00.000Z')
    })
  })
})