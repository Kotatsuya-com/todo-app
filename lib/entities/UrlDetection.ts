/**
 * UrlDetection Domain Entity
 * URL検出とアプリベースURL生成に関するビジネスルールとバリデーションを定義
 */

export interface UrlDetectionRequest {
  requestUrl: string
  protocol?: string
  hostname?: string
  port?: string
}

export interface UrlDetectionResult {
  appUrl: string
  environment: 'ngrok' | 'production' | 'localhost' | 'custom'
  protocol: string
  hostname: string
  port?: string
  isStandardPort: boolean
}

export interface UrlDetectionOptions {
  ngrokUrl?: string | null
  publicAppUrl?: string | null
  fallbackUrl?: string
}

export class UrlDetectionEntity {
  private _request: UrlDetectionRequest
  private _options: UrlDetectionOptions

  // ビジネスルール定数
  public static readonly STANDARD_HTTP_PORT = '80'
  public static readonly STANDARD_HTTPS_PORT = '443'
  public static readonly DEFAULT_FALLBACK_URL = 'http://localhost:3000'
  public static readonly NGROK_DOMAIN_PATTERN = /\.ngrok\.io$/
  public static readonly LOCALHOST_PATTERN = /^(localhost|127\.0\.0\.1|::1|\[::1\])$/

  constructor(request: UrlDetectionRequest, options: UrlDetectionOptions = {}) {
    // イミュータビリティを保証するため深いコピーを作成
    this._request = {
      requestUrl: request.requestUrl,
      protocol: request.protocol,
      hostname: request.hostname,
      port: request.port
    }

    this._options = {
      ngrokUrl: options.ngrokUrl,
      publicAppUrl: options.publicAppUrl,
      fallbackUrl: options.fallbackUrl || UrlDetectionEntity.DEFAULT_FALLBACK_URL
    }
  }

  get requestUrl(): string {
    return this._request.requestUrl
  }

  get options(): UrlDetectionOptions {
    return { ...this._options }
  }

  /**
   * リクエストURLの基本バリデーション
   */
  isValidRequestUrl(): boolean {
    if (!this._request.requestUrl || typeof this._request.requestUrl !== 'string') {
      return false
    }

    try {
      new URL(this._request.requestUrl)
      return true
    } catch {
      return false
    }
  }

  /**
   * リクエスト全体の整合性チェック
   */
  validateRequest(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this._request.requestUrl) {
      errors.push('Request URL is required')
    } else if (typeof this._request.requestUrl !== 'string') {
      errors.push('Request URL must be a string')
    } else if (!this.isValidRequestUrl()) {
      errors.push('Request URL format is invalid')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * URLからホスト名、ポート、プロトコルを抽出
   */
  parseRequestUrl(): { protocol: string; hostname: string; port: string } {
    try {
      const url = new URL(this._request.requestUrl)
      return {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port
      }
    } catch {
      // フォールバック: nextUrlプロパティから取得
      return {
        protocol: this._request.protocol || 'http:',
        hostname: this._request.hostname || 'localhost',
        port: this._request.port || ''
      }
    }
  }

  /**
   * ポートが標準ポートかどうかを判定
   */
  isStandardPort(protocol: string, port: string): boolean {
    if (!port) {return true}

    if (protocol === 'http:' && port === UrlDetectionEntity.STANDARD_HTTP_PORT) {
      return true
    }

    if (protocol === 'https:' && port === UrlDetectionEntity.STANDARD_HTTPS_PORT) {
      return true
    }

    return false
  }

  /**
   * 環境の種類を判定
   */
  detectEnvironment(hostname: string): 'ngrok' | 'production' | 'localhost' | 'custom' {
    // ngrok環境の検出
    if (UrlDetectionEntity.NGROK_DOMAIN_PATTERN.test(hostname)) {
      return 'ngrok'
    }

    // localhost環境の検出
    if (UrlDetectionEntity.LOCALHOST_PATTERN.test(hostname)) {
      return 'localhost'
    }

    // IPv6ローカルホストの検出
    if (hostname.includes('::1')) {
      return 'localhost'
    }

    // 本番環境 (カスタムドメインまたはVercel等)
    if (hostname.includes('.vercel.app') ||
        hostname.includes('.netlify.app') ||
        !hostname.includes('localhost')) {
      return 'production'
    }

    return 'custom'
  }

  /**
   * 優先順位に基づいてアプリベースURLを決定
   */
  determineAppBaseUrl(): string {
    // 1. ngrok URLが利用可能な場合（開発環境優先）
    if (this._options.ngrokUrl) {
      return this._options.ngrokUrl
    }

    // 2. 環境変数で設定されたパブリックURL
    if (this._options.publicAppUrl) {
      return this._options.publicAppUrl
    }

    // 3. リクエストから構築
    const parsedUrl = this.parseRequestUrl()
    return this.buildUrlFromComponents(parsedUrl.protocol, parsedUrl.hostname, parsedUrl.port)
  }

  /**
   * プロトコル、ホスト名、ポートからURLを構築
   */
  buildUrlFromComponents(protocol: string, hostname: string, port: string): string {
    if (!hostname) {
      return this._options.fallbackUrl!
    }

    let url = protocol ? `${protocol}//` : ''
    url += hostname

    // 標準ポート以外の場合のみポートを追加
    if (port && !this.isStandardPort(protocol, port)) {
      url += `:${port}`
    }

    return url || hostname
  }

  /**
   * URL検出結果オブジェクトを作成
   */
  createResult(): UrlDetectionResult {
    const appUrl = this.determineAppBaseUrl()
    const parsedUrl = this.parseRequestUrl()
    const environment = this.detectEnvironment(parsedUrl.hostname)

    return {
      appUrl,
      environment,
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || undefined,
      isStandardPort: this.isStandardPort(parsedUrl.protocol, parsedUrl.port)
    }
  }

  /**
   * アプリURLを正規化（パス、クエリ、フラグメントを除去）
   */
  normalizeAppUrl(rawUrl: string): string {
    try {
      const url = new URL(rawUrl)
      return this.buildUrlFromComponents(url.protocol, url.hostname, url.port)
    } catch {
      return this._options.fallbackUrl!
    }
  }

  /**
   * ファクトリーメソッド: リクエストURLから作成
   */
  static fromRequestUrl(requestUrl: string, options?: UrlDetectionOptions): UrlDetectionEntity {
    return new UrlDetectionEntity({ requestUrl }, options)
  }

  /**
   * ファクトリーメソッド: NextRequest風オブジェクトから作成
   */
  static fromNextRequest(
    requestUrl: string,
    nextUrl: { protocol?: string; hostname?: string; port?: string },
    options?: UrlDetectionOptions
  ): UrlDetectionEntity {
    return new UrlDetectionEntity({
      requestUrl,
      protocol: nextUrl.protocol,
      hostname: nextUrl.hostname,
      port: nextUrl.port
    }, options)
  }

  /**
   * 推奨設定でのファクトリーメソッド
   */
  static withEnvironmentDefaults(
    requestUrl: string,
    ngrokUrl?: string | null,
    publicAppUrl?: string | null
  ): UrlDetectionEntity {
    return new UrlDetectionEntity({ requestUrl }, {
      ngrokUrl,
      publicAppUrl,
      fallbackUrl: UrlDetectionEntity.DEFAULT_FALLBACK_URL
    })
  }
}
