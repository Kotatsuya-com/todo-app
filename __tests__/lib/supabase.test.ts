/**
 * @jest-environment node
 */

// Mock @supabase/ssr
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn()
}))

import { createClient } from '@/lib/supabase'
import { createBrowserClient } from '@supabase/ssr'

const mockCreateBrowserClient = createBrowserClient as jest.MockedFunction<typeof createBrowserClient>

describe('supabase.ts', () => {
  let originalDocument: any
  let originalWindow: any
  let capturedOptions: any

  beforeEach(() => {
    jest.clearAllMocks()
    capturedOptions = null

    // Setup environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    // Store original globals
    originalDocument = global.document
    originalWindow = global.window

    // Mock document
    Object.defineProperty(global, 'document', {
      value: {
        cookie: ''
      },
      writable: true
    })

    // Mock window
    Object.defineProperty(global, 'window', {
      value: {
        location: {
          hostname: 'localhost'
        }
      },
      writable: true
    })

    // Setup mock to capture cookie options
    mockCreateBrowserClient.mockImplementation((url, key, options) => {
      // Store the options for testing
      capturedOptions = options
      return { mockClient: true }
    })
  })

  afterEach(() => {
    // Restore original globals
    global.document = originalDocument
    global.window = originalWindow
  })

  describe('createClient', () => {
    it('should create browser client with correct URL and key', () => {
      createClient()

      expect(mockCreateBrowserClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.any(Object)
      )
    })

    it('should return the created client', () => {
      const result = createClient()
      expect(result).toEqual({ mockClient: true })
    })
  })

  describe('cookie get method', () => {
    it('should return cookie value when document exists and cookie found', () => {
      global.document.cookie = 'testCookie=testValue; otherCookie=otherValue'

      createClient()
      const cookieOptions = capturedOptions

      const result = cookieOptions.cookies.get('testCookie')
      expect(result).toBe('testValue')
    })

    it('should return undefined when cookie not found', () => {
      global.document.cookie = 'otherCookie=otherValue'

      createClient()
      const cookieOptions = capturedOptions

      const result = cookieOptions.cookies.get('testCookie')
      expect(result).toBeUndefined()
    })

    it('should return undefined when document is undefined', () => {
      // Delete document to simulate SSR
      delete (global as any).document

      createClient()
      const cookieOptions = capturedOptions

      const result = cookieOptions.cookies.get('testCookie')
      expect(result).toBeUndefined()
    })

    it('should return undefined when cookie string is empty', () => {
      global.document.cookie = ''

      createClient()
      const cookieOptions = capturedOptions

      const result = cookieOptions.cookies.get('testCookie')
      expect(result).toBeUndefined()
    })

    it('should return undefined when cookie format is invalid', () => {
      global.document.cookie = 'invalidCookieFormat'

      createClient()
      const cookieOptions = capturedOptions

      const result = cookieOptions.cookies.get('testCookie')
      expect(result).toBeUndefined()
    })
  })

  describe('cookie set method', () => {
    it('should set cookie with basic options', () => {
      createClient()
      const cookieOptions = capturedOptions

      cookieOptions.cookies.set('testCookie', 'testValue', {})

      expect(global.document.cookie).toBe('testCookie=testValue')
    })

    it('should set cookie with all options', () => {
      createClient()
      const cookieOptions = capturedOptions

      cookieOptions.cookies.set('testCookie', 'testValue', {
        path: '/',
        domain: '.example.com',
        maxAge: 3600,
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
      })

      expect(global.document.cookie).toBe(
        'testCookie=testValue; path=/; domain=.example.com; max-age=3600; httponly; secure; samesite=strict'
      )
    })

    it('should skip domain option when in ngrok environment', () => {
      global.window.location.hostname = 'abc123.ngrok.io'

      createClient()
      const cookieOptions = capturedOptions

      cookieOptions.cookies.set('testCookie', 'testValue', {
        path: '/',
        domain: '.example.com'
      })

      expect(global.document.cookie).toBe(
        'testCookie=testValue; path=/; secure; samesite=none'
      )
    })

    it('should add ngrok-specific options when in ngrok environment', () => {
      global.window.location.hostname = 'test.ngrok.io'

      createClient()
      const cookieOptions = capturedOptions

      cookieOptions.cookies.set('testCookie', 'testValue', {})

      expect(global.document.cookie).toBe(
        'testCookie=testValue; secure; samesite=none'
      )
    })

    it('should not set cookie when document is undefined', () => {
      delete (global as any).document

      createClient()
      const cookieOptions = capturedOptions

      // Should not throw error
      expect(() => {
        cookieOptions.cookies.set('testCookie', 'testValue', {})
      }).not.toThrow()
    })
  })

  describe('cookie remove method', () => {
    it('should remove cookie with basic options', () => {
      createClient()
      const cookieOptions = capturedOptions

      cookieOptions.cookies.remove('testCookie', {})

      expect(global.document.cookie).toBe(
        'testCookie=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      )
    })

    it('should remove cookie with path and domain options', () => {
      createClient()
      const cookieOptions = capturedOptions

      cookieOptions.cookies.remove('testCookie', {
        path: '/',
        domain: '.example.com'
      })

      expect(global.document.cookie).toBe(
        'testCookie=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.example.com'
      )
    })

    it('should not remove cookie when document is undefined', () => {
      delete (global as any).document

      createClient()
      const cookieOptions = capturedOptions

      // Should not throw error
      expect(() => {
        cookieOptions.cookies.remove('testCookie', {})
      }).not.toThrow()
    })
  })
})
