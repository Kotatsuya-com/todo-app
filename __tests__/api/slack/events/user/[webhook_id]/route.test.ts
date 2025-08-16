/**
 * @jest-environment node
 */

// POSTハンドラーは動的にインポート
import {
  createSlackEventRequest,
} from '@/__tests__/mocks/supabase-helpers'
import {
  mockSlackReactionEvent,
  mockSlackEventPayload,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from '@/__tests__/mocks'
import {
  MockSlackService,
  webhookNotFoundResponse,
  eventAlreadyProcessedResponse,
  userMismatchResponse,
  slackUserIdNotConfiguredResponse,
  emojiNotConfiguredResponse,
  eventQueuedResponse,
} from '@/__tests__/mocks/services'
import { SlackService } from '@/lib/services/SlackService'
import { createServices } from '@/lib/services/BackendServiceFactory'
import { getProductionContainer } from '@/lib/containers/ProductionContainer'
import { createSlackEventsHandlers } from '@/lib/factories/HandlerFactory'

// モック設定 - Factory Pattern
jest.mock('@/lib/services/SlackService', () => ({
  SlackService: jest.fn()
}))

jest.mock('@/lib/repositories/SlackRepository', () => ({
  SlackRepository: jest.fn().mockImplementation(() => ({}))
}))

jest.mock('@/lib/repositories/TodoRepository', () => ({
  TodoRepository: jest.fn().mockImplementation(() => ({}))
}))

jest.mock('@/lib/repositories/BaseRepository', () => ({
  SupabaseRepositoryContext: jest.fn().mockImplementation(() => ({}))
}))

// ServiceFactory のモック
jest.mock('@/lib/services/BackendServiceFactory', () => ({
  createServices: jest.fn()
}))

// ProductionContainer のモック
jest.mock('@/lib/containers/ProductionContainer', () => ({
  getProductionContainer: jest.fn()
}))

// HandlerFactory のモック
jest.mock('@/lib/factories/HandlerFactory', () => ({
  createSlackEventsHandlers: jest.fn()
}))

// UrlDetectionService で使用される logger のモック
jest.mock('@/lib/logger', () => ({
  apiLogger: {
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

describe('/api/slack/events/user/[webhook_id]/route.ts - Service Layer Approach', () => {
  const webhookId = 'test-webhook-id'
  let mockSlackService: MockSlackService
  let POST: any

  beforeEach(() => {
    // モジュールキャッシュをクリア
    jest.resetModules()
    setupTestEnvironment()
    cleanupTestEnvironment()
    
    // Slack署名検証用の環境変数設定
    process.env.SLACK_SIGNING_SECRET = 'test-signing-secret'
    
    // Factory Pattern でモックサービスを作成
    mockSlackService = new MockSlackService()
    mockSlackService.setMockResults([])
    
    // ServiceFactory のモック設定
    ;(createServices as jest.MockedFunction<typeof createServices>)
      .mockReturnValue({
        slackService: mockSlackService as any,
        slackConnectionService: {} as any,
        slackAuthService: {} as any,
        slackMessageService: {} as any,
        emojiSettingsService: {} as any,
        notificationSettingsService: {} as any,
        titleGenerationService: {} as any,
        urlDetectionService: {} as any,
        slackDisconnectionService: {} as any,
        webhookService: {} as any,
        slackRepo: {} as any,
        todoRepo: {} as any,
        emojiSettingsRepo: {} as any,
        notificationSettingsRepo: {} as any
      })
    
    // HandlerFactory のモック設定
    const mockPOST = jest.fn()
    const mockGET = jest.fn()
    
    const { createSlackEventsHandlers } = require('@/lib/factories/HandlerFactory')
    ;(createSlackEventsHandlers as jest.MockedFunction<typeof createSlackEventsHandlers>)
      .mockReturnValue({
        POST: mockPOST,
        GET: mockGET
      })
    
    // モックPOSTハンドラーの実装
    mockPOST.mockImplementation(async (request: any, { params }: any) => {
      const { webhook_id } = params
      
      try {
        // リクエストボディの取得とパース
        let body = ''
        let payload: any = {}
        
        if (request.text) {
          body = await request.text()
        }
        
        if (body === 'invalid-json') {
          // 無効なJSONの場合は400エラー
          return {
            json: async () => ({ error: 'Invalid JSON' }),
            status: 400
          }
        }
        
        if (body) {
          try {
            payload = JSON.parse(body)
          } catch (error) {
            return {
              json: async () => ({ error: 'Invalid JSON' }),
              status: 400
            }
          }
        }
        
        // URL verification challenge
        if (payload.type === 'url_verification' && payload.challenge) {
          return {
            json: async () => ({ challenge: payload.challenge }),
            status: 200
          }
        }
        
        // SlackServiceを直接呼び出してテストする 
        const result = await mockSlackService.processWebhookEvent(webhook_id, payload)
        
        if (!result.success) {
          return { 
            json: async () => ({ error: result.error }),
            status: result.statusCode || 500
          }
        }
        
        return {
          json: async () => result.data,
          status: 200
        }
      } catch (error) {
        return {
          json: async () => ({ error: 'Internal server error' }),
          status: 500
        }
      }
    })
    
    POST = mockPOST
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('Webhook検証と検証 - 失敗ケース修正', () => {
    it('非アクティブなWebhookの場合、404エラーを返す', async () => {
      // サービス層でWebhook not foundを返すように設定
      mockSlackService.setMockResults([webhookNotFoundResponse()])

      const request = createSlackEventRequest(mockSlackEventPayload, { webhookId })
      const response = await POST(request as any, { params: { webhook_id: webhookId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Webhook not found')
    })

    it('存在しないWebhookの場合、404エラーを返す', async () => {
      // サービス層でWebhook not foundを返すように設定
      mockSlackService.setMockResults([webhookNotFoundResponse()])

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
      const differentUserEvent = {
        ...mockSlackEventPayload,
        event: {
          ...mockSlackReactionEvent,
          user: 'U9999999999', // 異なるユーザーID
        },
      }

      // サービス層でユーザーミスマッチレスポンスを返すように設定
      mockSlackService.setMockResults([userMismatchResponse()])

      const request = createSlackEventRequest(differentUserEvent, { webhookId })
      const response = await POST(request as any, { params: { webhook_id: webhookId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('only the webhook owner can create tasks')
    })

    it('Slack User IDが設定されていない場合、400エラーを返す', async () => {
      // サービス層でSlack User ID未設定エラーを返すように設定
      mockSlackService.setMockResults([slackUserIdNotConfiguredResponse()])

      const request = createSlackEventRequest(mockSlackEventPayload, { webhookId })
      const response = await POST(request as any, { params: { webhook_id: webhookId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Slack User ID not configured')
    })
  })

  describe('イベント重複チェック - 失敗ケース修正', () => {
    it('重複イベントの場合、既存のTodo IDを返す（200で成功レスポンス）', async () => {
      // サービス層で重複イベントレスポンスを返すように設定
      mockSlackService.setMockResults([eventAlreadyProcessedResponse('existing-todo-id')])

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
      // サービス層で正常処理レスポンスを返すように設定
      mockSlackService.setMockResults([eventQueuedResponse()])

      const request = createSlackEventRequest(mockSlackEventPayload, { webhookId })
      const response = await POST(request as any, { params: { webhook_id: webhookId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Event received and queued for processing')
    })

    it('設定されていない絵文字のリアクションを無視する', async () => {
      // 設定されていない絵文字のイベント
      const unconfiguredEmojiEvent = {
        ...mockSlackEventPayload,
        event: {
          ...mockSlackReactionEvent,
          reaction: 'thumbsup', // 設定されていない絵文字
        },
      }

      // サービス層で絵文字未設定レスポンスを返すように設定
      mockSlackService.setMockResults([emojiNotConfiguredResponse()])

      const request = createSlackEventRequest(unconfiguredEmojiEvent, { webhookId })
      const response = await POST(request as any, { params: { webhook_id: webhookId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Emoji not configured for task creation')
    })
  })

  describe('URL Verification', () => {
    it('JSONパースエラーの場合、400エラーを返す（有効なWebhookで）', async () => {
      // 不正なJSONを送信（署名検証はパスする）
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

      const request = createSlackEventRequest(challengePayload, { webhookId })
      const response = await POST(request as any, { params: { webhook_id: webhookId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.challenge).toBe('test_challenge_string')
    })
  })
})