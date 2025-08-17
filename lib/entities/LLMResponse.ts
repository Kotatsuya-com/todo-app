/**
 * LLM Response Entity
 * LLMレスポンスのドメインエンティティ - レスポンス処理とビジネスルール
 */

export interface LLMUsageData {
  promptTokens?: number
  completionTokens?: number
  totalTokens: number
}

export interface LLMResponseChoice {
  message: {
    content: string | null
    role: string
  }
  finishReason?: string
}

export interface LLMResponseData {
  choices: LLMResponseChoice[]
  usage?: LLMUsageData
  model?: string
  provider?: string
  requestId?: string
  processingTime?: number
}

export class LLMResponseEntity {
  private readonly _choices: LLMResponseChoice[]
  private readonly _usage?: LLMUsageData
  private readonly _model?: string
  private readonly _provider?: string
  private readonly _requestId?: string
  private readonly _processingTime?: number

  constructor(data: LLMResponseData) {
    this._choices = data.choices || []
    this._usage = data.usage
    this._model = data.model
    this._provider = data.provider
    this._requestId = data.requestId
    this._processingTime = data.processingTime

    this.validateResponse()
  }

  // レスポンス検証
  private validateResponse(): void {
    if (!this._choices || this._choices.length === 0) {
      throw new Error('LLM Response must contain at least one choice')
    }

    // 少なくとも1つの有効なコンテンツが必要
    const hasValidContent = this._choices.some(choice =>
      choice.message &&
      choice.message.content &&
      choice.message.content.trim().length > 0
    )

    if (!hasValidContent) {
      throw new Error('LLM Response must contain at least one choice with valid content')
    }
  }

  // ゲッター
  get choices(): readonly LLMResponseChoice[] {
    return this._choices
  }

  get usage(): Readonly<LLMUsageData> | undefined {
    return this._usage
  }

  get model(): string | undefined {
    return this._model
  }

  get provider(): string | undefined {
    return this._provider
  }

  get requestId(): string | undefined {
    return this._requestId
  }

  get processingTime(): number | undefined {
    return this._processingTime
  }

  // ビジネスロジック
  get primaryContent(): string | null {
    const primaryChoice = this._choices[0]
    return primaryChoice?.message?.content || null
  }

  get hasContent(): boolean {
    return this.primaryContent !== null && this.primaryContent.trim().length > 0
  }

  get isSuccessful(): boolean {
    return this.hasContent
  }

  get choiceCount(): number {
    return this._choices.length
  }

  // コンテンツ処理
  getProcessedContent(): string | null {
    const content = this.primaryContent
    if (!content) {return null}

    // コンテンツのクリーニングとトリム
    return content
      .trim()
      .replace(/^["'`]/, '') // 開始の引用符を削除
      .replace(/["'`]$/, '') // 終了の引用符を削除
      .trim()
  }

  // タイトル生成用の特別な処理
  getTitleContent(): string | null {
    const processed = this.getProcessedContent()
    if (!processed) {return null}

    // タイトル用の追加処理
    const title = processed
      .replace(/^タイトル[:：]\s*/, '') // "タイトル:" プレフィックスを削除
      .replace(/^「/, '').replace(/」$/, '') // 日本語の括弧を削除
      .trim()

    // 長すぎる場合は切り詰め
    if (title.length > 15) {
      return title.substring(0, 15)
    }

    return title
  }

  // 品質評価
  getContentQuality(): 'high' | 'medium' | 'low' {
    const content = this.primaryContent
    if (!content) {return 'low'}

    const length = content.trim().length
    const hasValidFinishReason = this._choices[0]?.finishReason === 'stop'

    if (length >= 5 && length <= 20 && hasValidFinishReason) {
      return 'high'
    } else if (length >= 3 && length <= 30) {
      return 'medium'
    } else {
      return 'low'
    }
  }

  // メタデータ作成
  createMetadata(): {
    model?: string
    provider?: string
    contentLength: number
    quality: string
    processingTime?: number
    tokenUsage?: LLMUsageData
    } {
    const content = this.getProcessedContent()

    return {
      model: this._model,
      provider: this._provider,
      contentLength: content?.length || 0,
      quality: this.getContentQuality(),
      processingTime: this._processingTime,
      tokenUsage: this._usage
    }
  }

  // ファクトリーメソッド
  static fromOpenAIResponse(
    openaiResponse: any,
    provider: string = 'OpenAI',
    processingTime?: number
  ): LLMResponseEntity {
    return new LLMResponseEntity({
      choices: openaiResponse.choices || [],
      usage: {
        promptTokens: openaiResponse.usage?.prompt_tokens,
        completionTokens: openaiResponse.usage?.completion_tokens,
        totalTokens: openaiResponse.usage?.total_tokens || 0
      },
      model: openaiResponse.model,
      provider,
      processingTime
    })
  }

  static fromMockResponse(
    content: string,
    provider: string = 'Mock'
  ): LLMResponseEntity {
    return new LLMResponseEntity({
      choices: [{
        message: {
          content,
          role: 'assistant'
        },
        finishReason: 'stop'
      }],
      usage: {
        totalTokens: 10
      },
      model: 'mock-model',
      provider
    })
  }
}
