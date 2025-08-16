/**
 * @jest-environment jsdom
 */

import { UrlDetectionEntity } from '@/lib/entities/UrlDetection'
import {
  createMockUrlDetectionRequest,
  createMockUrlDetectionOptions,
  VALID_REQUEST_URLS,
  INVALID_REQUEST_URLS,
  ENVIRONMENT_DETECTION_CASES,
  PORT_HANDLING_CASES,
  URL_BUILDING_CASES,
  URL_NORMALIZATION_CASES,
  PRIORITY_TEST_CASES,
  VALIDATION_ERROR_TEST_CASES,
  SPECIAL_HOSTNAME_CASES,
  EDGE_CASE_DATA,
  FACTORY_METHOD_TEST_CASES
} from '@/__tests__/fixtures/url-detection.fixture'

describe('UrlDetectionEntity', () => {
  describe('constructor and basic properties', () => {
    it('should create entity with valid request', () => {
      const request = createMockUrlDetectionRequest()
      const options = createMockUrlDetectionOptions()
      const entity = new UrlDetectionEntity(request, options)

      expect(entity.requestUrl).toBe(request.requestUrl)
      expect(entity.options).toEqual(options)
    })

    it('should provide immutable access to properties', () => {
      const request = createMockUrlDetectionRequest()
      const options = createMockUrlDetectionOptions({ ngrokUrl: 'https://test.ngrok.io' })
      const entity = new UrlDetectionEntity(request, options)

      // プロパティの変更が元のオブジェクトに影響しないことを確認
      const retrievedOptions = entity.options
      retrievedOptions.ngrokUrl = 'https://modified.ngrok.io'

      expect(entity.options.ngrokUrl).toBe('https://test.ngrok.io')
    })

    it('should use default fallback URL when not provided', () => {
      const request = createMockUrlDetectionRequest()
      const entity = new UrlDetectionEntity(request)

      expect(entity.options.fallbackUrl).toBe(UrlDetectionEntity.DEFAULT_FALLBACK_URL)
    })

    it('should preserve custom fallback URL when provided', () => {
      const request = createMockUrlDetectionRequest()
      const customFallback = 'https://custom-fallback.com'
      const options = createMockUrlDetectionOptions({ fallbackUrl: customFallback })
      const entity = new UrlDetectionEntity(request, options)

      expect(entity.options.fallbackUrl).toBe(customFallback)
    })
  })

  describe('URL validation', () => {
    it('should validate correct URLs', () => {
      VALID_REQUEST_URLS.forEach(url => {
        const entity = UrlDetectionEntity.fromRequestUrl(url)
        expect(entity.isValidRequestUrl()).toBe(true)
      })
    })

    it('should reject invalid URLs', () => {
      const stringInvalidUrls = [
        '',
        '   ',
        'not-a-url',
        'http://',
        'https://'
      ]

      stringInvalidUrls.forEach(url => {
        const entity = UrlDetectionEntity.fromRequestUrl(url)
        expect(entity.isValidRequestUrl()).toBe(false)
      })
    })

    it('should handle edge case URLs', () => {
      const edgeCases = [
        'http://a.co', // 最短の有効URL
        'https://very-long-domain-name-that-is-still-valid.example.com:8080/path',
        'http://192.168.1.1:3000/api',
        'https://[::1]:8080/test'
      ]

      edgeCases.forEach(url => {
        const entity = UrlDetectionEntity.fromRequestUrl(url)
        expect(entity.isValidRequestUrl()).toBe(true)
      })
    })
  })

  describe('request validation', () => {
    VALIDATION_ERROR_TEST_CASES.forEach(testCase => {
      it(`should handle ${testCase.name}`, () => {
        const entity = new UrlDetectionEntity(testCase.request)
        const validation = entity.validateRequest()

        expect(validation.valid).toBe(false)
        expect(validation.errors).toEqual(testCase.expectedErrors)
      })
    })

    it('should pass validation for valid request', () => {
      const request = createMockUrlDetectionRequest()
      const entity = new UrlDetectionEntity(request)
      const validation = entity.validateRequest()

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should validate complex URLs correctly', () => {
      const complexUrl = 'https://api.subdomain.example.com:8443/webhook/endpoint?param=value#fragment'
      const request = createMockUrlDetectionRequest({ requestUrl: complexUrl })
      const entity = new UrlDetectionEntity(request)
      const validation = entity.validateRequest()

      expect(validation.valid).toBe(true)
    })
  })

  describe('URL parsing', () => {
    it('should parse standard HTTP URL correctly', () => {
      const entity = UrlDetectionEntity.fromRequestUrl('http://example.com:8080/api/test')
      const parsed = entity.parseRequestUrl()

      expect(parsed.protocol).toBe('http:')
      expect(parsed.hostname).toBe('example.com')
      expect(parsed.port).toBe('8080')
    })

    it('should parse HTTPS URL correctly', () => {
      const entity = UrlDetectionEntity.fromRequestUrl('https://secure.example.com/api')
      const parsed = entity.parseRequestUrl()

      expect(parsed.protocol).toBe('https:')
      expect(parsed.hostname).toBe('secure.example.com')
      expect(parsed.port).toBe('')
    })

    it('should fallback to nextUrl properties when URL parsing fails', () => {
      const request = createMockUrlDetectionRequest({
        requestUrl: 'invalid-url',
        protocol: 'https:',
        hostname: 'fallback.com',
        port: '3000'
      })
      const entity = new UrlDetectionEntity(request)
      const parsed = entity.parseRequestUrl()

      expect(parsed.protocol).toBe('https:')
      expect(parsed.hostname).toBe('fallback.com')
      expect(parsed.port).toBe('3000')
    })

    it('should handle IPv6 addresses', () => {
      const entity = UrlDetectionEntity.fromRequestUrl('http://[::1]:3000/api')
      const parsed = entity.parseRequestUrl()

      expect(parsed.protocol).toBe('http:')
      expect(parsed.hostname).toBe('[::1]') // URLコンストラクタは[]を保持する
      expect(parsed.port).toBe('3000')
    })

    it('should handle URLs without explicit ports', () => {
      const entity = UrlDetectionEntity.fromRequestUrl('https://example.com/api')
      const parsed = entity.parseRequestUrl()

      expect(parsed.protocol).toBe('https:')
      expect(parsed.hostname).toBe('example.com')
      expect(parsed.port).toBe('')
    })
  })

  describe('port handling', () => {
    PORT_HANDLING_CASES.forEach(testCase => {
      it(`should handle ${testCase.protocol} port ${testCase.port} correctly`, () => {
        const entity = UrlDetectionEntity.fromRequestUrl('http://example.com')
        const isStandard = entity.isStandardPort(testCase.protocol, testCase.port)
        const url = entity.buildUrlFromComponents(testCase.protocol, 'example.com', testCase.port)

        expect(isStandard).toBe(testCase.isStandard)
        expect(url).toBe(testCase.expected)
      })
    })

    it('should handle empty port as standard', () => {
      const entity = UrlDetectionEntity.fromRequestUrl('http://localhost')

      expect(entity.isStandardPort('http:', '')).toBe(true)
      expect(entity.isStandardPort('https:', '')).toBe(true)
    })

    it('should handle non-standard ports correctly', () => {
      const entity = UrlDetectionEntity.fromRequestUrl('http://localhost')
      const nonStandardPorts = ['3000', '8080', '8443', '9000']

      nonStandardPorts.forEach(port => {
        expect(entity.isStandardPort('http:', port)).toBe(false)
        expect(entity.isStandardPort('https:', port)).toBe(false)
      })
    })
  })

  describe('environment detection', () => {
    ENVIRONMENT_DETECTION_CASES.forEach(testCase => {
      it(`should detect ${testCase.expected} environment for ${testCase.hostname}`, () => {
        const entity = UrlDetectionEntity.fromRequestUrl('http://localhost')
        const environment = entity.detectEnvironment(testCase.hostname)

        expect(environment).toBe(testCase.expected)
      })
    })

    it('should handle special hostname patterns', () => {
      const entity = UrlDetectionEntity.fromRequestUrl('http://localhost')

      // ngrok patterns
      expect(entity.detectEnvironment('abc123.ngrok.io')).toBe('ngrok')
      expect(entity.detectEnvironment('test-app.ngrok.io')).toBe('ngrok')

      // localhost patterns
      expect(entity.detectEnvironment('localhost')).toBe('localhost')
      expect(entity.detectEnvironment('127.0.0.1')).toBe('localhost')
      expect(entity.detectEnvironment('::1')).toBe('localhost')

      // production patterns
      expect(entity.detectEnvironment('my-app.vercel.app')).toBe('production')
      expect(entity.detectEnvironment('api.netlify.app')).toBe('production')
      expect(entity.detectEnvironment('example.com')).toBe('production')
    })

    it('should handle custom domain as production', () => {
      const entity = UrlDetectionEntity.fromRequestUrl('http://localhost')
      const customDomains = [
        'my-custom-domain.com',
        'api.company.co.jp',
        'internal.corporate.net'
      ]

      customDomains.forEach(domain => {
        expect(entity.detectEnvironment(domain)).toBe('production')
      })
    })
  })

  describe('URL building', () => {
    URL_BUILDING_CASES.forEach(testCase => {
      it(`should build URL from ${testCase.protocol} ${testCase.hostname} ${testCase.port}`, () => {
        const entity = UrlDetectionEntity.fromRequestUrl('http://localhost')
        const result = entity.buildUrlFromComponents(testCase.protocol, testCase.hostname, testCase.port)

        expect(result).toBe(testCase.expected)
      })
    })

    it('should handle empty hostname with fallback', () => {
      const customFallback = 'https://custom-fallback.com'
      const entity = UrlDetectionEntity.fromRequestUrl('http://localhost', {
        fallbackUrl: customFallback
      })

      const result = entity.buildUrlFromComponents('https:', '', '3000')
      expect(result).toBe(customFallback)
    })

    it('should handle missing protocol gracefully', () => {
      const entity = UrlDetectionEntity.fromRequestUrl('http://localhost')
      const result = entity.buildUrlFromComponents('', 'example.com', '8080')

      expect(result).toBe('example.com:8080')
    })
  })

  describe('app URL determination', () => {
    PRIORITY_TEST_CASES.forEach(testCase => {
      it(`should handle ${testCase.name}`, () => {
        const requestUrl = testCase.requestUrl || 'http://localhost:3000/api'
        const entity = UrlDetectionEntity.fromRequestUrl(requestUrl, testCase.options)
        const appUrl = entity.determineAppBaseUrl()

        expect(appUrl).toBe(testCase.expected)
      })
    })

    it('should fall back to parsed URL when all options are null', () => {
      const entity = UrlDetectionEntity.fromRequestUrl('invalid-url', {
        ngrokUrl: null,
        publicAppUrl: null
      })

      const appUrl = entity.determineAppBaseUrl()
      // invalid-urlはパースに失敗するため、parseRequestUrl()のフォールバック処理でlocalhostが使われる
      expect(appUrl).toBe('http://localhost')
    })

    it('should handle complex ngrok URLs', () => {
      const ngrokUrl = 'https://abc123-def456.ngrok.io'
      const entity = UrlDetectionEntity.fromRequestUrl('http://localhost:3000', {
        ngrokUrl,
        publicAppUrl: 'https://production.com'
      })

      expect(entity.determineAppBaseUrl()).toBe(ngrokUrl)
    })
  })

  describe('URL normalization', () => {
    URL_NORMALIZATION_CASES.forEach(testCase => {
      it(`should normalize ${testCase.input} to ${testCase.expected}`, () => {
        const entity = UrlDetectionEntity.fromRequestUrl('http://localhost')
        const normalized = entity.normalizeAppUrl(testCase.input)

        expect(normalized).toBe(testCase.expected)
      })
    })

    it('should handle complex URLs with all components', () => {
      const entity = UrlDetectionEntity.fromRequestUrl('http://localhost')
      const complexUrl = 'https://api.subdomain.example.com:8443/very/deep/path/structure?param1=value1&param2=value2&param3=value3#section-anchor'
      const normalized = entity.normalizeAppUrl(complexUrl)

      expect(normalized).toBe('https://api.subdomain.example.com:8443')
    })

    it('should use custom fallback for invalid URLs', () => {
      const customFallback = 'https://custom-fallback.example.com'
      const entity = UrlDetectionEntity.fromRequestUrl('http://localhost', {
        fallbackUrl: customFallback
      })

      const normalized = entity.normalizeAppUrl('totally-invalid-url')
      expect(normalized).toBe(customFallback)
    })
  })

  describe('result creation', () => {
    it('should create complete result object', () => {
      const requestUrl = 'https://app.ngrok.io:8080/webhook'
      const options = createMockUrlDetectionOptions({
        ngrokUrl: 'https://test.ngrok.io',
        publicAppUrl: 'https://production.com'
      })

      const entity = UrlDetectionEntity.fromRequestUrl(requestUrl, options)
      const result = entity.createResult()

      expect(result).toMatchObject({
        appUrl: 'https://test.ngrok.io',
        environment: 'ngrok',
        protocol: 'https:',
        hostname: 'app.ngrok.io',
        port: '8080',
        isStandardPort: false
      })
    })

    it('should detect localhost environment correctly', () => {
      const entity = UrlDetectionEntity.fromRequestUrl('http://localhost:3000/api')
      const result = entity.createResult()

      expect(result.environment).toBe('localhost')
      expect(result.hostname).toBe('localhost')
      expect(result.port).toBe('3000')
    })

    it('should handle production environment', () => {
      const entity = UrlDetectionEntity.fromRequestUrl('https://my-app.vercel.app/api')
      const result = entity.createResult()

      expect(result.environment).toBe('production')
      expect(result.hostname).toBe('my-app.vercel.app')
      expect(result.isStandardPort).toBe(true)
    })
  })

  describe('factory methods', () => {
    it('should create entity from request URL', () => {
      const requestUrl = 'https://example.com/test'
      const options = createMockUrlDetectionOptions({ ngrokUrl: 'https://ngrok.io' })

      const entity = UrlDetectionEntity.fromRequestUrl(requestUrl, options)

      expect(entity.requestUrl).toBe(requestUrl)
      expect(entity.options.ngrokUrl).toBe('https://ngrok.io')
    })

    it('should create entity from NextRequest-style object', () => {
      const requestUrl = 'https://example.com/test'
      const nextUrl = { protocol: 'https:', hostname: 'example.com', port: '' }
      const options = createMockUrlDetectionOptions()

      const entity = UrlDetectionEntity.fromNextRequest(requestUrl, nextUrl, options)

      expect(entity.requestUrl).toBe(requestUrl)
      // nextUrlプロパティは内部でフォールバック用に使用される
    })

    it('should create entity with environment defaults', () => {
      const requestUrl = 'https://example.com/test'
      const ngrokUrl = 'https://test.ngrok.io'
      const publicAppUrl = 'https://production.com'

      const entity = UrlDetectionEntity.withEnvironmentDefaults(requestUrl, ngrokUrl, publicAppUrl)

      expect(entity.requestUrl).toBe(requestUrl)
      expect(entity.options.ngrokUrl).toBe(ngrokUrl)
      expect(entity.options.publicAppUrl).toBe(publicAppUrl)
      expect(entity.options.fallbackUrl).toBe(UrlDetectionEntity.DEFAULT_FALLBACK_URL)
    })

    it('should handle null values in environment defaults', () => {
      const requestUrl = 'https://example.com/test'

      const entity = UrlDetectionEntity.withEnvironmentDefaults(requestUrl, null, null)

      expect(entity.options.ngrokUrl).toBeNull()
      expect(entity.options.publicAppUrl).toBeNull()
    })
  })

  describe('edge cases and special scenarios', () => {
    it('should handle empty components gracefully', () => {
      const entity = new UrlDetectionEntity({
        requestUrl: 'http://localhost:3000',
        ...EDGE_CASE_DATA.emptyComponents
      })

      const parsed = entity.parseRequestUrl()
      expect(parsed.hostname).toBe('localhost') // from valid requestUrl
    })

    it('should handle extremely long URLs', () => {
      const entity = new UrlDetectionEntity(EDGE_CASE_DATA.longUrl)
      const validation = entity.validateRequest()

      expect(validation.valid).toBe(true)
    })

    it('should handle special characters in hostname', () => {
      const entity = UrlDetectionEntity.fromRequestUrl('http://xn--n3h.com/api')
      const parsed = entity.parseRequestUrl()

      expect(parsed.hostname).toBe('xn--n3h.com')
    })

    SPECIAL_HOSTNAME_CASES.forEach(testCase => {
      it(`should handle special hostname ${testCase.hostname}`, () => {
        const protocol = testCase.expected.startsWith('https') ? 'https:' : 'http:'
        const entity = UrlDetectionEntity.fromRequestUrl('http://localhost')
        const url = entity.buildUrlFromComponents(protocol, testCase.hostname, testCase.port)

        expect(url).toBe(testCase.expected)
      })
    })

    it('should handle boundary value ports', () => {
      const entity = UrlDetectionEntity.fromRequestUrl('http://localhost')
      const { standardPorts, commonNonStandardPorts } = EDGE_CASE_DATA.boundaryValues

      standardPorts.forEach(port => {
        expect(entity.isStandardPort('http:', port === '80' ? port : '')).toBe(true)
        expect(entity.isStandardPort('https:', port === '443' ? port : '')).toBe(true)
      })

      commonNonStandardPorts.forEach(port => {
        expect(entity.isStandardPort('http:', port)).toBe(false)
        expect(entity.isStandardPort('https:', port)).toBe(false)
      })
    })
  })

  describe('constants', () => {
    it('should have correct constant values', () => {
      expect(UrlDetectionEntity.STANDARD_HTTP_PORT).toBe('80')
      expect(UrlDetectionEntity.STANDARD_HTTPS_PORT).toBe('443')
      expect(UrlDetectionEntity.DEFAULT_FALLBACK_URL).toBe('http://localhost:3000')
    })

    it('should have working regex patterns', () => {
      expect(UrlDetectionEntity.NGROK_DOMAIN_PATTERN.test('test.ngrok.io')).toBe(true)
      expect(UrlDetectionEntity.NGROK_DOMAIN_PATTERN.test('example.com')).toBe(false)

      expect(UrlDetectionEntity.LOCALHOST_PATTERN.test('localhost')).toBe(true)
      expect(UrlDetectionEntity.LOCALHOST_PATTERN.test('127.0.0.1')).toBe(true)
      expect(UrlDetectionEntity.LOCALHOST_PATTERN.test('::1')).toBe(true)
      expect(UrlDetectionEntity.LOCALHOST_PATTERN.test('example.com')).toBe(false)
    })
  })
})
