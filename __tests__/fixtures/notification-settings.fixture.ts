/**
 * Test fixtures for NotificationSettings entities
 * 通知設定エンティティテスト用の共通フィクスチャ
 */

import { NotificationSettings, NotificationUpdateRequest, DEFAULT_NOTIFICATION_SETTINGS } from '@/lib/entities/NotificationSettings'

// NotificationSettings fixtures
export const createMockNotificationSettings = (overrides: Partial<NotificationSettings> = {}): NotificationSettings => ({
  user_id: 'user-123',
  enable_webhook_notifications: DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications,
  ...overrides
})

export const createMockCustomNotificationSettings = (): NotificationSettings =>
  createMockNotificationSettings({
    enable_webhook_notifications: false
  })

export const createMockNotificationSettingsWithoutUpdatedAt = (): NotificationSettings => {
  return createMockNotificationSettings()
}

// NotificationUpdateRequest fixtures
export const createMockNotificationUpdateRequest = (overrides: Partial<NotificationUpdateRequest> = {}): NotificationUpdateRequest => ({
  enable_webhook_notifications: DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications,
  ...overrides
})

export const createMockValidNotificationUpdateRequest = (): NotificationUpdateRequest => ({
  enable_webhook_notifications: false
})

export const createMockInvalidNotificationUpdateRequest = (): any => ({
  enable_webhook_notifications: 'not-a-boolean' // Invalid type
})

export const createMockEmptyNotificationUpdateRequest = (): any => ({
  // Missing required field
})

export const createMockNullNotificationUpdateRequest = (): any => ({
  enable_webhook_notifications: null
})

export const createMockUndefinedNotificationUpdateRequest = (): any => ({
  enable_webhook_notifications: undefined
})

// Multiple notification settings for testing statistics
export const createMockMultipleNotificationSettings = (): NotificationSettings[] => [
  createMockNotificationSettings({ user_id: 'user-1', enable_webhook_notifications: true }), // Default
  createMockNotificationSettings({ user_id: 'user-2', enable_webhook_notifications: true }), // Default
  createMockNotificationSettings({ user_id: 'user-3', enable_webhook_notifications: false }), // Custom
  createMockNotificationSettings({ user_id: 'user-4', enable_webhook_notifications: false }), // Custom
  createMockNotificationSettings({ user_id: 'user-5', enable_webhook_notifications: true }), // Default
]

// Expected statistics for multiple settings
export const EXPECTED_NOTIFICATION_STATISTICS = {
  totalUsers: 5,
  enabledUsers: 3,
  disabledUsers: 2,
  enabledPercentage: 60
}

// Test data constants
export const VALID_NOTIFICATION_VALUES = [true, false]

export const INVALID_NOTIFICATION_VALUES = [
  'true',
  'false',
  1,
  0,
  'yes',
  'no',
  null,
  undefined,
  [],
  {},
  'not-a-boolean'
]

// Edge case test data
export const EDGE_CASE_USER_IDS = [
  'user-with-special-chars@#$%',
  'very-long-user-id-' + 'a'.repeat(100),
  '',
  'user with spaces',
  'ユーザー日本語',
  '123456789',
  'user-uuid-12345678-1234-1234-1234-123456789012'
]

// Test notification settings summary
export const createMockNotificationSummary = (enabled: boolean) => ({
  webhookNotifications: enabled ? 'enabled' as const : 'disabled' as const,
  isDefault: enabled === DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications
})