/**
 * @jest-environment jsdom
 */

import { SlackConnectionEntity, SlackWebhookEntity } from '@/lib/entities/SlackConnection'
import {
  createMockSlackConnection,
  createMockSlackConnectionRecent,
  createMockSlackConnectionOld,
  createMockSlackConnectionInvalidWorkspace,
  createMockSlackConnectionMinimalScope,
  createMockSlackConnectionFullScope,
  createMockSlackConnectionDifferentUser,
  EDGE_CASE_USER_IDS,
  EDGE_CASE_WORKSPACE_IDS,
  VALID_SCOPE_COMBINATIONS,
  INVALID_SCOPE_COMBINATIONS
} from '@/__tests__/fixtures/slack-connection.fixture'

describe('SlackConnectionEntity', () => {
  describe('constructor and getters', () => {
    it('should create SlackConnectionEntity with correct properties', () => {
      const mockConnection = createMockSlackConnection()
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.id).toBe(mockConnection.id)
      expect(entity.userId).toBe(mockConnection.user_id)
      expect(entity.workspaceId).toBe(mockConnection.workspace_id)
      expect(entity.accessToken).toBe(mockConnection.access_token)
      expect(entity.workspaceName).toBe(mockConnection.workspace_name)
      expect(entity.teamName).toBe(mockConnection.team_name)
      expect(entity.createdAt).toBe(mockConnection.created_at)
      expect(entity.scope).toBe(mockConnection.scope)
    })

    it('should expose all required getters', () => {
      const mockConnection = createMockSlackConnection()
      const entity = new SlackConnectionEntity(mockConnection)

      expect(typeof entity.id).toBe('string')
      expect(typeof entity.userId).toBe('string')
      expect(typeof entity.workspaceId).toBe('string')
      expect(typeof entity.accessToken).toBe('string')
      expect(typeof entity.workspaceName).toBe('string')
      expect(typeof entity.teamName).toBe('string')
      expect(typeof entity.createdAt).toBe('string')
      expect(typeof entity.scope).toBe('string')
    })
  })

  describe('isValidWorkspaceId', () => {
    it('should validate correct Slack workspace ID formats', () => {
      const validIds = ['T1234567890', 'T123456789', 'T123456789ABC', 'TAAAAAAAAAAA']
      
      validIds.forEach(workspaceId => {
        const mockConnection = createMockSlackConnection({ workspace_id: workspaceId })
        const entity = new SlackConnectionEntity(mockConnection)
        
        expect(entity.isValidWorkspaceId()).toBe(true)
      })
    })

    it('should reject invalid Slack workspace ID formats', () => {
      EDGE_CASE_WORKSPACE_IDS.filter(id => 
        !id.match(/^T[A-Z0-9]{8,}$/)
      ).forEach(workspaceId => {
        const mockConnection = createMockSlackConnection({ workspace_id: workspaceId })
        const entity = new SlackConnectionEntity(mockConnection)
        
        expect(entity.isValidWorkspaceId()).toBe(false)
      })
    })

    it('should validate edge cases', () => {
      // Minimum valid length
      const entity1 = new SlackConnectionEntity(createMockSlackConnection({ workspace_id: 'T12345678' }))
      expect(entity1.isValidWorkspaceId()).toBe(true)
      
      // Too short
      const entity2 = new SlackConnectionEntity(createMockSlackConnection({ workspace_id: 'T123' }))
      expect(entity2.isValidWorkspaceId()).toBe(false)
      
      // Wrong prefix
      const entity3 = new SlackConnectionEntity(createMockSlackConnection({ workspace_id: 'A1234567890' }))
      expect(entity3.isValidWorkspaceId()).toBe(false)
      
      // Empty
      const entity4 = new SlackConnectionEntity(createMockSlackConnection({ workspace_id: '' }))
      expect(entity4.isValidWorkspaceId()).toBe(false)
    })
  })

  describe('hasValidScope', () => {
    it('should return true when all required scopes are present', () => {
      const mockConnection = createMockSlackConnectionFullScope()
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.hasValidScope(['channels:read'])).toBe(true)
      expect(entity.hasValidScope(['channels:read', 'chat:write'])).toBe(true)
      expect(entity.hasValidScope(['channels:read', 'chat:write', 'users:read'])).toBe(true)
      expect(entity.hasValidScope(['reactions:read', 'reactions:write'])).toBe(true)
    })

    it('should return false when required scopes are missing', () => {
      const mockConnection = createMockSlackConnectionMinimalScope()
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.hasValidScope(['chat:write'])).toBe(false)
      expect(entity.hasValidScope(['channels:read', 'chat:write'])).toBe(false)
      expect(entity.hasValidScope(['reactions:read'])).toBe(false)
      expect(entity.hasValidScope(['users:read'])).toBe(false)
    })

    it('should handle empty required scopes array', () => {
      const mockConnection = createMockSlackConnection()
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.hasValidScope([])).toBe(true)
    })

    it('should handle scopes with whitespace correctly', () => {
      const mockConnection = createMockSlackConnection({ 
        scope: ' channels:read , chat:write , reactions:read ' 
      })
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.hasValidScope(['channels:read', 'chat:write'])).toBe(true)
      expect(entity.hasValidScope(['reactions:read'])).toBe(true)
    })

    it('should be case sensitive for scope validation', () => {
      const mockConnection = createMockSlackConnection({ 
        scope: 'channels:read,chat:write' 
      })
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.hasValidScope(['CHANNELS:READ'])).toBe(false)
      expect(entity.hasValidScope(['Channels:Read'])).toBe(false)
    })

    it('should validate all scope combinations', () => {
      VALID_SCOPE_COMBINATIONS.forEach(scopeString => {
        const mockConnection = createMockSlackConnection({ scope: scopeString })
        const entity = new SlackConnectionEntity(mockConnection)
        const scopes = scopeString.split(',').map(s => s.trim())
        
        expect(entity.hasValidScope(scopes)).toBe(true)
      })
    })
  })

  describe('isOwnedBy', () => {
    it('should return true when user IDs match', () => {
      const mockConnection = createMockSlackConnection()
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.isOwnedBy(mockConnection.user_id)).toBe(true)
    })

    it('should return false when user IDs do not match', () => {
      const mockConnection = createMockSlackConnection()
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.isOwnedBy('different-user-id')).toBe(false)
      expect(entity.isOwnedBy('')).toBe(false)
      expect(entity.isOwnedBy('DIFFERENT-USER-ID')).toBe(false)
    })

    it('should handle edge case user IDs', () => {
      EDGE_CASE_USER_IDS.forEach(userId => {
        const mockConnection = createMockSlackConnection({ user_id: userId })
        const entity = new SlackConnectionEntity(mockConnection)

        expect(entity.isOwnedBy(userId)).toBe(true)
        expect(entity.isOwnedBy(`different-${userId}`)).toBe(false)
      })
    })

    it('should work with different user connection fixture', () => {
      const mockConnection = createMockSlackConnectionDifferentUser()
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.isOwnedBy('user-123')).toBe(false)
      expect(entity.isOwnedBy(mockConnection.user_id)).toBe(true)
    })
  })

  describe('isRecentlyCreated', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2023-01-15T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return true for connections created within 24 hours', () => {
      const recentConnection = createMockSlackConnectionRecent()
      const entity = new SlackConnectionEntity(recentConnection)

      expect(entity.isRecentlyCreated()).toBe(true)
    })

    it('should return false for connections created more than 24 hours ago', () => {
      const oldConnection = createMockSlackConnectionOld()
      const entity = new SlackConnectionEntity(oldConnection)

      expect(entity.isRecentlyCreated()).toBe(false)
    })

    it('should handle edge case: exactly 24 hours ago', () => {
      const exactlyOneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const mockConnection = createMockSlackConnection({ created_at: exactlyOneDayAgo })
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.isRecentlyCreated()).toBe(false)
    })

    it('should handle edge case: 23 hours 59 minutes ago', () => {
      const almostOneDayAgo = new Date(Date.now() - (24 * 60 * 60 * 1000 - 60 * 1000)).toISOString()
      const mockConnection = createMockSlackConnection({ created_at: almostOneDayAgo })
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.isRecentlyCreated()).toBe(true)
    })
  })

  describe('getAgeInDays', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2023-01-15T12:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should calculate age correctly for recent connections', () => {
      const recentConnection = createMockSlackConnectionRecent()
      const entity = new SlackConnectionEntity(recentConnection)

      expect(entity.getAgeInDays()).toBe(0) // Created now, so 0 days old
    })

    it('should calculate age correctly for old connections', () => {
      const oldConnection = createMockSlackConnectionOld()
      const entity = new SlackConnectionEntity(oldConnection)

      // From 2022-01-01 to 2023-01-15 = 380 days (using ceil)
      expect(entity.getAgeInDays()).toBe(380)
    })

    it('should handle connections created today', () => {
      const todayConnection = createMockSlackConnection({ 
        created_at: new Date().toISOString() 
      })
      const entity = new SlackConnectionEntity(todayConnection)

      expect(entity.getAgeInDays()).toBe(0) // Created now, so 0 days old
    })

    it('should round up partial days', () => {
      const halfDayAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      const mockConnection = createMockSlackConnection({ created_at: halfDayAgo })
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.getAgeInDays()).toBe(1)
    })
  })

  describe('getDisplaySummary', () => {
    it('should return correct display summary for valid connection', () => {
      const mockConnection = createMockSlackConnection()
      const entity = new SlackConnectionEntity(mockConnection)

      const summary = entity.getDisplaySummary()

      expect(summary.displayName).toBe(`${mockConnection.workspace_name} (${mockConnection.team_name})`)
      expect(summary.workspaceName).toBe(mockConnection.workspace_name)
      expect(summary.teamName).toBe(mockConnection.team_name)
      expect(typeof summary.ageInDays).toBe('number')
      expect(summary.isValid).toBe(true)
    })

    it('should return correct display summary for invalid workspace', () => {
      const mockConnection = createMockSlackConnectionInvalidWorkspace()
      const entity = new SlackConnectionEntity(mockConnection)

      const summary = entity.getDisplaySummary()

      expect(summary.displayName).toBe(`${mockConnection.workspace_name} (${mockConnection.team_name})`)
      expect(summary.isValid).toBe(false)
    })

    it('should handle special characters in workspace and team names', () => {
      const mockConnection = createMockSlackConnection({
        workspace_name: 'Test & Co. Workspace',
        team_name: 'Team "Alpha" Beta'
      })
      const entity = new SlackConnectionEntity(mockConnection)

      const summary = entity.getDisplaySummary()

      expect(summary.displayName).toBe('Test & Co. Workspace (Team "Alpha" Beta)')
      expect(summary.workspaceName).toBe('Test & Co. Workspace')
      expect(summary.teamName).toBe('Team "Alpha" Beta')
    })
  })

  describe('hasBasicSlackScopes', () => {
    it('should return true when both basic scopes are present', () => {
      const mockConnection = createMockSlackConnection({
        scope: 'channels:read,chat:write,users:read'
      })
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.hasBasicSlackScopes()).toBe(true)
    })

    it('should return false when basic scopes are missing', () => {
      const mockConnection = createMockSlackConnectionMinimalScope()
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.hasBasicSlackScopes()).toBe(false)
    })

    it('should return false when only one basic scope is present', () => {
      const mockConnection = createMockSlackConnection({
        scope: 'channels:read,users:read'
      })
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.hasBasicSlackScopes()).toBe(false)
    })

    it('should return true for full scope connection', () => {
      const mockConnection = createMockSlackConnectionFullScope()
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.hasBasicSlackScopes()).toBe(true)
    })
  })

  describe('toPlainObject and fromPlainObject', () => {
    it('should convert to plain object correctly', () => {
      const mockConnection = createMockSlackConnection()
      const entity = new SlackConnectionEntity(mockConnection)
      const plainObject = entity.toPlainObject()

      expect(plainObject).toEqual(mockConnection)
      expect(plainObject).not.toBe(mockConnection) // Different object reference
    })

    it('should create entity from plain object correctly', () => {
      const mockConnection = createMockSlackConnection()
      const entity = SlackConnectionEntity.fromPlainObject(mockConnection)

      expect(entity).toBeInstanceOf(SlackConnectionEntity)
      expect(entity.id).toBe(mockConnection.id)
      expect(entity.workspaceId).toBe(mockConnection.workspace_id)
      expect(entity.userId).toBe(mockConnection.user_id)
    })

    it('should maintain immutability through conversion cycle', () => {
      const mockConnection = createMockSlackConnection()
      const originalData = { ...mockConnection }
      
      const entity = SlackConnectionEntity.fromPlainObject(mockConnection)
      const converted = entity.toPlainObject()
      
      expect(converted).toEqual(originalData)
      expect(mockConnection).toEqual(originalData) // Original unchanged
    })
  })

  describe('immutability', () => {
    it('should not allow modification of internal connection data', () => {
      const mockConnection = createMockSlackConnection()
      const originalData = { ...mockConnection }
      const entity = new SlackConnectionEntity(mockConnection)

      // Attempt to modify returned plain object
      const plainObject = entity.toPlainObject()
      plainObject.workspace_name = 'Modified Name'

      // Original entity should be unchanged
      expect(entity.workspaceName).toBe(originalData.workspace_name)
      expect(entity.toPlainObject()).toEqual(originalData)
    })

    it('should not be affected by modifications to source object', () => {
      const mockConnection = createMockSlackConnection()
      const originalWorkspaceName = mockConnection.workspace_name
      const entity = new SlackConnectionEntity({ ...mockConnection }) // Create copy for entity

      // Modify source object
      mockConnection.workspace_name = 'Modified Name'

      // Entity should retain original values
      expect(entity.workspaceName).toBe(originalWorkspaceName)
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle empty scope string', () => {
      const mockConnection = createMockSlackConnection({ scope: '' })
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.hasValidScope(['channels:read'])).toBe(false)
      expect(entity.hasBasicSlackScopes()).toBe(false)
      expect(entity.scope).toBe('')
    })

    it('should handle malformed dates gracefully', () => {
      const mockConnection = createMockSlackConnection({ created_at: 'invalid-date' })
      const entity = new SlackConnectionEntity(mockConnection)

      // Should not throw, but return NaN for age calculation
      expect(() => entity.getAgeInDays()).not.toThrow()
      expect(() => entity.isRecentlyCreated()).not.toThrow()
    })

    it('should handle extremely long strings', () => {
      const longString = 'a'.repeat(10000)
      const mockConnection = createMockSlackConnection({
        workspace_name: longString,
        team_name: longString
      })
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.workspaceName).toBe(longString)
      expect(entity.teamName).toBe(longString)
      expect(entity.getDisplaySummary().displayName).toBe(`${longString} (${longString})`)
    })

    it('should handle special unicode characters', () => {
      const mockConnection = createMockSlackConnection({
        workspace_name: '🚀 Unicode Workspace 日本語',
        team_name: '✨ Team Émojis'
      })
      const entity = new SlackConnectionEntity(mockConnection)

      expect(entity.workspaceName).toBe('🚀 Unicode Workspace 日本語')
      expect(entity.teamName).toBe('✨ Team Émojis')
      expect(entity.getDisplaySummary().displayName).toBe('🚀 Unicode Workspace 日本語 (✨ Team Émojis)')
    })
  })
})

describe('SlackWebhookEntity', () => {
  // Mock webhook data for tests
  const createMockWebhook = (overrides = {}) => ({
    id: 'webhook-test-id',
    user_id: 'user-123',
    slack_connection_id: 'slack-connection-id',
    webhook_id: 'test-webhook-id',
    webhook_secret: 'test-webhook-secret',
    is_active: true,
    last_event_at: null,
    event_count: 0,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...overrides
  })

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2023-01-15T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('constructor and getters', () => {
    it('should create SlackWebhookEntity with correct properties', () => {
      const mockWebhook = createMockWebhook()
      const entity = new SlackWebhookEntity(mockWebhook)

      expect(entity.id).toBe(mockWebhook.id)
      expect(entity.userId).toBe(mockWebhook.user_id)
      expect(entity.webhookId).toBe(mockWebhook.webhook_id)
      expect(entity.webhookSecret).toBe(mockWebhook.webhook_secret)
      expect(entity.isActive).toBe(mockWebhook.is_active)
      expect(entity.eventCount).toBe(mockWebhook.event_count)
    })
  })

  describe('incrementEventCount', () => {
    it('should create new entity with incremented event count', () => {
      const mockWebhook = createMockWebhook()
      const entity = new SlackWebhookEntity(mockWebhook)
      const incremented = entity.incrementEventCount()

      expect(incremented).toBeInstanceOf(SlackWebhookEntity)
      expect(incremented).not.toBe(entity)
      expect(incremented.eventCount).toBe(1)
      expect(incremented.toPlainObject().last_event_at).toBe('2023-01-15T12:00:00.000Z')
      expect(incremented.toPlainObject().updated_at).toBe('2023-01-15T12:00:00.000Z')
    })

    it('should preserve original entity immutability', () => {
      const mockWebhook = createMockWebhook()
      const entity = new SlackWebhookEntity(mockWebhook)
      const originalCount = entity.eventCount

      entity.incrementEventCount()

      expect(entity.eventCount).toBe(originalCount)
    })
  })

  describe('activate and deactivate', () => {
    it('should create new activated entity', () => {
      const mockWebhook = createMockWebhook({ is_active: false })
      const entity = new SlackWebhookEntity(mockWebhook)
      const activated = entity.activate()

      expect(activated.isActive).toBe(true)
      expect(activated.toPlainObject().updated_at).toBe('2023-01-15T12:00:00.000Z')
    })

    it('should create new deactivated entity', () => {
      const mockWebhook = createMockWebhook({ is_active: true })
      const entity = new SlackWebhookEntity(mockWebhook)
      const deactivated = entity.deactivate()

      expect(deactivated.isActive).toBe(false)
      expect(deactivated.toPlainObject().updated_at).toBe('2023-01-15T12:00:00.000Z')
    })
  })

  describe('generateEventKey', () => {
    it('should generate correct event key format', () => {
      const mockWebhook = createMockWebhook()
      const entity = new SlackWebhookEntity(mockWebhook)

      const eventKey = entity.generateEventKey(
        'C1234567890',
        '1234567890.123456',
        'fire',
        'U1234567890'
      )

      expect(eventKey).toBe('C1234567890:1234567890.123456:fire:U1234567890')
    })
  })

  describe('toPlainObject and fromPlainObject', () => {
    it('should convert correctly', () => {
      const mockWebhook = createMockWebhook()
      const entity = SlackWebhookEntity.fromPlainObject(mockWebhook)
      const plain = entity.toPlainObject()

      expect(plain).toEqual(mockWebhook)
      expect(entity).toBeInstanceOf(SlackWebhookEntity)
    })
  })
})