/**
 * Mock implementations for NotificationSettings testing
 * 通知設定テスト用のモック実装
 */

import { NotificationSettings } from '@/lib/entities/NotificationSettings'

// Mock repository result types to avoid importing BaseRepository
interface RepositoryResult<T> {
  success: boolean
  data?: T | null
  error?: {
    code: string
    message: string
    details?: string
  }
}

const RepositoryUtils = {
  success: <T>(data: T | null): RepositoryResult<T> => ({
    success: true,
    data
  }),
  failure: (error: { code: string; message: string; details?: string }): RepositoryResult<any> => ({
    success: false,
    error
  })
}

// Mock interface to avoid importing repository interface
interface NotificationSettingsRepositoryInterface {
  findByUserId(userId: string): Promise<RepositoryResult<NotificationSettings | null>>
  update(userId: string, settings: Omit<NotificationSettings, 'user_id' | 'updated_at'>): Promise<RepositoryResult<NotificationSettings>>
  getNotificationStats(): Promise<RepositoryResult<{
    totalUsers: number
    enabledUsers: number
    disabledUsers: number
  }>>
  findUsersWithNotificationsEnabled(): Promise<RepositoryResult<string[]>>
}

import {
  createMockNotificationSettings,
  createMockMultipleNotificationSettings,
  EXPECTED_NOTIFICATION_STATISTICS
} from '@/__tests__/fixtures/notification-settings.fixture'

/**
 * Mock NotificationSettingsRepository for testing
 */
export class MockNotificationSettingsRepository implements NotificationSettingsRepositoryInterface {
  private settings: Map<string, NotificationSettings> = new Map()
  private shouldFail = false
  private shouldReturnEmpty = false

  constructor() {
    // Initialize with some default data
    const defaultSetting = createMockNotificationSettings()
    this.settings.set(defaultSetting.user_id, defaultSetting)
  }

  // Mock control methods
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail
  }

  setShouldReturnEmpty(shouldReturnEmpty: boolean): void {
    this.shouldReturnEmpty = shouldReturnEmpty
  }

  setMockData(settings: NotificationSettings[]): void {
    this.settings.clear()
    settings.forEach(setting => {
      this.settings.set(setting.user_id, setting)
    })
  }

  clearMockData(): void {
    this.settings.clear()
  }

  getAllMockData(): NotificationSettings[] {
    return Array.from(this.settings.values())
  }

  // Repository interface implementation
  async findByUserId(userId: string): Promise<RepositoryResult<NotificationSettings | null>> {
    if (this.shouldFail) {
      return RepositoryUtils.failure({
        code: 'MOCK_ERROR',
        message: 'Mock repository error',
        details: 'Simulated failure'
      })
    }

    if (this.shouldReturnEmpty) {
      return RepositoryUtils.success(null)
    }

    const setting = this.settings.get(userId)
    return RepositoryUtils.success(setting || null)
  }

  async update(
    userId: string,
    settings: Omit<NotificationSettings, 'user_id' | 'updated_at'>
  ): Promise<RepositoryResult<NotificationSettings>> {
    if (this.shouldFail) {
      return RepositoryUtils.failure({
        code: 'MOCK_ERROR',
        message: 'Mock repository error',
        details: 'Simulated failure'
      })
    }

    const existingSetting = this.settings.get(userId)
    const now = new Date().toISOString()
    
    const newSetting: NotificationSettings = {
      user_id: userId,
      updated_at: now,
      ...settings
    }

    this.settings.set(userId, newSetting)
    return RepositoryUtils.success(newSetting)
  }

  async getNotificationStats(): Promise<RepositoryResult<{
    totalUsers: number
    enabledUsers: number
    disabledUsers: number
  }>> {
    if (this.shouldFail) {
      return RepositoryUtils.failure({
        code: 'MOCK_ERROR',
        message: 'Mock repository error',
        details: 'Simulated failure'
      })
    }

    if (this.shouldReturnEmpty) {
      return RepositoryUtils.success({
        totalUsers: 0,
        enabledUsers: 0,
        disabledUsers: 0
      })
    }

    const allSettings = Array.from(this.settings.values())
    const totalUsers = allSettings.length
    const enabledUsers = allSettings.filter(setting => setting.enable_webhook_notifications).length
    const disabledUsers = totalUsers - enabledUsers

    return RepositoryUtils.success({
      totalUsers,
      enabledUsers,
      disabledUsers
    })
  }

  async findUsersWithNotificationsEnabled(): Promise<RepositoryResult<string[]>> {
    if (this.shouldFail) {
      return RepositoryUtils.failure({
        code: 'MOCK_ERROR',
        message: 'Mock repository error',
        details: 'Simulated failure'
      })
    }

    if (this.shouldReturnEmpty) {
      return RepositoryUtils.success([])
    }

    const enabledUserIds = Array.from(this.settings.values())
      .filter(setting => setting.enable_webhook_notifications)
      .map(setting => setting.user_id)

    return RepositoryUtils.success(enabledUserIds)
  }
}

/**
 * Factory function to create a mock repository with predefined data
 */
export function createMockNotificationSettingsRepository(
  initialData?: NotificationSettings[]
): MockNotificationSettingsRepository {
  const repo = new MockNotificationSettingsRepository()
  if (initialData) {
    repo.setMockData(initialData)
  }
  return repo
}

/**
 * Create a mock repository with multiple test users
 */
export function createMockNotificationSettingsRepositoryWithMultipleUsers(): MockNotificationSettingsRepository {
  const repo = new MockNotificationSettingsRepository()
  repo.setMockData(createMockMultipleNotificationSettings())
  return repo
}

/**
 * Create a mock repository that always fails
 */
export function createFailingMockNotificationSettingsRepository(): MockNotificationSettingsRepository {
  const repo = new MockNotificationSettingsRepository()
  repo.setShouldFail(true)
  return repo
}

/**
 * Create a mock repository that returns empty results
 */
export function createEmptyMockNotificationSettingsRepository(): MockNotificationSettingsRepository {
  const repo = new MockNotificationSettingsRepository()
  repo.setShouldReturnEmpty(true)
  repo.clearMockData()
  return repo
}

/**
 * Mock service factory that returns mock repositories
 */
export function createMockServicesForNotificationSettings(mockRepo?: MockNotificationSettingsRepository) {
  const notificationSettingsRepo = mockRepo || createMockNotificationSettingsRepository()
  
  return {
    notificationSettingsService: {
      // Will be replaced with actual service mock if needed
    },
    notificationSettingsRepo
  }
}