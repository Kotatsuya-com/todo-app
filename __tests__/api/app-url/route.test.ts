/**
 * @jest-environment node
 */

import { GET } from '@/app/api/app-url/route'
import { 
  createMockNextRequest,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from '@/__tests__/mocks'

describe('/api/app-url/route.ts - GET', () => {
  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('アプリURL検出', () => {
    it('localhost環境のURLを返す', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/app-url',
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appUrl).toBe('http://localhost:3000')
    })

    it('ngrok環境のURLを返す', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://abc123.ngrok.io/api/app-url',
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appUrl).toBe('https://abc123.ngrok.io')
    })

    it('本番環境（Vercel）のURLを返す', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://my-app.vercel.app/api/app-url',
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appUrl).toBe('https://my-app.vercel.app')
    })

    it('カスタムドメインのURLを返す', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://todoapp.example.com/api/app-url',
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appUrl).toBe('https://todoapp.example.com')
    })
  })

  describe('HTTPとHTTPSの処理', () => {
    it('HTTP URLの場合はHTTPを保持する', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/app-url',
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(data.appUrl).toMatch(/^http:\/\//)
    })

    it('HTTPS URLの場合はHTTPSを保持する', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://secure.example.com/api/app-url',
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(data.appUrl).toMatch(/^https:\/\//)
    })
  })

  describe('ポート番号の処理', () => {
    it('標準ポート80は省略される', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://example.com:80/api/app-url',
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(data.appUrl).toBe('http://example.com')
    })

    it('標準ポート443は省略される', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://example.com:443/api/app-url',
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(data.appUrl).toBe('https://example.com')
    })

    it('非標準ポートは保持される', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:8080/api/app-url',
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(data.appUrl).toBe('http://localhost:8080')
    })

    it('開発環境の3000ポートは保持される', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/app-url',
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(data.appUrl).toBe('http://localhost:3000')
    })
  })

  describe('パスとクエリパラメータの処理', () => {
    it('APIパス以外のパスは除去される', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://example.com/some/deep/path/api/app-url',
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(data.appUrl).toBe('https://example.com')
    })

    it('クエリパラメータは除去される', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://example.com/api/app-url?param1=value1&param2=value2',
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(data.appUrl).toBe('https://example.com')
    })

    it('フラグメントは除去される', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://example.com/api/app-url#fragment',
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(data.appUrl).toBe('https://example.com')
    })
  })

  describe('特殊なホスト名', () => {
    it('IPアドレスのホストを正しく処理する', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://192.168.1.100:3000/api/app-url',
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(data.appUrl).toBe('http://192.168.1.100:3000')
    })

    it('IPv6アドレスのホストを正しく処理する', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://[::1]:3000/api/app-url',
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(data.appUrl).toBe('http://[::1]:3000')
    })

    it('サブドメインを含むホストを正しく処理する', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://api.subdomain.example.com/api/app-url',
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(data.appUrl).toBe('https://api.subdomain.example.com')
    })
  })

  describe('エラーハンドリング', () => {
    it('不正なURLの場合でもエラーを返さない', async () => {
      // NextRequestのnextUrlが不正な場合のシミュレーション
      const request = {
        nextUrl: {
          protocol: 'http:',
          hostname: '', // 空のホスト名
          port: '',
        }
      } as any

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('appUrl')
    })

    it('プロトコルが欠けている場合のフォールバック', async () => {
      const request = {
        nextUrl: {
          protocol: '',
          hostname: 'example.com',
          port: '',
        }
      } as any

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appUrl).toBe('example.com')
    })
  })

  describe('レスポンス形式', () => {
    it('正しいJSONレスポンス形式を返す', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://example.com/api/app-url',
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(data).toHaveProperty('appUrl')
      expect(typeof data.appUrl).toBe('string')
    })

    it('Content-Typeヘッダーが正しく設定される', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://example.com/api/app-url',
      })

      const response = await GET(request as any)

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('URL構築ロジック', () => {
    it('基本的なURL構築が正しく動作する', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://example.com:8080/api/app-url',
      })

      const response = await GET(request as any)
      const data = await response.json()

      const expectedUrl = 'https://example.com:8080'
      expect(data.appUrl).toBe(expectedUrl)
    })

    it('プロトコル + ホスト + ポートの組み合わせが正しい', async () => {
      const testCases = [
        { input: 'http://localhost:3000/api/app-url', expected: 'http://localhost:3000' },
        { input: 'https://app.ngrok.io/api/app-url', expected: 'https://app.ngrok.io' },
        { input: 'https://production.com:443/api/app-url', expected: 'https://production.com' },
        { input: 'http://dev.local:8080/api/app-url', expected: 'http://dev.local:8080' },
      ]

      for (const testCase of testCases) {
        const request = createMockNextRequest({
          method: 'GET',
          url: testCase.input,
        })

        const response = await GET(request as any)
        const data = await response.json()

        expect(data.appUrl).toBe(testCase.expected)
      }
    })
  })
})