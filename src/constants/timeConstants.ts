/**
 * Time-related constants
 * 時間関連の定数定義
 */

// Milliseconds conversions
export const MILLISECONDS_PER_SECOND = 1000
export const MILLISECONDS_PER_MINUTE = 60 * MILLISECONDS_PER_SECOND
export const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE
export const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR

// Common timeout values
export const LOADING_TIMEOUT_MS = 3000
export const MESSAGE_DISPLAY_TIMEOUT_MS = 3000
export const SETTINGS_DEBOUNCE_TIMEOUT_MS = 1000

// Session validation interval (5 minutes)
export const SESSION_VALIDATION_INTERVAL_MS = 5 * MILLISECONDS_PER_MINUTE

// Slack retry delay
export const SLACK_RETRY_BASE_DELAY_MS = 1000
