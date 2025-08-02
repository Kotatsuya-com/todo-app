/**
 * @jest-environment node
 */

import { POST } from '@/app/api/slack/route'
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
jest.mock('@/lib/slack-message')
jest.mock('@/lib/logger', () => ({
  slackLogger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}))

const mockCreateServerSupabaseClient = jest.fn()
const mockGetSlackMessageFromUrl = jest.fn()
const mockParseSlackUrl = jest.fn()

require('@/lib/supabase-server').createServerSupabaseClient = mockCreateServerSupabaseClient
require('@/lib/slack-message').getSlackMessageFromUrl = mockGetSlackMessageFromUrl
require('@/lib/slack-message').parseSlackUrl = mockParseSlackUrl

describe('/api/slack/route.ts - 結果ベースアプローチ', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('バリデーション', () => {
    it('SlackURLが提供されていない場合、400エラーを返す', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: {},
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('SlackURLが必要です')
    })

    it('SlackURLが無効な形式の場合、400エラーを返す', async () => {
      mockParseSlackUrl.mockReturnValue(null)

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl: 'invalid-url' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('有効なSlackURLではありません')
    })
  })

  describe('認証', () => {
    it('ユーザーが認証されていない場合、401エラーを返す', async () => {
      mockParseSlackUrl.mockReturnValue({
        workspace: 'test-workspace',
        channel: 'C123',
        timestamp: '1609459200.000100'
      })
      
      mockSupabaseClient = createSlackEventsSupabaseClient([])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthError())
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl: 'https://test-workspace.slack.com/archives/C123/p1609459200000100' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Slack接続の確認', () => {
    it('Slack接続が存在しない場合、400エラーを返す', async () => {
      mockParseSlackUrl.mockReturnValue({
        workspace: 'test-workspace',
        channel: 'C123',
        timestamp: '1609459200.000100'
      })

      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess([]), // 空の接続リスト
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl: 'https://test-workspace.slack.com/archives/C123/p1609459200000100' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Slackワークスペースに接続されていません。設定画面で接続してください。')
    })

    it('接続取得でデータベースエラーが発生した場合、400エラーを返す', async () => {
      mockParseSlackUrl.mockReturnValue({
        workspace: 'test-workspace',
        channel: 'C123',
        timestamp: '1609459200.000100'
      })

      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseError(new Error('Database error')), // 接続取得失敗
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl: 'https://test-workspace.slack.com/archives/C123/p1609459200000100' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Slackワークスペースに接続されていません。設定画面で接続してください。')
    })
  })

  describe('メッセージ取得', () => {
    const mockConnections = [
      {
        ...mockSlackConnection,
        workspace_name: 'Test Workspace',
        access_token: 'xoxp-test-token',
      },
      {
        ...mockSlackConnection,
        id: 'conn2',
        workspace_name: 'Other Workspace',
        access_token: 'xoxp-other-token',
      },
    ]

    it('URLのワークスペース名に一致する接続を使用してメッセージを取得する', async () => {
      mockParseSlackUrl.mockReturnValue({
        workspace: 'other workspace', // should match "Other Workspace" when lowercased
        channel: 'C123',
        timestamp: '1609459200.000100'
      })

      const mockMessage = {
        text: 'Hello from Slack!',
        user: 'U123456789',
        timestamp: '1609459200.000100',
        channel: 'C123',
      }

      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(mockConnections), // 接続リスト取得成功
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      mockGetSlackMessageFromUrl.mockResolvedValue(mockMessage)

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl: 'https://other-workspace.slack.com/archives/C123/p1609459200000100' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        text: mockMessage.text,
        user: mockMessage.user,
        timestamp: mockMessage.timestamp,
        channel: mockMessage.channel,
        url: 'https://other-workspace.slack.com/archives/C123/p1609459200000100',
        workspace: 'Other Workspace',
      })
      expect(mockGetSlackMessageFromUrl).toHaveBeenCalledWith(
        'https://other-workspace.slack.com/archives/C123/p1609459200000100',
        'xoxp-other-token'
      )
    })

    it('ワークスペース名が一致しない場合、最初の接続を使用する', async () => {
      mockParseSlackUrl.mockReturnValue({
        workspace: 'unknown-workspace',
        channel: 'C123',
        timestamp: '1609459200.000100'
      })

      const mockMessage = {
        text: 'Hello from default workspace!',
        user: 'U123456789',
        timestamp: '1609459200.000100',
        channel: 'C123',
      }

      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(mockConnections), // 接続リスト取得成功
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      mockGetSlackMessageFromUrl.mockResolvedValue(mockMessage)

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl: 'https://unknown-workspace.slack.com/archives/C123/p1609459200000100' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        text: mockMessage.text,
        user: mockMessage.user,
        timestamp: mockMessage.timestamp,
        channel: mockMessage.channel,
        url: 'https://unknown-workspace.slack.com/archives/C123/p1609459200000100',
        workspace: 'Test Workspace',
      })
      expect(mockGetSlackMessageFromUrl).toHaveBeenCalledWith(
        'https://unknown-workspace.slack.com/archives/C123/p1609459200000100',
        'xoxp-test-token' // 最初の接続のトークン
      )
    })

    it('Slackメッセージが見つからない場合、404エラーを返す', async () => {
      mockParseSlackUrl.mockReturnValue({
        workspace: 'test-workspace',
        channel: 'C123',
        timestamp: '1609459200.000100'
      })

      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(mockConnections), // 接続リスト取得成功
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      mockGetSlackMessageFromUrl.mockResolvedValue(null)

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl: 'https://test-workspace.slack.com/archives/C123/p1609459200000100' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('メッセージが見つかりませんでした')
    })

    it('Slack API呼び出しでエラーが発生した場合、500エラーを返す', async () => {
      mockParseSlackUrl.mockReturnValue({
        workspace: 'test-workspace',
        channel: 'C123',
        timestamp: '1609459200.000100'
      })

      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess(mockConnections), // 接続リスト取得成功
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      mockGetSlackMessageFromUrl.mockRejectedValue(new Error('Slack API error'))

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl: 'https://test-workspace.slack.com/archives/C123/p1609459200000100' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Slackメッセージの取得に失敗しました')
    })
  })

  describe('エラーハンドリング', () => {
    it('JSON解析エラーの場合、500エラーを返す', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: {},
      })

      request.json = jest.fn().mockRejectedValue(new Error('JSON parse error'))

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Slackメッセージの取得に失敗しました')
    })

    it('予期しないエラーの場合、500エラーを返す', async () => {
      mockParseSlackUrl.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl: 'https://test-workspace.slack.com/archives/C123/p1609459200000100' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Slackメッセージの取得に失敗しました')
    })
  })

  describe('URL解析とAPI呼び出しの検証', () => {
    it('パース結果が正しく使用される', async () => {
      const slackUrl = 'https://test-workspace.slack.com/archives/C1234567890/p1609459200000100?thread_ts=1609459100.000200'
      
      mockParseSlackUrl.mockReturnValue({
        workspace: 'test-workspace',
        channel: 'C1234567890',
        timestamp: '1609459200.000100',
        threadTs: '1609459100.000200'
      })

      const mockMessage = {
        text: 'Test message',
        user: 'U123456789',
        timestamp: '1609459200.000100',
      }

      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess([mockSlackConnection]), // 接続リスト取得成功
      ])
      mockSupabaseClient.auth.getUser.mockResolvedValue(mockAuthSuccess(mockUser))
      mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)

      mockGetSlackMessageFromUrl.mockResolvedValue(mockMessage)

      const request = createMockNextRequest({
        method: 'POST',
        body: { slackUrl },
      })

      await POST(request as any)

      expect(mockParseSlackUrl).toHaveBeenCalledWith(slackUrl)
      expect(mockGetSlackMessageFromUrl).toHaveBeenCalledWith(
        slackUrl,
        mockSlackConnection.access_token
      )
    })
  })
})