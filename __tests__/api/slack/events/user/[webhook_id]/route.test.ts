/**
 * @jest-environment node
 */

import { POST } from '@/app/api/slack/events/user/[webhook_id]/route'
import {
  mockSupabaseSuccess,
  mockSupabaseError,
  mockSupabaseNotFound,
  createSlackEventsSupabaseClient,
  mockWebhookQuery,
  mockUserWithSettingsQuery,
  mockSlackConnectionQuery,
  mockEventDuplicationQuery,
  mockTodoCreationQuery,
  mockEventRecordQuery,
  createSlackEventRequest,
} from '@/__tests__/mocks/supabase-helpers'
import {
  mockSlackWebhook,
  mockEmojiSettings,
  mockSlackConnection,
  mockSlackReactionEvent,
  mockSlackEventPayload,
  mockTodo,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from '@/__tests__/mocks'

// モック設定
jest.mock('@/lib/supabase-server')
jest.mock('@/lib/slack-message')
jest.mock('@/lib/openai-title')
jest.mock('@/lib/slack-signature', () => ({
  verifySlackSignature: jest.fn().mockResolvedValue(true), // 署名検証を常にパスするようモック
}))
jest.mock('@/lib/logger', () => ({
  webhookLogger: {
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

const mockCreateServiceSupabaseClient = jest.fn()
const mockGetSlackMessage = jest.fn()
const mockGenerateTaskTitle = jest.fn()

require('@/lib/supabase-server').createServiceSupabaseClient = mockCreateServiceSupabaseClient
require('@/lib/slack-message').getSlackMessage = mockGetSlackMessage
require('@/lib/openai-title').generateTaskTitle = mockGenerateTaskTitle

describe('/api/slack/events/user/[webhook_id]/route.ts - 結果ベースアプローチ', () => {
  const webhookId = 'test-webhook-id'
  let mockSupabaseClient: any

  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()
    
    // Slack署名検証用の環境変数設定
    process.env.SLACK_SIGNING_SECRET = 'test-signing-secret'
    
    // 外部API呼び出しのデフォルトモック
    mockGetSlackMessage.mockResolvedValue({
      message: { text: 'Test Slack message', user: 'U1234567890', ts: '1234567890.123456' }
    })
    mockGenerateTaskTitle.mockResolvedValue('Generated Task Title')
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('Webhook検証と検証 - 失敗ケース修正', () => {
    it('非アクティブなWebhookの場合、404エラーを返す', async () => {
      // 実際の実装：is_active: trueでクエリするため、非アクティブなWebhookは見つからない
      const queryResults = [
        mockSupabaseSuccess([]), // 1. デバッグ用全Webhook取得
        mockSupabaseNotFound(),  // 2. アクティブWebhook検索 → 見つからない
      ]
      
      mockSupabaseClient = createSlackEventsSupabaseClient(queryResults)
      mockCreateServiceSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createSlackEventRequest(mockSlackEventPayload, { webhookId })
      const response = await POST(request as any, { params: { webhook_id: webhookId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Webhook not found')
    })

    it('存在しないWebhookの場合、404エラーを返す', async () => {
      const queryResults = [
        mockSupabaseSuccess([]), // 1. デバッグ用全Webhook取得
        mockSupabaseNotFound(),  // 2. Webhook検索 → 見つからない
      ]
      
      mockSupabaseClient = createSlackEventsSupabaseClient(queryResults)
      mockCreateServiceSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createSlackEventRequest(mockSlackEventPayload, { 
        webhookId: 'nonexistent-webhook-id' 
      })
      const response = await POST(request as any, { params: { webhook_id: 'nonexistent-webhook-id' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Webhook not found')
    })
  })

  describe('ユーザー検証 - 失敗ケース修正', () => {
    it('異なるユーザーからのリアクションを無視する（200で成功レスポンス）', async () => {
      const userWithSettings = {
        slack_user_id: 'U1234567890', // Webhook所有者のSlack User ID
        enable_webhook_notifications: true,
      }

      const differentUserEvent = {
        ...mockSlackEventPayload,
        event: {
          ...mockSlackReactionEvent,
          user: 'U9999999999', // 異なるユーザーID
        },
      }

      const queryResults = [
        mockSupabaseSuccess([]), // 1. デバッグ用全Webhook取得
        mockWebhookQuery(mockSlackWebhook, true), // 2. アクティブWebhook取得
        mockUserWithSettingsQuery(userWithSettings, mockEmojiSettings), // 3. ユーザー+設定取得
        mockSupabaseSuccess({ slack_user_id: 'U1234567890' }), // 4. 追加Slack User ID確認
        mockSlackConnectionQuery(mockSlackConnection), // 5. Slack接続情報取得
        // ユーザー検証で異なるユーザーのため、ここで処理終了
      ]
      
      mockSupabaseClient = createSlackEventsSupabaseClient(queryResults)
      mockCreateServiceSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createSlackEventRequest(differentUserEvent, { webhookId })
      const response = await POST(request as any, { params: { webhook_id: webhookId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('only the webhook owner can create tasks')
    })

    it('Slack User IDが設定されていない場合、400エラーを返す', async () => {
      const userWithoutSlackId = {
        slack_user_id: null, // Slack User IDが未設定
        enable_webhook_notifications: true,
      }

      const queryResults = [
        mockSupabaseSuccess([]), // 1. デバッグ用全Webhook取得
        mockWebhookQuery(mockSlackWebhook, true), // 2. アクティブWebhook取得
        mockUserWithSettingsQuery(userWithoutSlackId, mockEmojiSettings), // 3. ユーザー+設定取得
        mockSupabaseSuccess({ slack_user_id: null }), // 4. 追加Slack User ID確認 → null
        mockSlackConnectionQuery(mockSlackConnection), // 5. Slack接続情報取得
      ]
      
      mockSupabaseClient = createSlackEventsSupabaseClient(queryResults)
      mockCreateServiceSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createSlackEventRequest(mockSlackEventPayload, { webhookId })
      const response = await POST(request as any, { params: { webhook_id: webhookId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Slack User ID not configured')
    })
  })

  describe('イベント重複チェック - 失敗ケース修正', () => {
    it('重複イベントの場合、既存のTodo IDを返す（200で成功レスポンス）', async () => {
      const userWithSettings = {
        slack_user_id: 'U1234567890',
        enable_webhook_notifications: true,
      }

      const existingEvent = {
        id: 'existing-event-id',
        todo_id: 'existing-todo-id',
        processed_at: '2023-01-01T00:00:00Z',
      }

      const queryResults = [
        mockSupabaseSuccess([]), // 1. デバッグ用全Webhook取得
        mockWebhookQuery(mockSlackWebhook, true), // 2. アクティブWebhook取得
        mockUserWithSettingsQuery(userWithSettings, mockEmojiSettings), // 3. ユーザー+設定取得
        mockSupabaseSuccess({ slack_user_id: 'U1234567890' }), // 4. 追加Slack User ID確認
        mockSlackConnectionQuery(mockSlackConnection), // 5. Slack接続情報取得
        mockEventDuplicationQuery(existingEvent), // 6. 重複チェック → 既存イベント発見
        // 重複のため、ここで処理終了
      ]
      
      mockSupabaseClient = createSlackEventsSupabaseClient(queryResults)
      mockCreateServiceSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createSlackEventRequest(mockSlackEventPayload, { webhookId })
      const response = await POST(request as any, { params: { webhook_id: webhookId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Event already processed')
      expect(data.existingTodoId).toBe('existing-todo-id')
    })
  })

  describe('正常な処理フロー', () => {
    it('新しいイベントを正常にキューに追加する', async () => {
      const userWithSettings = {
        slack_user_id: 'U1234567890',
        enable_webhook_notifications: true,
      }

      const queryResults = [
        mockSupabaseSuccess([]), // 1. デバッグ用全Webhook取得
        mockWebhookQuery(mockSlackWebhook, true), // 2. アクティブWebhook取得
        mockUserWithSettingsQuery(userWithSettings, mockEmojiSettings), // 3. ユーザー+設定取得
        mockSupabaseSuccess({ slack_user_id: 'U1234567890' }), // 4. 追加Slack User ID確認
        mockSlackConnectionQuery(mockSlackConnection), // 5. Slack接続情報取得
        mockEventDuplicationQuery(null), // 6. 重複チェック → 新規イベント
        // 実際の処理は非同期で行われるため、ここで終了
      ]
      
      mockSupabaseClient = createSlackEventsSupabaseClient(queryResults)
      mockCreateServiceSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createSlackEventRequest(mockSlackEventPayload, { webhookId })
      const response = await POST(request as any, { params: { webhook_id: webhookId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Event received and queued for processing')
    })

    it('設定されていない絵文字のリアクションを無視する', async () => {
      const userWithSettings = {
        slack_user_id: 'U1234567890',
        enable_webhook_notifications: true,
      }

      // 設定されていない絵文字のイベント
      const unconfiguredEmojiEvent = {
        ...mockSlackEventPayload,
        event: {
          ...mockSlackReactionEvent,
          reaction: 'thumbsup', // 設定されていない絵文字
        },
      }

      const queryResults = [
        mockSupabaseSuccess([]), // 1. デバッグ用全Webhook取得
        mockWebhookQuery(mockSlackWebhook, true), // 2. アクティブWebhook取得
        mockUserWithSettingsQuery(userWithSettings, mockEmojiSettings), // 3. ユーザー+設定取得
        mockSupabaseSuccess({ slack_user_id: 'U1234567890' }), // 4. 追加Slack User ID確認
        mockSlackConnectionQuery(mockSlackConnection), // 5. Slack接続情報取得
        mockEventDuplicationQuery(null), // 6. 重複チェック → 新規イベント
        // 絵文字が設定されていないため、ここで処理終了
      ]
      
      mockSupabaseClient = createSlackEventsSupabaseClient(queryResults)
      mockCreateServiceSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createSlackEventRequest(unconfiguredEmojiEvent, { webhookId })
      const response = await POST(request as any, { params: { webhook_id: webhookId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Emoji not configured for task creation')
    })
  })

  describe('URL Verification', () => {
    it('JSONパースエラーの場合、400エラーを返す（有効なWebhookで）', async () => {
      // 実装では Webhook検証 → JSON解析 の順序のため、有効なWebhookが必要
      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess([]), // 1. デバッグ用全Webhook取得
        mockWebhookQuery(mockSlackWebhook, true), // 2. アクティブWebhook取得
      ])
      mockCreateServiceSupabaseClient.mockReturnValue(mockSupabaseClient)

      // 不正なJSONを送信（有効なWebhookで）
      const invalidRequest = {
        method: 'POST',
        url: `http://localhost:3000/api/slack/events/user/${webhookId}`,
        headers: new Headers({
          'x-slack-signature': 'v0=valid_but_irrelevant_for_json_test',
          'x-slack-request-timestamp': Math.floor(Date.now() / 1000).toString(),
        }),
        text: jest.fn().mockResolvedValue('invalid json {'), // 不正なJSON
      }

      const response = await POST(invalidRequest as any, { params: { webhook_id: webhookId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON')
    })


    it('URL Verificationチャレンジに応答する', async () => {
      const challengePayload = {
        type: 'url_verification',
        challenge: 'test_challenge_string',
        token: 'verification_token',
      }

      mockSupabaseClient = createSlackEventsSupabaseClient([
        mockSupabaseSuccess([]), // 1. デバッグ用全Webhook取得
        mockWebhookQuery(mockSlackWebhook, true), // 2. アクティブWebhook取得
      ])
      mockCreateServiceSupabaseClient.mockReturnValue(mockSupabaseClient)

      const request = createSlackEventRequest(challengePayload, { webhookId })
      const response = await POST(request as any, { params: { webhook_id: webhookId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.challenge).toBe('test_challenge_string')
    })
  })
})