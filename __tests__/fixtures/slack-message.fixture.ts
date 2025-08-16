/**
 * Test fixtures for SlackMessage entities
 * Slackメッセージエンティティテスト用の共通フィクスチャ
 */

import { SlackMessageRequest, SlackConnectionMatch, SlackMessageData } from '@/lib/entities/SlackMessage'

// 有効なSlack URLのパターン
export const VALID_SLACK_URLS = [
  'https://example.slack.com/archives/C1234567890/p1234567890123456',
  'https://test-workspace.slack.com/archives/C0987654321/p9876543210987654',
  'https://my-team.slack.com/archives/C1111111111/p1111111111111111?thread_ts=1111111111.111111',
  'https://workspace123.slack.com/archives/GENERAL/p1234567890123456'
]

// 無効なSlack URLのパターン
export const INVALID_SLACK_URLS = [
  'not-a-url',
  'https://example.com/some-path',
  'https://slack.com/invalid',
  'https://example.slack.com/invalid-format',
  '',
  'ftp://invalid.slack.com/archives/C123/p123'
]

// モックSlackメッセージリクエスト
export const createMockSlackMessageRequest = (overrides: Partial<SlackMessageRequest> = {}): SlackMessageRequest => ({
  slackUrl: 'https://example.slack.com/archives/C1234567890/p1234567890123456',
  userId: 'user-123',
  ...overrides
})

// モックSlack接続データ
export const createMockSlackConnection = (overrides: Partial<SlackConnectionMatch> = {}): SlackConnectionMatch => ({
  workspace_id: 'T1234567890',
  workspace_name: 'Example Workspace',
  team_name: 'Example Team',
  access_token: 'xoxp-example-token',
  ...overrides
})

// 複数の接続データ
export const createMultipleConnections = (): SlackConnectionMatch[] => [
  createMockSlackConnection({
    workspace_id: 'T1111111111',
    workspace_name: 'First Workspace',
    team_name: 'First Team',
    access_token: 'xoxp-first-token'
  }),
  createMockSlackConnection({
    workspace_id: 'T2222222222',
    workspace_name: 'Second Workspace',
    team_name: 'Second Team',
    access_token: 'xoxp-second-token'
  }),
  createMockSlackConnection({
    workspace_id: 'T3333333333',
    workspace_name: 'Third Workspace',
    team_name: 'Third Team',
    access_token: 'xoxp-third-token'
  })
]

// Slackメッセージデータ
export const createMockSlackMessageData = (overrides: Partial<SlackMessageData> = {}): SlackMessageData => ({
  text: 'Hello, this is a test message',
  user: 'U1234567890',
  timestamp: '1234567890.123456',
  channel: 'C1234567890',
  url: 'https://example.slack.com/archives/C1234567890/p1234567890123456',
  workspace: 'Example Workspace',
  ...overrides
})

// Slack API レスポンスのモック
export const createMockSlackApiResponse = (overrides: any = {}) => ({
  text: 'Hello, this is a test message',
  user: 'U1234567890',
  timestamp: '1234567890.123456',
  channel: 'C1234567890',
  ...overrides
})

// ワークスペースマッチングのテストケース
export const WORKSPACE_MATCHING_TEST_CASES = [
  {
    name: 'exact workspace_id match',
    url: 'https://T1234567890.slack.com/archives/C123/p1234567890123456',
    connections: [
      createMockSlackConnection({ workspace_id: 'T1234567890', workspace_name: 'Example' }),
      createMockSlackConnection({ workspace_id: 'T9999999999', workspace_name: 'Other' })
    ],
    expectedWorkspaceId: 'T1234567890',
    expectedReason: 'exact_id'
  },
  {
    name: 'workspace_name case-insensitive match',
    url: 'https://example-workspace.slack.com/archives/C123/p1234567890123456',
    connections: [
      createMockSlackConnection({ workspace_id: 'T1111111111', workspace_name: 'Other Workspace' }),
      createMockSlackConnection({ workspace_id: 'T2222222222', workspace_name: 'Example Workspace' })
    ],
    expectedWorkspaceId: 'T2222222222',
    expectedReason: 'name_match'
  },
  {
    name: 'team_name case-insensitive match',
    url: 'https://my-team.slack.com/archives/C123/p1234567890123456',
    connections: [
      createMockSlackConnection({ workspace_id: 'T1111111111', team_name: 'Other Team' }),
      createMockSlackConnection({ workspace_id: 'T3333333333', team_name: 'My Team' })
    ],
    expectedWorkspaceId: 'T3333333333',
    expectedReason: 'team_match'
  },
  {
    name: 'fallback to first connection',
    url: 'https://unknown.slack.com/archives/C123/p1234567890123456',
    connections: [
      createMockSlackConnection({ workspace_id: 'T1111111111', workspace_name: 'First' }),
      createMockSlackConnection({ workspace_id: 'T2222222222', workspace_name: 'Second' })
    ],
    expectedWorkspaceId: 'T1111111111',
    expectedReason: 'fallback'
  }
]

// バリデーションエラーのテストケース
export const VALIDATION_ERROR_TEST_CASES = [
  {
    name: 'missing slackUrl',
    request: createMockSlackMessageRequest({ slackUrl: '' }),
    expectedErrors: ['Valid Slack URL is required']
  },
  {
    name: 'invalid slackUrl type',
    request: createMockSlackMessageRequest({ slackUrl: null as any }),
    expectedErrors: ['Valid Slack URL is required']
  },
  {
    name: 'missing userId',
    request: createMockSlackMessageRequest({ userId: '' }),
    expectedErrors: ['Valid user ID is required']
  },
  {
    name: 'invalid slack URL format',
    request: createMockSlackMessageRequest({ slackUrl: 'not-a-valid-url' }),
    expectedErrors: ['Valid Slack URL is required']
  },
  {
    name: 'multiple validation errors',
    request: createMockSlackMessageRequest({ slackUrl: '', userId: '' }),
    expectedErrors: ['Valid user ID is required', 'Valid Slack URL is required']
  }
]

// エッジケースのテストデータ
export const EDGE_CASE_DATA = {
  emptyConnections: [],
  singleConnection: [createMockSlackConnection()],
  duplicateWorkspaceIds: [
    createMockSlackConnection({ workspace_id: 'T1234567890', workspace_name: 'First' }),
    createMockSlackConnection({ workspace_id: 'T1234567890', workspace_name: 'Duplicate' })
  ],
  specialCharacters: {
    url: 'https://special-chars.slack.com/archives/C123/p123',
    connection: createMockSlackConnection({
      workspace_name: 'Special & Chars 🚀',
      team_name: 'Team "Quotes" & Symbols'
    })
  }
}
