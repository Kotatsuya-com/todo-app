/**
 * @jest-environment node
 */

import { GET, POST } from '@/app/api/user/notifications/route'
import { createMockNextRequest, mockUser } from '@/__tests__/mocks'
import {
  MockNotificationSettingsRepository,
  createMockNotificationSettingsRepository,
  createFailingMockNotificationSettingsRepository,
  createEmptyMockNotificationSettingsRepository
} from '@/__tests__/mocks/notification-settings'
import {
  createMockNotificationSettings,
  createMockCustomNotificationSettings,
  createMockValidNotificationUpdateRequest,
  createMockInvalidNotificationUpdateRequest
} from '@/__tests__/fixtures/notification-settings.fixture'
import { NotificationSettingsService } from '@/lib/services/NotificationSettingsService'
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/lib/entities/NotificationSettings'

// Clean Architecture mocks
jest.mock('@/lib/services/ServiceFactory', () => ({
  createServices: jest.fn()
}))

jest.mock('@/lib/auth/authentication', () => ({
  requireAuthentication: jest.fn()
}))

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}))

const { createServices } = require('@/lib/services/ServiceFactory')
const { requireAuthentication } = require('@/lib/auth/authentication')

describe('/api/user/notifications/route.ts - Clean Architecture Testing', () => {
  let mockNotificationSettingsService: NotificationSettingsService
  let mockRepository: MockNotificationSettingsRepository
  const TEST_USER_ID = 'user-123'

  beforeEach(() => {
    mockRepository = createMockNotificationSettingsRepository()
    mockNotificationSettingsService = new NotificationSettingsService(mockRepository)
    
    createServices.mockReturnValue({
      notificationSettingsService: mockNotificationSettingsService
    })
    
    requireAuthentication.mockResolvedValue(TEST_USER_ID)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET - 通知設定取得', () => {
    describe('認証状態による分岐', () => {
      it('認証されていない場合、401エラーを返す', async () => {
        requireAuthentication.mockRejectedValue(new Error('Authentication failed'))

        const request = createMockNextRequest({ method: 'GET' })
        const response = await GET(request as any)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Authentication failed')
      })
    })

    describe('サービス層結果による分岐', () => {
      it('通知設定が存在する場合、その設定を返す', async () => {
        const mockSettings = createMockNotificationSettings({ user_id: TEST_USER_ID })
        mockRepository.setMockData([mockSettings])

        const request = createMockNextRequest({ method: 'GET' })
        const response = await GET(request as any)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.settings.enable_webhook_notifications).toBe(true)
        expect(data.summary.webhookNotifications).toBe('enabled')
        expect(data.summary.isDefault).toBe(true)
      })

      it('通知設定が存在しない場合、デフォルト値を返す', async () => {
        mockRepository.setShouldReturnEmpty(true)

        const request = createMockNextRequest({ method: 'GET' })
        const response = await GET(request as any)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.settings.enable_webhook_notifications).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
        expect(data.summary.isDefault).toBe(true)
      })

      it('サービス層エラーが発生した場合、500エラーを返す', async () => {
        mockRepository.setShouldFail(true)

        const request = createMockNextRequest({ method: 'GET' })
        const response = await GET(request as any)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to fetch notification settings')
      })
    })

    describe('例外処理', () => {
      it('予期しないエラーが発生した場合、500エラーを返す', async () => {
        createServices.mockImplementation(() => {
          throw new Error('Unexpected error')
        })

        const request = createMockNextRequest({ method: 'GET' })
        const response = await GET(request as any)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Unexpected error')
      })
    })
  })

  describe('POST - 通知設定更新', () => {
    describe('認証状態による分岐', () => {
      it('認証されていない場合、401エラーを返す', async () => {
        requireAuthentication.mockRejectedValue(new Error('Authentication failed'))

        const request = createMockNextRequest({
          method: 'POST',
          body: { enable_webhook_notifications: false },
        })

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Authentication failed')
      })
    })

    describe('バリデーション', () => {
      it('enable_webhook_notificationsが不正な型の場合、400エラーを返す', async () => {
        const request = createMockNextRequest({
          method: 'POST',
          body: { enable_webhook_notifications: 'not-a-boolean' },
        })

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('enable_webhook_notifications must be a boolean')
      })

      it('必須フィールドが欠けている場合、400エラーを返す', async () => {
        const request = createMockNextRequest({
          method: 'POST',
          body: {},
        })

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('enable_webhook_notifications must be a boolean')
      })
    })

    describe('サービス層結果による分岐', () => {
      it('更新が成功した場合、成功メッセージを返す', async () => {
        const request = createMockNextRequest({
          method: 'POST',
          body: { enable_webhook_notifications: false },
        })

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('Notification preferences updated successfully')
        expect(data.settings.enable_webhook_notifications).toBe(false)
      })

      it('更新がサービス層エラーを返した場合、500エラーを返す', async () => {
        mockRepository.setShouldFail(true)

        const request = createMockNextRequest({
          method: 'POST',
          body: { enable_webhook_notifications: false },
        })

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to update notification settings')
      })
    })

    describe('例外処理', () => {
      it('JSON解析エラーが発生した場合、500エラーを返す', async () => {
        const request = createMockNextRequest({
          method: 'POST',
          body: { enable_webhook_notifications: false },
        })

        request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Invalid JSON')
      })
    })
  })

  describe('統合シナリオテスト', () => {
    it('ユーザーが通知設定を有効から無効に変更する', async () => {
      // 最初のGETで現在の設定を確認（デフォルト有効）
      const enabledSettings = createMockNotificationSettings({ user_id: TEST_USER_ID })
      mockRepository.setMockData([enabledSettings])
      
      const getRequest = createMockNextRequest({ method: 'GET' })
      const getResponse = await GET(getRequest as any)
      const getData = await getResponse.json()
      
      expect(getResponse.status).toBe(200)
      expect(getData.settings.enable_webhook_notifications).toBe(true)
      expect(getData.summary.webhookNotifications).toBe('enabled')

      // POSTで設定を無効に変更
      const postRequest = createMockNextRequest({
        method: 'POST',
        body: { enable_webhook_notifications: false },
      })
      const postResponse = await POST(postRequest as any)
      const postData = await postResponse.json()

      expect(postResponse.status).toBe(200)
      expect(postData.message).toBe('Notification preferences updated successfully')
      expect(postData.settings.enable_webhook_notifications).toBe(false)
    })

    it('新しいユーザーのデフォルト設定取得と更新', async () => {
      // 新しいユーザー（設定未存在）
      mockRepository.setShouldReturnEmpty(true)
      
      const getRequest = createMockNextRequest({ method: 'GET' })
      const getResponse = await GET(getRequest as any)
      const getData = await getResponse.json()
      
      expect(getResponse.status).toBe(200)
      expect(getData.settings.enable_webhook_notifications).toBe(DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications)
      expect(getData.summary.isDefault).toBe(true)

      // 設定を更新
      mockRepository.setShouldReturnEmpty(false)
      const postRequest = createMockNextRequest({
        method: 'POST',
        body: { enable_webhook_notifications: false },
      })
      const postResponse = await POST(postRequest as any)
      const postData = await postResponse.json()

      expect(postResponse.status).toBe(200)
      expect(postData.settings.enable_webhook_notifications).toBe(false)
    })
  })

  describe('エラーハンドリング', () => {
    it('サービス層の認証エラーを正しく処理する', async () => {
      requireAuthentication.mockRejectedValue(new Error('Authentication failed'))

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication failed')
    })

    it('サービス層のバリデーションエラーを正しく処理する', async () => {
      const request = createMockNextRequest({
        method: 'POST',
        body: { enable_webhook_notifications: 'invalid' },
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('enable_webhook_notifications must be a boolean')
    })

    it('サービス層の内部エラーを正しく処理する', async () => {
      const failingService = new NotificationSettingsService(
        createFailingMockNotificationSettingsRepository()
      )
      
      createServices.mockReturnValue({
        notificationSettingsService: failingService
      })

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch notification settings')
    })
  })
})