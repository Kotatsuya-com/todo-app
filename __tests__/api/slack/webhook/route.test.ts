/**
 * @jest-environment node
 */

import { GET, POST, DELETE } from '@/app/api/slack/webhook/route'
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
  mockUser,
  mockSlackConnection,
  mockSlackWebhook,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from '@/__tests__/mocks'

// モック設定
jest.mock('@/lib/supabase-server')
jest.mock('@/lib/ngrok-url')
jest.mock('@/lib/logger', () => ({
  webhookLogger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    child: jest.fn(() => ({
      error: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    })),
  },
}))

const mockCreateServerSupabaseClient = jest.fn()
const mockGetAppBaseUrl = jest.fn()

require('@/lib/supabase-server').createServerSupabaseClient = mockCreateServerSupabaseClient
require('@/lib/ngrok-url').getAppBaseUrl = mockGetAppBaseUrl

describe('/api/slack/webhook/route.ts - 結果ベースアプローチ', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()
    mockGetAppBaseUrl.mockReturnValue('http://localhost:3000')
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('GET - Webhookリスト取得', () => {
    it('認証されていない場合、401エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthError())
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('Webhookリストを正常に取得する', async () => {
      const mockWebhooks = [
        { ...mockSlackWebhook, id: '1' },
        { ...mockSlackWebhook, id: '2' },
      ]

      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(mockWebhooks), // Webhookリスト取得
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.webhooks).toEqual(mockWebhooks)
    })

    it('データベースエラーの場合、500エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseError(new Error('Database error')), // データベースエラー
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch webhooks')
    })
  })

  describe('POST - Webhook作成', () => {
    it('認証されていない場合、401エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthError())
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'POST',
        body: { slack_connection_id: 'connection-id' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('slack_connection_idが提供されていない場合、400エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'POST',
        body: {},
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('slack_connection_id is required')
    })

    it('存在しないSlack接続IDの場合、404エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseNotFound(), // Slack接続が見つからない
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'POST',
        body: { slack_connection_id: 'invalid-id' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Slack connection not found')
    })

    it('Webhookを正常に作成する', async () => {
      const createdWebhook = {
        ...mockSlackWebhook,
        webhook_id: 'generated-webhook-id',
        webhook_secret: 'generated-secret',
      }

      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(mockSlackConnection), // 1. Slack接続確認
        mockSupabaseNotFound(), // 2. 既存webhook確認（なし）
        mockSupabaseSuccess(createdWebhook), // 3. RPC関数でWebhook作成
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      // RPC関数のモック
      mockSupabaseClient.rpc.mockResolvedValue({
        data: createdWebhook,
        error: null,
      })
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'POST',
        body: { slack_connection_id: mockSlackConnection.id },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.webhook).toEqual(createdWebhook)
      expect(data.webhook_url).toContain('/api/slack/events/user/')
    })

    it('既存のWebhookを再有効化する', async () => {
      const existingWebhook = {
        ...mockSlackWebhook,
        is_active: false,
      }

      const reactivatedWebhook = {
        ...existingWebhook,
        is_active: true,
      }

      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(mockSlackConnection), // 1. Slack接続確認
        mockSupabaseSuccess(existingWebhook), // 2. 既存webhook確認（あり）
        mockSupabaseSuccess(reactivatedWebhook), // 3. Webhook再有効化
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'POST',
        body: { slack_connection_id: mockSlackConnection.id },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.webhook).toEqual(reactivatedWebhook)
      expect(data.message).toBe('Webhook reactivated successfully')
    })

    it('Webhook作成に失敗した場合、500エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(mockSlackConnection), // 1. Slack接続確認
        mockSupabaseNotFound(), // 2. 既存webhook確認（なし）
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      // RPC関数のモック（失敗）
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: new Error('RPC failed'),
      })
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'POST',
        body: { slack_connection_id: mockSlackConnection.id },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create webhook')
    })
  })

  describe('DELETE - Webhook削除', () => {
    it('認証されていない場合、401エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthError())
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'DELETE',
        url: `http://localhost:3000/api/slack/webhook?id=webhook-id`,
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('webhook_idが提供されていない場合、400エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/webhook',
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Webhook ID is required')
    })

    it('Webhookを正常に無効化する', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(null), // Webhook無効化成功
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'DELETE',
        url: `http://localhost:3000/api/slack/webhook?id=${mockSlackWebhook.webhook_id}`,
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Webhook deactivated successfully')
    })

    it('Webhook削除に失敗した場合、500エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseError(new Error('Delete failed')), // Webhook削除失敗
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'DELETE',
        url: `http://localhost:3000/api/slack/webhook?id=${mockSlackWebhook.webhook_id}`,
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to deactivate webhook')
    })
  })

  describe('外部依存関係のテスト', () => {
    it('ngrok環境でのWebhook URL生成', async () => {
      mockGetAppBaseUrl.mockReturnValue('https://abc123.ngrok.io')
      
      const createdWebhook = {
        ...mockSlackWebhook,
        webhook_id: 'test-id',
      }

      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(mockSlackConnection), // 1. Slack接続確認
        mockSupabaseNotFound(), // 2. 既存webhook確認（なし）
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockSupabaseClient.rpc.mockResolvedValue({
        data: createdWebhook,
        error: null,
      })
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'POST',
        body: { slack_connection_id: mockSlackConnection.id },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.webhook_url).toBe('https://abc123.ngrok.io/api/slack/events/user/test-id')
    })
  })

  describe('エラーハンドリング', () => {
    it('JSON解析エラーの場合、500エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'POST',
        body: {},
      })

      request.json = jest.fn().mockRejectedValue(new Error('JSON parse error'))

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('認証サービスエラーの場合、500エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Auth service error'))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'GET' })

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})