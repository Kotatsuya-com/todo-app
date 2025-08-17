/**
 * テスト用型ヘルパー
 * テストコードで型安全性を保ちながら、柔軟なモック作成を可能にする
 */

// 深いPartial型 - ネストしたオブジェクトも部分的に指定可能
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// read-onlyプロパティを変更可能にする型
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

// テスト用のモック可能な型
export type TestMockable<T> = Mutable<DeepPartial<T>>

// NextRequestのテスト用型
export interface MockNextRequest {
  url?: string
  nextUrl?: {
    hostname?: string
    pathname?: string
    searchParams?: Map<string, string> | URLSearchParams
    origin?: string
    protocol?: string
    port?: string
  }
  headers?: Headers | Record<string, string>
  cookies?: {
    get?: (name: string) => { value: string } | undefined
    set?: (options: any) => void
  }
  json?: () => Promise<any>
  text?: () => Promise<string>
  method?: string
}

// process.envのモック用型
export interface MockProcessEnv {
  NODE_ENV?: string
  NEXT_PUBLIC_CLIENT_LOG_LEVEL?: string
  [key: string]: string | undefined
}

// テスト用のEntity作成ヘルパー
export function createTestEntity<T>(
  partialData: DeepPartial<T>,
  defaults?: Partial<T>
): T {
  return { ...defaults, ...partialData } as T
}

// モック関数の型安全なラッパー
export function createMockFunction<T extends (...args: any[]) => any>(
  implementation?: T
): jest.MockedFunction<T> {
  return jest.fn(implementation) as any
}

// 環境変数の安全なモック
export function mockProcessEnv(env: MockProcessEnv): void {
  const originalEnv = process.env
  Object.assign(process.env, env)

  // テスト後のクリーンアップ用
  ;(global as any).__mockEnvCleanup = () => {
    process.env = originalEnv
  }
}

// 環境変数モックのクリーンアップ
export function restoreProcessEnv(): void {
  if ((global as any).__mockEnvCleanup) {
    (global as any).__mockEnvCleanup()
    delete (global as any).__mockEnvCleanup
  }
}

// テスト用型拡張
export interface TestNotificationSettings {
  user_id: string
  enable_webhook_notifications: boolean
  updated_at?: string
  updatedAt?: string
}

export interface TestUser {
  id: string
  display_name?: string | null
  avatar_url?: string | null
  slack_user_id?: string | null
  enable_webhook_notifications: boolean
  created_at: string
  email?: string
  auth_id: string
  updated_at: string
}

export interface TestTodo {
  id: string
  user_id: string
  title: string
  body: string
  deadline: string | null
  importance_score: number
  status: 'active' | 'completed' | 'pending'
  created_at: string
  updated_at: string
  urgency_level: string | null
  created_via: string | null
}

// Repository Results ヘルパー関数
export function createSuccessResult<T>(data: T): { data: T; error: null } {
  return { data, error: null }
}

export function createErrorResult<T>(error: Error | string): { data: null; error: Error } {
  const errorObj = typeof error === 'string' ? new Error(error) : error
  return { data: null, error: errorObj }
}

export function createSuccessListResult<T>(data: T[]): { data: T[]; error: null } {
  return { data, error: null }
}

export function createErrorListResult<T>(error: Error | string): { data: T[]; error: Error } {
  const errorObj = typeof error === 'string' ? new Error(error) : error
  return { data: [] as T[], error: errorObj }
}

// 拡張Error型 - APIエラー用
export interface ExtendedError extends Error {
  code?: string
  statusCode?: number
  details?: any
}

// 型安全なExtendedError作成ヘルパー
export function createExtendedError(
  message: string,
  code?: string,
  statusCode?: number,
  details?: any
): ExtendedError {
  const error = new Error(message) as ExtendedError
  if (code) {error.code = code}
  if (statusCode) {error.statusCode = statusCode}
  if (details) {error.details = details}
  return error
}

// OpenAI APIエラー型
export interface OpenAIError extends ExtendedError {
  code: 'api_error' | 'insufficient_quota' | 'rate_limit_exceeded' | 'invalid_request'
}

// Slack APIエラー型
export interface SlackError extends ExtendedError {
  code: 'slack_api_error' | 'invalid_auth' | 'channel_not_found' | 'user_not_found'
}

// APIエラー作成ヘルパー
export function createOpenAIError(
  message: string,
  code: OpenAIError['code'],
  statusCode: number = 500
): OpenAIError {
  return createExtendedError(message, code, statusCode) as OpenAIError
}

export function createSlackError(
  message: string,
  code: SlackError['code'],
  statusCode: number = 500
): SlackError {
  return createExtendedError(message, code, statusCode) as SlackError
}

// =============================================================================
// 統一Service Result型システム (Clean Architecture準拠)
// =============================================================================

/**
 * 統一Service結果型 - 全Service層で使用する標準的な結果型
 * Repository層のRepositoryResult<T>との整合性を保ちながら、
 * Service層特有の要求（statusCode等）も満たす
 */
export interface ServiceResult<T> {
  data: T | null
  error: ServiceError | null
  metadata?: ServiceMetadata
}

/**
 * Service層エラー型 - 詳細なエラー情報を含む
 */
export interface ServiceError {
  code: string
  message: string
  statusCode: number
  details?: any
  originalError?: Error
}

/**
 * Service層メタデータ - 付加情報
 */
export interface ServiceMetadata {
  requestId?: string
  processingTime?: number
  cacheHit?: boolean
  [key: string]: any
}

/**
 * Service Result作成ヘルパー関数
 */
export function createServiceSuccess<T>(
  data: T,
  metadata?: ServiceMetadata
): ServiceResult<T> {
  return { data, error: null, metadata }
}

export function createServiceError<T>(
  code: string,
  message: string,
  statusCode: number = 500,
  details?: any,
  originalError?: Error
): ServiceResult<T> {
  const error: ServiceError = {
    code,
    message,
    statusCode,
    details,
    originalError
  }
  return { data: null, error }
}

/**
 * Repository Result → Service Result 変換ヘルパー
 */
export function repositoryToServiceResult<T>(
  repoResult: { data: T | null; error: Error | null },
  errorCode: string = 'REPOSITORY_ERROR',
  statusCode: number = 500
): ServiceResult<T> {
  if (repoResult.error) {
    return createServiceError<T>(
      errorCode,
      repoResult.error.message,
      statusCode,
      undefined,
      repoResult.error
    )
  }
  return createServiceSuccess(repoResult.data as T)
}

/**
 * Legacy Service Result → 統一Service Result 変換ヘルパー
 * 既存のservice結果型から新しい統一型への移行用
 */
export function legacyToServiceResult<T>(legacy: {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}): ServiceResult<T> {
  if (legacy.success) {
    return createServiceSuccess(legacy.data as T)
  }
  return createServiceError<T>(
    'LEGACY_ERROR',
    legacy.error || 'Unknown error',
    legacy.statusCode || 500
  )
}
