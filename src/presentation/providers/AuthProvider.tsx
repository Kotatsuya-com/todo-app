/**
 * Auth Provider with Clean Architecture
 * Clean Architectureに対応した認証プロバイダー
 */

'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useAuth, UseAuthReturn } from '../hooks/useAuth'

interface AuthProviderProps {
  children: ReactNode
}

// 認証コンテキストの作成
const AuthContext = createContext<UseAuthReturn | undefined>(undefined)

/**
 * 認証プロバイダーコンポーネント
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * 認証コンテキストを使用するためのフック
 */
export function useAuthContext(): UseAuthReturn {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }

  return context
}

/**
 * 認証済みユーザーのみアクセス可能なコンポーネントでラップするHOC
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function WithAuthComponent(props: P) {
    const { isAuthenticated, loading } = useAuthContext()

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              認証が必要です
            </h2>
            <p className="text-gray-600">
              このページにアクセスするにはサインインしてください。
            </p>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}

/**
 * 未認証ユーザーのみアクセス可能なコンポーネントでラップするHOC
 */
export function withGuest<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function WithGuestComponent(props: P) {
    const { isAuthenticated, loading } = useAuthContext()

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    if (isAuthenticated) {
      // 認証済みユーザーはダッシュボードにリダイレクト
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
      return null
    }

    return <Component {...props} />
  }
}

export default AuthProvider
