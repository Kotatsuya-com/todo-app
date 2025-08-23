/**
 * @jest-environment node
 */

// Mock @supabase/ssr
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn()
}))

// Mock next/server
jest.mock('next/server')

// Mock next/headers
const mockCookieStore = {
  get: jest.fn(),
  set: jest.fn()
}

jest.mock('next/headers', () => ({
  cookies: () => mockCookieStore
}))

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>

describe('supabase-server.ts', () => {
  let capturedOptions: any

  beforeEach(() => {
    jest.clearAllMocks()
    capturedOptions = null

    // Setup environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    // Setup mock to capture cookie options
    mockCreateServerClient.mockImplementation((url, key, options) => {
      // Store the options for testing
      capturedOptions = options
      return { mockServerClient: true } as any
    })
  })

  describe('createServerSupabaseClient', () => {
    it('should create server client with correct URL and key', () => {
      createServerSupabaseClient()

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.any(Object)
      )
    })

    it('should return the created client', () => {
      const result = createServerSupabaseClient()
      expect(result).toEqual({ mockServerClient: true })
    })
  })

  describe('cookie get method', () => {
    it('should return cookie value when cookie exists', () => {
      mockCookieStore.get.mockReturnValue({ value: 'testValue' })

      createServerSupabaseClient()
      const cookieOptions = capturedOptions

      const result = cookieOptions.cookies.get('testCookie')
      expect(result).toBe('testValue')
      expect(mockCookieStore.get).toHaveBeenCalledWith('testCookie')
    })

    it('should return undefined when cookie does not exist', () => {
      mockCookieStore.get.mockReturnValue(undefined)

      createServerSupabaseClient()
      const cookieOptions = capturedOptions

      const result = cookieOptions.cookies.get('testCookie')
      expect(result).toBeUndefined()
      expect(mockCookieStore.get).toHaveBeenCalledWith('testCookie')
    })
  })

  describe('cookie set method', () => {
    it('should set cookie with basic options', () => {
      createServerSupabaseClient()
      const cookieOptions = capturedOptions

      cookieOptions.cookies.set('testCookie', 'testValue', {})

      expect(mockCookieStore.set).toHaveBeenCalledWith('testCookie', 'testValue', {})
    })

    it('should set cookie with regular options when not ngrok', () => {
      const mockRequest = {
        nextUrl: { hostname: 'localhost' }
      } as NextRequest

      createServerSupabaseClient(mockRequest)
      const cookieOptions = capturedOptions

      cookieOptions.cookies.set('testCookie', 'testValue', {
        secure: false,
        sameSite: 'lax'
      })

      expect(mockCookieStore.set).toHaveBeenCalledWith('testCookie', 'testValue', {
        secure: false,
        sameSite: 'lax'
      })
    })

    it('should set cookie with ngrok-specific options when in ngrok environment', () => {
      const mockRequest = {
        nextUrl: { hostname: 'abc123.ngrok.io' }
      } as NextRequest

      createServerSupabaseClient(mockRequest)
      const cookieOptions = capturedOptions

      cookieOptions.cookies.set('testCookie', 'testValue', {
        secure: false,
        sameSite: 'lax'
      })

      expect(mockCookieStore.set).toHaveBeenCalledWith('testCookie', 'testValue', {
        secure: true,
        sameSite: 'none'
      })
    })

    it('should handle cookie set errors gracefully', () => {
      mockCookieStore.set.mockImplementation(() => {
        throw new Error('Cookie set failed')
      })

      createServerSupabaseClient()
      const cookieOptions = capturedOptions

      // Should not throw error
      expect(() => {
        cookieOptions.cookies.set('testCookie', 'testValue', {})
      }).not.toThrow()
    })

    it('should handle undefined request gracefully', () => {
      createServerSupabaseClient(undefined)
      const cookieOptions = capturedOptions

      cookieOptions.cookies.set('testCookie', 'testValue', {
        secure: false,
        sameSite: 'lax'
      })

      expect(mockCookieStore.set).toHaveBeenCalledWith('testCookie', 'testValue', {
        secure: false,
        sameSite: 'lax'
      })
    })
  })

  describe('cookie remove method', () => {
    it('should remove cookie by setting it with maxAge 0', () => {
      createServerSupabaseClient()
      const cookieOptions = capturedOptions

      cookieOptions.cookies.remove('testCookie', { path: '/' })

      expect(mockCookieStore.set).toHaveBeenCalledWith('testCookie', '', {
        path: '/',
        maxAge: 0
      })
    })

    it('should handle cookie remove errors gracefully', () => {
      mockCookieStore.set.mockImplementation(() => {
        throw new Error('Cookie remove failed')
      })

      createServerSupabaseClient()
      const cookieOptions = capturedOptions

      // Should not throw error
      expect(() => {
        cookieOptions.cookies.remove('testCookie', {})
      }).not.toThrow()
    })
  })
})
