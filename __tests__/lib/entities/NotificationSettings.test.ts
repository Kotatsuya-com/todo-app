/**
 * NotificationSettingsEntity unit tests
 */

import { NotificationSettingsEntity, DEFAULT_NOTIFICATION_SETTINGS } from '@/lib/entities/NotificationSettings'
import {
  createMockNotificationSettings,
  createMockCustomNotificationSettings,
  createMockNotificationSettingsWithoutUpdatedAt,
  createMockNotificationUpdateRequest,
  createMockValidNotificationUpdateRequest,
  createMockInvalidNotificationUpdateRequest,
  createMockEmptyNotificationUpdateRequest,
  createMockNullNotificationUpdateRequest,
  createMockUndefinedNotificationUpdateRequest,
  VALID_NOTIFICATION_VALUES,
  INVALID_NOTIFICATION_VALUES,
  EDGE_CASE_USER_IDS,
  createMockNotificationSummary
} from '@/__tests__/fixtures/notification-settings.fixture'

describe('NotificationSettingsEntity', () => {
  describe('constructor and getters', () => {
    it('should create NotificationSettingsEntity with correct properties', () => {
      const mockSettings = createMockNotificationSettings()
      const entity = new NotificationSettingsEntity(mockSettings)

      expect(entity.userId).toBe(mockSettings.user_id)
      expect(entity.webhookNotificationsEnabled).toBe(mockSettings.enable_webhook_notifications)
      expect(entity.updatedAt).toBe(mockSettings.updated_at)
    })

    it('should handle settings without updated_at', () => {
      const mockSettings = createMockNotificationSettingsWithoutUpdatedAt()
      const entity = new NotificationSettingsEntity(mockSettings)

      expect(entity.userId).toBe(mockSettings.user_id)
      expect(entity.webhookNotificationsEnabled).toBe(mockSettings.enable_webhook_notifications)
      expect(entity.updatedAt).toBeUndefined()
    })
  })

  describe('isDefaultSetting', () => {
    it('should return true for default settings', () => {
      const mockSettings = createMockNotificationSettings()
      const entity = new NotificationSettingsEntity(mockSettings)

      expect(entity.isDefaultSetting()).toBe(true)
    })

    it('should return false for custom settings', () => {
      const mockSettings = createMockCustomNotificationSettings()
      const entity = new NotificationSettingsEntity(mockSettings)

      expect(entity.isDefaultSetting()).toBe(false)
    })

    it('should correctly identify default when notifications are enabled', () => {
      const mockSettings = createMockNotificationSettings({
        enable_webhook_notifications: true
      })
      const entity = new NotificationSettingsEntity(mockSettings)

      expect(entity.isDefaultSetting()).toBe(true)
    })

    it('should correctly identify non-default when notifications are disabled', () => {
      const mockSettings = createMockNotificationSettings({
        enable_webhook_notifications: false
      })
      const entity = new NotificationSettingsEntity(mockSettings)

      expect(entity.isDefaultSetting()).toBe(false)
    })
  })

  describe('hasCustomization', () => {
    it('should return false for default settings', () => {
      const mockSettings = createMockNotificationSettings()
      const entity = new NotificationSettingsEntity(mockSettings)

      expect(entity.hasCustomization()).toBe(false)
    })

    it('should return true for custom settings', () => {
      const mockSettings = createMockCustomNotificationSettings()
      const entity = new NotificationSettingsEntity(mockSettings)

      expect(entity.hasCustomization()).toBe(true)
    })
  })

  describe('canReceiveWebhookNotifications', () => {
    it('should return true when notifications are enabled', () => {
      const mockSettings = createMockNotificationSettings({
        enable_webhook_notifications: true
      })
      const entity = new NotificationSettingsEntity(mockSettings)

      expect(entity.canReceiveWebhookNotifications()).toBe(true)
    })

    it('should return false when notifications are disabled', () => {
      const mockSettings = createMockNotificationSettings({
        enable_webhook_notifications: false
      })
      const entity = new NotificationSettingsEntity(mockSettings)

      expect(entity.canReceiveWebhookNotifications()).toBe(false)
    })
  })

  describe('updateSettings', () => {
    it('should update settings with valid request', () => {
      const mockSettings = createMockNotificationSettings()
      const entity = new NotificationSettingsEntity(mockSettings)
      const updateRequest = createMockValidNotificationUpdateRequest()
      
      const updatedEntity = entity.updateSettings(updateRequest)

      expect(updatedEntity.webhookNotificationsEnabled).toBe(updateRequest.enable_webhook_notifications)
      expect(updatedEntity.userId).toBe(mockSettings.user_id)
    })

    it('should update the updated_at timestamp', () => {
      const mockSettings = createMockNotificationSettings()
      const entity = new NotificationSettingsEntity(mockSettings)
      const updateRequest = createMockValidNotificationUpdateRequest()
      
      const updatedEntity = entity.updateSettings(updateRequest)

      expect(updatedEntity.updatedAt).not.toBe(mockSettings.updated_at)
      expect(new Date(updatedEntity.updatedAt!).getTime()).toBeGreaterThan(
        new Date(mockSettings.updated_at!).getTime()
      )
    })

    it('should not modify original entity', () => {
      const mockSettings = createMockNotificationSettings()
      const entity = new NotificationSettingsEntity(mockSettings)
      const originalValue = entity.webhookNotificationsEnabled
      const updateRequest = createMockValidNotificationUpdateRequest()
      
      entity.updateSettings(updateRequest)

      expect(entity.webhookNotificationsEnabled).toBe(originalValue)
    })

    it('should preserve user_id when updating', () => {
      const mockSettings = createMockNotificationSettings({ user_id: 'special-user-123' })
      const entity = new NotificationSettingsEntity(mockSettings)
      const updateRequest = createMockValidNotificationUpdateRequest()
      
      const updatedEntity = entity.updateSettings(updateRequest)

      expect(updatedEntity.userId).toBe('special-user-123')
    })
  })

  describe('resetToDefaults', () => {
    it('should reset custom settings to defaults', () => {
      const mockSettings = createMockCustomNotificationSettings()
      const entity = new NotificationSettingsEntity(mockSettings)
      
      const resetEntity = entity.resetToDefaults()

      expect(resetEntity.webhookNotificationsEnabled).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
      expect(resetEntity.isDefaultSetting()).toBe(true)
    })

    it('should preserve user_id when resetting', () => {
      const mockSettings = createMockCustomNotificationSettings()
      const entity = new NotificationSettingsEntity(mockSettings)
      
      const resetEntity = entity.resetToDefaults()

      expect(resetEntity.userId).toBe(mockSettings.user_id)
    })

    it('should update the updated_at timestamp', () => {
      const mockSettings = createMockCustomNotificationSettings()
      const entity = new NotificationSettingsEntity(mockSettings)
      
      const resetEntity = entity.resetToDefaults()

      expect(resetEntity.updatedAt).not.toBe(mockSettings.updated_at)
      expect(new Date(resetEntity.updatedAt!).getTime()).toBeGreaterThan(
        new Date(mockSettings.updated_at!).getTime()
      )
    })

    it('should not modify original entity', () => {
      const mockSettings = createMockCustomNotificationSettings()
      const entity = new NotificationSettingsEntity(mockSettings)
      const originalValue = entity.webhookNotificationsEnabled
      
      entity.resetToDefaults()

      expect(entity.webhookNotificationsEnabled).toBe(originalValue)
    })
  })

  describe('getSettingsSummary', () => {
    it('should return correct summary for enabled notifications', () => {
      const mockSettings = createMockNotificationSettings({
        enable_webhook_notifications: true,
        updated_at: '2023-01-01T00:00:00Z'
      })
      const entity = new NotificationSettingsEntity(mockSettings)
      
      const summary = entity.getSettingsSummary()

      expect(summary.webhookNotifications).toBe('enabled')
      expect(summary.isDefault).toBe(true)
      expect(summary.lastUpdated).toBe('2023-01-01T00:00:00Z')
    })

    it('should return correct summary for disabled notifications', () => {
      const mockSettings = createMockNotificationSettings({
        enable_webhook_notifications: false,
        updated_at: '2023-01-15T12:00:00Z'
      })
      const entity = new NotificationSettingsEntity(mockSettings)
      
      const summary = entity.getSettingsSummary()

      expect(summary.webhookNotifications).toBe('disabled')
      expect(summary.isDefault).toBe(false)
      expect(summary.lastUpdated).toBe('2023-01-15T12:00:00Z')
    })

    it('should handle missing updated_at gracefully', () => {
      const mockSettings = createMockNotificationSettingsWithoutUpdatedAt()
      const entity = new NotificationSettingsEntity(mockSettings)
      
      const summary = entity.getSettingsSummary()

      expect(summary.webhookNotifications).toBe('enabled')
      expect(summary.isDefault).toBe(true)
      expect(summary.lastUpdated).toBeUndefined()
    })
  })

  describe('toPlainObject', () => {
    it('should return a copy of the original settings object', () => {
      const mockSettings = createMockNotificationSettings()
      const entity = new NotificationSettingsEntity(mockSettings)
      const plainObject = entity.toPlainObject()

      expect(plainObject).toEqual(mockSettings)
      expect(plainObject).not.toBe(mockSettings) // Should be a copy
    })

    it('should preserve all properties', () => {
      const mockSettings = createMockCustomNotificationSettings()
      const entity = new NotificationSettingsEntity(mockSettings)
      const plainObject = entity.toPlainObject()

      expect(plainObject.user_id).toBe(mockSettings.user_id)
      expect(plainObject.enable_webhook_notifications).toBe(mockSettings.enable_webhook_notifications)
      expect(plainObject.updated_at).toBe(mockSettings.updated_at)
    })
  })

  describe('fromPlainObject', () => {
    it('should create NotificationSettingsEntity from plain object', () => {
      const mockSettings = createMockNotificationSettings()
      const entity = NotificationSettingsEntity.fromPlainObject(mockSettings)

      expect(entity).toBeInstanceOf(NotificationSettingsEntity)
      expect(entity.userId).toBe(mockSettings.user_id)
      expect(entity.webhookNotificationsEnabled).toBe(mockSettings.enable_webhook_notifications)
    })

    it('should handle settings without updated_at', () => {
      const mockSettings = createMockNotificationSettingsWithoutUpdatedAt()
      const entity = NotificationSettingsEntity.fromPlainObject(mockSettings)

      expect(entity).toBeInstanceOf(NotificationSettingsEntity)
      expect(entity.updatedAt).toBeUndefined()
    })
  })

  describe('static methods', () => {
    describe('validateNotificationUpdateRequest', () => {
      it('should validate correct notification request', () => {
        const request = createMockValidNotificationUpdateRequest()
        const validation = NotificationSettingsEntity.validateNotificationUpdateRequest(request)

        expect(validation.valid).toBe(true)
        expect(validation.errors).toHaveLength(0)
      })

      it('should validate default notification request', () => {
        const request = createMockNotificationUpdateRequest()
        const validation = NotificationSettingsEntity.validateNotificationUpdateRequest(request)

        expect(validation.valid).toBe(true)
        expect(validation.errors).toHaveLength(0)
      })

      it('should validate all valid boolean values', () => {
        VALID_NOTIFICATION_VALUES.forEach(value => {
          const request = { enable_webhook_notifications: value }
          const validation = NotificationSettingsEntity.validateNotificationUpdateRequest(request)
          
          expect(validation.valid).toBe(true)
          expect(validation.errors).toHaveLength(0)
        })
      })

      it('should reject invalid notification values', () => {
        INVALID_NOTIFICATION_VALUES.forEach(invalidValue => {
          const request = { enable_webhook_notifications: invalidValue }
          const validation = NotificationSettingsEntity.validateNotificationUpdateRequest(request)
          
          expect(validation.valid).toBe(false)
          expect(validation.errors).toContain('enable_webhook_notifications must be a boolean')
        })
      })

      it('should reject string boolean values', () => {
        const request = createMockInvalidNotificationUpdateRequest()
        const validation = NotificationSettingsEntity.validateNotificationUpdateRequest(request)

        expect(validation.valid).toBe(false)
        expect(validation.errors).toContain('enable_webhook_notifications must be a boolean')
      })

      it('should reject null values', () => {
        const request = createMockNullNotificationUpdateRequest()
        const validation = NotificationSettingsEntity.validateNotificationUpdateRequest(request)

        expect(validation.valid).toBe(false)
        expect(validation.errors).toContain('enable_webhook_notifications must be a boolean')
      })

      it('should reject undefined values', () => {
        const request = createMockUndefinedNotificationUpdateRequest()
        const validation = NotificationSettingsEntity.validateNotificationUpdateRequest(request)

        expect(validation.valid).toBe(false)
        expect(validation.errors).toContain('enable_webhook_notifications must be a boolean')
      })

      it('should reject empty objects', () => {
        const request = createMockEmptyNotificationUpdateRequest()
        const validation = NotificationSettingsEntity.validateNotificationUpdateRequest(request)

        expect(validation.valid).toBe(false)
        expect(validation.errors).toContain('enable_webhook_notifications must be a boolean')
      })
    })

    describe('createWithDefaults', () => {
      it('should create settings with default notifications', () => {
        const userId = 'test-user-123'
        const settings = NotificationSettingsEntity.createWithDefaults(userId)

        expect(settings.user_id).toBe(userId)
        expect(settings.enable_webhook_notifications).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
      })

      it('should not include updated_at', () => {
        const settings = NotificationSettingsEntity.createWithDefaults('user-123')
        expect(settings).not.toHaveProperty('updated_at')
      })

      it('should handle edge case user IDs', () => {
        EDGE_CASE_USER_IDS.forEach(userId => {
          const settings = NotificationSettingsEntity.createWithDefaults(userId)
          expect(settings.user_id).toBe(userId)
          expect(settings.enable_webhook_notifications).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
        })
      })
    })

    describe('createFromUpdateRequest', () => {
      it('should create settings from update request', () => {
        const userId = 'test-user-123'
        const updateRequest = createMockValidNotificationUpdateRequest()
        const settings = NotificationSettingsEntity.createFromUpdateRequest(userId, updateRequest)

        expect(settings.user_id).toBe(userId)
        expect(settings.enable_webhook_notifications).toBe(updateRequest.enable_webhook_notifications)
      })

      it('should not include updated_at', () => {
        const updateRequest = createMockValidNotificationUpdateRequest()
        const settings = NotificationSettingsEntity.createFromUpdateRequest('user-123', updateRequest)
        
        expect(settings).not.toHaveProperty('updated_at')
      })

      it('should handle different notification values', () => {
        VALID_NOTIFICATION_VALUES.forEach(value => {
          const request = { enable_webhook_notifications: value }
          const settings = NotificationSettingsEntity.createFromUpdateRequest('user-123', request)
          
          expect(settings.enable_webhook_notifications).toBe(value)
        })
      })
    })
  })

  describe('immutability', () => {
    it('should not modify original settings when entity methods are called', () => {
      const mockSettings = createMockNotificationSettings()
      const originalSettings = { ...mockSettings }
      const entity = new NotificationSettingsEntity(mockSettings)

      // Perform operations that might modify internal state
      entity.isDefaultSetting()
      entity.hasCustomization()
      entity.canReceiveWebhookNotifications()
      entity.getSettingsSummary()
      entity.toPlainObject()

      expect(mockSettings).toEqual(originalSettings)
    })

    it('should not modify original settings when creating new entities', () => {
      const mockSettings = createMockNotificationSettings()
      const originalSettings = { ...mockSettings }
      const entity = new NotificationSettingsEntity(mockSettings)
      const updateRequest = createMockValidNotificationUpdateRequest()

      // Create new entities
      entity.resetToDefaults()
      entity.updateSettings(updateRequest)

      expect(mockSettings).toEqual(originalSettings)
    })

    it('should not modify original settings when toPlainObject is modified', () => {
      const mockSettings = createMockNotificationSettings()
      const originalSettings = { ...mockSettings }
      const entity = new NotificationSettingsEntity(mockSettings)

      const plainObject = entity.toPlainObject()
      plainObject.enable_webhook_notifications = false

      expect(mockSettings).toEqual(originalSettings)
      expect(entity.webhookNotificationsEnabled).toBe(originalSettings.enable_webhook_notifications)
    })
  })

  describe('edge cases', () => {
    it('should handle user ID with special characters', () => {
      const specialUserId = 'user-123@#$%^&*()'
      const mockSettings = createMockNotificationSettings({ user_id: specialUserId })
      const entity = new NotificationSettingsEntity(mockSettings)

      expect(entity.userId).toBe(specialUserId)
    })

    it('should handle very long user IDs', () => {
      const longUserId = 'a'.repeat(1000)
      const mockSettings = createMockNotificationSettings({ user_id: longUserId })
      const entity = new NotificationSettingsEntity(mockSettings)

      expect(entity.userId).toBe(longUserId)
    })

    it('should handle empty user ID', () => {
      const emptyUserId = ''
      const mockSettings = createMockNotificationSettings({ user_id: emptyUserId })
      const entity = new NotificationSettingsEntity(mockSettings)

      expect(entity.userId).toBe(emptyUserId)
    })

    it('should handle various timestamp formats', () => {
      const timestamps = [
        '2023-01-01T00:00:00Z',
        '2023-01-01T00:00:00.000Z',
        '2023-01-01 00:00:00',
        '',
        undefined
      ]

      timestamps.forEach(timestamp => {
        const mockSettings = createMockNotificationSettings({ updated_at: timestamp })
        const entity = new NotificationSettingsEntity(mockSettings)
        
        expect(entity.updatedAt).toBe(timestamp)
      })
    })
  })

  describe('business logic validation', () => {
    it('should correctly determine if user can receive notifications', () => {
      const enabledSettings = createMockNotificationSettings({ enable_webhook_notifications: true })
      const disabledSettings = createMockNotificationSettings({ enable_webhook_notifications: false })
      
      const enabledEntity = new NotificationSettingsEntity(enabledSettings)
      const disabledEntity = new NotificationSettingsEntity(disabledSettings)

      expect(enabledEntity.canReceiveWebhookNotifications()).toBe(true)
      expect(disabledEntity.canReceiveWebhookNotifications()).toBe(false)
    })

    it('should maintain consistency between methods', () => {
      const customSettings = createMockCustomNotificationSettings()
      const entity = new NotificationSettingsEntity(customSettings)

      expect(entity.isDefaultSetting()).toBe(!entity.hasCustomization())
      expect(entity.canReceiveWebhookNotifications()).toBe(entity.webhookNotificationsEnabled)
    })
  })
})