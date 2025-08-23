/**
 * @jest-environment node
 */

/**
 * UIService Unit Tests
 */

import { UIService, UIServiceRepository } from '@/lib/services/UIService'
import { MockProxy, mock } from 'jest-mock-extended'

describe('UIService', () => {
  let mockRepository: MockProxy<UIServiceRepository>
  let service: UIService

  beforeEach(() => {
    // Mock repository using jest-mock-extended
    mockRepository = mock<UIServiceRepository>()
    service = new UIService(mockRepository)
  })

  describe('checkSlackConnections', () => {
    it('should check Slack connections successfully', async () => {
      const mockConnections = {
        connections: [
          { id: 'conn1', workspace_name: 'Test Workspace', team_name: 'Test Team', created_at: '2023-01-01' }
        ]
      }
      mockRepository.checkSlackConnections.mockResolvedValue({ success: true, data: mockConnections })

      const result = await service.checkSlackConnections()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockConnections)
      expect(mockRepository.checkSlackConnections).toHaveBeenCalled()
    })

    it('should handle check connections failure', async () => {
      mockRepository.checkSlackConnections.mockResolvedValue({
        success: false,
        error: 'Failed to check connections',
        statusCode: 500
      })

      const result = await service.checkSlackConnections()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to check connections')
      expect(result.statusCode).toBe(500)
    })

    it('should handle repository errors', async () => {
      mockRepository.checkSlackConnections.mockRejectedValue(new Error('Network error'))

      const result = await service.checkSlackConnections()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
      expect(result.statusCode).toBe(500)
    })
  })

  describe('fetchSlackMessage', () => {
    it('should fetch Slack message successfully', async () => {
      const slackUrl = 'https://workspace.slack.com/archives/C123/p123456789'
      const mockMessage = {
        text: 'Test Slack message',
        url: slackUrl,
        workspace: 'Test Workspace'
      }
      mockRepository.fetchSlackMessage.mockResolvedValue({ success: true, data: mockMessage })

      const result = await service.fetchSlackMessage(slackUrl)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockMessage)
      expect(mockRepository.fetchSlackMessage).toHaveBeenCalledWith(slackUrl)
    })

    it('should handle empty Slack URL', async () => {
      const result = await service.fetchSlackMessage('')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Slack URL is required')
      expect(result.statusCode).toBe(400)
      expect(mockRepository.fetchSlackMessage).not.toHaveBeenCalled()
    })

    it('should handle whitespace-only Slack URL', async () => {
      const result = await service.fetchSlackMessage('   ')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Slack URL is required')
      expect(result.statusCode).toBe(400)
    })

    it('should handle fetch message failure', async () => {
      const slackUrl = 'https://workspace.slack.com/archives/C123/p123456789'
      mockRepository.fetchSlackMessage.mockResolvedValue({
        success: false,
        error: 'Message not found',
        statusCode: 404
      })

      const result = await service.fetchSlackMessage(slackUrl)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Message not found')
      expect(result.statusCode).toBe(404)
    })
  })

  describe('generateTitle', () => {
    it('should generate title successfully', async () => {
      const content = 'This is sample content for title generation'
      const mockTitle = { title: 'Generated Title' }
      mockRepository.generateTitle.mockResolvedValue({ success: true, data: mockTitle })

      const result = await service.generateTitle(content)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTitle)
      expect(mockRepository.generateTitle).toHaveBeenCalledWith(content)
    })

    it('should handle empty content', async () => {
      const result = await service.generateTitle('')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Content is required for title generation')
      expect(result.statusCode).toBe(400)
      expect(mockRepository.generateTitle).not.toHaveBeenCalled()
    })

    it('should handle whitespace-only content', async () => {
      const result = await service.generateTitle('   ')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Content is required for title generation')
      expect(result.statusCode).toBe(400)
    })

    it('should handle title generation failure', async () => {
      const content = 'Test content'
      mockRepository.generateTitle.mockResolvedValue({
        success: false,
        error: 'OpenAI API error',
        statusCode: 500
      })

      const result = await service.generateTitle(content)

      expect(result.success).toBe(false)
      expect(result.error).toBe('OpenAI API error')
      expect(result.statusCode).toBe(500)
    })

    it('should handle repository errors', async () => {
      const content = 'Test content'
      mockRepository.generateTitle.mockRejectedValue(new Error('Network timeout'))

      const result = await service.generateTitle(content)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network timeout')
      expect(result.statusCode).toBe(500)
    })
  })
})
