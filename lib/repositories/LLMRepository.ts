/**
 * LLM Repository Interface
 * LLM操作の抽象化レイヤー - Clean Architecture準拠
 */

import { RepositoryResult } from './BaseRepository'
import { LLMRequestEntity } from '@/lib/entities/LLMRequest'
import { LLMResponseEntity } from '@/lib/entities/LLMResponse'

export interface LLMHealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  provider: string
  model: string
  latency?: number
  error?: string
}

/**
 * LLM Repository Interface
 * 全てのLLM実装が従うべきインターフェース
 */
export interface LLMRepositoryInterface {
  /**
   * LLMリクエストを実行してレスポンスを取得
   */
  executeRequest(_request: LLMRequestEntity): Promise<RepositoryResult<LLMResponseEntity>>

  /**
   * LLMサービスのヘルスチェック
   */
  checkHealth(): Promise<RepositoryResult<LLMHealthCheckResult>>

  /**
   * プロバイダー情報を取得
   */
  getProviderInfo(): {
    name: string
    models: string[]
    capabilities: string[]
  }

  /**
   * バッチリクエストの実行（オプショナル）
   */
  executeBatchRequests?(_requests: LLMRequestEntity[]): Promise<RepositoryResult<LLMResponseEntity[]>>
}

/**
 * LLM Repository Error Types
 * LLM操作で発生する可能性のあるエラー
 */
export class LLMRepositoryError extends Error {
  constructor(
    message: string,
    public readonly _code: string,
    public readonly _statusCode: number = 500,
    public readonly _originalError?: Error
  ) {
    super(message)
    this.name = 'LLMRepositoryError'
  }

  static authenticationError(originalError?: Error): LLMRepositoryError {
    return new LLMRepositoryError(
      'LLM authentication failed',
      'LLM_AUTH_ERROR',
      401,
      originalError
    )
  }

  static quotaExceededError(originalError?: Error): LLMRepositoryError {
    return new LLMRepositoryError(
      'LLM quota exceeded',
      'LLM_QUOTA_EXCEEDED',
      429,
      originalError
    )
  }

  static rateLimitError(originalError?: Error): LLMRepositoryError {
    return new LLMRepositoryError(
      'LLM rate limit exceeded',
      'LLM_RATE_LIMIT',
      429,
      originalError
    )
  }

  static modelNotFoundError(model: string, originalError?: Error): LLMRepositoryError {
    return new LLMRepositoryError(
      `LLM model not found: ${model}`,
      'LLM_MODEL_NOT_FOUND',
      404,
      originalError
    )
  }

  static timeoutError(originalError?: Error): LLMRepositoryError {
    return new LLMRepositoryError(
      'LLM request timeout',
      'LLM_TIMEOUT',
      408,
      originalError
    )
  }

  static connectionError(originalError?: Error): LLMRepositoryError {
    return new LLMRepositoryError(
      'LLM connection failed',
      'LLM_CONNECTION_ERROR',
      503,
      originalError
    )
  }

  static invalidResponseError(originalError?: Error): LLMRepositoryError {
    return new LLMRepositoryError(
      'LLM returned invalid response',
      'LLM_INVALID_RESPONSE',
      502,
      originalError
    )
  }

  static unexpectedError(originalError?: Error): LLMRepositoryError {
    return new LLMRepositoryError(
      'Unexpected LLM error',
      'LLM_UNEXPECTED_ERROR',
      500,
      originalError
    )
  }
}
