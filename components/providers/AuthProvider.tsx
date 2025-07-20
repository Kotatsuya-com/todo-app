'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useTodoStore } from '@/store/todoStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, fetchTodos } = useTodoStore()

  useEffect(() => {
    const supabase = createClient()

    // 初期認証状態をチェック
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          display_name: session.user.email?.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url,
          created_at: session.user.created_at,
        })
        fetchTodos()
      }
    })

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          display_name: session.user.email?.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url,
          created_at: session.user.created_at,
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