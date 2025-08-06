/**
 * UserEntity Test Suite
 * UserEntityのドメインロジックテスト
 */

import { UserEntity } from '../../../../src/domain/entities/User'

describe('UserEntity', () => {
  const mockUserData = {
    id: 'user-123',
    display_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    slack_user_id: 'U1234567890',
    enable_webhook_notifications: true,
    created_at: '2025-08-01T10:00:00Z'
  }

  const mockUserMinimal = {
    id: 'user-456',
    display_name: null,
    avatar_url: null,
    slack_user_id: null,
    enable_webhook_notifications: false,
    created_at: '2025-08-01T10:00:00Z'
  }

  describe('Constructor and Basic Properties', () => {
    it('should create UserEntity with all properties', () => {
      const user = new UserEntity(mockUserData)

      expect(user.id).toBe(mockUserData.id)
      expect(user.displayName).toBe(mockUserData.display_name)
      expect(user.avatarUrl).toBe(mockUserData.avatar_url)
      expect(user.slackUserId).toBe(mockUserData.slack_user_id)
      expect(user.notificationsEnabled).toBe(mockUserData.enable_webhook_notifications)
      expect(user.createdAt).toBe(mockUserData.created_at)
    })

    it('should handle null optional properties', () => {
      const user = new UserEntity(mockUserMinimal)

      expect(user.displayName).toBeNull()
      expect(user.avatarUrl).toBeNull()
      expect(user.slackUserId).toBeNull()
      expect(user.notificationsEnabled).toBe(false)
    })
  })

  describe('Display Methods', () => {
    it('should return display name when available', () => {
      const user = new UserEntity(mockUserData)
      expect(user.getDisplayName()).toBe('Test User')
    })

    it('should return "User" when display name is null', () => {
      const user = new UserEntity(mockUserMinimal)
      expect(user.getDisplayName()).toBe('User')
    })

    it('should return "User" when display name is empty string', () => {
      const userWithEmptyName = { ...mockUserData, display_name: '' }
      const user = new UserEntity(userWithEmptyName)
      expect(user.getDisplayName()).toBe('User')
    })
  })

  describe('Slack Integration', () => {
    it('should correctly identify Slack users', () => {
      const userWithSlack = new UserEntity(mockUserData)
      const userWithoutSlack = new UserEntity(mockUserMinimal)

      expect(userWithSlack.hasSlackUserId()).toBe(true)
      expect(userWithoutSlack.hasSlackUserId()).toBe(false)
    })

    it('should correctly determine webhook notification capability', () => {
      const userWithSlackAndNotif = new UserEntity(mockUserData)
      const userWithSlackNoNotif = new UserEntity({ ...mockUserData, enable_webhook_notifications: false })
      const userNoSlackWithNotif = new UserEntity({ ...mockUserMinimal, enable_webhook_notifications: true })

      expect(userWithSlackAndNotif.canReceiveWebhookNotifications()).toBe(true)
      expect(userWithSlackNoNotif.canReceiveWebhookNotifications()).toBe(false)
      expect(userNoSlackWithNotif.canReceiveWebhookNotifications()).toBe(false)
    })
  })

  describe('User Age and Activity', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-08-08T10:00:00Z'))
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should calculate days from creation correctly', () => {
      const user = new UserEntity(mockUserData)
      expect(user.getDaysFromCreation()).toBe(7) // 7 days from Aug 1 to Aug 8
    })

    it('should identify new users correctly', () => {
      const newUser = new UserEntity({ ...mockUserData, created_at: '2025-08-05T10:00:00Z' })
      const oldUser = new UserEntity({ ...mockUserData, created_at: '2025-07-01T10:00:00Z' })

      expect(newUser.isNewUser()).toBe(true) // 3 days old
      expect(oldUser.isNewUser()).toBe(false) // 38 days old
    })
  })

  describe('Statistics and Progress', () => {
    it('should calculate user statistics correctly', () => {
      const user = new UserEntity(mockUserData)
      const todos = [
        { status: 'open', deadline: '2025-08-10' },
        { status: 'open', deadline: '2025-08-05' }, // overdue
        { status: 'completed', deadline: '2025-08-10' },
        { status: 'completed', deadline: null },
        { status: 'open', deadline: null }
      ]

      const stats = user.calculateStats(todos)

      expect(stats.totalTodos).toBe(5)
      expect(stats.completedTodos).toBe(2)
      expect(stats.activeTodos).toBe(3)
      expect(stats.overdueTodos).toBe(1)
      expect(stats.completionRate).toBe(40) // 2/5 = 40%
    })

    it('should handle empty todos array', () => {
      const user = new UserEntity(mockUserData)
      const stats = user.calculateStats([])

      expect(stats.totalTodos).toBe(0)
      expect(stats.completedTodos).toBe(0)
      expect(stats.activeTodos).toBe(0)
      expect(stats.overdueTodos).toBe(0)
      expect(stats.completionRate).toBe(0)
    })
  })

  describe('Data Validation', () => {
    it('should validate correct user data', () => {
      const user = new UserEntity(mockUserData)
      const validation = user.validate()

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect missing user ID', () => {
      const userWithoutId = new UserEntity({ ...mockUserData, id: '' })
      const validation = userWithoutId.validate()

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('User ID is required')
    })

    it('should detect invalid created_at date', () => {
      const userWithBadDate = new UserEntity({ ...mockUserData, created_at: 'invalid-date' })
      const validation = userWithBadDate.validate()

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Invalid created_at format')
    })
  })

  describe('Update Functionality', () => {
    it('should create new instance with updated data', () => {
      const user = new UserEntity(mockUserData)
      const updatedUser = user.update({ display_name: 'Updated Name' })

      expect(updatedUser).not.toBe(user) // Different instance
      expect(updatedUser.displayName).toBe('Updated Name')
      expect(updatedUser.id).toBe(user.id) // ID unchanged
      expect(user.displayName).toBe('Test User') // Original unchanged
    })

    it('should update multiple fields', () => {
      const user = new UserEntity(mockUserData)
      const updatedUser = user.update({
        display_name: 'New Name',
        avatar_url: 'https://example.com/new-avatar.jpg',
        enable_webhook_notifications: false
      })

      expect(updatedUser.displayName).toBe('New Name')
      expect(updatedUser.avatarUrl).toBe('https://example.com/new-avatar.jpg')
      expect(updatedUser.notificationsEnabled).toBe(false)
    })
  })

  describe('Factory Methods', () => {
    it('should create UserEntity from API response', () => {
      const apiData = {
        id: 'api-user-123',
        display_name: 'API User',
        avatar_url: 'https://api.example.com/avatar.jpg',
        slack_user_id: 'U9876543210',
        enable_webhook_notifications: true,
        created_at: '2025-08-01T10:00:00Z'
      }

      const user = UserEntity.fromApiResponse(apiData)

      expect(user.id).toBe(apiData.id)
      expect(user.displayName).toBe(apiData.display_name)
      expect(user.avatarUrl).toBe(apiData.avatar_url)
      expect(user.slackUserId).toBe(apiData.slack_user_id)
      expect(user.notificationsEnabled).toBe(apiData.enable_webhook_notifications)
    })

    it('should handle missing fields in API response', () => {
      const apiData = {
        id: 'api-user-456',
        created_at: '2025-08-01T10:00:00Z'
      }

      const user = UserEntity.fromApiResponse(apiData)

      expect(user.id).toBe(apiData.id)
      expect(user.displayName).toBeNull()
      expect(user.avatarUrl).toBeNull()
      expect(user.slackUserId).toBeNull()
      expect(user.notificationsEnabled).toBe(true) // Default value
    })

    it('should create UserEntity from auth data', () => {
      jest.useFakeTimers()
      const now = new Date('2025-08-08T10:00:00Z')
      jest.setSystemTime(now)

      const authData = { id: 'auth-user-123' }
      const user = UserEntity.fromAuth(authData)

      expect(user.id).toBe(authData.id)
      expect(user.displayName).toBeNull()
      expect(user.avatarUrl).toBeNull()
      expect(user.slackUserId).toBeNull()
      expect(user.notificationsEnabled).toBe(true)
      expect(user.createdAt).toBe('2025-08-08T10:00:00.000Z')

      jest.useRealTimers()
    })
  })

  describe('Static Utilities', () => {
    it('should validate email addresses correctly', () => {
      expect(UserEntity.isValidEmail('test@example.com')).toBe(true)
      expect(UserEntity.isValidEmail('user.name+tag@example.co.uk')).toBe(true)
      expect(UserEntity.isValidEmail('invalid.email')).toBe(false)
      expect(UserEntity.isValidEmail('@example.com')).toBe(false)
      expect(UserEntity.isValidEmail('test@')).toBe(false)
      expect(UserEntity.isValidEmail('')).toBe(false)
      expect(UserEntity.isValidEmail('a'.repeat(255) + '@example.com')).toBe(false)
    })

    it('should sort users by display name', () => {
      const users = [
        new UserEntity({ ...mockUserData, display_name: 'Charlie' }),
        new UserEntity({ ...mockUserData, display_name: 'Alice' }),
        new UserEntity({ ...mockUserData, display_name: 'Bob' }),
        new UserEntity({ ...mockUserData, display_name: null })
      ]

      const sortedAsc = UserEntity.sortByDisplayName(users, 'asc')
      expect(sortedAsc[0].displayName).toBe('Alice')
      expect(sortedAsc[1].displayName).toBe('Bob')
      expect(sortedAsc[2].displayName).toBe('Charlie')
      expect(sortedAsc[3].displayName).toBeNull() // 'User' comes last

      const sortedDesc = UserEntity.sortByDisplayName(users, 'desc')
      expect(sortedDesc[0].displayName).toBeNull() // 'User' comes first
      expect(sortedDesc[1].displayName).toBe('Charlie')
    })

    it('should sort users by created date', () => {
      const users = [
        new UserEntity({ ...mockUserData, created_at: '2025-08-05T10:00:00Z' }),
        new UserEntity({ ...mockUserData, created_at: '2025-08-01T10:00:00Z' }),
        new UserEntity({ ...mockUserData, created_at: '2025-08-10T10:00:00Z' })
      ]

      const sortedDesc = UserEntity.sortByCreatedDate(users)
      expect(new Date(sortedDesc[0].createdAt).getTime()).toBeGreaterThan(new Date(sortedDesc[1].createdAt).getTime())
    })

    it('should filter new users', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2025-08-08T10:00:00Z'))

      const users = [
        new UserEntity({ ...mockUserData, created_at: '2025-08-05T10:00:00Z' }), // 3 days old
        new UserEntity({ ...mockUserData, created_at: '2025-07-01T10:00:00Z' }), // 38 days old
        new UserEntity({ ...mockUserData, created_at: '2025-08-07T10:00:00Z' })  // 1 day old
      ]

      const newUsers = UserEntity.filterNewUsers(users)
      expect(newUsers).toHaveLength(2)

      jest.useRealTimers()
    })

    it('should filter Slack users', () => {
      const users = [
        new UserEntity({ ...mockUserData, slack_user_id: 'U123' }),
        new UserEntity({ ...mockUserData, slack_user_id: null }),
        new UserEntity({ ...mockUserData, slack_user_id: 'U456' })
      ]

      const slackUsers = UserEntity.filterSlackUsers(users)
      expect(slackUsers).toHaveLength(2)
      expect(slackUsers.every(u => u.hasSlackUserId())).toBe(true)
    })
  })
})