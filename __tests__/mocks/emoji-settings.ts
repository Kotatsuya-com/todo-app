/**
 * Mock implementations for EmojiSettings testing
 * 絵文字設定テスト用のモック実装
 */

import { EmojiSetting } from '@/lib/entities/EmojiSettings'

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
interface EmojiSettingsRepositoryInterface {
  findByUserId(userId: string): Promise<RepositoryResult<EmojiSetting>>
  upsert(settings: Omit<EmojiSetting, 'id' | 'created_at' | 'updated_at'>): Promise<RepositoryResult<EmojiSetting>>
}

import {
  createMockEmojiSetting,
  createMockMultipleEmojiSettings
} from '@/__tests__/fixtures/emoji-settings.fixture'

/**
 * Mock EmojiSettingsRepository for testing
 */
export class MockEmojiSettingsRepository implements EmojiSettingsRepositoryInterface {
  private settings: Map<string, EmojiSetting> = new Map()
  private shouldFail = false
  private shouldReturnEmpty = false

  constructor() {
    // Initialize with some default data
    const defaultSetting = createMockEmojiSetting()
    this.settings.set(defaultSetting.user_id, defaultSetting)
  }

  // Mock control methods
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail
  }

  setShouldReturnEmpty(shouldReturnEmpty: boolean): void {
    this.shouldReturnEmpty = shouldReturnEmpty
  }

  setMockData(settings: EmojiSetting[]): void {
    this.settings.clear()
    settings.forEach(setting => {
      this.settings.set(setting.user_id, setting)
    })
  }

  clearMockData(): void {
    this.settings.clear()
  }

  getAllMockData(): EmojiSetting[] {
    return Array.from(this.settings.values())
  }

  // Repository interface implementation
  async findByUserId(userId: string): Promise<RepositoryResult<EmojiSetting>> {
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

  async upsert(
    settings: Omit<EmojiSetting, 'id' | 'created_at' | 'updated_at'>
  ): Promise<RepositoryResult<EmojiSetting>> {
    if (this.shouldFail) {
      return RepositoryUtils.failure({
        code: 'MOCK_ERROR',
        message: 'Mock repository error',
        details: 'Simulated failure'
      })
    }

    const existingSetting = this.settings.get(settings.user_id)
    const now = new Date().toISOString()
    
    const newSetting: EmojiSetting = {
      id: existingSetting?.id || `emoji-setting-${Date.now()}`,
      created_at: existingSetting?.created_at || now,
      updated_at: now,
      ...settings
    }

    this.settings.set(settings.user_id, newSetting)
    return RepositoryUtils.success(newSetting)
  }

  async deleteByUserId(userId: string): Promise<RepositoryResult<void>> {
    if (this.shouldFail) {
      return RepositoryUtils.failure({
        code: 'MOCK_ERROR',
        message: 'Mock repository error',
        details: 'Simulated failure'
      })
    }

    this.settings.delete(userId)
    return RepositoryUtils.success(undefined)
  }

  async findAll(): Promise<RepositoryResult<EmojiSetting[]>> {
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

    return RepositoryUtils.success(Array.from(this.settings.values()))
  }

  async findByEmoji(emojiName: string): Promise<RepositoryResult<EmojiSetting[]>> {
    if (this.shouldFail) {
      return RepositoryUtils.failure({
        code: 'MOCK_ERROR',
        message: 'Mock repository error',
        details: 'Simulated failure'
      })
    }

    const matchingSettings = Array.from(this.settings.values()).filter(setting =>
      setting.today_emoji === emojiName ||
      setting.tomorrow_emoji === emojiName ||
      setting.later_emoji === emojiName
    )

    return RepositoryUtils.success(matchingSettings)
  }

  async countDefaultUsers(): Promise<RepositoryResult<number>> {
    if (this.shouldFail) {
      return RepositoryUtils.failure({
        code: 'MOCK_ERROR',
        message: 'Mock repository error',
        details: 'Simulated failure'
      })
    }

    const defaultCount = Array.from(this.settings.values()).filter(setting =>
      setting.today_emoji === 'fire' &&
      setting.tomorrow_emoji === 'calendar' &&
      setting.later_emoji === 'memo'
    ).length

    return RepositoryUtils.success(defaultCount)
  }
}

/**
 * Factory function to create a mock repository with predefined data
 */
export function createMockEmojiSettingsRepository(
  initialData?: EmojiSetting[]
): MockEmojiSettingsRepository {
  const repo = new MockEmojiSettingsRepository()
  if (initialData) {
    repo.setMockData(initialData)
  }
  return repo
}

/**
 * Create a mock repository with multiple test users
 */
export function createMockEmojiSettingsRepositoryWithMultipleUsers(): MockEmojiSettingsRepository {
  const repo = new MockEmojiSettingsRepository()
  repo.setMockData(createMockMultipleEmojiSettings())
  return repo
}

/**
 * Create a mock repository that always fails
 */
export function createFailingMockEmojiSettingsRepository(): MockEmojiSettingsRepository {
  const repo = new MockEmojiSettingsRepository()
  repo.setShouldFail(true)
  return repo
}

/**
 * Create a mock repository that returns empty results
 */
export function createEmptyMockEmojiSettingsRepository(): MockEmojiSettingsRepository {
  const repo = new MockEmojiSettingsRepository()
  repo.setShouldReturnEmpty(true)
  repo.clearMockData()
  return repo
}

/**
 * Mock service factory that returns mock repositories
 */
export function createMockServicesForEmojiSettings(mockRepo?: MockEmojiSettingsRepository) {
  const emojiSettingsRepo = mockRepo || createMockEmojiSettingsRepository()
  
  return {
    emojiSettingsService: {
      // Will be replaced with actual service mock if needed
    },
    emojiSettingsRepo
  }
}