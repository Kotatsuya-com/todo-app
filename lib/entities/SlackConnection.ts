/**
 * Slack Connection Domain Entity
 * Slack連携に関するビジネスルールとバリデーションを定義
 */

export interface SlackConnection {
  id: string
  user_id: string
  workspace_id: string
  workspace_name: string
  team_name: string
  access_token: string
  scope: string
  created_at: string
}

export interface SlackWebhook {
  id: string
  user_id: string
  slack_connection_id: string
  webhook_id: string
  webhook_secret: string
  is_active: boolean
  last_event_at?: string | null
  event_count: number
  created_at: string
  updated_at: string
}

export interface SlackEventProcessed {
  id: string
  event_key: string
  user_id: string
  channel_id: string
  message_ts: string
  reaction: string
  todo_id: string
  processed_at: string
}

export class SlackConnectionEntity {
  constructor(private _connection: SlackConnection) {}

  get id(): string {
    return this._connection.id
  }

  get userId(): string {
    return this._connection.user_id
  }

  get workspaceId(): string {
    return this._connection.workspace_id
  }

  get accessToken(): string {
    return this._connection.access_token
  }

  get workspaceName(): string {
    return this._connection.workspace_name
  }

  get teamName(): string {
    return this._connection.team_name
  }

  get createdAt(): string {
    return this._connection.created_at
  }

  get scope(): string {
    return this._connection.scope
  }

  isValidWorkspaceId(): boolean {
    return /^T[A-Z0-9]{8,}$/.test(this._connection.workspace_id)
  }

  hasValidScope(requiredScopes: string[]): boolean {
    const connectionScopes = this._connection.scope.split(',').map(s => s.trim())
    return requiredScopes.every(scope => connectionScopes.includes(scope))
  }

  /**
   * ユーザーが接続の所有者かどうかを確認
   */
  isOwnedBy(userId: string): boolean {
    return this._connection.user_id === userId
  }

  /**
   * 接続が最近作成されたかどうかを確認（24時間以内）
   */
  isRecentlyCreated(): boolean {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const createdDate = new Date(this._connection.created_at)
    return createdDate > oneDayAgo
  }

  /**
   * 接続の年齢を日数で取得
   */
  getAgeInDays(): number {
    const now = new Date()
    const created = new Date(this._connection.created_at)
    const diffTime = Math.abs(now.getTime() - created.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * 接続の表示用サマリーを取得
   */
  getDisplaySummary(): {
    displayName: string
    workspaceName: string
    teamName: string
    ageInDays: number
    isValid: boolean
    } {
    return {
      displayName: `${this._connection.workspace_name} (${this._connection.team_name})`,
      workspaceName: this._connection.workspace_name,
      teamName: this._connection.team_name,
      ageInDays: this.getAgeInDays(),
      isValid: this.isValidWorkspaceId()
    }
  }

  /**
   * 基本的なスコープが含まれているかチェック
   */
  hasBasicSlackScopes(): boolean {
    const basicScopes = ['channels:read', 'chat:write']
    return this.hasValidScope(basicScopes)
  }

  toPlainObject(): SlackConnection {
    return { ...this._connection }
  }

  static fromPlainObject(connection: SlackConnection): SlackConnectionEntity {
    return new SlackConnectionEntity(connection)
  }
}

export class SlackWebhookEntity {
  constructor(private _webhook: SlackWebhook) {}

  get id(): string {
    return this._webhook.id
  }

  get userId(): string {
    return this._webhook.user_id
  }

  get webhookId(): string {
    return this._webhook.webhook_id
  }

  get webhookSecret(): string {
    return this._webhook.webhook_secret
  }

  get isActive(): boolean {
    return this._webhook.is_active
  }

  get eventCount(): number {
    return this._webhook.event_count
  }

  incrementEventCount(): SlackWebhookEntity {
    return new SlackWebhookEntity({
      ...this._webhook,
      event_count: this._webhook.event_count + 1,
      last_event_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }

  activate(): SlackWebhookEntity {
    return new SlackWebhookEntity({
      ...this._webhook,
      is_active: true,
      updated_at: new Date().toISOString()
    })
  }

  deactivate(): SlackWebhookEntity {
    return new SlackWebhookEntity({
      ...this._webhook,
      is_active: false,
      updated_at: new Date().toISOString()
    })
  }

  generateEventKey(channelId: string, messageTs: string, reaction: string, userId: string): string {
    return `${channelId}:${messageTs}:${reaction}:${userId}`
  }

  toPlainObject(): SlackWebhook {
    return { ...this._webhook }
  }

  static fromPlainObject(webhook: SlackWebhook): SlackWebhookEntity {
    return new SlackWebhookEntity(webhook)
  }
}
