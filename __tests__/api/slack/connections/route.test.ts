/**
 * @jest-environment node
 */

import { GET, DELETE } from '@/app/api/slack/connections/route'
import { SlackConnectionService } from '@/lib/services/SlackConnectionService'
import { requireAuthentication } from '@/lib/auth/authentication'
import { createServices } from '@/lib/services/ServiceFactory'
import {
  createMockNextRequest,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from '@/__tests__/mocks'
import {
  createMockSlackConnection,
  createMockMultipleSlackConnections
} from '@/__tests__/fixtures/slack-connection.fixture'

// Mock dependencies
jest.mock('@/lib/auth/authentication')
jest.mock('@/lib/services/ServiceFactory')
jest.mock('@/lib/logger', () => ({
  slackLogger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}))

const mockRequireAuthentication = requireAuthentication as jest.MockedFunction<typeof requireAuthentication>
const mockCreateServices = createServices as jest.MockedFunction<typeof createServices>

describe('/api/slack/connections - Clean Architecture', () => {
  let mockSlackConnectionService: jest.Mocked<SlackConnectionService>

  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()

    // Create mock service
    mockSlackConnectionService = {
      getUserConnections: jest.fn(),
      deleteUserConnection: jest.fn(),
      validateConnectionOwnership: jest.fn(),
      getConnection: jest.fn(),
      hasWorkspaceConnection: jest.fn(),
      getConnectionStats: jest.fn(),
    } as any

    // Mock createServices to return our mock service
    mockCreateServices.mockReturnValue({
      slackConnectionService: mockSlackConnectionService,
    } as any)
  })

  afterEach(() => {
    cleanupTestEnvironment()
    jest.clearAllMocks()
  })

  describe('GET /api/slack/connections', () => {
    it('should return connections successfully for authenticated user', async () => {
      const userId = 'user-123'
      const mockConnections = createMockMultipleSlackConnections()
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackConnectionService.getUserConnections.mockResolvedValue({
        success: true,
        data: {
          connections: mockConnections,
          totalCount: 3,
          workspaceNames: ['Workspace 1', 'Workspace 2', 'Workspace 3'],
          hasActiveConnections: true
        }
      })

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.connections).toEqual(mockConnections)
      expect(mockRequireAuthentication).toHaveBeenCalledWith(request)
      expect(mockSlackConnectionService.getUserConnections).toHaveBeenCalledWith(userId)
    })

    it('should return empty connections array when user has no connections', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackConnectionService.getUserConnections.mockResolvedValue({
        success: true,
        data: {
          connections: [],
          totalCount: 0,
          workspaceNames: [],
          hasActiveConnections: false
        }
      })

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.connections).toEqual([])
    })

    it('should return 401 when authentication fails', async () => {
      mockRequireAuthentication.mockRejectedValue(new Error('Authentication failed'))

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication failed')
      expect(mockSlackConnectionService.getUserConnections).not.toHaveBeenCalled()
    })

    it('should return 500 when service returns error', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackConnectionService.getUserConnections.mockResolvedValue({
        success: false,
        error: 'Failed to fetch connections',
        statusCode: 500
      })

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch connections')
    })

    it('should handle service error without status code', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackConnectionService.getUserConnections.mockResolvedValue({
        success: false,
        error: 'Database error'
      })

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database error')
    })

    it('should handle unexpected errors gracefully', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackConnectionService.getUserConnections.mockRejectedValue(new Error('Unexpected error'))

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Unexpected error')
    })

    it('should handle authentication error containing "Authentication"', async () => {
      mockRequireAuthentication.mockRejectedValue(new Error('Authentication token invalid'))

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication token invalid')
    })

    it('should handle non-Authentication errors as 500', async () => {
      mockRequireAuthentication.mockRejectedValue(new Error('Database connection failed'))

      const request = createMockNextRequest({ method: 'GET' })
      const response = await GET(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database connection failed')
    })
  })

  describe('DELETE /api/slack/connections', () => {
    it('should delete connection successfully for authorized user', async () => {
      const userId = 'user-123'
      const connectionId = 'conn-123'
      const mockConnection = createMockSlackConnection()
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackConnectionService.deleteUserConnection.mockResolvedValue({
        success: true,
        data: {
          success: true,
          message: 'Successfully deleted connection to Test Workspace',
          deletedConnection: mockConnection
        }
      })

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId }
      })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockRequireAuthentication).toHaveBeenCalledWith(request)
      expect(mockSlackConnectionService.deleteUserConnection).toHaveBeenCalledWith(connectionId, userId)
    })

    it('should return 400 when connectionId is missing', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)

      const request = createMockNextRequest({
        method: 'DELETE',
        body: {}
      })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Connection ID is required')
      expect(mockSlackConnectionService.deleteUserConnection).not.toHaveBeenCalled()
    })

    it('should return 401 when authentication fails', async () => {
      mockRequireAuthentication.mockRejectedValue(new Error('Authentication failed'))

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId: 'conn-123' }
      })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication failed')
      expect(mockSlackConnectionService.deleteUserConnection).not.toHaveBeenCalled()
    })

    it('should return 404 when connection not found', async () => {
      const userId = 'user-123'
      const connectionId = 'non-existent-conn'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackConnectionService.deleteUserConnection.mockResolvedValue({
        success: false,
        error: 'Connection not found',
        statusCode: 404
      })

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId }
      })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Connection not found')
    })

    it('should return 403 when user not authorized to delete connection', async () => {
      const userId = 'user-123'
      const connectionId = 'conn-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackConnectionService.deleteUserConnection.mockResolvedValue({
        success: false,
        error: 'Unauthorized - connection belongs to different user',
        statusCode: 403
      })

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId }
      })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unauthorized - connection belongs to different user')
    })

    it('should return 500 when service returns error', async () => {
      const userId = 'user-123'
      const connectionId = 'conn-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackConnectionService.deleteUserConnection.mockResolvedValue({
        success: false,
        error: 'Failed to delete connection',
        statusCode: 500
      })

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId }
      })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete connection')
    })

    it('should handle service error without status code', async () => {
      const userId = 'user-123'
      const connectionId = 'conn-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackConnectionService.deleteUserConnection.mockResolvedValue({
        success: false,
        error: 'Database error'
      })

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId }
      })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database error')
    })

    it('should handle JSON parsing error', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId: 'conn-123' }
      })
      
      // Mock JSON parsing to fail
      request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Invalid JSON')
    })

    it('should handle unexpected errors gracefully', async () => {
      const userId = 'user-123'
      const connectionId = 'conn-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackConnectionService.deleteUserConnection.mockRejectedValue(new Error('Unexpected error'))

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId }
      })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Unexpected error')
    })

    it('should handle authentication error containing "Authentication"', async () => {
      mockRequireAuthentication.mockRejectedValue(new Error('Authentication token expired'))

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId: 'conn-123' }
      })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication token expired')
    })

    it('should handle non-Authentication errors as 500', async () => {
      mockRequireAuthentication.mockRejectedValue(new Error('Server overloaded'))

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId: 'conn-123' }
      })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Server overloaded')
    })
  })

  describe('Service Factory Integration', () => {
    it('should create services correctly', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackConnectionService.getUserConnections.mockResolvedValue({
        success: true,
        data: {
          connections: [],
          totalCount: 0,
          workspaceNames: [],
          hasActiveConnections: false
        }
      })

      const request = createMockNextRequest({ method: 'GET' })
      await GET(request as any)

      expect(mockCreateServices).toHaveBeenCalledTimes(1)
      expect(mockCreateServices).toHaveBeenCalledWith()
    })

    it('should use slackConnectionService from factory', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackConnectionService.getUserConnections.mockResolvedValue({
        success: true,
        data: {
          connections: [],
          totalCount: 0,
          workspaceNames: [],
          hasActiveConnections: false
        }
      })

      const request = createMockNextRequest({ method: 'GET' })
      await GET(request as any)

      // Verify that the service from the factory was used
      expect(mockSlackConnectionService.getUserConnections).toHaveBeenCalledWith(userId)
    })
  })

  describe('Error Response Format Consistency', () => {
    it('should return consistent error format for authentication errors', async () => {
      mockRequireAuthentication.mockRejectedValue(new Error('Token missing'))

      const getRequest = createMockNextRequest({ method: 'GET' })
      const getResponse = await GET(getRequest as any)
      const getData = await getResponse.json()

      const deleteRequest = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId: 'conn-123' }
      })
      const deleteResponse = await DELETE(deleteRequest as any)
      const deleteData = await deleteResponse.json()

      expect(getResponse.status).toBe(deleteResponse.status)
      expect(getData.error).toBe(deleteData.error)
    })

    it('should return consistent error format for service errors', async () => {
      const userId = 'user-123'
      const errorMessage = 'Service unavailable'
      
      mockRequireAuthentication.mockResolvedValue(userId)
      mockSlackConnectionService.getUserConnections.mockResolvedValue({
        success: false,
        error: errorMessage,
        statusCode: 503
      })
      mockSlackConnectionService.deleteUserConnection.mockResolvedValue({
        success: false,
        error: errorMessage,
        statusCode: 503
      })

      const getRequest = createMockNextRequest({ method: 'GET' })
      const getResponse = await GET(getRequest as any)
      const getData = await getResponse.json()

      const deleteRequest = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId: 'conn-123' }
      })
      const deleteResponse = await DELETE(deleteRequest as any)
      const deleteData = await deleteResponse.json()

      expect(getResponse.status).toBe(deleteResponse.status)
      expect(getData.error).toBe(deleteData.error)
    })
  })

  describe('Request Parameter Validation', () => {
    it('should handle empty connectionId in DELETE request', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId: '' }
      })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Connection ID is required')
    })

    it('should handle null connectionId in DELETE request', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId: null }
      })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Connection ID is required')
    })

    it('should handle undefined connectionId in DELETE request', async () => {
      const userId = 'user-123'
      
      mockRequireAuthentication.mockResolvedValue(userId)

      const request = createMockNextRequest({
        method: 'DELETE',
        body: { connectionId: undefined }
      })
      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Connection ID is required')
    })
  })
})