/**
 * Type-Safe Mock Repository Infrastructure
 * Clean Architecture準拠のRepository Mockingシステム
 */

import { RepositoryResult } from '@/lib/repositories/BaseRepository'
import {
  createSuccessResult,
  createErrorResult,
  createSuccessListResult,
  createErrorListResult
} from '@/__tests__/utils/typeHelpers'

/**
 * Base Mock Repository Pattern
 * 全てのRepository Mockで共通する型安全なパターン
 */
export abstract class BaseMockRepository<T> {
  protected mockResults: Map<string, RepositoryResult<T | T[]>> = new Map()
  protected defaultResult: RepositoryResult<T | null> = createSuccessResult(null)

  /**
   * Mock結果を設定
   */
  setMockResult(key: string, result: RepositoryResult<T | T[]>): void {
    this.mockResults.set(key, result)
  }

  /**
   * 成功結果を簡単に設定
   */
  setMockSuccess(key: string, data: T | T[]): void {
    this.mockResults.set(key, createSuccessResult(data))
  }

  /**
   * エラー結果を簡単に設定
   */
  setMockError(key: string, error: string): void {
    this.mockResults.set(key, createErrorResult<T>(error))
  }

  /**
   * Mock結果を取得
   */
  protected getMockResult(key: string): RepositoryResult<T | T[]> {
    return this.mockResults.get(key) as RepositoryResult<T | T[]> || this.defaultResult
  }

  /**
   * 全Mock結果をクリア
   */
  clearMockResults(): void {
    this.mockResults.clear()
  }

  /**
   * デフォルト結果を設定
   */
  setDefaultResult(result: RepositoryResult<T | null>): void {
    this.defaultResult = result
  }
}

/**
 * Mock Repository Result Builder
 * Repository結果を簡単に構築するヘルパー
 */
export class MockRepositoryResultBuilder {
  static success<T>(data: T): RepositoryResult<T> {
    return createSuccessResult(data)
  }

  static successList<T>(data: T[]): RepositoryResult<T[]> {
    return createSuccessListResult(data)
  }

  static error<T>(message: string): RepositoryResult<T> {
    return createErrorResult<T>(message)
  }

  static errorList<T>(message: string): RepositoryResult<T[]> {
    return createErrorListResult<T>(message)
  }

  static notFound<T>(): RepositoryResult<T> {
    return createSuccessResult<T>(null as T)
  }
}

/**
 * Repository Mock Factory
 * 各Repository Mock インスタンスを作成
 */
export interface MockRepositoryOptions {
  defaultError?: string
  autoGenerateIds?: boolean
}

export class MockRepositoryFactory {
  static createWithDefaults<T>(
    mockClass: new (...args: any[]) => T,
    options: MockRepositoryOptions = {}
  ): T {
    const instance = new mockClass()

    if (options.defaultError) {
      (instance as any).setDefaultResult(
        MockRepositoryResultBuilder.error(options.defaultError)
      )
    }

    return instance
  }
}

/**
 * Type-Safe Mock Method Wrapper
 * Jest Mock Function を型安全にラップ
 */
export class TypeSafeMockWrapper<T extends (...args: any[]) => any> {
  private mockFn: jest.MockedFunction<T>

  constructor(mockFn: jest.MockedFunction<T>) {
    this.mockFn = mockFn
  }

  mockResolvedValue(value: Awaited<ReturnType<T>>): this {
    this.mockFn.mockResolvedValue(value as any)
    return this
  }

  mockRejectedValue(error: Error): this {
    this.mockFn.mockRejectedValue(error as any)
    return this
  }

  mockImplementation(impl: T): this {
    this.mockFn.mockImplementation(impl)
    return this
  }

  expectCalled(): void {
    expect(this.mockFn).toHaveBeenCalled()
  }

  expectCalledWith(...args: Parameters<T>): void {
    expect(this.mockFn).toHaveBeenCalledWith(...args)
  }

  expectCalledTimes(times: number): void {
    expect(this.mockFn).toHaveBeenCalledTimes(times)
  }

  clear(): void {
    this.mockFn.mockClear()
  }

  reset(): void {
    this.mockFn.mockReset()
  }
}

/**
 * Repository Mock Assertion Helper
 * Repository Mock の検証を簡単にするヘルパー
 */
export class MockRepositoryAssertions {
  static expectRepositorySuccess<T>(
    result: RepositoryResult<T>,
    expectedData?: T
  ): void {
    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
    if (expectedData !== undefined) {
      expect(result.data).toEqual(expectedData)
    }
  }

  static expectRepositoryError<T>(
    result: RepositoryResult<T>,
    expectedError?: string
  ): void {
    expect(result.data).toBeNull()
    expect(result.error).toBeDefined()
    if (expectedError) {
      expect(result.error!.message).toContain(expectedError)
    }
  }

  static expectRepositoryNotFound<T>(result: RepositoryResult<T>): void {
    expect(result.error).toBeNull()
    expect(result.data).toBeNull()
  }
}
