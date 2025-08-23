/**
 * @jest-environment jsdom
 */

import { SlackMessageService } from '@/lib/services/SlackMessageService'
import { SlackRepositoryInterface } from '@/lib/repositories/SlackRepository'
import { MockProxy } from 'jest-mock-extended'
import { createAutoMock } from '@/__tests__/utils/autoMock'
import { RepositoryResult } from '@/lib/repositories/BaseRepository'
import { UserWithSettings } from '@/lib/entities/User'
import { SlackConnection } from '@/lib/entities/SlackConnection'
import {
  createMockSlackConnection,
  createMultipleConnections,
  createMockSlackApiResponse,
  VALID_SLACK_URLS,
  INVALID_SLACK_URLS
} from '@/__tests__/fixtures/slack-message.fixture'

// Mock slack-message module
jest.mock('@/lib/slack-message', () => ({
  getSlackMessageFromUrl: jest.fn(),
  parseSlackUrl: jest.fn()
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  slackLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    child: jest.fn().mockReturnValue({
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn()
    })
  }
}))

import { getSlackMessageFromUrl, parseSlackUrl } from '@/lib/slack-message'

const mockGetSlackMessageFromUrl = getSlackMessageFromUrl as jest.MockedFunction<typeof getSlackMessageFromUrl>
const mockParseSlackUrl = parseSlackUrl as jest.MockedFunction<typeof parseSlackUrl>

describe('SlackMessageService', () => {
  let service: SlackMessageService
  let mockSlackRepo: MockProxy<SlackRepositoryInterface>

  beforeEach(() => {
    mockSlackRepo = createAutoMock<SlackRepositoryInterface>()
    service = new SlackMessageService(mockSlackRepo)

    // Reset all mocks
    jest.clearAllMocks()

    // Setup default parseSlackUrl mock for valid URLs
    mockParseSlackUrl.mockImplementation((url: string) => {
      if (url.includes('slack.com') && url.includes('/archives/')) {
        const workspaceMatch = url.match(/https:\/\/([^.]+)\.slack\.com/)
        return {
          workspace: workspaceMatch ? workspaceMatch[1] : 'unknown',
          channel: 'C1234567890',
          timestamp: '1234567890123456'
        }
      }
      return null
    })
  })

  describe('retrieveMessage', () => {
    const validUrl = 'https://example.slack.com/archives/C1234567890/p1234567890123456'
    const userId = 'user-123'

    it('should complete full message retrieval successfully', async () => {
      const mockConnections = createMultipleConnections()
      const mockApiResponse = createMockSlackApiResponse()

      // Mock successful user validation
      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        data: { id: userId } as UserWithSettings
      } as RepositoryResult<UserWithSettings>)

      // Mock successful connections retrieval
      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: mockConnections
      } as any)

      // Mock successful Slack API call
      mockGetSlackMessageFromUrl.mockResolvedValue(mockApiResponse)

      const result = await service.retrieveMessage(validUrl, userId)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.text).toBe(mockApiResponse.text)
      expect(result.data!.url).toBe(validUrl)
      expect(result.data!.workspace).toBe(mockConnections[0].workspace_name)
    })

    it('should fail validation for invalid Slack URL', async () => {
      const invalidUrl = INVALID_SLACK_URLS[0]

      const result = await service.retrieveMessage(invalidUrl, userId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Valid Slack URL is required')
      expect(result.statusCode).toBe(400)
      expect(mockSlackRepo.findUserWithSettings).not.toHaveBeenCalled()
    })

    it('should fail validation for invalid user ID', async () => {
      const result = await service.retrieveMessage(validUrl, '')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Valid user ID is required')
      expect(result.statusCode).toBe(400)
      expect(mockSlackRepo.findUserWithSettings).not.toHaveBeenCalled()
    })

    it('should fail when user does not exist', async () => {
      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        error: { code: 'PGRST116', message: 'User not found' }
      } as any)

      const result = await service.retrieveMessage(validUrl, userId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
      expect(result.statusCode).toBe(401)
    })

    it('should fail when user has no Slack connections', async () => {
      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        data: { id: userId } as UserWithSettings
      } as RepositoryResult<UserWithSettings>)

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: []
      } as any)

      const result = await service.retrieveMessage(validUrl, userId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Slackワークスペースに接続されていません。設定画面で接続してください。')
      expect(result.statusCode).toBe(400)
    })

    it('should fail when Slack message cannot be retrieved', async () => {
      const mockConnections = [createMockSlackConnection()]

      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        data: { id: userId } as UserWithSettings
      } as RepositoryResult<UserWithSettings>)

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: mockConnections
      } as any)

      // Mock failed Slack API call
      mockGetSlackMessageFromUrl.mockResolvedValue(null)

      const result = await service.retrieveMessage(validUrl, userId)

      expect(result.success).toBe(false)
      expect(result.error).toContain('メッセージが見つかりませんでした')
      expect(result.statusCode).toBe(404)
    })

    it('should handle repository errors during user validation', async () => {
      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        error: { code: 'DB_ERROR', message: 'Database error' }
      } as any)

      const result = await service.retrieveMessage(validUrl, userId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to validate user')
      expect(result.statusCode).toBe(500)
    })

    it('should handle repository errors during connection lookup', async () => {
      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        data: { id: userId } as UserWithSettings
      } as RepositoryResult<UserWithSettings>)

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        error: { message: 'Database error' }
      } as any)

      const result = await service.retrieveMessage(validUrl, userId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch Slack connections')
      expect(result.statusCode).toBe(500)
    })

    it('should handle service exceptions', async () => {
      mockSlackRepo.findUserWithSettings.mockRejectedValue(new Error('Network error'))

      const result = await service.retrieveMessage(validUrl, userId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal server error during user validation')
      expect(result.statusCode).toBe(500)
    })

    it('should handle Slack API exceptions', async () => {
      const mockConnections = [createMockSlackConnection()]

      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        data: { id: userId } as UserWithSettings
      } as RepositoryResult<UserWithSettings>)

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: mockConnections
      } as any)

      // Mock Slack API throwing an error
      mockGetSlackMessageFromUrl.mockRejectedValue(new Error('Slack API error'))

      const result = await service.retrieveMessage(validUrl, userId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch message from Slack API')
      expect(result.statusCode).toBe(404)
    })
  })

  describe('workspace connection selection', () => {
    const userId = 'user-123'

    beforeEach(() => {
      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        data: { id: userId } as UserWithSettings
      } as RepositoryResult<UserWithSettings>)
    })

    it('should select exact workspace ID match', async () => {
      const url = 'https://T1234567890.slack.com/archives/C123/p123'
      const connections = [
        createMockSlackConnection({ workspace_id: 'T9999999999', workspace_name: 'Other' }),
        createMockSlackConnection({ workspace_id: 'T1234567890', workspace_name: 'Target' })
      ]

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        success: true,
        data: connections
      } as any)

      mockGetSlackMessageFromUrl.mockResolvedValue(createMockSlackApiResponse())

      const result = await service.retrieveMessage(url, userId)

      expect(result.success).toBe(true)
      expect(result.data!.workspace).toBe('Target')
      expect(mockGetSlackMessageFromUrl).toHaveBeenCalledWith(url, connections[1].access_token)
    })

    it('should select workspace name match when ID does not match', async () => {
      const url = 'https://target-workspace.slack.com/archives/C123/p123'
      const connections = [
        createMockSlackConnection({ workspace_name: 'Other Workspace' }),
        createMockSlackConnection({ workspace_name: 'target-workspace' }) // Match the parsed workspace
      ]

      // Override parseSlackUrl for this specific test
      mockParseSlackUrl.mockReturnValueOnce({
        workspace: 'target-workspace',
        channel: 'C123',
        timestamp: '123'
      })

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        success: true,
        data: connections
      } as any)

      mockGetSlackMessageFromUrl.mockResolvedValue(createMockSlackApiResponse())

      const result = await service.retrieveMessage(url, userId)

      expect(result.success).toBe(true)
      expect(result.data!.workspace).toBe('target-workspace')
      expect(mockGetSlackMessageFromUrl).toHaveBeenCalledWith(url, connections[1].access_token)
    })

    it('should select team name match as fallback', async () => {
      const url = 'https://target-team.slack.com/archives/C123/p123'
      const connections = [
        createMockSlackConnection({ team_name: 'Other Team' }),
        createMockSlackConnection({ team_name: 'Target Team' })
      ]

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        success: true,
        data: connections
      } as any)

      mockGetSlackMessageFromUrl.mockResolvedValue(createMockSlackApiResponse())

      const result = await service.retrieveMessage(url, userId)

      expect(result.success).toBe(true)
      expect(result.data!.workspace).toBe(connections[1].workspace_name)
      expect(mockGetSlackMessageFromUrl).toHaveBeenCalledWith(url, connections[1].access_token)
    })

    it('should use first connection when no match found', async () => {
      const url = 'https://unknown.slack.com/archives/C123/p123'
      const connections = createMultipleConnections()

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        success: true,
        data: connections
      } as any)

      mockGetSlackMessageFromUrl.mockResolvedValue(createMockSlackApiResponse())

      const result = await service.retrieveMessage(url, userId)

      expect(result.success).toBe(true)
      expect(result.data!.workspace).toBe(connections[0].workspace_name)
      expect(mockGetSlackMessageFromUrl).toHaveBeenCalledWith(url, connections[0].access_token)
    })

    it('should handle case-insensitive matching', async () => {
      const url = 'https://EXAMPLE.slack.com/archives/C123/p123'
      const connections = [
        createMockSlackConnection({ workspace_name: 'example workspace' })
      ]

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        success: true,
        data: connections
      } as any)

      mockGetSlackMessageFromUrl.mockResolvedValue(createMockSlackApiResponse())

      const result = await service.retrieveMessage(url, userId)

      expect(result.success).toBe(true)
      expect(result.data!.workspace).toBe('example workspace')
    })
  })

  describe('message data formatting', () => {
    const userId = 'user-123'
    const validUrl = 'https://example.slack.com/archives/C1234567890/p1234567890123456'

    beforeEach(() => {
      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        data: { id: userId } as UserWithSettings
      } as RepositoryResult<UserWithSettings>)

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        success: true,
        data: [createMockSlackConnection()]
      } as any)
    })

    it('should format message data correctly', async () => {
      const mockApiResponse = {
        text: 'Custom message text',
        user: 'U9999999999',
        timestamp: '9999999999.999999',
        channel: 'C9999999999'
      }

      mockGetSlackMessageFromUrl.mockResolvedValue(mockApiResponse)

      const result = await service.retrieveMessage(validUrl, userId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        text: 'Custom message text',
        user: 'U9999999999',
        timestamp: '9999999999.999999',
        channel: 'C9999999999',
        url: validUrl,
        workspace: 'Example Workspace'
      })
    })

    it('should handle empty message text', async () => {
      const mockApiResponse = createMockSlackApiResponse({ text: '' })
      mockGetSlackMessageFromUrl.mockResolvedValue(mockApiResponse)

      const result = await service.retrieveMessage(validUrl, userId)

      expect(result.success).toBe(true)
      expect(result.data!.text).toBe('')
    })

    it('should include original URL in response', async () => {
      const customUrl = 'https://custom.slack.com/archives/C123/p123'
      mockGetSlackMessageFromUrl.mockResolvedValue(createMockSlackApiResponse())

      const result = await service.retrieveMessage(customUrl, userId)

      expect(result.success).toBe(true)
      expect(result.data!.url).toBe(customUrl)
    })
  })

  describe('error scenarios and edge cases', () => {
    const userId = 'user-123'
    const validUrl = 'https://example.slack.com/archives/C1234567890/p1234567890123456'

    it('should handle undefined connections data', async () => {
      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        data: { id: userId } as UserWithSettings
      } as RepositoryResult<UserWithSettings>)

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        data: undefined
      } as any)

      const result = await service.retrieveMessage(validUrl, userId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Slackワークスペースに接続されていません。設定画面で接続してください。')
    })

    it('should handle malformed connection data', async () => {
      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        data: { id: userId } as UserWithSettings
      } as RepositoryResult<UserWithSettings>)

      const malformedConnections = [
        { incomplete: 'data' } // Missing required fields
      ]

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        success: true,
        data: malformedConnections
      } as any)

      const result = await service.retrieveMessage(validUrl, userId)

      // Should still attempt to process, might fail at Slack API level
      expect(result.success).toBe(false)
    })

    it('should handle extremely long URLs', async () => {
      const longUrl = 'https://very-long-workspace-name-that-might-cause-issues.slack.com/archives/C1234567890/p1234567890123456'

      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        data: { id: userId } as UserWithSettings
      } as RepositoryResult<UserWithSettings>)

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        success: true,
        data: [createMockSlackConnection()]
      } as any)

      mockGetSlackMessageFromUrl.mockResolvedValue(createMockSlackApiResponse())

      const result = await service.retrieveMessage(longUrl, userId)

      expect(result.success).toBe(true)
    })

    it('should handle special characters in user ID', async () => {
      const specialUserId = 'user-with-special@chars#123'

      mockSlackRepo.findUserWithSettings.mockResolvedValue({
        data: { id: specialUserId } as UserWithSettings,
        error: null
      })

      mockSlackRepo.findConnectionsByUserId.mockResolvedValue({
        success: true,
        data: [createMockSlackConnection()]
      } as any)

      mockGetSlackMessageFromUrl.mockResolvedValue(createMockSlackApiResponse())

      const result = await service.retrieveMessage(validUrl, specialUserId)

      expect(result.success).toBe(true)
      expect(mockSlackRepo.findUserWithSettings).toHaveBeenCalledWith(specialUserId)
    })

    it('should maintain consistent error response format', async () => {
      const errorScenarios = [
        () => service.retrieveMessage('', userId), // Invalid URL
        () => service.retrieveMessage(validUrl, '') // Invalid user ID
      ]

      for (const scenario of errorScenarios) {
        const result = await scenario()
        expect(result.success).toBe(false)
        expect(typeof result.error).toBe('string')
        expect(typeof result.statusCode).toBe('number')
        expect(result.data).toBeUndefined()
      }
    })
  })
})
