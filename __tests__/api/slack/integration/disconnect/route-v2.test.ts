/**
 * @jest-environment node
 */

import { DELETE } from '@/app/api/slack/integration/disconnect/route'
import {
  mockSupabaseSuccess,
  mockSupabaseError,
  mockAuthError,
  mockAuthSuccess,
} from '@/__tests__/mocks/supabase-helpers'
import { createMockNextRequest, mockUser, setupTestEnvironment, cleanupTestEnvironment } from '@/__tests__/mocks'

// モック設定
jest.mock('@/lib/supabase-server')
jest.mock('@/lib/logger', () => ({
  authLogger: {
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
require('@/lib/supabase-server').createServerSupabaseClient = mockCreateServerSupabaseClient

// シンプルなSupabaseクライアントモック（結果ベース）
const createResultBasedSupabaseClient = (results: any[]) => {
  let callIndex = 0
  
  const createChain = () => {
    const result = results[callIndex++] || mockSupabaseSuccess(null)
    
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(result),
      then: (resolve) => resolve(result),
      catch: (reject) => reject,
    }
  }
  
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue(mockAuthSuccess(mockUser)),
    },
    from: jest.fn(() => createChain()),
    rpc: jest.fn(),
  }
}

describe('/api/slack/integration/disconnect/route.ts - DELETE (結果ベースアプローチ)', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('認証チェック', () => {
    it('認証されていない場合、401エラーを返す', async () => {
      mockSupabaseClient = createResultBasedSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthError())
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('User not authenticated')
    })

    it('ユーザーがnullの場合、401エラーを返す', async () => {
      mockSupabaseClient = createResultBasedSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('User not authenticated')
    })
  })

  describe('Supabaseクエリ結果による分岐', () => {
    it('Slack接続が存在しない場合、適切なメッセージを返す', async () => {
      // 1つ目のクエリ（接続取得）で空の配列を返す
      mockSupabaseClient = createResultBasedSupabaseClient([
        mockSupabaseSuccess([]) // 接続取得で空
      ])
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('No connections to disconnect')
    })

    it('Slack接続取得でエラーが発生した場合、500エラーを返す', async () => {
      // 1つ目のクエリ（接続取得）でエラー
      mockSupabaseClient = createResultBasedSupabaseClient([
        mockSupabaseError(new Error('Connection fetch failed'))
      ])
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch connections')
    })

    it('正常なケース - 1つのSlack接続が存在する場合', async () => {
      const mockConnections = [
        { id: 'connection-1', workspace_name: 'Test Workspace' }
      ]

      // 全ての操作が成功する想定
      mockSupabaseClient = createResultBasedSupabaseClient([
        mockSupabaseSuccess(mockConnections), // 1. 接続取得
        mockSupabaseSuccess(null),            // 2. Webhook削除
        mockSupabaseSuccess(null),            // 3. 接続削除
        mockSupabaseSuccess(null),            // 4. ユーザー更新
        mockSupabaseSuccess([]),              // 5. 接続検証
        mockSupabaseSuccess([]),              // 6. Webhook検証
        mockSupabaseSuccess({ slack_user_id: null }), // 7. ユーザー検証
      ])
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Slack integration completely disconnected')
      expect(data.disconnectedWorkspaces).toEqual(['Test Workspace'])
      expect(data.itemsRemoved.connections).toBe(1)
    })

    it('エラーケース - Webhook削除でエラーが発生', async () => {
      const mockConnections = [{ id: 'connection-1', workspace_name: 'Test Workspace' }]

      mockSupabaseClient = createResultBasedSupabaseClient([
        mockSupabaseSuccess(mockConnections), // 1. 接続取得 → 成功
        mockSupabaseError(new Error('Webhook delete failed')), // 2. Webhook削除 → 失敗
      ])
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete webhooks')
    })

    it('エラーケース - 接続削除でエラーが発生', async () => {
      const mockConnections = [{ id: 'connection-1', workspace_name: 'Test Workspace' }]

      mockSupabaseClient = createResultBasedSupabaseClient([
        mockSupabaseSuccess(mockConnections), // 1. 接続取得 → 成功
        mockSupabaseSuccess(null),            // 2. Webhook削除 → 成功
        mockSupabaseError(new Error('Connection delete failed')), // 3. 接続削除 → 失敗
      ])
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete connections')
    })

    it('エラーケース - ユーザーのSlack IDリセットでエラーが発生', async () => {
      const mockConnections = [{ id: 'connection-1', workspace_name: 'Test Workspace' }]

      mockSupabaseClient = createResultBasedSupabaseClient([
        mockSupabaseSuccess(mockConnections), // 1. 接続取得 → 成功
        mockSupabaseSuccess(null),            // 2. Webhook削除 → 成功
        mockSupabaseSuccess(null),            // 3. 接続削除 → 成功
        mockSupabaseError(new Error('User update failed')), // 4. ユーザー更新 → 失敗
      ])
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to reset user Slack ID')
    })
  })

  describe('エラーハンドリング', () => {
    it('認証プロセスでエラーが発生した場合、500エラーを返す', async () => {
      mockSupabaseClient = createResultBasedSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Auth service error'))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('予期しないエラーが発生した場合、500エラーを返す', async () => {
      // Supabaseクライアント自体を破損させる
      mockCreateServerSupabaseClient.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const request = createMockNextRequest({ method: 'DELETE' })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('APIの検証', () => {
    it('正しいテーブル名でクエリを実行する', async () => {
      mockSupabaseClient = createResultBasedSupabaseClient([mockSupabaseSuccess([])])
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'DELETE' })
      await DELETE(request as any)

      // slack_connectionsテーブルへのクエリを確認
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slack_connections')
    })

    it('複数のテーブルにアクセスすることを確認', async () => {
      const mockConnections = [{ id: 'connection-1', workspace_name: 'Test' }]
      
      // 全ての操作を成功として設定（7つのクエリ）
      mockSupabaseClient = createResultBasedSupabaseClient([
        mockSupabaseSuccess(mockConnections), // 1. 接続取得
        mockSupabaseSuccess(null),            // 2. Webhook削除
        mockSupabaseSuccess(null),            // 3. 接続削除
        mockSupabaseSuccess(null),            // 4. ユーザー更新
        mockSupabaseSuccess([]),              // 5. 接続検証
        mockSupabaseSuccess([]),              // 6. Webhook検証
        mockSupabaseSuccess({ slack_user_id: null }), // 7. ユーザー検証
      ])
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'DELETE' })
      await DELETE(request as any)

      // 複数のテーブルアクセスを確認
      const fromCalls = mockSupabaseClient.from.mock.calls
      expect(fromCalls.length).toBeGreaterThan(3) // 最低4つのテーブルアクセス
      expect(fromCalls.some(call => call[0] === 'slack_connections')).toBe(true)
      expect(fromCalls.some(call => call[0] === 'user_slack_webhooks')).toBe(true)
      expect(fromCalls.some(call => call[0] === 'users')).toBe(true)
    })
  })
})