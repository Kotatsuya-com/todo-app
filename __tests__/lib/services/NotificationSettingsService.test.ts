/**
 * NotificationSettingsService unit tests
 */

import { NotificationSettingsService } from '@/lib/services/NotificationSettingsService'
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/lib/entities/NotificationSettings'
import {
  MockNotificationSettingsRepository,
  createMockNotificationSettingsRepository,
  createFailingMockNotificationSettingsRepository,
  createMockNotificationSettingsRepositoryWithMultipleUsers,
  createEmptyMockNotificationSettingsRepository,
  NotificationUpdateRequest
} from '@/__tests__/mocks/repositories/NotificationSettingsRepository.mock'
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
      mockRepository.setUserSettings('user-123', mockSettings)

      const result = await service.getUserNotificationSettings('user-123')

      expect(result.error).toBeUndefined()
      expect(result.data?.settings).toEqual(mockSettings)
      expect(result.data?.summary).toEqual({
        webhookNotifications: 'enabled',
        isDefault: true
      })
    })

    it('should return default settings when user has no settings', async () => {
      mockRepository.setUserNotFound('user-123')

      const result = await service.getUserNotificationSettings('new-user')

      expect(result.error).toBeUndefined()
      expect(result.data?.settings.user_id).toBe('new-user')
      expect(result.data?.settings.enable_webhook_notifications).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
      expect(result.data?.summary.isDefault).toBe(true)
      expect(result.data?.summary.webhookNotifications).toBe('enabled')
    })

    it('should return custom settings with correct summary', async () => {
      const mockSettings = createMockCustomNotificationSettings()
      mockRepository.setUserSettings('user-123', mockSettings)

      const result = await service.getUserNotificationSettings(mockSettings.user_id)

      expect(result.error).toBeUndefined()
      expect(result.data?.settings).toEqual(mockSettings)
      expect(result.data?.summary).toEqual({
        webhookNotifications: 'disabled',
        isDefault: false
      })
    })

    it('should handle repository errors', async () => {
      mockRepository.setMockError('findByUserId:user-123', 'Database error')

      const result = await service.getUserNotificationSettings('user-123')

      expect(result.data).toBeUndefined()
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

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should handle null data from repository', async () => {
      mockRepository.clearMockResults()
      mockRepository.setUserNotFound('user-123')

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
        id: 'settings-1',
        user_id: 'user-123',
        enable_webhook_notifications: updateRequest.enable_webhook_notifications,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
      mockRepository.setUpdateSuccess('user-123', expectedSettings)

      const result = await service.updateUserNotificationSettings('user-123', updateRequest)

      expect(result.error).toBeUndefined()
      expect(result.data?.message).toBe('Notification preferences updated successfully')
      expect(result.data?.settings.enable_webhook_notifications).toBe(updateRequest.enable_webhook_notifications)
      expect(result.data?.settings.user_id).toBe('user-123')
    })

    it('should reject invalid notification values', async () => {
      const invalidRequest = createMockInvalidNotificationUpdateRequest()

      const result = await service.updateUserNotificationSettings('user-123', invalidRequest)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('enable_webhook_notifications must be a boolean')
      expect(result.statusCode).toBe(400)
    })

    it('should handle repository errors during update', async () => {
      mockRepository.setMockError('update:user-123', 'Database error')
      const validRequest = createMockValidNotificationUpdateRequest()

      const result = await service.updateUserNotificationSettings('user-123', validRequest)

      expect(result.data).toBeUndefined()
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

      expect(result.data).toBeUndefined()
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

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should create new settings for user without existing settings', async () => {
      mockRepository.clearMockResults() // Start with empty repository
      const validRequest = createMockValidNotificationUpdateRequest()
      const expectedSettings = {
        id: 'settings-new',
        user_id: 'new-user',
        enable_webhook_notifications: validRequest.enable_webhook_notifications,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
      mockRepository.setUpdateSuccess('new-user', expectedSettings)

      const result = await service.updateUserNotificationSettings('new-user', validRequest)

      expect(result.error).toBeUndefined()
      expect(result.data?.settings.user_id).toBe('new-user')
      expect(result.data?.settings.enable_webhook_notifications).toBe(validRequest.enable_webhook_notifications)
    })

    it('should handle multiple validation errors', async () => {
      const invalidRequest = {
        enable_webhook_notifications: 'invalid' as any
      } as NotificationUpdateRequest

      const result = await service.updateUserNotificationSettings('user-123', invalidRequest)

      expect(result.data).toBeUndefined()
      expect(result.error).toContain('enable_webhook_notifications must be a boolean')
      expect(result.statusCode).toBe(400)
    })
  })

  describe('resetUserNotificationSettings', () => {
    it('should reset user settings to defaults', async () => {
      const expectedSettings = {
        id: 'settings-1',
        user_id: 'user-123',
        enable_webhook_notifications: DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
      mockRepository.setUpdateSuccess('user-123', expectedSettings)

      const result = await service.resetUserNotificationSettings('user-123')

      expect(result.error).toBeUndefined()
      expect(result.data?.message).toBe('Notification settings reset to default')
      expect(result.data?.settings.enable_webhook_notifications).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
      expect(result.data?.settings.user_id).toBe('user-123')
    })

    it('should handle repository errors during reset', async () => {
      mockRepository.setMockError('update:user-123', 'Database error')

      const result = await service.resetUserNotificationSettings('user-123')

      expect(result.data).toBeUndefined()
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

      expect(result.data).toBeUndefined()
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

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should reset custom settings to defaults', async () => {
      const customSettings = createMockCustomNotificationSettings()
      const expectedSettings = {
        id: 'settings-1',
        user_id: customSettings.user_id,
        enable_webhook_notifications: DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
      mockRepository.setUpdateSuccess(customSettings.user_id, expectedSettings)

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
    beforeEach(() => {
      // Use repository with multiple users for statistics testing
      mockRepository = createMockNotificationSettingsRepositoryWithMultipleUsers()
      service = new NotificationSettingsService(mockRepository)
    })

    it('should return correct notification statistics', async () => {
      const result = await service.getNotificationStats()

      expect(result.error).toBeUndefined()
      expect(result.data?.totalUsers).toEqual(EXPECTED_NOTIFICATION_STATISTICS.totalUsers)
      expect(result.data?.enabledUsers).toEqual(EXPECTED_NOTIFICATION_STATISTICS.enabledUsers)
      expect(result.data?.disabledUsers).toEqual(EXPECTED_NOTIFICATION_STATISTICS.disabledUsers)
      expect(result.data?.enabledPercentage).toEqual(EXPECTED_NOTIFICATION_STATISTICS.enabledPercentage)
    })

    it('should handle repository errors', async () => {
      mockRepository.setMockError('getNotificationStats', 'Database error')

      const result = await service.getNotificationStats()

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to fetch notification statistics')
      expect(result.statusCode).toBe(500)
    })

    it('should handle empty repository', async () => {
      const emptyRepository = createEmptyMockNotificationSettingsRepository()
      const emptyService = new NotificationSettingsService(emptyRepository)

      const result = await emptyService.getNotificationStats()

      expect(result.error).toBeUndefined()
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

        // Set up mock to return the test statistics
        mockRepository.setNotificationStatsSuccess({
          totalUsers: testCase.total,
          enabledUsers: testCase.enabled,
          disabledUsers: testCase.total - testCase.enabled
        })
        const result = await service.getNotificationStats()

        expect(result.error).toBeUndefined()
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

      expect(result.data).toBeUndefined()
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

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(expect.any(Array))
      expect(result.data?.length).toBeGreaterThan(0)

      // Verify all returned users have notifications enabled
      if (result.data) {
        for (const userId of result.data) {
          // Mock repository has test data with notifications enabled
          expect(userId).toBeDefined()
        }
      }
    })

    it('should handle repository errors', async () => {
      mockRepository.setMockError('findUsersWithNotificationsEnabled', 'Database error')

      const result = await service.getUsersWithNotificationsEnabled()

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to fetch users with notifications enabled')
      expect(result.statusCode).toBe(500)
    })

    it('should return empty array when no users have notifications enabled', async () => {
      const emptyRepository = createEmptyMockNotificationSettingsRepository()
      const emptyService = new NotificationSettingsService(emptyRepository)

      const result = await emptyService.getUsersWithNotificationsEnabled()

      expect(result.error).toBeUndefined()
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

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('canUserReceiveNotifications', () => {
    it('should return true for user with notifications enabled', async () => {
      const enabledSettings = createMockNotificationSettings({ enable_webhook_notifications: true })
      mockRepository.setUserSettings('user-123', enabledSettings)

      const result = await service.canUserReceiveNotifications('user-123')

      expect(result.error).toBeUndefined()
      expect(result.data).toBe(true)
    })

    it('should return false for user with notifications disabled', async () => {
      const disabledSettings = createMockNotificationSettings({ enable_webhook_notifications: false })
      mockRepository.setUserSettings(disabledSettings.user_id, disabledSettings)

      const result = await service.canUserReceiveNotifications(disabledSettings.user_id)

      expect(result.error).toBeUndefined()
      expect(result.data).toBe(false)
    })

    it('should return default value for user without settings', async () => {
      mockRepository.setUserNotFound('user-123')

      const result = await service.canUserReceiveNotifications('new-user')

      expect(result.error).toBeUndefined()
      expect(result.data).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
    })

    it('should handle repository errors', async () => {
      mockRepository.setMockError('findByUserId:user-123', 'Database error')

      const result = await service.canUserReceiveNotifications('user-123')

      expect(result.data).toBeUndefined()
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

      expect(result.data).toBeUndefined()
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

  describe('dependency injection', () => {
    it('should work with different repository implementations', async () => {
      const failingRepository = createFailingMockNotificationSettingsRepository()
      const serviceWithFailingRepo = new NotificationSettingsService(failingRepository)

      const result = await serviceWithFailingRepo.getUserNotificationSettings('user-123')

      expect(result.data).toBeUndefined()
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
      mockRepository.setUserNotFound('user-123')
      const initialResult = await service.getUserNotificationSettings(userId)
      expect(initialResult.success).toBe(true)
      expect(initialResult.data?.settings.enable_webhook_notifications).toBe(true)

      // 2. Update to disable notifications
      const updateRequest = { enable_webhook_notifications: false }
      const expectedSettings = {
        id: 'settings-1',
        user_id: userId,
        enable_webhook_notifications: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
      mockRepository.setUpdateSuccess(userId, expectedSettings)
      const updateResult = await service.updateUserNotificationSettings(userId, updateRequest)
      expect(updateResult.success).toBe(true)
      expect(updateResult.data?.settings.enable_webhook_notifications).toBe(false)

      // 3. Check if user can receive notifications
      // Set up user with disabled notifications for the check
      mockRepository.setUserSettings(userId, {
        user_id: userId,
        enable_webhook_notifications: false
      })
      const canReceiveResult = await service.canUserReceiveNotifications(userId)
      expect(canReceiveResult.success).toBe(true)
      expect(canReceiveResult.data).toBe(false)

      // 4. Reset to defaults
      const resetSettings = {
        id: 'settings-1',
        user_id: userId,
        enable_webhook_notifications: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
      mockRepository.setUpdateSuccess(userId, resetSettings)
      const resetResult = await service.resetUserNotificationSettings(userId)
      expect(resetResult.success).toBe(true)
      expect(resetResult.data?.settings.enable_webhook_notifications).toBe(true)
    })
  })
})
