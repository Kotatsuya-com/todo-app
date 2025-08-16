/**
 * EmojiSettingsEntity unit tests
 */

import { EmojiSettingsEntity, DEFAULT_EMOJI_SETTINGS, AVAILABLE_EMOJIS } from '@/lib/entities/EmojiSettings'
import {
  createMockEmojiSetting,
  createMockCustomEmojiSetting,
  createMockEmojiUpdateRequest,
  createMockValidEmojiUpdateRequest,
  createMockInvalidEmojiUpdateRequest,
  createMockDuplicateEmojiUpdateRequest,
  createMockEmptyEmojiUpdateRequest,
  createMockMixedValidInvalidEmojiUpdateRequest,
  VALID_EMOJI_NAMES,
  INVALID_EMOJI_NAMES,
  URGENCY_EMOJI_TEST_CASES,
  EMOJI_URGENCY_TEST_CASES
} from '@/__tests__/fixtures/emoji-settings.fixture'

describe('EmojiSettingsEntity', () => {
  describe('constructor and getters', () => {
    it('should create EmojiSettingsEntity with correct properties', () => {
      const mockSettings = createMockEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)

      expect(entity.id).toBe(mockSettings.id)
      expect(entity.userId).toBe(mockSettings.user_id)
      expect(entity.todayEmoji).toBe(mockSettings.today_emoji)
      expect(entity.tomorrowEmoji).toBe(mockSettings.tomorrow_emoji)
      expect(entity.laterEmoji).toBe(mockSettings.later_emoji)
      expect(entity.createdAt).toBe(mockSettings.created_at)
      expect(entity.updatedAt).toBe(mockSettings.updated_at)
    })
  })

  describe('isDefaultSetting', () => {
    it('should return true for default settings', () => {
      const mockSettings = createMockEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)

      expect(entity.isDefaultSetting()).toBe(true)
    })

    it('should return false for custom settings', () => {
      const mockSettings = createMockCustomEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)

      expect(entity.isDefaultSetting()).toBe(false)
    })

    it('should return false when only one emoji differs from default', () => {
      const mockSettings = createMockEmojiSetting({
        today_emoji: 'warning' // Changed from default
      })
      const entity = new EmojiSettingsEntity(mockSettings)

      expect(entity.isDefaultSetting()).toBe(false)
    })
  })

  describe('hasCustomization', () => {
    it('should return false for default settings', () => {
      const mockSettings = createMockEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)

      expect(entity.hasCustomization()).toBe(false)
    })

    it('should return true for custom settings', () => {
      const mockSettings = createMockCustomEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)

      expect(entity.hasCustomization()).toBe(true)
    })
  })

  describe('getEmojiForUrgency', () => {
    it('should return correct emoji for each urgency level', () => {
      const mockSettings = createMockEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)

      URGENCY_EMOJI_TEST_CASES.forEach(({ urgency, expectedEmoji }) => {
        expect(entity.getEmojiForUrgency(urgency)).toBe(expectedEmoji)
      })
    })

    it('should return custom emojis for custom settings', () => {
      const mockSettings = createMockCustomEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)

      expect(entity.getEmojiForUrgency('today')).toBe('warning')
      expect(entity.getEmojiForUrgency('tomorrow')).toBe('clock')
      expect(entity.getEmojiForUrgency('later')).toBe('bookmark')
    })
  })

  describe('getUrgencyForEmoji', () => {
    it('should return correct urgency for default emojis', () => {
      const mockSettings = createMockEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)

      EMOJI_URGENCY_TEST_CASES.forEach(({ emoji, expectedUrgency }) => {
        expect(entity.getUrgencyForEmoji(emoji)).toBe(expectedUrgency)
      })
    })

    it('should return correct urgency for custom emojis', () => {
      const mockSettings = createMockCustomEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)

      expect(entity.getUrgencyForEmoji('warning')).toBe('today')
      expect(entity.getUrgencyForEmoji('clock')).toBe('tomorrow')
      expect(entity.getUrgencyForEmoji('bookmark')).toBe('later')
      expect(entity.getUrgencyForEmoji('fire')).toBeNull() // Not in custom settings
    })

    it('should return null for non-configured emojis', () => {
      const mockSettings = createMockEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)

      expect(entity.getUrgencyForEmoji('star')).toBeNull()
      expect(entity.getUrgencyForEmoji('invalid')).toBeNull()
      expect(entity.getUrgencyForEmoji('')).toBeNull()
    })
  })

  describe('resetToDefaults', () => {
    it('should reset custom settings to defaults', () => {
      const mockSettings = createMockCustomEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)

      const resetEntity = entity.resetToDefaults()

      expect(resetEntity.todayEmoji).toBe(DEFAULT_EMOJI_SETTINGS.today_emoji)
      expect(resetEntity.tomorrowEmoji).toBe(DEFAULT_EMOJI_SETTINGS.tomorrow_emoji)
      expect(resetEntity.laterEmoji).toBe(DEFAULT_EMOJI_SETTINGS.later_emoji)
      expect(resetEntity.isDefaultSetting()).toBe(true)
    })

    it('should preserve non-emoji properties', () => {
      const mockSettings = createMockCustomEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)

      const resetEntity = entity.resetToDefaults()

      expect(resetEntity.id).toBe(mockSettings.id)
      expect(resetEntity.userId).toBe(mockSettings.user_id)
      expect(resetEntity.createdAt).toBe(mockSettings.created_at)
    })

    it('should update the updated_at timestamp', () => {
      const mockSettings = createMockCustomEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)

      const resetEntity = entity.resetToDefaults()

      expect(resetEntity.updatedAt).not.toBe(mockSettings.updated_at)
      expect(new Date(resetEntity.updatedAt).getTime()).toBeGreaterThan(
        new Date(mockSettings.updated_at).getTime()
      )
    })

    it('should not modify original entity', () => {
      const mockSettings = createMockCustomEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)
      const originalTodayEmoji = entity.todayEmoji

      entity.resetToDefaults()

      expect(entity.todayEmoji).toBe(originalTodayEmoji)
    })
  })

  describe('updateSettings', () => {
    it('should update settings with valid request', () => {
      const mockSettings = createMockEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)
      const updateRequest = createMockValidEmojiUpdateRequest()

      const updatedEntity = entity.updateSettings(updateRequest)

      expect(updatedEntity.todayEmoji).toBe(updateRequest.today_emoji)
      expect(updatedEntity.tomorrowEmoji).toBe(updateRequest.tomorrow_emoji)
      expect(updatedEntity.laterEmoji).toBe(updateRequest.later_emoji)
    })

    it('should preserve non-emoji properties', () => {
      const mockSettings = createMockEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)
      const updateRequest = createMockValidEmojiUpdateRequest()

      const updatedEntity = entity.updateSettings(updateRequest)

      expect(updatedEntity.id).toBe(mockSettings.id)
      expect(updatedEntity.userId).toBe(mockSettings.user_id)
      expect(updatedEntity.createdAt).toBe(mockSettings.created_at)
    })

    it('should update the updated_at timestamp', () => {
      const mockSettings = createMockEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)
      const updateRequest = createMockValidEmojiUpdateRequest()

      const updatedEntity = entity.updateSettings(updateRequest)

      expect(updatedEntity.updatedAt).not.toBe(mockSettings.updated_at)
      expect(new Date(updatedEntity.updatedAt).getTime()).toBeGreaterThan(
        new Date(mockSettings.updated_at).getTime()
      )
    })

    it('should not modify original entity', () => {
      const mockSettings = createMockEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)
      const originalTodayEmoji = entity.todayEmoji
      const updateRequest = createMockValidEmojiUpdateRequest()

      entity.updateSettings(updateRequest)

      expect(entity.todayEmoji).toBe(originalTodayEmoji)
    })
  })

  describe('toPlainObject', () => {
    it('should return a copy of the original settings object', () => {
      const mockSettings = createMockEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)
      const plainObject = entity.toPlainObject()

      expect(plainObject).toEqual(mockSettings)
      expect(plainObject).not.toBe(mockSettings) // Should be a copy
    })

    it('should preserve all properties', () => {
      const mockSettings = createMockCustomEmojiSetting()
      const entity = new EmojiSettingsEntity(mockSettings)
      const plainObject = entity.toPlainObject()

      expect(plainObject.id).toBe(mockSettings.id)
      expect(plainObject.user_id).toBe(mockSettings.user_id)
      expect(plainObject.today_emoji).toBe(mockSettings.today_emoji)
      expect(plainObject.tomorrow_emoji).toBe(mockSettings.tomorrow_emoji)
      expect(plainObject.later_emoji).toBe(mockSettings.later_emoji)
      expect(plainObject.created_at).toBe(mockSettings.created_at)
      expect(plainObject.updated_at).toBe(mockSettings.updated_at)
    })
  })

  describe('fromPlainObject', () => {
    it('should create EmojiSettingsEntity from plain object', () => {
      const mockSettings = createMockEmojiSetting()
      const entity = EmojiSettingsEntity.fromPlainObject(mockSettings)

      expect(entity).toBeInstanceOf(EmojiSettingsEntity)
      expect(entity.id).toBe(mockSettings.id)
      expect(entity.userId).toBe(mockSettings.user_id)
      expect(entity.todayEmoji).toBe(mockSettings.today_emoji)
    })
  })

  describe('static methods', () => {
    describe('validateEmojiUpdateRequest', () => {
      it('should validate correct emoji request', () => {
        const request = createMockValidEmojiUpdateRequest()
        const validation = EmojiSettingsEntity.validateEmojiUpdateRequest(request)

        expect(validation.valid).toBe(true)
        expect(validation.errors).toHaveLength(0)
      })

      it('should validate default emoji request', () => {
        const request = createMockEmojiUpdateRequest()
        const validation = EmojiSettingsEntity.validateEmojiUpdateRequest(request)

        expect(validation.valid).toBe(true)
        expect(validation.errors).toHaveLength(0)
      })

      it('should reject invalid emoji names', () => {
        const request = createMockInvalidEmojiUpdateRequest()
        const validation = EmojiSettingsEntity.validateEmojiUpdateRequest(request)

        expect(validation.valid).toBe(false)
        expect(validation.errors).toHaveLength(3)
        expect(validation.errors[0]).toContain('Invalid today_emoji')
        expect(validation.errors[1]).toContain('Invalid tomorrow_emoji')
        expect(validation.errors[2]).toContain('Invalid later_emoji')
      })

      it('should reject duplicate emojis', () => {
        const request = createMockDuplicateEmojiUpdateRequest()
        const validation = EmojiSettingsEntity.validateEmojiUpdateRequest(request)

        expect(validation.valid).toBe(false)
        expect(validation.errors).toContain('Each emoji must be unique across today, tomorrow, and later settings')
      })

      it('should reject empty emoji names', () => {
        const request = createMockEmptyEmojiUpdateRequest()
        const validation = EmojiSettingsEntity.validateEmojiUpdateRequest(request)

        expect(validation.valid).toBe(false)
        expect(validation.errors.length).toBeGreaterThan(0)
      })

      it('should handle mixed valid and invalid emojis', () => {
        const request = createMockMixedValidInvalidEmojiUpdateRequest()
        const validation = EmojiSettingsEntity.validateEmojiUpdateRequest(request)

        expect(validation.valid).toBe(false)
        expect(validation.errors).toHaveLength(1)
        expect(validation.errors[0]).toContain('Invalid tomorrow_emoji')
      })

      it('should validate all available emojis individually', () => {
        VALID_EMOJI_NAMES.forEach(emojiName => {
          const request = {
            today_emoji: emojiName,
            tomorrow_emoji: 'fire', // Use a different valid emoji
            later_emoji: 'memo'
          }

          // Ensure no duplicates
          if (emojiName === 'fire') {request.tomorrow_emoji = 'calendar'}
          if (emojiName === 'memo') {request.later_emoji = 'star'}

          const validation = EmojiSettingsEntity.validateEmojiUpdateRequest(request)
          expect(validation.valid).toBe(true)
        })
      })

      it('should reject all invalid emoji names', () => {
        INVALID_EMOJI_NAMES.forEach(invalidEmoji => {
          if (invalidEmoji === null || invalidEmoji === undefined) {return}

          const request = {
            today_emoji: invalidEmoji,
            tomorrow_emoji: 'calendar',
            later_emoji: 'memo'
          }

          const validation = EmojiSettingsEntity.validateEmojiUpdateRequest(request)
          expect(validation.valid).toBe(false)
          expect(validation.errors.some(error => error.includes('Invalid today_emoji'))).toBe(true)
        })
      })
    })

    describe('getAvailableEmojiByName', () => {
      it('should return emoji for valid names', () => {
        VALID_EMOJI_NAMES.forEach(name => {
          const emoji = EmojiSettingsEntity.getAvailableEmojiByName(name)
          expect(emoji).not.toBeNull()
          expect(emoji!.name).toBe(name)
        })
      })

      it('should return null for invalid names', () => {
        INVALID_EMOJI_NAMES.forEach(invalidName => {
          if (invalidName === null || invalidName === undefined) {return}
          const emoji = EmojiSettingsEntity.getAvailableEmojiByName(invalidName)
          expect(emoji).toBeNull()
        })
      })

      it('should return correct emoji properties', () => {
        const fireEmoji = EmojiSettingsEntity.getAvailableEmojiByName('fire')
        expect(fireEmoji).toEqual({
          name: 'fire',
          display: '🔥',
          label: '緊急'
        })
      })
    })

    describe('getAvailableEmojis', () => {
      it('should return all available emojis', () => {
        const emojis = EmojiSettingsEntity.getAvailableEmojis()
        expect(emojis).toHaveLength(AVAILABLE_EMOJIS.length)
        expect(emojis).toEqual(AVAILABLE_EMOJIS)
      })

      it('should return a copy, not reference', () => {
        const emojis = EmojiSettingsEntity.getAvailableEmojis()
        expect(emojis).not.toBe(AVAILABLE_EMOJIS)
      })
    })

    describe('createWithDefaults', () => {
      it('should create settings with default emojis', () => {
        const userId = 'test-user-123'
        const settings = EmojiSettingsEntity.createWithDefaults(userId)

        expect(settings.user_id).toBe(userId)
        expect(settings.today_emoji).toBe(DEFAULT_EMOJI_SETTINGS.today_emoji)
        expect(settings.tomorrow_emoji).toBe(DEFAULT_EMOJI_SETTINGS.tomorrow_emoji)
        expect(settings.later_emoji).toBe(DEFAULT_EMOJI_SETTINGS.later_emoji)
      })

      it('should not include id, created_at, or updated_at', () => {
        const settings = EmojiSettingsEntity.createWithDefaults('user-123')
        expect(settings).not.toHaveProperty('id')
        expect(settings).not.toHaveProperty('created_at')
        expect(settings).not.toHaveProperty('updated_at')
      })
    })

    describe('createFromUpdateRequest', () => {
      it('should create settings from update request', () => {
        const userId = 'test-user-123'
        const updateRequest = createMockValidEmojiUpdateRequest()
        const settings = EmojiSettingsEntity.createFromUpdateRequest(userId, updateRequest)

        expect(settings.user_id).toBe(userId)
        expect(settings.today_emoji).toBe(updateRequest.today_emoji)
        expect(settings.tomorrow_emoji).toBe(updateRequest.tomorrow_emoji)
        expect(settings.later_emoji).toBe(updateRequest.later_emoji)
      })

      it('should not include id, created_at, or updated_at', () => {
        const updateRequest = createMockValidEmojiUpdateRequest()
        const settings = EmojiSettingsEntity.createFromUpdateRequest('user-123', updateRequest)

        expect(settings).not.toHaveProperty('id')
        expect(settings).not.toHaveProperty('created_at')
        expect(settings).not.toHaveProperty('updated_at')
      })
    })
  })

  describe('immutability', () => {
    it('should not modify original settings when entity methods are called', () => {
      const mockSettings = createMockEmojiSetting()
      const originalSettings = { ...mockSettings }
      const entity = new EmojiSettingsEntity(mockSettings)

      // Perform operations that might modify internal state
      entity.isDefaultSetting()
      entity.hasCustomization()
      entity.getEmojiForUrgency('today')
      entity.getUrgencyForEmoji('fire')
      entity.toPlainObject()

      expect(mockSettings).toEqual(originalSettings)
    })

    it('should not modify original settings when creating new entities', () => {
      const mockSettings = createMockEmojiSetting()
      const originalSettings = { ...mockSettings }
      const entity = new EmojiSettingsEntity(mockSettings)
      const updateRequest = createMockValidEmojiUpdateRequest()

      // Create new entities
      entity.resetToDefaults()
      entity.updateSettings(updateRequest)

      expect(mockSettings).toEqual(originalSettings)
    })

    it('should not modify original settings when toPlainObject is modified', () => {
      const mockSettings = createMockEmojiSetting()
      const originalSettings = { ...mockSettings }
      const entity = new EmojiSettingsEntity(mockSettings)

      const plainObject = entity.toPlainObject()
      plainObject.today_emoji = 'modified'

      expect(mockSettings).toEqual(originalSettings)
      expect(entity.todayEmoji).toBe(originalSettings.today_emoji)
    })
  })

  describe('edge cases', () => {
    it('should handle user ID with special characters', () => {
      const specialUserId = 'user-123@#$%^&*()'
      const mockSettings = createMockEmojiSetting({ user_id: specialUserId })
      const entity = new EmojiSettingsEntity(mockSettings)

      expect(entity.userId).toBe(specialUserId)
    })

    it('should handle very long emoji names', () => {
      const longEmojiName = 'a'.repeat(1000)
      const mockSettings = createMockEmojiSetting({ today_emoji: longEmojiName })
      const entity = new EmojiSettingsEntity(mockSettings)

      expect(entity.todayEmoji).toBe(longEmojiName)
      expect(entity.getUrgencyForEmoji(longEmojiName)).toBe('today')
    })

    it('should handle case sensitivity correctly', () => {
      const validation = EmojiSettingsEntity.validateEmojiUpdateRequest({
        today_emoji: 'FIRE', // uppercase
        tomorrow_emoji: 'Calendar', // mixed case
        later_emoji: 'memo'
      })

      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })
  })
})
