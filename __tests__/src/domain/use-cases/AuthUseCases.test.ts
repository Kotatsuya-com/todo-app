/**
 * AuthUseCases Test Suite
 * AuthUseCasesのビジネスロジックテスト
 */

import { AuthUseCases, CurrentUserData } from '../../../../src/domain/use-cases/AuthUseCases'
import { UserEntity } from '../../../../src/domain/entities/User'
import {
  AuthRepositoryInterface,
  AuthUser,
  SignInRequest,
  SignUpRequest
} from '../../../../src/domain/repositories/AuthRepositoryInterface'
import {
  UserRepositoryInterface
} from '../../../../src/domain/repositories/UserRepositoryInterface'
import { createAutoMock } from '@/__tests__/utils/autoMock'
import { MockProxy } from 'jest-mock-extended'

describe('AuthUseCases', () => {
  let mockAuthRepository: MockProxy<AuthRepositoryInterface>
  let mockUserRepository: MockProxy<UserRepositoryInterface>
  let authUseCases: AuthUseCases

  // Helper for creating test users
  const testUsers = new Map<string, { email: string; password: string; authUser: AuthUser }>()
  let currentUser: AuthUser | null = null

  beforeEach(() => {
    // Clear test data
    testUsers.clear()
    currentUser = null

    // Create auto-mocked repositories
    mockAuthRepository = createAutoMock<AuthRepositoryInterface>()
    mockUserRepository = createAutoMock<UserRepositoryInterface>()

    // Setup default auth repository behavior
    mockAuthRepository.signInWithEmail.mockImplementation(async (request: SignInRequest) => {
      const userEntry = Array.from(testUsers.values()).find(u => u.email === request.email)
      if (!userEntry) {
        return { success: false, error: 'User not found' }
      }
      if (userEntry.password !== request.password) {
        return { success: false, error: 'Invalid password' }
      }
      currentUser = userEntry.authUser
      return { success: true, data: userEntry.authUser }
    })

    mockAuthRepository.signUpWithEmail.mockImplementation(async (request: SignUpRequest) => {
      if (Array.from(testUsers.values()).some(u => u.email === request.email)) {
        return { success: false, error: 'User already exists' }
      }
      const authUser: AuthUser = {
        id: `auth-${Date.now()}`,
        email: request.email
      }
      testUsers.set(authUser.id, {
        email: request.email,
        password: request.password,
        authUser
      })
      currentUser = authUser
      return { success: true, data: authUser }
    })

    mockAuthRepository.signOut.mockImplementation(async () => {
      currentUser = null
      return { success: true }
    })

    mockAuthRepository.getCurrentUser.mockImplementation(async () => {
      return currentUser
        ? { success: true, data: currentUser }
        : { success: false, error: 'No authenticated user' }
    })

    mockAuthRepository.refreshSession.mockImplementation(async () => {
      return mockAuthRepository.getCurrentUser()
    })

    mockAuthRepository.sendPasswordResetEmail.mockImplementation(async (email: string) => {
      const userExists = Array.from(testUsers.values()).some(u => u.email === email)
      return userExists
        ? { success: true }
        : { success: false, error: 'User not found' }
    })

    mockAuthRepository.isSessionValid.mockImplementation(async () => {
      return { success: true, data: currentUser !== null }
    })

    mockAuthRepository.onAuthStateChange.mockImplementation((callback: (user: AuthUser | null) => void) => {
      return () => {}
    })

    // Setup default user repository behavior
    const userStore = new Map<string, UserEntity>()

    mockUserRepository.findById.mockImplementation(async (id: string) => {
      const user = userStore.get(id)
      return { success: true, data: user || null }
    })

    mockUserRepository.create.mockImplementation(async (request) => {
      const newUser = new UserEntity({
        id: request.id,
        display_name: request.display_name || null,
        avatar_url: request.avatar_url || null,
        slack_user_id: request.slack_user_id || null,
        enable_webhook_notifications: request.enable_webhook_notifications ?? true,
        created_at: new Date().toISOString()
      })
      userStore.set(newUser.id, newUser)
      return { success: true, data: newUser }
    })

    mockUserRepository.update.mockImplementation(async (request) => {
      const existingUser = userStore.get(request.id)
      if (!existingUser) {
        return { success: false, error: 'User not found' }
      }
      const updatedUser = existingUser.update({
        display_name: request.display_name,
        avatar_url: request.avatar_url,
        slack_user_id: request.slack_user_id,
        enable_webhook_notifications: request.enable_webhook_notifications
      })
      userStore.set(request.id, updatedUser)
      return { success: true, data: updatedUser }
    })

    mockUserRepository.delete.mockImplementation(async (id: string) => {
      if (!userStore.has(id)) {
        return { success: false, error: 'User not found' }
      }
      userStore.delete(id)
      return { success: true }
    })

    mockUserRepository.exists.mockImplementation(async (id: string) => {
      return { success: true, data: userStore.has(id) }
    })

    mockUserRepository.findAll.mockImplementation(async () => {
      return { success: true, data: Array.from(userStore.values()) }
    })

    mockUserRepository.findActiveUsers.mockImplementation(async () => {
      return { success: true, data: Array.from(userStore.values()) }
    })

    mockUserRepository.findNewUsers.mockImplementation(async () => {
      return { success: true, data: [] }
    })

    mockUserRepository.findSlackUsers.mockImplementation(async () => {
      return { success: true, data: Array.from(userStore.values()).filter(u => u.hasSlackUserId()) }
    })

    authUseCases = new AuthUseCases(mockAuthRepository, mockUserRepository)
  })

  describe('signUpWithEmail', () => {
    it('should create new user and user profile successfully', async () => {
      const params = {
        email: 'newuser@example.com',
        password: 'password123'
      }

      const result = await authUseCases.signUpWithEmail(params)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.authUser.email).toBe(params.email)
      expect(result.data!.userEntity.id).toBe(result.data!.authUser.id)
    })

    it('should handle existing user registration', async () => {
      const params = {
        email: 'existing@example.com',
        password: 'password123'
      }

      // First registration
      await authUseCases.signUpWithEmail(params)

      // Attempt second registration
      const result = await authUseCases.signUpWithEmail(params)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User already exists')
    })

    it('should handle user profile creation failure', async () => {
      const failingUserRepository = createAutoMock<UserRepositoryInterface>()
      failingUserRepository.create.mockResolvedValue({ success: false, error: 'Database error' })

      const useCases = new AuthUseCases(mockAuthRepository, failingUserRepository)

      const params = {
        email: 'test@example.com',
        password: 'password123'
      }

      const result = await useCases.signUpWithEmail(params)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('signInWithEmail', () => {
    beforeEach(async () => {
      // Create a test user
      await authUseCases.signUpWithEmail({
        email: 'testuser@example.com',
        password: 'password123'
      })
      await authUseCases.signOut() // Sign out to test sign in
    })

    it('should sign in existing user successfully', async () => {
      const params = {
        email: 'testuser@example.com',
        password: 'password123'
      }

      const result = await authUseCases.signInWithEmail(params)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.authUser.email).toBe(params.email)
      expect(result.data!.userEntity.id).toBe(result.data!.authUser.id)
    })

    it('should handle invalid credentials', async () => {
      const params = {
        email: 'testuser@example.com',
        password: 'wrongpassword'
      }

      const result = await authUseCases.signInWithEmail(params)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid password')
    })

    it('should handle non-existent user', async () => {
      const params = {
        email: 'nonexistent@example.com',
        password: 'password123'
      }

      const result = await authUseCases.signInWithEmail(params)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
    })

    it('should create missing user profile automatically', async () => {
      // Add auth user without user profile
      const authUser: AuthUser = {
        id: 'orphaned-auth-user',
        email: 'orphaned@example.com',
        emailVerified: true,
        lastSignInAt: new Date().toISOString()
      }

      // Add user to test data
      testUsers.set(authUser.id, {
        email: 'orphaned@example.com',
        password: 'password123',
        authUser
      })

      const params = {
        email: 'orphaned@example.com',
        password: 'password123'
      }

      const result = await authUseCases.signInWithEmail(params)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.authUser.email).toBe('orphaned@example.com')
      expect(result.data!.userEntity.id).toBe('orphaned-auth-user')
    })
  })

  describe('signOut', () => {
    beforeEach(async () => {
      await authUseCases.signUpWithEmail({
        email: 'testuser@example.com',
        password: 'password123'
      })
    })

    it('should sign out successfully', async () => {
      const result = await authUseCases.signOut()

      expect(result.success).toBe(true)

      // Verify user is signed out
      const currentUserResult = await authUseCases.getCurrentUser()
      expect(currentUserResult.success).toBe(false)
    })
  })

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      await authUseCases.signUpWithEmail({
        email: 'testuser@example.com',
        password: 'password123'
      })

      const result = await authUseCases.getCurrentUser()

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.authUser.email).toBe('testuser@example.com')
      expect(result.data!.userEntity.id).toBe(result.data!.authUser.id)
    })

    it('should handle no authenticated user', async () => {
      const result = await authUseCases.getCurrentUser()

      expect(result.success).toBe(false)
      expect(result.error).toBe('No authenticated user')
    })

    it('should create missing user profile for authenticated user', async () => {
      // Set auth user without corresponding user profile
      const authUser: AuthUser = {
        id: 'auth-without-profile',
        email: 'noProfile@example.com',
        emailVerified: true,
        lastSignInAt: new Date().toISOString()
      }

      // Set current user directly
      currentUser = authUser
      mockAuthRepository.getCurrentUser.mockResolvedValueOnce({ success: true, data: authUser })

      const result = await authUseCases.getCurrentUser()

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.authUser.email).toBe('noProfile@example.com')
      expect(result.data!.userEntity.id).toBe('auth-without-profile')
    })
  })

  describe('refreshSession', () => {
    it('should refresh session for authenticated user', async () => {
      await authUseCases.signUpWithEmail({
        email: 'testuser@example.com',
        password: 'password123'
      })

      const result = await authUseCases.refreshSession()

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.authUser.email).toBe('testuser@example.com')
    })

    it('should handle session refresh when not authenticated', async () => {
      const result = await authUseCases.refreshSession()

      expect(result.success).toBe(false)
      expect(result.error).toBe('No authenticated user')
    })
  })

  describe('sendPasswordResetEmail', () => {
    beforeEach(async () => {
      await authUseCases.signUpWithEmail({
        email: 'testuser@example.com',
        password: 'password123'
      })
    })

    it('should send password reset email for existing user', async () => {
      const result = await authUseCases.sendPasswordResetEmail('testuser@example.com')

      expect(result.success).toBe(true)
    })

    it('should handle non-existent user', async () => {
      const result = await authUseCases.sendPasswordResetEmail('nonexistent@example.com')

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
    })
  })

  describe('validateSession', () => {
    it('should validate active session', async () => {
      await authUseCases.signUpWithEmail({
        email: 'testuser@example.com',
        password: 'password123'
      })

      const result = await authUseCases.validateSession()

      expect(result.success).toBe(true)
      expect(result.data).toBe(true)
    })

    it('should validate inactive session', async () => {
      const result = await authUseCases.validateSession()

      expect(result.success).toBe(true)
      expect(result.data).toBe(false)
    })
  })

  describe('onAuthStateChange', () => {
    it('should register auth state change callback', () => {
      const callback = jest.fn()
      const unsubscribe = authUseCases.onAuthStateChange(callback)

      expect(typeof unsubscribe).toBe('function')
    })
  })

  describe('Error Handling', () => {
    it('should handle auth repository errors', async () => {
      const errorRepository = createAutoMock<AuthRepositoryInterface>()
      errorRepository.signInWithEmail.mockRejectedValue(new Error('Network error'))

      const useCases = new AuthUseCases(errorRepository, mockUserRepository)

      const result = await useCases.signInWithEmail({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle user repository errors', async () => {
      // First create auth user
      const authUser: AuthUser = {
        id: 'test-user-id',
        email: 'test@example.com'
      }

      // Add user to test data
      testUsers.set(authUser.id, {
        email: 'test@example.com',
        password: 'password123',
        authUser
      })

      // Simulate repository error
      mockUserRepository.findById.mockResolvedValueOnce({ success: false, error: 'Database error' })

      const result = await authUseCases.signInWithEmail({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })

    it('should handle unexpected errors', async () => {
      const errorRepository = createAutoMock<AuthRepositoryInterface>()
      errorRepository.signInWithEmail.mockRejectedValue('Unexpected error')

      const useCases = new AuthUseCases(errorRepository, mockUserRepository)

      const result = await useCases.signInWithEmail({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error occurred')
    })
  })
})
