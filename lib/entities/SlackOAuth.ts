/**
 * Slack OAuth Domain Entity
 * Slack OAuth認証に関するビジネスルールとバリデーションを定義
 */

export interface MaskedTokenData {
  ok: boolean
  app_id?: string
  team: {
    id: string
    name: string
  }
  authed_user?: {
    id: string
    scope: string
    access_token?: string
    token_type?: string
  } | null
  scope: string
  bot_user_id?: string
  access_token?: string
  token_type?: string
  refresh_token?: string
  expires_in?: number
  enterprise?: any
  is_enterprise_install?: boolean
  error?: string
}

export interface SlackOAuthTokenData {
  ok: boolean
  app_id?: string
  team: {
    id: string
    name: string
  }
  authed_user?: {
    id: string
    scope: string
    access_token: string
    token_type?: string
  }
  scope: string
  bot_user_id?: string
  access_token: string
  token_type?: string
  enterprise?: any
  is_enterprise_install?: boolean
  error?: string
}

export interface SlackOAuthConnectionData {
  user_id: string
  workspace_id: string
  workspace_name: string
  team_name: string
  access_token: string
  bot_user_id?: string
  scope: string
}

export class SlackOAuthEntity {
  constructor(private _tokenData: SlackOAuthTokenData) {}

  get tokenData(): SlackOAuthTokenData {
    return this._tokenData
  }

  get teamId(): string {
    return this._tokenData.team?.id
  }

  get teamName(): string {
    return this._tokenData.team?.name
  }

  get workspaceId(): string {
    return this.teamId
  }

  get workspaceName(): string {
    return this.teamName
  }

  get accessToken(): string {
    return this._tokenData.authed_user?.access_token || this._tokenData.access_token
  }

  get scope(): string {
    return this._tokenData.authed_user?.scope || this._tokenData.scope
  }

  get botUserId(): string | undefined {
    return this._tokenData.bot_user_id
  }

  /**
   * OAuth レスポンスが有効かどうかを検証
   */
  isValidTokenResponse(): boolean {
    if (!this._tokenData.ok) {
      return false
    }

    // 必須フィールドの存在確認
    if (!this._tokenData.team?.id || !this._tokenData.team?.name) {
      return false
    }

    // アクセストークンの存在確認
    const hasUserToken = this._tokenData.authed_user?.access_token
    const hasBotToken = this._tokenData.access_token
    if (!hasUserToken && !hasBotToken) {
      return false
    }

    // スコープの存在確認
    const hasUserScope = this._tokenData.authed_user?.scope
    const hasBotScope = this._tokenData.scope
    if (!hasUserScope && !hasBotScope) {
      return false
    }

    return true
  }

  /**
   * OAuth レスポンスからSlack User IDを抽出
   */
  extractSlackUserId(): string | null {
    return this._tokenData.authed_user?.id || null
  }

  /**
   * Slack User IDが有効なフォーマットかを検証
   */
  isValidSlackUserId(slackUserId: string): boolean {
    return /^U[A-Z0-9]{8,}$/.test(slackUserId)
  }

  /**
   * 基本的なSlackスコープが含まれているかを確認
   */
  hasBasicSlackScopes(): boolean {
    const requiredScopes = ['channels:read']
    const scopes = this.scope.split(',').map(s => s.trim())
    return requiredScopes.every(scope => scopes.includes(scope))
  }

  /**
   * OAuth の結果がエラーかどうかを確認
   */
  hasError(): boolean {
    return !this._tokenData.ok || !!this._tokenData.error
  }

  /**
   * エラーメッセージを取得
   */
  getError(): string | null {
    return this._tokenData.error || null
  }

  /**
   * SlackConnection作成用のデータに変換
   */
  toConnectionData(userId: string): SlackOAuthConnectionData {
    if (!this.isValidTokenResponse()) {
      throw new Error('Invalid token data cannot be converted to connection')
    }

    return {
      user_id: userId,
      workspace_id: this.workspaceId,
      workspace_name: this.workspaceName,
      team_name: this.teamName,
      access_token: this.accessToken,
      bot_user_id: this.botUserId,
      scope: this.scope
    }
  }

  /**
   * エンタープライズインストールかどうかを確認
   */
  isEnterpriseInstall(): boolean {
    return !!this._tokenData.is_enterprise_install
  }

  /**
   * トークンの種類を取得（user or bot）
   */
  getTokenType(): 'user' | 'bot' | 'both' {
    const hasUserToken = !!this._tokenData.authed_user?.access_token
    const hasBotToken = !!this._tokenData.access_token && this._tokenData.access_token !== this._tokenData.authed_user?.access_token

    if (hasUserToken && hasBotToken) {
      return 'both'
    } else if (hasUserToken) {
      return 'user'
    } else if (hasBotToken) {
      return 'bot'
    } else {
      return 'user' // fallback
    }
  }

  /**
   * デバッグ用のマスクされたトークンデータを取得
   */
  getMaskedTokenData(): MaskedTokenData {
    return {
      ok: this._tokenData.ok,
      app_id: this._tokenData.app_id,
      team: this._tokenData.team,
      authed_user: this._tokenData.authed_user ? {
        id: this._tokenData.authed_user.id,
        scope: this._tokenData.authed_user.scope,
        access_token: this._tokenData.authed_user.access_token ? '[MASKED]' : undefined,
        token_type: this._tokenData.authed_user.token_type
      } : null,
      scope: this._tokenData.scope,
      bot_user_id: this._tokenData.bot_user_id,
      access_token: this._tokenData.access_token ? '[MASKED]' : undefined,
      token_type: this._tokenData.token_type,
      enterprise: this._tokenData.enterprise,
      is_enterprise_install: this._tokenData.is_enterprise_install,
      error: this._tokenData.error
    }
  }

  /**
   * OAuth データの完整性を検証（詳細）
   */
  validateIntegrity(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this._tokenData.ok) {
      errors.push('OAuth response indicates failure')
    }

    if (this._tokenData.error) {
      errors.push(`OAuth error: ${this._tokenData.error}`)
    }

    if (!this._tokenData.team?.id) {
      errors.push('Missing team ID')
    }

    if (!this._tokenData.team?.name) {
      errors.push('Missing team name')
    }

    if (!this.accessToken) {
      errors.push('Missing access token')
    }

    if (!this.scope) {
      errors.push('Missing scope')
    }

    const slackUserId = this.extractSlackUserId()
    if (slackUserId && !this.isValidSlackUserId(slackUserId)) {
      errors.push('Invalid Slack User ID format')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  static fromTokenResponse(tokenData: unknown): SlackOAuthEntity {
    return new SlackOAuthEntity(tokenData as SlackOAuthTokenData)
  }
}
