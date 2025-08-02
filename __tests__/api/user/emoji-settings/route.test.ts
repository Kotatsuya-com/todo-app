/**
 * @jest-environment node
 */

import { GET, PUT } from '@/app/api/user/emoji-settings/route'
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

const mockCreateServerSupabaseClient = require('@/lib/supabase-server').createServerSupabaseClient

describe('/api/user/emoji-settings/route.ts - Result-based Testing', () => {
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

  describe('GET - 絵文字設定取得', () => {
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

      it('設定データが存在する場合、その設定を返す', async () => {
        const existingSettings = {
          today_emoji: 'fire',
          tomorrow_emoji: 'calendar',
          later_emoji: 'memo',
        }
        
        setupQueryResult(mockChain, mockSupabaseSuccess(existingSettings))

        const request = createMockNextRequest({ method: 'GET' })
        const response = await GET(request as any)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.settings).toEqual(existingSettings)
        expect(data.availableEmojis).toBeDefined()
      })

      it('設定データが存在しない場合（PGRST116）、デフォルト値を返す', async () => {
        setupQueryResult(mockChain, mockSupabaseNotFound())

        const request = createMockNextRequest({ method: 'GET' })
        const response = await GET(request as any)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.settings).toEqual({
          today_emoji: 'fire',
          tomorrow_emoji: 'calendar',
          later_emoji: 'memo',
        })
        expect(data.availableEmojis).toBeDefined()
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
        expect(data.error).toBe('Failed to fetch settings')
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

  describe('PUT - 絵文字設定更新', () => {
    const validEmojiSettings = {
      today_emoji: 'zap',
      tomorrow_emoji: 'clock',
      later_emoji: 'bookmark',
    }

    describe('認証状態による分岐', () => {
      it('認証されていない場合、401エラーを返す', async () => {
        setupUnauthenticatedUser(mockSupabaseClient)

        const request = createMockNextRequest({
          method: 'PUT',
          body: validEmojiSettings,
        })

        const response = await PUT(request as any)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('バリデーション', () => {
      beforeEach(() => {
        setupAuthenticatedUser(mockSupabaseClient, mockUser)
      })

      it('無効な絵文字が含まれている場合、400エラーを返す', async () => {
        const invalidSettings = {
          today_emoji: 'invalid_emoji',
          tomorrow_emoji: 'clock',
          later_emoji: 'bookmark',
        }

        const request = createMockNextRequest({
          method: 'PUT',
          body: invalidSettings,
        })

        const response = await PUT(request as any)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid emoji selection')
      })

      it('必須フィールドが欠けている場合、500エラーを返す', async () => {
        const incompleteSettings = {
          today_emoji: 'zap',
          tomorrow_emoji: 'clock',
          // later_emoji is missing
        }

        const request = createMockNextRequest({
          method: 'PUT',
          body: incompleteSettings,
        })

        const response = await PUT(request as any)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid emoji selection')
      })
    })

    describe('Supabase Upsert結果による分岐', () => {
      beforeEach(() => {
        setupAuthenticatedUser(mockSupabaseClient, mockUser)
      })

      it('Upsertが成功した場合、更新された設定を返す', async () => {
        const upsertedData = {
          user_id: mockUser.id,
          today_emoji: 'zap',
          tomorrow_emoji: 'clock',
          later_emoji: 'bookmark',
          updated_at: new Date().toISOString(),
        }

        setupQueryResult(mockChain, mockSupabaseSuccess(upsertedData))

        const request = createMockNextRequest({
          method: 'PUT',
          body: validEmojiSettings,
        })

        const response = await PUT(request as any)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('Settings updated successfully')
        expect(data.settings).toEqual({
          today_emoji: 'zap',
          tomorrow_emoji: 'clock',
          later_emoji: 'bookmark',
        })
      })

      it('Upsertがエラーを返した場合、500エラーを返す', async () => {
        setupQueryResult(mockChain, mockSupabaseError({
          message: 'Unique constraint violation',
          code: '23505',
        }))

        const request = createMockNextRequest({
          method: 'PUT',
          body: validEmojiSettings,
        })

        const response = await PUT(request as any)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to update settings')
        expect(data.details).toBe('Unique constraint violation')
      })
    })

    describe('例外処理', () => {
      beforeEach(() => {
        setupAuthenticatedUser(mockSupabaseClient, mockUser)
      })

      it('JSON解析エラーが発生した場合、500エラーを返す', async () => {
        const request = createMockNextRequest({
          method: 'PUT',
          body: validEmojiSettings,
        })

        request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

        const response = await PUT(request as any)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Internal server error')
      })

      it('予期しないエラーが発生した場合、500エラーを返す', async () => {
        mockChain.upsert.mockImplementation(() => {
          throw new Error('Network error')
        })

        const request = createMockNextRequest({
          method: 'PUT',
          body: validEmojiSettings,
        })

        const response = await PUT(request as any)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Internal server error')
      })
    })
  })

  describe('統合シナリオテスト', () => {
    it('新規ユーザーが初めて絵文字設定を保存する', async () => {
      setupAuthenticatedUser(mockSupabaseClient, mockUser)
      
      // 最初のGETでデータなし
      setupQueryResult(mockChain, mockSupabaseNotFound())
      
      const getRequest = createMockNextRequest({ method: 'GET' })
      const getResponse = await GET(getRequest as any)
      const getData = await getResponse.json()
      
      expect(getResponse.status).toBe(200)
      expect(getData.settings.today_emoji).toBe('fire') // デフォルト値

      // PUTで新規作成
      const newSettings = {
        today_emoji: 'zap',
        tomorrow_emoji: 'clock', 
        later_emoji: 'bookmark',
      }
      
      setupQueryResult(mockChain, mockSupabaseSuccess({
        ...newSettings,
        user_id: mockUser.id,
      }))

      const putRequest = createMockNextRequest({
        method: 'PUT',
        body: newSettings,
      })
      const putResponse = await PUT(putRequest as any)
      const putData = await putResponse.json()

      expect(putResponse.status).toBe(200)
      expect(putData.settings).toEqual(newSettings)
    })
  })
})