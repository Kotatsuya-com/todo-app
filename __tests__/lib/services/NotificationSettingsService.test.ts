/**
 * NotificationSettingsService unit tests
 * Using autoMock approach for cleaner, more maintainable tests
 */

import { NotificationSettingsService } from '@/lib/services/NotificationSettingsService'
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/lib/entities/NotificationSettings'
import { createAutoMock, mockResult } from '@/__tests__/utils/autoMock'
import { NotificationSettingsRepositoryInterface } from '@/lib/repositories/NotificationSettingsRepository'
import {
  createMockNotificationSettings,
  createMockCustomNotificationSettings,
  createMockValidNotificationUpdateRequest,
  createMockInvalidNotificationUpdateRequest,
  EXPECTED_NOTIFICATION_STATISTICS
} from '@/__tests__/fixtures/notification-settings.fixture'

describe('NotificationSettingsService', () => {
  let service: NotificationSettingsService
  let mockRepository: jest.Mocked<NotificationSettingsRepositoryInterface>

  beforeEach(() => {
    mockRepository = createAutoMock<NotificationSettingsRepositoryInterface>()
    service = new NotificationSettingsService(mockRepository)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserNotificationSettings', () => {
    it('should return existing user settings with summary', async () => {
      const mockSettings = createMockNotificationSettings()
      mockRepository.findByUserId.mockResolvedValue(mockResult.success(mockSettings))

      const result = await service.getUserNotificationSettings('user-123')

      expect(result.error).toBeUndefined()
      expect(result.data?.settings).toEqual(mockSettings)
      expect(result.data?.summary).toEqual({
        webhookNotifications: 'enabled',
        isDefault: true
      })
      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123')
    })

    it('should return default settings when user has no settings', async () => {
      mockRepository.findByUserId.mockResolvedValue(mockResult.success(null))

      const result = await service.getUserNotificationSettings('new-user')

      expect(result.error).toBeUndefined()
      expect(result.data?.settings.user_id).toBe('new-user')
      expect(result.data?.settings.enable_webhook_notifications).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
      expect(result.data?.summary.isDefault).toBe(true)
      expect(result.data?.summary.webhookNotifications).toBe('enabled')
    })

    it('should return custom settings with correct summary', async () => {
      const mockSettings = createMockCustomNotificationSettings()
      mockRepository.findByUserId.mockResolvedValue(mockResult.success(mockSettings))

      const result = await service.getUserNotificationSettings(mockSettings.user_id)

      expect(result.error).toBeUndefined()
      expect(result.data?.settings).toEqual(mockSettings)
      expect(result.data?.summary).toEqual({
        webhookNotifications: 'disabled',
        isDefault: false
      })
    })

    it('should handle repository errors', async () => {
      mockRepository.findByUserId.mockResolvedValue(mockResult.error('Database error'))

      const result = await service.getUserNotificationSettings('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to fetch notification settings')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service layer exceptions', async () => {
      mockRepository.findByUserId.mockRejectedValue(new Error('Unexpected error'))

      const result = await service.getUserNotificationSettings('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should handle null data from repository', async () => {
      mockRepository.findByUserId.mockResolvedValue(mockResult.success(null))

      const result = await service.getUserNotificationSettings('nonexistent-user')

      expect(result.error).toBeUndefined()
      expect(result.data?.settings.user_id).toBe('nonexistent-user')
      expect(result.data?.settings.enable_webhook_notifications).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
    })
  })

  describe('updateUserNotificationSettings', () => {
    it('should update user settings with valid request', async () => {
      const updateRequest = createMockValidNotificationUpdateRequest()
      const expectedSettings = {
        user_id: 'user-123',
        enable_webhook_notifications: updateRequest.enable_webhook_notifications
      }
      mockRepository.update.mockResolvedValue(mockResult.success(expectedSettings))

      const result = await service.updateUserNotificationSettings('user-123', updateRequest)

      expect(result.error).toBeUndefined()
      expect(result.data?.message).toBe('Notification preferences updated successfully')
      expect(result.data?.settings.enable_webhook_notifications).toBe(updateRequest.enable_webhook_notifications)
      expect(result.data?.settings.user_id).toBe('user-123')
      expect(mockRepository.update).toHaveBeenCalledWith('user-123', {
        user_id: 'user-123',
        enable_webhook_notifications: updateRequest.enable_webhook_notifications
      })
    })

    it('should reject invalid notification values', async () => {
      const invalidRequest = createMockInvalidNotificationUpdateRequest()

      const result = await service.updateUserNotificationSettings('user-123', invalidRequest)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('enable_webhook_notifications must be a boolean')
      expect(result.statusCode).toBe(400)
      expect(mockRepository.update).not.toHaveBeenCalled()
    })

    it('should handle repository errors during update', async () => {
      mockRepository.update.mockResolvedValue(mockResult.error('Database error'))
      const validRequest = createMockValidNotificationUpdateRequest()

      const result = await service.updateUserNotificationSettings('user-123', validRequest)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to update notification settings')
      expect(result.statusCode).toBe(500)
    })

    it('should handle null data from repository', async () => {
      mockRepository.update.mockResolvedValue(mockResult.success(null))
      const validRequest = createMockValidNotificationUpdateRequest()

      const result = await service.updateUserNotificationSettings('user-123', validRequest)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to update notification settings - no data returned')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service layer exceptions', async () => {
      mockRepository.update.mockRejectedValue(new Error('Unexpected error'))
      const validRequest = createMockValidNotificationUpdateRequest()

      const result = await service.updateUserNotificationSettings('user-123', validRequest)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should create new settings for user without existing settings', async () => {
      const validRequest = createMockValidNotificationUpdateRequest()
      const expectedSettings = {
        user_id: 'new-user',
        enable_webhook_notifications: validRequest.enable_webhook_notifications
      }
      mockRepository.update.mockResolvedValue(mockResult.success(expectedSettings))

      const result = await service.updateUserNotificationSettings('new-user', validRequest)

      expect(result.error).toBeUndefined()
      expect(result.data?.settings.user_id).toBe('new-user')
      expect(result.data?.settings.enable_webhook_notifications).toBe(validRequest.enable_webhook_notifications)
    })

    it('should handle multiple validation errors', async () => {
      const invalidRequest = {
        enable_webhook_notifications: 'invalid' as any
      }

      const result = await service.updateUserNotificationSettings('user-123', invalidRequest)

      expect(result.data).toBeUndefined()
      expect(result.error).toContain('enable_webhook_notifications must be a boolean')
      expect(result.statusCode).toBe(400)
    })
  })

  describe('resetUserNotificationSettings', () => {
    it('should reset user settings to defaults', async () => {
      const expectedSettings = {
        user_id: 'user-123',
        enable_webhook_notifications: DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications
      }
      mockRepository.update.mockResolvedValue(mockResult.success(expectedSettings))

      const result = await service.resetUserNotificationSettings('user-123')

      expect(result.error).toBeUndefined()
      expect(result.data?.message).toBe('Notification settings reset to default')
      expect(result.data?.settings.enable_webhook_notifications).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
      expect(result.data?.settings.user_id).toBe('user-123')
      expect(mockRepository.update).toHaveBeenCalledWith('user-123', {
        user_id: 'user-123',
        enable_webhook_notifications: DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications
      })
    })

    it('should handle repository errors during reset', async () => {
      mockRepository.update.mockResolvedValue(mockResult.error('Database error'))

      const result = await service.resetUserNotificationSettings('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to reset notification settings')
      expect(result.statusCode).toBe(500)
    })

    it('should handle null data from repository', async () => {
      mockRepository.update.mockResolvedValue(mockResult.success(null))

      const result = await service.resetUserNotificationSettings('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to reset notification settings - no data returned')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service layer exceptions', async () => {
      mockRepository.update.mockRejectedValue(new Error('Unexpected error'))

      const result = await service.resetUserNotificationSettings('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should reset custom settings to defaults', async () => {
      const customSettings = createMockCustomNotificationSettings()
      const expectedSettings = {
        user_id: customSettings.user_id,
        enable_webhook_notifications: DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications
      }
      mockRepository.update.mockResolvedValue(mockResult.success(expectedSettings))

      const result = await service.resetUserNotificationSettings(customSettings.user_id)

      expect(result.error).toBeUndefined()
      expect(result.data?.settings.enable_webhook_notifications).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
    })
  })

  describe('getDefaultSettings', () => {
    it('should return default notification settings', () => {
      const defaults = service.getDefaultSettings()

      expect(defaults).toEqual(DEFAULT_NOTIFICATION_SETTINGS)
      expect(defaults.enable_webhook_notifications).toBe(true)
    })
  })

  describe('getNotificationStats', () => {
    it('should return correct notification statistics', async () => {
      mockRepository.getNotificationStats.mockResolvedValue(
        mockResult.success({
          totalUsers: EXPECTED_NOTIFICATION_STATISTICS.totalUsers,
          enabledUsers: EXPECTED_NOTIFICATION_STATISTICS.enabledUsers,
          disabledUsers: EXPECTED_NOTIFICATION_STATISTICS.disabledUsers
        })
      )

      const result = await service.getNotificationStats()

      expect(result.error).toBeUndefined()
      expect(result.data?.totalUsers).toEqual(EXPECTED_NOTIFICATION_STATISTICS.totalUsers)
      expect(result.data?.enabledUsers).toEqual(EXPECTED_NOTIFICATION_STATISTICS.enabledUsers)
      expect(result.data?.disabledUsers).toEqual(EXPECTED_NOTIFICATION_STATISTICS.disabledUsers)
      expect(result.data?.enabledPercentage).toEqual(EXPECTED_NOTIFICATION_STATISTICS.enabledPercentage)
    })

    it('should handle repository errors', async () => {
      mockRepository.getNotificationStats.mockResolvedValue(mockResult.error('Database error'))

      const result = await service.getNotificationStats()

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to fetch notification statistics')
      expect(result.statusCode).toBe(500)
    })

    it('should handle empty repository', async () => {
      mockRepository.getNotificationStats.mockResolvedValue(
        mockResult.success({
          totalUsers: 0,
          enabledUsers: 0,
          disabledUsers: 0
        })
      )

      const result = await service.getNotificationStats()

      expect(result.error).toBeUndefined()
      expect(result.data?.totalUsers).toBe(0)
      expect(result.data?.enabledUsers).toBe(0)
      expect(result.data?.disabledUsers).toBe(0)
      expect(result.data?.enabledPercentage).toBe(0)
    })

    it('should calculate percentage correctly', async () => {
      const testCases = [
        { enabled: 1, total: 4, expectedPercentage: 25 },
        { enabled: 3, total: 4, expectedPercentage: 75 },
        { enabled: 0, total: 5, expectedPercentage: 0 },
        { enabled: 5, total: 5, expectedPercentage: 100 }
      ]

      for (const testCase of testCases) {
        mockRepository.getNotificationStats.mockResolvedValue(
          mockResult.success({
            totalUsers: testCase.total,
            enabledUsers: testCase.enabled,
            disabledUsers: testCase.total - testCase.enabled
          })
        )

        const result = await service.getNotificationStats()

        expect(result.error).toBeUndefined()
        expect(result.data?.enabledPercentage).toBe(testCase.expectedPercentage)
      }
    })

    it('should handle service layer exceptions', async () => {
      mockRepository.getNotificationStats.mockRejectedValue(new Error('Unexpected error'))

      const result = await service.getNotificationStats()

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('getUsersWithNotificationsEnabled', () => {
    it('should return list of users with notifications enabled', async () => {
      const enabledUserIds = ['user-1', 'user-2', 'user-3']
      mockRepository.findUsersWithNotificationsEnabled.mockResolvedValue(
        mockResult.success(enabledUserIds)
      )

      const result = await service.getUsersWithNotificationsEnabled()

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(enabledUserIds)
      expect(result.data?.length).toBe(3)
    })

    it('should handle repository errors', async () => {
      mockRepository.findUsersWithNotificationsEnabled.mockResolvedValue(
        mockResult.error('Database error')
      )

      const result = await service.getUsersWithNotificationsEnabled()

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to fetch users with notifications enabled')
      expect(result.statusCode).toBe(500)
    })

    it('should return empty array when no users have notifications enabled', async () => {
      mockRepository.findUsersWithNotificationsEnabled.mockResolvedValue(
        mockResult.success([])
      )

      const result = await service.getUsersWithNotificationsEnabled()

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual([])
    })

    it('should handle service layer exceptions', async () => {
      mockRepository.findUsersWithNotificationsEnabled.mockRejectedValue(
        new Error('Unexpected error')
      )

      const result = await service.getUsersWithNotificationsEnabled()

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('canUserReceiveNotifications', () => {
    it('should return true for user with notifications enabled', async () => {
      const enabledSettings = createMockNotificationSettings({ enable_webhook_notifications: true })
      mockRepository.findByUserId.mockResolvedValue(mockResult.success(enabledSettings))

      const result = await service.canUserReceiveNotifications('user-123')

      expect(result.error).toBeUndefined()
      expect(result.data).toBe(true)
    })

    it('should return false for user with notifications disabled', async () => {
      const disabledSettings = createMockNotificationSettings({ enable_webhook_notifications: false })
      mockRepository.findByUserId.mockResolvedValue(mockResult.success(disabledSettings))

      const result = await service.canUserReceiveNotifications(disabledSettings.user_id)

      expect(result.error).toBeUndefined()
      expect(result.data).toBe(false)
    })

    it('should return default value for user without settings', async () => {
      mockRepository.findByUserId.mockResolvedValue(mockResult.success(null))

      const result = await service.canUserReceiveNotifications('new-user')

      expect(result.error).toBeUndefined()
      expect(result.data).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
    })

    it('should handle repository errors', async () => {
      mockRepository.findByUserId.mockResolvedValue(mockResult.error('Database error'))

      const result = await service.canUserReceiveNotifications('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to check notification status')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service layer exceptions', async () => {
      mockRepository.findByUserId.mockRejectedValue(new Error('Unexpected error'))

      const result = await service.canUserReceiveNotifications('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('error handling edge cases', () => {
    it('should handle repository returning undefined data', async () => {
      mockRepository.findByUserId.mockResolvedValue({
        data: undefined as any,
        error: null
      })

      const result = await service.getUserNotificationSettings('user-123')

      expect(result.error).toBeUndefined()
      expect(result.data?.settings.user_id).toBe('user-123')
      expect(result.data?.settings.enable_webhook_notifications).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
    })

    it('should handle malformed validation errors gracefully', async () => {
      const invalidRequest: any = {
        enable_webhook_notifications: []
      }

      const result = await service.updateUserNotificationSettings('user-123', invalidRequest)

      expect(result.data).toBeUndefined()
      expect(result.error).toContain('enable_webhook_notifications must be a boolean')
      expect(result.statusCode).toBe(400)
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete notification preference workflow', async () => {
      const userId = 'workflow-user'

      // 1. Get initial settings (should return defaults)
      mockRepository.findByUserId.mockResolvedValueOnce(mockResult.success(null))
      const initialResult = await service.getUserNotificationSettings(userId)
      expect(initialResult.success).toBe(true)
      expect(initialResult.data?.settings.enable_webhook_notifications).toBe(true)

      // 2. Update to disable notifications
      const updateRequest = { enable_webhook_notifications: false }
      const updatedSettings = {
        user_id: userId,
        enable_webhook_notifications: false
      }
      mockRepository.update.mockResolvedValueOnce(mockResult.success(updatedSettings))
      const updateResult = await service.updateUserNotificationSettings(userId, updateRequest)
      expect(updateResult.success).toBe(true)
      expect(updateResult.data?.settings.enable_webhook_notifications).toBe(false)

      // 3. Check if user can receive notifications
      mockRepository.findByUserId.mockResolvedValueOnce(mockResult.success(updatedSettings))
      const canReceiveResult = await service.canUserReceiveNotifications(userId)
      expect(canReceiveResult.success).toBe(true)
      expect(canReceiveResult.data).toBe(false)

      // 4. Reset to defaults
      const resetSettings = {
        user_id: userId,
        enable_webhook_notifications: true
      }
      mockRepository.update.mockResolvedValueOnce(mockResult.success(resetSettings))
      const resetResult = await service.resetUserNotificationSettings(userId)
      expect(resetResult.success).toBe(true)
      expect(resetResult.data?.settings.enable_webhook_notifications).toBe(true)
    })
  })
})
