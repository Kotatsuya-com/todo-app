/**
 * Test Utilities
 * テスト共通ユーティリティ - 再利用可能なテストヘルパー関数とモック
 *
 * @fileoverview This file contains test utilities and should not run as a test suite
 */

import { LOADING_TIMEOUT_MS } from '@/src/constants/timeConstants'

// Prevent Jest from treating this as a test file
if (typeof describe === 'undefined') {
  // This is a utility file, not a test file
}

import { TodoEntity, TodoData } from '../../src/domain/entities/Todo'
import { UserEntity, UserData } from '../../src/domain/entities/User'

/**
 * Mock crypto.randomUUID for Node.js test environment
 * Node.js テスト環境用の crypto.randomUUID モック
 */
export function setupCryptoMock(): void {
  if (!global.crypto) {
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
      }
    })
  }
}

/**
 * Setup fake timers with a fixed date
 * 固定日時でのフェイクタイマー設定
 */
export function setupFakeTimers(fixedDate: string = '2025-08-06T00:00:00Z'): void {
  jest.useFakeTimers()
  jest.setSystemTime(new Date(fixedDate))
}

/**
 * Cleanup fake timers
 * フェイクタイマーのクリーンアップ
 */
export function cleanupFakeTimers(): void {
  jest.useRealTimers()
}

/**
 * Factory function to create test TodoData with snake_case properties
 * snake_case プロパティを使用したテスト用TodoDataファクトリ
 */
export function createTestTodoData(overrides: Partial<TodoData> = {}): TodoData {
  const now = new Date().toISOString()

  return {
    id: 'test-todo-id',
    user_id: 'test-user-id',
    title: 'Test Todo',
    body: 'Test todo body content',
    deadline: null,
    importance_score: 1000,
    status: 'open',
    created_at: now,
    updated_at: now,
    created_via: 'manual',
    ...overrides
  }
}

/**
 * Factory function to create test UserData with snake_case properties
 * snake_case プロパティを使用したテスト用UserDataファクトリ
 */
export function createTestUserData(overrides: Partial<UserData> = {}): UserData {
  return {
    id: 'test-user-id',
    display_name: 'Test User',
    avatar_url: null,
    slack_user_id: null,
    enable_webhook_notifications: true,
    created_at: '2025-08-01T10:00:00Z',
    ...overrides
  }
}

/**
 * Create test TodoEntity with proper properties
 * 適切なプロパティを持つテスト用TodoEntityを作成
 */
export function createTestTodoEntity(overrides: Partial<TodoData> = {}): TodoEntity {
  return new TodoEntity(createTestTodoData(overrides))
}

/**
 * Create test UserEntity with proper properties
 * 適切なプロパティを持つテスト用UserEntityを作成
 */
export function createTestUserEntity(overrides: Partial<UserData> = {}): UserEntity {
  return new UserEntity(createTestUserData(overrides))
}

/**
 * Create multiple test todos for various scenarios
 * 様々なシナリオ用の複数テストTodoを作成
 */
export function createTestTodoSet(): {
  urgentImportant: TodoEntity
  notUrgentImportant: TodoEntity
  urgentNotImportant: TodoEntity
  notUrgentNotImportant: TodoEntity
  completed: TodoEntity
  overdue: TodoEntity
  } {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  return {
    urgentImportant: createTestTodoEntity({
      id: 'urgent-important',
      deadline: today + 'T23:59:59Z', // Today (urgent)
      importance_score: 1500, // Above threshold (important)
      status: 'open'
    }),
    notUrgentImportant: createTestTodoEntity({
      id: 'not-urgent-important',
      deadline: tomorrowStr, // Tomorrow (not urgent)
      importance_score: 1500, // Above threshold (important)
      status: 'open'
    }),
    urgentNotImportant: createTestTodoEntity({
      id: 'urgent-not-important',
      deadline: today + 'T23:59:59Z', // Today (urgent)
      importance_score: 800, // Below threshold (not important)
      status: 'open'
    }),
    notUrgentNotImportant: createTestTodoEntity({
      id: 'not-urgent-not-important',
      deadline: tomorrowStr, // Tomorrow (not urgent)
      importance_score: 800, // Below threshold (not important)
      status: 'open'
    }),
    completed: createTestTodoEntity({
      id: 'completed-todo',
      status: 'completed',
      importance_score: 1000
    }),
    overdue: createTestTodoEntity({
      id: 'overdue-todo',
      deadline: yesterdayStr, // Yesterday (overdue)
      importance_score: 1000,
      status: 'open'
    })
  }
}

/**
 * Mock service result factory
 * モックサービス結果ファクトリ
 */
export function createSuccessResult<T>(data: T) {
  return {
    success: true,
    data
  }
}

export function createErrorResult(error: string) {
  return {
    success: false,
    error
  }
}

/**
 * Common wait patterns for async testing
 * 非同期テスト用の共通待機パターン
 */
export async function waitForLoadingToComplete(result: any, timeout: number = LOADING_TIMEOUT_MS): Promise<void> {
  const { waitFor } = await import('@testing-library/react')
  await waitFor(() => {
    expect(result.current.loading).toBe(false)
  }, { timeout })
}

/**
 * Act wrapper for async operations
 * 非同期操作用のActラッパー
 */
export async function actAsync(fn: () => Promise<void>): Promise<void> {
  const { act } = await import('@testing-library/react')
  await act(async () => {
    await fn()
  })
}

/**
 * Jest setup utilities
 * Jest設定ユーティリティ
 */
export function setupTestEnvironment(): void {
  setupCryptoMock()

  // Suppress console warnings in tests unless explicitly needed
  const originalError = console.error
  beforeEach(() => {
    console.error = (...args: any[]) => {
      if (args[0]?.includes?.('Warning: An update to TestComponent inside a test was not wrapped in act')) {
        return // Suppress React act warnings that are expected in some tests
      }
      originalError.call(console, ...args)
    }
  })

  afterEach(() => {
    console.error = originalError
    jest.clearAllMocks()
  })
}

/**
 * Common mock patterns
 * 共通モックパターン
 */
export const CommonMocks = {
  /**
   * Create a resolved promise mock
   */
  resolvedPromise: <T>(value: T) => jest.fn().mockResolvedValue(value),

  /**
   * Create a rejected promise mock
   */
  rejectedPromise: (error: Error | string) => jest.fn().mockRejectedValue(
    error instanceof Error ? error : new Error(error)
  ),

  /**
   * Create a factory function mock
   */
  factory: <T>(implementation: T) => jest.fn().mockImplementation(() => implementation)
}
