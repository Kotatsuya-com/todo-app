'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useTodoStore } from '@/store/todoStore'
import { useWebhookNotifications } from '@/hooks/useWebhookNotifications'
import { apiLogger } from '@/lib/client-logger'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, fetchTodos, user } = useTodoStore()

  // Webhook通知システムを有効化
  apiLogger.debug({
    hasUser: !!user,
    userId: user?.id ? `${user.id.substring(0, 8)}...` : 'null'
  }, 'AuthProvider: Initializing webhook notifications')
  useWebhookNotifications({
    enabled: !!user,
    userId: user?.id
  })

  useEffect(() => {
    const supabase = createClient()

    // 初期認証状態をチェック
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        apiLogger.debug({
          userId: session.user.id.substring(0, 8) + '...',
          email: session.user.email
        }, 'AuthProvider: Setting user from session')
        setUser({
          id: session.user.id,
          display_name: session.user.email?.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url,
          created_at: session.user.created_at
        })
        fetchTodos()
      } else {
        apiLogger.debug('AuthProvider: No session found')
      }
    })

    // 認証状態の変更を監視
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      apiLogger.debug({
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id ? session.user.id.substring(0, 8) + '...' : 'null'
      }, 'AuthProvider: Auth state changed')
      if (session?.user) {
        setUser({
          id: session.user.id,
          display_name: session.user.email?.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url,
          created_at: session.user.created_at
        })
        fetchTodos()
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, fetchTodos])

  return <>{children}</>
}
