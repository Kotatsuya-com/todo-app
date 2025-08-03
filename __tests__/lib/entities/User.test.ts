/**
 * UserEntity unit tests
 */

import { UserEntity } from '@/lib/entities/User'
import {
  createMockUser,
  createMockUserWithoutSlackId,
  createMockUserWithNotificationsDisabled,
  VALID_SLACK_USER_IDS,
  INVALID_SLACK_USER_IDS
} from '@/__tests__/fixtures/entities.fixture'

describe('UserEntity', () => {
  describe('constructor and getters', () => {
    it('should create UserEntity with correct properties', () => {
      const mockUser = createMockUser()
      const userEntity = new UserEntity(mockUser)

      expect(userEntity.id).toBe(mockUser.id)
      expect(userEntity.email).toBe(mockUser.email)
      expect(userEntity.slackUserId).toBe(mockUser.slack_user_id)
      expect(userEntity.notificationsEnabled).toBe(mockUser.enable_webhook_notifications)
    })

    it('should return null for slackUserId when slack_user_id is null', () => {
      const mockUser = createMockUserWithoutSlackId()
      const userEntity = new UserEntity(mockUser)

      expect(userEntity.slackUserId).toBeNull()
    })

    it('should return null for slackUserId when slack_user_id is undefined', () => {
      const mockUser = createMockUser({ slack_user_id: undefined })
      const userEntity = new UserEntity(mockUser)

      expect(userEntity.slackUserId).toBeNull()
    })
  })

  describe('hasSlackUserId', () => {
    it('should return true when slack_user_id exists', () => {
      const mockUser = createMockUser()
      const userEntity = new UserEntity(mockUser)

      expect(userEntity.hasSlackUserId()).toBe(true)
    })

    it('should return false when slack_user_id is null', () => {
      const mockUser = createMockUserWithoutSlackId()
      const userEntity = new UserEntity(mockUser)

      expect(userEntity.hasSlackUserId()).toBe(false)
    })

    it('should return false when slack_user_id is empty string', () => {
      const mockUser = createMockUser({ slack_user_id: '' })
      const userEntity = new UserEntity(mockUser)

      expect(userEntity.hasSlackUserId()).toBe(false)
    })
  })

  describe('canReceiveWebhookNotifications', () => {
    it('should return true when notifications enabled and slack_user_id exists', () => {
      const mockUser = createMockUser({
        enable_webhook_notifications: true,
        slack_user_id: 'U1234567890'
      })
      const userEntity = new UserEntity(mockUser)

      expect(userEntity.canReceiveWebhookNotifications()).toBe(true)
    })

    it('should return false when notifications disabled even with slack_user_id', () => {
      const mockUser = createMockUserWithNotificationsDisabled()
      const userEntity = new UserEntity(mockUser)

      expect(userEntity.canReceiveWebhookNotifications()).toBe(false)
    })

    it('should return false when notifications enabled but slack_user_id is null', () => {
      const mockUser = createMockUser({
        enable_webhook_notifications: true,
        slack_user_id: null
      })
      const userEntity = new UserEntity(mockUser)

      expect(userEntity.canReceiveWebhookNotifications()).toBe(false)
    })

    it('should return false when both notifications disabled and slack_user_id is null', () => {
      const mockUser = createMockUser({
        enable_webhook_notifications: false,
        slack_user_id: null
      })
      const userEntity = new UserEntity(mockUser)

      expect(userEntity.canReceiveWebhookNotifications()).toBe(false)
    })
  })

  describe('validateSlackUserId', () => {
    it('should validate correct Slack User ID formats', () => {
      const userEntity = new UserEntity(createMockUser())

      VALID_SLACK_USER_IDS.forEach(slackUserId => {
        expect(userEntity.validateSlackUserId(slackUserId)).toBe(true)
      })
    })

    it('should reject invalid Slack User ID formats', () => {
      const userEntity = new UserEntity(createMockUser())

      INVALID_SLACK_USER_IDS.forEach(slackUserId => {
        expect(userEntity.validateSlackUserId(slackUserId)).toBe(false)
      })
    })

    it('should validate edge case: minimum valid length', () => {
      const userEntity = new UserEntity(createMockUser())
      
      expect(userEntity.validateSlackUserId('U12345678')).toBe(true) // 9 chars total (U + 8)
    })

    it('should validate edge case: very long valid ID', () => {
      const userEntity = new UserEntity(createMockUser())
      
      expect(userEntity.validateSlackUserId('U123456789012345678901234567890')).toBe(true)
    })
  })

  describe('toPlainObject', () => {
    it('should return a copy of the original user object', () => {
      const mockUser = createMockUser()
      const userEntity = new UserEntity(mockUser)
      const plainObject = userEntity.toPlainObject()

      expect(plainObject).toEqual(mockUser)
      expect(plainObject).not.toBe(mockUser) // Should be a copy, not reference
    })

    it('should preserve all user properties', () => {
      const mockUser = createMockUser({
        id: 'custom-id',
        email: 'custom@test.com',
        slack_user_id: 'UCUSTOM123',
        enable_webhook_notifications: false
      })
      const userEntity = new UserEntity(mockUser)
      const plainObject = userEntity.toPlainObject()

      expect(plainObject.id).toBe('custom-id')
      expect(plainObject.email).toBe('custom@test.com')
      expect(plainObject.slack_user_id).toBe('UCUSTOM123')
      expect(plainObject.enable_webhook_notifications).toBe(false)
    })
  })

  describe('fromPlainObject', () => {
    it('should create UserEntity from plain user object', () => {
      const mockUser = createMockUser()
      const userEntity = UserEntity.fromPlainObject(mockUser)

      expect(userEntity).toBeInstanceOf(UserEntity)
      expect(userEntity.id).toBe(mockUser.id)
      expect(userEntity.email).toBe(mockUser.email)
      expect(userEntity.slackUserId).toBe(mockUser.slack_user_id)
    })

    it('should handle user object with null slack_user_id', () => {
      const mockUser = createMockUserWithoutSlackId()
      const userEntity = UserEntity.fromPlainObject(mockUser)

      expect(userEntity).toBeInstanceOf(UserEntity)
      expect(userEntity.slackUserId).toBeNull()
      expect(userEntity.hasSlackUserId()).toBe(false)
    })
  })

  describe('immutability', () => {
    it('should not modify original user object when entity is created', () => {
      const mockUser = createMockUser()
      const originalUser = { ...mockUser }
      const userEntity = new UserEntity(mockUser)

      // Perform operations that might modify internal state
      userEntity.hasSlackUserId()
      userEntity.canReceiveWebhookNotifications()
      userEntity.validateSlackUserId('U1234567890')

      expect(mockUser).toEqual(originalUser)
    })

    it('should not modify original user object when toPlainObject is called', () => {
      const mockUser = createMockUser()
      const originalUser = { ...mockUser }
      const userEntity = new UserEntity(mockUser)

      const plainObject = userEntity.toPlainObject()
      plainObject.email = 'modified@test.com'

      expect(mockUser).toEqual(originalUser)
      expect(userEntity.email).toBe(originalUser.email)
    })
  })

  describe('edge cases', () => {
    it('should handle whitespace-only slack_user_id', () => {
      const mockUser = createMockUser({ slack_user_id: '   ' })
      const userEntity = new UserEntity(mockUser)

      expect(userEntity.slackUserId).toBe('   ')
      expect(userEntity.hasSlackUserId()).toBe(true) // Truthy value
      expect(userEntity.validateSlackUserId('   ')).toBe(false) // Invalid format
    })

    it('should handle special characters in email', () => {
      const mockUser = createMockUser({ email: 'test+special@sub.domain.com' })
      const userEntity = new UserEntity(mockUser)

      expect(userEntity.email).toBe('test+special@sub.domain.com')
    })

    it('should handle very long user IDs', () => {
      const longId = 'a'.repeat(1000)
      const mockUser = createMockUser({ id: longId })
      const userEntity = new UserEntity(mockUser)

      expect(userEntity.id).toBe(longId)
    })
  })
})