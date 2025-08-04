/**
 * Settings Hook for Clean Architecture
 * 設定機能のカスタムフック（Slack設定、絵文字設定、通知設定を含む）
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { UserEntity } from '@/src/domain/entities/User'

export interface SlackConnection {
  id: string
  workspace_id: string
  workspace_name: string
  team_name: string
  created_at: string
}

export interface SlackWebhook {
  id: string
  webhook_id: string
  is_active: boolean
  event_count: number
  last_event_at?: string
}

export interface EmojiSettings {
  today_emoji: string
  tomorrow_emoji: string
  later_emoji: string
}

export interface NotificationSettings {
  enable_webhook_notifications: boolean
}

export interface UseSettingsReturn {
  user: UserEntity | null
  // Slack設定
  hasSlackConnection: boolean
  slackConnections: SlackConnection[]
  slackWebhooks: SlackWebhook[]
  // 絵文字設定
  emojiSettings: EmojiSettings
  // 通知設定
  notificationSettings: NotificationSettings
  browserPermission: NotificationPermission
  // 状態
  loading: boolean
  error: string | null
  processing: boolean
  // Slack関連アクション
  checkSlackConnection: () => Promise<void>
  connectSlack: () => Promise<void>
  disconnectSlack: (_connectionId: string) => Promise<void>
  createWebhook: (_connectionId: string) => Promise<void>
  deleteWebhook: (_webhookId: string) => Promise<void>
  copyWebhookUrl: (_webhookId: string) => Promise<void>
  // 絵文字設定アクション
  updateEmojiSettings: (_settings: Partial<EmojiSettings>) => Promise<void>
  resetEmojiSettings: () => Promise<void>
  // 通知設定アクション
  updateNotificationSettings: (_settings: Partial<NotificationSettings>) => Promise<void>
  requestBrowserPermission: () => Promise<boolean>
  // OAuth処理
  handleSlackAuth: () => void
}

// デフォルト設定
const DEFAULT_EMOJI_SETTINGS: EmojiSettings = {
  today_emoji: 'fire',
  tomorrow_emoji: 'calendar',
  later_emoji: 'memo'
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enable_webhook_notifications: true
}

export const useSettings = (): UseSettingsReturn => {
  const { user } = useAuth()

  // State管理
  const [hasSlackConnection, setHasSlackConnection] = useState(false)
  const [slackConnections, setSlackConnections] = useState<SlackConnection[]>([])
  const [slackWebhooks, setSlackWebhooks] = useState<SlackWebhook[]>([])
  const [emojiSettings, setEmojiSettings] = useState<EmojiSettings>(DEFAULT_EMOJI_SETTINGS)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS)
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  /**
   * 包括的な設定データを取得
   */
  const fetchAllSettings = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setError(null)

      // 並列でデータを取得
      const [
        connectionsResponse,
        webhooksResponse,
        emojiResponse,
        notificationsResponse
      ] = await Promise.all([
        fetch('/api/slack/connections'),
        fetch('/api/slack/webhook'),
        fetch('/api/user/emoji-settings'),
        fetch('/api/user/notifications')
      ])

      // Slack接続データ
      if (connectionsResponse.ok) {
        const connectionsData = await connectionsResponse.json()
        const connections = connectionsData.connections || []
        setSlackConnections(connections)
        setHasSlackConnection(connections.length > 0)
      }

      // Webhookデータ
      if (webhooksResponse.ok) {
        const webhooksData = await webhooksResponse.json()
        setSlackWebhooks(webhooksData.webhooks || [])
      }

      // 絵文字設定
      if (emojiResponse.ok) {
        const emojiData = await emojiResponse.json()
        setEmojiSettings({ ...DEFAULT_EMOJI_SETTINGS, ...emojiData })
      } else {
        setEmojiSettings(DEFAULT_EMOJI_SETTINGS)
      }

      // 通知設定
      if (notificationsResponse.ok) {
        const notificationData = await notificationsResponse.json()
        setNotificationSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, ...notificationData })
      } else {
        setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS)
      }

    } catch (err) {
      setError('Failed to load settings')
      // Error loading settings
    } finally {
      setLoading(false)
    }
  }, [user])

  // Legacy method for backward compatibility
  const checkSlackConnection = useCallback(async () => {
    await fetchAllSettings()
  }, [fetchAllSettings])

  /**
   * Slack OAuth認証を開始
   */
  const connectSlack = useCallback(async () => {
    setProcessing(true)
    setError(null)

    try {
      // Slack OAuth URLを直接構築
      const response = await fetch('/api/slack/auth')
      if (response.ok) {
        const data = await response.json()
        if (data.authUrl) {
          window.location.href = data.authUrl
        }
      } else {
        setError('Failed to get Slack authentication URL')
      }
    } catch (err) {
      setError('Failed to connect to Slack')
      // Slack connection error
    } finally {
      setProcessing(false)
    }
  }, [])

  /**
   * Slack接続を削除
   */
  const disconnectSlack = useCallback(async (connectionId: string) => {
    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/slack/connections`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId })
      })

      if (response.ok) {
        await fetchAllSettings() // 設定を再読み込み
      } else {
        setError('Failed to disconnect Slack')
      }
    } catch (err) {
      setError('Failed to disconnect Slack')
      // Slack disconnection error
    } finally {
      setProcessing(false)
    }
  }, [fetchAllSettings])

  /**
   * Webhook作成
   */
  const createWebhook = useCallback(async (connectionId: string) => {
    setProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/slack/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slack_connection_id: connectionId })
      })

      if (response.ok) {
        await fetchAllSettings() // 設定を再読み込み
      } else {
        setError('Failed to create webhook')
      }
    } catch (err) {
      setError('Failed to create webhook')
      // Webhook creation error
    } finally {
      setProcessing(false)
    }
  }, [fetchAllSettings])

  /**
   * Webhook削除
   */
  const deleteWebhook = useCallback(async (webhookId: string) => {
    setProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/slack/webhook`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_id: webhookId })
      })

      if (response.ok) {
        await fetchAllSettings() // 設定を再読み込み
      } else {
        setError('Failed to delete webhook')
      }
    } catch (err) {
      setError('Failed to delete webhook')
      // Webhook deletion error
    } finally {
      setProcessing(false)
    }
  }, [fetchAllSettings])

  /**
   * WebhookURLをクリップボードにコピー
   */
  const copyWebhookUrl = useCallback(async (webhookId: string) => {
    try {
      const appUrlResponse = await fetch('/api/app-url')
      const { appUrl } = await appUrlResponse.json()
      const webhookUrl = `${appUrl}/api/slack/events/user/${webhookId}`

      await navigator.clipboard.writeText(webhookUrl)
    } catch (err) {
      setError('Failed to copy webhook URL')
      // Webhook URL copy error
    }
  }, [])

  /**
   * 絵文字設定を更新
   */
  const updateEmojiSettings = useCallback(async (settings: Partial<EmojiSettings>) => {
    setProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/user/emoji-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        const updatedSettings = { ...emojiSettings, ...settings }
        setEmojiSettings(updatedSettings)
      } else {
        setError('Failed to update emoji settings')
      }
    } catch (err) {
      setError('Failed to update emoji settings')
      // Emoji settings update error
    } finally {
      setProcessing(false)
    }
  }, [emojiSettings])

  /**
   * 絵文字設定をリセット
   */
  const resetEmojiSettings = useCallback(async () => {
    await updateEmojiSettings(DEFAULT_EMOJI_SETTINGS)
  }, [updateEmojiSettings])

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
   * Slack OAuth完了処理
   */
  const handleSlackAuth = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const slackAuthRequired = urlParams.get('slack_auth_required')
    const slackCode = urlParams.get('slack_code')

    if (slackAuthRequired && slackCode && user) {
      const timer = setTimeout(() => {
        fetchAllSettings() // 全設定を再読み込み
        window.history.replaceState({}, '', '/settings')
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [user, fetchAllSettings])

  // ブラウザ通知許可状態をチェック
  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission)
    }
  }, [])

  // 初期化：全設定を読み込み
  useEffect(() => {
    fetchAllSettings()
  }, [fetchAllSettings])

  // Slack OAuth完了処理
  useEffect(() => {
    const cleanup = handleSlackAuth()
    return cleanup
  }, [handleSlackAuth])

  return {
    user,
    // Slack設定
    hasSlackConnection,
    slackConnections,
    slackWebhooks,
    // 絵文字設定
    emojiSettings,
    // 通知設定
    notificationSettings,
    browserPermission,
    // 状態
    loading,
    error,
    processing,
    // Slack関連アクション
    checkSlackConnection,
    connectSlack,
    disconnectSlack,
    createWebhook,
    deleteWebhook,
    copyWebhookUrl,
    // 絵文字設定アクション
    updateEmojiSettings,
    resetEmojiSettings,
    // 通知設定アクション
    updateNotificationSettings,
    requestBrowserPermission,
    // OAuth処理
    handleSlackAuth
  }
}
