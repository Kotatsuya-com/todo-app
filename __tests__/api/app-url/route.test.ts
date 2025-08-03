/**
 * @jest-environment node
 */

import { GET } from '@/app/api/app-url/route'
import { 
  createMockNextRequest,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from '@/__tests__/mocks'

// Mock UrlDetectionService
jest.mock('@/lib/services/UrlDetectionService', () => {
  return {
    UrlDetectionService: jest.fn().mockImplementation(() => ({
      detectAppUrlSimple: jest.fn()
    }))
  }
})

// Mock ServiceFactory
jest.mock('@/lib/services/ServiceFactory', () => ({
  createServices: jest.fn()
}))

import { UrlDetectionService } from '@/lib/services/UrlDetectionService'
import { createServices } from '@/lib/services/ServiceFactory'

const MockedUrlDetectionService = UrlDetectionService as jest.MockedClass<typeof UrlDetectionService>
const mockedCreateServices = createServices as jest.MockedFunction<typeof createServices>

describe('/api/app-url/route.ts - Clean Architecture', () => {
  let mockUrlDetectionService: jest.Mocked<UrlDetectionService>

  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()
    
    // Clear all mocks
    jest.clearAllMocks()
    
    // Create mock service instance
    mockUrlDetectionService = {
      detectAppUrlSimple: jest.fn()
    } as any
    
    // Mock ServiceFactory to return our mock service
    mockedCreateServices.mockReturnValue({
      urlDetectionService: mockUrlDetectionService
    } as any)
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('successful URL detection', () => {
    it('should return localhost URL', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: {
          appUrl: 'http://localhost:3000',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appUrl).toBe('http://localhost:3000')
      expect(data.timestamp).toBe('2024-01-01T00:00:00.000Z')
      expect(mockUrlDetectionService.detectAppUrlSimple).toHaveBeenCalledWith(
        'http://localhost:3000/api/app-url',
        {
          protocol: 'http:',
          hostname: 'localhost',
          port: '3000'
        }
      )
    })

    it('should return ngrok URL', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://abc123.ngrok.io/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: {
          appUrl: 'https://abc123.ngrok.io',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appUrl).toBe('https://abc123.ngrok.io')
      expect(mockUrlDetectionService.detectAppUrlSimple).toHaveBeenCalledWith(
        'https://abc123.ngrok.io/api/app-url',
        {
          protocol: 'https:',
          hostname: 'abc123.ngrok.io',
          port: ''
        }
      )
    })

    it('should return production Vercel URL', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://my-app.vercel.app/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: {
          appUrl: 'https://my-app.vercel.app',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appUrl).toBe('https://my-app.vercel.app')
    })

    it('should return custom domain URL', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://todoapp.example.com/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: {
          appUrl: 'https://todoapp.example.com',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appUrl).toBe('https://todoapp.example.com')
    })

    it('should handle URLs with non-standard ports', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:8080/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: {
          appUrl: 'http://localhost:8080',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appUrl).toBe('http://localhost:8080')
      expect(mockUrlDetectionService.detectAppUrlSimple).toHaveBeenCalledWith(
        'http://localhost:8080/api/app-url',
        {
          protocol: 'http:',
          hostname: 'localhost',
          port: '8080'
        }
      )
    })

    it('should handle IPv6 addresses', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://[::1]:3000/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: {
          appUrl: 'http://[::1]:3000',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appUrl).toBe('http://[::1]:3000')
    })

    it('should handle IP addresses', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://192.168.1.100:3000/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: {
          appUrl: 'http://192.168.1.100:3000',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appUrl).toBe('http://192.168.1.100:3000')
    })
  })

  describe('service error handling', () => {
    it('should handle validation errors from service', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: false,
        error: 'Request URL format is invalid',
        statusCode: 400
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Request URL format is invalid')
    })

    it('should handle service internal errors', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: false,
        error: 'Internal service error',
        statusCode: 500
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal service error')
    })

    it('should handle service errors without status code', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: false,
        error: 'Unknown error'
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Unknown error')
    })

    it('should handle service exceptions', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockRejectedValue(
        new Error('Service crashed')
      )

      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to detect app URL')
    })
  })

  describe('service method calls', () => {
    it('should call service with correct parameters for HTTP', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://example.com:8080/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: {
          appUrl: 'http://example.com:8080',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      })

      await GET(request as any)

      expect(mockUrlDetectionService.detectAppUrlSimple).toHaveBeenCalledWith(
        'http://example.com:8080/api/app-url',
        {
          protocol: 'http:',
          hostname: 'example.com',
          port: '8080'
        }
      )
    })

    it('should call service with correct parameters for HTTPS', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://secure.example.com/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: {
          appUrl: 'https://secure.example.com',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      })

      await GET(request as any)

      expect(mockUrlDetectionService.detectAppUrlSimple).toHaveBeenCalledWith(
        'https://secure.example.com/api/app-url',
        {
          protocol: 'https:',
          hostname: 'secure.example.com',
          port: ''
        }
      )
    })

    it('should call service once per request', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: {
          appUrl: 'http://localhost:3000',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      })

      await GET(request as any)

      expect(mockUrlDetectionService.detectAppUrlSimple).toHaveBeenCalledTimes(1)
    })

    it('should create services instance once per request', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: {
          appUrl: 'http://localhost:3000',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      })

      await GET(request as any)

      expect(mockedCreateServices).toHaveBeenCalledTimes(1)
    })
  })

  describe('response format', () => {
    it('should return correct JSON response format', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://example.com/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: {
          appUrl: 'https://example.com',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(data).toHaveProperty('appUrl')
      expect(data).toHaveProperty('timestamp')
      expect(typeof data.appUrl).toBe('string')
      expect(typeof data.timestamp).toBe('string')
    })

    it('should set correct Content-Type header', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://example.com/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: {
          appUrl: 'https://example.com',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      })

      const response = await GET(request as any)

      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should return error response format for failures', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: false,
        error: 'Test error',
        statusCode: 400
      })

      const response = await GET(request as any)
      const data = await response.json()

      expect(data).toHaveProperty('error')
      expect(data.error).toBe('Test error')
      expect(data).not.toHaveProperty('appUrl')
      expect(data).not.toHaveProperty('timestamp')
    })
  })

  describe('Clean Architecture integration', () => {
    it('should use UrlDetectionService from ServiceFactory', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: {
          appUrl: 'http://localhost:3000',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      })

      await GET(request as any)

      // Verify ServiceFactory was called to create services
      expect(mockedCreateServices).toHaveBeenCalled()
      
      // Verify the correct service method was called
      expect(mockUrlDetectionService.detectAppUrlSimple).toHaveBeenCalled()
    })

    it('should pass NextRequest URL components to service', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'https://custom.domain.com:9000/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: {
          appUrl: 'https://custom.domain.com:9000',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      })

      await GET(request as any)

      const callArgs = mockUrlDetectionService.detectAppUrlSimple.mock.calls[0]
      expect(callArgs[0]).toBe('https://custom.domain.com:9000/api/app-url')
      expect(callArgs[1]).toEqual({
        protocol: 'https:',
        hostname: 'custom.domain.com',
        port: '9000'
      })
    })

    it('should maintain API contract with service layer', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: {
          appUrl: 'http://localhost:3000',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      })

      const response = await GET(request as any)

      // API should only handle HTTP concerns
      expect(response.status).toBe(200)
      
      // Business logic should be delegated to service
      expect(mockUrlDetectionService.detectAppUrlSimple).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          protocol: expect.any(String),
          hostname: expect.any(String),
          port: expect.any(String)
        })
      )
    })
  })

  describe('edge cases', () => {
    it('should handle malformed nextUrl properties', async () => {
      const request = {
        url: 'http://localhost:3000/api/app-url',
        nextUrl: {
          protocol: undefined,
          hostname: undefined,
          port: undefined
        }
      } as any

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: {
          appUrl: 'http://localhost:3000',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appUrl).toBe('http://localhost:3000')
    })

    it('should handle service returning null data', async () => {
      const request = createMockNextRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/app-url',
      })

      mockUrlDetectionService.detectAppUrlSimple.mockResolvedValue({
        success: true,
        data: null as any
      })

      const response = await GET(request as any)

      expect(response.status).toBe(200)
      expect(await response.json()).toBeNull()
    })
  })
})