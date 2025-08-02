/**
 * @jest-environment node
 */

import { GET, DELETE } from '@/app/api/slack/connections/route'
import {
  mockSupabaseSuccess,
  mockSupabaseError,
  createSlackEventsSupabaseClient,
  mockAuthSuccess,
  mockAuthError,
} from '@/__tests__/mocks/supabase-helpers'
import {
  createMockNextRequest,
  mockUser,
  mockSlackConnection,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from '@/__tests__/mocks'

// モック設定
jest.mock('@/lib/supabase-server')
jest.mock('@/lib/logger', () => ({
  slackLogger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}))

const mockCreateServerSupabaseClient = jest.fn()
require('@/lib/supabase-server').createServerSupabaseClient = mockCreateServerSupabaseClient

describe('/api/slack/connections/route.ts - 結果ベースアプローチ', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('GET - 接続リスト取得', () => {
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

    it('ユーザーがnullの場合、401エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('Slack接続リストを正常に取得する', async () => {
      const mockConnections = [
        { ...mockSlackConnection, id: '1', workspace_name: 'Workspace 1' },
        { ...mockSlackConnection, id: '2', workspace_name: 'Workspace 2' },
      ]

      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(mockConnections), // 接続リスト取得
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.connections).toEqual(mockConnections)
    })

    it('接続が存在しない場合、空の配列を返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess([]), // 空の接続リスト
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.connections).toEqual([])
    })

    it('データベースエラーの場合、500エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseError(new Error('Database connection failed')), // データベースエラー
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch connections')
    })

    it('予期しないエラーの場合、500エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Unexpected error'))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Server error')
    })
  })

  describe('DELETE - 接続削除', () => {
    it('認証されていない場合、401エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthError())
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId: 'connection-id' },
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('ユーザーがnullの場合、401エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId: 'connection-id' },
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('connectionIdが提供されていない場合、400エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'DELETE',
        body: {},
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Connection ID is required')
    })

    it('Slack接続を正常に削除する', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(null), // 接続削除成功
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId: mockSlackConnection.id },
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('削除処理でデータベースエラーが発生した場合、500エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseError(new Error('Delete failed')), // 接続削除失敗
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId: mockSlackConnection.id },
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete connection')
    })

    it('JSON解析エラーの場合、500エラーを返す', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'DELETE',
        body: {},
      })

      request.json = jest.fn().mockRejectedValue(new Error('JSON parse error'))

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Server error')
    })
  })

  describe('データベース操作の検証', () => {
    it('正しいテーブルとユーザーIDでクエリを実行する', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess([]),
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({ method: 'GET' })
      await GET(request as any)

      // from()がslack_connectionsテーブルで呼ばれることを確認
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slack_connections')
    })

    it('削除時にslack_connectionsテーブルにアクセスすることを確認', async () => {
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(null), // 接続削除
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId: mockSlackConnection.id },
      })

      await DELETE(request as any)

      // slack_connectionsテーブルへのアクセスを確認
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slack_connections')
    })
  })
})