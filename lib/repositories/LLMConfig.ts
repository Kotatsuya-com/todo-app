/**
 * LLM Configuration Management
 * LLMプロバイダーの設定管理
 */

export interface LLMProviderConfig {
  apiKey: string
  baseUrl?: string
  timeout?: number
  maxRetries?: number
  defaultModel?: string
}

export interface LLMConfigOptions {
  openai?: LLMProviderConfig
  anthropic?: LLMProviderConfig  // 将来の拡張用
  defaultProvider?: 'openai' | 'anthropic'
}

export class LLMConfig {
  private static readonly DEFAULT_TIMEOUT = 30000  // 30秒
  private static readonly DEFAULT_MAX_RETRIES = 3
  private static readonly DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'

  private readonly _configs: LLMConfigOptions

  constructor(options: LLMConfigOptions = {}) {
    this._configs = this.validateAndNormalizeConfig(options)
  }

  private validateAndNormalizeConfig(options: LLMConfigOptions): LLMConfigOptions {
    const config: LLMConfigOptions = {
      defaultProvider: options.defaultProvider || 'openai'
    }

    // OpenAI設定の検証と正規化
    if (options.openai) {
      config.openai = this.validateOpenAIConfig(options.openai)
    } else {
      // 環境変数からの設定取得
      const apiKey = process.env.OPENAI_API_KEY
      if (apiKey) {
        config.openai = this.validateOpenAIConfig({ apiKey })
      }
    }

    // 設定の妥当性確認
    if (!config.openai && config.defaultProvider === 'openai') {
      throw new Error('OpenAI configuration is required when using OpenAI as default provider')
    }

    return config
  }

  private validateOpenAIConfig(config: LLMProviderConfig): LLMProviderConfig {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required')
    }

    return {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.openai.com/v1',
      timeout: config.timeout || LLMConfig.DEFAULT_TIMEOUT,
      maxRetries: config.maxRetries || LLMConfig.DEFAULT_MAX_RETRIES,
      defaultModel: config.defaultModel || LLMConfig.DEFAULT_OPENAI_MODEL
    }
  }

  // 設定取得メソッド
  getOpenAIConfig(): LLMProviderConfig | undefined {
    return this._configs.openai
  }

  getDefaultProvider(): 'openai' | 'anthropic' {
    return this._configs.defaultProvider || 'openai'
  }

  hasProvider(provider: 'openai' | 'anthropic'): boolean {
    return this._configs[provider] !== undefined
  }

  // 静的ファクトリーメソッド
  static fromEnvironment(): LLMConfig {
    return new LLMConfig({
      defaultProvider: 'openai'
    })
  }

  static forTesting(apiKey: string = 'test-key'): LLMConfig {
    return new LLMConfig({
      openai: {
        apiKey,
        timeout: 5000,  // テスト用の短いタイムアウト
        maxRetries: 1
      },
      defaultProvider: 'openai'
    })
  }

  static forProduction(configs: LLMConfigOptions): LLMConfig {
    return new LLMConfig(configs)
  }
}
