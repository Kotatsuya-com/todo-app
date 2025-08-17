/**
 * LLM Request Entity
 * LLMリクエストのドメインエンティティ - ビジネスルールと検証を含む
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMRequestOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  timeout?: number
}

export interface LLMRequestData {
  messages: LLMMessage[]
  options?: LLMRequestOptions
}

export class LLMRequestEntity {
  private readonly _messages: LLMMessage[]
  private readonly _options: Required<LLMRequestOptions>

  // デフォルト設定
  private static readonly DEFAULT_OPTIONS: Required<LLMRequestOptions> = {
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 50,
    timeout: 30000
  }

  // ビジネスルール定数
  private static readonly MAX_MESSAGES = 10
  private static readonly MAX_CONTENT_LENGTH = 2000
  private static readonly MIN_TEMPERATURE = 0.0
  private static readonly MAX_TEMPERATURE = 2.0
  private static readonly MIN_MAX_TOKENS = 1
  private static readonly MAX_MAX_TOKENS = 4000

  constructor(data: LLMRequestData) {
    this._messages = data.messages
    this._options = {
      ...LLMRequestEntity.DEFAULT_OPTIONS,
      ...data.options
    }

    this.validateRequest()
  }

  // ビジネスルール検証
  private validateRequest(): void {
    const errors: string[] = []

    // メッセージ検証
    if (!this._messages || this._messages.length === 0) {
      errors.push('Messages are required')
    }

    if (this._messages.length > LLMRequestEntity.MAX_MESSAGES) {
      errors.push(`Message count cannot exceed ${LLMRequestEntity.MAX_MESSAGES}`)
    }

    // 各メッセージの内容検証
    this._messages.forEach((message, index) => {
      if (!message.content || message.content.trim().length === 0) {
        errors.push(`Message ${index + 1} content cannot be empty`)
      }

      if (message.content.length > LLMRequestEntity.MAX_CONTENT_LENGTH) {
        errors.push(`Message ${index + 1} content exceeds maximum length of ${LLMRequestEntity.MAX_CONTENT_LENGTH}`)
      }

      if (!['system', 'user', 'assistant'].includes(message.role)) {
        errors.push(`Message ${index + 1} has invalid role: ${message.role}`)
      }
    })

    // オプション検証
    if (this._options.temperature < LLMRequestEntity.MIN_TEMPERATURE ||
        this._options.temperature > LLMRequestEntity.MAX_TEMPERATURE) {
      errors.push(`Temperature must be between ${LLMRequestEntity.MIN_TEMPERATURE} and ${LLMRequestEntity.MAX_TEMPERATURE}`)
    }

    if (this._options.maxTokens < LLMRequestEntity.MIN_MAX_TOKENS ||
        this._options.maxTokens > LLMRequestEntity.MAX_MAX_TOKENS) {
      errors.push(`Max tokens must be between ${LLMRequestEntity.MIN_MAX_TOKENS} and ${LLMRequestEntity.MAX_MAX_TOKENS}`)
    }

    if (errors.length > 0) {
      throw new Error(`LLM Request validation failed: ${errors.join(', ')}`)
    }
  }

  // ゲッター
  get messages(): readonly LLMMessage[] {
    return this._messages
  }

  get options(): Readonly<Required<LLMRequestOptions>> {
    return this._options
  }

  // ビジネスロジック
  get messageCount(): number {
    return this._messages.length
  }

  get totalContentLength(): number {
    return this._messages.reduce((total, message) => total + message.content.length, 0)
  }

  get hasSystemMessage(): boolean {
    return this._messages.some(message => message.role === 'system')
  }

  get userMessageContent(): string {
    const userMessage = this._messages.find(message => message.role === 'user')
    return userMessage?.content || ''
  }

  // 複雑度判定
  getContentComplexity(): 'simple' | 'medium' | 'complex' {
    const contentLength = this.totalContentLength

    if (contentLength <= 50) {
      return 'simple'
    }
    if (contentLength <= 200) {
      return 'medium'
    }
    return 'complex'
  }

  // API呼び出し用のデータ取得
  toApiRequest(): {
    model: string
    messages: LLMMessage[]
    temperature: number
    max_tokens: number
    } {
    return {
      model: this._options.model,
      messages: [...this._messages],
      temperature: this._options.temperature,
      max_tokens: this._options.maxTokens
    }
  }

  // ファクトリーメソッド
  static createTitleGenerationRequest(
    content: string,
    options?: Partial<LLMRequestOptions>
  ): LLMRequestEntity {
    const systemMessage: LLMMessage = {
      role: 'system',
      content: 'あなたは日本語のタスクタイトルを生成するアシスタントです。入力されたタスク内容から、簡潔で分かりやすい15文字以内のタイトルを生成してください。'
    }

    const userMessage: LLMMessage = {
      role: 'user',
      content: `以下のタスク内容からタイトルを生成してください：\n\n${content}`
    }

    return new LLMRequestEntity({
      messages: [systemMessage, userMessage],
      options
    })
  }
}
