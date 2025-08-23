/**
 * @jest-environment node
 */

import { NotificationSettingsRepository, NotificationSettingsRepositoryInterface } from '@/lib/repositories/NotificationSettingsRepository'
import { RepositoryContext, RepositoryUtils, RepositoryError } from '@/lib/repositories/BaseRepository'
import { SupabaseClient } from '@supabase/supabase-js'
import { mock, MockProxy } from 'jest-mock-extended'
import { createMockNotificationSettings } from '@/__tests__/fixtures/notification-settings.fixture'

describe('NotificationSettingsRepository', () => {
  let repository: NotificationSettingsRepository
  let mockSupabaseClient: MockProxy<SupabaseClient>
  let mockContext: MockProxy<RepositoryContext>

  beforeEach(() => {
    mockSupabaseClient = mock<SupabaseClient>()
    mockContext = mock<RepositoryContext>()
    mockContext.getServiceClient.mockReturnValue(mockSupabaseClient)
    repository = new NotificationSettingsRepository(mockContext)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findByUserId', () => {
    it('should return notification settings successfully', async () => {
      const mockUserData = {
        id: 'user-123',
        enable_webhook_notifications: true
      }
      const expectedSettings = createMockNotificationSettings({
        user_id: 'user-123',
        enable_webhook_notifications: true
      })

      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUserData, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByUserId('user-123')

      expect(result.data).toEqual(expectedSettings)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users')
      expect(mockFromResult.select).toHaveBeenCalledWith('id, enable_webhook_notifications')
      expect(mockFromResult.eq).toHaveBeenCalledWith('id', 'user-123')
      expect(mockFromResult.single).toHaveBeenCalled()
    })

    it('should return settings with default notification enabled when null', async () => {
      const mockUserData = {
        id: 'user-123',
        enable_webhook_notifications: null
      }
      const expectedSettings = createMockNotificationSettings({
        user_id: 'user-123',
        enable_webhook_notifications: true  // Default to true when null
      })

      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUserData, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByUserId('user-123')

      expect(result.data).toEqual(expectedSettings)
      expect(result.error).toBeNull()
    })

    it('should return settings with notifications disabled', async () => {
      const mockUserData = {
        id: 'user-123',
        enable_webhook_notifications: false
      }
      const expectedSettings = createMockNotificationSettings({
        user_id: 'user-123',
        enable_webhook_notifications: false
      })

      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUserData, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByUserId('user-123')

      expect(result.data).toEqual(expectedSettings)
      expect(result.error).toBeNull()
    })

    it('should return null when user not found (PGRST116)', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByUserId('non-existent-user')

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })

    it('should handle database error (non-PGRST116)', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'DB_ERROR', message: 'Database connection failed' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByUserId('user-123')

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Database connection failed')
    })

    it('should return null when no data returned', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByUserId('user-123')

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })

    it('should handle empty user ID', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows returned' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByUserId('')

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
      expect(mockFromResult.eq).toHaveBeenCalledWith('id', '')
    })
  })

  describe('update', () => {
    it('should update notification settings successfully', async () => {
      const settingsUpdate = { enable_webhook_notifications: false }
      const mockUpdatedUserData = {
        id: 'user-123',
        enable_webhook_notifications: false
      }
      const expectedSettings = createMockNotificationSettings({
        user_id: 'user-123',
        enable_webhook_notifications: false
      })

      const mockFromResult = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUpdatedUserData, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.update('user-123', settingsUpdate)

      expect(result.data).toEqual(expectedSettings)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users')
      expect(mockFromResult.update).toHaveBeenCalledWith({
        enable_webhook_notifications: false
      })
      expect(mockFromResult.eq).toHaveBeenCalledWith('id', 'user-123')
      expect(mockFromResult.select).toHaveBeenCalledWith('id, enable_webhook_notifications')
    })

    it('should enable notifications successfully', async () => {
      const settingsUpdate = { enable_webhook_notifications: true }
      const mockUpdatedUserData = {
        id: 'user-123',
        enable_webhook_notifications: true
      }
      const expectedSettings = createMockNotificationSettings({
        user_id: 'user-123',
        enable_webhook_notifications: true
      })

      const mockFromResult = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUpdatedUserData, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.update('user-123', settingsUpdate)

      expect(result.data).toEqual(expectedSettings)
      expect(result.error).toBeNull()
    })

    it('should handle update failure', async () => {
      const settingsUpdate = { enable_webhook_notifications: false }

      const mockFromResult = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'UPDATE_ERROR', message: 'Failed to update user' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.update('user-123', settingsUpdate)

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Failed to update user')
    })

    it('should handle no data returned after update', async () => {
      const settingsUpdate = { enable_webhook_notifications: true }

      const mockFromResult = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.update('user-123', settingsUpdate)

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Failed to update notification settings - no data returned')
      expect((result.error as any)?._code).toBe('UPDATE_FAILED')
    })

    it('should handle user not found during update', async () => {
      const settingsUpdate = { enable_webhook_notifications: true }

      const mockFromResult = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'User not found' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.update('non-existent-user', settingsUpdate)

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('User not found')
    })
  })

  describe('getNotificationStats', () => {
    it('should return notification statistics successfully', async () => {
      const mockUsersData = [
        { enable_webhook_notifications: true },
        { enable_webhook_notifications: true },
        { enable_webhook_notifications: false },
        { enable_webhook_notifications: true },
        { enable_webhook_notifications: false }
      ]
      const expectedStats = {
        totalUsers: 5,
        enabledUsers: 3,
        disabledUsers: 2
      }

      const mockFromResult = {
        select: jest.fn().mockResolvedValue({ data: mockUsersData, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.getNotificationStats()

      expect(result.data).toEqual(expectedStats)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users')
      expect(mockFromResult.select).toHaveBeenCalledWith('enable_webhook_notifications')
    })

    it('should return zero stats when no users exist', async () => {
      const expectedStats = {
        totalUsers: 0,
        enabledUsers: 0,
        disabledUsers: 0
      }

      const mockFromResult = {
        select: jest.fn().mockResolvedValue({ data: [], error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.getNotificationStats()

      expect(result.data).toEqual(expectedStats)
      expect(result.error).toBeNull()
    })

    it('should handle all users enabled', async () => {
      const mockUsersData = [
        { enable_webhook_notifications: true },
        { enable_webhook_notifications: true },
        { enable_webhook_notifications: true }
      ]
      const expectedStats = {
        totalUsers: 3,
        enabledUsers: 3,
        disabledUsers: 0
      }

      const mockFromResult = {
        select: jest.fn().mockResolvedValue({ data: mockUsersData, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.getNotificationStats()

      expect(result.data).toEqual(expectedStats)
      expect(result.error).toBeNull()
    })

    it('should handle all users disabled', async () => {
      const mockUsersData = [
        { enable_webhook_notifications: false },
        { enable_webhook_notifications: false }
      ]
      const expectedStats = {
        totalUsers: 2,
        enabledUsers: 0,
        disabledUsers: 2
      }

      const mockFromResult = {
        select: jest.fn().mockResolvedValue({ data: mockUsersData, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.getNotificationStats()

      expect(result.data).toEqual(expectedStats)
      expect(result.error).toBeNull()
    })

    it('should handle null data gracefully', async () => {
      const expectedStats = {
        totalUsers: 0,
        enabledUsers: 0,
        disabledUsers: 0
      }

      const mockFromResult = {
        select: jest.fn().mockResolvedValue({ data: null, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.getNotificationStats()

      expect(result.data).toEqual(expectedStats)
      expect(result.error).toBeNull()
    })

    it('should handle database error in stats query', async () => {
      const mockFromResult = {
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'QUERY_ERROR', message: 'Stats query failed' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.getNotificationStats()

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Stats query failed')
    })

    it('should handle mixed null and boolean values', async () => {
      const mockUsersData = [
        { enable_webhook_notifications: true },
        { enable_webhook_notifications: null },  // Should be treated as false
        { enable_webhook_notifications: false },
        { enable_webhook_notifications: undefined }  // Should be treated as false
      ]
      const expectedStats = {
        totalUsers: 4,
        enabledUsers: 1,  // Only explicit true counts
        disabledUsers: 3
      }

      const mockFromResult = {
        select: jest.fn().mockResolvedValue({ data: mockUsersData, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.getNotificationStats()

      expect(result.data).toEqual(expectedStats)
      expect(result.error).toBeNull()
    })
  })

  describe('findUsersWithNotificationsEnabled', () => {
    it('should return enabled user IDs successfully', async () => {
      const mockEnabledUsers = [
        { id: 'user-1' },
        { id: 'user-3' },
        { id: 'user-5' }
      ]
      const expectedUserIds = ['user-1', 'user-3', 'user-5']

      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockEnabledUsers, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findUsersWithNotificationsEnabled()

      expect(result.data).toEqual(expectedUserIds)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users')
      expect(mockFromResult.select).toHaveBeenCalledWith('id')
      expect(mockFromResult.eq).toHaveBeenCalledWith('enable_webhook_notifications', true)
    })

    it('should return empty array when no users have notifications enabled', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findUsersWithNotificationsEnabled()

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })

    it('should handle null data gracefully', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findUsersWithNotificationsEnabled()

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })

    it('should handle database error in enabled users query', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'QUERY_ERROR', message: 'Enabled users query failed' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findUsersWithNotificationsEnabled()

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Enabled users query failed')
    })

    it('should handle large number of enabled users', async () => {
      const largeUserSet = Array.from({ length: 1000 }, (_, i) => ({ id: `user-${i}` }))
      const expectedUserIds = Array.from({ length: 1000 }, (_, i) => `user-${i}`)

      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: largeUserSet, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findUsersWithNotificationsEnabled()

      expect(result.data).toEqual(expectedUserIds)
      expect(result.error).toBeNull()
    })

    it('should handle users with special character IDs', async () => {
      const mockEnabledUsers = [
        { id: 'user-with-dash-123' },
        { id: 'user_with_underscore_456' },
        { id: 'user.with.dots.789' }
      ]
      const expectedUserIds = [
        'user-with-dash-123',
        'user_with_underscore_456',
        'user.with.dots.789'
      ]

      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockEnabledUsers, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findUsersWithNotificationsEnabled()

      expect(result.data).toEqual(expectedUserIds)
      expect(result.error).toBeNull()
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Network error'))
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      await expect(repository.findByUserId('user-123')).rejects.toThrow('Network error')
    })

    it('should handle concurrent update operations', async () => {
      const settingsUpdate = { enable_webhook_notifications: true }
      const mockUpdatedUserData = {
        id: 'user-123',
        enable_webhook_notifications: true
      }

      const mockFromResult = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUpdatedUserData, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      // Simulate concurrent update operations
      const operations = Array.from({ length: 3 }, () =>
        repository.update('user-123', settingsUpdate)
      )

      const results = await Promise.all(operations)

      results.forEach(result => {
        expect(result.data?.enable_webhook_notifications).toBe(true)
        expect(result.error).toBeNull()
      })
    })

    it('should handle malformed user data', async () => {
      const malformedUserData = {
        // Missing id field
        enable_webhook_notifications: true
      }

      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: malformedUserData, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByUserId('user-123')

      // Should still create NotificationSettings with undefined user_id
      expect(result.data?.enable_webhook_notifications).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should handle timeout errors', async () => {
      const mockFromResult = {
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'TIMEOUT_ERROR', message: 'Query timeout' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.getNotificationStats()

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Query timeout')
    })

    it('should handle very large datasets in stats', async () => {
      // Simulate 10,000 users with random notification settings
      const largeUserSet = Array.from({ length: 10000 }, (_, i) => ({
        enable_webhook_notifications: i % 3 === 0  // 1/3 enabled
      }))
      const expectedStats = {
        totalUsers: 10000,
        enabledUsers: Math.floor(10000 / 3) + 1,  // 3334 users (indices 0,3,6,...)
        disabledUsers: 10000 - (Math.floor(10000 / 3) + 1)
      }

      const mockFromResult = {
        select: jest.fn().mockResolvedValue({ data: largeUserSet, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.getNotificationStats()

      expect(result.data?.totalUsers).toBe(10000)
      expect(result.data?.enabledUsers).toBe(3334)
      expect(result.data?.disabledUsers).toBe(6666)
      expect(result.error).toBeNull()
    })
  })
})
