/**
 * @jest-environment jsdom
 */

import { SlackConnectionService } from '@/lib/services/SlackConnectionService'
import { SlackRepositoryInterface } from '@/lib/repositories/SlackRepository'
import { createAutoMock, mockResult } from '@/__tests__/utils/autoMock'
import { MockProxy } from 'jest-mock-extended'
import {
  createMockSlackConnection,
  createMockSlackConnectionRecent,
  createMockSlackConnectionOld,
  createMockSlackConnectionInvalidWorkspace,
  createMockSlackConnectionDifferentUser,
  createMockMultipleSlackConnections
} from '@/__tests__/fixtures/slack-connection.fixture'
import { createExtendedError } from '@/__tests__/utils/typeHelpers'

describe('SlackConnectionService', () => {
  let service: SlackConnectionService
  let mockSlackRepo: MockProxy<SlackRepositoryInterface>

  beforeEach(() => {
    mockSlackRepo = createAutoMock<SlackRepositoryInterface>()
    service = new SlackConnectionService(mockSlackRepo)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserConnections', () => {
    it('should successfully return user connections with summary', async () => {
      const mockConnections = createMockMultipleSlackConnections()
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue(mockResult.success(mockConnections))

      const result = await service.getUserConnections('user-123')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.connections).toEqual(mockConnections)
      expect(result.data!.totalCount).toBe(3)
      expect(result.data!.workspaceNames).toEqual(['Workspace 1', 'Workspace 2', 'Workspace 3'])
      expect(result.data!.hasActiveConnections).toBe(true)
      expect(mockSlackRepo.findConnectionsByUserId).toHaveBeenCalledWith('user-123')
    })

    it('should return summary with no connections', async () => {
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue(mockResult.success([]))

      const result = await service.getUserConnections('user-123')

      expect(result.success).toBe(true)
      expect(result.data!.connections).toEqual([])
      expect(result.data!.totalCount).toBe(0)
      expect(result.data!.workspaceNames).toEqual([])
      expect(result.data!.hasActiveConnections).toBe(false)
    })

    it('should handle repository error', async () => {
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: [],
        error: createExtendedError('Database error', 'DB_ERROR')
      })

      const result = await service.getUserConnections('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch connections')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service exception', async () => {
      mockSlackRepo.findConnectionsByUserId.mockRejectedValue(new Error('Network error'))

      const result = await service.getUserConnections('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should handle unique workspace names correctly', async () => {
      const connections = [
        createMockSlackConnection({ workspace_name: 'Workspace A' }),
        createMockSlackConnection({ workspace_name: 'Workspace A' }), // Duplicate
        createMockSlackConnection({ workspace_name: 'Workspace B' })
      ]
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: connections,
        error: null
      })

      const result = await service.getUserConnections('user-123')

      expect(result.success).toBe(true)
      expect(result.data!.workspaceNames).toEqual(['Workspace A', 'Workspace A', 'Workspace B'])
      expect(result.data!.totalCount).toBe(3)
    })
  })

  describe('deleteUserConnection', () => {
    it('should successfully delete user connection', async () => {
      const mockConnection = createMockSlackConnection()

      // Mock validation success
      mockSlackRepo.findConnectionById.mockResolvedValue({
        data: mockConnection,
        error: null
      })

      // Mock deletion success
      mockSlackRepo.deleteConnection.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await service.deleteUserConnection('conn-123', 'user-123')

      expect(result.success).toBe(true)
      expect(result.data!.success).toBe(true)
      expect(result.data!.message).toBe(`Successfully deleted connection to ${mockConnection.workspace_name}`)
      expect(result.data!.deletedConnection).toEqual(mockConnection)
      expect(mockSlackRepo.findConnectionById).toHaveBeenCalledWith('conn-123')
      expect(mockSlackRepo.deleteConnection).toHaveBeenCalledWith('conn-123', 'user-123')
    })

    it('should reject deletion for non-existent connection', async () => {
      mockSlackRepo.findConnectionById.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await service.deleteUserConnection('non-existent', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection not found')
      expect(result.statusCode).toBe(404)
      expect(mockSlackRepo.deleteConnection).not.toHaveBeenCalled()
    })

    it('should reject deletion for connection owned by different user', async () => {
      const mockConnection = createMockSlackConnectionDifferentUser()
      mockSlackRepo.findConnectionById.mockResolvedValue({
        data: mockConnection,
        error: null
      })

      const result = await service.deleteUserConnection('conn-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized - connection belongs to different user')
      expect(result.statusCode).toBe(403)
      expect(mockSlackRepo.deleteConnection).not.toHaveBeenCalled()
    })

    it('should handle repository error during validation', async () => {
      mockSlackRepo.findConnectionById.mockResolvedValue({
        data: null,
        error: createExtendedError('Database error', 'DB_ERROR')
      })

      const result = await service.deleteUserConnection('conn-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to verify connection ownership')
      expect(result.statusCode).toBe(500)
    })

    it('should handle repository error during deletion', async () => {
      const mockConnection = createMockSlackConnection()
      mockSlackRepo.findConnectionById.mockResolvedValue({
        data: mockConnection,
        error: null
      })
      mockSlackRepo.deleteConnection.mockResolvedValue({
        data: null,
        error: createExtendedError('Delete failed', 'DELETE_ERROR')
      })

      const result = await service.deleteUserConnection('conn-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to delete connection')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service exception', async () => {
      mockSlackRepo.findConnectionById.mockRejectedValue(new Error('Network error'))

      const result = await service.deleteUserConnection('conn-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('validateConnectionOwnership', () => {
    it('should successfully validate ownership for correct user', async () => {
      const mockConnection = createMockSlackConnection()
      mockSlackRepo.findConnectionById.mockResolvedValue({
        data: mockConnection,
        error: null
      })

      const result = await service.validateConnectionOwnership('conn-123', 'user-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockConnection)
      expect(mockSlackRepo.findConnectionById).toHaveBeenCalledWith('conn-123')
    })

    it('should fail validation for non-existent connection', async () => {
      mockSlackRepo.findConnectionById.mockResolvedValue({
        data: null,
        error: null
      })

      const result = await service.validateConnectionOwnership('non-existent', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Connection not found')
      expect(result.statusCode).toBe(404)
    })

    it('should fail validation for different user', async () => {
      const mockConnection = createMockSlackConnectionDifferentUser()
      mockSlackRepo.findConnectionById.mockResolvedValue({
        data: mockConnection,
        error: null
      })

      const result = await service.validateConnectionOwnership('conn-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized - connection belongs to different user')
      expect(result.statusCode).toBe(403)
    })

    it('should handle repository error', async () => {
      mockSlackRepo.findConnectionById.mockResolvedValue({
        data: null,
        error: createExtendedError('Database error', 'DB_ERROR')
      })

      const result = await service.validateConnectionOwnership('conn-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to verify connection ownership')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service exception', async () => {
      mockSlackRepo.findConnectionById.mockRejectedValue(new Error('Network error'))

      const result = await service.validateConnectionOwnership('conn-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('getConnection', () => {
    it('should successfully get connection for authorized user', async () => {
      const mockConnection = createMockSlackConnection()
      mockSlackRepo.findConnectionById.mockResolvedValue({
        data: mockConnection,
        error: null
      })

      const result = await service.getConnection('conn-123', 'user-123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockConnection)
    })

    it('should fail for unauthorized user', async () => {
      const mockConnection = createMockSlackConnectionDifferentUser()
      mockSlackRepo.findConnectionById.mockResolvedValue({
        data: mockConnection,
        error: null
      })

      const result = await service.getConnection('conn-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized - connection belongs to different user')
      expect(result.statusCode).toBe(403)
    })

    it('should handle service exception', async () => {
      mockSlackRepo.findConnectionById.mockRejectedValue(new Error('Network error'))

      const result = await service.getConnection('conn-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('hasWorkspaceConnection', () => {
    it('should return true when user has connection to workspace', async () => {
      const mockConnections = [
        createMockSlackConnection({ workspace_id: 'T1234567890' }),
        createMockSlackConnection({ workspace_id: 'T0987654321' })
      ]
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: mockConnections,
        error: null
      })

      const result = await service.hasWorkspaceConnection('user-123', 'T1234567890')

      expect(result.success).toBe(true)
      expect(result.data).toBe(true)
    })

    it('should return false when user has no connection to workspace', async () => {
      const mockConnections = [
        createMockSlackConnection({ workspace_id: 'T1111111111' }),
        createMockSlackConnection({ workspace_id: 'T2222222222' })
      ]
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: mockConnections,
        error: null
      })

      const result = await service.hasWorkspaceConnection('user-123', 'T9999999999')

      expect(result.success).toBe(true)
      expect(result.data).toBe(false)
    })

    it('should return false when user has no connections', async () => {
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: [],
        error: null
      })

      const result = await service.hasWorkspaceConnection('user-123', 'T1234567890')

      expect(result.success).toBe(true)
      expect(result.data).toBe(false)
    })

    it('should handle repository error', async () => {
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: [],
        error: createExtendedError('Database error', 'DB_ERROR')
      })

      const result = await service.hasWorkspaceConnection('user-123', 'T1234567890')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to check workspace connection')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service exception', async () => {
      mockSlackRepo.findConnectionsByUserId.mockRejectedValue(new Error('Network error'))

      const result = await service.hasWorkspaceConnection('user-123', 'T1234567890')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should be case sensitive for workspace ID matching', async () => {
      const mockConnections = [
        createMockSlackConnection({ workspace_id: 'T1234567890' })
      ]
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: mockConnections,
        error: null
      })

      const result = await service.hasWorkspaceConnection('user-123', 't1234567890')

      expect(result.success).toBe(true)
      expect(result.data).toBe(false)
    })
  })

  describe('getConnectionStats', () => {
    it('should return detailed statistics for user connections', async () => {
      const connections = [
        createMockSlackConnectionOld(), // 2022-01-01
        createMockSlackConnectionRecent(), // Recent (today)
        createMockSlackConnectionInvalidWorkspace() // Invalid workspace
      ]
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: connections,
        error: null
      })

      const result = await service.getConnectionStats('user-123')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.totalConnections).toBe(3)
      expect(result.data!.validConnections).toBe(2) // Invalid workspace excluded
      expect(result.data!.workspaceTypes).toContain('Old Team')
      expect(result.data!.workspaceTypes).toContain('Recent Team')
      expect(result.data!.workspaceTypes).toContain('Invalid Team')
      expect(result.data!.oldestConnection!.created_at).toBe('2022-01-01T00:00:00Z') // Old connection
      expect(result.data!.newestConnection!.team_name).toBe('Recent Team') // Recent connection
    })

    it('should return empty statistics for user with no connections', async () => {
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: [],
        error: null
      })

      const result = await service.getConnectionStats('user-123')

      expect(result.success).toBe(true)
      expect(result.data!.totalConnections).toBe(0)
      expect(result.data!.validConnections).toBe(0)
      expect(result.data!.workspaceTypes).toEqual([])
      expect(result.data!.oldestConnection).toBeUndefined()
      expect(result.data!.newestConnection).toBeUndefined()
    })

    it('should handle single connection correctly', async () => {
      const singleConnection = createMockSlackConnection()
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: [singleConnection],
        error: null
      })

      const result = await service.getConnectionStats('user-123')

      expect(result.success).toBe(true)
      expect(result.data!.totalConnections).toBe(1)
      expect(result.data!.validConnections).toBe(1)
      expect(result.data!.oldestConnection).toEqual(singleConnection)
      expect(result.data!.newestConnection).toEqual(singleConnection)
    })

    it('should deduplicate workspace types correctly', async () => {
      const connections = [
        createMockSlackConnection({ team_name: 'Team Alpha' }),
        createMockSlackConnection({ team_name: 'Team Alpha' }), // Duplicate
        createMockSlackConnection({ team_name: 'Team Beta' })
      ]
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: connections,
        error: null
      })

      const result = await service.getConnectionStats('user-123')

      expect(result.success).toBe(true)
      expect(result.data!.workspaceTypes).toEqual(['Team Alpha', 'Team Beta'])
    })

    it('should sort connections by date correctly', async () => {
      const connections = [
        createMockSlackConnection({ created_at: '2023-03-01T00:00:00Z' }), // March
        createMockSlackConnection({ created_at: '2023-01-01T00:00:00Z' }), // January
        createMockSlackConnection({ created_at: '2023-02-01T00:00:00Z' })  // February
      ]
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: connections,
        error: null
      })

      const result = await service.getConnectionStats('user-123')

      expect(result.success).toBe(true)
      expect(result.data!.oldestConnection!.created_at).toBe('2023-01-01T00:00:00Z')
      expect(result.data!.newestConnection!.created_at).toBe('2023-03-01T00:00:00Z')
    })

    it('should handle repository error', async () => {
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: [],
        error: createExtendedError('Database error', 'DB_ERROR')
      })

      const result = await service.getConnectionStats('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch connection statistics')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service exception', async () => {
      mockSlackRepo.findConnectionsByUserId.mockRejectedValue(new Error('Network error'))

      const result = await service.getConnectionStats('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
      expect(result.statusCode).toBe(500)
    })

    it('should handle all invalid connections', async () => {
      const connections = [
        createMockSlackConnectionInvalidWorkspace(),
        createMockSlackConnection({ workspace_id: 'INVALID' }),
        createMockSlackConnection({ workspace_id: '' })
      ]
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: connections,
        error: null
      })

      const result = await service.getConnectionStats('user-123')

      expect(result.success).toBe(true)
      expect(result.data!.totalConnections).toBe(3)
      expect(result.data!.validConnections).toBe(0)
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle null/undefined connection data gracefully', async () => {
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: null as any,
        error: null
      })

      const result = await service.getUserConnections('user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error')
    })

    it('should handle empty string parameters', async () => {
      const result = await service.getUserConnections('')

      expect(mockSlackRepo.findConnectionsByUserId).toHaveBeenCalledWith('')
    })

    it('should handle special characters in user IDs', async () => {
      const specialUserId = 'user-with-special@chars#123'
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: [],
        error: null
      })

      const result = await service.getUserConnections(specialUserId)

      expect(result.success).toBe(true)
      expect(mockSlackRepo.findConnectionsByUserId).toHaveBeenCalledWith(specialUserId)
    })

    it('should handle malformed date strings in connections', async () => {
      const connections = [
        createMockSlackConnection({ created_at: 'invalid-date' }),
        createMockSlackConnection({ created_at: '2023-01-01T00:00:00Z' })
      ]
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: connections,
        error: null
      })

      const result = await service.getConnectionStats('user-123')

      expect(result.success).toBe(true)
      // Should not throw error even with invalid date
    })

    it('should handle very large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) =>
        createMockSlackConnection({
          id: `conn-${i}`,
          workspace_name: `Workspace ${i}`,
          team_name: `Team ${i % 10}` // Create some duplicates
        })
      )
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: largeDataset,
        error: null
      })

      const result = await service.getUserConnections('user-123')

      expect(result.success).toBe(true)
      expect(result.data!.totalCount).toBe(1000)
      expect(result.data!.workspaceNames).toHaveLength(1000)
    })
  })

  describe('service layer integration', () => {
    it('should properly use SlackConnectionEntity for business logic', async () => {
      const invalidConnection = createMockSlackConnectionInvalidWorkspace()
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: [invalidConnection],
        error: null
      })

      const statsResult = await service.getConnectionStats('user-123')

      expect(statsResult.success).toBe(true)
      expect(statsResult.data!.validConnections).toBe(0) // Should use entity validation
    })

    it('should maintain consistent error response format', async () => {
      const methods = [
        () => service.getUserConnections('user-123'),
        () => service.deleteUserConnection('conn-123', 'user-123'),
        () => service.validateConnectionOwnership('conn-123', 'user-123'),
        () => service.getConnection('conn-123', 'user-123'),
        () => service.hasWorkspaceConnection('user-123', 'T1234567890'),
        () => service.getConnectionStats('user-123')
      ]

      // Make all repository calls fail
      mockSlackRepo.findConnectionsByUserId.mockRejectedValue(new Error('Test error'))
      mockSlackRepo.findConnectionById.mockRejectedValue(new Error('Test error'))

      for (const method of methods) {
        const result = await method()
        expect(result.success).toBe(false)
        expect(result.error).toBe('Internal server error')
        expect(result.statusCode).toBe(500)
      }
    })
  })
})
