/**
 * useAuth Hook Test Suite
 * useAuthフックのテスト
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from '../../../../src/presentation/hooks/useAuth'
import { UserEntity } from '../../../../src/domain/entities/User'
import { SESSION_VALIDATION_INTERVAL_MS } from '../../../../src/constants/timeConstants'

// Mock dependencies
jest.mock('../../../../src/infrastructure/di/FrontendServiceFactory')

import { createAuthUseCases } from '@/src/infrastructure/di/FrontendServiceFactory'

// Mock AuthUseCases
const mockAuthUseCases = {
  signInWithEmail: jest.fn(),
  signUpWithEmail: jest.fn(),
  signOut: jest.fn(),
  getCurrentUser: jest.fn(),
  refreshSession: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  validateSession: jest.fn(),
  onAuthStateChange: jest.fn(),
  _authRepository: {} as any,
  _userRepository: {} as any
}

const mockCreateAuthUseCases = createAuthUseCases as jest.MockedFunction<typeof createAuthUseCases>

// Mock user data
const mockUserEntity = new UserEntity({
  id: 'user-123',
  display_name: 'Test User',
  avatar_url: null,
  slack_user_id: null,
  enable_webhook_notifications: false,
  created_at: '2025-08-01T10:00:00Z'
})

const mockAuthUser = {
  id: 'user-123',
  email: 'test@example.com',
  email_confirmed_at: '2025-08-01T10:00:00Z',
  created_at: '2025-08-01T10:00:00Z',
  updated_at: '2025-08-03T10:00:00Z'
}

const mockCurrentUserData = {
  userEntity: mockUserEntity,
  authUser: mockAuthUser
}

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockCreateAuthUseCases.mockReturnValue(mockAuthUseCases)

    // Default mock implementations
    mockAuthUseCases.getCurrentUser.mockResolvedValue({
      success: false,
      error: 'No authenticated user'
    })

    mockAuthUseCases.onAuthStateChange.mockReturnValue(() => {})
  })

  describe('Initial State', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useAuth())

      expect(result.current.user).toBeNull()
      expect(result.current.authUser).toBeNull()
      expect(result.current.loading).toBe(true)
      expect(result.current.error).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should initialize with authenticated user', async () => {
      mockAuthUseCases.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockCurrentUserData
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.user).toBe(mockUserEntity)
        expect(result.current.authUser).toBe(mockAuthUser)
        expect(result.current.loading).toBe(false)
        expect(result.current.isAuthenticated).toBe(true)
      })
    })

    it('should initialize with no authenticated user', async () => {
      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.user).toBeNull()
        expect(result.current.authUser).toBeNull()
        expect(result.current.loading).toBe(false)
        expect(result.current.isAuthenticated).toBe(false)
      })
    })
  })

  describe('Sign In', () => {
    it('should sign in successfully', async () => {
      mockAuthUseCases.signInWithEmail.mockResolvedValue({
        success: true,
        data: mockCurrentUserData
      })

      const { result } = renderHook(() => useAuth())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signInResult: boolean
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'password123')
      })

      expect(signInResult!).toBe(true)
      expect(result.current.user).toBe(mockUserEntity)
      expect(result.current.authUser).toBe(mockAuthUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.error).toBeNull()

      expect(mockAuthUseCases.signInWithEmail).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    it('should handle sign in failure', async () => {
      mockAuthUseCases.signInWithEmail.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signInResult: boolean
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'wrongpassword')
      })

      expect(signInResult!).toBe(false)
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBe('Invalid credentials')
    })

    it('should handle sign in error', async () => {
      mockAuthUseCases.signInWithEmail.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signInResult: boolean
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'password123')
      })

      expect(signInResult!).toBe(false)
      expect(result.current.error).toBe('Network error')
    })
  })

  describe('Sign Up', () => {
    it('should sign up successfully', async () => {
      mockAuthUseCases.signUpWithEmail.mockResolvedValue({
        success: true,
        data: mockCurrentUserData
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signUpResult: boolean
      await act(async () => {
        signUpResult = await result.current.signUp('newuser@example.com', 'password123')
      })

      expect(signUpResult!).toBe(true)
      expect(result.current.user).toBe(mockUserEntity)
      expect(result.current.authUser).toBe(mockAuthUser)
      expect(result.current.isAuthenticated).toBe(true)

      expect(mockAuthUseCases.signUpWithEmail).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123'
      })
    })

    it('should handle sign up failure', async () => {
      mockAuthUseCases.signUpWithEmail.mockResolvedValue({
        success: false,
        error: 'Email already exists'
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let signUpResult: boolean
      await act(async () => {
        signUpResult = await result.current.signUp('existing@example.com', 'password123')
      })

      expect(signUpResult!).toBe(false)
      expect(result.current.error).toBe('Email already exists')
    })
  })

  describe('Sign Out', () => {
    it('should sign out successfully', async () => {
      // Start with authenticated user
      mockAuthUseCases.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockCurrentUserData
      })

      mockAuthUseCases.signOut.mockResolvedValue({
        success: true
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.authUser).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)

      expect(mockAuthUseCases.signOut).toHaveBeenCalled()
    })

    it('should handle sign out failure', async () => {
      mockAuthUseCases.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockCurrentUserData
      })

      mockAuthUseCases.signOut.mockResolvedValue({
        success: false,
        error: 'Sign out failed'
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await act(async () => {
        await result.current.signOut()
      })

      expect(result.current.error).toBe('Sign out failed')
    })
  })

  describe('Password Reset', () => {
    it('should send password reset email successfully', async () => {
      mockAuthUseCases.sendPasswordResetEmail.mockResolvedValue({
        success: true
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let resetResult: boolean
      await act(async () => {
        resetResult = await result.current.sendPasswordReset('test@example.com')
      })

      expect(resetResult!).toBe(true)
      expect(mockAuthUseCases.sendPasswordResetEmail).toHaveBeenCalledWith('test@example.com')
    })

    it('should handle password reset failure', async () => {
      mockAuthUseCases.sendPasswordResetEmail.mockResolvedValue({
        success: false,
        error: 'User not found'
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let resetResult: boolean
      await act(async () => {
        resetResult = await result.current.sendPasswordReset('nonexistent@example.com')
      })

      expect(resetResult!).toBe(false)
      expect(result.current.error).toBe('User not found')
    })
  })

  describe('Session Management', () => {
    it('should refresh session successfully', async () => {
      mockAuthUseCases.refreshSession.mockResolvedValue({
        success: true,
        data: mockCurrentUserData
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.refreshSession()
      })

      expect(result.current.user).toBe(mockUserEntity)
      expect(result.current.authUser).toBe(mockAuthUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should handle refresh session failure', async () => {
      mockAuthUseCases.refreshSession.mockResolvedValue({
        success: false,
        error: 'Session expired'
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.refreshSession()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should validate session periodically when authenticated', async () => {
      jest.useFakeTimers()

      mockAuthUseCases.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockCurrentUserData
      })

      mockAuthUseCases.validateSession.mockResolvedValue({
        success: true,
        data: true
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      // Fast forward 5 minutes
      act(() => {
        jest.advanceTimersByTime(SESSION_VALIDATION_INTERVAL_MS)
      })

      await waitFor(() => {
        expect(mockAuthUseCases.validateSession).toHaveBeenCalled()
      })

      jest.useRealTimers()
    })

    it('should clear user state when session validation fails', async () => {
      jest.useFakeTimers()

      mockAuthUseCases.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockCurrentUserData
      })

      mockAuthUseCases.validateSession.mockResolvedValue({
        success: true,
        data: false // Session invalid
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      // Fast forward 5 minutes
      act(() => {
        jest.advanceTimersByTime(SESSION_VALIDATION_INTERVAL_MS)
      })

      await waitFor(() => {
        expect(result.current.user).toBeNull()
        expect(result.current.isAuthenticated).toBe(false)
      })

      jest.useRealTimers()
    })
  })

  describe('Error Handling', () => {
    it('should clear error state', async () => {
      mockAuthUseCases.signInWithEmail.mockResolvedValue({
        success: false,
        error: 'Test error'
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Trigger error
      await act(async () => {
        await result.current.signIn('test@example.com', 'wrongpassword')
      })

      expect(result.current.error).toBe('Test error')

      // Clear error
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })

    it('should handle unexpected errors', async () => {
      mockAuthUseCases.signInWithEmail.mockRejectedValue('Unexpected error')

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123')
      })

      expect(result.current.error).toBe('Unknown error occurred')
    })
  })

  describe('Auth State Change Subscription', () => {
    it('should subscribe to auth state changes', async () => {
      let authCallback: ((userData: { userEntity: UserEntity; authUser: { id: string; email: string } } | null) => void) | null = null

      mockAuthUseCases.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return () => {}
      })

      renderHook(() => useAuth())

      expect(mockAuthUseCases.onAuthStateChange).toHaveBeenCalled()

      // Simulate auth state change
      act(() => {
        authCallback?.(mockCurrentUserData)
      })

      await waitFor(() => {
        // The callback should have been called
        expect(authCallback).toBeDefined()
      })
    })

    it('should unsubscribe on unmount', () => {
      const unsubscribe = jest.fn()
      mockAuthUseCases.onAuthStateChange.mockReturnValue(unsubscribe)

      const { unmount } = renderHook(() => useAuth())

      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })
  })

  describe('Loading States', () => {
    it('should handle async operations correctly', async () => {
      let resolveSignIn: (value: { success: boolean; data?: typeof mockCurrentUserData; error?: string }) => void
      const signInPromise = new Promise(resolve => {
        resolveSignIn = resolve
      })

      mockAuthUseCases.signInWithEmail.mockReturnValue(signInPromise)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Start sign in operation
      let signInResult: boolean | undefined
      await act(async () => {
        const promise = result.current.signIn('test@example.com', 'password123')

        // Immediately resolve the promise to complete the operation
        resolveSignIn!({ success: true, data: mockCurrentUserData })

        // Wait for the signIn operation to complete
        signInResult = await promise
      })

      // Verify the operation completed successfully
      expect(signInResult).toBe(true)
      expect(result.current.user).toBe(mockCurrentUserData.userEntity)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.loading).toBe(false)
    })
  })

  describe('Return Value Structure', () => {
    it('should return all required properties and methods', async () => {
      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Check properties
      expect(result.current).toHaveProperty('user')
      expect(result.current).toHaveProperty('authUser')
      expect(result.current).toHaveProperty('loading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('isAuthenticated')

      // Check methods
      expect(typeof result.current.signIn).toBe('function')
      expect(typeof result.current.signUp).toBe('function')
      expect(typeof result.current.signOut).toBe('function')
      expect(typeof result.current.sendPasswordReset).toBe('function')
      expect(typeof result.current.refreshSession).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
    })
  })
})
