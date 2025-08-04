/**
 * Supabase Auth Repository Implementation
 * Supabaseによる認証データアクセス実装
 */

import { createClient } from '@/lib/supabase'
import {
  AuthRepositoryInterface,
  AuthUser,
  SignInRequest,
  SignUpRequest,
  RepositoryResult
} from '../../domain/repositories/AuthRepositoryInterface'

export class SupabaseAuthRepository implements AuthRepositoryInterface {
  private supabase = createClient()

  /**
   * 現在認証されているユーザーを取得
   */
  async getCurrentUser(): Promise<RepositoryResult<AuthUser | null>> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser()

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      if (!user) {
        return {
          success: true,
          data: null
        }
      }

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        emailVerified: user.email_confirmed_at ? true : false,
        lastSignInAt: user.last_sign_in_at || undefined
      }

      return {
        success: true,
        data: authUser
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * メールアドレスとパスワードでサインイン
   */
  async signInWithEmail(request: SignInRequest): Promise<RepositoryResult<AuthUser>> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: request.email,
        password: request.password
      })

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Authentication failed'
        }
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        emailVerified: data.user.email_confirmed_at ? true : false,
        lastSignInAt: data.user.last_sign_in_at || undefined
      }

      return {
        success: true,
        data: authUser
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * 新規ユーザー登録
   */
  async signUpWithEmail(request: SignUpRequest): Promise<RepositoryResult<AuthUser>> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: request.email,
        password: request.password
      })

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Registration failed'
        }
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        emailVerified: data.user.email_confirmed_at ? true : false,
        lastSignInAt: data.user.last_sign_in_at || undefined
      }

      return {
        success: true,
        data: authUser
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * サインアウト
   */
  async signOut(): Promise<RepositoryResult<void>> {
    try {
      const { error } = await this.supabase.auth.signOut()

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * 認証状態の変更を監視
   */
  onAuthStateChange(callback: (_user: AuthUser | null) => void): () => void {
    const { data: { subscription } } = this.supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          const authUser: AuthUser = {
            id: session.user.id,
            email: session.user.email,
            emailVerified: session.user.email_confirmed_at ? true : false,
            lastSignInAt: session.user.last_sign_in_at || undefined
          }
          callback(authUser)
        } else {
          callback(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }

  /**
   * パスワードリセットメールを送信
   */
  async sendPasswordResetEmail(email: string): Promise<RepositoryResult<void>> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email)

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * メールアドレス確認メールを再送信
   */
  async resendConfirmationEmail(): Promise<RepositoryResult<void>> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()

      if (!user?.email) {
        return {
          success: false,
          error: 'No user email found'
        }
      }

      const { error } = await this.supabase.auth.resend({
        type: 'signup',
        email: user.email
      })

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * 認証トークンを取得
   */
  async getAccessToken(): Promise<RepositoryResult<string | null>> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession()

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: session?.access_token || null
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * 認証トークンをリフレッシュ
   */
  async refreshSession(): Promise<RepositoryResult<AuthUser | null>> {
    try {
      const { data: { session }, error } = await this.supabase.auth.refreshSession()

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      if (!session?.user) {
        return {
          success: true,
          data: null
        }
      }

      const authUser: AuthUser = {
        id: session.user.id,
        email: session.user.email,
        emailVerified: session.user.email_confirmed_at ? true : false,
        lastSignInAt: session.user.last_sign_in_at || undefined
      }

      return {
        success: true,
        data: authUser
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * ユーザーセッションの有効性を確認
   */
  async isSessionValid(): Promise<RepositoryResult<boolean>> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession()

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      // セッションが存在し、有効期限内かチェック
      if (!session) {
        return {
          success: true,
          data: false
        }
      }

      const now = Math.floor(Date.now() / 1000)
      const isValid = session.expires_at ? session.expires_at > now : false

      return {
        success: true,
        data: isValid
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}
