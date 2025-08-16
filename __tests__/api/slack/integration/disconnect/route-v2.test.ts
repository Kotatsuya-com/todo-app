/**
 * @jest-environment node
 */

import { createDisconnectHandlers } from '@/lib/factories/HandlerFactory'
import { TestContainer } from '@/lib/containers/TestContainer'
import { createMockNextRequest, mockUser, setupTestEnvironment, cleanupTestEnvironment } from '@/__tests__/mocks'

describe('/api/slack/integration/disconnect/route.ts - 依存性注入アプローチ', () => {
  let testContainer: TestContainer
  let disconnectHandlers: any

  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()

    // TestContainerを作成（モック付き）
    testContainer = new TestContainer()

    // ハンドラーの作成
    disconnectHandlers = createDisconnectHandlers(testContainer)
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('認証チェック', () => {
    it('認証されていない場合、401エラーを返す', async () => {
      // 認証失敗をモック
      testContainer.updateServiceMock('slackDisconnectionService', {
        authenticateUser: jest.fn().mockResolvedValue({
          success: false,
          error: 'User not authenticated',
          statusCode: 401
        })
      })

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await disconnectHandlers.DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('User not authenticated')
    })

    it('ユーザーがnullの場合、401エラーを返す', async () => {
      // 認証失敗をモック（ユーザーがnull）
      testContainer.updateServiceMock('slackDisconnectionService', {
        authenticateUser: jest.fn().mockResolvedValue({
          success: false,
          error: 'User not authenticated',
          statusCode: 401
        })
      })

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await disconnectHandlers.DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('User not authenticated')
    })
  })

  describe('Supabaseクエリ結果による分岐', () => {
    it('Slack接続が存在しない場合、適切なメッセージを返す', async () => {
      // 認証成功をモック
      testContainer.updateServiceMock('slackDisconnectionService', {
        authenticateUser: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 'test-user-id', email: 'test@example.com' }
        }),
        disconnectSlackIntegration: jest.fn().mockResolvedValue({
          success: true,
          data: { message: 'No connections to disconnect' }
        })
      })

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await disconnectHandlers.DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('No connections to disconnect')
    })

    it('Slack接続取得でエラーが発生した場合、500エラーを返す', async () => {
      // 認証成功、切断処理失敗をモック
      testContainer.updateServiceMock('slackDisconnectionService', {
        authenticateUser: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 'test-user-id', email: 'test@example.com' }
        }),
        disconnectSlackIntegration: jest.fn().mockResolvedValue({
          success: false,
          error: 'Failed to fetch connections',
          statusCode: 500
        })
      })

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await disconnectHandlers.DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch connections')
    })

    it('正常なケース - 1つのSlack接続が存在する場合', async () => {
      // 認証成功、切断処理成功をモック
      testContainer.updateServiceMock('slackDisconnectionService', {
        authenticateUser: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 'test-user-id', email: 'test@example.com' }
        }),
        disconnectSlackIntegration: jest.fn().mockResolvedValue({
          success: true,
          data: {
            message: 'Slack integration completely disconnected',
            disconnectedWorkspaces: ['Test Workspace'],
            itemsRemoved: { connections: 1, webhooks: 1, emojiSettings: 1 }
          }
        })
      })

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await disconnectHandlers.DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Slack integration completely disconnected')
      expect(data.disconnectedWorkspaces).toEqual(['Test Workspace'])
      expect(data.itemsRemoved.connections).toBe(1)
    })

    it('エラーケース - Webhook削除でエラーが発生', async () => {
      // 認証成功、切断処理失敗をモック
      testContainer.updateServiceMock('slackDisconnectionService', {
        authenticateUser: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 'test-user-id', email: 'test@example.com' }
        }),
        disconnectSlackIntegration: jest.fn().mockResolvedValue({
          success: false,
          error: 'Failed to delete webhooks',
          statusCode: 500
        })
      })

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await disconnectHandlers.DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete webhooks')
    })

    it('エラーケース - 接続削除でエラーが発生', async () => {
      // 認証成功、切断処理失敗をモック
      testContainer.updateServiceMock('slackDisconnectionService', {
        authenticateUser: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 'test-user-id', email: 'test@example.com' }
        }),
        disconnectSlackIntegration: jest.fn().mockResolvedValue({
          success: false,
          error: 'Failed to delete connections',
          statusCode: 500
        })
      })

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await disconnectHandlers.DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete connections')
    })

    it('エラーケース - ユーザーのSlack IDリセットでエラーが発生', async () => {
      // 認証成功、切断処理失敗をモック
      testContainer.updateServiceMock('slackDisconnectionService', {
        authenticateUser: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 'test-user-id', email: 'test@example.com' }
        }),
        disconnectSlackIntegration: jest.fn().mockResolvedValue({
          success: false,
          error: 'Failed to reset user Slack ID',
          statusCode: 500
        })
      })

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await disconnectHandlers.DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to reset user Slack ID')
    })
  })

  describe('エラーハンドリング', () => {
    it('予期しないエラーが発生した場合、500エラーを返す', async () => {
      // サービスが例外を投げるようにモック
      testContainer.updateServiceMock('slackDisconnectionService', {
        authenticateUser: jest.fn().mockImplementation(() => {
          throw new Error('Unexpected error')
        })
      })

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await disconnectHandlers.DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})
