/**
 * NotificationSettingsService unit tests
 */

import { NotificationSettingsService } from '@/lib/services/NotificationSettingsService'
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/lib/entities/NotificationSettings'
import {
  MockNotificationSettingsRepository,
  createMockNotificationSettingsRepository,
  createMockNotificationSettingsRepositoryWithMultipleUsers,
  createFailingMockNotificationSettingsRepository,
  createEmptyMockNotificationSettingsRepository
} from '@/__tests__/mocks/notification-settings'
import {
  createMockNotificationSettings,
  createMockCustomNotificationSettings,
  createMockValidNotificationUpdateRequest,
  createMockInvalidNotificationUpdateRequest,
  createMockNotificationUpdateRequest,
  EXPECTED_NOTIFICATION_STATISTICS
} from '@/__tests__/fixtures/notification-settings.fixture'

describe('NotificationSettingsService', () => {
  let service: NotificationSettingsService
  let mockRepository: MockNotificationSettingsRepository

  beforeEach(() => {
    mockRepository = createMockNotificationSettingsRepository()
    service = new NotificationSettingsService(mockRepository)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserNotificationSettings', () => {
    it('should return existing user settings with summary', async () => {
      const mockSettings = createMockNotificationSettings()
      mockRepository.setMockData([mockSettings])

      const result = await service.getUserNotificationSettings('user-123')

      expect(result.success).toBe(true)
      expect(result.data?.settings).toEqual(mockSettings)
      expect(result.data?.summary).toEqual({
        webhookNotifications: 'enabled',
        isDefault: true
      })
    })

    it('should return default settings when user has no settings', async () => {
      mockRepository.setShouldReturnEmpty(true)

      const result = await service.getUserNotificationSettings('new-user')

      expect(result.success).toBe(true)
      expect(result.data?.settings.user_id).toBe('new-user')
      expect(result.data?.settings.enable_webhook_notifications).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
      expect(result.data?.summary.isDefault).toBe(true)
      expect(result.data?.summary.webhookNotifications).toBe('enabled')
    })

    it('should return custom settings with correct summary', async () => {
      const mockSettings = createMockCustomNotificationSettings()
      mockRepository.setMockData([mockSettings])

      const result = await service.getUserNotificationSettings(mockSettings.user_id)

      expect(result.success).toBe(true)
      expect(result.data?.settings).toEqual(mockSettings)
      expect(result.data?.summary).toEqual({
        webhookNotifications: 'disabled',
        isDefault: false
      })
    })

    it('should handle repository errors', async () => {
      mockRepository.setShouldFail(true)

      const result = await service.getUserNotificationSettings('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch notification settings')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service layer exceptions', async () => {
      const throwingRepository = {
        findByUserId: jest.fn(() => {
          throw new Error('Unexpected error')
        })
      } as any

      const serviceWithThrowingRepo = new NotificationSettingsService(throwingRepository)
      const result = await serviceWithThrowingRepo.getUserNotificationSettings('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should handle null data from repository', async () => {
      mockRepository.clearMockData()
      mockRepository.setShouldReturnEmpty(true)

      const result = await service.getUserNotificationSettings('nonexistent-user')

      expect(result.success).toBe(true)
      expect(result.data?.settings.user_id).toBe('nonexistent-user')
      expect(result.data?.settings.enable_webhook_notifications).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
    })
  })

  describe('updateUserNotificationSettings', () => {
    it('should update user settings with valid request', async () => {
      const updateRequest = createMockValidNotificationUpdateRequest()

      const result = await service.updateUserNotificationSettings('user-123', updateRequest)

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Notification preferences updated successfully')
      expect(result.data?.settings.enable_webhook_notifications).toBe(updateRequest.enable_webhook_notifications)
      expect(result.data?.settings.user_id).toBe('user-123')
    })

    it('should reject invalid notification values', async () => {
      const invalidRequest = createMockInvalidNotificationUpdateRequest()

      const result = await service.updateUserNotificationSettings('user-123', invalidRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('enable_webhook_notifications must be a boolean')
      expect(result.statusCode).toBe(400)
    })

    it('should handle repository errors during update', async () => {
      mockRepository.setShouldFail(true)
      const validRequest = createMockValidNotificationUpdateRequest()

      const result = await service.updateUserNotificationSettings('user-123', validRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update notification settings')
      expect(result.statusCode).toBe(500)
    })

    it('should handle null data from repository', async () => {
      const originalUpdate = mockRepository.update
      mockRepository.update = jest.fn().mockResolvedValue({
        success: true,
        data: null
      })

      const validRequest = createMockValidNotificationUpdateRequest()
      const result = await service.updateUserNotificationSettings('user-123', validRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update notification settings - no data returned')
      expect(result.statusCode).toBe(500)

      // Restore original method
      mockRepository.update = originalUpdate
    })

    it('should handle service layer exceptions', async () => {
      const throwingRepository = {
        update: jest.fn(() => {
          throw new Error('Unexpected error')
        })
      } as any

      const serviceWithThrowingRepo = new NotificationSettingsService(throwingRepository)
      const validRequest = createMockValidNotificationUpdateRequest()
      const result = await serviceWithThrowingRepo.updateUserNotificationSettings('user-123', validRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should create new settings for user without existing settings', async () => {
      mockRepository.clearMockData() // Start with empty repository
      const validRequest = createMockValidNotificationUpdateRequest()

      const result = await service.updateUserNotificationSettings('new-user', validRequest)

      expect(result.success).toBe(true)
      expect(result.data?.settings.user_id).toBe('new-user')
      expect(result.data?.settings.enable_webhook_notifications).toBe(validRequest.enable_webhook_notifications)
    })

    it('should handle multiple validation errors', async () => {
      const invalidRequest = {
        enable_webhook_notifications: 'invalid'
      }

      const result = await service.updateUserNotificationSettings('user-123', invalidRequest)

      expect(result.success).toBe(false)
      expect(result.error).toContain('enable_webhook_notifications must be a boolean')
      expect(result.statusCode).toBe(400)
    })
  })

  describe('resetUserNotificationSettings', () => {
    it('should reset user settings to defaults', async () => {
      const result = await service.resetUserNotificationSettings('user-123')

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Notification settings reset to default')
      expect(result.data?.settings.enable_webhook_notifications).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
      expect(result.data?.settings.user_id).toBe('user-123')
    })

    it('should handle repository errors during reset', async () => {
      mockRepository.setShouldFail(true)

      const result = await service.resetUserNotificationSettings('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to reset notification settings')
      expect(result.statusCode).toBe(500)
    })

    it('should handle null data from repository', async () => {
      const originalUpdate = mockRepository.update
      mockRepository.update = jest.fn().mockResolvedValue({
        success: true,
        data: null
      })

      const result = await service.resetUserNotificationSettings('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to reset notification settings - no data returned')
      expect(result.statusCode).toBe(500)

      // Restore original method
      mockRepository.update = originalUpdate
    })

    it('should handle service layer exceptions', async () => {
      const throwingRepository = {
        update: jest.fn(() => {
          throw new Error('Unexpected error')
        })
      } as any

      const serviceWithThrowingRepo = new NotificationSettingsService(throwingRepository)
      const result = await serviceWithThrowingRepo.resetUserNotificationSettings('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should reset custom settings to defaults', async () => {
      const customSettings = createMockCustomNotificationSettings()
      mockRepository.setMockData([customSettings])

      const result = await service.resetUserNotificationSettings(customSettings.user_id)

      expect(result.success).toBe(true)
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
    beforeEach(() => {
      // Use repository with multiple users for statistics testing
      mockRepository = createMockNotificationSettingsRepositoryWithMultipleUsers()
      service = new NotificationSettingsService(mockRepository)
    })

    it('should return correct notification statistics', async () => {
      const result = await service.getNotificationStats()

      expect(result.success).toBe(true)
      expect(result.data?.totalUsers).toEqual(EXPECTED_NOTIFICATION_STATISTICS.totalUsers)
      expect(result.data?.enabledUsers).toEqual(EXPECTED_NOTIFICATION_STATISTICS.enabledUsers)
      expect(result.data?.disabledUsers).toEqual(EXPECTED_NOTIFICATION_STATISTICS.disabledUsers)
      expect(result.data?.enabledPercentage).toEqual(EXPECTED_NOTIFICATION_STATISTICS.enabledPercentage)
    })

    it('should handle repository errors', async () => {
      mockRepository.setShouldFail(true)

      const result = await service.getNotificationStats()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch notification statistics')
      expect(result.statusCode).toBe(500)
    })

    it('should handle empty repository', async () => {
      const emptyRepository = createEmptyMockNotificationSettingsRepository()
      const emptyService = new NotificationSettingsService(emptyRepository)

      const result = await emptyService.getNotificationStats()

      expect(result.success).toBe(true)
      expect(result.data?.totalUsers).toBe(0)
      expect(result.data?.enabledUsers).toBe(0)
      expect(result.data?.disabledUsers).toBe(0)
      expect(result.data?.enabledPercentage).toBe(0)
    })

    it('should calculate percentage correctly', async () => {
      // Test with different ratios
      const testCases = [
        { enabled: 1, total: 4, expectedPercentage: 25 },
        { enabled: 3, total: 4, expectedPercentage: 75 },
        { enabled: 0, total: 5, expectedPercentage: 0 },
        { enabled: 5, total: 5, expectedPercentage: 100 }
      ]

      for (const testCase of testCases) {
        const testSettings = Array.from({ length: testCase.total }, (_, i) => 
          createMockNotificationSettings({
            user_id: `user-${i}`,
            enable_webhook_notifications: i < testCase.enabled
          })
        )
        
        mockRepository.setMockData(testSettings)
        const result = await service.getNotificationStats()

        expect(result.success).toBe(true)
        expect(result.data?.enabledPercentage).toBe(testCase.expectedPercentage)
      }
    })

    it('should handle service layer exceptions', async () => {
      const throwingRepository = {
        getNotificationStats: jest.fn(() => {
          throw new Error('Unexpected error')
        })
      } as any

      const serviceWithThrowingRepo = new NotificationSettingsService(throwingRepository)
      const result = await serviceWithThrowingRepo.getNotificationStats()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('getUsersWithNotificationsEnabled', () => {
    beforeEach(() => {
      mockRepository = createMockNotificationSettingsRepositoryWithMultipleUsers()
      service = new NotificationSettingsService(mockRepository)
    })

    it('should return list of users with notifications enabled', async () => {
      const result = await service.getUsersWithNotificationsEnabled()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(expect.any(Array))
      expect(result.data?.length).toBeGreaterThan(0)
      
      // Verify all returned users have notifications enabled
      if (result.data) {
        for (const userId of result.data) {
          const userSettings = mockRepository.getAllMockData().find(s => s.user_id === userId)
          expect(userSettings?.enable_webhook_notifications).toBe(true)
        }
      }
    })

    it('should handle repository errors', async () => {
      mockRepository.setShouldFail(true)

      const result = await service.getUsersWithNotificationsEnabled()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch users with notifications enabled')
      expect(result.statusCode).toBe(500)
    })

    it('should return empty array when no users have notifications enabled', async () => {
      const emptyRepository = createEmptyMockNotificationSettingsRepository()
      const emptyService = new NotificationSettingsService(emptyRepository)

      const result = await emptyService.getUsersWithNotificationsEnabled()

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('should handle service layer exceptions', async () => {
      const throwingRepository = {
        findUsersWithNotificationsEnabled: jest.fn(() => {
          throw new Error('Unexpected error')
        })
      } as any

      const serviceWithThrowingRepo = new NotificationSettingsService(throwingRepository)
      const result = await serviceWithThrowingRepo.getUsersWithNotificationsEnabled()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('canUserReceiveNotifications', () => {
    it('should return true for user with notifications enabled', async () => {
      const enabledSettings = createMockNotificationSettings({ enable_webhook_notifications: true })
      mockRepository.setMockData([enabledSettings])

      const result = await service.canUserReceiveNotifications('user-123')

      expect(result.success).toBe(true)
      expect(result.data).toBe(true)
    })

    it('should return false for user with notifications disabled', async () => {
      const disabledSettings = createMockNotificationSettings({ enable_webhook_notifications: false })
      mockRepository.setMockData([disabledSettings])

      const result = await service.canUserReceiveNotifications(disabledSettings.user_id)

      expect(result.success).toBe(true)
      expect(result.data).toBe(false)
    })

    it('should return default value for user without settings', async () => {
      mockRepository.setShouldReturnEmpty(true)

      const result = await service.canUserReceiveNotifications('new-user')

      expect(result.success).toBe(true)
      expect(result.data).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
    })

    it('should handle repository errors', async () => {
      mockRepository.setShouldFail(true)

      const result = await service.canUserReceiveNotifications('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to check notification status')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service layer exceptions', async () => {
      const throwingRepository = {
        findByUserId: jest.fn(() => {
          throw new Error('Unexpected error')
        })
      } as any

      const serviceWithThrowingRepo = new NotificationSettingsService(throwingRepository)
      const result = await serviceWithThrowingRepo.canUserReceiveNotifications('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('error handling edge cases', () => {
    it('should handle repository returning undefined data', async () => {
      const undefinedDataRepository = {
        findByUserId: jest.fn().mockResolvedValue({
          success: true,
          data: undefined
        })
      } as any

      const serviceWithUndefinedRepo = new NotificationSettingsService(undefinedDataRepository)
      const result = await serviceWithUndefinedRepo.getUserNotificationSettings('user-123')

      expect(result.success).toBe(true)
      expect(result.data?.settings.user_id).toBe('user-123')
      expect(result.data?.settings.enable_webhook_notifications).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
    })

    it('should handle malformed validation errors gracefully', async () => {
      const invalidRequest = {
        enable_webhook_notifications: []
      }

      const result = await service.updateUserNotificationSettings('user-123', invalidRequest)

      expect(result.success).toBe(false)
      expect(result.error).toContain('enable_webhook_notifications must be a boolean')
      expect(result.statusCode).toBe(400)
    })
  })

  describe('dependency injection', () => {
    it('should work with different repository implementations', async () => {
      const failingRepository = createFailingMockNotificationSettingsRepository()
      const serviceWithFailingRepo = new NotificationSettingsService(failingRepository)

      const result = await serviceWithFailingRepo.getUserNotificationSettings('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch notification settings')
    })

    it('should delegate entity methods correctly', () => {
      const defaults = service.getDefaultSettings()

      expect(defaults).toEqual(DEFAULT_NOTIFICATION_SETTINGS)
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete notification preference workflow', async () => {
      const userId = 'workflow-user'

      // 1. Get initial settings (should return defaults)
      mockRepository.setShouldReturnEmpty(true)
      const initialResult = await service.getUserNotificationSettings(userId)
      expect(initialResult.success).toBe(true)
      expect(initialResult.data?.settings.enable_webhook_notifications).toBe(true)

      // 2. Update to disable notifications
      mockRepository.setShouldReturnEmpty(false)
      const updateRequest = { enable_webhook_notifications: false }
      const updateResult = await service.updateUserNotificationSettings(userId, updateRequest)
      expect(updateResult.success).toBe(true)
      expect(updateResult.data?.settings.enable_webhook_notifications).toBe(false)

      // 3. Check if user can receive notifications
      const canReceiveResult = await service.canUserReceiveNotifications(userId)
      expect(canReceiveResult.success).toBe(true)
      expect(canReceiveResult.data).toBe(false)

      // 4. Reset to defaults
      const resetResult = await service.resetUserNotificationSettings(userId)
      expect(resetResult.success).toBe(true)
      expect(resetResult.data?.settings.enable_webhook_notifications).toBe(true)
    })
  })
})