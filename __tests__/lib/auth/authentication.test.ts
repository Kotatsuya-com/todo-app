/**
 * Authentication Module Tests
 * 認証処理の単体テスト - セキュリティ機能の完全テスト
 */

import { NextRequest } from 'next/server'
import {
  authenticateUser,
  requireAuthentication,
  AuthenticationError,
  withAuthentication,
  validateUserId,
  isAdminUser,
  getSessionInfo,
  type AuthenticationResult
} from '@/lib/auth/authentication'

// Supabaseクライアントをモック
jest.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: jest.fn()
}))

import { createServerSupabaseClient } from '@/lib/supabase-server'

describe('Authentication Module', () => {
  let mockSupabaseClient: jest.Mocked<any>
  let mockRequest: NextRequest

  beforeEach(() => {
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
        getSession: jest.fn()
      }
    }
    ;(createServerSupabaseClient as jest.Mock).mockReturnValue(mockSupabaseClient)

    mockRequest = {
      headers: new Headers(),
      url: 'https://example.com/api/test'
    } as NextRequest
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('authenticateUser', () => {
    it('should authenticate user successfully', async () => {
      const mockUser = { id: 'user-123' }
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result: AuthenticationResult = await authenticateUser(mockRequest)

      expect(result.success).toBe(true)
      expect(result.userId).toBe('user-123')
      expect(result.error).toBeUndefined()
      expect(result.statusCode).toBeUndefined()
      expect(createServerSupabaseClient).toHaveBeenCalledWith(mockRequest)
    })

    it('should handle authentication error from Supabase', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      })

      const result = await authenticateUser(mockRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Authentication failed')
      expect(result.statusCode).toBe(401)
      expect(result.userId).toBeUndefined()
    })

    it('should handle missing user (no authentication)', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await authenticateUser(mockRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
      expect(result.statusCode).toBe(401)
      expect(result.userId).toBeUndefined()
    })

    it('should handle Supabase client exception', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Network error'))

      const result = await authenticateUser(mockRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Authentication error')
      expect(result.statusCode).toBe(500)
      expect(result.userId).toBeUndefined()
    })

    it('should work without request parameter', async () => {
      const mockUser = { id: 'user-456' }
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await authenticateUser()

      expect(result.success).toBe(true)
      expect(result.userId).toBe('user-456')
      expect(createServerSupabaseClient).toHaveBeenCalledWith(undefined)
    })
  })

  describe('requireAuthentication', () => {
    it('should return userId on successful authentication', async () => {
      const mockUser = { id: 'user-789' }
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const userId = await requireAuthentication(mockRequest)

      expect(userId).toBe('user-789')
    })

    it('should throw error on authentication failure', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      })

      await expect(requireAuthentication(mockRequest)).rejects.toThrow('Authentication failed')
    })

    it('should throw error on missing user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      await expect(requireAuthentication(mockRequest)).rejects.toThrow('Unauthorized')
    })

    it('should set correct statusCode on error', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      })

      try {
        await requireAuthentication(mockRequest)
      } catch (error) {
        expect((error as any).statusCode).toBe(401)
      }
    })
  })

  describe('AuthenticationError', () => {
    it('should create error with default statusCode', () => {
      const error = new AuthenticationError('Test error')

      expect(error.message).toBe('Test error')
      expect(error.name).toBe('AuthenticationError')
      expect(error.statusCode).toBe(401)
      expect(error).toBeInstanceOf(Error)
    })

    it('should create error with custom statusCode', () => {
      const error = new AuthenticationError('Forbidden', 403)

      expect(error.message).toBe('Forbidden')
      expect(error.statusCode).toBe(403)
    })
  })

  describe('withAuthentication', () => {
    const mockHandler = jest.fn()

    beforeEach(() => {
      mockHandler.mockClear()
    })

    it('should execute handler with authenticated userId', async () => {
      const mockUser = { id: 'user-123' }
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      mockHandler.mockResolvedValue('handler result')

      const result = await withAuthentication(mockRequest, mockHandler)

      expect(result).toBe('handler result')
      expect(mockHandler).toHaveBeenCalledWith('user-123')
    })

    it('should throw AuthenticationError on authentication failure', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      })

      await expect(withAuthentication(mockRequest, mockHandler)).rejects.toThrow('Authentication failed')
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it('should re-throw AuthenticationError as-is', async () => {
      const mockUser = { id: 'user-123' }
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      const authError = new AuthenticationError('Custom auth error', 403)
      mockHandler.mockRejectedValue(authError)

      await expect(withAuthentication(mockRequest, mockHandler)).rejects.toThrow(authError)
    })

    it('should re-throw non-authentication errors', async () => {
      const mockUser = { id: 'user-123' }
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      const businessError = new Error('Business logic error')
      mockHandler.mockRejectedValue(businessError)

      await expect(withAuthentication(mockRequest, mockHandler)).rejects.toThrow(businessError)
    })
  })

  describe('validateUserId', () => {
    it('should validate correct UUID v4 format', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      ]

      validUUIDs.forEach(uuid => {
        expect(validateUserId(uuid)).toBe(true)
      })
    })

    it('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        '',
        'not-a-uuid',
        '123',
        '123e4567-e89b-12d3-a456-426614174000-extra',
        '123e4567-e89b-12d3-a456',
        'gggggggg-gggg-gggg-gggg-gggggggggggg'
      ]

      invalidUUIDs.forEach(uuid => {
        expect(validateUserId(uuid)).toBe(false)
      })
    })

    it('should handle case insensitivity', () => {
      const uppercaseUUID = '123E4567-E89B-12D3-A456-426614174000'
      const lowercaseUUID = '123e4567-e89b-12d3-a456-426614174000'

      expect(validateUserId(uppercaseUUID)).toBe(true)
      expect(validateUserId(lowercaseUUID)).toBe(true)
    })
  })

  describe('isAdminUser', () => {
    it('should always return false (not implemented)', async () => {
      const result = await isAdminUser('user-123')
      expect(result).toBe(false)
    })

    it('should handle empty userId', async () => {
      const result = await isAdminUser('')
      expect(result).toBe(false)
    })
  })

  describe('getSessionInfo', () => {
    it('should return session info on valid authentication', async () => {
      const mockUser = { id: 'user-123' }
      const mockSession = { expires_at: 1640995200 } // 2022-01-01 00:00:00

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const result = await getSessionInfo(mockRequest)

      expect(result.isAuthenticated).toBe(true)
      expect(result.userId).toBe('user-123')
      expect(result.sessionExpiry).toBe('2022-01-01T00:00:00.000Z')
    })

    it('should return unauthenticated on user error', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      })
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await getSessionInfo(mockRequest)

      expect(result.isAuthenticated).toBe(false)
      expect(result.userId).toBeUndefined()
      expect(result.sessionExpiry).toBeUndefined()
    })

    it('should return unauthenticated on session error', async () => {
      const mockUser = { id: 'user-123' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' }
      })

      const result = await getSessionInfo(mockRequest)

      expect(result.isAuthenticated).toBe(false)
      expect(result.userId).toBeUndefined()
      expect(result.sessionExpiry).toBeUndefined()
    })

    it('should handle missing user or session', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await getSessionInfo(mockRequest)

      expect(result.isAuthenticated).toBe(false)
    })

    it('should handle Supabase client exception', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Network error'))

      const result = await getSessionInfo(mockRequest)

      expect(result.isAuthenticated).toBe(false)
    })

    it('should work without request parameter', async () => {
      const mockUser = { id: 'user-456' }
      const mockSession = { expires_at: 1640995200 }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      const result = await getSessionInfo()

      expect(result.isAuthenticated).toBe(true)
      expect(result.userId).toBe('user-456')
      expect(createServerSupabaseClient).toHaveBeenCalledWith(undefined)
    })
  })

  // Edge Cases and Error Handling
  describe('Edge Cases', () => {
    it('should handle malformed user objects', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: null } },
        error: null
      })

      const result = await authenticateUser(mockRequest)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })

    it('should handle undefined/null request gracefully', async () => {
      const mockUser = { id: 'user-123' }
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Test with null
      const result1 = await authenticateUser(null as any)
      expect(result1.success).toBe(true)

      // Test with undefined
      const result2 = await authenticateUser(undefined)
      expect(result2.success).toBe(true)
    })

    it('should handle very long userIds in validation', () => {
      const longString = 'a'.repeat(1000)
      expect(validateUserId(longString)).toBe(false)
    })
  })
})
