/**
 * Type-Safe EmojiSettingsRepository Mock
 * Clean Architecture準拠のEmojiSettings Repository Mock
 */

import { EmojiSettingsRepositoryInterface } from '@/lib/repositories/EmojiSettingsRepository'
import { RepositoryResult } from '@/lib/repositories/BaseRepository'
import { EmojiSetting } from '@/lib/entities/EmojiSettings'
import { BaseMockRepository, MockRepositoryResultBuilder } from '@/__tests__/utils/mockRepository'

export class MockEmojiSettingsRepository
  extends BaseMockRepository<EmojiSetting>
  implements EmojiSettingsRepositoryInterface {

  private numberResults: Map<string, RepositoryResult<number>> = new Map()

  // Repository Interface Implementation
  async findByUserId(userId: string): Promise<RepositoryResult<EmojiSetting | null>> {
    const result = this.getMockResult(`findByUserId:${userId}`)
    return result as RepositoryResult<EmojiSetting | null>
  }

  async upsert(settings: Omit<EmojiSetting, 'id' | 'created_at' | 'updated_at'>): Promise<RepositoryResult<EmojiSetting>> {
    const result = this.getMockResult(`upsert:${settings.user_id}`)
    return result as RepositoryResult<EmojiSetting>
  }

  async findAll(): Promise<RepositoryResult<EmojiSetting[]>> {
    const result = this.getMockResult('findAll')
    return result as RepositoryResult<EmojiSetting[]>
  }

  async findByEmoji(emojiName: string): Promise<RepositoryResult<EmojiSetting[]>> {
    const result = this.getMockResult(`findByEmoji:${emojiName}`)
    return result as RepositoryResult<EmojiSetting[]>
  }

  async countDefaultUsers(): Promise<RepositoryResult<number>> {
    return this.numberResults.get('countDefaultUsers') || { data: 0, error: null }
  }

  // Test Helper Methods
  setUserSettings(userId: string, settings: EmojiSetting): void {
    this.setMockSuccess(`findByUserId:${userId}`, settings)
  }

  setUserNotFound(userId: string): void {
    this.setMockResult(`findByUserId:${userId}`, MockRepositoryResultBuilder.notFound())
  }

  setUpsertSuccess(userId: string, result: EmojiSetting): void {
    this.setMockSuccess(`upsert:${userId}`, result)
  }

  setUpsertError(userId: string, error: string): void {
    this.setMockError(`upsert:${userId}`, error)
  }

  setFindAllSuccess(results: EmojiSetting[]): void {
    this.setMockSuccess('findAll', results)
  }

  setFindByEmojiSuccess(emoji: string, results: EmojiSetting[]): void {
    this.setMockSuccess(`findByEmoji:${emoji}`, results)
  }

  setCountDefaultUsersSuccess(count: number): void {
    this.numberResults.set('countDefaultUsers', { data: count, error: null })
  }

  setCountDefaultUsersError(error: string): void {
    this.numberResults.set('countDefaultUsers', { data: null, error: new Error(error) })
  }
}

// Factory Functions for Common Test Scenarios
export function createMockEmojiSettingsRepository(): MockEmojiSettingsRepository {
  return new MockEmojiSettingsRepository()
}

export function createMockEmojiSettingsRepositoryWithDefaults(): MockEmojiSettingsRepository {
  const mock = new MockEmojiSettingsRepository()

  // Set up default successful responses
  mock.setDefaultResult(MockRepositoryResultBuilder.notFound())

  return mock
}

export function createMockEmojiSettingsRepositoryWithMultipleUsers(): MockEmojiSettingsRepository {
  const mock = new MockEmojiSettingsRepository()

  // User 1 has settings
  mock.setUserSettings('user-1', {
    id: 'emoji-1',
    user_id: 'user-1',
    today_emoji: 'fire',
    tomorrow_emoji: 'calendar',
    later_emoji: 'memo',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  })

  // User 2 has different settings
  mock.setUserSettings('user-2', {
    id: 'emoji-2',
    user_id: 'user-2',
    today_emoji: 'rocket',
    tomorrow_emoji: 'alarm_clock',
    later_emoji: 'bookmark',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  })

  // User 3 has custom settings
  mock.setUserSettings('user-3', {
    id: 'emoji-3',
    user_id: 'user-3',
    today_emoji: 'fire',
    tomorrow_emoji: 'star',
    later_emoji: 'heart',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  })

  // User 4 has default settings
  mock.setUserSettings('user-4', {
    id: 'emoji-4',
    user_id: 'user-4',
    today_emoji: 'fire',
    tomorrow_emoji: 'calendar',
    later_emoji: 'memo',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  })

  // User 5 has default settings
  mock.setUserSettings('user-5', {
    id: 'emoji-5',
    user_id: 'user-5',
    today_emoji: 'fire',
    tomorrow_emoji: 'calendar',
    later_emoji: 'memo',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  })

  // Set up stats (2 default users out of 5 total)
  mock.setCountDefaultUsersSuccess(2)

  // Set up all settings for stats calculation
  const allSettings = [
    { id: 'emoji-1', user_id: 'user-1', today_emoji: 'fire', tomorrow_emoji: 'calendar', later_emoji: 'memo', created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
    { id: 'emoji-2', user_id: 'user-2', today_emoji: 'rocket', tomorrow_emoji: 'alarm_clock', later_emoji: 'bookmark', created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
    { id: 'emoji-3', user_id: 'user-3', today_emoji: 'fire', tomorrow_emoji: 'star', later_emoji: 'heart', created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
    { id: 'emoji-4', user_id: 'user-4', today_emoji: 'fire', tomorrow_emoji: 'calendar', later_emoji: 'memo', created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
    { id: 'emoji-5', user_id: 'user-5', today_emoji: 'fire', tomorrow_emoji: 'calendar', later_emoji: 'memo', created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' }
  ]
  mock.setFindAllSuccess(allSettings)

  // Set up findByEmoji for specific emojis
  mock.setFindByEmojiSuccess('fire', [allSettings[0], allSettings[2], allSettings[3], allSettings[4]]) // 4 users use 'fire'
  mock.setFindByEmojiSuccess('rocket', [allSettings[1]]) // 1 user uses 'rocket'
  mock.setFindByEmojiSuccess('calendar', [allSettings[0], allSettings[3], allSettings[4]]) // 3 users use 'calendar'
  mock.setFindByEmojiSuccess('star', [allSettings[2]]) // 1 user uses 'star'
  mock.setFindByEmojiSuccess('memo', [allSettings[0], allSettings[3], allSettings[4]]) // 3 users use 'memo'

  return mock
}

export function createEmptyMockEmojiSettingsRepository(): MockEmojiSettingsRepository {
  const mock = new MockEmojiSettingsRepository()

  // All users return not found
  mock.setDefaultResult(MockRepositoryResultBuilder.notFound())

  // Set up empty stats
  mock.setCountDefaultUsersSuccess(0)
  mock.setFindAllSuccess([])

  return mock
}

export function createFailingMockEmojiSettingsRepository(): MockEmojiSettingsRepository {
  const mock = new MockEmojiSettingsRepository()

  // All operations fail
  mock.setDefaultResult(MockRepositoryResultBuilder.error('Database connection failed'))

  return mock
}
