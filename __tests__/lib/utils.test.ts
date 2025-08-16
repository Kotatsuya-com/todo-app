import {
  cn,
  getDeadlineFromUrgency,
  getQuadrant,
  formatDeadline,
  isOverdue,
  extractUrls,
  linkifyText
} from '@/lib/utils'
import type { Urgency, Quadrant } from '@/src/domain/types'

// Mock the logger to avoid console output during tests
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}))

describe('utils.ts', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional')
    })

    it('should handle empty inputs', () => {
      expect(cn()).toBe('')
      expect(cn('')).toBe('')
    })
  })

  describe('getDeadlineFromUrgency', () => {
    beforeEach(() => {
      // Mock Date to ensure consistent test results
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return today for "today" urgency', () => {
      const result = getDeadlineFromUrgency('today' as Urgency)
      expect(result).toBe('2024-01-15')
    })

    it('should return tomorrow for "tomorrow" urgency', () => {
      const result = getDeadlineFromUrgency('tomorrow' as Urgency)
      expect(result).toBe('2024-01-16')
    })

    it('should return undefined for "later" urgency', () => {
      const result = getDeadlineFromUrgency('later' as Urgency)
      expect(result).toBeUndefined()
    })
  })

  describe('getQuadrant', () => {
    beforeAll(() => {
      jest.useFakeTimers()
      // Set mock date to 2024-01-15 at start of day
      jest.setSystemTime(new Date('2024-01-15T00:00:00Z'))
    })

    afterAll(() => {
      jest.useRealTimers()
    })

    it('should return "urgent_important" for urgent and important task', () => {
      // Use yesterday to ensure it's urgent (overdue)
      const result = getQuadrant('2024-01-14', 0.6)
      expect(result).toBe('urgent_important')
    })

    it('should return "not_urgent_important" for non-urgent but important task', () => {
      const result = getQuadrant('2024-01-20', 0.6)
      expect(result).toBe('not_urgent_important')
    })

    it('should return "urgent_not_important" for urgent but not important task', () => {
      // Use yesterday to ensure it's urgent (overdue)
      const result = getQuadrant('2024-01-14', 0.2)
      expect(result).toBe('urgent_not_important')
    })


    it('should return "not_urgent_not_important" for non-urgent and not important task', () => {
      const result = getQuadrant('2024-01-20', 0.2)
      expect(result).toBe('not_urgent_not_important')
    })

    it('should handle null deadline as non-urgent', () => {
      const result = getQuadrant(null, 0.6)
      expect(result).toBe('not_urgent_important')
    })

    it('should handle undefined deadline as non-urgent', () => {
      const result = getQuadrant(undefined, 0.6)
      expect(result).toBe('not_urgent_important')
    })

    it('should use importance threshold of 0.4', () => {
      // Exactly at threshold should be important
      expect(getQuadrant('2024-01-20', 0.4)).toBe('not_urgent_important')
      // Below threshold should not be important
      expect(getQuadrant('2024-01-20', 0.39)).toBe('not_urgent_not_important')
    })
  })

  describe('formatDeadline', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return "期限なし" for undefined deadline', () => {
      expect(formatDeadline()).toBe('期限なし')
      expect(formatDeadline('')).toBe('期限なし')
    })

    it('should return "今日" for today\'s deadline', () => {
      const result = formatDeadline('2024-01-15')
      expect(result).toBe('今日')
    })

    it('should return "明日" for tomorrow\'s deadline', () => {
      const result = formatDeadline('2024-01-16')
      expect(result).toBe('明日')
    })

    it('should return days for near future deadlines', () => {
      expect(formatDeadline('2024-01-17')).toBe('2日後')
      expect(formatDeadline('2024-01-21')).toBe('6日後')
    })

    it('should return overdue days for past deadlines', () => {
      expect(formatDeadline('2024-01-14')).toBe('1日遅れ')
      expect(formatDeadline('2024-01-10')).toBe('5日遅れ')
    })

    it('should return formatted date for far future deadlines', () => {
      const result = formatDeadline('2024-01-25')
      expect(result).toBe('2024/1/25')
    })
  })

  describe('isOverdue', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return false for undefined deadline', () => {
      expect(isOverdue()).toBe(false)
      expect(isOverdue('')).toBe(false)
    })

    it('should return false for today\'s deadline', () => {
      expect(isOverdue('2024-01-15')).toBe(false)
    })

    it('should return false for future deadlines', () => {
      expect(isOverdue('2024-01-16')).toBe(false)
      expect(isOverdue('2024-01-20')).toBe(false)
    })

    it('should return true for past deadlines', () => {
      expect(isOverdue('2024-01-14')).toBe(true)
      expect(isOverdue('2024-01-10')).toBe(true)
    })
  })

  describe('extractUrls', () => {
    it('should extract single URL', () => {
      const text = 'Check this out: https://example.com'
      const result = extractUrls(text)
      expect(result).toEqual(['https://example.com'])
    })

    it('should extract multiple URLs', () => {
      const text = 'Visit https://example.com and http://test.org for more info'
      const result = extractUrls(text)
      expect(result).toEqual(['https://example.com', 'http://test.org'])
    })

    it('should return empty array for text without URLs', () => {
      const text = 'This text has no URLs'
      const result = extractUrls(text)
      expect(result).toEqual([])
    })

    it('should handle empty string', () => {
      const result = extractUrls('')
      expect(result).toEqual([])
    })

    it('should extract URLs with query parameters', () => {
      const text = 'Search: https://example.com/search?q=test&sort=date'
      const result = extractUrls(text)
      expect(result).toEqual(['https://example.com/search?q=test&sort=date'])
    })
  })

  describe('linkifyText', () => {
    it('should convert single URL to link', () => {
      const text = 'Check this out: https://example.com'
      const result = linkifyText(text)
      const expected = 'Check this out: <a href="https://example.com" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">https://example.com</a>'
      expect(result).toBe(expected)
    })

    it('should convert multiple URLs to links', () => {
      const text = 'Visit https://example.com and http://test.org'
      const result = linkifyText(text)
      expect(result).toContain('<a href="https://example.com"')
      expect(result).toContain('<a href="http://test.org"')
      expect(result).toContain('target="_blank"')
      expect(result).toContain('rel="noopener noreferrer"')
    })

    it('should not modify text without URLs', () => {
      const text = 'This text has no URLs'
      const result = linkifyText(text)
      expect(result).toBe(text)
    })

    it('should handle empty string', () => {
      const result = linkifyText('')
      expect(result).toBe('')
    })

    it('should preserve surrounding text', () => {
      const text = 'Before https://example.com after'
      const result = linkifyText(text)
      expect(result).toContain('Before ')
      expect(result).toContain(' after')
      expect(result).toContain('<a href="https://example.com"')
    })
  })
})
