/**
 * Base Repository Interface
 * 全てのリポジトリの基底インターフェースとSupabaseクライアント管理
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'
import { NextRequest } from 'next/server'

export interface BaseRepository {
  readonly client: SupabaseClient
}

/**
 * Repository Context
 * リクエストコンテキストに応じて適切なSupabaseクライアントを提供
 */
export interface RepositoryContext {
  /**
   * ユーザー認証が必要な操作用のクライアント（RLS有効）
   */
  getAuthenticatedClient(_request?: NextRequest): SupabaseClient

  /**
   * 管理者権限が必要な操作用のクライアント（RLSバイパス）
   */
  getServiceClient(): SupabaseClient
}

export class SupabaseRepositoryContext implements RepositoryContext {
  getAuthenticatedClient(_request?: NextRequest): SupabaseClient {
    if (!_request) {
      throw new Error('Request context required for authenticated operations')
    }
    return createServerSupabaseClient(_request)
  }

  getServiceClient(): SupabaseClient {
    return createServiceSupabaseClient()
  }
}

/**
 * Repository結果型
 */
export interface RepositoryResult<T> {
  data: T | null
  error: Error | null
}

export interface RepositoryListResult<T> {
  data: T[]
  error: Error | null
}

/**
 * エラーヘルパー
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly _code?: string,
    public readonly _originalError?: any
  ) {
    super(message)
    this.name = 'RepositoryError'
  }

  static fromSupabaseError(error: any): RepositoryError {
    return new RepositoryError(
      error.message || 'Database operation failed',
      error.code,
      error
    )
  }
}

/**
 * 共通のリポジトリユーティリティ
 */
export class RepositoryUtils {
  static success<T>(data: T): RepositoryResult<T> {
    return { data, error: null }
  }

  static successList<T>(data: T[]): RepositoryListResult<T> {
    return { data, error: null }
  }

  static failure<T>(error: Error): RepositoryResult<T> {
    return { data: null, error }
  }

  static failureList<T>(error: Error): RepositoryListResult<T> {
    return { data: [], error }
  }

  static handleSupabaseResult<T>(result: { data: T | null; error: any }): RepositoryResult<T> {
    if (result.error) {
      return this.failure(RepositoryError.fromSupabaseError(result.error))
    }
    return this.success(result.data as T)
  }

  static handleSupabaseListResult<T>(result: { data: T[] | null; error: any }): RepositoryListResult<T> {
    if (result.error) {
      return this.failureList(RepositoryError.fromSupabaseError(result.error))
    }
    return this.successList(result.data || [])
  }
}
