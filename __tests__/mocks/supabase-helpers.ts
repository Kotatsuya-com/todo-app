/**
 * Supabase モック用ヘルパー関数
 * Supabaseクライアントが返しうる結果をシンプルに生成する
 */

// 成功レスポンス
export const mockSupabaseSuccess = <T>(data: T) => ({
  data,
  error: null
})

// エラーレスポンス
export const mockSupabaseError = (error: any) => ({
  data: null,
  error
})

// データが見つからない場合のレスポンス（PGRST116）
export const mockSupabaseNotFound = () => ({
  data: null,
  error: {
    code: 'PGRST116',
    message: 'No rows found',
    details: null,
    hint: null
  }
})

// 認証エラーレスポンス
export const mockAuthError = () => ({
  data: { user: null },
  error: new Error('Not authenticated')
})

// 認証成功レスポンス
export const mockAuthSuccess = (user: any) => ({
  data: { user },
  error: null
})

// シンプルなSupabaseクライアントモック作成
export const createSimpleSupabaseClient = () => {
  // チェーンメソッドのモック
  const mockChain = {
    select: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    single: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    order: jest.fn()
  }

  // メソッドチェーンを実現
  Object.keys(mockChain).forEach(key => {
    mockChain[key].mockReturnValue(mockChain)
  })

  const client = {
    auth: {
      getUser: jest.fn(),
      signInWithOAuth: jest.fn()
    },
    from: jest.fn(() => mockChain),
    rpc: jest.fn()
  }

  return { client, mockChain }
}

// よく使うモックパターン
export const setupAuthenticatedUser = (client: any, user: any) => {
  client.auth.getUser.mockResolvedValue(mockAuthSuccess(user))
}

export const setupUnauthenticatedUser = (client: any) => {
  client.auth.getUser.mockResolvedValue(mockAuthError())
}

// チェーンメソッドの結果を設定するヘルパー
export const setupQueryResult = (mockChain: any, result: any) => {
  // 最終的な結果を返すメソッド（single, order等）に結果を設定
  mockChain.single.mockResolvedValue(result)
  mockChain.order.mockResolvedValue(result)
  return mockChain
}

// Slack Events API専用のSupabaseクライアントモック
export const createSlackEventsSupabaseClient = (queryResults: any[]) => {
  let callIndex = 0

  const createChain = () => {
    const result = queryResults[callIndex++] || mockSupabaseSuccess(null)

    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(result),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: (resolve) => resolve(result),
      catch: (reject) => reject
    }
  }

  return {
    auth: {
      getUser: jest.fn(),
      signInWithOAuth: jest.fn()
    },
    from: jest.fn(() => createChain()),
    rpc: jest.fn()
  }
}

// Slack Events API用のクエリパターンヘルパー
export const mockWebhookQuery = (webhook: any, isActive = true) => {
  return isActive && webhook ? mockSupabaseSuccess(webhook) : mockSupabaseNotFound()
}

export const mockUserWithSettingsQuery = (user: any, emojiSettings: any) => {
  return mockSupabaseSuccess({
    ...user,
    user_emoji_settings: emojiSettings ? [emojiSettings] : []
  })
}

export const mockSlackConnectionQuery = (connection: any) => {
  return connection ? mockSupabaseSuccess(connection) : mockSupabaseNotFound()
}

export const mockEventDuplicationQuery = (existingEvent: any) => {
  return existingEvent ? mockSupabaseSuccess(existingEvent) : mockSupabaseNotFound()
}

export const mockTodoCreationQuery = (todo: any) => {
  return mockSupabaseSuccess(todo)
}

export const mockEventRecordQuery = (eventRecord: any) => {
  return mockSupabaseSuccess(eventRecord)
}

// Slack Events API用のHTTPリクエストモック
export const createSlackEventRequest = (payload: any, options: {
  timestamp?: string,
  signature?: string,
  webhookId?: string
} = {}) => {
  const crypto = require('crypto')
  const timestamp = options.timestamp || Math.floor(Date.now() / 1000).toString()
  const bodyText = JSON.stringify(payload)

  // 署名を生成（テスト用のシークレット）
  const secret = 'test-signing-secret'
  const sigBasestring = `v0:${timestamp}:${bodyText}`
  const signature = options.signature || `v0=${crypto
    .createHmac('sha256', secret)
    .update(sigBasestring)
    .digest('hex')}`

  const mockRequest = {
    method: 'POST',
    url: `http://localhost:3000/api/slack/events/user/${options.webhookId || 'test-webhook-id'}`,
    headers: new Headers({
      'x-slack-signature': signature,
      'x-slack-request-timestamp': timestamp,
      'content-type': 'application/json'
    }),
    nextUrl: new URL(`http://localhost:3000/api/slack/events/user/${options.webhookId || 'test-webhook-id'}`),
    json: jest.fn().mockResolvedValue(payload),
    text: jest.fn().mockResolvedValue(bodyText) // 重要：必ずテキストを返す
  }

  return mockRequest
}
