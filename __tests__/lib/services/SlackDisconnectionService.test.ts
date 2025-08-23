/**
 * @jest-environment node
 */

import { SlackDisconnectionService } from '@/lib/services/SlackDisconnectionService'
import { SlackDisconnectionEntity } from '@/lib/entities/SlackDisconnection'
import { authLogger } from '@/lib/logger'
import { setupTestEnvironment, cleanupTestEnvironment } from '@/__tests__/mocks'
import { mockRepositoryListSuccess, mockRepositorySuccess } from '@/__tests__/fixtures/repositories.fixture'
import { mock } from 'jest-mock-extended'
import { SlackRepositoryInterface } from '@/lib/repositories/SlackRepository'

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  authLogger: {
    child: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      child: jest.fn(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      }))
    }))
  }
}))
jest.mock('@/lib/entities/SlackDisconnection')

const MockedSlackDisconnectionEntity = SlackDisconnectionEntity as jest.MockedClass<typeof SlackDisconnectionEntity>

describe('SlackDisconnectionService (repository-based)', () => {
  let service: SlackDisconnectionService
  let mockLogger: any
  let mockRepo: jest.Mocked<SlackRepositoryInterface>

  const validUserId = 'user-123'

  beforeEach(() => {
    setupTestEnvironment()
    cleanupTestEnvironment()
    jest.clearAllMocks()

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      child: jest.fn(() => mockLogger)
    }
    ;(authLogger.child as jest.Mock).mockReturnValue(mockLogger)

    mockRepo = mock<SlackRepositoryInterface>() as unknown as jest.Mocked<SlackRepositoryInterface>
    service = new SlackDisconnectionService(mockRepo as any)
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('disconnectSlackIntegration', () => {
    it('should handle no connections case', async () => {
      const mockEntity: any = {
        validateRequest: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        withUpdatedConnections: jest.fn().mockImplementation((connections: any[]) => ({
          validateConnections: jest.fn().mockReturnValue({ valid: true, errors: [] }),
          createDisconnectionSummary: jest.fn().mockReturnValue({
            totalConnections: connections.length,
            connectionIds: [],
            workspaceNames: []
          })
        }))
      }
      MockedSlackDisconnectionEntity.forUser = jest.fn().mockReturnValue(mockEntity)

      mockRepo.findConnectionsByUserId.mockResolvedValue(mockRepositoryListSuccess([]))

      const result = await service.disconnectSlackIntegration(validUserId)

      expect(result.success).toBe(true)
      expect(result.data?.message).toBe('No connections to disconnect')
      expect(result.data?.disconnectedWorkspaces).toEqual([])
    })
  })

  describe('verifyDisconnection', () => {
    it('should verify successful disconnection', async () => {
      // Mock domain entity behavior
      (SlackDisconnectionEntity as any).forUser = jest.fn().mockReturnValue({
        evaluateVerification: (remainingConnections: number, remainingWebhooks: number, userSlackIdCleared: boolean) => ({
          connectionsRemaining: remainingConnections,
          webhooksRemaining: remainingWebhooks,
          userSlackIdCleared,
          isComplete: remainingConnections === 0 && remainingWebhooks === 0 && userSlackIdCleared
        })
      })

      mockRepo.findConnectionsByUserId.mockResolvedValue(mockRepositoryListSuccess([]))
      mockRepo.findWebhooksByUserId.mockResolvedValue(mockRepositoryListSuccess([]))
      mockRepo.getDirectSlackUserId.mockResolvedValue(mockRepositorySuccess({ slack_user_id: null }))

      const result = await service.verifyDisconnection(validUserId)

      expect(result.success).toBe(true)
      expect(result.data?.isComplete).toBe(true)
      expect(result.data?.connectionsRemaining).toBe(0)
      expect(result.data?.webhooksRemaining).toBe(0)
    })
  })
})
