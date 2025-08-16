/**
 * @jest-environment node
 */

/**
 * Slack Connections API routes unit tests
 * Dependency Injection version tests
 */

import { NextRequest } from 'next/server'
import { createSlackConnectionsHandlers } from '@/lib/factories/HandlerFactory'
import { TestContainer } from '@/lib/containers/TestContainer'

// Mock the production container import
jest.mock('@/lib/containers/ProductionContainer')

describe('/api/slack/connections API Routes', () => {
  let container: TestContainer
  let mockRequest: NextRequest
  let handlers: { GET: any, DELETE: any }

  beforeEach(() => {
    // Create test container
    container = new TestContainer()

    // Create handlers with test container
    handlers = createSlackConnectionsHandlers(container)

    // Mock request
    mockRequest = {
      json: jest.fn()
    } as any
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/slack/connections', () => {
    it('should return user slack connections successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          connections: [
            {
              id: 'mock-connection-id',
              workspace_id: 'TWORKSPACE123',
              workspace_name: 'Test Workspace',
              team_name: 'Test Team',
              access_token: 'xoxb-mock-token',
              scope: 'chat:write,files:read',
              created_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      }

      container.updateServiceMock('slackConnectionService', {
        getUserConnections: jest.fn().mockResolvedValue(mockResponse)
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(container.auth.requireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(container.services.slackConnectionService.getUserConnections).toHaveBeenCalledWith('mock-user-id')
      expect(response.status).toBe(200)
      expect(responseBody).toEqual({ connections: mockResponse.data.connections })
    })

    it('should handle service errors', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Failed to fetch slack connections',
        statusCode: 500
      }

      container.updateServiceMock('slackConnectionService', {
        getUserConnections: jest.fn().mockResolvedValue(mockErrorResponse)
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Failed to fetch slack connections' })
    })

    it('should handle authentication errors', async () => {
      container.updateAuthMock({
        requireAuthentication: jest.fn().mockRejectedValue(new Error('Authentication failed'))
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(401)
      expect(responseBody).toEqual({ error: 'Authentication failed' })
    })
  })

  describe('DELETE /api/slack/connections', () => {
    it('should delete user slack connection successfully', async () => {
      const deleteRequest = { connectionId: 'connection-123' }
      const mockResponse = {
        success: true,
        data: {}
      }

      mockRequest.json = jest.fn().mockResolvedValue(deleteRequest)
      container.updateServiceMock('slackConnectionService', {
        deleteUserConnection: jest.fn().mockResolvedValue(mockResponse)
      })

      const response = await handlers.DELETE(mockRequest)
      const responseBody = await response.json()

      expect(container.auth.requireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(mockRequest.json).toHaveBeenCalled()
      expect(container.services.slackConnectionService.deleteUserConnection).toHaveBeenCalledWith('connection-123', 'mock-user-id')
      expect(response.status).toBe(200)
      expect(responseBody).toEqual({ success: true })
    })

    it('should handle missing connectionId', async () => {
      const deleteRequest = {}
      mockRequest.json = jest.fn().mockResolvedValue(deleteRequest)

      const response = await handlers.DELETE(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(400)
      expect(responseBody).toEqual({ error: 'Connection ID is required' })
    })

    it('should handle service errors during deletion', async () => {
      const deleteRequest = { connectionId: 'connection-123' }
      const mockErrorResponse = {
        success: false,
        error: 'Failed to delete slack connection',
        statusCode: 500
      }

      mockRequest.json = jest.fn().mockResolvedValue(deleteRequest)
      container.updateServiceMock('slackConnectionService', {
        deleteUserConnection: jest.fn().mockResolvedValue(mockErrorResponse)
      })

      const response = await handlers.DELETE(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(500)
      expect(responseBody).toEqual({ error: 'Failed to delete slack connection' })
    })

    it('should handle authentication errors', async () => {
      container.updateAuthMock({
        requireAuthentication: jest.fn().mockRejectedValue(new Error('Unauthorized'))
      })

      const response = await handlers.DELETE(mockRequest)
      const responseBody = await response.json()

      expect(response.status).toBe(401)
      expect(responseBody).toEqual({ error: 'Unauthorized' })
    })
  })

  describe('Dependency Injection compliance', () => {
    it('should use test container for all dependencies', async () => {
      await handlers.GET(mockRequest)

      expect(container.auth.requireAuthentication).toHaveBeenCalledWith(mockRequest)
      expect(container.services.slackConnectionService.getUserConnections).toHaveBeenCalled()
    })

    it('should allow mock updates for testing different scenarios', async () => {
      const customResponse = {
        success: true,
        data: { connections: [{ custom: 'connection' }] }
      }

      container.updateServiceMock('slackConnectionService', {
        getUserConnections: jest.fn().mockResolvedValue(customResponse)
      })

      const response = await handlers.GET(mockRequest)
      const responseBody = await response.json()

      expect(responseBody).toEqual({ connections: customResponse.data.connections })
    })
  })
})
