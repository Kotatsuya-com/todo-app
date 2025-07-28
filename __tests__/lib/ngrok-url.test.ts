/**
 * @jest-environment node
 */
import fs from 'fs'
import path from 'path'
import { getNgrokUrl, getAppBaseUrl } from '@/lib/ngrok-url'

// Mock fs module
jest.mock('fs')
jest.mock('path')
jest.mock('@/lib/logger', () => ({
  apiLogger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }
}))

const mockFs = fs as jest.Mocked<typeof fs>
const mockPath = path as jest.Mocked<typeof path>

describe('ngrok-url.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    delete process.env.NEXT_PUBLIC_APP_URL
  })

  describe('getNgrokUrl', () => {
    it('should read APP_URL from .env.runtime file when it exists', () => {
      const mockEnvContent = 'APP_URL=https://abc123.ngrok.io\nOTHER_VAR=value'
      
      mockPath.join.mockReturnValue('/mock/project/.env.runtime')
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(mockEnvContent)

      const result = getNgrokUrl()

      expect(result).toBe('https://abc123.ngrok.io')
      expect(mockPath.join).toHaveBeenCalledWith(process.cwd(), '.env.runtime')
      expect(mockFs.existsSync).toHaveBeenCalledWith('/mock/project/.env.runtime')
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/mock/project/.env.runtime', 'utf8')
    })

    it('should handle APP_URL with whitespace', () => {
      const mockEnvContent = 'APP_URL=  https://abc123.ngrok.io  \n'
      
      mockPath.join.mockReturnValue('/mock/project/.env.runtime')
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(mockEnvContent)

      const result = getNgrokUrl()

      expect(result).toBe('https://abc123.ngrok.io')
    })

    it('should fallback to .ngrok-url file when .env.runtime does not exist', () => {
      const mockNgrokContent = 'https://def456.ngrok.io'
      
      mockPath.join
        .mockReturnValueOnce('/mock/project/.env.runtime')
        .mockReturnValueOnce('/mock/project/.ngrok-url')
      
      mockFs.existsSync
        .mockReturnValueOnce(false) // .env.runtime doesn't exist
        .mockReturnValueOnce(true)  // .ngrok-url exists
      
      mockFs.readFileSync.mockReturnValue(mockNgrokContent)

      const result = getNgrokUrl()

      expect(result).toBe('https://def456.ngrok.io')
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/mock/project/.ngrok-url', 'utf8')
    })

    it('should fallback to .ngrok-url file when APP_URL is not found in .env.runtime', () => {
      const mockEnvContent = 'OTHER_VAR=value\nANOTHER_VAR=test'
      const mockNgrokContent = 'https://fallback.ngrok.io'
      
      mockPath.join
        .mockReturnValueOnce('/mock/project/.env.runtime')
        .mockReturnValueOnce('/mock/project/.ngrok-url')
      
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync
        .mockReturnValueOnce(mockEnvContent)   // .env.runtime
        .mockReturnValueOnce(mockNgrokContent) // .ngrok-url

      const result = getNgrokUrl()

      expect(result).toBe('https://fallback.ngrok.io')
    })

    it('should return null when neither file exists', () => {
      mockPath.join.mockReturnValue('/mock/project/.env.runtime')
      mockFs.existsSync.mockReturnValue(false)

      const result = getNgrokUrl()

      expect(result).toBeNull()
    })

    it('should return null and log error when file reading fails', () => {
      const mockError = new Error('Permission denied')
      
      mockPath.join.mockReturnValue('/mock/project/.env.runtime')
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockImplementation(() => {
        throw mockError
      })

      const result = getNgrokUrl()

      expect(result).toBeNull()
      
      const { apiLogger } = require('@/lib/logger')
      expect(apiLogger.error).toHaveBeenCalledWith(
        { error: mockError }, 
        'Failed to read ngrok URL'
      )
    })

    it('should handle empty APP_URL match', () => {
      const mockEnvContent = 'APP_URL=\nOTHER_VAR=value'
      const mockNgrokContent = 'https://backup.ngrok.io'
      
      mockPath.join
        .mockReturnValueOnce('/mock/project/.env.runtime')
        .mockReturnValueOnce('/mock/project/.ngrok-url')
      
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync
        .mockReturnValueOnce(mockEnvContent)
        .mockReturnValueOnce(mockNgrokContent)

      const result = getNgrokUrl()

      expect(result).toBe('https://backup.ngrok.io')
    })
  })

  describe('getAppBaseUrl', () => {
    it('should return ngrok URL when available', () => {
      const mockEnvContent = 'APP_URL=https://ngrok-test.ngrok.io'
      
      mockPath.join.mockReturnValue('/mock/project/.env.runtime')
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(mockEnvContent)

      const result = getAppBaseUrl()

      expect(result).toBe('https://ngrok-test.ngrok.io')
    })

    it('should return NEXT_PUBLIC_APP_URL when ngrok URL is not available', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.vercel.app'
      
      mockPath.join.mockReturnValue('/mock/project/.env.runtime')
      mockFs.existsSync.mockReturnValue(false)

      const result = getAppBaseUrl()

      expect(result).toBe('https://myapp.vercel.app')
    })

    it('should extract origin from request URL when environment variables are not available', () => {
      const mockRequest = {
        url: 'https://example.com/api/test?param=value'
      } as Request

      mockPath.join.mockReturnValue('/mock/project/.env.runtime')
      mockFs.existsSync.mockReturnValue(false)
      delete process.env.NEXT_PUBLIC_APP_URL

      const result = getAppBaseUrl(mockRequest)

      expect(result).toBe('https://example.com')
    })

    it('should return default localhost when no options are available', () => {
      mockPath.join.mockReturnValue('/mock/project/.env.runtime')
      mockFs.existsSync.mockReturnValue(false)
      delete process.env.NEXT_PUBLIC_APP_URL

      const result = getAppBaseUrl()

      expect(result).toBe('http://localhost:3000')
    })

    it('should prioritize ngrok URL over environment variable', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://production.com'
      const mockEnvContent = 'APP_URL=https://dev.ngrok.io'
      
      mockPath.join.mockReturnValue('/mock/project/.env.runtime')
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(mockEnvContent)

      const result = getAppBaseUrl()

      expect(result).toBe('https://dev.ngrok.io')
    })

    it('should handle complex request URLs correctly', () => {
      const mockRequest = {
        url: 'https://subdomain.example.com:3000/api/webhooks/slack?id=123&timestamp=456'
      } as Request

      mockPath.join.mockReturnValue('/mock/project/.env.runtime')
      mockFs.existsSync.mockReturnValue(false)

      const result = getAppBaseUrl(mockRequest)

      expect(result).toBe('https://subdomain.example.com:3000')
    })
  })
})