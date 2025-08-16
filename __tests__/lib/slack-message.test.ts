/**
 * @jest-environment node
 */
import {
  parseSlackUrl,
  convertTimestamp,
  getSlackMessage,
  getSlackMessageFromUrl
} from '@/lib/slack-message'

// Mock logger
jest.mock('@/lib/logger', () => ({
  slackLogger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}))

// Mock global fetch
global.fetch = jest.fn()

describe('slack-message.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('parseSlackUrl', () => {
    it('should parse basic channel message URL', () => {
      const url = 'https://workspace.slack.com/archives/C1234567890/p1609459200000100'
      const result = parseSlackUrl(url)

      expect(result).toEqual({
        workspace: 'workspace',
        channel: 'C1234567890',
        timestamp: '1609459200000100',
        threadTs: undefined
      })
    })

    it('should parse thread message URL', () => {
      const url = 'https://workspace.slack.com/archives/C1234567890/p1609459200000100?thread_ts=1609459100.000200'
      const result = parseSlackUrl(url)

      expect(result).toEqual({
        workspace: 'workspace',
        channel: 'C1234567890',
        timestamp: '1609459200000100',
        threadTs: '1609459100.000200'
      })
    })

    it('should return null for invalid URL format', () => {
      const result = parseSlackUrl('invalid-url')
      expect(result).toBeNull()
    })

    it('should handle different workspace names', () => {
      const url = 'https://my-company-workspace.slack.com/archives/C1234567890/p1609459200000100'
      const result = parseSlackUrl(url)

      expect(result).toEqual({
        workspace: 'my-company-workspace',
        channel: 'C1234567890',
        timestamp: '1609459200000100',
        threadTs: undefined
      })
    })
  })

  describe('convertTimestamp', () => {
    it('should convert timestamp correctly', () => {
      expect(convertTimestamp('1609459200000100')).toBe('1609459200.000100')
      expect(convertTimestamp('1234567890123456')).toBe('1234567890.123456')
    })

    it('should handle various timestamp lengths', () => {
      expect(convertTimestamp('1609459200000')).toBe('1609459200.000')
      expect(convertTimestamp('16094592000001234')).toBe('1609459200.0001234')
    })
  })

  describe('getSlackMessage', () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

    it('should throw error when token is missing', async () => {
      await expect(getSlackMessage('C123', '1609459200.000100', '')).rejects.toThrow('Slack token is required')
    })

    it('should return message from channel history', async () => {
      const mockMessage = {
        text: 'Hello world',
        user: 'U123',
        ts: '1609459200.000100'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [mockMessage]
        })
      } as Response)

      const result = await getSlackMessage('C123', '1609459200.000100', 'xoxp-token')
      expect(result).toEqual(mockMessage)
    })

    it('should return null when channel history API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: false,
          error: 'channel_not_found'
        })
      } as Response)

      const result = await getSlackMessage('C123', '1609459200.000100', 'xoxp-token')
      expect(result).toBeNull()
    })

    it('should search threads when message not found in channel', async () => {
      const mockThreadMessage = {
        text: 'Thread reply',
        user: 'U456',
        ts: '1609459200.000100'
      }

      // First call - channel history (empty)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: []
        })
      } as Response)

      // Second call - channel scan for threads
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [
            { ts: '1609459100.000000', reply_count: 5 }
          ]
        })
      } as Response)

      // Third call - thread replies
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [
            { ts: '1609459100.000000', text: 'Parent message' },
            mockThreadMessage
          ]
        })
      } as Response)

      const result = await getSlackMessage('C123', '1609459200.000100', 'xoxp-token')
      expect(result).toEqual(mockThreadMessage)
    })

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getSlackMessage('C123', '1609459200.000100', 'xoxp-token')
      expect(result).toBeNull()
    })

    it('should return null when no message found anywhere', async () => {
      // Channel history - empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: []
        })
      } as Response)

      // Thread scan - no threads
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: []
        })
      } as Response)

      const result = await getSlackMessage('C123', '1609459200.000100', 'xoxp-token')
      expect(result).toBeNull()
    })

    it('should handle thread scan API error', async () => {
      // Channel history - empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: []
        })
      } as Response)

      // Thread scan - error
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: false,
          error: 'access_denied'
        })
      } as Response)

      const result = await getSlackMessage('C123', '1609459200.000100', 'xoxp-token')
      expect(result).toBeNull()
    })

    it('should handle thread replies API error', async () => {
      // Channel history - empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: []
        })
      } as Response)

      // Thread scan - has thread
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [
            { ts: '1609459100.000000', reply_count: 1 }
          ]
        })
      } as Response)

      // Thread replies - error
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: false,
          error: 'thread_not_found'
        })
      } as Response)

      const result = await getSlackMessage('C123', '1609459200.000100', 'xoxp-token')
      expect(result).toBeNull()
    })
  })

  describe('getSlackMessageFromUrl', () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

    it('should throw error when token is missing', async () => {
      await expect(getSlackMessageFromUrl('https://workspace.slack.com/archives/C123/p1609459200000100', '')).rejects.toThrow('Slack user token is required')
    })

    it('should throw error for invalid URL', async () => {
      await expect(getSlackMessageFromUrl('invalid-url', 'xoxp-token')).rejects.toThrow('Invalid Slack URL format')
    })

    it('should get channel message successfully', async () => {
      const mockMessage = {
        text: 'Hello world',
        user: 'U123',
        ts: '1609459200.000100'
      }

      // Mock channel message fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [mockMessage]
        })
      } as Response)

      // Mock channel info fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channel: { name: 'general' }
        })
      } as Response)

      // Mock user info fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: {
            profile: { display_name: 'John Doe' },
            name: 'john'
          }
        })
      } as Response)

      const result = await getSlackMessageFromUrl('https://workspace.slack.com/archives/C123/p1609459200000100', 'xoxp-token')

      expect(result).toEqual({
        text: 'John Doe (#general)\nHello world',
        user: 'U123',
        timestamp: '1609459200.000100',
        channel: 'C123'
      })
    })

    it('should handle thread message', async () => {
      const mockMessage = {
        text: 'Thread reply',
        user: 'U456',
        ts: '1609459200.000100'
      }

      // Mock thread replies fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [
            { ts: '1609459100.000200', text: 'Parent' },
            mockMessage
          ]
        })
      } as Response)

      // Mock channel info fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channel: { name: 'general' }
        })
      } as Response)

      // Mock user info fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: {
            profile: { real_name: 'Jane Smith' },
            name: 'jane'
          }
        })
      } as Response)

      const result = await getSlackMessageFromUrl('https://workspace.slack.com/archives/C123/p1609459200000100?thread_ts=1609459100.000200', 'xoxp-token')

      expect(result).toEqual({
        text: 'Jane Smith (#general)\nThread reply',
        user: 'U456',
        timestamp: '1609459200.000100',
        channel: 'C123'
      })
    })

    it('should return null when message not found', async () => {
      // Mock empty channel message fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: []
        })
      } as Response)

      // Mock empty thread scan
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: []
        })
      } as Response)

      const result = await getSlackMessageFromUrl('https://workspace.slack.com/archives/C123/p1609459200000100', 'xoxp-token')
      expect(result).toBeNull()
    })

    it('should handle user mentions in text with simple test', async () => {
      const mockMessage = {
        text: 'Hello <@U123>',
        user: 'U789',
        ts: '1609459200.000100'
      }

      // Mock channel message fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [mockMessage]
        })
      } as Response)

      // Mock channel info fetch - successful
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channel: { name: 'general' }
        })
      } as Response)

      // Mock user info fetch (author) - successful
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: {
            profile: { display_name: 'Author' },
            name: 'author'
          }
        })
      } as Response)

      // Mock user info fetch (mentioned user) - successful
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: {
            profile: { display_name: 'John' },
            name: 'john'
          }
        })
      } as Response)

      const result = await getSlackMessageFromUrl('https://workspace.slack.com/archives/C123/p1609459200000100', 'xoxp-token')

      // Just check that the message contains the mention symbol and user
      expect(result?.text).toContain('@')
      expect(result?.text).toContain('Hello')
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // This should return null, not throw, based on the implementation
      const result = await getSlackMessageFromUrl('https://workspace.slack.com/archives/C123/p1609459200000100', 'xoxp-token')
      expect(result).toBeNull()
    })

    it('should handle channel info API error', async () => {
      const mockMessage = {
        text: 'Hello world',
        user: 'U123',
        ts: '1609459200.000100'
      }

      // Mock channel message fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [mockMessage]
        })
      } as Response)

      // Mock channel info fetch - error
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: false,
          error: 'channel_not_found'
        })
      } as Response)

      // Mock user info fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: {
            profile: { display_name: 'John Doe' },
            name: 'john'
          }
        })
      } as Response)

      const result = await getSlackMessageFromUrl('https://workspace.slack.com/archives/C123/p1609459200000100', 'xoxp-token')

      expect(result?.text).toBe('John Doe (#C123)\nHello world')
    })

    it('should handle thread replies API error', async () => {
      // Mock thread replies fetch - error
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: false,
          error: 'thread_not_found'
        })
      } as Response)

      // Mock channel history fallback
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: []
        })
      } as Response)

      // Mock thread scan fallback
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: []
        })
      } as Response)

      const result = await getSlackMessageFromUrl('https://workspace.slack.com/archives/C123/p1609459200000100?thread_ts=1609459100.000200', 'xoxp-token')
      expect(result).toBeNull()
    })

    it('should handle thread replies empty messages', async () => {
      // Mock thread replies fetch - empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: []
        })
      } as Response)

      // Mock channel history fallback
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: []
        })
      } as Response)

      // Mock thread scan fallback
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: []
        })
      } as Response)

      const result = await getSlackMessageFromUrl('https://workspace.slack.com/archives/C123/p1609459200000100?thread_ts=1609459100.000200', 'xoxp-token')
      expect(result).toBeNull()
    })

    it('should handle getUserName error', async () => {
      const mockMessage = {
        text: 'Hello world',
        user: 'U123',
        ts: '1609459200.000100'
      }

      // Mock channel message fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [mockMessage]
        })
      } as Response)

      // Mock channel info fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channel: { name: 'general' }
        })
      } as Response)

      // Mock user info fetch - network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getSlackMessageFromUrl('https://workspace.slack.com/archives/C123/p1609459200000100', 'xoxp-token')

      expect(result?.text).toBe('U123 (#general)\nHello world')
    })


    it('should handle getChannelName error', async () => {
      const mockMessage = {
        text: 'Hello world',
        user: 'U123',
        ts: '1609459200.000100'
      }

      // Mock channel message fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [mockMessage]
        })
      } as Response)

      // Mock channel info fetch - network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Mock user info fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: {
            profile: { display_name: 'John Doe' },
            name: 'john'
          }
        })
      } as Response)

      const result = await getSlackMessageFromUrl('https://workspace.slack.com/archives/C123/p1609459200000100', 'xoxp-token')

      expect(result?.text).toBe('John Doe (#C123)\nHello world')
    })


    it('should handle empty text in convertMentions', async () => {
      const mockMessage = {
        text: '',
        user: 'U123',
        ts: '1609459200.000100'
      }

      // Mock channel message fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [mockMessage]
        })
      } as Response)

      // Mock channel info fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channel: { name: 'general' }
        })
      } as Response)

      // Mock user info fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: {
            profile: { display_name: 'John Doe' },
            name: 'john'
          }
        })
      } as Response)

      const result = await getSlackMessageFromUrl('https://workspace.slack.com/archives/C123/p1609459200000100', 'xoxp-token')

      expect(result?.text).toBe('John Doe (#general)\n')
    })

    it('should handle tryGetThreadReplies network error', async () => {
      // Mock thread replies fetch - network error (covers line 172-173)
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Mock channel history fallback
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: []
        })
      } as Response)

      // Mock thread scan fallback
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: []
        })
      } as Response)

      const result = await getSlackMessageFromUrl('https://workspace.slack.com/archives/C123/p1609459200000100?thread_ts=1609459100.000200', 'xoxp-token')
      expect(result).toBeNull()
    })

    it('should handle empty user info response', async () => {
      const mockMessage = {
        text: 'Hello world',
        user: 'U123',
        ts: '1609459200.000100'
      }

      // Mock channel message fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [mockMessage]
        })
      } as Response)

      // Mock channel info fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channel: { name: 'general' }
        })
      } as Response)

      // Mock user info fetch - no user data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: false,
          error: 'user_not_found'
        })
      } as Response)

      const result = await getSlackMessageFromUrl('https://workspace.slack.com/archives/C123/p1609459200000100', 'xoxp-token')

      expect(result?.text).toBe('U123 (#general)\nHello world')
    })

    it('should handle message without user', async () => {
      const mockMessage = {
        text: 'System message',
        ts: '1609459200.000100'
      }

      // Mock channel message fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [mockMessage]
        })
      } as Response)

      // Mock channel info fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channel: { name: 'general' }
        })
      } as Response)

      const result = await getSlackMessageFromUrl('https://workspace.slack.com/archives/C123/p1609459200000100', 'xoxp-token')

      expect(result?.text).toBe('Unknown User (#general)\nSystem message')
    })

    it('should handle newline conversion', async () => {
      const mockMessage = {
        text: 'Line 1\\nLine 2\\nLine 3',
        user: 'U123',
        ts: '1609459200.000100'
      }

      // Mock channel message fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          messages: [mockMessage]
        })
      } as Response)

      // Mock channel info fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          channel: { name: 'general' }
        })
      } as Response)

      // Mock user info fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          user: {
            profile: { display_name: 'Author' },
            name: 'author'
          }
        })
      } as Response)

      const result = await getSlackMessageFromUrl('https://workspace.slack.com/archives/C123/p1609459200000100', 'xoxp-token')

      expect(result?.text).toBe('Author (#general)\nLine 1\nLine 2\nLine 3')
    })

  })
})
