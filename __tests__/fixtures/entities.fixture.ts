/**
 * Test fixtures for entity objects
 * エンティティテスト用の共通フィクスチャ
 */

import { User, UserEmojiSettings } from '@/lib/entities/User'
import { SlackConnection, SlackWebhook } from '@/lib/entities/SlackConnection'
import { Todo } from '@/lib/entities/Todo'

// User fixtures
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  email: 'test@example.com',
  slack_user_id: 'U1234567890',
  enable_webhook_notifications: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides
})

export const createMockUserWithoutSlackId = (): User => 
  createMockUser({ slack_user_id: null })

export const createMockUserWithNotificationsDisabled = (): User =>
  createMockUser({ enable_webhook_notifications: false })

export const createMockUserEmojiSettings = (overrides: Partial<UserEmojiSettings> = {}): UserEmojiSettings => ({
  id: 'emoji-settings-123',
  user_id: 'user-123',
  today_emoji: 'fire',
  tomorrow_emoji: 'calendar',
  later_emoji: 'memo',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides
})

// SlackConnection fixtures
export const createMockSlackConnection = (overrides: Partial<SlackConnection> = {}): SlackConnection => ({
  id: 'slack-conn-123',
  user_id: 'user-123',
  workspace_id: 'T1234567890',
  workspace_name: 'Test Workspace',
  team_name: 'Test Team',
  access_token: 'xoxp-test-token',
  scope: 'channels:read,chat:write,reactions:read',
  created_at: '2023-01-01T00:00:00Z',
  ...overrides
})

export const createMockSlackConnectionWithInvalidWorkspaceId = (): SlackConnection =>
  createMockSlackConnection({ workspace_id: 'invalid-workspace-id' })

export const createMockSlackConnectionWithLimitedScope = (): SlackConnection =>
  createMockSlackConnection({ scope: 'channels:read' })

// SlackWebhook fixtures
export const createMockSlackWebhook = (overrides: Partial<SlackWebhook> = {}): SlackWebhook => ({
  id: 'webhook-123',
  user_id: 'user-123',
  slack_connection_id: 'slack-conn-123',
  webhook_id: 'whook-123',
  webhook_secret: 'secret-123',
  is_active: true,
  last_event_at: null,
  event_count: 0,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides
})

export const createMockInactiveSlackWebhook = (): SlackWebhook =>
  createMockSlackWebhook({ is_active: false })

export const createMockSlackWebhookWithEvents = (eventCount: number = 5): SlackWebhook =>
  createMockSlackWebhook({ 
    event_count: eventCount,
    last_event_at: '2023-01-15T12:00:00Z'
  })

// Todo fixtures
export const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 'todo-123',
  user_id: 'user-123',
  title: 'Test Todo',
  body: 'This is a test todo',
  status: 'open',
  deadline: null,
  importance_score: 0.5,
  created_via: 'manual',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  completed_at: null,
  ...overrides
})

export const createMockCompletedTodo = (): Todo =>
  createMockTodo({ 
    status: 'done',
    completed_at: '2023-01-15T12:00:00Z'
  })

export const createMockOverdueTodo = (): Todo =>
  createMockTodo({ 
    deadline: '2023-01-10', // Past date (YYYY-MM-DD format)
    importance_score: 0.7
  })

export const createMockTodayTodo = (): Todo =>
  createMockTodo({ 
    deadline: '2023-01-15', // Today (when mocked) (YYYY-MM-DD format)
    importance_score: 0.6
  })

export const createMockTomorrowTodo = (): Todo =>
  createMockTodo({ 
    deadline: '2023-01-16', // Tomorrow (when mocked) (YYYY-MM-DD format)
    importance_score: 0.4
  })

export const createMockImportantTodo = (): Todo =>
  createMockTodo({ 
    importance_score: 0.8,
    title: 'Important Task'
  })

export const createMockUrgentImportantTodo = (): Todo =>
  createMockTodo({
    deadline: '2023-01-15T00:00:00Z', // Today
    importance_score: 0.8,
    title: 'Urgent & Important Task'
  })

export const createMockSlackWebhookTodo = (): Todo =>
  createMockTodo({
    created_via: 'slack_webhook',
    title: 'Task from Slack',
    body: 'This task was created from a Slack reaction'
  })

// Date constants for consistent testing
export const MOCK_DATE = '2023-01-15T00:00:00Z'
export const MOCK_YESTERDAY = '2023-01-14T00:00:00Z'
export const MOCK_TODAY = '2023-01-15T00:00:00Z'
export const MOCK_TOMORROW = '2023-01-16T00:00:00Z'
export const MOCK_NEXT_WEEK = '2023-01-22T00:00:00Z'

// Valid Slack ID patterns for testing
export const VALID_SLACK_USER_IDS = [
  'U1234567890',
  'U12345678901234567890',
  'UABCDEFGHIJ'
]

export const INVALID_SLACK_USER_IDS = [
  'user-123',          // doesn't start with U
  'U123',              // too short
  'U123456789@',       // contains special chars
  '',                  // empty
  'u1234567890'        // lowercase
]

export const VALID_SLACK_WORKSPACE_IDS = [
  'T1234567890',
  'T12345678901234567890',
  'TABCDEFGHIJ'
]

export const INVALID_SLACK_WORKSPACE_IDS = [
  'workspace-123',     // doesn't start with T
  'T123',              // too short
  'T123456789@',       // contains special chars
  '',                  // empty
  't1234567890'        // lowercase
]