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

// Mock Auth Repository
class MockAuthRepository implements AuthRepositoryInterface {
  private currentUser: AuthUser | null = null
  private users: Map<string, { email: string; password: string; authUser: AuthUser }> = new Map()

  async signInWithEmail(request: SignInRequest): Promise<{ success: boolean; data?: AuthUser; error?: string }> {
    const userEntry = Array.from(this.users.values()).find(u => u.email === request.email)
    
    if (!userEntry) {
      return { success: false, error: 'User not found' }
    }

    if (userEntry.password !== request.password) {
      return { success: false, error: 'Invalid password' }
    }

    this.currentUser = userEntry.authUser
    return { success: true, data: userEntry.authUser }
  }

  async signUpWithEmail(request: SignUpRequest): Promise<{ success: boolean; data?: AuthUser; error?: string }> {
    if (Array.from(this.users.values()).some(u => u.email === request.email)) {
      return { success: false, error: 'User already exists' }
    }

    const authUser: AuthUser = {
      id: `auth-${Date.now()}`,
      email: request.email
    }

    this.users.set(authUser.id, {
      email: request.email,
      password: request.password,
      authUser
    })

    this.currentUser = authUser
    return { success: true, data: authUser }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    this.currentUser = null
    return { success: true }
  }

  async getCurrentUser(): Promise<{ success: boolean; data?: AuthUser; error?: string }> {
    return this.currentUser 
      ? { success: true, data: this.currentUser }
      : { success: false, error: 'No authenticated user' }
  }

  async refreshSession(): Promise<{ success: boolean; data?: AuthUser; error?: string }> {
    return this.getCurrentUser()
  }

  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
    const userExists = Array.from(this.users.values()).some(u => u.email === email)
    return userExists 
      ? { success: true }
      : { success: false, error: 'User not found' }
  }

  async isSessionValid(): Promise<{ success: boolean; data?: boolean; error?: string }> {
    return { success: true, data: this.currentUser !== null }
  }

  onAuthStateChange(callback: (user: CurrentUserData | null) => void): () => void {
    // Mock implementation - in real implementation this would listen to auth state changes
    return () => {}
  }

  // Helper methods for testing
  setCurrentUser(user: AuthUser | null) {
    this.currentUser = user
  }

  addUser(email: string, password: string, authUser: AuthUser) {
    this.users.set(authUser.id, { email, password, authUser })
  }
}

// Mock User Repository
class MockUserRepository implements UserRepositoryInterface {
  private users: Map<string, UserEntity> = new Map()

  async findById(id: string): Promise<{ success: boolean; data?: UserEntity; error?: string }> {
    const user = this.users.get(id)
    return user 
      ? { success: true, data: user }
      : { success: false, error: 'User not found' }
  }

  async findByEmail(email: string): Promise<{ success: boolean; data?: UserEntity; error?: string }> {
    const user = Array.from(this.users.values()).find(u => u.email === email)
    return user 
      ? { success: true, data: user }
      : { success: false, error: 'User not found' }
  }

  async create(user: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data?: UserEntity; error?: string }> {
    const newUser = new UserEntity({
      ...user,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    this.users.set(newUser.id, newUser)
    return { success: true, data: newUser }
  }

  async update(id: string, updates: Partial<Pick<UserEntity, 'displayName' | 'avatarUrl' | 'totalTodos' | 'completedTodos'>>): Promise<{ success: boolean; data?: UserEntity; error?: string }> {
    const existingUser = this.users.get(id)
    if (!existingUser) {
      return { success: false, error: 'User not found' }
    }

    const updatedUser = new UserEntity({
      ...existingUser,
      ...updates,
      updatedAt: new Date().toISOString()
    })
    this.users.set(id, updatedUser)
    return { success: true, data: updatedUser }
  }

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    if (!this.users.has(id)) {
      return { success: false, error: 'User not found' }
    }
    this.users.delete(id)
    return { success: true }
  }

  async exists(id: string): Promise<{ success: boolean; data?: boolean; error?: string }> {
    return { success: true, data: this.users.has(id) }
  }

  async isEmailTaken(email: string, excludeUserId?: string): Promise<{ success: boolean; data?: boolean; error?: string }> {
    const userWithEmail = Array.from(this.users.values()).find(u => 
      u.email === email && (!excludeUserId || u.id !== excludeUserId)
    )
    return { success: true, data: !!userWithEmail }
  }

  async findAll(): Promise<{ success: boolean; data?: UserEntity[]; error?: string }> {
    return { success: true, data: Array.from(this.users.values()) }
  }

  async findActiveUsers(): Promise<{ success: boolean; data?: UserEntity[]; error?: string }> {
    return { success: true, data: Array.from(this.users.values()) }
  }

  async findNewUsers(): Promise<{ success: boolean; data?: UserEntity[]; error?: string }> {
    return { success: true, data: [] }
  }

  async findInactiveUsers(): Promise<{ success: boolean; data?: UserEntity[]; error?: string }> {
    return { success: true, data: [] }
  }

  // Helper method for testing
  addUser(user: UserEntity) {
    this.users.set(user.id, user)
  }
}

describe('AuthUseCases', () => {
  let mockAuthRepository: MockAuthRepository
  let mockUserRepository: MockUserRepository
  let authUseCases: AuthUseCases

  beforeEach(() => {
    mockAuthRepository = new MockAuthRepository()
    mockUserRepository = new MockUserRepository()
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
      expect(result.data!.userEntity.email).toBe(params.email)
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
      const failingUserRepository = {
        ...mockUserRepository,
        create: jest.fn().mockResolvedValue({ success: false, error: 'Database error' })
      } as any

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
      await mockAuthRepository.signOut() // Sign out to test sign in
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
      expect(result.data!.userEntity.email).toBe(params.email)
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

    it('should handle missing user profile', async () => {
      // Add auth user without user profile
      const authUser: AuthUser = {
        id: 'orphaned-auth-user',
        email: 'orphaned@example.com',
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      mockAuthRepository.addUser('orphaned@example.com', 'password123', authUser)

      const params = {
        email: 'orphaned@example.com',
        password: 'password123'
      }

      const result = await authUseCases.signInWithEmail(params)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User profile not found')
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
      expect(result.data!.userEntity.email).toBe('testuser@example.com')
    })

    it('should handle no authenticated user', async () => {
      const result = await authUseCases.getCurrentUser()

      expect(result.success).toBe(false)
      expect(result.error).toBe('No authenticated user')
    })

    it('should handle missing user profile for authenticated user', async () => {
      // Set auth user without corresponding user profile
      const authUser: AuthUser = {
        id: 'auth-without-profile',
        email: 'noProfile@example.com',
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      mockAuthRepository.setCurrentUser(authUser)

      const result = await authUseCases.getCurrentUser()

      expect(result.success).toBe(false)
      expect(result.error).toBe('User profile not found')
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
      const errorRepository = {
        signInWithEmail: jest.fn().mockRejectedValue(new Error('Network error'))
      } as any

      const useCases = new AuthUseCases(errorRepository, mockUserRepository)

      const result = await useCases.signInWithEmail({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle user repository errors', async () => {
      const errorUserRepository = {
        findByEmail: jest.fn().mockRejectedValue(new Error('Database error'))
      } as any

      const useCases = new AuthUseCases(mockAuthRepository, errorUserRepository)

      // First create auth user
      await mockAuthRepository.signUpWithEmail({
        email: 'test@example.com',
        password: 'password123'
      })

      const result = await useCases.signInWithEmail({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })

    it('should handle unexpected errors', async () => {
      const errorRepository = {
        signInWithEmail: jest.fn().mockRejectedValue('Unexpected error')
      } as any

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