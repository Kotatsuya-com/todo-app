/**
 * User Domain Entity
 * フロントエンド用のUserエンティティ - ユーザー関連のビジネスルールを定義
 */

export interface UserData {
  id: string
  display_name?: string | null
  avatar_url?: string | null
  slack_user_id?: string | null
  enable_webhook_notifications: boolean
  created_at: string
}

export interface UserValidationResult {
  valid: boolean
  errors: string[]
}

export interface UserStats {
  totalTodos: number
  completedTodos: number
  activeTodos: number
  overdueTodos: number
  completionRate: number
}

export class UserEntity {
  private _data: UserData

  constructor(data: UserData) {
    this._data = { ...data }
  }

  // Getters for immutable access
  get id(): string { return this._data.id }
  get displayName(): string | null { return this._data.display_name || null }
  get avatarUrl(): string | null { return this._data.avatar_url || null }
  get slackUserId(): string | null { return this._data.slack_user_id || null }
  get notificationsEnabled(): boolean { return this._data.enable_webhook_notifications }
  get createdAt(): string { return this._data.created_at }

  /**
   * 完全なデータコピーを取得（不変性保証）
   */
  getData(): UserData {
    return { ...this._data }
  }

  /**
   * ユーザーデータの検証を実行
   */
  validate(): UserValidationResult {
    const errors: string[] = []

    // 必須フィールドチェック
    if (!this._data.id) {
      errors.push('User ID is required')
    }

    // 日付の妥当性
    if (this._data.created_at) {
      const createdDate = new Date(this._data.created_at)
      if (isNaN(createdDate.getTime())) {
        errors.push('Invalid created_at format')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * ユーザーの表示名を取得
   */
  getDisplayName(): string {
    return this._data.display_name || 'User'
  }

  /**
   * Slackユーザーかどうかを判定
   */
  hasSlackUserId(): boolean {
    return !!this._data.slack_user_id
  }

  /**
   * アカウント作成からの経過日数を取得
   */
  getDaysFromCreation(): number {
    const createdDate = new Date(this._data.created_at)
    const now = new Date()
    const diffTime = now.getTime() - createdDate.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * アカウントが新規ユーザーかどうかを判定（作成から7日以内）
   */
  isNewUser(): boolean {
    return this.getDaysFromCreation() <= 7
  }

  /**
   * 通知が有効かどうかを判定
   */
  canReceiveWebhookNotifications(): boolean {
    return this._data.enable_webhook_notifications && this.hasSlackUserId()
  }

  /**
   * ユーザー統計情報を計算
   */
  calculateStats(todos: Array<{ status: string; deadline?: string | null }>): UserStats {
    const totalTodos = todos.length
    const completedTodos = todos.filter(todo => todo.status === 'completed').length
    const activeTodos = todos.filter(todo => todo.status === 'open').length

    const overdueTodos = todos.filter(todo => {
      if (!todo.deadline || todo.status !== 'open') {
        return false
      }
      const deadlineDate = new Date(todo.deadline)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      deadlineDate.setHours(0, 0, 0, 0)
      return deadlineDate < today
    }).length

    const completionRate = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0

    return {
      totalTodos,
      completedTodos,
      activeTodos,
      overdueTodos,
      completionRate: Math.round(completionRate * 100) / 100
    }
  }

  /**
   * 新しいデータでUserエンティティを更新
   */
  update(updates: Partial<UserData>): UserEntity {
    const newData = {
      ...this._data,
      ...updates
    }

    return new UserEntity(newData)
  }

  /**
   * ファクトリーメソッド: APIレスポンスからUserエンティティを作成
   */
  static fromApiResponse(apiData: any): UserEntity {
    return new UserEntity({
      id: apiData.id,
      display_name: apiData.display_name || null,
      avatar_url: apiData.avatar_url || null,
      slack_user_id: apiData.slack_user_id || null,
      enable_webhook_notifications: apiData.enable_webhook_notifications ?? true,
      created_at: apiData.created_at
    })
  }

  /**
   * ファクトリーメソッド: 認証データからUserエンティティを作成
   */
  static fromAuth(authUser: { id: string }): UserEntity {
    const now = new Date().toISOString()

    return new UserEntity({
      id: authUser.id,
      display_name: null,
      avatar_url: null,
      slack_user_id: null,
      enable_webhook_notifications: true,
      created_at: now
    })
  }

  /**
   * メールアドレスの妥当性を検証（認証用ユーティリティ）
   */
  static isValidEmail(email: string): boolean {
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const MIN_EMAIL_LENGTH = 3
    const MAX_EMAIL_LENGTH = 254

    if (!email) {
      return false
    }
    if (email.length < MIN_EMAIL_LENGTH) {
      return false
    }
    if (email.length > MAX_EMAIL_LENGTH) {
      return false
    }
    return EMAIL_REGEX.test(email)
  }

  /**
   * ユーザーリストを表示名でソート
   */
  static sortByDisplayName(users: UserEntity[], order: 'asc' | 'desc' = 'asc'): UserEntity[] {
    return [...users].sort((a, b) => {
      const nameA = a.displayName || 'User'
      const nameB = b.displayName || 'User'
      const comparison = nameA.localeCompare(nameB)
      return order === 'desc' ? -comparison : comparison
    })
  }

  /**
   * ユーザーリストを作成日でソート
   */
  static sortByCreatedDate(users: UserEntity[], order: 'asc' | 'desc' = 'desc'): UserEntity[] {
    return [...users].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      const comparison = dateA - dateB
      return order === 'desc' ? -comparison : comparison
    })
  }

  /**
   * 新規ユーザーのみをフィルタリング
   */
  static filterNewUsers(users: UserEntity[]): UserEntity[] {
    return users.filter(user => user.isNewUser())
  }

  /**
   * Slack連携済みユーザーのみをフィルタリング
   */
  static filterSlackUsers(users: UserEntity[]): UserEntity[] {
    return users.filter(user => user.hasSlackUserId())
  }
}
