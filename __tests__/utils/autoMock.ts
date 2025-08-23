/**
 * Auto Mock Utility
 * 型安全性を保ちながら柔軟なモック作成を可能にするユーティリティ
 *
 * JavaScriptの動的な性質を活用し、必要なメソッドだけを定義できるようにします。
 * 未定義のメソッドは自動的にjest.fn()として生成されます。
 */

import { jest } from '@jest/globals'

/**
 * 自動モック生成関数
 * インターフェースのすべてのメソッドを自動的にjest.fn()として生成
 *
 * @example
 * const mockRepo = createAutoMock<SlackRepositoryInterface>();
 * mockRepo.findWebhookById.mockResolvedValue({ data: webhook, error: null });
 */
export function createAutoMock<T extends object>(): jest.Mocked<T> {
  const cache: Record<string | symbol, jest.Mock> = {}

  return new Proxy({} as jest.Mocked<T>, {
    get: (_target, prop) => {
      // Symbolや特殊なプロパティの処理
      if (typeof prop === 'symbol' || prop === 'then') {
        return undefined
      }

      // キャッシュされたモック関数を返すか、新規作成
      if (!(prop in cache)) {
        cache[prop] = jest.fn()
      }
      return cache[prop]
    },

    // in演算子のサポート
    has: (_target, prop) => {
      return prop in cache
    },

    // Object.keys()のサポート
    ownKeys: () => {
      return Object.keys(cache)
    },

    // Object.getOwnPropertyDescriptor()のサポート
    getOwnPropertyDescriptor: (_target, prop) => {
      if (prop in cache) {
        return {
          configurable: true,
          enumerable: true,
          value: cache[prop as string | symbol]
        }
      }
      return undefined
    }
  })
}

/**
 * 部分モック生成関数
 * 特定のメソッドだけを定義し、残りは自動生成
 *
 * @example
 * const mockRepo = createPartialMock<SlackRepositoryInterface>({
 *   findWebhookById: jest.fn().mockResolvedValue({ data: webhook, error: null }),
 *   // 他のメソッドは自動生成される
 * });
 */
export function createPartialMock<T extends object>(
  methods: Partial<jest.Mocked<T>>
): jest.Mocked<T> {
  const autoMock = createAutoMock<T>()

  // 提供されたメソッドをマージ
  Object.assign(autoMock, methods)

  return autoMock
}

/**
 * Strict Mock生成関数
 * 未実装のメソッドが呼ばれた場合にエラーを投げる
 *
 * @example
 * const mockRepo = createStrictMock<SlackRepositoryInterface>({
 *   findWebhookById: jest.fn().mockResolvedValue({ data: webhook, error: null }),
 * });
 * // mockRepo.unknownMethod() を呼ぶとエラーが投げられる
 */
export function createStrictMock<T extends object>(
  methods: Partial<jest.Mocked<T>>
): jest.Mocked<T> {
  const implementedMethods = new Set(Object.keys(methods as any))

  return new Proxy(methods as jest.Mocked<T>, {
    get: (target, prop) => {
      const propString = String(prop)

      // 特殊なプロパティは通過させる
      if (typeof prop === 'symbol' || prop === 'then') {
        return undefined
      }

      if (propString in target) {
        return target[prop as keyof T]
      }

      // 未実装メソッドへのアクセスはエラー
      return jest.fn().mockImplementation(() => {
        throw new Error(
          `Mock method '${propString}' not implemented. ` +
          `Available methods: ${Array.from(implementedMethods).join(', ')}`
        )
      })
    }
  })
}

/**
 * Spy Mock生成関数
 * 実装を部分的にオーバーライドしつつ、呼び出しを記録
 *
 * @example
 * const realRepo = new SlackRepository();
 * const spyRepo = createSpyMock(realRepo, {
 *   findWebhookById: jest.fn().mockResolvedValue({ data: mockWebhook, error: null }),
 * });
 */
export function createSpyMock<T extends object>(
  realImplementation: T,
  overrides: Partial<jest.Mocked<T>> = {}
): jest.Mocked<T> {
  const spiedMethods: Record<string | symbol, jest.Mock> = {}

  return new Proxy(realImplementation as jest.Mocked<T>, {
    get: (target, prop) => {
      // オーバーライドが存在すればそれを使用
      if (prop in overrides) {
        return overrides[prop as keyof T]
      }

      // すでにスパイ化されていればそれを返す
      if (prop in spiedMethods) {
        return spiedMethods[prop]
      }

      // 元の実装をスパイ化
      const original = target[prop as keyof T]
      if (typeof original === 'function') {
        spiedMethods[prop] = jest.fn(original.bind(target))
        return spiedMethods[prop]
      }

      return original
    }
  })
}

/**
 * Repository Result生成ヘルパー
 * Clean Architectureのパターンに合わせた結果オブジェクト生成
 */
export const mockResult = {
  success<T>(data: T) {
    return { data, error: null }
  },

  error(error: string | Error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(error)
    }
  },

  // List用結果型ヘルパー
  successList<T>(data: T[]) {
    return { data, error: null }
  },

  errorList<T>(error: string | Error) {
    return {
      data: [] as T[],
      error: error instanceof Error ? error : new Error(error)
    }
  }
}

/**
 * Service Result生成ヘルパー
 * Service層のレスポンスパターンに合わせた結果オブジェクト生成
 */
export const serviceResult = {
  success<T>(data: T, statusCode = 200) {
    return { success: true, data, statusCode }
  },

  error(error: string, statusCode = 500) {
    return { success: false, error, statusCode }
  }
}

// Type helpers for better IDE support
export type MockedRepository<T extends object> = jest.Mocked<T>;
export type PartialMock<T extends object> = Partial<jest.Mocked<T>>;
export type StrictMock<T extends object> = jest.Mocked<T>;
