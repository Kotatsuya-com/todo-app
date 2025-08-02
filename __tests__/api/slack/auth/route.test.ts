/**
 * @jest-environment node
 */

import { GET } from '@/app/api/slack/auth/route'
import {
  mockSupabaseSuccess,
  mockSupabaseError,
  mockSupabaseNotFound,
  createSlackEventsSupabaseClient,
  mockAuthSuccess,
  mockAuthError,
} from '@/__tests__/mocks/supabase-helpers'
import {
  createMockNextRequest,
  createMockSlackResponse,
  createMockSlackErrorResponse,
  mockUser,
  mockSlackConnection,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from '@/__tests__/mocks'

// モック設定
jest.mock('@/lib/supabase-server')
jest.mock('@/lib/ngrok-url')
jest.mock('@/lib/logger', () => ({
  authLogger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    child: jest.fn().mockReturnValue({
      error: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    }),
  },
}))

const mockCreateServerSupabaseClient = jest.fn()
const mockGetAppBaseUrl = jest.fn()

require('@/lib/supabase-server').createServerSupabaseClient = mockCreateServerSupabaseClient
require('@/lib/ngrok-url').getAppBaseUrl = mockGetAppBaseUrl

// global fetch のモック
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('/api/slack/auth/route.ts - 結果ベースアプローチ', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()
    mockGetAppBaseUrl.mockReturnValue('http://localhost:3000')
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('エラーパラメータの処理', () => {
    it('errorパラメータが存在する場合、エラーリダイレクトを行う', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?error=access_denied',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=access_denied')
    })

    it('codeパラメータが存在しない場合、エラーリダイレクトを行う', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=no_code')
    })
  })

  describe('ユーザー認証', () => {
    it('ユーザーが認証されていない場合、認証プロンプト付きリダイレクトを行う', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthError())
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code&state=test_state',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/?slack_auth_required=true&slack_code=test_code')
    })

    it('ユーザーがnullの場合、認証プロンプト付きリダイレクトを行う', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code&state=test_state',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/?slack_auth_required=true&slack_code=test_code')
    })
  })

  describe('ユーザーレコード確認', () => {
    it('ユーザーレコードが存在しない場合、エラーリダイレクトを行う', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseNotFound(), // ユーザーレコードが見つからない
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code&state=test_state',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=user_not_found')
    })

    it('ユーザーレコード確認でエラーが発生した場合、エラーリダイレクトを行う', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseError(new Error('Database error')), // データベースエラー
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=test_code&state=test_state',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=user_check_failed')
    })
  })

  describe('Slackトークン交換', () => {
    it('Slackトークン交換が失敗した場合、エラーリダイレクトを行う', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(mockUser), // ユーザーレコード確認成功
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      // Slack API失敗レスポンス
      mockFetch.mockResolvedValue(createMockSlackErrorResponse('invalid_code'))

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=invalid_code&state=test_state',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=token_exchange')
    })

    it('正しいパラメータでSlack API を呼び出す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(mockUser), // 1. ユーザーレコード確認成功
        mockSupabaseSuccess(null), // 2. upsert成功
        mockSupabaseSuccess(null), // 3. ユーザー更新成功  
        mockSupabaseSuccess(mockUser), // 4. ユーザー確認成功
        mockSupabaseSuccess(mockSlackConnection), // 5. 接続取得成功
        mockSupabaseSuccess({ webhook_id: 'generated-webhook-id' }), // 6. webhook作成成功
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      // Slack API成功レスポンス
      const slackAuthResponse = {
        access_token: 'xoxp-test-token',
        scope: 'channels:read,chat:write',
        authed_user: {
          id: 'U1234567890',
          access_token: 'xoxp-user-token',
        },
        team: {
          id: 'T1234567890',
          name: 'Test Workspace',
        },
        enterprise: null,
        is_enterprise_install: false,
      }
      mockFetch.mockResolvedValue(createMockSlackResponse(slackAuthResponse))

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=valid_code&state=test_state',
      })

      const response = await GET(request as any)

      // Slack API呼び出しを確認
      expect(mockFetch).toHaveBeenCalledWith(
        'https://slack.com/api/oauth.v2.access',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: expect.any(URLSearchParams),
        })
      )

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_success=true')
    })
  })

  describe('Slack接続の保存', () => {
    it('新しい接続を作成し、Webhookも自動作成する', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(mockUser), // 1. ユーザーレコード確認成功
        mockSupabaseSuccess(null), // 2. upsert成功
        mockSupabaseSuccess(null), // 3. ユーザー更新成功  
        mockSupabaseSuccess(mockUser), // 4. ユーザー確認成功
        mockSupabaseSuccess(mockSlackConnection), // 5. 接続取得成功
        mockSupabaseSuccess({ webhook_id: 'generated-webhook-id' }), // 6. webhook作成成功
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const slackAuthResponse = {
        access_token: 'xoxp-test-token',
        scope: 'channels:read,chat:write',
        authed_user: {
          id: 'U1234567890',
          access_token: 'xoxp-user-token',
        },
        team: {
          id: 'T1234567890',
          name: 'Test Workspace',
        },
      }
      mockFetch.mockResolvedValue(createMockSlackResponse(slackAuthResponse))

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=valid_code&state=test_state',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_success=true')
    })

    it('接続の更新が成功する', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(mockUser), // 1. ユーザーレコード確認成功
        mockSupabaseSuccess(null), // 2. upsert成功（更新）
        mockSupabaseSuccess(null), // 3. ユーザー更新成功  
        mockSupabaseSuccess(mockUser), // 4. ユーザー確認成功
        mockSupabaseSuccess(mockSlackConnection), // 5. 接続取得成功
        mockSupabaseSuccess({ webhook_id: 'generated-webhook-id' }), // 6. webhook作成成功
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const slackAuthResponse = {
        access_token: 'xoxp-new-token',
        scope: 'channels:read,chat:write',
        authed_user: {
          id: 'U1234567890',
          access_token: 'xoxp-user-token',
        },
        team: {
          id: 'T1234567890',
          name: 'Updated Workspace',
        },
      }
      mockFetch.mockResolvedValue(createMockSlackResponse(slackAuthResponse))

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=valid_code&state=test_state',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_success=true')
    })

    it('接続保存でエラーが発生した場合、エラーリダイレクトを行う', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(mockUser), // 1. ユーザーレコード確認成功
        mockSupabaseError(new Error('Database upsert failed')), // 2. upsert失敗
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const slackAuthResponse = {
        access_token: 'xoxp-test-token',
        authed_user: {
          id: 'U1234567890',
          access_token: 'xoxp-user-token',
        },
        team: { id: 'T1234567890', name: 'Test Workspace' },
      }
      mockFetch.mockResolvedValue(createMockSlackResponse(slackAuthResponse))

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=valid_code&state=test_state',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=db_error')
    })
  })

  describe('エラーハンドリング', () => {
    it('予期しないエラーが発生した場合、エラーリダイレクトを行う', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Unexpected error'))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=valid_code&state=test_state',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=server_error')
    })

    it('Slack APIネットワークエラーの場合、エラーリダイレクトを行う', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(mockUser), // ユーザーレコード確認成功
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      // ネットワークエラー
      mockFetch.mockRejectedValue(new Error('Network error'))

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=valid_code&state=test_state',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/settings?slack_error=server_error')
    })
  })

  describe('リダイレクトURL検証', () => {
    it('成功時に正しいクエリパラメータでリダイレクトする', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(mockUser), // 1. ユーザーレコード確認成功
        mockSupabaseSuccess(null), // 2. upsert成功
        mockSupabaseSuccess(null), // 3. ユーザー更新成功  
        mockSupabaseSuccess(mockUser), // 4. ユーザー確認成功
        mockSupabaseSuccess(mockSlackConnection), // 5. 接続取得成功
        mockSupabaseSuccess({ webhook_id: 'generated-webhook-id' }), // 6. webhook作成成功
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const slackAuthResponse = {
        access_token: 'xoxp-test-token',
        authed_user: {
          id: 'U1234567890',
          access_token: 'xoxp-user-token',
        },
        team: { id: 'T1234567890', name: 'Test Workspace' },
      }
      mockFetch.mockResolvedValue(createMockSlackResponse(slackAuthResponse))

      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/slack/auth?code=valid_code&state=test_state',
      })

      const response = await GET(request as any)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toBe('http://localhost:3000/settings?slack_success=true')
    })
  })
})