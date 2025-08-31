/**
 * @jest-environment node
 */

/**
 * HTTP Status Code Compliance Tests
 * 全APIハンドラーの成功レスポンスが明示的にステータスコード200を返すことを確認
 */

// Using a loose type for request mock to allow field overrides in tests
import { TestContainer } from '@/lib/containers/TestContainer'
import {
  createSlackConnectionsHandlers,
  createWebhookHandlers,
  createSlackMessageHandlers,
  createDisconnectHandlers,
  createEmojiSettingsHandlers,
  createNotificationSettingsHandlers,
  createTitleGenerationHandlers,
  createAppUrlDetectionHandlers,
  createSlackEventsHandlers,
  createSlackAuthHandlers
} from '@/lib/factories/HandlerFactory'

describe('API Handler HTTP Status Code Compliance', () => {
  let container: TestContainer
  let mockRequest: any

  beforeEach(() => {
    container = new TestContainer()
    mockRequest = {
      json: jest.fn(),
      url: 'http://localhost:3000/api/test',
      headers: new Headers(),
      nextUrl: {
        searchParams: new URLSearchParams(),
        protocol: 'http:',
        hostname: 'localhost',
        port: '3000'
      }
    } as any
  })

  describe('Success Response Status Codes', () => {
    it('SlackConnections GET should return 200 for successful fetch', async () => {
      const handlers = createSlackConnectionsHandlers(container)

      container.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('user-123')
      })
      container.updateServiceMock('slackService', {
        getConnections: jest.fn().mockResolvedValue({
          success: true,
          data: []
        })
      })

      const response = await handlers.GET(mockRequest)

      expect(response.status).toBe(200)
      expect(response.status).toBeDefined()
      expect(typeof response.status).toBe('number')
    })

    it('Webhook GET should return 200 for successful fetch', async () => {
      const handlers = createWebhookHandlers(container)

      container.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('user-123')
      })
      container.updateServiceMock('webhookService', {
        getUserWebhooks: jest.fn().mockResolvedValue({
          success: true,
          data: { webhooks: [] }
        })
      })

      const response = await handlers.GET(mockRequest)

      expect(response.status).toBe(200)
      expect(response.status).toBeDefined()
    })

    it('Webhook POST should return 200 for successful creation', async () => {
      const handlers = createWebhookHandlers(container)

      mockRequest.json = jest.fn().mockResolvedValue({
        slack_connection_id: 'conn-123'
      })
      container.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('user-123')
      })
      container.updateServiceMock('webhookService', {
        createWebhook: jest.fn().mockResolvedValue({
          success: true,
          data: {
            webhook: { id: 'webhook-123' },
            webhook_url: 'http://example.com/webhook',
            message: 'Created'
          }
        })
      })

      const response = await handlers.POST(mockRequest)

      expect(response.status).toBe(200)
      expect(response.status).toBeDefined()
    })

    it('Webhook DELETE should return 200 for successful deactivation', async () => {
      const handlers = createWebhookHandlers(container)

      // HandlerFactory expects webhook ID in URL searchParams as 'id'
      mockRequest.url = 'http://localhost/api/webhook?id=webhook-123'
      mockRequest.json = jest.fn().mockResolvedValue({})
      container.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('user-123')
      })
      container.updateServiceMock('webhookService', {
        deactivateWebhook: jest.fn().mockResolvedValue({
          success: true
        })
      })

      const response = await handlers.DELETE(mockRequest)

      expect(response.status).toBe(200)
      expect(response.status).toBeDefined()
    })

    it('SlackEvents webhook URL verification should return 200', async () => {
      const handlers = createSlackEventsHandlers(container)
      const context = { params: { webhook_id: 'webhook-123' } }

      // SlackEvents handler uses request.text(), not request.json()
      mockRequest.text = jest.fn().mockResolvedValue(JSON.stringify({
        type: 'url_verification',
        challenge: 'test-challenge'
      }))

      // Add required utils for SlackEvents handler
      container.updateUtilsMock({
        verifySlackSignature: jest.fn().mockResolvedValue(true),
        webhookLogger: {
          child: jest.fn().mockReturnValue({
            info: jest.fn(),
            error: jest.fn()
          }),
          info: jest.fn(),
          error: jest.fn()
        }
      })

      const response = await handlers.POST(mockRequest, context as any)

      expect(response.status).toBe(200)
      expect(response.status).toBeDefined()
    })

    it('SlackMessage POST should return 200 for successful message fetch', async () => {
      const handlers = createSlackMessageHandlers(container)

      mockRequest.json = jest.fn().mockResolvedValue({
        slackUrl: 'https://workspace.slack.com/archives/CHANNEL/p1234567890'
      })
      container.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('user-123')
      })
      container.updateServiceMock('slackMessageService', {
        fetchSlackContent: jest.fn().mockResolvedValue({
          success: true,
          data: { content: 'Test message' }
        })
      })

      const response = await handlers.POST(mockRequest)

      expect(response.status).toBe(200)
      expect(response.status).toBeDefined()
    })

    it('Disconnect DELETE should return 200 for successful disconnection', async () => {
      const handlers = createDisconnectHandlers(container)

      mockRequest.json = jest.fn().mockResolvedValue({
        connectionId: 'conn-123'
      })
      container.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('user-123')
      })
      container.updateServiceMock('slackService', {
        deleteConnection: jest.fn().mockResolvedValue({
          success: true,
          data: { message: 'Disconnected' }
        })
      })

      const response = await handlers.DELETE(mockRequest)

      expect(response.status).toBe(200)
      expect(response.status).toBeDefined()
    })

    it('EmojiSettings GET should return 200 for successful fetch', async () => {
      const handlers = createEmojiSettingsHandlers(container)

      container.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('user-123')
      })
      container.updateServiceMock('emojiSettingsService', {
        getUserEmojiSettings: jest.fn().mockResolvedValue({
          success: true,
          data: {
            today_emoji: 'fire',
            tomorrow_emoji: 'calendar',
            later_emoji: 'memo'
          }
        })
      })

      const response = await handlers.GET(mockRequest)

      expect(response.status).toBe(200)
      expect(response.status).toBeDefined()
    })

    it('NotificationSettings GET should return 200 for successful fetch', async () => {
      const handlers = createNotificationSettingsHandlers(container)

      container.updateAuthMock({
        requireAuthentication: jest.fn().mockResolvedValue('user-123')
      })
      container.updateServiceMock('notificationSettingsService', {
        getUserNotificationSettings: jest.fn().mockResolvedValue({
          success: true,
          data: {
            enable_webhook_notifications: true
          },
          error: null
        })
      })

      const response = await handlers.GET(mockRequest)

      expect(response.status).toBe(200)
      expect(response.status).toBeDefined()
    })

    it('TitleGeneration POST should return 200 for successful generation', async () => {
      const handlers = createTitleGenerationHandlers(container)

      mockRequest.json = jest.fn().mockResolvedValue({
        content: 'Test content for title generation'
      })
      container.updateServiceMock('titleGenerationService', {
        generateTitle: jest.fn().mockResolvedValue({
          data: {
            title: 'Generated Title'
          },
          error: null
        })
      })

      const response = await handlers.POST(mockRequest)

      expect(response.status).toBe(200)
      expect(response.status).toBeDefined()
    })

    it('AppUrlDetection GET should return 200 for successful detection', async () => {
      const handlers = createAppUrlDetectionHandlers(container)

      container.updateServiceMock('urlDetectionService', {
        detectAppUrlSimple: jest.fn().mockResolvedValue({
          success: true,
          data: { url: 'http://localhost:3000' },
          error: null
        })
      })

      const response = await handlers.GET(mockRequest)

      expect(response.status).toBe(200)
      expect(response.status).toBeDefined()
    })
  })

  describe('Response Structure Consistency', () => {
    it('all successful responses should have content-type application/json', async () => {
      const handlers = createTitleGenerationHandlers(container)

      mockRequest.json = jest.fn().mockResolvedValue({
        content: 'Test content'
      })
      container.updateServiceMock('titleGenerationService', {
        generateTitle: jest.fn().mockResolvedValue({
          data: { title: 'Test Title' },
          error: null
        })
      })

      const response = await handlers.POST(mockRequest)

      // NextResponse.json automatically sets content-type
      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('status code should always be a number', async () => {
      const testCases = [
        {
          handler: createTitleGenerationHandlers,
          method: 'POST',
          setup: () => {
            mockRequest.json = jest.fn().mockResolvedValue({ content: 'test' })
            container.updateServiceMock('titleGenerationService', {
              generateTitle: jest.fn().mockResolvedValue({ data: { title: 'Test' }, error: null })
            })
          }
        },
        {
          handler: createSlackConnectionsHandlers,
          method: 'GET',
          setup: () => {
            container.updateAuthMock({ requireAuthentication: jest.fn().mockResolvedValue('user-123') })
            container.updateServiceMock('slackService', {
              getConnections: jest.fn().mockResolvedValue({ success: true, data: [] })
            })
          }
        }
      ]

      for (const testCase of testCases) {
        testCase.setup()
        const handlers = testCase.handler(container) as any
        const response = await handlers[testCase.method](mockRequest)

        expect(typeof response.status).toBe('number')
        expect(response.status).toBeGreaterThanOrEqual(100)
        expect(response.status).toBeLessThan(600)
      }
    })
  })

  describe('ServiceResult Handling', () => {
    it('should handle ServiceResult with data correctly', async () => {
      const handlers = createTitleGenerationHandlers(container)

      mockRequest.json = jest.fn().mockResolvedValue({ content: 'test' })
      const mockResult = {
        data: { title: 'Test Title' },
        error: null
      }
      container.updateServiceMock('titleGenerationService', {
        generateTitle: jest.fn().mockResolvedValue(mockResult)
      })

      const response = await handlers.POST(mockRequest)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body).toHaveProperty('title')
      expect(body.title).toBe('Test Title')
    })

    it('should handle ServiceResult with error correctly', async () => {
      const handlers = createTitleGenerationHandlers(container)

      mockRequest.json = jest.fn().mockResolvedValue({ content: 'test' })
      const mockResult = {
        data: null,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message',
          statusCode: 400
        }
      }
      container.updateServiceMock('titleGenerationService', {
        generateTitle: jest.fn().mockResolvedValue(mockResult)
      })

      const response = await handlers.POST(mockRequest)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body).toHaveProperty('error')
      expect(body.error).toBe('Test error message')
    })

    it('should default to 500 for errors without statusCode', async () => {
      const handlers = createTitleGenerationHandlers(container)

      mockRequest.json = jest.fn().mockResolvedValue({ content: 'test' })
      const mockResult = {
        data: null,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message',
          statusCode: undefined
        }
      }
      container.updateServiceMock('titleGenerationService', {
        generateTitle: jest.fn().mockResolvedValue(mockResult)
      })

      const response = await handlers.POST(mockRequest)

      expect(response.status).toBe(500)
    })
  })
})
