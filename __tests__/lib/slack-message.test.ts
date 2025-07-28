/**
 * @jest-environment node
 */
import {
  parseSlackUrl,
  convertTimestamp,
} from '@/lib/slack-message'

// Mock logger
jest.mock('@/lib/logger', () => ({
  slackLogger: {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }
}))

describe('slack-message.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('parseSlackUrl', () => {
    it('should parse basic channel message URL', () => {
      const url = 'https://workspace.slack.com/archives/C1234567890/p1609459200000100'
      const result = parseSlackUrl(url)
      
      expect(result).toEqual({
        channel: 'C1234567890',
        timestamp: '1609459200000100',
        threadTs: undefined,
      })
    })

    it('should parse thread message URL', () => {
      const url = 'https://workspace.slack.com/archives/C1234567890/p1609459200000100?thread_ts=1609459100.000200'
      const result = parseSlackUrl(url)
      
      expect(result).toEqual({
        channel: 'C1234567890',
        timestamp: '1609459200000100',
        threadTs: '1609459100.000200',
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
        channel: 'C1234567890',
        timestamp: '1609459200000100',
        threadTs: undefined,
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
})