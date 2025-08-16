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
  return jest.fn(implementation) as jest.MockedFunction<T>
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
    ;(global as any).__mockEnvCleanup()
    delete (global as any).__mockEnvCleanup
  }
}