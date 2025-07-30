'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { showWebhookTaskNotification, isNotificationAvailable } from '@/lib/notifications'
import { Todo } from '@/types'
import { apiLogger } from '@/lib/client-logger'

interface UseWebhookNotificationsOptions {
  enabled?: boolean
  userId?: string
}

/**
 * Webhook経由で作成されたタスクをリアルタイムで検出し、通知を表示するフック
 */
export function useWebhookNotifications({ enabled = true, userId }: UseWebhookNotificationsOptions = {}) {
  const channelRef = useRef<any>(null)
  const lastNotificationRef = useRef<string | null>(null)

  useEffect(() => {
    apiLogger.debug({ 
      enabled, 
      userId: userId ? `${userId.substring(0, 8)}...` : 'null' 
    }, 'useWebhookNotifications: Hook called')

    if (!enabled || !userId) {
      apiLogger.debug({ enabled, hasUserId: !!userId }, 'useWebhookNotifications: Skipping setup - disabled or no user')
      return
    }

    const setupRealtimeSubscription = async () => {
      apiLogger.debug({ userId: userId.substring(0, 8) + '...' }, 'useWebhookNotifications: Setting up realtime subscription')
      
      // 通知が利用可能かチェック
      try {
        const notificationAvailable = await isNotificationAvailable()
        apiLogger.debug({ notificationAvailable }, 'useWebhookNotifications: Notification availability checked')
        
        if (!notificationAvailable) {
          apiLogger.warn('useWebhookNotifications: Notifications not available, skipping subscription')
          return
        }
      } catch (error) {
        apiLogger.error({ error }, 'useWebhookNotifications: Failed to check notification availability')
        return
      }

      const supabase = createClient()

      try {
        // 既存のチャンネルがあれば削除
        if (channelRef.current) {
          apiLogger.debug('useWebhookNotifications: Removing existing channel')
          await supabase.removeChannel(channelRef.current)
          apiLogger.debug('useWebhookNotifications: Existing channel removed')
        }

        // ユーザー固有のtodosテーブルの変更を監視
        const channelName = `webhook-notifications-${userId}`
        apiLogger.debug({ channelName, userId: userId.substring(0, 8) + '...' }, 'useWebhookNotifications: Creating realtime channel')
        
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'todos',
              filter: `user_id=eq.${userId}`
            },
            async (payload) => {
              apiLogger.debug({ payload }, 'useWebhookNotifications: Realtime event received')
              const newTodo = payload.new as Todo
              
              apiLogger.info({
                todoId: newTodo.id,
                title: newTodo.title,
                createdAt: newTodo.created_at,
                userId: userId.substring(0, 8) + '...'
              }, 'useWebhookNotifications: New todo detected via realtime')

              // 短時間内の重複通知を防ぐ
              if (lastNotificationRef.current === newTodo.id) {
                apiLogger.debug({ todoId: newTodo.id }, 'Duplicate notification prevented')
                return
              }

              lastNotificationRef.current = newTodo.id

              // 少し待ってから通知を表示（他の処理が完了するのを待つ）
              setTimeout(async () => {
                apiLogger.debug({ todoId: newTodo.id }, 'useWebhookNotifications: Processing notification after delay')
                
                // 通知設定を再確認
                const stillAvailable = await isNotificationAvailable()
                apiLogger.debug({ 
                  stillAvailable, 
                  todoId: newTodo.id 
                }, 'useWebhookNotifications: Rechecked notification availability')
                
                if (stillAvailable) {
                  apiLogger.debug({ todoId: newTodo.id }, 'useWebhookNotifications: Calling showWebhookTaskNotification')
                  const notification = showWebhookTaskNotification(newTodo)
                  
                  apiLogger.info({
                    todoId: newTodo.id,
                    title: newTodo.title,
                    notificationCreated: !!notification
                  }, 'useWebhookNotifications: Webhook task notification processed')
                } else {
                  apiLogger.warn({ todoId: newTodo.id }, 'useWebhookNotifications: Notification not available after recheck')
                }
              }, 500)
            }
          )
          .subscribe((status, err) => {
            apiLogger.info({ 
              status,
              error: err, 
              userId: userId.substring(0, 8) + '...',
              channelName 
            }, 'useWebhookNotifications: Subscription status changed')
            
            if (status === 'SUBSCRIBED') {
              apiLogger.info({ channelName }, 'useWebhookNotifications: Successfully subscribed to realtime channel')
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              apiLogger.error({ status, error: err, channelName }, 'useWebhookNotifications: Subscription failed')
            }
          })

        channelRef.current = channel

        apiLogger.info({ 
          userId: userId.substring(0, 8) + '...',
          channelName 
        }, 'useWebhookNotifications: Webhook notifications subscription setup initiated')

      } catch (error) {
        apiLogger.error({ error, userId }, 'Failed to setup webhook notifications')
      }
    }

    setupRealtimeSubscription()

    // クリーンアップ
    return () => {
      if (channelRef.current) {
        const supabase = createClient()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        apiLogger.debug({ userId }, 'Webhook notifications subscription cleaned up')
      }
    }
  }, [enabled, userId])

  // コンポーネントのアンマウント時にもクリーンアップ
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        const supabase = createClient()
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])
}