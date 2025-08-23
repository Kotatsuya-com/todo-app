/**
 * Browser Notifications API Tests
 * ブラウザ通知APIのラッパー機能テスト
 */

import {
  checkNotificationPermission,
  requestNotificationPermission,
  showNotification,
  showWebhookTaskNotification,
  checkNotificationSettings,
  type NotificationOptions
} from '@/lib/notifications'
import { Todo } from '@/src/domain/types'

// Logger をモック
jest.mock('@/lib/client-logger', () => ({
  apiLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}))

// グローバルfetchをモック
global.fetch = jest.fn()

describe('Browser Notifications', () => {
  let mockNotification: any
  let mockWindow: any

  beforeEach(() => {
    // Notification API をモック
    mockNotification = jest.fn() as any
    Object.defineProperty(mockNotification, 'permission', {
      value: 'granted',
      writable: true,
      configurable: true
    })
    mockNotification.requestPermission = jest.fn().mockResolvedValue('granted')

    // Notificationインスタンスのモック
    const mockNotificationInstance = {
      close: jest.fn(),
      onclick: null as any
    } as any
    mockNotification.mockReturnValue(mockNotificationInstance)

    // window.Notification をグローバルに設定
    Object.defineProperty(global, 'window', {
      value: {
        Notification: mockNotification,
        focus: jest.fn(),
        location: {
          pathname: '/',
          href: ''
        }
      },
      writable: true
    })

    // グローバルなNotificationオブジェクトも設定
    Object.defineProperty(global, 'Notification', {
      value: mockNotification,
      writable: true,
      configurable: true
    })

    mockWindow = global.window

    // fetch をリセット
    ;(global.fetch as jest.Mock).mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
    // グローバルオブジェクトをクリーンアップ
    delete (global as any).window
    delete (global as any).Notification
  })

  describe('checkNotificationPermission', () => {
    it('should return granted when Notification API is available and granted', () => {
      Object.defineProperty(mockNotification, 'permission', {
        value: 'granted',
        writable: true,
        configurable: true
      })

      const result = checkNotificationPermission()

      expect(result).toBe('granted')
    })

    it('should return denied when Notification API is available but denied', () => {
      Object.defineProperty(mockNotification, 'permission', {
        value: 'denied',
        writable: true,
        configurable: true
      })

      const result = checkNotificationPermission()

      expect(result).toBe('denied')
    })

    it('should return default when Notification API is available but default', () => {
      Object.defineProperty(mockNotification, 'permission', {
        value: 'default',
        writable: true,
        configurable: true
      })

      const result = checkNotificationPermission()

      expect(result).toBe('default')
    })

    it('should return denied when Notification API is not available', () => {
      // Notification APIを削除
      delete (global.window as any).Notification

      const result = checkNotificationPermission()

      expect(result).toBe('denied')
    })
  })

  describe('requestNotificationPermission', () => {
    it('should request permission and return granted', async () => {
      mockNotification.requestPermission.mockResolvedValue('granted')

      const result = await requestNotificationPermission()

      expect(result).toBe('granted')
      expect(mockNotification.requestPermission).toHaveBeenCalled()
    })

    it('should request permission and return denied', async () => {
      mockNotification.requestPermission.mockResolvedValue('denied')

      const result = await requestNotificationPermission()

      expect(result).toBe('denied')
    })

    it('should return denied when Notification API is not available', async () => {
      delete (global.window as any).Notification

      const result = await requestNotificationPermission()

      expect(result).toBe('denied')
    })

    it('should handle requestPermission exception', async () => {
      mockNotification.requestPermission.mockRejectedValue(new Error('Permission denied'))

      const result = await requestNotificationPermission()

      expect(result).toBe('denied')
    })
  })

  describe('showNotification', () => {
    const mockOptions: NotificationOptions = {
      title: 'Test Title',
      body: 'Test Body'
    }

    beforeEach(() => {
      Object.defineProperty(mockNotification, 'permission', {
        value: 'granted',
        writable: true,
        configurable: true
      })
    })

    it('should create notification with granted permission', () => {
      const result = showNotification(mockOptions)

      expect(result).toBeTruthy()
      expect(mockNotification).toHaveBeenCalledWith('Test Title', {
        body: 'Test Body',
        icon: '/favicon.ico',
        badge: undefined,
        tag: undefined,
        requireInteraction: false,
        silent: false
      })
    })

    it('should return null when permission is denied', () => {
      mockNotification.permission = 'denied'

      const result = showNotification(mockOptions)

      expect(result).toBeNull()
      expect(mockNotification).not.toHaveBeenCalled()
    })

    it('should return null when permission is default', () => {
      mockNotification.permission = 'default'

      const result = showNotification(mockOptions)

      expect(result).toBeNull()
    })

    it('should use custom icon when provided', () => {
      const optionsWithIcon = {
        ...mockOptions,
        icon: '/custom-icon.png'
      }

      showNotification(optionsWithIcon)

      expect(mockNotification).toHaveBeenCalledWith('Test Title', {
        body: 'Test Body',
        icon: '/custom-icon.png',
        badge: undefined,
        tag: undefined,
        requireInteraction: false,
        silent: false
      })
    })

    it('should handle notification with all options', () => {
      const fullOptions: NotificationOptions = {
        title: 'Full Test',
        body: 'Full Body',
        icon: '/test-icon.png',
        badge: '/test-badge.png',
        tag: 'test-tag',
        onClick: jest.fn()
      }

      showNotification(fullOptions)

      expect(mockNotification).toHaveBeenCalledWith('Full Test', {
        body: 'Full Body',
        icon: '/test-icon.png',
        badge: '/test-badge.png',
        tag: 'test-tag',
        requireInteraction: false,
        silent: false
      })
    })

    it('should set onclick handler when provided', () => {
      const mockOnClick = jest.fn()
      const mockNotificationInstance = {
        close: jest.fn(),
        onclick: null as any
      }
      mockNotification.mockReturnValue(mockNotificationInstance)

      const optionsWithClick = {
        ...mockOptions,
        onClick: mockOnClick
      }

      showNotification(optionsWithClick)

      // onclick イベントをシミュレート
      expect(mockNotificationInstance.onclick).toBeTruthy()
      mockNotificationInstance.onclick()

      expect(mockWindow.focus).toHaveBeenCalled()
      expect(mockOnClick).toHaveBeenCalled()
      expect(mockNotificationInstance.close).toHaveBeenCalled()
    })

    it('should handle Notification constructor exception', () => {
      mockNotification.mockImplementation(() => {
        throw new Error('Notification creation failed')
      })

      const result = showNotification(mockOptions)

      expect(result).toBeNull()
    })

    it('should auto-close notification after 5 seconds', () => {
      const mockNotificationInstance = {
        close: jest.fn(),
        onclick: null as any
      }
      mockNotification.mockReturnValue(mockNotificationInstance)

      // setTimeout をモック
      const mockSetTimeout = jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
        expect(delay).toBe(5000)
        // 即座にコールバックを実行
        ;(callback as Function)()
        return {} as any
      })

      showNotification(mockOptions)

      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 5000)
      expect(mockNotificationInstance.close).toHaveBeenCalled()

      mockSetTimeout.mockRestore()
    })
  })

  describe('showWebhookTaskNotification', () => {
    const mockTodo: Todo = {
      id: 'test-todo-123',
      title: 'Test Task',
      body: 'Test task body',
      urgency: 'later',
      importance_score: 1000,
      status: 'open',
      created_at: '2025-01-01T00:00:00Z',
      user_id: 'user-123',
      created_via: 'slack_webhook'
    }

    beforeEach(() => {
      Object.defineProperty(mockNotification, 'permission', {
        value: 'granted',
        writable: true,
        configurable: true
      })

      // ユーザー設定APIのモック（通知有効）
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ enable_webhook_notifications: true })
      })
    })

    it('should show notification for webhook task with today deadline', async () => {
      // 今日の日付を動的に取得して使用
      const today = new Date().toISOString().split('T')[0]
      const todoWithDeadline = { ...mockTodo, deadline: today }

      const result = await showWebhookTaskNotification(todoWithDeadline)

      expect(result).toBeTruthy()
      expect(mockNotification).toHaveBeenCalledWith('⏰ 新しいタスクが作成されました', {
        body: 'Test Task (今日中)',
        icon: '/favicon.ico',
        badge: undefined,
        tag: 'webhook-task-test-todo-123',
        requireInteraction: false,
        silent: false
      })
    })

    it('should show notification for webhook task with tomorrow deadline', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const todoWithDeadline = { ...mockTodo, deadline: tomorrow }

      const result = await showWebhookTaskNotification(todoWithDeadline)

      expect(result).toBeTruthy()
      expect(mockNotification).toHaveBeenCalledWith('📅 新しいタスクが作成されました', expect.objectContaining({
        body: expect.stringContaining('(明日)')
      }))
    })

    it('should show notification for webhook task with later deadline', async () => {
      const later = '2025-12-31'
      const todoWithDeadline = { ...mockTodo, deadline: later }

      const result = await showWebhookTaskNotification(todoWithDeadline)

      expect(result).toBeTruthy()
      expect(mockNotification).toHaveBeenCalledWith('📋 新しいタスクが作成されました', expect.objectContaining({
        body: expect.stringContaining('(それより後)')
      }))
    })

    it('should handle task without title', async () => {
      const todoWithoutTitle = { ...mockTodo, title: '' }

      const result = await showWebhookTaskNotification(todoWithoutTitle)

      expect(result).toBeTruthy()
      expect(mockNotification).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        body: expect.stringContaining('タイトルなし')
      }))
    })

    it('should return null when user has disabled webhook notifications', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ enable_webhook_notifications: false })
      })

      const result = await showWebhookTaskNotification(mockTodo)

      expect(result).toBeNull()
      expect(mockNotification).not.toHaveBeenCalled()
    })

    it('should return null when notification settings API fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500
      })

      const result = await showWebhookTaskNotification(mockTodo)

      expect(result).toBeNull()
    })

    it('should return null when notification settings API throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const result = await showWebhookTaskNotification(mockTodo)

      expect(result).toBeNull()
    })

    it('should set onclick handler to navigate to dashboard', async () => {
      const mockNotificationInstance = {
        close: jest.fn(),
        onclick: null as any
      }
      mockNotification.mockReturnValue(mockNotificationInstance)

      mockWindow.location.pathname = '/settings'

      await showWebhookTaskNotification(mockTodo)

      // onclick イベントをシミュレート
      mockNotificationInstance.onclick()

      expect(mockWindow.location.href).toBe('/')
    })

    it('should not navigate if already on dashboard', async () => {
      const mockNotificationInstance = {
        close: jest.fn(),
        onclick: null as any
      }
      mockNotification.mockReturnValue(mockNotificationInstance)

      mockWindow.location.pathname = '/'
      const originalHref = mockWindow.location.href

      await showWebhookTaskNotification(mockTodo)

      // onclick イベントをシミュレート
      mockNotificationInstance.onclick()

      expect(mockWindow.location.href).toBe(originalHref)
    })
  })

  describe('checkNotificationSettings', () => {
    beforeEach(() => {
      Object.defineProperty(mockNotification, 'permission', {
        value: 'granted',
        writable: true,
        configurable: true
      })
    })

    it('should return both browser and user settings when API succeeds', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ enable_webhook_notifications: true })
      })

      const result = await checkNotificationSettings()

      expect(result).toEqual({
        browserPermission: 'granted',
        userEnabled: true
      })
    })

    it('should return false for userEnabled when API fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500
      })

      const result = await checkNotificationSettings()

      expect(result).toEqual({
        browserPermission: 'granted',
        userEnabled: false
      })
    })

    it('should return false for userEnabled when API throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const result = await checkNotificationSettings()

      expect(result).toEqual({
        browserPermission: 'granted',
        userEnabled: false
      })
    })

    it('should work with different browser permissions', async () => {
      mockNotification.permission = 'denied'
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ enable_webhook_notifications: true })
      })

      const result = await checkNotificationSettings()

      expect(result).toEqual({
        browserPermission: 'denied',
        userEnabled: true
      })
    })

    it('should handle user settings disabled', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ enable_webhook_notifications: false })
      })

      const result = await checkNotificationSettings()

      expect(result).toEqual({
        browserPermission: 'granted',
        userEnabled: false
      })
    })
  })

  // Edge Cases and Browser Compatibility
  describe('Edge Cases', () => {
    it('should handle window object not available (SSR)', () => {
      // 新しいテスト環境を作成してwindowオブジェクトがない状況をシミュレート
      const mockCheckNotificationPermission = () => {
        if (!('Notification' in (global as any))) {
          return 'denied'
        }
        return 'granted'
      }

      // Notificationオブジェクトを一時的に削除
      const originalNotification = (global as any).Notification
      delete (global as any).Notification

      const result = mockCheckNotificationPermission()
      expect(result).toBe('denied')

      // 復元
      if (originalNotification) {
        (global as any).Notification = originalNotification
      }
    })

    it('should handle long notification body gracefully', () => {
      const longBodyOptions: NotificationOptions = {
        title: 'Long Body Test',
        body: 'A'.repeat(1000) // Very long body
      }
      Object.defineProperty(mockNotification, 'permission', {
        value: 'granted',
        writable: true,
        configurable: true
      })

      const result = showNotification(longBodyOptions)

      expect(result).toBeTruthy()
      expect(mockNotification).toHaveBeenCalledWith('Long Body Test', expect.objectContaining({
        body: longBodyOptions.body
      }))
    })

    it('should handle unicode characters in notification', () => {
      const unicodeOptions: NotificationOptions = {
        title: '📋 Unicode Test タイトル',
        body: 'Unicode body テスト 🚀 emoji'
      }
      Object.defineProperty(mockNotification, 'permission', {
        value: 'granted',
        writable: true,
        configurable: true
      })

      const result = showNotification(unicodeOptions)

      expect(result).toBeTruthy()
      expect(mockNotification).toHaveBeenCalledWith('📋 Unicode Test タイトル', expect.objectContaining({
        body: 'Unicode body テスト 🚀 emoji'
      }))
    })
  })
})
