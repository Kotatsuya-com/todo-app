/**
 * @jest-environment node
 */

import { DELETE } from '@/app/api/slack/integration/disconnect/route'
import { 
  createMockNextRequest,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from '@/__tests__/mocks'

// Mock SlackDisconnectionService
jest.mock('@/lib/services/SlackDisconnectionService', () => {
  return {
    SlackDisconnectionService: jest.fn().mockImplementation(() => ({
      authenticateUser: jest.fn(),
      disconnectSlackIntegration: jest.fn()
    }))
  }
})

// Mock ServiceFactory
jest.mock('@/lib/services/ServiceFactory', () => ({
  createServices: jest.fn()
}))

import { SlackDisconnectionService } from '@/lib/services/SlackDisconnectionService'
import { createServices } from '@/lib/services/ServiceFactory'

const MockedSlackDisconnectionService = SlackDisconnectionService as jest.MockedClass<typeof SlackDisconnectionService>
const mockedCreateServices = createServices as jest.MockedFunction<typeof createServices>

describe('/api/slack/integration/disconnect/route.ts - Clean Architecture', () => {
  let mockSlackDisconnectionService: jest.Mocked<SlackDisconnectionService>

  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()
    jest.clearAllMocks()

    // Create mock service instance
    mockSlackDisconnectionService = {
      authenticateUser: jest.fn(),
      disconnectSlackIntegration: jest.fn(),
      verifyDisconnection: jest.fn(),
      healthCheck: jest.fn()
    } as any

    // Mock ServiceFactory to return our mock service
    mockedCreateServices.mockReturnValue({
      slackDisconnectionService: mockSlackDisconnectionService
    } as any)
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('successful disconnection', () => {
    it('should successfully disconnect Slack integration with connections', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: true,
        data: { id: 'user-123' }
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue({
        success: true,
        data: {
          message: 'Slack integration completely disconnected',
          disconnectedWorkspaces: ['Workspace 1', 'Workspace 2'],
          itemsRemoved: {
            connections: 2,
            webhooks: 2,
            userIdCleared: true
          }
        }
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Slack integration completely disconnected')
      expect(data.disconnectedWorkspaces).toEqual(['Workspace 1', 'Workspace 2'])
      expect(data.itemsRemoved).toEqual({
        connections: 2,
        webhooks: 2,
        userIdCleared: true
      })

      expect(mockSlackDisconnectionService.authenticateUser).toHaveBeenCalledWith(request)
      expect(mockSlackDisconnectionService.disconnectSlackIntegration).toHaveBeenCalledWith(
        request,
        'user-123'
      )
    })

    it('should successfully handle no connections case', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: true,
        data: { id: 'user-123' }
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue({
        success: true,
        data: {
          message: 'No connections to disconnect',
          disconnectedWorkspaces: [],
          itemsRemoved: {
            connections: 0,
            webhooks: 0,
            userIdCleared: false
          }
        }
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('No connections to disconnect')
      expect(data.disconnectedWorkspaces).toEqual([])
      expect(data.itemsRemoved.connections).toBe(0)
    })

    it('should handle single workspace disconnection', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: true,
        data: { id: 'user-456' }
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue({
        success: true,
        data: {
          message: 'Slack integration completely disconnected',
          disconnectedWorkspaces: ['My Workspace'],
          itemsRemoved: {
            connections: 1,
            webhooks: 1,
            userIdCleared: true
          }
        }
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.disconnectedWorkspaces).toEqual(['My Workspace'])
      expect(data.itemsRemoved.connections).toBe(1)
    })
  })

  describe('authentication errors', () => {
    it('should handle user not authenticated', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: false,
        error: 'User not authenticated',
        statusCode: 401
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('User not authenticated')
      expect(mockSlackDisconnectionService.disconnectSlackIntegration).not.toHaveBeenCalled()
    })

    it('should handle authentication error without status code', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: false,
        error: 'Authentication failed'
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication failed')
    })

    it('should handle authentication service error', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: false,
        error: 'Internal authentication error',
        statusCode: 500
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal authentication error')
    })
  })

  describe('disconnection service errors', () => {
    beforeEach(() => {
      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: true,
        data: { id: 'user-123' }
      })
    })

    it('should handle disconnection validation error', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue({
        success: false,
        error: 'User ID is required',
        statusCode: 400
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User ID is required')
    })

    it('should handle connection fetch error', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue({
        success: false,
        error: 'Failed to fetch connections',
        statusCode: 500
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch connections')
    })

    it('should handle webhook deletion error', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue({
        success: false,
        error: 'Failed to delete webhooks',
        statusCode: 500
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete webhooks')
    })

    it('should handle connection deletion error', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue({
        success: false,
        error: 'Failed to delete connections',
        statusCode: 500
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete connections')
    })

    it('should handle user reset error', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue({
        success: false,
        error: 'Failed to reset user Slack ID',
        statusCode: 500
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to reset user Slack ID')
    })

    it('should handle disconnection error without status code', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue({
        success: false,
        error: 'Unknown disconnection error'
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Unknown disconnection error')
    })
  })

  describe('service exceptions', () => {
    it('should handle authentication service exception', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockRejectedValue(
        new Error('Authentication service crashed')
      )

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle disconnection service exception', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: true,
        data: { id: 'user-123' }
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockRejectedValue(
        new Error('Disconnection service crashed')
      )

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle general exception', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      // Mock createServices to throw an error
      mockedCreateServices.mockImplementation(() => {
        throw new Error('Service factory error')
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('service method calls', () => {
    it('should call services with correct parameters', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: true,
        data: { id: 'test-user-id' }
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue({
        success: true,
        data: {
          message: 'Slack integration completely disconnected',
          disconnectedWorkspaces: [],
          itemsRemoved: {
            connections: 0,
            webhooks: 0,
            userIdCleared: true
          }
        }
      })

      await DELETE(request as any)

      expect(mockSlackDisconnectionService.authenticateUser).toHaveBeenCalledWith(request)
      expect(mockSlackDisconnectionService.disconnectSlackIntegration).toHaveBeenCalledWith(
        request,
        'test-user-id'
      )
    })

    it('should call services in correct order', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      const callOrder: string[] = []

      mockSlackDisconnectionService.authenticateUser.mockImplementation(async () => {
        callOrder.push('authenticate')
        return {
          success: true,
          data: { id: 'user-123' }
        }
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockImplementation(async () => {
        callOrder.push('disconnect')
        return {
          success: true,
          data: {
            message: 'Slack integration completely disconnected',
            disconnectedWorkspaces: [],
            itemsRemoved: {
              connections: 0,
              webhooks: 0,
              userIdCleared: true
            }
          }
        }
      })

      await DELETE(request as any)

      expect(callOrder).toEqual(['authenticate', 'disconnect'])
    })

    it('should create services instance once per request', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: true,
        data: { id: 'user-123' }
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue({
        success: true,
        data: {
          message: 'Success',
          disconnectedWorkspaces: [],
          itemsRemoved: {
            connections: 0,
            webhooks: 0,
            userIdCleared: true
          }
        }
      })

      await DELETE(request as any)

      expect(mockedCreateServices).toHaveBeenCalledTimes(1)
    })
  })

  describe('response format', () => {
    it('should return correct JSON response format for success', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: true,
        data: { id: 'user-123' }
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue({
        success: true,
        data: {
          message: 'Slack integration completely disconnected',
          disconnectedWorkspaces: ['Test Workspace'],
          itemsRemoved: {
            connections: 1,
            webhooks: 1,
            userIdCleared: true
          }
        }
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(data).toHaveProperty('message')
      expect(data).toHaveProperty('disconnectedWorkspaces')
      expect(data).toHaveProperty('itemsRemoved')
      expect(data.itemsRemoved).toHaveProperty('connections')
      expect(data.itemsRemoved).toHaveProperty('webhooks')
      expect(data.itemsRemoved).toHaveProperty('userIdCleared')
      expect(typeof data.message).toBe('string')
      expect(Array.isArray(data.disconnectedWorkspaces)).toBe(true)
    })

    it('should return correct error response format', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: false,
        error: 'Authentication failed',
        statusCode: 401
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(data).toHaveProperty('error')
      expect(data.error).toBe('Authentication failed')
      expect(data).not.toHaveProperty('message')
      expect(data).not.toHaveProperty('disconnectedWorkspaces')
    })

    it('should set correct Content-Type header', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: true,
        data: { id: 'user-123' }
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue({
        success: true,
        data: {
          message: 'Success',
          disconnectedWorkspaces: [],
          itemsRemoved: {
            connections: 0,
            webhooks: 0,
            userIdCleared: true
          }
        }
      })

      const response = await DELETE(request as any)

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('Clean Architecture integration', () => {
    it('should use SlackDisconnectionService from ServiceFactory', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: true,
        data: { id: 'user-123' }
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue({
        success: true,
        data: {
          message: 'Success',
          disconnectedWorkspaces: [],
          itemsRemoved: {
            connections: 0,
            webhooks: 0,
            userIdCleared: true
          }
        }
      })

      await DELETE(request as any)

      // Verify ServiceFactory was called to create services
      expect(mockedCreateServices).toHaveBeenCalled()
      
      // Verify the correct service methods were called
      expect(mockSlackDisconnectionService.authenticateUser).toHaveBeenCalled()
      expect(mockSlackDisconnectionService.disconnectSlackIntegration).toHaveBeenCalled()
    })

    it('should maintain API contract with service layer', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: true,
        data: { id: 'user-123' }
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue({
        success: true,
        data: {
          message: 'Success',
          disconnectedWorkspaces: [],
          itemsRemoved: {
            connections: 0,
            webhooks: 0,
            userIdCleared: true
          }
        }
      })

      const response = await DELETE(request as any)

      // API should only handle HTTP concerns
      expect(response.status).toBe(200)
      
      // Business logic should be delegated to service
      expect(mockSlackDisconnectionService.disconnectSlackIntegration).toHaveBeenCalledWith(
        expect.any(Object), // request
        expect.any(String)   // userId
      )
    })

    it('should properly handle service result structure', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: true,
        data: { id: 'user-123' }
      })

      const expectedServiceResult = {
        success: true,
        data: {
          message: 'Slack integration completely disconnected',
          disconnectedWorkspaces: ['Workspace 1'],
          itemsRemoved: {
            connections: 1,
            webhooks: 1,
            userIdCleared: true
          }
        }
      }

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue(expectedServiceResult)

      const response = await DELETE(request as any)
      const responseData = await response.json()

      // Response should directly return service data
      expect(responseData).toEqual(expectedServiceResult.data)
    })
  })

  describe('edge cases', () => {
    it('should handle null service data gracefully', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: true,
        data: { id: 'user-123' }
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue({
        success: true,
        data: null as any
      })

      const response = await DELETE(request as any)

      expect(response.status).toBe(200)
      expect(await response.json()).toBeNull()
    })

    it('should handle empty user ID from authentication', async () => {
      const request = createMockNextRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/slack/integration/disconnect'
      })

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: true,
        data: { id: '' }
      })

      mockSlackDisconnectionService.disconnectSlackIntegration.mockResolvedValue({
        success: false,
        error: 'User ID is required',
        statusCode: 400
      })

      const response = await DELETE(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User ID is required')
    })

    it('should handle malformed request objects', async () => {
      const malformedRequest = {
        url: null,
        method: undefined
      } as any

      mockSlackDisconnectionService.authenticateUser.mockResolvedValue({
        success: false,
        error: 'Invalid request',
        statusCode: 400
      })

      const response = await DELETE(malformedRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
    })
  })
})