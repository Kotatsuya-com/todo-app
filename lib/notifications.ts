import { Todo } from '@/src/domain/types'
import { apiLogger } from '@/lib/client-logger'

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  onClick?: () => void
}

/**
 * ブラウザ通知の許可状態をチェック
 */
export function checkNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    apiLogger.debug('checkNotificationPermission: Notification API not available in browser')
    return 'denied'
  }
  const permission = Notification.permission
  apiLogger.debug({ permission }, 'checkNotificationPermission: Current browser permission')
  return permission
}

/**
 * ブラウザ通知の許可をリクエスト
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied'
  }

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    apiLogger.error({ error }, 'Failed to request notification permission')
    return 'denied'
  }
}

/**
 * ブラウザ通知を表示
 */
export function showNotification(options: NotificationOptions): Notification | null {
  const permission = checkNotificationPermission()
  apiLogger.debug({
    permission,
    title: options.title,
    body: options.body?.substring(0, 50) + '...'
  }, 'showNotification: Attempting to show notification')

  if (permission !== 'granted') {
    apiLogger.warn({ permission }, 'showNotification: Notification permission not granted')
    return null
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      badge: options.badge,
      tag: options.tag,
      requireInteraction: false,
      silent: false
    })

    apiLogger.info({
      title: options.title,
      tag: options.tag
    }, 'showNotification: Browser notification created successfully')

    if (options.onClick) {
      notification.onclick = () => {
        apiLogger.debug({ tag: options.tag }, 'showNotification: Notification clicked')
        window.focus()
        options.onClick?.()
        notification.close()
      }
    }

    // 自動で5秒後に閉じる
    setTimeout(() => {
      notification.close()
    }, 5000)

    return notification
  } catch (error) {
    apiLogger.error({ error, title: options.title }, 'showNotification: Failed to show notification')
    return null
  }
}

/**
 * Webhook経由で作成されたタスクの通知を表示
 */
export async function showWebhookTaskNotification(todo: Todo): Promise<Notification | null> {
  apiLogger.debug({
    todoId: todo.id,
    title: todo.title,
    deadline: todo.deadline
  }, 'showWebhookTaskNotification: Processing webhook task notification')

  // ユーザー設定をチェック
  try {
    const response = await fetch('/api/user/notifications')
    if (!response.ok) {
      apiLogger.warn('showWebhookTaskNotification: Failed to fetch user notification settings')
      return null
    }
    const data = await response.json()
    if (!data.enable_webhook_notifications) {
      apiLogger.debug('showWebhookTaskNotification: User has disabled webhook notifications, skipping notification')
      return null
    }
  } catch (error) {
    apiLogger.error({ error }, 'showWebhookTaskNotification: Failed to check user notification settings')
    return null
  }

  const urgencyEmoji = {
    today: '⏰',
    tomorrow: '📅',
    later: '📋'
  }

  const urgencyText = {
    today: '今日中',
    tomorrow: '明日',
    later: 'それより後'
  }

  // 緊急度をdeadlineから推測（簡易版）
  let urgency: keyof typeof urgencyEmoji = 'later'
  if (todo.deadline) {
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    if (todo.deadline === today) {
      urgency = 'today'
    } else if (todo.deadline === tomorrow) {
      urgency = 'tomorrow'
    }
  }

  const title = `${urgencyEmoji[urgency]} 新しいタスクが作成されました`
  const body = `${todo.title || 'タイトルなし'} (${urgencyText[urgency]})`

  apiLogger.debug({
    todoId: todo.id,
    urgency,
    title,
    body
  }, 'showWebhookTaskNotification: Prepared notification content')

  const notification = showNotification({
    title,
    body,
    tag: `webhook-task-${todo.id}`,
    onClick: () => {
      apiLogger.debug({ todoId: todo.id }, 'showWebhookTaskNotification: Notification clicked, navigating to dashboard')
      // ダッシュボードにフォーカスを移す
      if (window.location.pathname !== '/') {
        window.location.href = '/'
      }
    }
  })

  apiLogger.debug({
    todoId: todo.id,
    notificationCreated: !!notification
  }, 'showWebhookTaskNotification: Notification creation result')

  return notification
}

/**
 * 通知設定の状態を確認
 */
export async function checkNotificationSettings(): Promise<{
  browserPermission: NotificationPermission
  userEnabled: boolean
}> {
  const browserPermission = checkNotificationPermission()
  apiLogger.debug({ browserPermission }, 'checkNotificationSettings: Browser permission checked')

  try {
    apiLogger.debug('checkNotificationSettings: Fetching user notification settings from API')
    const response = await fetch('/api/user/notifications')
    const data = await response.json()
    apiLogger.debug({
      responseOk: response.ok,
      status: response.status,
      userEnabled: data.enable_webhook_notifications
    }, 'checkNotificationSettings: API response received')

    return {
      browserPermission,
      userEnabled: response.ok ? data.enable_webhook_notifications : false
    }
  } catch (error) {
    apiLogger.error({ error }, 'checkNotificationSettings: Failed to check notification settings')
    return {
      browserPermission,
      userEnabled: false
    }
  }
}
