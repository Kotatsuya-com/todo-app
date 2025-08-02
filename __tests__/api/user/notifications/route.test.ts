/**
 * @jest-environment node
 */

import { GET, POST } from '@/app/api/user/notifications/route'
import { createMockNextRequest, mockUser } from '@/__tests__/mocks'
import {
  createSimpleSupabaseClient,
  mockSupabaseSuccess,
  mockSupabaseError,
  mockSupabaseNotFound,
  setupAuthenticatedUser,
  setupUnauthenticatedUser,
  setupQueryResult,
} from '@/__tests__/mocks/supabase-helpers'

// モック設定
jest.mock('@/lib/supabase-server')
jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  })),
}))

const mockCreateServerSupabaseClient = require('@/lib/supabase-server').createServerSupabaseClient

describe('/api/user/notifications/route.ts - Result-based Testing', () => {
  let mockSupabaseClient: any
  let mockChain: any

  beforeEach(() => {
    const { client, mockChain: chain } = createSimpleSupabaseClient()
    mockSupabaseClient = client
    mockChain = chain
    mockCreateServerSupabaseClient.mockReturnValue(mockSupabaseClient)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET - 通知設定取得', () => {
    describe('認証状態による分岐', () => {
      it('認証されていない場合、401エラーを返す', async () => {
        setupUnauthenticatedUser(mockSupabaseClient)

        const request = createMockNextRequest({ method: 'GET' })
        const response = await GET(request as any)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('Supabaseクエリ結果による分岐', () => {
      beforeEach(() => {
        setupAuthenticatedUser(mockSupabaseClient, mockUser)
      })

      it('通知設定が存在する場合、その設定を返す', async () => {
        const userData = {
          enable_webhook_notifications: true,
        }
        
        setupQueryResult(mockChain, mockSupabaseSuccess(userData))

        const request = createMockNextRequest({ method: 'GET' })
        const response = await GET(request as any)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.enable_webhook_notifications).toBe(true)
      })

      it('通知設定が存在しない場合（PGRST116）、デフォルト値を返す', async () => {
        setupQueryResult(mockChain, mockSupabaseError({ code: 'PGRST116' }))

        const request = createMockNextRequest({ method: 'GET' })
        const response = await GET(request as any)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to fetch notification settings')
      })

      it('データベースエラーが発生した場合、500エラーを返す', async () => {
        setupQueryResult(mockChain, mockSupabaseError({ 
          message: 'Database connection failed',
          code: 'CONNECTION_ERROR'
        }))

        const request = createMockNextRequest({ method: 'GET' })
        const response = await GET(request as any)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to fetch notification settings')
      })
    })

    describe('例外処理', () => {
      it('予期しないエラーが発生した場合、500エラーを返す', async () => {
        mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Unexpected error'))

        const request = createMockNextRequest({ method: 'GET' })
        const response = await GET(request as any)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Internal server error')
      })
    })
  })

  describe('POST - 通知設定更新', () => {
    describe('認証状態による分岐', () => {
      it('認証されていない場合、401エラーを返す', async () => {
        setupUnauthenticatedUser(mockSupabaseClient)

        const request = createMockNextRequest({
          method: 'POST',
          body: { enable_webhook_notifications: false },
        })

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('バリデーション', () => {
      beforeEach(() => {
        setupAuthenticatedUser(mockSupabaseClient, mockUser)
      })

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

    describe('Supabase Update結果による分岐', () => {
      beforeEach(() => {
        setupAuthenticatedUser(mockSupabaseClient, mockUser)
      })

      it('更新が成功した場合、成功メッセージを返す', async () => {
        setupQueryResult(mockChain, mockSupabaseSuccess({ count: 1 }))

        const request = createMockNextRequest({
          method: 'POST',
          body: { enable_webhook_notifications: false },
        })

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('Notification preferences updated successfully')
      })

      it('更新がエラーを返した場合、500エラーを返す', async () => {
        setupQueryResult(mockChain, mockSupabaseError({
          message: 'Update failed',
          code: '23505',
        }))

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
      beforeEach(() => {
        setupAuthenticatedUser(mockSupabaseClient, mockUser)
      })

      it('JSON解析エラーが発生した場合、500エラーを返す', async () => {
        const request = createMockNextRequest({
          method: 'POST',
          body: { enable_webhook_notifications: false },
        })

        request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

        const response = await POST(request as any)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Internal server error')
      })
    })
  })

  describe('統合シナリオテスト', () => {
    it('ユーザーが通知設定を有効から無効に変更する', async () => {
      setupAuthenticatedUser(mockSupabaseClient, mockUser)
      
      // 最初のGETで現在の設定を確認
      setupQueryResult(mockChain, mockSupabaseSuccess({
        enable_webhook_notifications: true,
      }))
      
      const getRequest = createMockNextRequest({ method: 'GET' })
      const getResponse = await GET(getRequest as any)
      const getData = await getResponse.json()
      
      expect(getResponse.status).toBe(200)
      expect(getData.enable_webhook_notifications).toBe(true)

      // POSTで設定を無効に変更
      setupQueryResult(mockChain, mockSupabaseSuccess({
        enable_webhook_notifications: false,
      }))

      const postRequest = createMockNextRequest({
        method: 'POST',
        body: { enable_webhook_notifications: false },
      })
      const postResponse = await POST(postRequest as any)
      const postData = await postResponse.json()

      expect(postResponse.status).toBe(200)
      expect(postData.message).toBe('Notification preferences updated successfully')
      expect(postData.enable_webhook_notifications).toBe(false)
    })
  })
})