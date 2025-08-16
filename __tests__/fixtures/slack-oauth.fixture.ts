/**
 * Test fixtures for SlackOAuth entities
 * Slack OAuth エンティティテスト用の共通フィクスチャ
 */

import { SlackOAuthTokenData } from '@/lib/entities/SlackOAuth'

// Valid OAuth token response
export const createMockSlackOAuthTokenData = (overrides: Partial<SlackOAuthTokenData> = {}): SlackOAuthTokenData => ({
  ok: true,
  app_id: 'A1234567890',
  team: {
    id: 'T1234567890',
    name: 'Test Workspace'
  },
  authed_user: {
    id: 'U1234567890',
    scope: 'channels:read,chat:write,users:read',
    access_token: 'xoxp-test-user-token',
    token_type: 'bearer'
  },
  scope: 'channels:read,chat:write,users:read,reactions:read',
  bot_user_id: 'U9876543210',
  access_token: 'xoxb-test-bot-token',
  token_type: 'bearer',
  enterprise: null,
  is_enterprise_install: false,
  ...overrides
})

// OAuth response with error
export const createMockSlackOAuthError = (): SlackOAuthTokenData => ({
  ok: false,
  error: 'access_denied',
  team: { id: '', name: '' },
  scope: '',
  access_token: ''
})

// OAuth response missing required fields
export const createMockSlackOAuthIncomplete = (): SlackOAuthTokenData => ({
  ok: true,
  team: {
    id: '',
    name: ''
  },
  scope: '',
  access_token: ''
})

// OAuth response with only user token
export const createMockSlackOAuthUserOnly = (): SlackOAuthTokenData => ({
  ok: true,
  app_id: 'A1234567890',
  team: {
    id: 'T1234567890',
    name: 'User Only Workspace'
  },
  authed_user: {
    id: 'U1111111111',
    scope: 'channels:read,chat:write',
    access_token: 'xoxp-user-only-token',
    token_type: 'bearer'
  },
  scope: '',
  access_token: ''
})

// OAuth response with only bot token
export const createMockSlackOAuthBotOnly = (): SlackOAuthTokenData => ({
  ok: true,
  app_id: 'A1234567890',
  team: {
    id: 'T1234567890',
    name: 'Bot Only Workspace'
  },
  scope: 'channels:read,chat:write,reactions:read',
  bot_user_id: 'U9999999999',
  access_token: 'xoxb-bot-only-token',
  token_type: 'bearer'
})

// OAuth response with enterprise install
export const createMockSlackOAuthEnterprise = (): SlackOAuthTokenData => ({
  ok: true,
  app_id: 'A1234567890',
  team: {
    id: 'T1234567890',
    name: 'Enterprise Workspace'
  },
  authed_user: {
    id: 'U1234567890',
    scope: 'channels:read,chat:write,users:read',
    access_token: 'xoxp-enterprise-token',
    token_type: 'bearer'
  },
  scope: 'channels:read,chat:write,users:read,reactions:read',
  bot_user_id: 'U9876543210',
  access_token: 'xoxb-enterprise-token',
  token_type: 'bearer',
  enterprise: {
    id: 'E1234567890',
    name: 'Enterprise Grid'
  },
  is_enterprise_install: true
})

// OAuth response with invalid Slack User ID
export const createMockSlackOAuthInvalidUserId = (): SlackOAuthTokenData => ({
  ok: true,
  app_id: 'A1234567890',
  team: {
    id: 'T1234567890',
    name: 'Invalid User ID Workspace'
  },
  authed_user: {
    id: 'INVALID_USER_ID',
    scope: 'channels:read,chat:write',
    access_token: 'xoxp-invalid-user-token',
    token_type: 'bearer'
  },
  scope: 'channels:read,chat:write',
  access_token: 'xoxb-invalid-user-token'
})

// OAuth response with minimal scope
export const createMockSlackOAuthMinimalScope = (): SlackOAuthTokenData => ({
  ok: true,
  app_id: 'A1234567890',
  team: {
    id: 'T1234567890',
    name: 'Minimal Scope Workspace'
  },
  authed_user: {
    id: 'U1234567890',
    scope: 'identify',
    access_token: 'xoxp-minimal-token',
    token_type: 'bearer'
  },
  scope: 'identify',
  access_token: 'xoxb-minimal-token'
})

// Edge case test data
export const VALID_SLACK_USER_IDS = [
  'U1234567890',
  'U123456789',
  'U123456789ABC',
  'UAAAAAAAAAAA'
]

export const INVALID_SLACK_USER_IDS = [
  'INVALID_ID',
  'U123',
  'A1234567890',
  '',
  '1234567890',
  'u1234567890'
]

export const VALID_TEAM_IDS = [
  'T1234567890',
  'T123456789',
  'T123456789ABC'
]

export const INVALID_TEAM_IDS = [
  'INVALID_ID',
  'T123',
  'A1234567890',
  '',
  '1234567890'
]

export const SCOPE_COMBINATIONS = {
  basic: 'channels:read',
  standard: 'channels:read,chat:write',
  extended: 'channels:read,chat:write,users:read',
  full: 'channels:read,chat:write,users:read,reactions:read,reactions:write',
  minimal: 'identify',
  empty: '',
  invalid: 'invalid:scope,another:invalid'
}

// Expected connection data
export const EXPECTED_CONNECTION_DATA = {
  user_id: 'test-user-123',
  workspace_id: 'T1234567890',
  workspace_name: 'Test Workspace',
  team_name: 'Test Workspace',
  access_token: 'xoxp-test-user-token',
  bot_user_id: 'U9876543210',
  scope: 'channels:read,chat:write,users:read'
}
