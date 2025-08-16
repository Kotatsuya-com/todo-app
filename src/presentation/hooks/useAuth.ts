/**
 * Auth Custom Hook
 * 認証機能用のカスタムフック - 認証状態とアクションを提供
 */

import { useState, useEffect, useCallback } from 'react'
import { UserEntity } from '../../domain/entities/User'
import { AuthUser } from '../../domain/repositories/AuthRepositoryInterface'
import { createAuthUseCases } from '@/src/infrastructure/di/FrontendServiceFactory'
import { CurrentUserData } from '../../domain/use-cases/AuthUseCases'
import { SESSION_VALIDATION_INTERVAL_MS } from '@/src/constants/timeConstants'

export interface AuthState {
  user: UserEntity | null
  authUser: AuthUser | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
}

export interface AuthActions {
  signIn: (_email: string, _password: string) => Promise<boolean>
  signUp: (_email: string, _password: string) => Promise<boolean>
  signOut: () => Promise<void>
  sendPasswordReset: (_email: string) => Promise<boolean>
  refreshSession: () => Promise<void>
  clearError: () => void
}

export interface UseAuthReturn {
  user: UserEntity | null
  authUser: AuthUser | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  signIn: (_email: string, _password: string) => Promise<boolean>
  signUp: (_email: string, _password: string) => Promise<boolean>
  signOut: () => Promise<void>
  sendPasswordReset: (_email: string) => Promise<boolean>
  refreshSession: () => Promise<void>
  clearError: () => void
}

export const useAuth = (): UseAuthReturn => {
  const authUseCases = createAuthUseCases()

  const [state, setState] = useState<AuthState>({
    user: null,
    authUser: null,
    loading: true,
    error: null,
    isAuthenticated: false
  })

  /**
   * ユーザー状態を更新
   */
  const updateUserState = useCallback((userData: CurrentUserData | null) => {
    setState(prev => ({
      ...prev,
      user: userData?.userEntity || null,
      authUser: userData?.authUser || null,
      isAuthenticated: !!userData,
      loading: false
    }))
  }, [])

  /**
   * エラー状態を設定
   */
  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error,
      loading: false
    }))
  }, [])

  /**
   * ローディング状態を設定
   */
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      loading
    }))
  }, [])

  /**
   * メールアドレスとパスワードでサインイン
   */
  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const result = await authUseCases.signInWithEmail({ email, password })

      if (result.success && result.data) {
        updateUserState(result.data || null)
        return true
      } else {
        setError(result.error || 'Sign in failed')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      return false
    }
  }, [authUseCases, setLoading, setError, updateUserState])

  /**
   * 新規ユーザー登録
   */
  const signUp = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const result = await authUseCases.signUpWithEmail({ email, password })

      if (result.success && result.data) {
        updateUserState(result.data || null)
        return true
      } else {
        setError(result.error || 'Sign up failed')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      return false
    }
  }, [authUseCases, setLoading, setError, updateUserState])

  /**
   * サインアウト
   */
  const signOut = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const result = await authUseCases.signOut()

      if (result.success) {
        updateUserState(null)
      } else {
        setError(result.error || 'Sign out failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    }
  }, [authUseCases, setLoading, setError, updateUserState])

  /**
   * パスワードリセットメールを送信
   */
  const sendPasswordReset = useCallback(async (email: string): Promise<boolean> => {
    setError(null)

    try {
      const result = await authUseCases.sendPasswordResetEmail(email)

      if (result.success) {
        return true
      } else {
        setError(result.error || 'Failed to send password reset email')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      return false
    }
  }, [authUseCases, setError])

  /**
   * セッションを更新
   */
  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      const result = await authUseCases.refreshSession()

      if (result.success) {
        updateUserState(result.data || null)
      } else {
        updateUserState(null)
      }
    } catch (err) {
      updateUserState(null)
    }
  }, [authUseCases, updateUserState])

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [setError])

  // Slack関連のメソッドは、useSettingsフックに移行済み

  /**
   * 初期化：現在のユーザーを取得
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const result = await authUseCases.getCurrentUser()

        if (result.success) {
          updateUserState(result.data || null)
        } else {
          updateUserState(null)
        }
      } catch (err) {
        updateUserState(null)
      }
    }

    initializeAuth()
  }, [authUseCases, updateUserState])

  /**
   * 認証状態の変更を監視
   */
  useEffect(() => {
    const unsubscribe = authUseCases.onAuthStateChange((userData) => {
      updateUserState(userData)
    })

    return unsubscribe
  }, [authUseCases, updateUserState])

  /**
   * セッションの有効性を定期的にチェック
   */
  useEffect(() => {
    if (!state.isAuthenticated) { return }

    const checkSessionValidity = async () => {
      try {
        const result = await authUseCases.validateSession()

        if (result.success && !result.data) {
          // セッションが無効な場合、ユーザー状態をクリア
          updateUserState(null)
        }
      } catch (err) {
        // エラーが発生した場合もユーザー状態をクリア
        updateUserState(null)
      }
    }

    // 5分おきにセッションの有効性をチェック
    const interval = setInterval(checkSessionValidity, SESSION_VALIDATION_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [state.isAuthenticated, authUseCases, updateUserState])

  return {
    user: state.user,
    authUser: state.authUser,
    loading: state.loading,
    error: state.error,
    isAuthenticated: state.isAuthenticated,
    signIn,
    signUp,
    signOut,
    sendPasswordReset,
    refreshSession,
    clearError
  }
}
