/**
 * Test fixtures for UrlDetection entities
 * URL検出エンティティテスト用の共通フィクスチャ
 */

import { UrlDetectionRequest, UrlDetectionOptions } from '@/lib/entities/UrlDetection'

// 有効なリクエストURLのパターン
export const VALID_REQUEST_URLS = [
  'http://localhost:3000/api/app-url',
  'https://example.com/api/app-url',
  'https://app.ngrok.io/api/app-url',
  'https://my-app.vercel.app/api/app-url',
  'http://192.168.1.100:8080/api/app-url',
  'https://api.subdomain.example.com/api/app-url',
  'http://[::1]:3000/api/app-url'
]

// 無効なリクエストURLのパターン
export const INVALID_REQUEST_URLS = [
  '',
  '   ',
  'not-a-url',
  'ftp://invalid-protocol.com',
  'http://',
  'https://',
  null,
  undefined,
  123,
  {},
  []
]

// 環境検出のテストケース
export const ENVIRONMENT_DETECTION_CASES = [
  {
    hostname: 'localhost',
    expected: 'localhost'
  },
  {
    hostname: '127.0.0.1',
    expected: 'localhost'
  },
  {
    hostname: '::1',
    expected: 'localhost'
  },
  {
    hostname: '[::1]',
    expected: 'localhost'
  },
  {
    hostname: 'abc123.ngrok.io',
    expected: 'ngrok'
  },
  {
    hostname: 'example.com',
    expected: 'production'
  },
  {
    hostname: 'my-app.vercel.app',
    expected: 'production'
  },
  {
    hostname: 'api.netlify.app',
    expected: 'production'
  }
]

// ポート処理のテストケース
export const PORT_HANDLING_CASES = [
  {
    protocol: 'http:',
    port: '80',
    isStandard: true,
    expected: 'http://example.com'
  },
  {
    protocol: 'https:',
    port: '443',
    isStandard: true,
    expected: 'https://example.com'
  },
  {
    protocol: 'http:',
    port: '3000',
    isStandard: false,
    expected: 'http://example.com:3000'
  },
  {
    protocol: 'https:',
    port: '8080',
    isStandard: false,
    expected: 'https://example.com:8080'
  },
  {
    protocol: 'http:',
    port: '',
    isStandard: true,
    expected: 'http://example.com'
  }
]

// URL構築のテストケース
export const URL_BUILDING_CASES = [
  {
    protocol: 'http:',
    hostname: 'localhost',
    port: '3000',
    expected: 'http://localhost:3000'
  },
  {
    protocol: 'https:',
    hostname: 'example.com',
    port: '443',
    expected: 'https://example.com'
  },
  {
    protocol: 'https:',
    hostname: 'app.ngrok.io',
    port: '',
    expected: 'https://app.ngrok.io'
  },
  {
    protocol: '',
    hostname: 'example.com',
    port: '',
    expected: 'example.com'
  },
  {
    protocol: 'http:',
    hostname: '',
    port: '3000',
    expected: 'http://localhost:3000' // fallback
  }
]

// URL正規化のテストケース
export const URL_NORMALIZATION_CASES = [
  {
    input: 'https://example.com/some/deep/path?param=value#fragment',
    expected: 'https://example.com'
  },
  {
    input: 'http://localhost:3000/api/app-url',
    expected: 'http://localhost:3000'
  },
  {
    input: 'https://app.ngrok.io:443/webhook',
    expected: 'https://app.ngrok.io'
  },
  {
    input: 'http://example.com:80/test',
    expected: 'http://example.com'
  },
  {
    input: 'invalid-url',
    expected: 'http://localhost:3000' // fallback
  }
]

// 優先順位テストケース
export const PRIORITY_TEST_CASES = [
  {
    name: 'ngrok URL優先',
    options: {
      ngrokUrl: 'https://test.ngrok.io',
      publicAppUrl: 'https://production.com'
    },
    expected: 'https://test.ngrok.io'
  },
  {
    name: 'public URL使用（ngrokなし）',
    options: {
      ngrokUrl: null,
      publicAppUrl: 'https://production.com'
    },
    expected: 'https://production.com'
  },
  {
    name: 'リクエストベース（両方なし）',
    options: {
      ngrokUrl: null,
      publicAppUrl: null
    },
    requestUrl: 'https://example.com/test',
    expected: 'https://example.com'
  }
]

// モックUrlDetectionRequest
export const createMockUrlDetectionRequest = (overrides: Partial<UrlDetectionRequest> = {}): UrlDetectionRequest => ({
  requestUrl: 'http://localhost:3000/api/app-url',
  protocol: 'http:',
  hostname: 'localhost',
  port: '3000',
  ...overrides
})

// モックUrlDetectionOptions
export const createMockUrlDetectionOptions = (overrides: Partial<UrlDetectionOptions> = {}): UrlDetectionOptions => ({
  ngrokUrl: null,
  publicAppUrl: null,
  fallbackUrl: 'http://localhost:3000',
  ...overrides
})

// バリデーションエラーのテストケース
export const VALIDATION_ERROR_TEST_CASES = [
  {
    name: 'empty URL',
    request: createMockUrlDetectionRequest({ requestUrl: '' }),
    expectedErrors: ['Request URL is required']
  },
  {
    name: 'null URL',
    request: createMockUrlDetectionRequest({ requestUrl: null as any }),
    expectedErrors: ['Request URL is required']
  },
  {
    name: 'undefined URL',
    request: createMockUrlDetectionRequest({ requestUrl: undefined as any }),
    expectedErrors: ['Request URL is required']
  },
  {
    name: 'non-string URL',
    request: createMockUrlDetectionRequest({ requestUrl: 123 as any }),
    expectedErrors: ['Request URL must be a string']
  },
  {
    name: 'invalid URL format',
    request: createMockUrlDetectionRequest({ requestUrl: 'not-a-valid-url' }),
    expectedErrors: ['Request URL format is invalid']
  }
]

// 特殊なホスト名のテストケース
export const SPECIAL_HOSTNAME_CASES = [
  {
    hostname: '192.168.1.100',
    port: '3000',
    expected: 'http://192.168.1.100:3000'
  },
  {
    hostname: '[::1]',
    port: '3000',
    expected: 'http://[::1]:3000'
  },
  {
    hostname: 'api.subdomain.example.com',
    port: '',
    expected: 'https://api.subdomain.example.com'
  },
  {
    hostname: 'localhost.localdomain',
    port: '8080',
    expected: 'http://localhost.localdomain:8080'
  }
]

// エッジケースのテストデータ
export const EDGE_CASE_DATA = {
  // 空のプロトコル/ホスト名
  emptyComponents: {
    protocol: '',
    hostname: '',
    port: ''
  },
  
  // 極端に長いURL
  longUrl: {
    requestUrl: 'https://very-long-subdomain-name-that-exceeds-normal-length.example.com:8080/very/long/path/that/goes/deeper/than/usual/api/endpoint/with/many/parameters?param1=value1&param2=value2&param3=value3&param4=value4&param5=value5#fragment-with-long-name'
  },
  
  // 特殊文字を含むホスト名
  specialCharsInHostname: {
    // IDN（国際化ドメイン名）
    hostname: 'xn--n3h.com' // 実際の例: ☃.com
  },
  
  // 境界値
  boundaryValues: {
    minValidUrl: 'http://a.co',
    standardPorts: ['80', '443'],
    commonNonStandardPorts: ['3000', '8080', '8443', '9000']
  }
}

// ファクトリーメソッドのテストケース
export const FACTORY_METHOD_TEST_CASES = [
  {
    name: 'fromRequestUrl',
    requestUrl: 'https://example.com/test',
    options: createMockUrlDetectionOptions({ ngrokUrl: 'https://ngrok.io' }),
    expectedMethod: 'fromRequestUrl'
  },
  {
    name: 'fromNextRequest',
    requestUrl: 'https://example.com/test',
    nextUrl: { protocol: 'https:', hostname: 'example.com', port: '' },
    options: createMockUrlDetectionOptions(),
    expectedMethod: 'fromNextRequest'
  },
  {
    name: 'withEnvironmentDefaults',
    requestUrl: 'https://example.com/test',
    ngrokUrl: 'https://test.ngrok.io',
    publicAppUrl: 'https://production.com',
    expectedMethod: 'withEnvironmentDefaults'
  }
]