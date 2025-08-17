/**
 * @jest-environment node
 */

/**
 * App URL Detection API routes unit tests
 * Dependency Injection version tests
 */

import { NextRequest } from 'next/server'
import { MockNextRequest } from '@/__tests__/utils/typeHelpers'
import { createAppUrlDetectionHandlers } from '@/lib/factories/HandlerFactory'
import { TestContainer } from '@/lib/containers/TestContainer'

// Mock the production container import
jest.mock('@/lib/containers/ProductionContainer')

describe('/api/app-url API Routes', () => {
  let container: TestContainer
  let mockRequest: MockNextRequest
  let handlers: { GET: any }

  beforeEach(() => {
    // Create test container
    container = new TestContainer()

    // Create handlers with test container
    handlers = createAppUrlDetectionHandlers(container)

    // Mock request with URL structure
    const url = new URL('http://localhost:3000/api/app-url')
    mockRequest = {
      url: 'http://localhost:3000/api/app-url',
      nextUrl: url
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/app-url', () => {
    it('should detect app URL successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          appUrl: 'http://localhost:3000',
          protocol: 'http:',
          hostname: 'localhost',
          port: '3000'
        }
      }

      container.updateServiceMock('urlDetectionService', {
        detectAppUrlSimple: jest.fn().mockResolvedValue(mockResponse)
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(container.services.urlDetectionService.detectAppUrlSimple).toHaveBeenCalledWith(
        mockRequest.url,
        {
          protocol: mockRequest.nextUrl?.protocol,
          hostname: mockRequest.nextUrl?.hostname,
          port: mockRequest.nextUrl?.port
        }
      )
      expect(response.status).toBe(200)
      expect(responseBody).toEqual(mockResponse.data)
    })

    it('should detect HTTPS URL', async () => {
      const httpsUrl = new URL('https://example.com/api/app-url')
      mockRequest.url = 'https://example.com/api/app-url'
      mockRequest.nextUrl = httpsUrl

      const mockResponse = {
        success: true,
        data: {
          appUrl: 'https://example.com',
          protocol: 'https:',
          hostname: 'example.com',
          port: ''
        }
      }

      container.updateServiceMock('urlDetectionService', {
        detectAppUrlSimple: jest.fn().mockResolvedValue(mockResponse)
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual(mockResponse.data)
    })

    it('should detect ngrok URL', async () => {
      const ngrokUrl = new URL('https://abc123.ngrok-free.app/api/app-url')
      mockRequest.url = 'https://abc123.ngrok-free.app/api/app-url'
      mockRequest.nextUrl = ngrokUrl

      const mockResponse = {
        success: true,
        data: {
          appUrl: 'https://abc123.ngrok-free.app',
          protocol: 'https:',
          hostname: 'abc123.ngrok-free.app',
          port: '',
          isNgrok: true
        }
      }

      container.updateServiceMock('urlDetectionService', {
        detectAppUrlSimple: jest.fn().mockResolvedValue(mockResponse)
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual(mockResponse.data)
    })

    it('should handle service errors', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Failed to detect app URL',
        statusCode: 500
      }

      container.updateServiceMock('urlDetectionService', {
        detectAppUrlSimple: jest.fn().mockResolvedValue(mockErrorResponse)
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Failed to detect app URL' })
    })

    it('should handle service errors without status code', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Unknown URL detection error'
      }

      container.updateServiceMock('urlDetectionService', {
        detectAppUrlSimple: jest.fn().mockResolvedValue(mockErrorResponse)
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Unknown URL detection error' })
    })

    it('should handle unexpected errors', async () => {
      container.updateServiceMock('urlDetectionService', {
        detectAppUrlSimple: jest.fn().mockRejectedValue(new Error('Unexpected error'))
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Failed to detect app URL' })
    })

    it('should handle URL with custom port', async () => {
      const customPortUrl = new URL('http://localhost:8080/api/app-url')
      mockRequest.url = 'http://localhost:8080/api/app-url'
      mockRequest.nextUrl = customPortUrl

      const mockResponse = {
        success: true,
        data: {
          appUrl: 'http://localhost:8080',
          protocol: 'http:',
          hostname: 'localhost',
          port: '8080'
        }
      }

      container.updateServiceMock('urlDetectionService', {
        detectAppUrlSimple: jest.fn().mockResolvedValue(mockResponse)
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual(mockResponse.data)
      expect(container.services.urlDetectionService.detectAppUrlSimple).toHaveBeenCalledWith(
        mockRequest.url,
        {
          protocol: 'http:',
          hostname: 'localhost',
          port: '8080'
        }
      )
    })
  })

  describe('Dependency Injection compliance', () => {
    it('should use test container for all dependencies', async () => {
      await handlers.GET(mockRequest)

      expect(container.services.urlDetectionService.detectAppUrlSimple).toHaveBeenCalled()
    })

    it('should allow mock updates for testing different scenarios', async () => {
      const customResponse = {
        success: true,
        data: { appUrl: 'https://custom-domain.com', protocol: 'https:', hostname: 'custom-domain.com', port: '' }
      }

      container.updateServiceMock('urlDetectionService', {
        detectAppUrlSimple: jest.fn().mockResolvedValue(customResponse)
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(responseBody).toEqual(customResponse.data)
    })
  })
})
