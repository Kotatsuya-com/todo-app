/**
 * EmojiSettingsService unit tests
 */

import { EmojiSettingsService } from '@/lib/services/EmojiSettingsService'
import { DEFAULT_EMOJI_SETTINGS, AVAILABLE_EMOJIS } from '@/lib/entities/EmojiSettings'
import {
  MockEmojiSettingsRepository,
  createMockEmojiSettingsRepository,
  createMockEmojiSettingsRepositoryWithMultipleUsers,
  createFailingMockEmojiSettingsRepository,
  createEmptyMockEmojiSettingsRepository
} from '@/__tests__/mocks/emoji-settings'
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
  let mockRepository: MockEmojiSettingsRepository

  beforeEach(() => {
    mockRepository = createMockEmojiSettingsRepository()
    service = new EmojiSettingsService(mockRepository)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserEmojiSettings', () => {
    it('should return existing user settings with available emojis', async () => {
      const mockSettings = createMockEmojiSetting()
      mockRepository.setMockData([mockSettings])

      const result = await service.getUserEmojiSettings('user-123')

      expect(result.success).toBe(true)
      expect(result.data?.settings).toEqual(mockSettings)
      expect(result.data?.availableEmojis).toEqual(AVAILABLE_EMOJIS)
    })

    it('should return default settings when user has no settings', async () => {
      mockRepository.setShouldReturnEmpty(true)

      const result = await service.getUserEmojiSettings('new-user')

      expect(result.success).toBe(true)
      expect(result.data?.settings.user_id).toBe('new-user')
      expect(result.data?.settings.today_emoji).toBe(DEFAULT_EMOJI_SETTINGS.today_emoji)
      expect(result.data?.settings.tomorrow_emoji).toBe(DEFAULT_EMOJI_SETTINGS.tomorrow_emoji)
      expect(result.data?.settings.later_emoji).toBe(DEFAULT_EMOJI_SETTINGS.later_emoji)
      expect(result.data?.availableEmojis).toEqual(AVAILABLE_EMOJIS)
    })

    it('should handle repository errors', async () => {
      mockRepository.setShouldFail(true)

      const result = await service.getUserEmojiSettings('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch emoji settings')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service layer exceptions', async () => {
      const throwingRepository = {
        findByUserId: jest.fn(() => {
          throw new Error('Unexpected error')
        })
      } as any

      const serviceWithThrowingRepo = new EmojiSettingsService(throwingRepository)
      const result = await serviceWithThrowingRepo.getUserEmojiSettings('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should return copy of available emojis, not reference', async () => {
      const result = await service.getUserEmojiSettings('user-123')

      expect(result.success).toBe(true)
      expect(result.data?.availableEmojis).not.toBe(AVAILABLE_EMOJIS)
      expect(result.data?.availableEmojis).toEqual(AVAILABLE_EMOJIS)
    })
  })

  describe('updateUserEmojiSettings', () => {
    it('should update user settings with valid request', async () => {
      const updateRequest = createMockValidEmojiUpdateRequest()
      const updatedSettings = createMockCustomEmojiSetting()

      const result = await service.updateUserEmojiSettings('user-123', updateRequest)

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Settings updated successfully')
      expect(result.data?.settings.today_emoji).toBe(updateRequest.today_emoji)
      expect(result.data?.settings.tomorrow_emoji).toBe(updateRequest.tomorrow_emoji)
      expect(result.data?.settings.later_emoji).toBe(updateRequest.later_emoji)
    })

    it('should reject invalid emoji names', async () => {
      const invalidRequest = createMockInvalidEmojiUpdateRequest()

      const result = await service.updateUserEmojiSettings('user-123', invalidRequest)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid emoji selection')
      expect(result.statusCode).toBe(400)
    })

    it('should reject duplicate emoji assignments', async () => {
      const duplicateRequest = createMockDuplicateEmojiUpdateRequest()

      const result = await service.updateUserEmojiSettings('user-123', duplicateRequest)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid emoji selection')
      expect(result.error).toContain('must be unique')
      expect(result.statusCode).toBe(400)
    })

    it('should handle repository errors during update', async () => {
      mockRepository.setShouldFail(true)
      const validRequest = createMockValidEmojiUpdateRequest()

      const result = await service.updateUserEmojiSettings('user-123', validRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update emoji settings')
      expect(result.statusCode).toBe(500)
    })

    it('should handle null data from repository', async () => {
      const originalUpsert = mockRepository.upsert
      mockRepository.upsert = jest.fn().mockResolvedValue({
        success: true,
        data: null
      })

      const validRequest = createMockValidEmojiUpdateRequest()
      const result = await service.updateUserEmojiSettings('user-123', validRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update emoji settings - no data returned')
      expect(result.statusCode).toBe(500)

      // Restore original method
      mockRepository.upsert = originalUpsert
    })

    it('should handle service layer exceptions', async () => {
      const throwingRepository = {
        upsert: jest.fn(() => {
          throw new Error('Unexpected error')
        })
      } as any

      const serviceWithThrowingRepo = new EmojiSettingsService(throwingRepository)
      const validRequest = createMockValidEmojiUpdateRequest()
      const result = await serviceWithThrowingRepo.updateUserEmojiSettings('user-123', validRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should create new settings for user without existing settings', async () => {
      mockRepository.clearMockData() // Start with empty repository
      const validRequest = createMockValidEmojiUpdateRequest()

      const result = await service.updateUserEmojiSettings('new-user', validRequest)

      expect(result.success).toBe(true)
      expect(result.data?.settings.user_id).toBe('new-user')
      expect(result.data?.settings.today_emoji).toBe(validRequest.today_emoji)
    })
  })

  describe('resetUserEmojiSettings', () => {
    it('should reset user settings to defaults', async () => {
      const result = await service.resetUserEmojiSettings('user-123')

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('Settings reset to default')
      expect(result.data?.settings.today_emoji).toBe(DEFAULT_EMOJI_SETTINGS.today_emoji)
      expect(result.data?.settings.tomorrow_emoji).toBe(DEFAULT_EMOJI_SETTINGS.tomorrow_emoji)
      expect(result.data?.settings.later_emoji).toBe(DEFAULT_EMOJI_SETTINGS.later_emoji)
    })

    it('should handle repository errors during reset', async () => {
      mockRepository.setShouldFail(true)

      const result = await service.resetUserEmojiSettings('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to reset emoji settings')
      expect(result.statusCode).toBe(500)
    })

    it('should handle null data from repository', async () => {
      const originalUpsert = mockRepository.upsert
      mockRepository.upsert = jest.fn().mockResolvedValue({
        success: true,
        data: null
      })

      const result = await service.resetUserEmojiSettings('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to reset emoji settings - no data returned')
      expect(result.statusCode).toBe(500)

      // Restore original method
      mockRepository.upsert = originalUpsert
    })

    it('should handle service layer exceptions', async () => {
      const throwingRepository = {
        upsert: jest.fn(() => {
          throw new Error('Unexpected error')
        })
      } as any

      const serviceWithThrowingRepo = new EmojiSettingsService(throwingRepository)
      const result = await serviceWithThrowingRepo.resetUserEmojiSettings('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should reset custom settings to defaults', async () => {
      const customSettings = createMockCustomEmojiSetting()
      mockRepository.setMockData([customSettings])

      const result = await service.resetUserEmojiSettings(customSettings.user_id)

      expect(result.success).toBe(true)
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
    beforeEach(() => {
      // Use repository with multiple users for statistics testing
      mockRepository = createMockEmojiSettingsRepositoryWithMultipleUsers()
      service = new EmojiSettingsService(mockRepository)
    })

    it('should return correct usage statistics', async () => {
      const result = await service.getEmojiUsageStats()

      expect(result.success).toBe(true)
      expect(result.data?.totalUsers).toEqual(EXPECTED_EMOJI_STATISTICS.totalUsers)
      expect(result.data?.defaultUsers).toEqual(EXPECTED_EMOJI_STATISTICS.defaultUsers)
      expect(result.data?.customUsers).toEqual(EXPECTED_EMOJI_STATISTICS.customUsers)
      expect(result.data?.popularEmojis).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ emoji: 'fire', count: expect.any(Number) }),
          expect.objectContaining({ emoji: 'calendar', count: expect.any(Number) }),
          expect.objectContaining({ emoji: 'memo', count: expect.any(Number) })
        ])
      )
    })

    it('should limit popular emojis to top 10', async () => {
      const result = await service.getEmojiUsageStats()

      expect(result.success).toBe(true)
      expect(result.data?.popularEmojis.length).toBeLessThanOrEqual(10)
    })

    it('should sort popular emojis by count descending', async () => {
      const result = await service.getEmojiUsageStats()

      expect(result.success).toBe(true)
      const popularEmojis = result.data?.popularEmojis || []
      
      for (let i = 1; i < popularEmojis.length; i++) {
        expect(popularEmojis[i-1].count).toBeGreaterThanOrEqual(popularEmojis[i].count)
      }
    })

    it('should handle repository error for default users count', async () => {
      mockRepository.setShouldFail(true)

      const result = await service.getEmojiUsageStats()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch usage statistics')
      expect(result.statusCode).toBe(500)
    })

    it('should handle repository error for all settings', async () => {
      // Mock successful countDefaultUsers but failing findAll
      const originalFindAll = mockRepository.findAll
      mockRepository.findAll = jest.fn().mockResolvedValue({
        success: false,
        error: { code: 'MOCK_ERROR', message: 'Mock error' }
      })

      const result = await service.getEmojiUsageStats()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch usage statistics')
      expect(result.statusCode).toBe(500)

      // Restore original method
      mockRepository.findAll = originalFindAll
    })

    it('should handle empty repository', async () => {
      const emptyRepository = createEmptyMockEmojiSettingsRepository()
      const emptyService = new EmojiSettingsService(emptyRepository)

      const result = await emptyService.getEmojiUsageStats()

      expect(result.success).toBe(true)
      expect(result.data?.totalUsers).toBe(0)
      expect(result.data?.defaultUsers).toBe(0)
      expect(result.data?.customUsers).toBe(0)
      expect(result.data?.popularEmojis).toEqual([])
    })

    it('should handle service layer exceptions', async () => {
      const throwingRepository = {
        countDefaultUsers: jest.fn(() => {
          throw new Error('Unexpected error')
        })
      } as any

      const serviceWithThrowingRepo = new EmojiSettingsService(throwingRepository)
      const result = await serviceWithThrowingRepo.getEmojiUsageStats()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('findUsersByEmoji', () => {
    beforeEach(() => {
      mockRepository = createMockEmojiSettingsRepositoryWithMultipleUsers()
      service = new EmojiSettingsService(mockRepository)
    })

    it('should find users using specific emoji', async () => {
      const result = await service.findUsersByEmoji('fire')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(expect.any(Array))
      expect(result.data?.length).toBeGreaterThan(0)
    })

    it('should reject invalid emoji names', async () => {
      const result = await service.findUsersByEmoji('invalid_emoji')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown emoji: invalid_emoji')
      expect(result.statusCode).toBe(400)
    })

    it('should handle repository errors', async () => {
      mockRepository.setShouldFail(true)

      const result = await service.findUsersByEmoji('fire')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to search emoji usage')
      expect(result.statusCode).toBe(500)
    })

    it('should return empty array when no users found', async () => {
      const emptyRepository = createEmptyMockEmojiSettingsRepository()
      const emptyService = new EmojiSettingsService(emptyRepository)

      const result = await emptyService.findUsersByEmoji('fire')

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('should handle service layer exceptions', async () => {
      const throwingRepository = {
        findByEmoji: jest.fn(() => {
          throw new Error('Unexpected error')
        })
      } as any

      const serviceWithThrowingRepo = new EmojiSettingsService(throwingRepository)
      const result = await serviceWithThrowingRepo.findUsersByEmoji('fire')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should find users with emoji in any position', async () => {
      // Create test data with specific emoji in different positions
      const testSettings = [
        createMockEmojiSetting({ user_id: 'user-today', today_emoji: 'star' }),
        createMockEmojiSetting({ user_id: 'user-tomorrow', tomorrow_emoji: 'star' }),
        createMockEmojiSetting({ user_id: 'user-later', later_emoji: 'star' })
      ]
      mockRepository.setMockData(testSettings)

      const result = await service.findUsersByEmoji('star')

      expect(result.success).toBe(true)
      expect(result.data?.length).toBe(3)
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

      const serviceWithUndefinedRepo = new EmojiSettingsService(undefinedDataRepository)
      const result = await serviceWithUndefinedRepo.getUserEmojiSettings('user-123')

      expect(result.success).toBe(true)
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

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid emoji selection')
      expect(result.statusCode).toBe(400)
    })
  })

  describe('dependency injection', () => {
    it('should work with different repository implementations', async () => {
      const failingRepository = createFailingMockEmojiSettingsRepository()
      const serviceWithFailingRepo = new EmojiSettingsService(failingRepository)

      const result = await serviceWithFailingRepo.getUserEmojiSettings('user-123')

      expect(result.success).toBe(false)
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