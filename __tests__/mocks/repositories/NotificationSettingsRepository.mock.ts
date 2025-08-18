/**
 * Type-Safe NotificationSettingsRepository Mock
 * Clean Architecture準拠のNotificationSettings Repository Mock
 */

import { NotificationSettingsRepositoryInterface } from '@/lib/repositories/NotificationSettingsRepository'
import { RepositoryResult } from '@/lib/repositories/BaseRepository'
import { NotificationSettings } from '@/lib/entities/NotificationSettings'
import { BaseMockRepository, MockRepositoryResultBuilder } from '@/__tests__/utils/mockRepository'

export interface NotificationUpdateRequest {
  enable_webhook_notifications: boolean
}

export class MockNotificationSettingsRepository
  extends BaseMockRepository<NotificationSettings>
  implements NotificationSettingsRepositoryInterface {

  private statsResults: Map<string, RepositoryResult<{ totalUsers: number; enabledUsers: number; disabledUsers: number }>> = new Map()
  private stringArrayResults: Map<string, RepositoryResult<string[]>> = new Map()

  // Repository Interface Implementation
  async findByUserId(userId: string): Promise<RepositoryResult<NotificationSettings | null>> {
    const result = this.getMockResult(`findByUserId:${userId}`)
    return result as RepositoryResult<NotificationSettings | null>
  }

  async update(
    userId: string,
    settings: Omit<NotificationSettings, 'user_id'>
  ): Promise<RepositoryResult<NotificationSettings>> {
    const result = this.getMockResult(`update:${userId}`)
    return result as RepositoryResult<NotificationSettings>
  }

  async getNotificationStats(): Promise<RepositoryResult<{
    totalUsers: number
    enabledUsers: number
    disabledUsers: number
  }>> {
    return this.statsResults.get('getNotificationStats') || {
      data: { totalUsers: 0, enabledUsers: 0, disabledUsers: 0 },
      error: null
    }
  }

  async findUsersWithNotificationsEnabled(): Promise<RepositoryResult<string[]>> {
    return this.stringArrayResults.get('findUsersWithNotificationsEnabled') || {
      data: [],
      error: null
    }
  }

  // Test Helper Methods
  setUserSettings(userId: string, settings: NotificationSettings): void {
    this.setMockSuccess(`findByUserId:${userId}`, settings)
  }

  setUserNotFound(userId: string): void {
    this.setMockResult(`findByUserId:${userId}`, MockRepositoryResultBuilder.notFound())
  }

  setUpdateSuccess(userId: string, result: NotificationSettings): void {
    this.setMockSuccess(`update:${userId}`, result)
  }

  setUpdateError(userId: string, error: string): void {
    this.setMockError(`update:${userId}`, error)
  }

  setNotificationStatsSuccess(stats: { totalUsers: number; enabledUsers: number; disabledUsers: number }): void {
    this.statsResults.set('getNotificationStats', { data: stats, error: null })
  }

  setUsersWithNotificationsEnabledSuccess(userIds: string[]): void {
    this.stringArrayResults.set('findUsersWithNotificationsEnabled', { data: userIds, error: null })
  }

  setNotificationStatsError(error: string): void {
    this.statsResults.set('getNotificationStats', { data: null, error: new Error(error) })
  }

  setUsersWithNotificationsEnabledError(error: string): void {
    this.stringArrayResults.set('findUsersWithNotificationsEnabled', { data: null, error: new Error(error) })
  }

  // Legacy Test Helper Methods for Migration
  clearMockData(): void {
    this.clearMockResults()
  }
}

// Factory Functions for Common Test Scenarios
export function createMockNotificationSettingsRepository(): MockNotificationSettingsRepository {
  return new MockNotificationSettingsRepository()
}

export function createMockNotificationSettingsRepositoryWithDefaults(): MockNotificationSettingsRepository {
  const mock = new MockNotificationSettingsRepository()

  // Set up default responses
  mock.setDefaultResult(MockRepositoryResultBuilder.notFound())

  return mock
}

export function createFailingMockNotificationSettingsRepository(): MockNotificationSettingsRepository {
  const mock = new MockNotificationSettingsRepository()

  // All operations fail
  mock.setDefaultResult(MockRepositoryResultBuilder.error('Database connection failed'))

  return mock
}

export function createMockNotificationSettingsRepositoryWithMultipleUsers(): MockNotificationSettingsRepository {
  const mock = new MockNotificationSettingsRepository()

  // Set up multiple users with different settings
  mock.setUserSettings('user-1', {
    user_id: 'user-1',
    enable_webhook_notifications: true
  })

  mock.setUserSettings('user-2', {
    user_id: 'user-2',
    enable_webhook_notifications: false
  })

  mock.setUserSettings('user-3', {
    user_id: 'user-3',
    enable_webhook_notifications: true
  })

  mock.setUserSettings('user-4', {
    user_id: 'user-4',
    enable_webhook_notifications: false
  })

  mock.setUserSettings('user-5', {
    user_id: 'user-5',
    enable_webhook_notifications: true
  })

  // Set up notification stats (3 enabled out of 5 total)
  mock.setNotificationStatsSuccess({
    totalUsers: 5,
    enabledUsers: 3,
    disabledUsers: 2
  })

  // Set up users with notifications enabled
  mock.setUsersWithNotificationsEnabledSuccess(['user-1', 'user-3', 'user-5'])

  return mock
}

export function createEmptyMockNotificationSettingsRepository(): MockNotificationSettingsRepository {
  const mock = new MockNotificationSettingsRepository()

  // Return not found for all users
  mock.setDefaultResult(MockRepositoryResultBuilder.notFound())

  // Set up empty stats
  mock.setNotificationStatsSuccess({
    totalUsers: 0,
    enabledUsers: 0,
    disabledUsers: 0
  })

  // Set up empty users with notifications enabled
  mock.setUsersWithNotificationsEnabledSuccess([])

  return mock
}
