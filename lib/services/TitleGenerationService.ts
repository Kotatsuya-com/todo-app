/**
 * TitleGeneration Service Layer
 * AIタイトル生成のビジネスロジックとOrchestrationを担当
 */

import OpenAI from 'openai'
import { apiLogger } from '@/lib/logger'
import {
  TitleGenerationEntity,
  TitleGenerationOptions
} from '@/lib/entities/TitleGeneration'
export interface TitleGenerationServiceResult<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface TitleGenerationResponse {
  title: string
  metadata?: {
    model: string
    contentLength: number
    complexity: string
    temperature: number
  }
}

export class TitleGenerationService {
  private openai: OpenAI

  constructor(apiKey?: string) {
    if (!apiKey && !process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required')
    }

    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    })
  }

  /**
   * タイトル生成のメインオーケストレーション
   */
  async generateTitle(
    content: string,
    options?: TitleGenerationOptions
  ): Promise<TitleGenerationServiceResult<TitleGenerationResponse>> {
    const logger = apiLogger.child({ service: 'TitleGenerationService', method: 'generateTitle' })

    try {
      // 1. ドメインエンティティでバリデーション
      const entity = new TitleGenerationEntity({ content }, options)
      const validation = entity.validateRequest()

      if (!validation.valid) {
        logger.warn({ errors: validation.errors }, 'Title generation validation failed')
        return {
          success: false,
          error: validation.errors.join(', '),
          statusCode: 400
        }
      }

      // 2. OpenAI API呼び出し
      const generatedTitle = await this.callOpenAIAPI(entity)

      if (!generatedTitle) {
        logger.error('OpenAI API returned null or undefined result')
        return {
          success: false,
          error: 'Failed to generate title from AI service',
          statusCode: 500
        }
      }

      // 3. タイトル処理とレスポンス作成
      const processedTitle = entity.processGeneratedTitle(generatedTitle)
      const response = this.createResponse(entity, processedTitle)

      logger.info({
        contentLength: entity.contentLength,
        generatedTitle: processedTitle,
        model: entity.options.model
      }, 'Title generated successfully')

      return {
        success: true,
        data: response
      }

    } catch (error: any) {
      logger.error({
        error: error.message,
        stack: error.stack,
        contentLength: content?.length
      }, 'Title generation service error')

      // OpenAI特有のエラーハンドリング
      if (error.code === 'insufficient_quota') {
        return {
          success: false,
          error: 'AI service quota exceeded',
          statusCode: 429
        }
      }

      if (error.code === 'rate_limit_exceeded') {
        return {
          success: false,
          error: 'AI service rate limit exceeded',
          statusCode: 429
        }
      }

      return {
        success: false,
        error: 'Internal server error during title generation',
        statusCode: 500
      }
    }
  }

  /**
   * OpenAI APIを呼び出してタイトルを生成
   */
  private async callOpenAIAPI(entity: TitleGenerationEntity): Promise<string | null> {
    const logger = apiLogger.child({ service: 'TitleGenerationService', method: 'callOpenAIAPI' })

    try {
      const apiParams = entity.generateApiParameters()

      logger.debug({
        model: apiParams.model,
        temperature: apiParams.temperature,
        maxTokens: apiParams.max_tokens,
        contentLength: entity.contentLength
      }, 'Calling OpenAI API')

      const completion = await this.openai.chat.completions.create(apiParams)

      const generatedContent = completion.choices[0]?.message?.content

      logger.debug({
        hasResult: !!generatedContent,
        resultLength: generatedContent?.length,
        usage: completion.usage
      }, 'OpenAI API response received')

      return generatedContent

    } catch (error: any) {
      logger.error({
        error: error.message,
        code: error.code,
        type: error.type,
        contentLength: entity.contentLength
      }, 'OpenAI API call failed')

      // エラーを再スローして上位でハンドリング
      throw error
    }
  }

  /**
   * レスポンスオブジェクトの作成
   */
  private createResponse(
    entity: TitleGenerationEntity,
    generatedTitle: string
  ): TitleGenerationResponse {
    const complexity = entity.getContentComplexity()

    return {
      title: generatedTitle,
      metadata: {
        model: entity.options.model!,
        contentLength: entity.contentLength,
        complexity,
        temperature: entity.options.temperature!
      }
    }
  }

  /**
   * 複数のコンテンツのバッチ処理
   */
  async generateTitlesBatch(
    contents: string[],
    options?: TitleGenerationOptions
  ): Promise<TitleGenerationServiceResult<TitleGenerationResponse[]>> {
    const logger = apiLogger.child({ service: 'TitleGenerationService', method: 'generateTitlesBatch' })

    if (!contents || contents.length === 0) {
      return {
        success: false,
        error: 'No content provided for batch processing',
        statusCode: 400
      }
    }

    const maxBatchSize = 10
    if (contents.length > maxBatchSize) {
      return {
        success: false,
        error: `Batch size cannot exceed ${maxBatchSize} items`,
        statusCode: 400
      }
    }

    try {
      logger.info({ batchSize: contents.length }, 'Starting batch title generation')

      const results = await Promise.allSettled(
        contents.map(content => this.generateTitle(content, options))
      )

      const responses: TitleGenerationResponse[] = []
      const errors: string[] = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          responses.push(result.value.data!)
        } else {
          const errorMsg = result.status === 'fulfilled'
            ? result.value.error
            : result.reason?.message || 'Unknown error'
          errors.push(`Item ${index}: ${errorMsg}`)
        }
      })

      if (errors.length === results.length) {
        // 全て失敗
        logger.error({ errors }, 'All batch items failed')
        return {
          success: false,
          error: 'All items in batch failed to process',
          statusCode: 500
        }
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

      return {
        success: true,
        data: responses
      }

    } catch (error: any) {
      logger.error({ error: error.message, batchSize: contents.length }, 'Batch processing failed')
      return {
        success: false,
        error: 'Batch processing failed',
        statusCode: 500
      }
    }
  }

  /**
   * サービスのヘルスチェック
   */
  async healthCheck(): Promise<TitleGenerationServiceResult<{ status: string; model: string }>> {
    try {
      const testEntity = TitleGenerationEntity.fromContent('テストタスク')
      const apiParams = testEntity.generateApiParameters()

      // モデル情報のみ取得してサービスが利用可能か確認
      const response = await this.openai.models.retrieve(apiParams.model)

      return {
        success: true,
        data: {
          status: 'healthy',
          model: response.id
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: 'Service unavailable',
        statusCode: 503
      }
    }
  }
}
