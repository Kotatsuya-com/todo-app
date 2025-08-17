/**
 * Mock LLM Repository Implementation
 * テスト用のLLM Repository実装
 */

import {
  LLMRepositoryInterface,
  LLMRepositoryError,
  LLMHealthCheckResult
} from '@/lib/repositories/LLMRepository'
import { RepositoryResult, RepositoryUtils } from '@/lib/repositories/BaseRepository'
import { LLMRequestEntity } from '@/lib/entities/LLMRequest'
import { LLMResponseEntity } from '@/lib/entities/LLMResponse'

export interface MockLLMResponseMapping {
  userContent: string
  response: string
  shouldFail?: boolean
  errorCode?: string
  delay?: number
}

export class MockLLMRepository implements LLMRepositoryInterface {
  private responseMappings: Map<string, MockLLMResponseMapping> = new Map()
  private defaultResponse: string = 'Mock Generated Title'
  private healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  private shouldFailHealth: boolean = false

  // Mock設定メソッド
  setMockResponse(userContent: string, response: MockLLMResponseMapping): void {
    this.responseMappings.set(userContent, response)
  }

  setDefaultResponse(response: string): void {
    this.defaultResponse = response
  }

  setHealthStatus(status: 'healthy' | 'degraded' | 'unhealthy'): void {
    this.healthStatus = status
  }

  setShouldFailHealth(shouldFail: boolean): void {
    this.shouldFailHealth = shouldFail
  }

  clearMockResponses(): void {
    this.responseMappings.clear()
  }

  // LLMRepositoryInterface実装
  async executeRequest(request: LLMRequestEntity): Promise<RepositoryResult<LLMResponseEntity>> {
    try {
      const userContent = request.userMessageContent
      const mapping = this.responseMappings.get(userContent)

      // 遅延シミュレーション
      if (mapping?.delay) {
        await new Promise(resolve => setTimeout(resolve, mapping.delay))
      }

      // エラーシミュレーション
      if (mapping?.shouldFail) {
        const errorCode = mapping.errorCode || 'MOCK_ERROR'
        return RepositoryUtils.failure(
          new LLMRepositoryError('Mock error simulation', errorCode, 500)
        )
      }

      // レスポンス生成
      const responseContent = mapping?.response || this.defaultResponse
      const responseEntity = LLMResponseEntity.fromMockResponse(responseContent, 'Mock')

      return RepositoryUtils.success(responseEntity)

    } catch (error: any) {
      return RepositoryUtils.failure(
        LLMRepositoryError.unexpectedError(error)
      )
    }
  }

  async checkHealth(): Promise<RepositoryResult<LLMHealthCheckResult>> {
    if (this.shouldFailHealth) {
      const healthResult: LLMHealthCheckResult = {
        status: 'unhealthy',
        provider: 'Mock',
        model: 'mock-model',
        error: 'Mock health check failure'
      }
      return RepositoryUtils.success(healthResult)
    }

    const healthResult: LLMHealthCheckResult = {
      status: this.healthStatus,
      provider: 'Mock',
      model: 'mock-model',
      latency: 10
    }

    return RepositoryUtils.success(healthResult)
  }

  getProviderInfo(): { name: string; models: string[]; capabilities: string[] } {
    return {
      name: 'Mock',
      models: ['mock-model', 'mock-advanced-model'],
      capabilities: ['text-generation', 'testing', 'simulation']
    }
  }

  async executeBatchRequests(requests: LLMRequestEntity[]): Promise<RepositoryResult<LLMResponseEntity[]>> {
    try {
      const responses: LLMResponseEntity[] = []

      for (const request of requests) {
        const result = await this.executeRequest(request)
        if (result.data) {
          responses.push(result.data)
        } else {
          // バッチ内の一部失敗をシミュレート
          throw new Error(`Batch request failed: ${result.error?.message}`)
        }
      }

      return RepositoryUtils.success(responses)

    } catch (error: any) {
      return RepositoryUtils.failure(
        LLMRepositoryError.unexpectedError(error)
      )
    }
  }

  // テスト用便利メソッド
  static createForTitleGeneration(): MockLLMRepository {
    const mock = new MockLLMRepository()

    // よくあるタイトル生成パターンを設定
    mock.setMockResponse('プロジェクトの企画書を作成する', {
      userContent: 'プロジェクトの企画書を作成する',
      response: '企画書作成'
    })

    mock.setMockResponse('会議の議事録をまとめる', {
      userContent: '会議の議事録をまとめる',
      response: '議事録作成'
    })

    mock.setMockResponse('レポートを書く', {
      userContent: 'レポートを書く',
      response: 'レポート作成'
    })

    return mock
  }

  static createWithErrors(): MockLLMRepository {
    const mock = new MockLLMRepository()

    // エラーケースを設定
    mock.setMockResponse('quota error', {
      userContent: 'quota error',
      response: '',
      shouldFail: true,
      errorCode: 'LLM_QUOTA_EXCEEDED'
    })

    mock.setMockResponse('rate limit', {
      userContent: 'rate limit',
      response: '',
      shouldFail: true,
      errorCode: 'LLM_RATE_LIMIT'
    })

    mock.setMockResponse('timeout', {
      userContent: 'timeout',
      response: '',
      shouldFail: true,
      errorCode: 'LLM_TIMEOUT'
    })

    return mock
  }

  static createUnhealthy(): MockLLMRepository {
    const mock = new MockLLMRepository()
    mock.setHealthStatus('unhealthy')
    mock.setShouldFailHealth(true)
    return mock
  }
}
