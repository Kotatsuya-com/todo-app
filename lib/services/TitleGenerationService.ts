/**
 * TitleGeneration Service Layer
 * AIタイトル生成のビジネスロジックとOrchestrationを担当
 */

import { apiLogger } from '@/lib/logger'
import {
  TitleGenerationEntity,
  TitleGenerationOptions
} from '@/lib/entities/TitleGeneration'
import {
  ServiceResult,
  createServiceSuccess,
  createServiceError
} from '@/lib/utils'
import { LLMRepositoryInterface } from '@/lib/repositories/LLMRepository'
import { LLMRequestEntity } from '@/lib/entities/LLMRequest'
import { LLMRepositoryFactory } from '@/lib/repositories/LLMRepositoryFactory'

export interface TitleGenerationResponse {
  title: string
  metadata?: {
    model: string
    contentLength: number
    complexity: string
    temperature: number
    provider?: string
    quality?: string
    processingTime?: number
  }
}

export class TitleGenerationService {
  private llmRepository: LLMRepositoryInterface

  constructor(llmRepository?: LLMRepositoryInterface) {
    // Dependency Injection - LLMRepositoryを外部から注入
    this.llmRepository = llmRepository || LLMRepositoryFactory.create()
  }

  /**
   * タイトル生成のメインオーケストレーション
   */
  async generateTitle(
    content: string,
    options?: TitleGenerationOptions
  ): Promise<ServiceResult<TitleGenerationResponse>> {
    const logger = apiLogger.child({ service: 'TitleGenerationService', method: 'generateTitle' })

    try {
      // 1. ドメインエンティティでバリデーション
      const entity = new TitleGenerationEntity({ content }, options)
      const validation = entity.validateRequest()

      if (!validation.valid) {
        logger.warn({ errors: validation.errors }, 'Title generation validation failed')
        return createServiceError<TitleGenerationResponse>(
          'VALIDATION_ERROR',
          validation.errors.join(', '),
          400
        )
      }

      // 2. LLM Repository呼び出し
      const llmResult = await this.callLLMRepository(entity)
      const generatedTitle = llmResult.content

      if (!generatedTitle) {
        logger.error('OpenAI API returned null or undefined result')
        return createServiceError<TitleGenerationResponse>(
          'GENERATION_FAILED',
          'Failed to generate title from AI service',
          500
        )
      }

      // 3. タイトル処理とレスポンス作成
      const processedTitle = entity.processGeneratedTitle(generatedTitle)
      const response = this.createResponse(entity, processedTitle, llmResult.metadata)

      logger.info({
        contentLength: entity.contentLength,
        generatedTitle: processedTitle,
        model: entity.options.model,
        hasMetadata: !!response.metadata
      }, 'Title generated successfully')

      const successResult = createServiceSuccess(response)
      logger.debug({
        isSuccess: !successResult.error,
        hasData: !!successResult.data,
        title: successResult.data?.title
      }, 'Returning success result from TitleGenerationService')

      return successResult

    } catch (error: any) {
      logger.error({
        error: error.message,
        stack: error.stack,
        contentLength: content?.length
      }, 'Title generation service error')

      // LLM Repository特有のエラーハンドリング
      if (error.code === 'LLM_QUOTA_EXCEEDED') {
        return createServiceError<TitleGenerationResponse>(
          'QUOTA_EXCEEDED',
          'LLM service quota exceeded',
          429,
          undefined,
          error
        )
      }

      if (error.code === 'LLM_RATE_LIMIT') {
        return createServiceError<TitleGenerationResponse>(
          'RATE_LIMIT_EXCEEDED',
          'LLM service rate limit exceeded',
          429,
          undefined,
          error
        )
      }

      if (error.code === 'LLM_AUTH_ERROR') {
        return createServiceError<TitleGenerationResponse>(
          'AUTH_ERROR',
          'LLM authentication failed',
          401,
          undefined,
          error
        )
      }

      return createServiceError<TitleGenerationResponse>(
        'INTERNAL_ERROR',
        'Internal server error during title generation',
        500,
        undefined,
        error
      )
    }
  }

  /**
   * LLM Repositoryを呼び出してタイトルを生成
   */
  private async callLLMRepository(entity: TitleGenerationEntity): Promise<{ content: string | null; metadata: any }> {
    const logger = apiLogger.child({ service: 'TitleGenerationService', method: 'callLLMRepository' })

    try {
      // TitleGenerationEntityからLLMRequestEntityを作成
      const llmRequest = LLMRequestEntity.createTitleGenerationRequest(
        entity.content,
        {
          model: entity.options.model,
          temperature: entity.options.temperature,
          maxTokens: entity.options.maxTokens
        }
      )

      logger.debug({
        provider: this.llmRepository.getProviderInfo().name,
        model: llmRequest.options.model,
        temperature: llmRequest.options.temperature,
        maxTokens: llmRequest.options.maxTokens,
        contentLength: entity.contentLength
      }, 'Calling LLM Repository')

      const result = await this.llmRepository.executeRequest(llmRequest)

      if (result.error) {
        throw result.error
      }

      const response = result.data!
      const generatedContent = response.getTitleContent()
      const metadata = response.createMetadata()

      logger.debug({
        hasResult: !!generatedContent,
        resultLength: generatedContent?.length,
        quality: metadata.quality,
        processingTime: metadata.processingTime
      }, 'LLM Repository response received')

      return { content: generatedContent, metadata }

    } catch (error: any) {
      logger.error({
        error: error.message,
        code: error.code,
        provider: this.llmRepository.getProviderInfo().name,
        contentLength: entity.contentLength
      }, 'LLM Repository call failed')

      // エラーを再スローして上位でハンドリング
      throw error
    }
  }

  /**
   * レスポンスオブジェクトの作成
   */
  private createResponse(
    entity: TitleGenerationEntity,
    generatedTitle: string,
    llmMetadata?: any
  ): TitleGenerationResponse {
    const complexity = entity.getContentComplexity()

    return {
      title: generatedTitle,
      metadata: {
        model: llmMetadata?.model || entity.options.model!,
        contentLength: entity.contentLength,
        complexity,
        temperature: entity.options.temperature!,
        provider: llmMetadata?.provider,
        quality: llmMetadata?.quality,
        processingTime: llmMetadata?.processingTime
      }
    }
  }

  /**
   * 複数のコンテンツのバッチ処理
   */
  async generateTitlesBatch(
    contents: string[],
    options?: TitleGenerationOptions
  ): Promise<ServiceResult<TitleGenerationResponse[]>> {
    const logger = apiLogger.child({ service: 'TitleGenerationService', method: 'generateTitlesBatch' })

    if (!contents || contents.length === 0) {
      return createServiceError<TitleGenerationResponse[]>(
        'EMPTY_BATCH',
        'No content provided for batch processing',
        400
      )
    }

    const maxBatchSize = 10
    if (contents.length > maxBatchSize) {
      return createServiceError<TitleGenerationResponse[]>(
        'BATCH_SIZE_EXCEEDED',
        `Batch size cannot exceed ${maxBatchSize} items`,
        400
      )
    }

    try {
      logger.info({ batchSize: contents.length }, 'Starting batch title generation')

      const results = await Promise.allSettled(
        contents.map(content => this.generateTitle(content, options))
      )

      const responses: TitleGenerationResponse[] = []
      const errors: string[] = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.data) {
          responses.push(result.value.data)
        } else {
          const errorMsg = result.status === 'fulfilled'
            ? result.value.error?.message || 'Unknown error'
            : result.reason?.message || 'Unknown error'
          errors.push(`Item ${index}: ${errorMsg}`)
        }
      })

      if (errors.length === results.length) {
        // 全て失敗
        logger.error({ errors }, 'All batch items failed')
        return createServiceError<TitleGenerationResponse[]>(
          'BATCH_ALL_FAILED',
          'All items in batch failed to process',
          500
        )
      }

      if (errors.length > 0) {
        // 部分的成功
        logger.warn({
          successCount: responses.length,
          errorCount: errors.length,
          errors
        }, 'Batch completed with partial success')
      } else {
        logger.info({ successCount: responses.length }, 'Batch completed successfully')
      }

      return createServiceSuccess(responses)

    } catch (error: any) {
      logger.error({ error: error.message, batchSize: contents.length }, 'Batch processing failed')
      return createServiceError<TitleGenerationResponse[]>(
        'BATCH_ERROR',
        'Batch processing failed',
        500,
        undefined,
        error
      )
    }
  }

  /**
   * サービスのヘルスチェック
   */
  async healthCheck(): Promise<ServiceResult<{ status: string; model: string }>> {
    try {
      // LLM Repositoryのヘルスチェック
      const healthResult = await this.llmRepository.checkHealth()

      if (healthResult.error) {
        throw healthResult.error
      }

      const healthData = healthResult.data!

      return createServiceSuccess({
        status: healthData.status,
        model: healthData.model,
        provider: healthData.provider,
        latency: healthData.latency
      })
    } catch (error: any) {
      return createServiceError<{ status: string; model: string }>(
        'SERVICE_UNAVAILABLE',
        'Service unavailable',
        503,
        undefined,
        error
      )
    }
  }
}
