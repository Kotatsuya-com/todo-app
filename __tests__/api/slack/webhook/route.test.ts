/**
 * @jest-environment node
 */

import { createWebhookHandlers } from '@/lib/factories/HandlerFactory'
import { TestContainer } from '@/lib/containers/TestContainer'
import {
  createMockNextRequest,
  mockUser,
  mockSlackConnection,
  mockSlackWebhook,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from '@/__tests__/mocks'

describe('/api/slack/webhook/route.ts - 依存性注入アプローチ', () => {
  let testContainer: TestContainer
  let webhookHandlers: any

  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()
    
    // TestContainerを作成（モック付き）
    testContainer = new TestContainer()
    
    // App Base URLの設定
    testContainer.updateUtilsMock({
      getAppBaseUrl: jest.fn().mockReturnValue('http://localhost:3000')
    })
    
    // ハンドラーの作成
    webhookHandlers = createWebhookHandlers(testContainer)
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('GET - Webhookリスト取得', () => {
    it('認証されていない場合、401エラーを返す', async () => {
      // 認証失敗をモック
      testContainer.updateAuthMock({
        requireAuthentication: jest.fn().mockRejectedValue(new Error('Authentication failed'))
      })

      const request = createMockNextRequest({ method: 'GET' })
      const response = await webhookHandlers.GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication failed')
    })

    it('Webhookリストを正常に取得する', async () => {
      const mockWebhooks = [
        { ...mockSlackWebhook, id: '1' },
        { ...mockSlackWebhook, id: '2' },
      ]

      // 認証成功をモック
      testContainer.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('test-user-id')
      })
      
      // サービスがWebhookリストを返すようにモック
      testContainer.updateServiceMock('webhookService', {
        getUserWebhooks: jest.fn().mockResolvedValue({
          success: true,
          data: { webhooks: mockWebhooks }
        })
      })

      const request = createMockNextRequest({ method: 'GET' })
      const response = await webhookHandlers.GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ webhooks: mockWebhooks })
    })

    it('データベースエラーの場合、500エラーを返す', async () => {
      // 認証成功をモック
      testContainer.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('test-user-id')
      })
      
      // サービスがエラーを返すようにモック
      testContainer.updateServiceMock('webhookService', {
        getUserWebhooks: jest.fn().mockResolvedValue({
          success: false,
          error: 'Failed to fetch webhooks',
          statusCode: 500
        })
      })

      const request = createMockNextRequest({ method: 'GET' })
      const response = await webhookHandlers.GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch webhooks')
    })
  })

  describe('POST - Webhook作成', () => {
    it('認証されていない場合、401エラーを返す', async () => {
      // 認証失敗をモック
      testContainer.updateAuthMock({
        requireAuthentication: jest.fn().mockRejectedValue(new Error('Authentication failed'))
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { slack_connection_id: 'connection-id' },
      })

      const response = await webhookHandlers.POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication failed')
    })

    it('slack_connection_idが提供されていない場合、400エラーを返す', async () => {
      // 認証成功をモック
      testContainer.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('test-user-id')
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: {},
      })

      const response = await webhookHandlers.POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('slack_connection_id is required')
    })

    it('存在しないSlack接続IDの場合、404エラーを返す', async () => {
      // 認証成功をモック
      testContainer.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('test-user-id')
      })

      // サービスが404エラーを返すようにモック
      testContainer.updateServiceMock('webhookService', {
        createUserWebhook: jest.fn().mockResolvedValue({
          success: false,
          error: 'Slack connection not found',
          statusCode: 404
        })
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { slack_connection_id: 'invalid-id' },
      })

      const response = await webhookHandlers.POST(request as any)
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

      // 認証成功をモック
      testContainer.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('test-user-id')
      })

      // サービスがWebhook作成成功を返すようにモック
      testContainer.updateServiceMock('webhookService', {
        createUserWebhook: jest.fn().mockResolvedValue({
          success: true,
          data: {
            webhook: createdWebhook,
            message: 'Webhook created successfully'
          },
          statusCode: 201
        })
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { slack_connection_id: mockSlackConnection.id },
      })

      const response = await webhookHandlers.POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.webhook).toEqual(createdWebhook)
      expect(data.message).toBe('Webhook created successfully')
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

      // 認証成功をモック
      testContainer.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('test-user-id')
      })

      // サービスがWebhook再有効化を返すようにモック
      testContainer.updateServiceMock('webhookService', {
        createUserWebhook: jest.fn().mockResolvedValue({
          success: true,
          data: {
            webhook: reactivatedWebhook,
            message: 'Webhook reactivated successfully'
          },
          statusCode: 200
        })
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { slack_connection_id: mockSlackConnection.id },
      })

      const response = await webhookHandlers.POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.webhook).toEqual(reactivatedWebhook)
      expect(data.message).toBe('Webhook reactivated successfully')
    })

    it('Webhook作成に失敗した場合、500エラーを返す', async () => {
      // 認証成功をモック
      testContainer.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('test-user-id')
      })

      // サービスが500エラーを返すようにモック
      testContainer.updateServiceMock('webhookService', {
        createUserWebhook: jest.fn().mockResolvedValue({
          success: false,
          error: 'Failed to create webhook',
          statusCode: 500
        })
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { slack_connection_id: mockSlackConnection.id },
      })

      const response = await webhookHandlers.POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create webhook')
    })
  })

  describe('DELETE - Webhook削除', () => {
    it('認証されていない場合、401エラーを返す', async () => {
      // 認証失敗をモック
      testContainer.updateAuthMock({
        requireAuthentication: jest.fn().mockRejectedValue(new Error('Authentication failed'))
      })

      const request = createMockNextRequest({
        method: 'DELETE',
        url: `http://localhost:3000/api/slack/webhook?id=webhook-id`,
      })

      const response = await webhookHandlers.DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication failed')
    })

    it('webhook_idが提供されていない場合、400エラーを返す', async () => {
      // 認証成功をモック
      testContainer.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('test-user-id')
      })

      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/webhook',
      })

      const response = await webhookHandlers.DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Webhook ID is required')
    })

    it('Webhookを正常に無効化する', async () => {
      // 認証成功をモック
      testContainer.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('test-user-id')
      })

      // サービスがWebhook無効化成功を返すようにモック
      testContainer.updateServiceMock('webhookService', {
        deactivateWebhook: jest.fn().mockResolvedValue({
          success: true,
          data: {}
        })
      })

      const request = createMockNextRequest({
        method: 'DELETE',
        url: `http://localhost:3000/api/slack/webhook?id=${mockSlackWebhook.webhook_id}`,
      })

      const response = await webhookHandlers.DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Webhook deactivated successfully')
    })

    it('Webhook削除に失敗した場合、500エラーを返す', async () => {
      // 認証成功をモック
      testContainer.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('test-user-id')
      })

      // サービスが500エラーを返すようにモック
      testContainer.updateServiceMock('webhookService', {
        deactivateWebhook: jest.fn().mockResolvedValue({
          success: false,
          error: 'Failed to deactivate webhook',
          statusCode: 500
        })
      })

      const request = createMockNextRequest({
        method: 'DELETE',
        url: `http://localhost:3000/api/slack/webhook?id=${mockSlackWebhook.webhook_id}`,
      })

      const response = await webhookHandlers.DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to deactivate webhook')
    })
  })

  describe('外部依存関係のテスト', () => {
    it('ngrok環境でのWebhook URL生成', async () => {
      // ngrok URLをモック
      testContainer.updateUtilsMock({
        getAppBaseUrl: jest.fn().mockReturnValue('https://abc123.ngrok.io')
      })
      
      const createdWebhook = {
        ...mockSlackWebhook,
        webhook_id: 'test-id',
      }

      // 認証成功をモック
      testContainer.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('test-user-id')
      })

      // サービスがWebhook作成成功を返すようにモック（ngrok URL使用）
      testContainer.updateServiceMock('webhookService', {
        createUserWebhook: jest.fn().mockResolvedValue({
          success: true,
          data: {
            webhook: createdWebhook,
            webhook_url: 'https://abc123.ngrok.io/api/slack/events/user/test-id',
            message: 'Webhook created successfully'
          },
          statusCode: 201
        })
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { slack_connection_id: mockSlackConnection.id },
      })

      const response = await webhookHandlers.POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.webhook_url).toBe('https://abc123.ngrok.io/api/slack/events/user/test-id')
    })
  })

  describe('エラーハンドリング', () => {
    it('JSON解析エラーの場合、500エラーを返す', async () => {
      // 認証成功をモック
      testContainer.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('test-user-id')
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: {},
      })

      // JSON解析エラーをモック
      request.json = jest.fn().mockRejectedValue(new Error('JSON parse error'))

      const response = await webhookHandlers.POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('認証サービスエラーの場合、401エラーを返す', async () => {
      // 認証サービスエラーをモック
      testContainer.updateAuthMock({
        requireAuthentication: jest.fn().mockRejectedValue(new Error('Auth service error'))
      })

      const request = createMockNextRequest({ method: 'GET' })

      const response = await webhookHandlers.GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Auth service error')
    })
  })
})
