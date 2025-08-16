/**
 * @jest-environment jsdom
 */

import { SlackMessageEntity } from '@/lib/entities/SlackMessage'
import {
  createMockSlackMessageRequest,
  createMockSlackConnection,
  createMultipleConnections,
  createMockSlackApiResponse,
  VALID_SLACK_URLS,
  INVALID_SLACK_URLS,
  WORKSPACE_MATCHING_TEST_CASES,
  VALIDATION_ERROR_TEST_CASES,
  EDGE_CASE_DATA
} from '@/__tests__/fixtures/slack-message.fixture'

describe('SlackMessageEntity', () => {
  describe('constructor and getters', () => {
    it('should create SlackMessageEntity with correct properties', () => {
      const request = createMockSlackMessageRequest()
      const entity = new SlackMessageEntity(request)

      expect(entity.slackUrl).toBe(request.slackUrl)
      expect(entity.userId).toBe(request.userId)
      expect(entity.parsedUrl).toBeNull() // Not parsed yet
    })

    it('should handle different request formats', () => {
      const request = createMockSlackMessageRequest({
        slackUrl: 'https://custom.slack.com/archives/C999/p999',
        userId: 'custom-user-id'
      })
      const entity = new SlackMessageEntity(request)

      expect(entity.slackUrl).toBe('https://custom.slack.com/archives/C999/p999')
      expect(entity.userId).toBe('custom-user-id')
    })
  })

  describe('isValidSlackUrl', () => {
    it('should validate correct Slack URL formats', () => {
      VALID_SLACK_URLS.forEach(url => {
        const entity = SlackMessageEntity.fromRequest(url, 'user-123')
        expect(entity.isValidSlackUrl()).toBe(true)
        expect(entity.parsedUrl).not.toBeNull()
      })
    })

    it('should reject invalid Slack URL formats', () => {
      INVALID_SLACK_URLS.forEach(url => {
        const entity = SlackMessageEntity.fromRequest(url, 'user-123')
        expect(entity.isValidSlackUrl()).toBe(false)
        expect(entity.parsedUrl).toBeNull()
      })
    })

    it('should parse URL only once and cache result', () => {
      const entity = SlackMessageEntity.fromRequest(VALID_SLACK_URLS[0], 'user-123')

      // First call
      const firstResult = entity.isValidSlackUrl()
      const firstParsed = entity.parsedUrl

      // Second call
      const secondResult = entity.isValidSlackUrl()
      const secondParsed = entity.parsedUrl

      expect(firstResult).toBe(secondResult)
      expect(firstParsed).toStrictEqual(secondParsed)
    })

    it('should handle null and undefined URLs', () => {
      const entityNull = SlackMessageEntity.fromRequest(null as any, 'user-123')
      const entityUndefined = SlackMessageEntity.fromRequest(undefined as any, 'user-123')

      expect(entityNull.isValidSlackUrl()).toBe(false)
      expect(entityUndefined.isValidSlackUrl()).toBe(false)
    })
  })

  describe('isValidUserId', () => {
    it('should validate correct user IDs', () => {
      const validUserIds = ['user-123', 'abc-def-ghi', 'uuid-12345']

      validUserIds.forEach(userId => {
        const entity = SlackMessageEntity.fromRequest(VALID_SLACK_URLS[0], userId)
        expect(entity.isValidUserId()).toBe(true)
      })
    })

    it('should reject invalid user IDs', () => {
      const invalidUserIds = ['', null, undefined, 123, {}]

      invalidUserIds.forEach(userId => {
        const entity = SlackMessageEntity.fromRequest(VALID_SLACK_URLS[0], userId as any)
        expect(entity.isValidUserId()).toBe(false)
      })
    })
  })

  describe('validateRequest', () => {
    it('should pass validation for valid request', () => {
      const entity = SlackMessageEntity.fromRequest(VALID_SLACK_URLS[0], 'user-123')
      const validation = entity.validateRequest()

      expect(validation.valid).toBe(true)
      expect(validation.errors).toEqual([])
    })

    it('should fail validation with specific error messages', () => {
      VALIDATION_ERROR_TEST_CASES.forEach(testCase => {
        const entity = new SlackMessageEntity(testCase.request)
        const validation = entity.validateRequest()

        expect(validation.valid).toBe(false)
        expect(validation.errors).toEqual(testCase.expectedErrors)
      })
    })

    it('should collect multiple validation errors', () => {
      const entity = SlackMessageEntity.fromRequest('', '')
      const validation = entity.validateRequest()

      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(1)
      expect(validation.errors).toContain('Valid user ID is required')
      expect(validation.errors).toContain('Valid Slack URL is required')
    })
  })

  describe('findBestConnection', () => {
    it('should handle empty connections', () => {
      const entity = SlackMessageEntity.fromRequest(VALID_SLACK_URLS[0], 'user-123')
      entity.isValidSlackUrl() // Parse URL

      const result = entity.findBestConnection([])
      expect(result).toBeNull()
    })

    it('should return first connection when no URL parsed', () => {
      const entity = SlackMessageEntity.fromRequest('invalid-url', 'user-123')
      const connections = createMultipleConnections()

      const result = entity.findBestConnection(connections)
      expect(result).toBe(connections[0])
    })

    it('should execute workspace matching logic correctly', () => {
      // Test exact workspace ID match
      const exactIdEntity = SlackMessageEntity.fromRequest(
        'https://test.slack.com/archives/C123/p123',
        'user-123'
      )
      exactIdEntity.isValidSlackUrl()

      const exactIdConnections = [
        createMockSlackConnection({ workspace_id: 'T9999999999', workspace_name: 'Other' }),
        createMockSlackConnection({ workspace_id: 'test', workspace_name: 'Target' })
      ]

      const exactResult = exactIdEntity.findBestConnection(exactIdConnections)
      expect(exactResult?.workspace_id).toBe('test')

      // Test workspace name match
      const nameEntity = SlackMessageEntity.fromRequest(
        'https://example.slack.com/archives/C123/p123',
        'user-123'
      )
      nameEntity.isValidSlackUrl()

      const nameConnections = [
        createMockSlackConnection({ workspace_id: 'T1111111111', workspace_name: 'Other' }),
        createMockSlackConnection({ workspace_id: 'T2222222222', workspace_name: 'Example' })
      ]

      const nameResult = nameEntity.findBestConnection(nameConnections)
      expect(nameResult?.workspace_id).toBe('T2222222222')
    })

    it('should prioritize exact ID match over name match', () => {
      const url = 'https://T1234567890.slack.com/archives/C123/p123'
      const connections = [
        createMockSlackConnection({
          workspace_id: 'T9999999999',
          workspace_name: 'T1234567890' // Name matches URL workspace
        }),
        createMockSlackConnection({
          workspace_id: 'T1234567890', // ID matches URL workspace
          workspace_name: 'Different Name'
        })
      ]

      const entity = SlackMessageEntity.fromRequest(url, 'user-123')
      entity.isValidSlackUrl()

      const result = entity.findBestConnection(connections)
      expect(result?.workspace_id).toBe('T1234567890')
    })

    it('should handle case-insensitive matching', () => {
      const url = 'https://EXAMPLE-WORKSPACE.slack.com/archives/C123/p123'
      const connections = [
        createMockSlackConnection({
          workspace_name: 'example-workspace',
          workspace_id: 'T1111111111'
        })
      ]

      const entity = SlackMessageEntity.fromRequest(url, 'user-123')
      entity.isValidSlackUrl()

      const result = entity.findBestConnection(connections)
      expect(result?.workspace_id).toBe('T1111111111')
    })
  })

  describe('getConnectionSelectionInfo', () => {
    it('should return correct info for no connection', () => {
      const entity = SlackMessageEntity.fromRequest(VALID_SLACK_URLS[0], 'user-123')
      entity.isValidSlackUrl()

      const info = entity.getConnectionSelectionInfo([], null)

      expect(info.selectionReason).toBe('no_connection')
      expect(info.selectedWorkspace).toBeNull()
      expect(info.totalConnections).toBe(0)
    })

    it('should identify selection reasons correctly', () => {
      // Test exact ID match reason
      const exactEntity = SlackMessageEntity.fromRequest(
        'https://test.slack.com/archives/C123/p123',
        'user-123'
      )
      exactEntity.isValidSlackUrl()

      const exactConnections = [
        createMockSlackConnection({ workspace_id: 'test', workspace_name: 'Target' })
      ]

      const exactSelected = exactEntity.findBestConnection(exactConnections)
      const exactInfo = exactEntity.getConnectionSelectionInfo(exactConnections, exactSelected)

      expect(exactInfo.selectionReason).toBe('exact_id')
      expect(exactInfo.totalConnections).toBe(1)

      // Test fallback reason
      const fallbackEntity = SlackMessageEntity.fromRequest(
        'https://unknown.slack.com/archives/C123/p123',
        'user-123'
      )
      fallbackEntity.isValidSlackUrl()

      const fallbackConnections = [
        createMockSlackConnection({ workspace_id: 'T1111111111', workspace_name: 'First' })
      ]

      const fallbackSelected = fallbackEntity.findBestConnection(fallbackConnections)
      const fallbackInfo = fallbackEntity.getConnectionSelectionInfo(fallbackConnections, fallbackSelected)

      expect(fallbackInfo.selectionReason).toBe('fallback')
      expect(fallbackInfo.totalConnections).toBe(1)
    })

    it('should provide workspace metadata', () => {
      const entity = SlackMessageEntity.fromRequest(VALID_SLACK_URLS[0], 'user-123')
      entity.isValidSlackUrl()

      const connections = [createMockSlackConnection()]
      const selectedConnection = connections[0]
      const info = entity.getConnectionSelectionInfo(connections, selectedConnection)

      expect(info.urlWorkspace).toBeDefined()
      expect(info.selectedWorkspace).toEqual({
        id: selectedConnection.workspace_id,
        name: selectedConnection.workspace_name
      })
    })
  })

  describe('createMessageData', () => {
    it('should create message data with correct format', () => {
      const entity = SlackMessageEntity.fromRequest(VALID_SLACK_URLS[0], 'user-123')
      const connection = createMockSlackConnection()
      const apiResponse = createMockSlackApiResponse()

      const messageData = entity.createMessageData(apiResponse, connection)

      expect(messageData).toEqual({
        text: apiResponse.text,
        user: apiResponse.user,
        timestamp: apiResponse.timestamp,
        channel: apiResponse.channel,
        url: entity.slackUrl,
        workspace: connection.workspace_name
      })
    })

    it('should handle different API response formats', () => {
      const entity = SlackMessageEntity.fromRequest(VALID_SLACK_URLS[0], 'user-123')
      const connection = createMockSlackConnection()
      const customResponse = {
        text: 'Custom message',
        user: 'U9999999999',
        timestamp: '9999999999.999999',
        channel: 'C9999999999',
        extraField: 'should be ignored'
      }

      const messageData = entity.createMessageData(customResponse, connection)

      expect(messageData.text).toBe('Custom message')
      expect(messageData.user).toBe('U9999999999')
      expect(messageData.workspace).toBe(connection.workspace_name)
      expect((messageData as any).extraField).toBeUndefined()
    })
  })

  describe('fromRequest factory method', () => {
    it('should create entity from parameters', () => {
      const slackUrl = VALID_SLACK_URLS[0]
      const userId = 'user-123'

      const entity = SlackMessageEntity.fromRequest(slackUrl, userId)

      expect(entity).toBeInstanceOf(SlackMessageEntity)
      expect(entity.slackUrl).toBe(slackUrl)
      expect(entity.userId).toBe(userId)
    })

    it('should handle edge case parameters', () => {
      const entity = SlackMessageEntity.fromRequest('', '')

      expect(entity).toBeInstanceOf(SlackMessageEntity)
      expect(entity.slackUrl).toBe('')
      expect(entity.userId).toBe('')
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle special characters in workspace names', () => {
      const entity = SlackMessageEntity.fromRequest(EDGE_CASE_DATA.specialCharacters.url, 'user-123')
      entity.isValidSlackUrl()

      const connections = [EDGE_CASE_DATA.specialCharacters.connection]
      const result = entity.findBestConnection(connections)

      expect(result).toBeDefined()
      expect(result?.workspace_name).toContain('🚀')
    })

    it('should handle duplicate workspace IDs', () => {
      const entity = SlackMessageEntity.fromRequest(
        'https://T1234567890.slack.com/archives/C123/p123',
        'user-123'
      )
      entity.isValidSlackUrl()

      const result = entity.findBestConnection(EDGE_CASE_DATA.duplicateWorkspaceIds)
      expect(result?.workspace_id).toBe('T1234567890')
      // Should return first match
      expect(result?.workspace_name).toBe('First')
    })

    it('should handle very long URLs', () => {
      const longUrl = 'https://very-long-workspace-name-that-exceeds-normal-limits.slack.com/archives/C1234567890/p1234567890123456'
      const entity = SlackMessageEntity.fromRequest(longUrl, 'user-123')

      // Should still validate correctly if format is right
      expect(entity.isValidSlackUrl()).toBe(true)
    })

    it('should maintain immutability', () => {
      const originalRequest = createMockSlackMessageRequest()
      const originalUrl = originalRequest.slackUrl
      const entity = new SlackMessageEntity(originalRequest)

      // Modify original request
      originalRequest.slackUrl = 'modified-url'

      // Entity should maintain original values
      expect(entity.slackUrl).toBe(originalUrl)
      expect(entity.slackUrl).not.toBe('modified-url')
    })

    it('should handle null connections gracefully', () => {
      const entity = SlackMessageEntity.fromRequest(VALID_SLACK_URLS[0], 'user-123')

      expect(() => entity.findBestConnection(null as any)).not.toThrow()
      expect(entity.findBestConnection(null as any)).toBeNull()
    })
  })
})
