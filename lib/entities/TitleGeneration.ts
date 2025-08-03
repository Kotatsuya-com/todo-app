/**
 * TitleGeneration Domain Entity
 * AIタイトル生成に関するビジネスルールとバリデーションを定義
 */

export interface TitleGenerationRequest {
  content: string
}

export interface TitleGenerationResult {
  title: string
  originalContent: string
  contentLength: number
  model: string
}

export interface TitleGenerationOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  maxLength?: number
}

export class TitleGenerationEntity {
  private _request: TitleGenerationRequest
  private _options: TitleGenerationOptions

  // ビジネスルール定数
  public static readonly MIN_CONTENT_LENGTH = 1
  public static readonly MAX_CONTENT_LENGTH = 2000
  public static readonly DEFAULT_MAX_TITLE_LENGTH = 15
  public static readonly DEFAULT_MODEL = 'gpt-4o-mini'
  public static readonly DEFAULT_MAX_TOKENS = 50
  public static readonly DEFAULT_TEMPERATURE = 0.7
  public static readonly FALLBACK_TITLE = 'タスク'

  constructor(request: TitleGenerationRequest, options: TitleGenerationOptions = {}) {
    // イミュータビリティを保証するため深いコピーを作成
    this._request = {
      content: request.content
    }

    this._options = {
      model: options.model || TitleGenerationEntity.DEFAULT_MODEL,
      maxTokens: options.maxTokens || TitleGenerationEntity.DEFAULT_MAX_TOKENS,
      temperature: options.temperature || TitleGenerationEntity.DEFAULT_TEMPERATURE,
      maxLength: options.maxLength || TitleGenerationEntity.DEFAULT_MAX_TITLE_LENGTH
    }
  }

  get content(): string {
    return this._request.content
  }

  get options(): TitleGenerationOptions {
    return { ...this._options }
  }

  get contentLength(): number {
    return this._request.content?.length || 0
  }

  /**
   * 入力コンテンツの基本バリデーション
   */
  isValidContent(): boolean {
    if (!this._request.content || typeof this._request.content !== 'string') {
      return false
    }

    const length = this._request.content.trim().length
    return length >= TitleGenerationEntity.MIN_CONTENT_LENGTH &&
           length <= TitleGenerationEntity.MAX_CONTENT_LENGTH
  }

  /**
   * リクエスト全体の整合性チェック
   */
  validateRequest(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this._request.content) {
      errors.push('Content is required')
    } else if (typeof this._request.content !== 'string') {
      errors.push('Content must be a string')
    } else {
      const trimmedLength = this._request.content.trim().length

      if (trimmedLength < TitleGenerationEntity.MIN_CONTENT_LENGTH) {
        errors.push('Content cannot be empty')
      }

      if (trimmedLength > TitleGenerationEntity.MAX_CONTENT_LENGTH) {
        errors.push(`Content cannot exceed ${TitleGenerationEntity.MAX_CONTENT_LENGTH} characters`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * OpenAI APIリクエストパラメータを生成
   */
  generateApiParameters(): {
    model: string
    messages: Array<{ role: 'system' | 'user'; content: string }>
    temperature: number
    max_tokens: number
    } {
    return {
      model: this._options.model!,
      messages: [
        {
          role: 'system',
          content: `あなたはタスクの内容から簡潔で分かりやすい見出しを生成するアシスタントです。見出しは${this._options.maxLength}文字以内で、タスクの本質を表すものにしてください。`
        },
        {
          role: 'user',
          content: `以下のタスクの内容から、簡潔な見出しを生成してください：\n\n${this._request.content}`
        }
      ],
      temperature: this._options.temperature!,
      max_tokens: this._options.maxTokens!
    }
  }

  /**
   * 生成されたタイトルを検証・清理
   */
  processGeneratedTitle(rawTitle: string | null | undefined): string {
    if (!rawTitle) {
      return TitleGenerationEntity.FALLBACK_TITLE
    }

    const cleaned = rawTitle.trim()

    if (cleaned.length === 0) {
      return TitleGenerationEntity.FALLBACK_TITLE
    }

    // 最大長を超えている場合は切り詰める
    if (cleaned.length > this._options.maxLength!) {
      return cleaned.substring(0, this._options.maxLength!).trim()
    }

    return cleaned
  }

  /**
   * タイトル生成結果オブジェクトを作成
   */
  createResult(generatedTitle: string): TitleGenerationResult {
    return {
      title: generatedTitle,
      originalContent: this._request.content,
      contentLength: this.contentLength,
      model: this._options.model!
    }
  }

  /**
   * コンテンツの複雑度を判定（温度調整用）
   */
  getContentComplexity(): 'simple' | 'medium' | 'complex' {
    const content = this._request.content.trim()
    const wordCount = content.split(/\s+/).length
    const hasSpecialChars = /[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(content)

    if (wordCount <= 5 && !hasSpecialChars) {
      return 'simple'
    } else if (wordCount <= 20) {
      return 'medium'
    } else {
      return 'complex'
    }
  }

  /**
   * 推奨温度を取得
   */
  getRecommendedTemperature(): number {
    const complexity = this.getContentComplexity()

    switch (complexity) {
      case 'simple':
        return 0.3
      case 'medium':
        return 0.7
      case 'complex':
        return 0.9
      default:
        return TitleGenerationEntity.DEFAULT_TEMPERATURE
    }
  }

  /**
   * ファクトリーメソッド
   */
  static fromContent(content: string, options?: TitleGenerationOptions): TitleGenerationEntity {
    return new TitleGenerationEntity({ content }, options)
  }

  /**
   * 推奨設定でのファクトリーメソッド
   */
  static withOptimizedSettings(content: string): TitleGenerationEntity {
    const entity = new TitleGenerationEntity({ content })
    const recommendedTemp = entity.getRecommendedTemperature()

    return new TitleGenerationEntity({ content }, {
      temperature: recommendedTemp
    })
  }
}
