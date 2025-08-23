/**
 * @jest-environment node
 */

import { EmojiSettingsRepository, EmojiSettingsRepositoryInterface } from '@/lib/repositories/EmojiSettingsRepository'
import { RepositoryContext, RepositoryUtils } from '@/lib/repositories/BaseRepository'
import { SupabaseClient } from '@supabase/supabase-js'
import { mock, MockProxy } from 'jest-mock-extended'
import { createMockEmojiSetting } from '@/__tests__/fixtures/emoji-settings.fixture'

describe('EmojiSettingsRepository', () => {
  let repository: EmojiSettingsRepository
  let mockSupabaseClient: MockProxy<SupabaseClient>
  let mockContext: MockProxy<RepositoryContext>

  beforeEach(() => {
    mockSupabaseClient = mock<SupabaseClient>()
    mockContext = mock<RepositoryContext>()
    mockContext.getServiceClient.mockReturnValue(mockSupabaseClient)
    repository = new EmojiSettingsRepository(mockContext)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findByUserId', () => {
    it('should return emoji settings successfully', async () => {
      const mockSettings = createMockEmojiSetting()
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSettings, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByUserId('user-123')

      expect(result.data).toEqual(mockSettings)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_emoji_settings')
      expect(mockFromResult.select).toHaveBeenCalledWith('id, user_id, today_emoji, tomorrow_emoji, later_emoji, created_at, updated_at')
      expect(mockFromResult.eq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(mockFromResult.single).toHaveBeenCalled()
    })

    it('should return null when no settings found (PGRST116)', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByUserId('user-without-settings')

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
      expect(mockFromResult.eq).toHaveBeenCalledWith('user_id', '')
    })
  })

  describe('upsert', () => {
    it('should create new emoji settings successfully', async () => {
      const settingsData = {
        user_id: 'user-123',
        today_emoji: 'fire',
        tomorrow_emoji: 'calendar',
        later_emoji: 'memo'
      }
      const mockCreatedSettings = createMockEmojiSetting(settingsData)

      const mockFromResult = {
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedSettings, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.upsert(settingsData)

      expect(result.data).toEqual(mockCreatedSettings)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_emoji_settings')
      expect(mockFromResult.upsert).toHaveBeenCalledWith(settingsData)
      expect(mockFromResult.select).toHaveBeenCalledWith('id, user_id, today_emoji, tomorrow_emoji, later_emoji, created_at, updated_at')
    })

    it('should update existing emoji settings successfully', async () => {
      const settingsData = {
        user_id: 'user-123',
        today_emoji: 'rocket',
        tomorrow_emoji: 'calendar',
        later_emoji: 'memo'
      }
      const mockUpdatedSettings = createMockEmojiSetting(settingsData)

      const mockFromResult = {
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUpdatedSettings, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.upsert(settingsData)

      expect(result.data).toEqual(mockUpdatedSettings)
      expect(result.error).toBeNull()
    })

    it('should handle upsert failure', async () => {
      const settingsData = {
        user_id: 'user-123',
        today_emoji: '',
        tomorrow_emoji: '',
        later_emoji: ''
      }

      const mockFromResult = {
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'CHECK_VIOLATION', message: 'Invalid emoji format' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.upsert(settingsData)

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Invalid emoji format')
    })

    it('should handle custom emoji settings', async () => {
      const customSettings = {
        user_id: 'user-123',
        today_emoji: 'zap',
        tomorrow_emoji: 'hourglass_flowing_sand',
        later_emoji: 'thought_balloon'
      }
      const mockCustomSettings = createMockEmojiSetting(customSettings)

      const mockFromResult = {
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCustomSettings, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.upsert(customSettings)

      expect(result.data).toEqual(mockCustomSettings)
      expect(result.error).toBeNull()
      expect(result.data?.today_emoji).toBe('zap')
      expect(result.data?.tomorrow_emoji).toBe('hourglass_flowing_sand')
      expect(result.data?.later_emoji).toBe('thought_balloon')
    })
  })

  describe('deleteByUserId', () => {
    it('should delete emoji settings successfully', async () => {
      const mockFromResult = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.deleteByUserId('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_emoji_settings')
      expect(mockFromResult.delete).toHaveBeenCalled()
      expect(mockFromResult.eq).toHaveBeenCalledWith('user_id', 'user-123')
    })

    it('should handle deletion failure', async () => {
      const mockFromResult = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { code: 'NOT_FOUND', message: 'Settings not found' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.deleteByUserId('non-existent-user')

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
    })

    it('should handle deletion of non-existent settings gracefully', async () => {
      const mockFromResult = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.deleteByUserId('user-without-settings')

      expect(result.data).toBeUndefined()
      expect(result.error).toBeNull()
    })
  })

  describe('findAll', () => {
    it('should return all emoji settings successfully', async () => {
      const mockAllSettings = [
        createMockEmojiSetting({ user_id: 'user-1' }),
        createMockEmojiSetting({ user_id: 'user-2', today_emoji: 'rocket' }),
        createMockEmojiSetting({ user_id: 'user-3', tomorrow_emoji: 'star' })
      ]
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockAllSettings, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findAll()

      expect(result.data).toEqual(mockAllSettings)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_emoji_settings')
      expect(mockFromResult.select).toHaveBeenCalledWith('id, user_id, today_emoji, tomorrow_emoji, later_emoji, created_at, updated_at')
      expect(mockFromResult.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('should return empty array when no settings exist', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findAll()

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })

    it('should handle database error in findAll', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'DB_CONNECTION_ERROR', message: 'Connection timeout' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findAll()

      expect(result.data).toEqual([])
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Connection timeout')
    })

    it('should handle null data gracefully', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findAll()

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })
  })

  describe('findByEmoji', () => {
    it('should find settings using specific emoji', async () => {
      const mockSettingsUsingFire = [
        createMockEmojiSetting({ user_id: 'user-1', today_emoji: 'fire' }),
        createMockEmojiSetting({ user_id: 'user-2', today_emoji: 'fire' })
      ]
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ data: mockSettingsUsingFire, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByEmoji('fire')

      expect(result.data).toEqual(mockSettingsUsingFire)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_emoji_settings')
      expect(mockFromResult.or).toHaveBeenCalledWith('today_emoji.eq.fire,tomorrow_emoji.eq.fire,later_emoji.eq.fire')
    })

    it('should find settings across different emoji positions', async () => {
      const mockSettingsUsingCalendar = [
        createMockEmojiSetting({ user_id: 'user-1', tomorrow_emoji: 'calendar' }),
        createMockEmojiSetting({ user_id: 'user-2', later_emoji: 'calendar' })
      ]
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ data: mockSettingsUsingCalendar, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByEmoji('calendar')

      expect(result.data).toEqual(mockSettingsUsingCalendar)
      expect(result.error).toBeNull()
      expect(mockFromResult.or).toHaveBeenCalledWith('today_emoji.eq.calendar,tomorrow_emoji.eq.calendar,later_emoji.eq.calendar')
    })

    it('should return empty array when emoji is not used', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ data: [], error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByEmoji('unused_emoji')

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })

    it('should handle database error in findByEmoji', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'QUERY_ERROR', message: 'Invalid query syntax' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByEmoji('fire')

      expect(result.data).toEqual([])
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Invalid query syntax')
    })

    it('should handle null data in findByEmoji', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ data: null, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByEmoji('fire')

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })

    it('should handle special character emojis', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ data: [], error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByEmoji('100')

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
      expect(mockFromResult.or).toHaveBeenCalledWith('today_emoji.eq.100,tomorrow_emoji.eq.100,later_emoji.eq.100')
    })
  })

  describe('countDefaultUsers', () => {
    it('should count users with default settings successfully', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      }
      // Mock the final eq call in the chain
      mockFromResult.eq
        .mockReturnValueOnce(mockFromResult)
        .mockReturnValueOnce(mockFromResult)
        .mockReturnValueOnce(Promise.resolve({ data: null, error: null, count: 25 }))

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.countDefaultUsers()

      expect(result.data).toBe(25)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_emoji_settings')
      expect(mockFromResult.select).toHaveBeenCalledWith('*', { count: 'exact', head: true })
    })

    it('should return zero when no default users exist', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      }
      // Mock the final eq call in the chain
      mockFromResult.eq
        .mockReturnValueOnce(mockFromResult)
        .mockReturnValueOnce(mockFromResult)
        .mockReturnValueOnce(Promise.resolve({ data: null, error: null, count: 0 }))

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.countDefaultUsers()

      expect(result.data).toBe(0)
      expect(result.error).toBeNull()
    })

    it('should handle count query error', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      }
      // Mock the final eq call in the chain to return error
      mockFromResult.eq
        .mockReturnValueOnce(mockFromResult)
        .mockReturnValueOnce(mockFromResult)
        .mockReturnValueOnce(Promise.resolve({
          data: null,
          error: { code: 'COUNT_ERROR', message: 'Unable to count rows' },
          count: null
        }))

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.countDefaultUsers()

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Unable to count rows')
    })

    it('should handle null count gracefully', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      }
      // Mock the final eq call in the chain with null count
      mockFromResult.eq
        .mockReturnValueOnce(mockFromResult)
        .mockReturnValueOnce(mockFromResult)
        .mockReturnValueOnce(Promise.resolve({ data: null, error: null, count: null }))

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.countDefaultUsers()

      expect(result.data).toBe(0)
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

    it('should handle invalid emoji names', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ data: [], error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByEmoji('')

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })

    it('should handle large result sets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) =>
        createMockEmojiSetting({ user_id: `user-${i}` })
      )
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: largeDataset, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findAll()

      expect(result.data).toHaveLength(1000)
      expect(result.error).toBeNull()
    })

    it('should handle unicode emoji names', async () => {
      const unicodeEmoji = '🔥'
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ data: [], error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByEmoji(unicodeEmoji)

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
      expect(mockFromResult.or).toHaveBeenCalledWith(`today_emoji.eq.${unicodeEmoji},tomorrow_emoji.eq.${unicodeEmoji},later_emoji.eq.${unicodeEmoji}`)
    })

    it('should handle concurrent upsert operations', async () => {
      const settingsData = {
        user_id: 'user-123',
        today_emoji: 'fire',
        tomorrow_emoji: 'calendar',
        later_emoji: 'memo'
      }
      const mockSettings = createMockEmojiSetting(settingsData)

      const mockFromResult = {
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSettings, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      // Simulate concurrent operations
      const operations = Array.from({ length: 5 }, () =>
        repository.upsert(settingsData)
      )

      const results = await Promise.all(operations)

      results.forEach(result => {
        expect(result.data).toEqual(mockSettings)
        expect(result.error).toBeNull()
      })
    })
  })
})
