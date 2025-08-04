/**
 * UserEntity Test Suite
 * UserEntityのドメインロジックテスト
 */

import { UserEntity } from '../../../../src/domain/entities/User'

describe('UserEntity', () => {
  const mockUserData = {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    totalTodos: 10,
    completedTodos: 5,
    createdAt: '2025-08-01T10:00:00Z',
    updatedAt: '2025-08-03T10:00:00Z'
  }

  const mockUserMinimal = {
    id: 'user-456',
    email: 'minimal@example.com',
    displayName: null,
    avatarUrl: null,
    totalTodos: 0,
    completedTodos: 0,
    createdAt: '2025-08-01T10:00:00Z',
    updatedAt: '2025-08-01T10:00:00Z'
  }

  describe('Constructor and Basic Properties', () => {
    it('should create UserEntity with all properties', () => {
      const user = new UserEntity(mockUserData)

      expect(user.id).toBe(mockUserData.id)
      expect(user.email).toBe(mockUserData.email)
      expect(user.displayName).toBe(mockUserData.displayName)
      expect(user.avatarUrl).toBe(mockUserData.avatarUrl)
      expect(user.totalTodos).toBe(mockUserData.totalTodos)
      expect(user.completedTodos).toBe(mockUserData.completedTodos)
      expect(user.createdAt).toBe(mockUserData.createdAt)
      expect(user.updatedAt).toBe(mockUserData.updatedAt)
    })

    it('should handle null optional properties', () => {
      const user = new UserEntity(mockUserMinimal)

      expect(user.displayName).toBeNull()
      expect(user.avatarUrl).toBeNull()
      expect(user.totalTodos).toBe(0)
      expect(user.completedTodos).toBe(0)
    })
  })

  describe('Display Methods', () => {
    it('should return display name when available', () => {
      const user = new UserEntity(mockUserData)
      expect(user.getDisplayName()).toBe('Test User')
    })

    it('should return email when display name is null', () => {
      const user = new UserEntity(mockUserMinimal)
      expect(user.getDisplayName()).toBe('minimal@example.com')
    })

    it('should return email when display name is empty string', () => {
      const userWithEmptyName = { ...mockUserData, displayName: '' }
      const user = new UserEntity(userWithEmptyName)
      expect(user.getDisplayName()).toBe('test@example.com')
    })

    it('should return initials from display name', () => {
      const user = new UserEntity(mockUserData)
      expect(user.getInitials()).toBe('TU')
    })

    it('should return initials from email when no display name', () => {
      const user = new UserEntity(mockUserMinimal)
      expect(user.getInitials()).toBe('ME')
    })

    it('should handle single name for initials', () => {
      const userSingleName = { ...mockUserData, displayName: 'Alice' }
      const user = new UserEntity(userSingleName)
      expect(user.getInitials()).toBe('A')
    })

    it('should handle email without @ for initials', () => {
      const userInvalidEmail = { ...mockUserMinimal, email: 'invalidemail', displayName: null }
      const user = new UserEntity(userInvalidEmail)
      expect(user.getInitials()).toBe('I')
    })
  })

  describe('Statistics and Progress', () => {
    it('should calculate completion rate correctly', () => {
      const user = new UserEntity(mockUserData)
      expect(user.getCompletionRate()).toBe(0.5) // 5/10 = 50%
    })

    it('should return 0 completion rate when no todos', () => {
      const user = new UserEntity(mockUserMinimal)
      expect(user.getCompletionRate()).toBe(0)
    })

    it('should return 1 completion rate when all todos completed', () => {
      const userAllCompleted = { ...mockUserData, totalTodos: 5, completedTodos: 5 }
      const user = new UserEntity(userAllCompleted)
      expect(user.getCompletionRate()).toBe(1)
    })

    it('should calculate remaining todos correctly', () => {
      const user = new UserEntity(mockUserData)
      expect(user.getRemainingTodos()).toBe(5) // 10 - 5 = 5
    })

    it('should return 0 remaining todos when all completed', () => {
      const userAllCompleted = { ...mockUserData, totalTodos: 5, completedTodos: 5 }
      const user = new UserEntity(userAllCompleted)
      expect(user.getRemainingTodos()).toBe(0)
    })
  })

  describe('Progress Categories', () => {
    it('should identify beginner user', () => {
      const beginnerUser = { ...mockUserData, totalTodos: 2, completedTodos: 1 }
      const user = new UserEntity(beginnerUser)
      expect(user.getProgressCategory()).toBe('beginner')
    })

    it('should identify intermediate user', () => {
      const intermediateUser = { ...mockUserData, totalTodos: 15, completedTodos: 8 }
      const user = new UserEntity(intermediateUser)
      expect(user.getProgressCategory()).toBe('intermediate')
    })

    it('should identify advanced user', () => {
      const advancedUser = { ...mockUserData, totalTodos: 60, completedTodos: 30 }
      const user = new UserEntity(advancedUser)
      expect(user.getProgressCategory()).toBe('advanced')
    })

    it('should identify expert user', () => {
      const expertUser = { ...mockUserData, totalTodos: 150, completedTodos: 75 }
      const user = new UserEntity(expertUser)
      expect(user.getProgressCategory()).toBe('expert')
    })
  })

  describe('Avatar Handling', () => {
    it('should return avatar URL when available', () => {
      const user = new UserEntity(mockUserData)
      expect(user.getAvatarUrl()).toBe('https://example.com/avatar.jpg')
    })

    it('should return null when no avatar URL', () => {
      const user = new UserEntity(mockUserMinimal)
      expect(user.getAvatarUrl()).toBeNull()
    })

    it('should check if user has avatar', () => {
      const userWithAvatar = new UserEntity(mockUserData)
      const userWithoutAvatar = new UserEntity(mockUserMinimal)

      expect(userWithAvatar.hasAvatar()).toBe(true)
      expect(userWithoutAvatar.hasAvatar()).toBe(false)
    })
  })

  describe('Email Validation', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ]

      validEmails.forEach(email => {
        expect(UserEntity.isValidEmail(email)).toBe(true)
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test @example.com',
        ''
      ]

      invalidEmails.forEach(email => {
        expect(UserEntity.isValidEmail(email)).toBe(false)
      })
    })

    it('should validate user email through instance method', () => {
      const userValid = new UserEntity(mockUserData)
      const userInvalid = new UserEntity({ ...mockUserData, email: 'invalid-email' })

      expect(userValid.hasValidEmail()).toBe(true)
      expect(userInvalid.hasValidEmail()).toBe(false)
    })
  })

  describe('Comparison and Equality', () => {
    it('should identify same user by ID', () => {
      const user1 = new UserEntity(mockUserData)
      const user2 = new UserEntity({ ...mockUserData, displayName: 'Different Name' })

      expect(user1.isSameUser(user2)).toBe(true)
    })

    it('should identify different users by ID', () => {
      const user1 = new UserEntity(mockUserData)
      const user2 = new UserEntity({ ...mockUserData, id: 'different-id' })

      expect(user1.isSameUser(user2)).toBe(false)
    })
  })

  describe('User Statistics Summary', () => {
    it('should provide comprehensive user statistics', () => {
      const user = new UserEntity(mockUserData)
      const stats = user.getStatistics()

      expect(stats).toEqual({
        totalTodos: 10,
        completedTodos: 5,
        remainingTodos: 5,
        completionRate: 0.5,
        progressCategory: 'intermediate'
      })
    })

    it('should handle edge case statistics', () => {
      const user = new UserEntity(mockUserMinimal)
      const stats = user.getStatistics()

      expect(stats).toEqual({
        totalTodos: 0,
        completedTodos: 0,
        remainingTodos: 0,
        completionRate: 0,
        progressCategory: 'beginner'
      })
    })
  })

  describe('Factory Methods', () => {
    it('should create user from auth data', () => {
      const authData = {
        id: 'auth-123',
        email: 'auth@example.com',
        user_metadata: {
          display_name: 'Auth User',
          avatar_url: 'https://auth.example.com/avatar.jpg'
        }
      }

      const user = UserEntity.fromAuthUser(authData)

      expect(user.id).toBe('auth-123')
      expect(user.email).toBe('auth@example.com')
      expect(user.displayName).toBe('Auth User')
      expect(user.avatarUrl).toBe('https://auth.example.com/avatar.jpg')
      expect(user.totalTodos).toBe(0)
      expect(user.completedTodos).toBe(0)
    })

    it('should handle auth data without metadata', () => {
      const authData = {
        id: 'auth-456',
        email: 'simple@example.com'
      }

      const user = UserEntity.fromAuthUser(authData)

      expect(user.id).toBe('auth-456')
      expect(user.email).toBe('simple@example.com')
      expect(user.displayName).toBeNull()
      expect(user.avatarUrl).toBeNull()
    })

    it('should create basic user profile', () => {
      const user = UserEntity.createBasicProfile({
        id: 'basic-123',
        email: 'basic@example.com'
      })

      expect(user.id).toBe('basic-123')
      expect(user.email).toBe('basic@example.com')
      expect(user.displayName).toBeNull()
      expect(user.avatarUrl).toBeNull()
      expect(user.totalTodos).toBe(0)
      expect(user.completedTodos).toBe(0)
    })
  })

  describe('Constants', () => {
    it('should have correct progress thresholds', () => {
      expect(UserEntity.PROGRESS_THRESHOLDS).toEqual({
        beginner: 5,
        intermediate: 20,
        advanced: 50,
        expert: 100
      })
    })
  })
})