/**
 * EmojiSettingsService unit tests
 * Using autoMock approach for cleaner, more maintainable tests
 */

import { EmojiSettingsService } from '@/lib/services/EmojiSettingsService'
import { DEFAULT_EMOJI_SETTINGS, AVAILABLE_EMOJIS } from '@/lib/entities/EmojiSettings'
import { createAutoMock, mockResult } from '@/__tests__/utils/autoMock'
import { MockProxy } from 'jest-mock-extended'
import { EmojiSettingsRepositoryInterface } from '@/lib/repositories/EmojiSettingsRepository'
import {
  createMockEmojiSetting,
  createMockCustomEmojiSetting,
  createMockValidEmojiUpdateRequest,
  createMockInvalidEmojiUpdateRequest,
  createMockDuplicateEmojiUpdateRequest,
  EXPECTED_EMOJI_STATISTICS
} from '@/__tests__/fixtures/emoji-settings.fixture'

describe('EmojiSettingsService', () => {
  let service: EmojiSettingsService
  let mockRepository: MockProxy<EmojiSettingsRepositoryInterface>

  beforeEach(() => {
    mockRepository = createAutoMock<EmojiSettingsRepositoryInterface>()
    service = new EmojiSettingsService(mockRepository)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserEmojiSettings', () => {
    it('should return existing user settings with available emojis', async () => {
      const mockSettings = createMockEmojiSetting()
      mockRepository.findByUserId.mockResolvedValue(mockResult.success(mockSettings))

      const result = await service.getUserEmojiSettings('user-123')

      expect(result.error).toBeUndefined()
      expect(result.data?.settings).toEqual(mockSettings)
      expect(result.data?.availableEmojis).toEqual(AVAILABLE_EMOJIS)
      expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-123')
    })

    it('should return default settings when user has no settings', async () => {
      mockRepository.findByUserId.mockResolvedValue(mockResult.success(null))

      const result = await service.getUserEmojiSettings('new-user')

      expect(result.error).toBeUndefined()
      expect(result.data?.settings.user_id).toBe('new-user')
      expect(result.data?.settings.today_emoji).toBe(DEFAULT_EMOJI_SETTINGS.today_emoji)
      expect(result.data?.settings.tomorrow_emoji).toBe(DEFAULT_EMOJI_SETTINGS.tomorrow_emoji)
      expect(result.data?.settings.later_emoji).toBe(DEFAULT_EMOJI_SETTINGS.later_emoji)
      expect(result.data?.availableEmojis).toEqual(AVAILABLE_EMOJIS)
    })

    it('should handle repository errors', async () => {
      mockRepository.findByUserId.mockResolvedValue(mockResult.error('Database error'))

      const result = await service.getUserEmojiSettings('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to fetch emoji settings')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service layer exceptions', async () => {
      mockRepository.findByUserId.mockRejectedValue(new Error('Unexpected error'))

      const result = await service.getUserEmojiSettings('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should return copy of available emojis, not reference', async () => {
      mockRepository.findByUserId.mockResolvedValue(mockResult.success(null))

      const result = await service.getUserEmojiSettings('user-123')

      expect(result.error).toBeUndefined()
      expect(result.data?.availableEmojis).not.toBe(AVAILABLE_EMOJIS)
      expect(result.data?.availableEmojis).toEqual(AVAILABLE_EMOJIS)
    })
  })

  describe('updateUserEmojiSettings', () => {
    it('should update user settings with valid request', async () => {
      const updateRequest = createMockValidEmojiUpdateRequest()
      const expectedSettings = {
        id: 'emoji-1',
        user_id: 'user-123',
        today_emoji: updateRequest.today_emoji,
        tomorrow_emoji: updateRequest.tomorrow_emoji,
        later_emoji: updateRequest.later_emoji,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
      mockRepository.upsert.mockResolvedValue(mockResult.success(expectedSettings))

      const result = await service.updateUserEmojiSettings('user-123', updateRequest)

      expect(result.error).toBeUndefined()
      expect(result.data?.message).toBe('Settings updated successfully')
      expect(result.data?.settings.today_emoji).toBe(updateRequest.today_emoji)
      expect(result.data?.settings.tomorrow_emoji).toBe(updateRequest.tomorrow_emoji)
      expect(result.data?.settings.later_emoji).toBe(updateRequest.later_emoji)
      expect(mockRepository.upsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        today_emoji: updateRequest.today_emoji,
        tomorrow_emoji: updateRequest.tomorrow_emoji,
        later_emoji: updateRequest.later_emoji
      })
    })

    it('should reject invalid emoji names', async () => {
      const invalidRequest = createMockInvalidEmojiUpdateRequest()

      const result = await service.updateUserEmojiSettings('user-123', invalidRequest)

      expect(result.data).toBeUndefined()
      expect(result.error).toContain('Invalid emoji selection')
      expect(result.statusCode).toBe(400)
    })

    it('should reject duplicate emoji assignments', async () => {
      const duplicateRequest = createMockDuplicateEmojiUpdateRequest()

      const result = await service.updateUserEmojiSettings('user-123', duplicateRequest)

      expect(result.data).toBeUndefined()
      expect(result.error).toContain('Invalid emoji selection')
      expect(result.error).toContain('must be unique')
      expect(result.statusCode).toBe(400)
    })

    it('should handle repository errors during update', async () => {
      mockRepository.upsert.mockResolvedValue(mockResult.error('Database error'))
      const validRequest = createMockValidEmojiUpdateRequest()

      const result = await service.updateUserEmojiSettings('user-123', validRequest)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to update emoji settings')
      expect(result.statusCode).toBe(500)
    })

    it('should handle null data from repository', async () => {
      mockRepository.upsert.mockResolvedValue(mockResult.success(null))
      const validRequest = createMockValidEmojiUpdateRequest()

      const result = await service.updateUserEmojiSettings('user-123', validRequest)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to update emoji settings - no data returned')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service layer exceptions', async () => {
      mockRepository.upsert.mockRejectedValue(new Error('Unexpected error'))
      const validRequest = createMockValidEmojiUpdateRequest()

      const result = await service.updateUserEmojiSettings('user-123', validRequest)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should create new settings for user without existing settings', async () => {
      const validRequest = createMockValidEmojiUpdateRequest()
      const expectedSettings = {
        id: 'emoji-new',
        user_id: 'new-user',
        today_emoji: validRequest.today_emoji,
        tomorrow_emoji: validRequest.tomorrow_emoji,
        later_emoji: validRequest.later_emoji,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
      mockRepository.upsert.mockResolvedValue(mockResult.success(expectedSettings))

      const result = await service.updateUserEmojiSettings('new-user', validRequest)

      expect(result.error).toBeUndefined()
      expect(result.data?.settings.user_id).toBe('new-user')
      expect(result.data?.settings.today_emoji).toBe(validRequest.today_emoji)
    })
  })

  describe('resetUserEmojiSettings', () => {
    it('should reset user settings to defaults', async () => {
      const expectedSettings = {
        id: 'emoji-1',
        user_id: 'user-123',
        today_emoji: DEFAULT_EMOJI_SETTINGS.today_emoji,
        tomorrow_emoji: DEFAULT_EMOJI_SETTINGS.tomorrow_emoji,
        later_emoji: DEFAULT_EMOJI_SETTINGS.later_emoji,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
      mockRepository.upsert.mockResolvedValue(mockResult.success(expectedSettings))

      const result = await service.resetUserEmojiSettings('user-123')

      expect(result.error).toBeUndefined()
      expect(result.data?.message).toBe('Settings reset to default')
      expect(result.data?.settings.today_emoji).toBe(DEFAULT_EMOJI_SETTINGS.today_emoji)
      expect(result.data?.settings.tomorrow_emoji).toBe(DEFAULT_EMOJI_SETTINGS.tomorrow_emoji)
      expect(result.data?.settings.later_emoji).toBe(DEFAULT_EMOJI_SETTINGS.later_emoji)
      expect(mockRepository.upsert).toHaveBeenCalledWith({
        user_id: 'user-123',
        today_emoji: DEFAULT_EMOJI_SETTINGS.today_emoji,
        tomorrow_emoji: DEFAULT_EMOJI_SETTINGS.tomorrow_emoji,
        later_emoji: DEFAULT_EMOJI_SETTINGS.later_emoji
      })
    })

    it('should handle repository errors during reset', async () => {
      mockRepository.upsert.mockResolvedValue(mockResult.error('Database error'))

      const result = await service.resetUserEmojiSettings('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to reset emoji settings')
      expect(result.statusCode).toBe(500)
    })

    it('should handle null data from repository', async () => {
      mockRepository.upsert.mockResolvedValue(mockResult.success(null))

      const result = await service.resetUserEmojiSettings('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to reset emoji settings - no data returned')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service layer exceptions', async () => {
      mockRepository.upsert.mockRejectedValue(new Error('Unexpected error'))

      const result = await service.resetUserEmojiSettings('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should reset custom settings to defaults', async () => {
      const customSettings = createMockCustomEmojiSetting()
      const expectedSettings = {
        id: customSettings.id,
        user_id: customSettings.user_id,
        today_emoji: DEFAULT_EMOJI_SETTINGS.today_emoji,
        tomorrow_emoji: DEFAULT_EMOJI_SETTINGS.tomorrow_emoji,
        later_emoji: DEFAULT_EMOJI_SETTINGS.later_emoji,
        created_at: customSettings.created_at,
        updated_at: '2023-01-01T00:00:00Z'
      }
      mockRepository.upsert.mockResolvedValue(mockResult.success(expectedSettings))

      const result = await service.resetUserEmojiSettings(customSettings.user_id)

      expect(result.error).toBeUndefined()
      expect(result.data?.settings.today_emoji).toBe(DEFAULT_EMOJI_SETTINGS.today_emoji)
      expect(result.data?.settings.tomorrow_emoji).toBe(DEFAULT_EMOJI_SETTINGS.tomorrow_emoji)
      expect(result.data?.settings.later_emoji).toBe(DEFAULT_EMOJI_SETTINGS.later_emoji)
    })
  })

  describe('getAvailableEmojis', () => {
    it('should return all available emojis', () => {
      const emojis = service.getAvailableEmojis()

      expect(emojis).toEqual(AVAILABLE_EMOJIS)
      expect(emojis).toHaveLength(AVAILABLE_EMOJIS.length)
    })

    it('should return a copy, not reference', () => {
      const emojis = service.getAvailableEmojis()

      expect(emojis).not.toBe(AVAILABLE_EMOJIS)
    })
  })

  describe('getEmojiByName', () => {
    it('should return emoji for valid names', () => {
      const fireEmoji = service.getEmojiByName('fire')

      expect(fireEmoji).toEqual({
        name: 'fire',
        display: '🔥',
        label: '緊急'
      })
    })

    it('should return null for invalid names', () => {
      const invalidEmoji = service.getEmojiByName('invalid_emoji')

      expect(invalidEmoji).toBeNull()
    })

    it('should be case sensitive', () => {
      const uppercaseEmoji = service.getEmojiByName('FIRE')

      expect(uppercaseEmoji).toBeNull()
    })

    it('should handle empty string', () => {
      const emptyEmoji = service.getEmojiByName('')

      expect(emptyEmoji).toBeNull()
    })
  })

  describe('getDefaultSettings', () => {
    it('should return default emoji settings', () => {
      const defaults = service.getDefaultSettings()

      expect(defaults).toEqual(DEFAULT_EMOJI_SETTINGS)
      expect(defaults.today_emoji).toBe('fire')
      expect(defaults.tomorrow_emoji).toBe('calendar')
      expect(defaults.later_emoji).toBe('memo')
    })
  })

  describe('getEmojiUsageStats', () => {
    it('should return correct usage statistics', async () => {
      const mockSettings = [
        createMockEmojiSetting({ user_id: 'user-1' }),
        createMockEmojiSetting({
          today_emoji: 'warning',
          tomorrow_emoji: 'clock',
          later_emoji: 'bookmark',
          user_id: 'user-2'
        }),
        createMockEmojiSetting({ user_id: 'user-3' })
      ]
      mockRepository.countDefaultUsers.mockResolvedValue(mockResult.success(2))
      mockRepository.findAll.mockResolvedValue(mockResult.success(mockSettings))

      const result = await service.getEmojiUsageStats()

      expect(result.error).toBeUndefined()
      expect(result.data?.totalUsers).toBe(3)
      expect(result.data?.defaultUsers).toBe(2)
      expect(result.data?.customUsers).toBe(1)
      expect(result.data?.popularEmojis).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ emoji: 'fire', count: expect.any(Number) }),
          expect.objectContaining({ emoji: 'calendar', count: expect.any(Number) }),
          expect.objectContaining({ emoji: 'memo', count: expect.any(Number) })
        ])
      )
    })

    it('should limit popular emojis to top 10', async () => {
      const mockSettings = Array.from({ length: 15 }, (_, i) =>
        createMockEmojiSetting({ user_id: `user-${i + 1}` })
      )
      mockRepository.countDefaultUsers.mockResolvedValue(mockResult.success(15))
      mockRepository.findAll.mockResolvedValue(mockResult.success(mockSettings))

      const result = await service.getEmojiUsageStats()

      expect(result.error).toBeUndefined()
      expect(result.data?.popularEmojis.length).toBeLessThanOrEqual(10)
    })

    it('should sort popular emojis by count descending', async () => {
      const mockSettings = [
        createMockEmojiSetting({ user_id: 'user-1' }),
        createMockEmojiSetting({ user_id: 'user-2' }),
        createMockEmojiSetting({
          today_emoji: 'warning',
          tomorrow_emoji: 'clock',
          later_emoji: 'bookmark',
          user_id: 'user-3'
        })
      ]
      mockRepository.countDefaultUsers.mockResolvedValue(mockResult.success(2))
      mockRepository.findAll.mockResolvedValue(mockResult.success(mockSettings))

      const result = await service.getEmojiUsageStats()

      expect(result.error).toBeUndefined()
      const popularEmojis = result.data?.popularEmojis || []

      for (let i = 1; i < popularEmojis.length; i++) {
        expect(popularEmojis[i-1].count).toBeGreaterThanOrEqual(popularEmojis[i].count)
      }
    })

    it('should handle repository error for default users count', async () => {
      mockRepository.countDefaultUsers.mockResolvedValue(mockResult.error('Database error'))

      const result = await service.getEmojiUsageStats()

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to fetch usage statistics')
      expect(result.statusCode).toBe(500)
    })

    it('should handle repository error for all settings', async () => {
      mockRepository.countDefaultUsers.mockResolvedValue(mockResult.success(0))
      mockRepository.findAll.mockResolvedValue(mockResult.error('Database error'))

      const result = await service.getEmojiUsageStats()

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to fetch usage statistics')
      expect(result.statusCode).toBe(500)
    })

    it('should handle empty repository', async () => {
      mockRepository.countDefaultUsers.mockResolvedValue(mockResult.success(0))
      mockRepository.findAll.mockResolvedValue(mockResult.success([]))

      const result = await service.getEmojiUsageStats()

      expect(result.error).toBeUndefined()
      expect(result.data?.totalUsers).toBe(0)
      expect(result.data?.defaultUsers).toBe(0)
      expect(result.data?.customUsers).toBe(0)
      expect(result.data?.popularEmojis).toEqual([])
    })

    it('should handle service layer exceptions', async () => {
      mockRepository.countDefaultUsers.mockRejectedValue(new Error('Unexpected error'))

      const result = await service.getEmojiUsageStats()

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('findUsersByEmoji', () => {
    it('should find users using specific emoji', async () => {
      const mockSettings = [
        createMockEmojiSetting({ user_id: 'user-1' }),
        createMockEmojiSetting({ user_id: 'user-2' })
      ]
      mockRepository.findByEmoji.mockResolvedValue(mockResult.success(mockSettings))

      const result = await service.findUsersByEmoji('fire')

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual(mockSettings)
      expect(result.data?.length).toBe(2)
      expect(mockRepository.findByEmoji).toHaveBeenCalledWith('fire')
    })

    it('should reject invalid emoji names', async () => {
      const result = await service.findUsersByEmoji('invalid_emoji')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Unknown emoji: invalid_emoji')
      expect(result.statusCode).toBe(400)
    })

    it('should handle repository errors', async () => {
      mockRepository.findByEmoji.mockResolvedValue(mockResult.error('Database error'))

      const result = await service.findUsersByEmoji('fire')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to search emoji usage')
      expect(result.statusCode).toBe(500)
    })

    it('should return empty array when no users found', async () => {
      mockRepository.findByEmoji.mockResolvedValue(mockResult.success([]))

      const result = await service.findUsersByEmoji('fire')

      expect(result.error).toBeUndefined()
      expect(result.data).toEqual([])
    })

    it('should handle service layer exceptions', async () => {
      mockRepository.findByEmoji.mockRejectedValue(new Error('Unexpected error'))

      const result = await service.findUsersByEmoji('fire')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should find users with emoji in any position', async () => {
      const testSettings = [
        createMockEmojiSetting({ user_id: 'user-today', today_emoji: 'star' }),
        createMockEmojiSetting({ user_id: 'user-tomorrow', tomorrow_emoji: 'star' }),
        createMockEmojiSetting({ user_id: 'user-later', later_emoji: 'star' })
      ]
      mockRepository.findByEmoji.mockResolvedValue(mockResult.success(testSettings))

      const result = await service.findUsersByEmoji('star')

      expect(result.error).toBeUndefined()
      expect(result.data?.length).toBe(3)
      expect(mockRepository.findByEmoji).toHaveBeenCalledWith('star')
    })
  })

  describe('error handling edge cases', () => {
    it('should handle repository returning undefined data', async () => {
      mockRepository.findByUserId.mockResolvedValue({
        data: undefined as any,
        error: null
      })

      const result = await service.getUserEmojiSettings('user-123')

      expect(result.error).toBeUndefined()
      expect(result.data?.settings.user_id).toBe('user-123')
      expect(result.data?.settings.today_emoji).toBe(DEFAULT_EMOJI_SETTINGS.today_emoji)
    })

    it('should handle malformed validation errors gracefully', async () => {
      const invalidRequest = {
        today_emoji: 'invalid1',
        tomorrow_emoji: 'invalid2',
        later_emoji: 'invalid1' // Duplicate
      }

      const result = await service.updateUserEmojiSettings('user-123', invalidRequest)

      expect(result.data).toBeUndefined()
      expect(result.error).toContain('Invalid emoji selection')
      expect(result.statusCode).toBe(400)
    })
  })

  describe('dependency injection', () => {
    it('should work with different repository implementations', async () => {
      const failingRepository = createAutoMock<EmojiSettingsRepositoryInterface>()
      failingRepository.findByUserId.mockResolvedValue(mockResult.error('Database connection failed'))
      const serviceWithFailingRepo = new EmojiSettingsService(failingRepository)

      const result = await serviceWithFailingRepo.getUserEmojiSettings('user-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBe('Failed to fetch emoji settings')
    })

    it('should delegate emoji entity methods correctly', () => {
      const availableEmojis = service.getAvailableEmojis()
      const fireEmoji = service.getEmojiByName('fire')
      const defaults = service.getDefaultSettings()

      expect(availableEmojis).toEqual(AVAILABLE_EMOJIS)
      expect(fireEmoji?.name).toBe('fire')
      expect(defaults).toEqual(DEFAULT_EMOJI_SETTINGS)
    })
  })
})
