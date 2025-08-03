/**
 * Test fixtures for SlackConnection entities
 * Slack接続エンティティテスト用の共通フィクスチャ
 */

import { SlackConnection } from '@/lib/entities/SlackConnection'

// SlackConnection fixtures
export const createMockSlackConnection = (overrides: Partial<SlackConnection> = {}): SlackConnection => ({
  id: 'slack-connection-test-id',
  user_id: 'user-123',
  workspace_id: 'T1234567890',
  workspace_name: 'Test Workspace',
  team_name: 'Test Team',
  access_token: 'xoxp-test-access-token',
  scope: 'channels:read,chat:write,users:read',
  created_at: '2023-01-01T00:00:00Z',
  ...overrides
})

export const createMockSlackConnectionRecent = (): SlackConnection =>
  createMockSlackConnection({
    id: 'recent-connection-id',
    workspace_name: 'Recent Workspace',
    team_name: 'Recent Team',
    created_at: new Date().toISOString()
  })

export const createMockSlackConnectionOld = (): SlackConnection =>
  createMockSlackConnection({
    id: 'old-connection-id',
    workspace_name: 'Old Workspace',
    team_name: 'Old Team',
    created_at: '2022-01-01T00:00:00Z'
  })

export const createMockSlackConnectionInvalidWorkspace = (): SlackConnection =>
  createMockSlackConnection({
    id: 'invalid-workspace-id',
    workspace_id: 'INVALID_ID',
    workspace_name: 'Invalid Workspace',
    team_name: 'Invalid Team'
  })

export const createMockSlackConnectionMinimalScope = (): SlackConnection =>
  createMockSlackConnection({
    id: 'minimal-scope-id',
    workspace_name: 'Minimal Scope Workspace',
    scope: 'channels:read'
  })

export const createMockSlackConnectionFullScope = (): SlackConnection =>
  createMockSlackConnection({
    id: 'full-scope-id',
    workspace_name: 'Full Scope Workspace',
    scope: 'channels:read,chat:write,users:read,reactions:read,reactions:write'
  })

export const createMockSlackConnectionDifferentUser = (): SlackConnection =>
  createMockSlackConnection({
    id: 'different-user-connection',
    user_id: 'different-user-id',
    workspace_name: 'Different User Workspace'
  })

// Multiple connections for testing lists
export const createMockMultipleSlackConnections = (): SlackConnection[] => [
  createMockSlackConnection({ 
    id: 'conn-1', 
    workspace_name: 'Workspace 1',
    team_name: 'Team Alpha',
    created_at: '2023-01-01T00:00:00Z'
  }),
  createMockSlackConnection({ 
    id: 'conn-2', 
    workspace_name: 'Workspace 2',
    team_name: 'Team Beta',
    created_at: '2023-02-01T00:00:00Z'
  }),
  createMockSlackConnection({ 
    id: 'conn-3', 
    workspace_name: 'Workspace 3',
    team_name: 'Team Gamma',
    created_at: '2023-03-01T00:00:00Z'
  })
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

export const EDGE_CASE_WORKSPACE_IDS = [
  'T1234567890', // Valid
  'T123456789', // Valid (minimum length)
  'T123456789ABC', // Valid (longer)
  'INVALID_ID', // Invalid format
  'T123', // Too short
  'A1234567890', // Wrong prefix
  '', // Empty
  '123456789' // No prefix
]

export const VALID_SCOPE_COMBINATIONS = [
  'channels:read',
  'channels:read,chat:write',
  'channels:read,chat:write,users:read',
  'channels:read,chat:write,users:read,reactions:read,reactions:write'
]

export const INVALID_SCOPE_COMBINATIONS = [
  '',
  'invalid:scope',
  'channels read', // Invalid format (should be colon)
  'channels:,chat:write' // Invalid empty scope
]

// Expected test results
export const EXPECTED_CONNECTION_STATS = {
  totalConnections: 3,
  validConnections: 3,
  workspaceTypes: ['Team Alpha', 'Team Beta', 'Team Gamma']
}

// Test connection summary
export const createMockConnectionDisplaySummary = (enabled: boolean) => ({
  displayName: enabled ? 'Test Workspace (Test Team)' : 'Disabled Workspace (Disabled Team)',
  workspaceName: enabled ? 'Test Workspace' : 'Disabled Workspace',
  teamName: enabled ? 'Test Team' : 'Disabled Team',
  ageInDays: 1,
  isValid: enabled
})