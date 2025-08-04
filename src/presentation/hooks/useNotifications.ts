/**
 * Notifications Hook for Clean Architecture
 * ブラウザ通知とWebhook通知機能のカスタムフック
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'

export interface NotificationSettings {
  enable_webhook_notifications: boolean
}

export interface UseNotificationsReturn {
  // 通知設定
  notificationSettings: NotificationSettings
  browserPermission: NotificationPermission
  // 状態
  loading: boolean
  error: string | null
  processing: boolean
  // 通知アクション
  updateNotificationSettings: (_settings: Partial<NotificationSettings>) => Promise<void>
  requestBrowserPermission: () => Promise<boolean>
  showNotification: (_title: string, _options?: NotificationOptions) => void
  // Webhook通知アクション
  sendWebhookNotification: (_message: string) => Promise<void>
}

// デフォルト設定
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enable_webhook_notifications: true
}

export const useNotifications = (): UseNotificationsReturn => {
  const { user } = useAuth()

  // State管理
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS)
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  /**
   * 通知設定を取得
   */
  const fetchNotificationSettings = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setError(null)

      const response = await fetch('/api/user/notifications')

      if (response.ok) {
        const data = await response.json()
        setNotificationSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, ...data })
      } else {
        setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS)
      }

    } catch (err) {
      setError('Failed to load notification settings')
      // Error loading notification settings
    } finally {
      setLoading(false)
    }
  }, [user])

  /**
   * 通知設定を更新
   */
  const updateNotificationSettings = useCallback(async (settings: Partial<NotificationSettings>) => {
    setProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/user/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        const updatedSettings = { ...notificationSettings, ...settings }
        setNotificationSettings(updatedSettings)
      } else {
        setError('Failed to update notification settings')
      }
    } catch (err) {
      setError('Failed to update notification settings')
      // Notification settings update error
    } finally {
      setProcessing(false)
    }
  }, [notificationSettings])

  /**
   * ブラウザ通知許可を要求
   */
  const requestBrowserPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      setError('This browser does not support notifications')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      setBrowserPermission(permission)
      return permission === 'granted'
    } catch (err) {
      setError('Failed to request notification permission')
      return false
    }
  }, [])

  /**
   * ブラウザ通知を表示
   */
  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!('Notification' in window)) {
      // This browser does not support notifications
      return
    }

    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        ...options
      })
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, {
            icon: '/favicon.ico',
            ...options
          })
        }
      })
    }
  }, [])

  /**
   * Webhook通知を送信
   */
  const sendWebhookNotification = useCallback(async (message: string): Promise<void> => {
    if (!notificationSettings.enable_webhook_notifications) {
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/user/webhook-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })

      if (!response.ok) {
        // Failed to send webhook notification
      }
    } catch (err) {
      // Webhook notification error
    } finally {
      setProcessing(false)
    }
  }, [notificationSettings.enable_webhook_notifications])

  // ブラウザ通知許可状態をチェック
  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission)
    }
  }, [])

  // 初期化：通知設定を読み込み
  useEffect(() => {
    fetchNotificationSettings()
  }, [fetchNotificationSettings])

  return {
    // 通知設定
    notificationSettings,
    browserPermission,
    // 状態
    loading,
    error,
    processing,
    // 通知アクション
    updateNotificationSettings,
    requestBrowserPermission,
    showNotification,
    // Webhook通知アクション
    sendWebhookNotification
  }
}
