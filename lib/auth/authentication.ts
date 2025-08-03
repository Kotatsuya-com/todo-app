/**
 * Authentication Abstraction
 * API認証処理の共通化とエラーハンドリング
 */

import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export interface AuthenticationResult {
  success: boolean
  userId?: string
  error?: string
  statusCode?: number
}

/**
 * リクエストからユーザーIDを取得し、認証を検証
 */
export async function authenticateUser(request?: NextRequest): Promise<AuthenticationResult> {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      return {
        success: false,
        error: 'Authentication failed',
        statusCode: 401
      }
    }

    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
        statusCode: 401
      }
    }

    return {
      success: true,
      userId: user.id
    }
  } catch (error) {
    return {
      success: false,
      error: 'Authentication error',
      statusCode: 500
    }
  }
}

/**
 * 認証が必要なAPIで使用するヘルパー
 * 認証失敗時は例外を投げる
 */
export async function requireAuthentication(request?: NextRequest): Promise<string> {
  const authResult = await authenticateUser(request)

  if (!authResult.success || !authResult.userId) {
    const error = new Error(authResult.error || 'Authentication required')
    ;(error as any).statusCode = authResult.statusCode || 401
    throw error
  }

  return authResult.userId
}

/**
 * 認証エラー用のカスタム例外クラス
 */
export class AuthenticationError extends Error {
  public readonly statusCode: number

  constructor(message: string, statusCode: number = 401) {
    super(message)
    this.name = 'AuthenticationError'
    this.statusCode = statusCode
  }
}

/**
 * 認証処理のラッパー（async/await用）
 */
export async function withAuthentication<T>(
  request: NextRequest,
  handler: (_userId: string) => Promise<T>
): Promise<T> {
  try {
    const userId = await requireAuthentication(request)
    return await handler(userId)
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error
    }
    // 認証以外のエラーの場合はそのまま再throw
    throw error
  }
}

/**
 * ユーザーIDの妥当性を検証
 */
export function validateUserId(userId: string): boolean {
  // UUIDフォーマットの基本検証
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(userId)
}

/**
 * 管理者権限の確認（将来の拡張用）
 */
export async function isAdminUser(_userId: string): Promise<boolean> {
  // TODO: 管理者権限のチェックロジックを実装
  // 現在は全てのユーザーを一般ユーザーとして扱う
  return false
}

/**
 * セッション情報の取得（デバッグ用）
 */
export async function getSessionInfo(request?: NextRequest): Promise<{
  isAuthenticated: boolean
  userId?: string
  sessionExpiry?: string
}> {
  try {
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (userError || sessionError || !user || !session) {
      return { isAuthenticated: false }
    }

    return {
      isAuthenticated: true,
      userId: user.id,
      sessionExpiry: new Date(session.expires_at! * 1000).toISOString()
    }
  } catch (error) {
    return { isAuthenticated: false }
  }
}
