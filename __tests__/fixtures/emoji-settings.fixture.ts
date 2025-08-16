/**
 * Test fixtures for EmojiSettings entities
 * 絵文字設定エンティティテスト用の共通フィクスチャ
 */

import { EmojiSetting, EmojiUpdateRequest, AvailableEmoji, DEFAULT_EMOJI_SETTINGS } from '@/lib/entities/EmojiSettings'

// EmojiSetting fixtures
export const createMockEmojiSetting = (overrides: Partial<EmojiSetting> = {}): EmojiSetting => ({
  id: 'emoji-setting-123',
  user_id: 'user-123',
  today_emoji: DEFAULT_EMOJI_SETTINGS.today_emoji,
  tomorrow_emoji: DEFAULT_EMOJI_SETTINGS.tomorrow_emoji,
  later_emoji: DEFAULT_EMOJI_SETTINGS.later_emoji,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides
})

export const createMockCustomEmojiSetting = (): EmojiSetting =>
  createMockEmojiSetting({
    today_emoji: 'warning',
    tomorrow_emoji: 'clock',
    later_emoji: 'bookmark'
  })

export const createMockEmojiSettingWithDuplicates = (): EmojiSetting =>
  createMockEmojiSetting({
    today_emoji: 'fire',
    tomorrow_emoji: 'fire', // Duplicate
    later_emoji: 'memo'
  })

// EmojiUpdateRequest fixtures
export const createMockEmojiUpdateRequest = (overrides: Partial<EmojiUpdateRequest> = {}): EmojiUpdateRequest => ({
  today_emoji: DEFAULT_EMOJI_SETTINGS.today_emoji,
  tomorrow_emoji: DEFAULT_EMOJI_SETTINGS.tomorrow_emoji,
  later_emoji: DEFAULT_EMOJI_SETTINGS.later_emoji,
  ...overrides
})

export const createMockValidEmojiUpdateRequest = (): EmojiUpdateRequest => ({
  today_emoji: 'warning',
  tomorrow_emoji: 'clock',
  later_emoji: 'bookmark'
})

export const createMockInvalidEmojiUpdateRequest = (): EmojiUpdateRequest => ({
  today_emoji: 'invalid_emoji',
  tomorrow_emoji: 'another_invalid',
  later_emoji: 'also_invalid'
})

export const createMockDuplicateEmojiUpdateRequest = (): EmojiUpdateRequest => ({
  today_emoji: 'fire',
  tomorrow_emoji: 'fire', // Duplicate
  later_emoji: 'memo'
})

// AvailableEmoji fixtures
export const createMockAvailableEmoji = (overrides: Partial<AvailableEmoji> = {}): AvailableEmoji => ({
  name: 'fire',
  display: '🔥',
  label: '緊急',
  ...overrides
})

// Test data constants
export const VALID_EMOJI_NAMES = [
  'fire', 'calendar', 'memo', 'warning', 'clock',
  'hourglass', 'pushpin', 'bookmark', 'bulb', 'star', 'zap', 'bell'
]

export const INVALID_EMOJI_NAMES = [
  'invalid_emoji',
  'nonexistent',
  '',
  'fire_invalid',
  'FIRE', // Case sensitive
  '🔥', // Display character instead of name
  null as any,
  undefined as any
]

// Edge case test data
export const createMockEmptyEmojiUpdateRequest = (): EmojiUpdateRequest => ({
  today_emoji: '',
  tomorrow_emoji: '',
  later_emoji: ''
})

export const createMockMixedValidInvalidEmojiUpdateRequest = (): EmojiUpdateRequest => ({
  today_emoji: 'fire', // valid
  tomorrow_emoji: 'invalid_emoji', // invalid
  later_emoji: 'memo' // valid
})

// Multiple users emoji settings for statistics testing
export const createMockMultipleEmojiSettings = (): EmojiSetting[] => [
  createMockEmojiSetting({ user_id: 'user-1', id: 'emoji-1' }), // Default settings
  createMockEmojiSetting({ user_id: 'user-2', id: 'emoji-2' }), // Default settings
  createMockCustomEmojiSetting(), // Custom settings
  createMockEmojiSetting({
    user_id: 'user-4',
    id: 'emoji-4',
    today_emoji: 'star',
    tomorrow_emoji: 'bulb',
    later_emoji: 'zap'
  }),
  createMockEmojiSetting({
    user_id: 'user-5',
    id: 'emoji-5',
    today_emoji: 'fire', // Popular choice
    tomorrow_emoji: 'bell',
    later_emoji: 'pushpin'
  })
]

// Expected statistics for multiple settings
export const EXPECTED_EMOJI_STATISTICS = {
  totalUsers: 5,
  defaultUsers: 2,
  customUsers: 3,
  popularEmojis: [
    { emoji: 'fire', count: 3 }, // Default + custom usage
    { emoji: 'calendar', count: 2 }, // Default usage
    { emoji: 'memo', count: 2 }, // Default usage
    { emoji: 'warning', count: 1 },
    { emoji: 'clock', count: 1 },
    { emoji: 'bookmark', count: 1 },
    { emoji: 'star', count: 1 },
    { emoji: 'bulb', count: 1 },
    { emoji: 'zap', count: 1 },
    { emoji: 'bell', count: 1 },
    { emoji: 'pushpin', count: 1 }
  ]
}

// Urgency mapping test data
export const URGENCY_EMOJI_TEST_CASES = [
  { urgency: 'today' as const, expectedEmoji: 'fire' },
  { urgency: 'tomorrow' as const, expectedEmoji: 'calendar' },
  { urgency: 'later' as const, expectedEmoji: 'memo' }
]

export const EMOJI_URGENCY_TEST_CASES = [
  { emoji: 'fire', expectedUrgency: 'today' as const },
  { emoji: 'calendar', expectedUrgency: 'tomorrow' as const },
  { emoji: 'memo', expectedUrgency: 'later' as const },
  { emoji: 'warning', expectedUrgency: null }, // Not in default settings
  { emoji: 'invalid', expectedUrgency: null }
]
