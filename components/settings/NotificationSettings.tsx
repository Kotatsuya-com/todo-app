'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { apiLogger } from '@/lib/client-logger'

interface NotificationSettingsProps {
  onNotificationChange?: (_enabled: boolean) => void
}

export function NotificationSettings({ onNotificationChange }: NotificationSettingsProps) {
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default')

  // ブラウザの通知許可状態をチェック
  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission)
    }
  }, [])

  // 通知設定を取得
  useEffect(() => {
    fetchNotificationSettings()
  }, [])

  const fetchNotificationSettings = async () => {
    try {
      const response = await fetch('/api/user/notifications')
      if (response.ok) {
        const data = await response.json()
        setEnabled(data.enable_webhook_notifications)
      } else {
        apiLogger.error({ status: response.status }, 'Failed to fetch notification settings')
      }
    } catch (error) {
      apiLogger.error({ error }, 'Error fetching notification settings')
    } finally {
      setLoading(false)
    }
  }

  const updateNotificationSettings = async (newEnabled: boolean) => {
    setUpdating(true)
    try {
      const response = await fetch('/api/user/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enable_webhook_notifications: newEnabled
        })
      })

      if (response.ok) {
        setEnabled(newEnabled)
        onNotificationChange?.(newEnabled)
        apiLogger.info({ enabled: newEnabled }, 'Notification settings updated')
      } else {
        const errorData = await response.json()
        apiLogger.error({ error: errorData.error }, 'Failed to update notification settings')
      }
    } catch (error) {
      apiLogger.error({ error }, 'Error updating notification settings')
    } finally {
      setUpdating(false)
    }
  }

  const requestBrowserPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission()
        setBrowserPermission(permission)

        if (permission === 'granted') {
          // テスト通知を表示
          new Notification('通知が有効になりました', {
            body: 'Slackからのタスク作成時に通知を受け取ることができます',
            icon: '/favicon.ico'
          })
        }
      } catch (error) {
        apiLogger.error({ error }, 'Error requesting notification permission')
      }
    }
  }

  const getBrowserPermissionStatus = () => {
    switch (browserPermission) {
      case 'granted':
        return { text: '許可済み', color: 'text-green-600' }
      case 'denied':
        return { text: '拒否されています', color: 'text-red-600' }
      default:
        return { text: '未設定', color: 'text-gray-600' }
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    )
  }

  const permissionStatus = getBrowserPermissionStatus()

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">通知設定</h3>
      </div>

      <div className="space-y-4">
        {/* Webhook通知設定 */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Webhook通知
            </label>
            <p className="text-sm text-gray-500 mt-1">
              Slackの絵文字リアクションでタスクが作成された時にブラウザ通知を受け取る
            </p>
          </div>
          <Button
            onClick={() => updateNotificationSettings(!enabled)}
            disabled={updating}
            variant={enabled ? 'primary' : 'secondary'}
            size="sm"
          >
            {updating ? (
              '更新中...'
            ) : enabled ? (
              <>
                <Bell className="w-4 h-4 mr-1" />
                ON
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4 mr-1" />
                OFF
              </>
            )}
          </Button>
        </div>

        {/* ブラウザ通知許可状態 */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                ブラウザ通知許可
              </label>
              <p className="text-sm text-gray-500 mt-1">
                現在の状態: <span className={permissionStatus.color}>{permissionStatus.text}</span>
              </p>
            </div>
            {browserPermission !== 'granted' && (
              <Button
                onClick={requestBrowserPermission}
                variant="secondary"
                size="sm"
              >
                通知を許可
              </Button>
            )}
          </div>
        </div>

        {/* 注意事項 */}
        {enabled && browserPermission !== 'granted' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-700">
              ⚠️ 通知を受け取るには、ブラウザで通知を許可してください
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
