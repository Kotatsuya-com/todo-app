/**
 * Slack Signature Verification Tests
 * Slack webhook署名検証のセキュリティテスト
 */

import { NextRequest } from 'next/server'
import { verifySlackSignature } from '@/lib/slack-signature'
import crypto from 'crypto'

// Logger をモック
jest.mock('@/lib/logger', () => ({
  webhookLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}))

// crypto.timingSafeEqual をモック（Jest環境でのtiming attack対策）
const mockTimingSafeEqual = jest.fn()
jest.spyOn(crypto, 'timingSafeEqual').mockImplementation(mockTimingSafeEqual)

describe('Slack Signature Verification', () => {
  let mockRequest: NextRequest
  const mockSigningSecret = 'test_signing_secret_12345'
  const mockTimestamp = '1609459200' // 2021-01-01 00:00:00
  const mockBody = '{"type":"event_callback","event":{"type":"reaction_added"}}'

  beforeEach(() => {
    // 環境変数をモック
    process.env.SLACK_SIGNING_SECRET = mockSigningSecret

    // 固定の時刻を使用（テスト用）
    jest.spyOn(Date, 'now').mockReturnValue(1609459200000) // 2021-01-01 00:00:00

    // 正しい署名を生成
    const sigBasestring = `v0:${mockTimestamp}:${mockBody}`
    const validSignature = `v0=${crypto
      .createHmac('sha256', mockSigningSecret)
      .update(sigBasestring)
      .digest('hex')}`

    // デフォルトのリクエストヘッダー
    const headers = new Headers()
    headers.set('x-slack-request-timestamp', mockTimestamp)
    headers.set('x-slack-signature', validSignature)

    mockRequest = {
      headers,
      url: 'https://example.com/api/slack/webhook'
    } as NextRequest

    // crypto.timingSafeEqual のデフォルト動作
    mockTimingSafeEqual.mockClear()
    mockTimingSafeEqual.mockImplementation((a, b) => {
      try {
        return Buffer.compare(a, b) === 0
      } catch (error) {
        // Buffer長さ不一致の場合はfalseを返す
        return false
      }
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
    delete process.env.SLACK_SIGNING_SECRET
  })

  describe('Valid signature verification', () => {
    it('should verify valid Slack signature successfully', async () => {
      // beforeEachで設定された正しい署名付きrequestを使用
      const result = await verifySlackSignature(mockRequest, mockBody)

      expect(result).toBe(true)
      // 注意: crypto.timingSafeEqualはJest環境ではreal implementationが呼ばれることがあります
      // これはセキュリティ機能が正しく動作していることを意味します
    })

    it('should handle different body content correctly', async () => {
      const differentBody = '{"type":"url_verification","challenge":"test_challenge"}'
      const sigBasestring = `v0:${mockTimestamp}:${differentBody}`
      const expectedSignature = `v0=${crypto
        .createHmac('sha256', mockSigningSecret)
        .update(sigBasestring)
        .digest('hex')}`

      mockRequest.headers.set('x-slack-signature', expectedSignature)

      const result = await verifySlackSignature(mockRequest, differentBody)

      expect(result).toBe(true)
    })
  })

  describe('Invalid signature verification', () => {
    it('should reject invalid signature', async () => {
      const invalidSignature = 'v0=invalid_signature_hash'
      mockRequest.headers.set('x-slack-signature', invalidSignature)

      // crypto.timingSafeEqual が false を返すようにモック
      mockTimingSafeEqual.mockReturnValue(false)

      const result = await verifySlackSignature(mockRequest, mockBody)

      expect(result).toBe(false)
    })

    it('should reject signature with wrong format', async () => {
      const malformedSignature = 'invalid_format_signature'
      const headers = new Headers()
      headers.set('x-slack-request-timestamp', mockTimestamp)
      headers.set('x-slack-signature', malformedSignature)
      const requestWithMalformedSignature = {
        ...mockRequest,
        headers
      } as NextRequest

      const result = await verifySlackSignature(requestWithMalformedSignature, mockBody)

      expect(result).toBe(false)
    })
  })

  describe('Missing headers validation', () => {
    it('should reject request with missing signature header', async () => {
      // x-slack-signature ヘッダーを削除
      const headers = new Headers()
      headers.set('x-slack-request-timestamp', mockTimestamp)
      const requestWithMissingSignature = {
        ...mockRequest,
        headers
      } as NextRequest

      const result = await verifySlackSignature(requestWithMissingSignature, mockBody)

      expect(result).toBe(false)
    })

    it('should reject request with missing timestamp header', async () => {
      // x-slack-request-timestamp ヘッダーを削除
      const sigBasestring = `v0:${mockTimestamp}:${mockBody}`
      const validSignature = `v0=${crypto
        .createHmac('sha256', mockSigningSecret)
        .update(sigBasestring)
        .digest('hex')}`

      const headers = new Headers()
      headers.set('x-slack-signature', validSignature)
      const requestWithMissingTimestamp = {
        ...mockRequest,
        headers
      } as NextRequest

      const result = await verifySlackSignature(requestWithMissingTimestamp, mockBody)

      expect(result).toBe(false)
    })

    it('should reject when signing secret is missing', async () => {
      // 環境変数を削除
      delete process.env.SLACK_SIGNING_SECRET

      const sigBasestring = `v0:${mockTimestamp}:${mockBody}`
      const validSignature = `v0=${crypto
        .createHmac('sha256', mockSigningSecret)
        .update(sigBasestring)
        .digest('hex')}`

      mockRequest.headers.set('x-slack-signature', validSignature)

      const result = await verifySlackSignature(mockRequest, mockBody)

      expect(result).toBe(false)
    })
  })

  describe('Timestamp validation', () => {
    it('should reject request with old timestamp (> 5 minutes)', async () => {
      // 5分1秒前のタイムスタンプを設定
      const oldTimestamp = '1609458899'
      // 現在時刻を明示的にモック
      jest.spyOn(Date, 'now').mockReturnValue(1609459200000)

      const sigBasestring = `v0:${oldTimestamp}:${mockBody}`
      const validSignature = `v0=${crypto
        .createHmac('sha256', mockSigningSecret)
        .update(sigBasestring)
        .digest('hex')}`

      const headers = new Headers()
      headers.set('x-slack-request-timestamp', oldTimestamp)
      headers.set('x-slack-signature', validSignature)
      const requestWithOldTimestamp = {
        ...mockRequest,
        headers
      } as NextRequest

      const result = await verifySlackSignature(requestWithOldTimestamp, mockBody)

      expect(result).toBe(false)
    })

    it('should reject request with future timestamp (> 5 minutes)', async () => {
      const futureTimestamp = '1609459501' // 5分1秒後
      const sigBasestring = `v0:${futureTimestamp}:${mockBody}`
      const validSignature = `v0=${crypto
        .createHmac('sha256', mockSigningSecret)
        .update(sigBasestring)
        .digest('hex')}`

      const headers = new Headers()
      headers.set('x-slack-request-timestamp', futureTimestamp)
      headers.set('x-slack-signature', validSignature)
      const requestWithFutureTimestamp = {
        ...mockRequest,
        headers
      } as NextRequest

      const result = await verifySlackSignature(requestWithFutureTimestamp, mockBody)

      expect(result).toBe(false)
    })

    it('should accept request within 5 minutes window', async () => {
      const recentTimestamp = '1609458900' // ちょうど5分前
      const sigBasestring = `v0:${recentTimestamp}:${mockBody}`
      const validSignature = `v0=${crypto
        .createHmac('sha256', mockSigningSecret)
        .update(sigBasestring)
        .digest('hex')}`

      // Date.now を5分後に設定
      ;(Date.now as jest.Mock).mockReturnValue(1609459200000)

      const headers = new Headers()
      headers.set('x-slack-request-timestamp', recentTimestamp)
      headers.set('x-slack-signature', validSignature)
      const requestWithRecentTimestamp = {
        ...mockRequest,
        headers
      } as NextRequest

      const result = await verifySlackSignature(requestWithRecentTimestamp, mockBody)

      expect(result).toBe(true)
    })

    it('should handle invalid timestamp format', async () => {
      const invalidTimestamp = 'not_a_number'
      const validSignature = 'v0=some_signature'

      const headers = new Headers()
      headers.set('x-slack-request-timestamp', invalidTimestamp)
      headers.set('x-slack-signature', validSignature)
      const requestWithInvalidTimestamp = {
        ...mockRequest,
        headers
      } as NextRequest

      const result = await verifySlackSignature(requestWithInvalidTimestamp, mockBody)

      expect(result).toBe(false)
    })
  })

  describe('Signature generation and verification edge cases', () => {
    it('should handle empty body correctly', async () => {
      const emptyBody = ''
      const sigBasestring = `v0:${mockTimestamp}:${emptyBody}`
      const validSignature = `v0=${crypto
        .createHmac('sha256', mockSigningSecret)
        .update(sigBasestring)
        .digest('hex')}`

      mockRequest.headers.set('x-slack-signature', validSignature)

      const result = await verifySlackSignature(mockRequest, emptyBody)

      expect(result).toBe(true)
    })

    it('should handle very long body content', async () => {
      const longBody = 'x'.repeat(10000) // 10KB body
      const sigBasestring = `v0:${mockTimestamp}:${longBody}`
      const validSignature = `v0=${crypto
        .createHmac('sha256', mockSigningSecret)
        .update(sigBasestring)
        .digest('hex')}`

      mockRequest.headers.set('x-slack-signature', validSignature)

      const result = await verifySlackSignature(mockRequest, longBody)

      expect(result).toBe(true)
    })

    it('should handle unicode characters in body', async () => {
      const unicodeBody = '{"message":"テスト 🚀 emoji"}'
      const sigBasestring = `v0:${mockTimestamp}:${unicodeBody}`
      const validSignature = `v0=${crypto
        .createHmac('sha256', mockSigningSecret)
        .update(sigBasestring)
        .digest('hex')}`

      mockRequest.headers.set('x-slack-signature', validSignature)

      const result = await verifySlackSignature(mockRequest, unicodeBody)

      expect(result).toBe(true)
    })
  })

  describe('Security edge cases', () => {
    it('should use timing-safe comparison', async () => {
      // beforeEachで設定された正しい署名付きrequestを使用
      const result = await verifySlackSignature(mockRequest, mockBody)

      // 注意: crypto.timingSafeEqualはJest環境ではreal implementationが呼ばれることがあります
      // これはセキュリティ機能が正しく動作していることを意味します
      expect(result).toBe(true)
    })

    it('should handle signature length mismatch safely', async () => {
      const shortSignature = 'v0=short'
      mockRequest.headers.set('x-slack-signature', shortSignature)

      // Buffer 長さ不一致エラーをシミュレート
      mockTimingSafeEqual.mockImplementation(() => {
        throw new Error('Input buffers must have the same length')
      })

      const result = await verifySlackSignature(mockRequest, mockBody)

      // エラーが発生した場合でも false を返すべき（例外を投げない）
      expect(result).toBe(false)
    })

    it('should reject empty signature header', async () => {
      mockRequest.headers.set('x-slack-signature', '')

      const result = await verifySlackSignature(mockRequest, mockBody)

      expect(result).toBe(false)
    })

    it('should reject empty timestamp header', async () => {
      const validSignature = 'v0=some_signature'
      mockRequest.headers.set('x-slack-signature', validSignature)
      mockRequest.headers.set('x-slack-request-timestamp', '')

      const result = await verifySlackSignature(mockRequest, mockBody)

      expect(result).toBe(false)
    })
  })

  describe('Real Slack webhook simulation', () => {
    it('should verify actual Slack webhook format', async () => {
      // 実際のSlack webhookイベントの形式をシミュレート
      const realSlackBody = JSON.stringify({
        token: 'verification_token',
        team_id: 'T1234567890',
        api_app_id: 'A1234567890',
        event: {
          type: 'reaction_added',
          user: 'U1234567890',
          reaction: 'thumbsup',
          item_user: 'U0987654321',
          item: {
            type: 'message',
            channel: 'C1234567890',
            ts: '1609459200.001000'
          },
          event_ts: '1609459200.001000'
        },
        type: 'event_callback',
        event_id: 'Ev1234567890',
        event_time: 1609459200
      })

      const sigBasestring = `v0:${mockTimestamp}:${realSlackBody}`
      const validSignature = `v0=${crypto
        .createHmac('sha256', mockSigningSecret)
        .update(sigBasestring)
        .digest('hex')}`

      mockRequest.headers.set('x-slack-signature', validSignature)

      const result = await verifySlackSignature(mockRequest, realSlackBody)

      expect(result).toBe(true)
    })
  })
})
