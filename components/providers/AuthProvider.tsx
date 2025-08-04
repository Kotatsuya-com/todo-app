'use client'

import { useEffect } from 'react'
import { useAuth } from '@/src/presentation/hooks/useAuth'
import { useWebhookNotifications } from '@/hooks/useWebhookNotifications'
import { apiLogger } from '@/lib/client-logger'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  // Webhook通知システムを有効化
  useEffect(() => {
    if (user?.id) {
      apiLogger.debug({
        hasUser: !!user,
        userId: user.id.substring(0, 8) + '...'
      }, 'AuthProvider: Initializing webhook notifications')
    }
  }, [user])

  useWebhookNotifications({
    enabled: !!user,
    userId: user?.id
  })

  // 認証状態の管理はuseAuth hookに委譲
  // AuthProviderは今後Clean Architectureパターンに移行予定

  return <>{children}</>
}
