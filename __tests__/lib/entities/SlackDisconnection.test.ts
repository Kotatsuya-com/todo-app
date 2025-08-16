/**
 * @jest-environment node
 */

import {
  SlackDisconnectionEntity,
  SlackConnection,
  SlackDisconnectionRequest,
  DisconnectionSummary,
  DisconnectionVerification
} from '@/lib/entities/SlackDisconnection'

describe('SlackDisconnectionEntity', () => {
  const validUserId = 'user-123'
  const validConnections: SlackConnection[] = [
    { id: 'conn-1', workspace_name: 'Workspace 1' },
    { id: 'conn-2', workspace_name: 'Workspace 2' }
  ]

  describe('constructor and basic properties', () => {
    it('should create entity with valid user ID', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId })

      expect(entity.userId).toBe(validUserId)
      expect(entity.connections).toEqual([])
    })

    it('should create entity with user ID and connections', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, validConnections)

      expect(entity.userId).toBe(validUserId)
      expect(entity.connections).toEqual(validConnections)
      expect(entity.connections).not.toBe(validConnections) // 深いコピーの確認
    })

    it('should ensure immutability of connections', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, validConnections)
      const originalConnections = entity.connections

      originalConnections.push({ id: 'new-conn', workspace_name: 'New Workspace' })

      expect(entity.connections).toEqual(validConnections)
      expect(entity.connections.length).toBe(2)
    })
  })

  describe('validateRequest', () => {
    it('should validate valid user ID', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId })
      const result = entity.validateRequest()

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should reject empty user ID', () => {
      const entity = new SlackDisconnectionEntity({ userId: '' })
      const result = entity.validateRequest()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('User ID is required')
    })

    it('should reject null user ID', () => {
      const entity = new SlackDisconnectionEntity({ userId: null as any })
      const result = entity.validateRequest()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('User ID is required')
    })

    it('should reject undefined user ID', () => {
      const entity = new SlackDisconnectionEntity({ userId: undefined as any })
      const result = entity.validateRequest()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('User ID is required')
    })

    it('should reject non-string user ID', () => {
      const entity = new SlackDisconnectionEntity({ userId: 123 as any })
      const result = entity.validateRequest()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('User ID must be a string')
    })

    it('should reject too short user ID', () => {
      const entity = new SlackDisconnectionEntity({ userId: '' })
      const result = entity.validateRequest()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('User ID is required')
    })
  })

  describe('validateConnections', () => {
    it('should validate empty connections array', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, [])
      const result = entity.validateConnections()

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should validate valid connections', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, validConnections)
      const result = entity.validateConnections()

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should reject connection without ID', () => {
      const invalidConnections: SlackConnection[] = [
        { id: '', workspace_name: 'Workspace 1' }
      ]
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, invalidConnections)
      const result = entity.validateConnections()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Connection ID is required')
    })

    it('should reject connection without workspace name', () => {
      const invalidConnections: SlackConnection[] = [
        { id: 'conn-1', workspace_name: '' }
      ]
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, invalidConnections)
      const result = entity.validateConnections()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Workspace name is required')
    })

    it('should reject workspace name that is too long', () => {
      const longName = 'A'.repeat(101)
      const invalidConnections: SlackConnection[] = [
        { id: 'conn-1', workspace_name: longName }
      ]
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, invalidConnections)
      const result = entity.validateConnections()

      expect(result.valid).toBe(false)
      expect(result.errors).toContain(`Workspace name too long: ${longName}`)
    })

    it('should validate workspace name at max length', () => {
      const maxLengthName = 'A'.repeat(100)
      const validConnections: SlackConnection[] = [
        { id: 'conn-1', workspace_name: maxLengthName }
      ]
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, validConnections)
      const result = entity.validateConnections()

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should accumulate multiple connection errors', () => {
      const invalidConnections: SlackConnection[] = [
        { id: '', workspace_name: '' },
        { id: 'conn-2', workspace_name: 'A'.repeat(101) }
      ]
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, invalidConnections)
      const result = entity.validateConnections()

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(2)
    })
  })

  describe('validateDisconnection', () => {
    it('should validate complete valid disconnection', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, validConnections)
      const result = entity.validateDisconnection()

      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should combine request and connection validation errors', () => {
      const invalidConnections: SlackConnection[] = [
        { id: '', workspace_name: '' }
      ]
      const entity = new SlackDisconnectionEntity({ userId: '' }, invalidConnections)
      const result = entity.validateDisconnection()

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(error => error.includes('User ID'))).toBe(true)
      expect(result.errors.some(error => error.includes('Connection'))).toBe(true)
    })
  })

  describe('hasConnectionsToDisconnect', () => {
    it('should return false for no connections', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, [])

      expect(entity.hasConnectionsToDisconnect()).toBe(false)
    })

    it('should return true for existing connections', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, validConnections)

      expect(entity.hasConnectionsToDisconnect()).toBe(true)
    })
  })

  describe('createDisconnectionSummary', () => {
    it('should create summary for empty connections', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, [])
      const summary = entity.createDisconnectionSummary()

      expect(summary).toEqual({
        connectionIds: [],
        workspaceNames: [],
        totalConnections: 0,
        hasConnections: false
      })
    })

    it('should create summary for existing connections', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, validConnections)
      const summary = entity.createDisconnectionSummary()

      expect(summary).toEqual({
        connectionIds: ['conn-1', 'conn-2'],
        workspaceNames: ['Workspace 1', 'Workspace 2'],
        totalConnections: 2,
        hasConnections: true
      })
    })

    it('should maintain order of connections', () => {
      const orderedConnections: SlackConnection[] = [
        { id: 'third', workspace_name: 'Third' },
        { id: 'first', workspace_name: 'First' },
        { id: 'second', workspace_name: 'Second' }
      ]
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, orderedConnections)
      const summary = entity.createDisconnectionSummary()

      expect(summary.connectionIds).toEqual(['third', 'first', 'second'])
      expect(summary.workspaceNames).toEqual(['Third', 'First', 'Second'])
    })
  })

  describe('evaluateVerification', () => {
    it('should evaluate complete successful disconnection', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId })
      const verification = entity.evaluateVerification(0, 0, true)

      expect(verification).toEqual({
        connectionsRemaining: 0,
        webhooksRemaining: 0,
        userSlackIdCleared: true,
        isComplete: true
      })
    })

    it('should evaluate incomplete disconnection - connections remaining', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId })
      const verification = entity.evaluateVerification(1, 0, true)

      expect(verification).toEqual({
        connectionsRemaining: 1,
        webhooksRemaining: 0,
        userSlackIdCleared: true,
        isComplete: false
      })
    })

    it('should evaluate incomplete disconnection - webhooks remaining', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId })
      const verification = entity.evaluateVerification(0, 2, true)

      expect(verification).toEqual({
        connectionsRemaining: 0,
        webhooksRemaining: 2,
        userSlackIdCleared: true,
        isComplete: false
      })
    })

    it('should evaluate incomplete disconnection - user ID not cleared', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId })
      const verification = entity.evaluateVerification(0, 0, false)

      expect(verification).toEqual({
        connectionsRemaining: 0,
        webhooksRemaining: 0,
        userSlackIdCleared: false,
        isComplete: false
      })
    })

    it('should evaluate multiple incomplete conditions', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId })
      const verification = entity.evaluateVerification(3, 5, false)

      expect(verification).toEqual({
        connectionsRemaining: 3,
        webhooksRemaining: 5,
        userSlackIdCleared: false,
        isComplete: false
      })
    })
  })

  describe('createResult', () => {
    it('should create result for successful disconnection', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, validConnections)
      const summary = entity.createDisconnectionSummary()
      const verification = entity.evaluateVerification(0, 0, true)
      const result = entity.createResult(summary, verification)

      expect(result).toEqual({
        success: true,
        disconnectedWorkspaces: ['Workspace 1', 'Workspace 2'],
        itemsRemoved: {
          connections: 2,
          webhooks: 2,
          userIdCleared: true
        },
        verificationResults: {
          remainingConnections: 0,
          remainingWebhooks: 0,
          userSlackIdCleared: true
        }
      })
    })

    it('should create result for failed disconnection', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, validConnections)
      const summary = entity.createDisconnectionSummary()
      const verification = entity.evaluateVerification(1, 2, false)
      const result = entity.createResult(summary, verification)

      expect(result).toEqual({
        success: false,
        disconnectedWorkspaces: ['Workspace 1', 'Workspace 2'],
        itemsRemoved: {
          connections: 2,
          webhooks: 2,
          userIdCleared: false
        },
        verificationResults: {
          remainingConnections: 1,
          remainingWebhooks: 2,
          userSlackIdCleared: false
        }
      })
    })
  })

  describe('duplicate checking methods', () => {
    it('should detect duplicate workspace names', () => {
      const duplicateConnections: SlackConnection[] = [
        { id: 'conn-1', workspace_name: 'Same Workspace' },
        { id: 'conn-2', workspace_name: 'Same Workspace' }
      ]
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, duplicateConnections)

      expect(entity.hasDuplicateWorkspaces()).toBe(true)
    })

    it('should detect no duplicate workspace names', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, validConnections)

      expect(entity.hasDuplicateWorkspaces()).toBe(false)
    })

    it('should detect duplicate connection IDs', () => {
      const duplicateConnections: SlackConnection[] = [
        { id: 'same-id', workspace_name: 'Workspace 1' },
        { id: 'same-id', workspace_name: 'Workspace 2' }
      ]
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, duplicateConnections)

      expect(entity.hasDuplicateConnectionIds()).toBe(true)
    })

    it('should detect no duplicate connection IDs', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, validConnections)

      expect(entity.hasDuplicateConnectionIds()).toBe(false)
    })
  })

  describe('includesWorkspace', () => {
    it('should find existing workspace', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, validConnections)

      expect(entity.includesWorkspace('Workspace 1')).toBe(true)
      expect(entity.includesWorkspace('Workspace 2')).toBe(true)
    })

    it('should not find non-existing workspace', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, validConnections)

      expect(entity.includesWorkspace('Non-existing Workspace')).toBe(false)
    })

    it('should be case sensitive', () => {
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, validConnections)

      expect(entity.includesWorkspace('workspace 1')).toBe(false)
      expect(entity.includesWorkspace('WORKSPACE 1')).toBe(false)
    })
  })

  describe('factory methods', () => {
    it('should create entity for user', () => {
      const entity = SlackDisconnectionEntity.forUser(validUserId)

      expect(entity.userId).toBe(validUserId)
      expect(entity.connections).toEqual([])
    })

    it('should create entity with connections', () => {
      const entity = SlackDisconnectionEntity.withConnections(validUserId, validConnections)

      expect(entity.userId).toBe(validUserId)
      expect(entity.connections).toEqual(validConnections)
    })

    it('should create empty result', () => {
      const result = SlackDisconnectionEntity.createEmptyResult()

      expect(result).toEqual({
        success: true,
        disconnectedWorkspaces: [],
        itemsRemoved: {
          connections: 0,
          webhooks: 0,
          userIdCleared: false
        },
        verificationResults: {
          remainingConnections: 0,
          remainingWebhooks: 0,
          userSlackIdCleared: true
        }
      })
    })
  })

  describe('withUpdatedConnections', () => {
    it('should create new entity with updated connections', () => {
      const originalEntity = new SlackDisconnectionEntity({ userId: validUserId }, [])
      const updatedEntity = originalEntity.withUpdatedConnections(validConnections)

      expect(originalEntity.connections).toEqual([])
      expect(updatedEntity.connections).toEqual(validConnections)
      expect(updatedEntity.userId).toBe(validUserId)
      expect(updatedEntity).not.toBe(originalEntity)
    })

    it('should maintain immutability', () => {
      const originalEntity = new SlackDisconnectionEntity({ userId: validUserId }, validConnections)
      const newConnections: SlackConnection[] = [
        { id: 'new-conn', workspace_name: 'New Workspace' }
      ]
      const updatedEntity = originalEntity.withUpdatedConnections(newConnections)

      expect(originalEntity.connections).toEqual(validConnections)
      expect(updatedEntity.connections).toEqual(newConnections)
    })
  })

  describe('constants validation', () => {
    it('should have correct business rule constants', () => {
      expect(SlackDisconnectionEntity.MIN_USER_ID_LENGTH).toBe(1)
      expect(SlackDisconnectionEntity.MAX_WORKSPACE_NAME_LENGTH).toBe(100)
      expect(SlackDisconnectionEntity.REQUIRED_FIELDS).toEqual(['userId'])
    })
  })

  describe('edge cases', () => {
    it('should handle entity with single connection', () => {
      const singleConnection: SlackConnection[] = [
        { id: 'single-conn', workspace_name: 'Single Workspace' }
      ]
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, singleConnection)

      const summary = entity.createDisconnectionSummary()
      expect(summary.totalConnections).toBe(1)
      expect(summary.hasConnections).toBe(true)
      expect(summary.connectionIds).toEqual(['single-conn'])
    })

    it('should handle workspace names with special characters', () => {
      const specialConnections: SlackConnection[] = [
        { id: 'conn-1', workspace_name: 'Workspace with spaces & symbols!' },
        { id: 'conn-2', workspace_name: '日本語ワークスペース' }
      ]
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, specialConnections)
      const validation = entity.validateConnections()

      expect(validation.valid).toBe(true)
    })

    it('should handle empty workspace name edge case', () => {
      const emptyWorkspaceConnections: SlackConnection[] = [
        { id: 'conn-1', workspace_name: '' }
      ]
      const entity = new SlackDisconnectionEntity({ userId: validUserId }, emptyWorkspaceConnections)
      const validation = entity.validateConnections()

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Workspace name is required')
    })
  })
})
