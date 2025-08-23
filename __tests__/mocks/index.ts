/**
 * 共通モックユーティリティ
 * 各テストで再利用可能なSupabaseと外部APIのモック
 */

// import type { NextRequest } from 'next/server'

// Supabaseクライアントのモック
export const createMockSupabaseClient = (overrides: any = {}): any => {
  // チェーン可能なメソッドのモック
  const createMockChain = (): any => {
    // チェーンの状態を保持
    let finalValue: any = { data: [], error: null }

    const chain: any = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn(),

      // Promise のような振る舞い
      then: (resolve: (value: any) => any, reject?: (reason: any) => any): Promise<any> => {
        return Promise.resolve(finalValue).then(resolve, reject)
      },

      // 値を設定するためのヘルパーメソッド
      mockResolvedValue: jest.fn((value: any): any => {
        finalValue = value
        chain.single.mockResolvedValue(value)
        chain.order.mockResolvedValue(value)
        return chain
      }),

      mockResolvedValueOnce: jest.fn((value: any): any => {
        chain.single.mockResolvedValueOnce(value)
        chain.order.mockResolvedValueOnce(value)
        return chain
      })
    }

    // single と order はチェーンを返すか値を返すかを設定可能
    chain.single.mockResolvedValue({ data: null, error: null })
    chain.order.mockResolvedValue({ data: [], error: null })

    // チェーンメソッドが自分自身を返すように設定
    chain.select.mockReturnValue(chain)
    chain.insert.mockReturnValue(chain)
    chain.update.mockReturnValue(chain)
    chain.upsert.mockReturnValue(chain)
    chain.delete.mockReturnValue(chain)
    chain.eq.mockReturnValue(chain)
    chain.single.mockReturnValue(chain)
    chain.order.mockReturnValue(chain)

    return chain
  }

  const defaultMethods = {
    auth: {
      getUser: jest.fn(),
      signInWithOAuth: jest.fn()
    },
    from: jest.fn(() => {
      // 毎回新しいチェーンインスタンスを作成
      return createMockChain()
    }),
    rpc: jest.fn()
  }

  // チェーンをリセットする関数を追加
  const supabaseClient = {
    ...defaultMethods,
    ...overrides,
    resetChain: () => {
      // from()が毎回新しいチェーンを作るので、特に何もする必要がない
    }
  }

  return supabaseClient
}

// Next.jsリクエストのモック
export const createMockNextRequest = (options: {
  method?: string
  url?: string
  body?: any
  headers?: Record<string, string>
} = {}): any => {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body = {},
    headers = {}
  } = options

  return {
    method,
    url,
    headers: new Headers(headers),
    nextUrl: new URL(url),
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body))
  }
}

// OpenAI APIのモック
export const createMockOpenAIResponse = (title: string): any => ({
  ok: true,
  json: jest.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: title
        }
      }
    ]
  })
})

// Slack APIのモック
export const createMockSlackResponse = (data: any): any => ({
  ok: true,
  json: jest.fn().mockResolvedValue({
    ok: true,
    ...data
  })
})

export const createMockSlackErrorResponse = (error: string): any => ({
  ok: true,
  json: jest.fn().mockResolvedValue({
    ok: false,
    error
  })
})

// テストデータ
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: '2023-01-01T00:00:00Z',
  phone_confirmed_at: null,
  last_sign_in_at: '2023-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
  identities: [],
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
}

export const mockSlackConnection = {
  id: 'slack-connection-id',
  user_id: 'test-user-id',
  workspace_id: 'T1234567890',
  workspace_name: 'Test Workspace',
  team_name: 'Test Team',
  access_token: 'xoxp-test-token',
  scope: 'channels:read,chat:write',
  created_at: '2023-01-01T00:00:00Z'
}

export const mockSlackWebhook = {
  id: 'webhook-id',
  user_id: 'test-user-id',
  slack_connection_id: 'slack-connection-id',
  webhook_id: 'test-webhook-id',
  webhook_secret: 'test-webhook-secret',
  is_active: true,
  last_event_at: null,
  event_count: 0,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
}

export const mockSlackMessage = {
  text: 'Test message from Slack',
  user: 'U1234567890',
  ts: '1609459200.000100'
}

export const mockSlackReactionEvent = {
  type: 'reaction_added',
  user: 'U1234567890',
  reaction: 'fire',
  item: {
    type: 'message',
    channel: 'C1234567890',
    ts: '1609459200.000100'
  },
  event_ts: '1609459300.000000'
}

export const mockSlackEventPayload = {
  token: 'verification-token',
  team_id: 'T1234567890',
  api_app_id: 'A1234567890',
  event: mockSlackReactionEvent,
  type: 'event_callback',
  event_id: 'Ev1234567890',
  event_time: 1609459300,
  authorizations: [
    {
      enterprise_id: null,
      team_id: 'T1234567890',
      user_id: 'U1234567890',
      is_bot: false,
      is_enterprise_install: false
    }
  ],
  is_ext_shared_channel: false
}

export const mockTodo = {
  id: 'todo-id',
  user_id: 'test-user-id',
  title: 'Test Todo',
  body: 'Test todo body',
  status: 'open',
  deadline: '2023-12-31',
  importance_score: 0.5,
  created_via: 'manual',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
}

export const mockEmojiSettings = {
  id: 'emoji-settings-id',
  user_id: 'test-user-id',
  today_emoji: 'fire',
  tomorrow_emoji: 'calendar',
  later_emoji: 'memo',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
}

// ヘルパー関数
export const setupSupabaseMocks = (supabaseClient: any): void => {
  // 認証成功のデフォルト設定
  supabaseClient.auth.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null
  })

  return supabaseClient
}

export const setupSlackConnectionMocks = (supabaseClient: any): any => {
  // from()チェーンを一度だけ取得してモック設定
  const mockChain = supabaseClient.from()

  // single()の戻り値を設定
  mockChain.single.mockResolvedValue({
    data: mockSlackConnection,
    error: null
  })

  // チェーンなしの戻り値（select().eq()）を設定
  mockChain.mockResolvedValue.mockResolvedValue({
    data: [mockSlackConnection],
    error: null
  })

  return supabaseClient
}

export const setupWebhookMocks = (supabaseClient: any, options: {
  returnData?: any
  returnError?: any
} = {}): any => {
  const { returnData = mockSlackWebhook, returnError = null } = options

  // GET webhooks用のモック（.order()で終わる）
  const getChain = supabaseClient.from()
  getChain.order.mockResolvedValue({
    data: returnData ? [returnData] : [],
    error: returnError
  })

  // POST/DELETE用のモック（.single()で終わる）
  const postChain = supabaseClient.from()
  postChain.single.mockResolvedValue({
    data: returnData,
    error: returnError
  })

  // UPDATE用のモック（チェーンなしの戻り値）
  const updateChain = supabaseClient.from()
  updateChain.mockResolvedValue({
    data: returnData,
    error: returnError
  })

  return supabaseClient
}

export const setupUserNotificationMocks = (supabaseClient: any, userData: any = { enable_webhook_notifications: true }): any => {
  const mockChain = supabaseClient.from()

  // GET用のモック（single()で返す）
  mockChain.single.mockResolvedValue({
    data: userData,
    error: null
  })

  return supabaseClient
}

// 署名検証用のヘルパー
export const createSlackSignature = (
  body: string,
  timestamp: string,
  secret: string = 'test-signing-secret'
): string => {
  const crypto = require('crypto')
  const sigBasestring = `v0:${timestamp}:${body}`
  return `v0=${crypto
    .createHmac('sha256', secret)
    .update(sigBasestring)
    .digest('hex')}`
}

// 環境変数のセットアップ
export const setupTestEnvironment = () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  process.env.OPENAI_API_KEY = 'test-openai-key'
  process.env.SLACK_CLIENT_ID = 'test-slack-client-id'
  process.env.SLACK_CLIENT_SECRET = 'test-slack-client-secret'
  process.env.SLACK_SIGNING_SECRET = 'test-signing-secret'

  // global fetch のモック設定
  if (!global.fetch) {
    global.fetch = jest.fn()
  }
}

// クリーンアップ
export const cleanupTestEnvironment = () => {
  jest.clearAllMocks()

  // fetch モックのクリア
  if (global.fetch) {
    (global.fetch as jest.Mock).mockClear()
  }
}
