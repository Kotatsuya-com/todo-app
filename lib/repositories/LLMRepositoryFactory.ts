/**
 * LLM Repository Factory
 * LLM Repository実装の作成を管理
 */

import { LLMRepositoryInterface } from '@/lib/repositories/LLMRepository'
import { LLMConfig } from '@/lib/repositories/LLMConfig'
import { OpenAILLMRepository } from '@/lib/repositories/OpenAILLMRepository'
import { MockLLMRepository } from '@/lib/repositories/MockLLMRepository'

export type LLMProviderType = 'openai' | 'mock'

export interface LLMRepositoryFactoryOptions {
  provider?: LLMProviderType
  config?: LLMConfig
  forceProvider?: boolean
}

export class LLMRepositoryFactory {
  /**
   * 指定されたプロバイダーのLLM Repositoryを作成
   */
  static create(options: LLMRepositoryFactoryOptions = {}): LLMRepositoryInterface {
    const { provider, config, forceProvider = false } = options

    // 環境に基づく自動選択
    if (!provider && !forceProvider) {
      return this.createFromEnvironment(config)
    }

    // 明示的なプロバイダー指定
    const targetProvider = provider || 'openai'
    const llmConfig = config || LLMConfig.fromEnvironment()

    switch (targetProvider) {
      case 'openai':
        return this.createOpenAIRepository(llmConfig)

      case 'mock':
        return this.createMockRepository()

      default:
        throw new Error(`Unsupported LLM provider: ${targetProvider}`)
    }
  }

  /**
   * 環境に基づいてLLM Repositoryを作成
   */
  private static createFromEnvironment(config?: LLMConfig): LLMRepositoryInterface {
    const llmConfig = config || LLMConfig.fromEnvironment()

    // テスト環境の検出
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      return this.createMockRepository()
    }

    // 開発環境でのMock利用（オプション）
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_LLM === 'true') {
      return this.createMockRepository()
    }

    // 本番環境ではOpenAIを使用
    try {
      return this.createOpenAIRepository(llmConfig)
    } catch (error) {
      // フォールバックとしてMockを使用（開発時のみ）
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('Failed to create OpenAI repository, falling back to Mock:', error)
        return this.createMockRepository()
      }
      throw error
    }
  }

  /**
   * OpenAI Repository作成
   */
  static createOpenAIRepository(config?: LLMConfig): OpenAILLMRepository {
    const llmConfig = config || LLMConfig.fromEnvironment()
    return new OpenAILLMRepository(llmConfig)
  }

  /**
   * Mock Repository作成
   */
  static createMockRepository(variant?: 'default' | 'title-generation' | 'with-errors' | 'unhealthy'): MockLLMRepository {
    switch (variant) {
      case 'title-generation':
        return MockLLMRepository.createForTitleGeneration()

      case 'with-errors':
        return MockLLMRepository.createWithErrors()

      case 'unhealthy':
        return MockLLMRepository.createUnhealthy()

      default:
        return new MockLLMRepository()
    }
  }

  /**
   * テスト用のファクトリーメソッド
   */
  static forTesting(variant?: 'title-generation' | 'with-errors' | 'unhealthy'): LLMRepositoryInterface {
    return this.createMockRepository(variant)
  }

  /**
   * 本番用のファクトリーメソッド
   */
  static forProduction(config: LLMConfig): LLMRepositoryInterface {
    return this.createOpenAIRepository(config)
  }

  /**
   * 利用可能なプロバイダー一覧を取得
   */
  static getAvailableProviders(): LLMProviderType[] {
    return ['openai', 'mock']
  }

  /**
   * プロバイダーが利用可能かチェック
   */
  static isProviderAvailable(provider: LLMProviderType, config?: LLMConfig): boolean {
    try {
      switch (provider) {
        case 'openai': {
          const llmConfig = config || LLMConfig.fromEnvironment()
          return llmConfig.hasProvider('openai')
        }

        case 'mock':
          return true // Mockは常に利用可能

        default:
          return false
      }
    } catch {
      return false
    }
  }
}
