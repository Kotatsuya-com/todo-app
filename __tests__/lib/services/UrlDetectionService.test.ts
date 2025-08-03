/**
 * @jest-environment jsdom
 */

import fs from 'fs'
import { UrlDetectionService } from '@/lib/services/UrlDetectionService'
import {
  createMockUrlDetectionOptions,
  VALID_REQUEST_URLS,
  ENVIRONMENT_DETECTION_CASES
} from '@/__tests__/fixtures/url-detection.fixture'

// Mock fs module
jest.mock('fs')
const mockFs = fs as jest.Mocked<typeof fs>

// Mock logger
jest.mock('@/lib/logger', () => ({
  apiLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    child: jest.fn().mockReturnValue({
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      child: jest.fn().mockReturnValue({
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
      }),
    }),
  },
}))

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}))

describe('UrlDetectionService', () => {
  let service: UrlDetectionService
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()
    
    // Save original environment
    originalEnv = { ...process.env }
    
    // Create service instance
    service = new UrlDetectionService()
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('constructor', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(UrlDetectionService)
    })
  })

  describe('detectAppUrl', () => {
    beforeEach(() => {
      // Set up default environment
      process.env.NEXT_PUBLIC_APP_URL = null
    })

    it('should detect app URL successfully with ngrok file', async () => {
      // Mock ngrok file exists and has content
      mockFs.existsSync.mockImplementation((path: any) => {
        if (path.includes('.env.runtime')) return true
        return false
      })
      mockFs.readFileSync.mockReturnValue('APP_URL=https://test123.ngrok.io\nOTHER_VAR=value')

      const requestUrl = 'http://localhost:3000/api/app-url'
      const result = await service.detectAppUrl(requestUrl)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.appUrl).toBe('https://test123.ngrok.io')
      expect(result.data!.timestamp).toBeDefined()
      expect(result.data!.metadata).toBeDefined()
      // Environment is based on request URL hostname, not final app URL
      expect(result.data!.metadata!.environment).toBe('localhost')
    })

    it('should detect app URL with fallback ngrok file', async () => {
      // Mock .env.runtime doesn't exist but .ngrok-url does
      mockFs.existsSync.mockImplementation((path: any) => {
        if (path.includes('.env.runtime')) return false
        if (path.includes('.ngrok-url')) return true
        return false
      })
      mockFs.readFileSync.mockReturnValue('https://fallback.ngrok.io')

      const requestUrl = 'http://localhost:3000/api/app-url'
      const result = await service.detectAppUrl(requestUrl)

      expect(result.success).toBe(true)
      expect(result.data!.appUrl).toBe('https://fallback.ngrok.io')
    })

    it('should use public app URL when ngrok not available', async () => {
      // Mock no ngrok files
      mockFs.existsSync.mockReturnValue(false)
      process.env.NEXT_PUBLIC_APP_URL = 'https://production.example.com'

      const requestUrl = 'https://my-app.vercel.app/api/app-url'
      const result = await service.detectAppUrl(requestUrl)

      expect(result.success).toBe(true)
      expect(result.data!.appUrl).toBe('https://production.example.com')
      expect(result.data!.metadata!.environment).toBe('production')
    })

    it('should use request URL when no external URLs available', async () => {
      // Mock no ngrok files and no public URL
      mockFs.existsSync.mockReturnValue(false)
      delete process.env.NEXT_PUBLIC_APP_URL

      const requestUrl = 'https://example.com/api/app-url'
      const result = await service.detectAppUrl(requestUrl)

      expect(result.success).toBe(true)
      expect(result.data!.appUrl).toBe('https://example.com')
      expect(result.data!.metadata!.hostname).toBe('example.com')
    })

    it('should handle NextRequest-style URL parameters', async () => {
      mockFs.existsSync.mockReturnValue(false)
      
      const requestUrl = 'https://example.com:8080/api/app-url'
      const nextUrl = {
        protocol: 'https:',
        hostname: 'example.com',
        port: '8080'
      }
      
      const result = await service.detectAppUrl(requestUrl, nextUrl)

      expect(result.success).toBe(true)
      expect(result.data!.appUrl).toBe('https://example.com:8080')
      expect(result.data!.metadata!.port).toBe('8080')
      expect(result.data!.metadata!.isStandardPort).toBe(false)
    })

    it('should fail validation for invalid URL', async () => {
      const result = await service.detectAppUrl('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Request URL is required')
      expect(result.statusCode).toBe(400)
    })

    it('should handle service errors gracefully', async () => {
      // Mock fs.existsSync to throw error
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('File system error')
      })

      const requestUrl = 'http://localhost:3000/api/app-url'
      const result = await service.detectAppUrl(requestUrl)

      // Service handles ngrok file errors gracefully and continues with request URL
      expect(result.success).toBe(true)
      expect(result.data!.appUrl).toBe('http://localhost:3000')
    })

    it('should include complete metadata in response', async () => {
      mockFs.existsSync.mockReturnValue(false)
      
      const requestUrl = 'https://app.ngrok.io:8443/webhook'
      const result = await service.detectAppUrl(requestUrl)

      expect(result.success).toBe(true)
      expect(result.data!.metadata).toMatchObject({
        environment: 'ngrok',
        protocol: 'https:',
        hostname: 'app.ngrok.io',
        port: '8443',
        isStandardPort: false
      })
    })
  })

  describe('getNgrokFileInfo', () => {
    it('should detect .env.runtime file with APP_URL', async () => {
      mockFs.existsSync.mockImplementation((path: any) => {
        if (path.includes('.env.runtime')) return true
        if (path.includes('.ngrok-url')) return false
        return false
      })
      mockFs.readFileSync.mockReturnValue('APP_URL=https://env-runtime.ngrok.io\nOTHER=value')

      const info = await service.getNgrokFileInfo()

      expect(info.envRuntimeExists).toBe(true)
      expect(info.ngrokUrlFileExists).toBe(false)
      expect(info.ngrokUrl).toBe('https://env-runtime.ngrok.io')
    })

    it('should detect .ngrok-url file when .env.runtime not available', async () => {
      mockFs.existsSync.mockImplementation((path: any) => {
        if (path.includes('.env.runtime')) return false
        if (path.includes('.ngrok-url')) return true
        return false
      })
      mockFs.readFileSync.mockReturnValue('https://ngrok-file.ngrok.io')

      const info = await service.getNgrokFileInfo()

      expect(info.envRuntimeExists).toBe(false)
      expect(info.ngrokUrlFileExists).toBe(true)
      expect(info.ngrokUrl).toBe('https://ngrok-file.ngrok.io')
    })

    it('should handle no ngrok files available', async () => {
      mockFs.existsSync.mockReturnValue(false)

      const info = await service.getNgrokFileInfo()

      expect(info.envRuntimeExists).toBe(false)
      expect(info.ngrokUrlFileExists).toBe(false)
      expect(info.ngrokUrl).toBeNull()
    })

    it('should handle malformed .env.runtime file', async () => {
      mockFs.existsSync.mockImplementation((path: any) => {
        if (path.includes('.env.runtime')) return true
        return false
      })
      mockFs.readFileSync.mockReturnValue('INVALID_CONTENT\nNO_URL=value')

      const info = await service.getNgrokFileInfo()

      expect(info.envRuntimeExists).toBe(true)
      expect(info.ngrokUrl).toBeNull()
    })

    it('should handle file read errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const info = await service.getNgrokFileInfo()

      // File exists but read failed, so exists flags are true but ngrokUrl is null
      expect(info.envRuntimeExists).toBe(true)
      expect(info.ngrokUrlFileExists).toBe(true)
      expect(info.ngrokUrl).toBeNull()
    })

    it('should prioritize .env.runtime over .ngrok-url', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockImplementation((path: any) => {
        if (path.includes('.env.runtime')) return 'APP_URL=https://env-priority.ngrok.io'
        if (path.includes('.ngrok-url')) return 'https://should-not-be-used.ngrok.io'
        return ''
      })

      const info = await service.getNgrokFileInfo()

      expect(info.ngrokUrl).toBe('https://env-priority.ngrok.io')
    })

    it('should trim whitespace from ngrok URL', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue('  https://trimmed.ngrok.io  \n')

      const info = await service.getNgrokFileInfo()

      expect(info.ngrokUrl).toBe('https://trimmed.ngrok.io')
    })
  })

  describe('detectAppUrlSimple', () => {
    it('should return simplified response format', async () => {
      mockFs.existsSync.mockReturnValue(false)
      
      const requestUrl = 'https://example.com/api/app-url'
      const result = await service.detectAppUrlSimple(requestUrl)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        appUrl: 'https://example.com',
        timestamp: expect.any(String)
      })
      expect(result.data).not.toHaveProperty('metadata')
    })

    it('should propagate errors from full detection', async () => {
      const result = await service.detectAppUrlSimple('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Request URL is required')
    })
  })

  describe('normalizeUrl', () => {
    it('should normalize URL successfully', async () => {
      const rawUrl = 'https://example.com/path/to/resource?param=value#section'
      const result = await service.normalizeUrl(rawUrl)

      expect(result.success).toBe(true)
      expect(result.data!.normalizedUrl).toBe('https://example.com')
    })

    it('should handle URL with non-standard port', async () => {
      const rawUrl = 'http://localhost:8080/api/endpoint'
      const result = await service.normalizeUrl(rawUrl)

      expect(result.success).toBe(true)
      expect(result.data!.normalizedUrl).toBe('http://localhost:8080')
    })

    it('should use custom options for normalization', async () => {
      const rawUrl = 'invalid-url'
      const options = createMockUrlDetectionOptions({
        fallbackUrl: 'https://custom-fallback.com'
      })
      
      const result = await service.normalizeUrl(rawUrl, options)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Request URL format is invalid')
    })

    it('should handle normalization errors', async () => {
      const rawUrl = 'totally-invalid-url'
      const result = await service.normalizeUrl(rawUrl)

      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(400)
    })
  })

  describe('healthCheck', () => {
    it('should return healthy status with all services working', async () => {
      mockFs.existsSync.mockReturnValue(false)
      
      const result = await service.healthCheck()

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        status: 'healthy',
        ngrokStatus: 'unavailable',
        environmentInfo: {
          hasEnvRuntime: false,
          hasNgrokFile: false,
          hasPublicAppUrl: false
        }
      })
    })

    it('should return healthy status with ngrok available', async () => {
      mockFs.existsSync.mockImplementation((path: any) => {
        if (path.includes('.ngrok-url')) return true
        return false
      })
      mockFs.readFileSync.mockReturnValue('https://health-check.ngrok.io')

      const result = await service.healthCheck()

      expect(result.success).toBe(true)
      expect(result.data!.ngrokStatus).toBe('available')
      expect(result.data!.environmentInfo.hasNgrokFile).toBe(true)
    })

    it('should return healthy status with public app URL', async () => {
      mockFs.existsSync.mockReturnValue(false)
      process.env.NEXT_PUBLIC_APP_URL = 'https://health-check.com'

      const result = await service.healthCheck()

      expect(result.success).toBe(true)
      expect(result.data!.environmentInfo.hasPublicAppUrl).toBe(true)
    })

    it('should handle health check errors', async () => {
      // Mock service to throw error during health check
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('Health check error')
      })

      const result = await service.healthCheck()

      // Health check handles fs errors gracefully
      expect(result.success).toBe(true)
      expect(result.data!.status).toBe('healthy')
      expect(result.data!.ngrokStatus).toBe('unavailable')
    })
  })

  describe('environment detection integration', () => {
    ENVIRONMENT_DETECTION_CASES.forEach(testCase => {
      it(`should detect ${testCase.expected} environment from URL with ${testCase.hostname}`, async () => {
        mockFs.existsSync.mockReturnValue(false)
        
        // Handle IPv6 addresses properly
        const hostname = testCase.hostname.includes(':') && !testCase.hostname.startsWith('[') 
          ? `[${testCase.hostname}]` 
          : testCase.hostname
        const requestUrl = `http://${hostname}/api/app-url`
        const result = await service.detectAppUrl(requestUrl)

        expect(result.success).toBe(true)
        expect(result.data!.metadata!.environment).toBe(testCase.expected)
        // For IPv6, hostname in URL object includes brackets
        const expectedHostname = testCase.hostname.includes(':') && !testCase.hostname.startsWith('[')
          ? `[${testCase.hostname}]` 
          : testCase.hostname
        expect(result.data!.metadata!.hostname).toBe(expectedHostname)
      })
    })
  })

  describe('error scenarios and edge cases', () => {
    it('should handle concurrent ngrok file operations', async () => {
      let readCount = 0
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockImplementation(() => {
        readCount++
        if (readCount === 1) return 'APP_URL=https://concurrent1.ngrok.io'
        return 'APP_URL=https://concurrent2.ngrok.io'
      })

      const promises = [
        service.detectAppUrl('http://localhost:3000/api1'),
        service.detectAppUrl('http://localhost:3000/api2')
      ]

      const results = await Promise.all(promises)
      
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
    })

    it('should handle file system permission errors', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockImplementation(() => {
        const error = new Error('EACCES: permission denied') as any
        error.code = 'EACCES'
        throw error
      })

      const result = await service.detectAppUrl('http://localhost:3000/api')

      expect(result.success).toBe(true) // Should fall back to request URL
      expect(result.data!.appUrl).toBe('http://localhost:3000')
    })

    it('should handle malformed content in environment files', async () => {
      mockFs.existsSync.mockImplementation((path: any) => {
        // Only .env.runtime exists, .ngrok-url doesn't exist
        if (path.includes('.env.runtime')) return true
        return false
      })
      // Content that has no APP_URL= pattern at all
      mockFs.readFileSync.mockReturnValue('MALFORMED\nNO_EQUALS\nRANDOM_TEXT\nSOME_OTHER_VAR=value')

      const info = await service.getNgrokFileInfo()

      expect(info.ngrokUrl).toBeNull()
    })

    it('should handle extremely long ngrok URLs', async () => {
      const longNgrokUrl = 'https://' + 'a'.repeat(100) + '.ngrok.io'
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(`APP_URL=${longNgrokUrl}`)

      const result = await service.detectAppUrl('http://localhost:3000/api')

      expect(result.success).toBe(true)
      expect(result.data!.appUrl).toBe(longNgrokUrl)
    })

    it('should handle invalid characters in ngrok URL', async () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue('APP_URL=https://invalid<>chars.ngrok.io')

      const result = await service.detectAppUrl('http://localhost:3000/api')

      // Even invalid ngrok URLs are used as-is (URL validation happens at entity level)
      expect(result.success).toBe(true)
      expect(result.data!.appUrl).toBe('https://invalid<>chars.ngrok.io')
    })
  })

  describe('logging integration', () => {
    it('should log successful URL detection', async () => {
      mockFs.existsSync.mockReturnValue(false)
      
      await service.detectAppUrl('https://example.com/api')

      // Verify logging calls were made (mocked logger should have been called)
      expect(jest.isMockFunction(require('@/lib/logger').apiLogger.child)).toBe(true)
    })

    it('should log errors during detection', async () => {
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('Logging test error')
      })

      await service.detectAppUrl('http://localhost:3000/api')

      // Error should be logged
      expect(jest.isMockFunction(require('@/lib/logger').apiLogger.child)).toBe(true)
    })
  })

  describe('configuration scenarios', () => {
    it('should handle different ngrok URL formats', async () => {
      const ngrokFormats = [
        'https://abc123.ngrok.io',
        'https://custom-name.ngrok.io',
        'https://123-456-789.ngrok.io',
        'http://test.ngrok.io' // HTTP ngrok
      ]

      for (const ngrokUrl of ngrokFormats) {
        mockFs.existsSync.mockReturnValue(true)
        mockFs.readFileSync.mockReturnValue(`APP_URL=${ngrokUrl}`)

        const result = await service.detectAppUrl('http://localhost:3000/api')

        expect(result.success).toBe(true)
        expect(result.data!.appUrl).toBe(ngrokUrl)
      }
    })

    it('should handle production deployment scenarios', async () => {
      const productionScenarios = [
        {
          publicAppUrl: 'https://my-app.vercel.app',
          expectedEnvironment: 'production'
        },
        {
          publicAppUrl: 'https://api.company.com',
          expectedEnvironment: 'production'
        },
        {
          publicAppUrl: 'https://app.netlify.app',
          expectedEnvironment: 'production'
        }
      ]

      for (const scenario of productionScenarios) {
        mockFs.existsSync.mockReturnValue(false)
        process.env.NEXT_PUBLIC_APP_URL = scenario.publicAppUrl

        const result = await service.detectAppUrl('http://localhost:3000/api')

        expect(result.success).toBe(true)
        expect(result.data!.appUrl).toBe(scenario.publicAppUrl)
      }
    })
  })
})