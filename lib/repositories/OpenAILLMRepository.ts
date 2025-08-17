/**
 * OpenAI LLM Repository Implementation
 * OpenAI固有の実装詳細
 */

import {
  LLMRepositoryInterface,
  LLMRepositoryError,
  LLMHealthCheckResult
} from '@/lib/repositories/LLMRepository'
import { RepositoryResult, RepositoryUtils } from '@/lib/repositories/BaseRepository'
import { LLMRequestEntity } from '@/lib/entities/LLMRequest'
import { LLMResponseEntity } from '@/lib/entities/LLMResponse'
import { LLMConfig, LLMProviderConfig } from '@/lib/repositories/LLMConfig'

export class OpenAILLMRepository implements LLMRepositoryInterface {
  private openaiClient: any
  private config: LLMProviderConfig

  constructor(llmConfig: LLMConfig) {
    const openaiConfig = llmConfig.getOpenAIConfig()
    if (!openaiConfig) {
      throw new Error('OpenAI configuration is required')
    }

    this.config = openaiConfig
    this.initializeClient()
  }

  private initializeClient(): void {
    try {
      // Dynamic import to avoid bundling OpenAI when not needed
      const OpenAI = require('openai')
      this.openaiClient = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl,
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries
      })
    } catch (error) {
      throw new Error(`Failed to initialize OpenAI client: ${error}`)
    }
  }

  async executeRequest(request: LLMRequestEntity): Promise<RepositoryResult<LLMResponseEntity>> {
    try {
      const startTime = Date.now()
      const apiRequest = request.toApiRequest()

      const completion = await this.openaiClient.chat.completions.create(apiRequest)
      const processingTime = Date.now() - startTime

      const responseEntity = LLMResponseEntity.fromOpenAIResponse(
        completion,
        'OpenAI',
        processingTime
      )

      return RepositoryUtils.success(responseEntity)

    } catch (error: any) {
      return RepositoryUtils.failure(this.handleOpenAIError(error))
    }
  }

  async checkHealth(): Promise<RepositoryResult<LLMHealthCheckResult>> {
    try {
      const startTime = Date.now()

      // モデル情報取得でヘルスチェック
      const modelInfo = await this.openaiClient.models.retrieve(
        this.config.defaultModel || 'gpt-4o-mini'
      )

      const latency = Date.now() - startTime

      const healthResult: LLMHealthCheckResult = {
        status: 'healthy',
        provider: 'OpenAI',
        model: modelInfo.id,
        latency
      }

      return RepositoryUtils.success(healthResult)

    } catch (error: any) {
      const healthResult: LLMHealthCheckResult = {
        status: 'unhealthy',
        provider: 'OpenAI',
        model: this.config.defaultModel || 'unknown',
        error: error.message
      }

      return RepositoryUtils.success(healthResult)
    }
  }

  getProviderInfo(): { name: string; models: string[]; capabilities: string[] } {
    return {
      name: 'OpenAI',
      models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      capabilities: ['text-generation', 'conversation', 'function-calling']
    }
  }

  async executeBatchRequests(requests: LLMRequestEntity[]): Promise<RepositoryResult<LLMResponseEntity[]>> {
    try {
      // バッチ処理 - 並列実行
      const batchPromises = requests.map(request => this.executeRequest(request))
      const results = await Promise.allSettled(batchPromises)

      const responses: LLMResponseEntity[] = []
      const errors: string[] = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.data) {
          responses.push(result.value.data)
        } else {
          const error = result.status === 'fulfilled'
            ? result.value.error?.message || 'Unknown error'
            : result.reason?.message || 'Unknown error'
          errors.push(`Request ${index + 1}: ${error}`)
        }
      })

      if (responses.length === 0) {
        return RepositoryUtils.failure(
          LLMRepositoryError.unexpectedError(
            new Error(`All batch requests failed: ${errors.join(', ')}`)
          )
        )
      }

      return RepositoryUtils.success(responses)

    } catch (error: any) {
      return RepositoryUtils.failure(this.handleOpenAIError(error))
    }
  }

  private handleOpenAIError(error: any): LLMRepositoryError {
    // OpenAI特有のエラーハンドリング
    if (error.code === 'insufficient_quota') {
      return LLMRepositoryError.quotaExceededError(error)
    }

    if (error.code === 'rate_limit_exceeded') {
      return LLMRepositoryError.rateLimitError(error)
    }

    if (error.code === 'invalid_api_key' || error.code === 'authentication_error') {
      return LLMRepositoryError.authenticationError(error)
    }

    if (error.code === 'model_not_found') {
      return LLMRepositoryError.modelNotFoundError(error.model || 'unknown', error)
    }

    if (error.code === 'timeout' || error.name === 'TimeoutError') {
      return LLMRepositoryError.timeoutError(error)
    }

    if (error.code === 'network_error' || error.code === 'connection_error') {
      return LLMRepositoryError.connectionError(error)
    }

    // その他の予期しないエラー
    return LLMRepositoryError.unexpectedError(error)
  }
}
