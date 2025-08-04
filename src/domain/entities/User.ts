/**
 * User Domain Entity
 * フロントエンド用のUserエンティティ - ユーザー関連のビジネスルールを定義
 */

export interface UserData {
  id: string
  email: string
  created_at: string
  updated_at: string
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

  // ビジネスルール定数
  public static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  public static readonly MIN_EMAIL_LENGTH = 3
  public static readonly MAX_EMAIL_LENGTH = 254

  constructor(data: UserData) {
    this._data = { ...data }
  }

  // Getters for immutable access
  get id(): string { return this._data.id }
  get email(): string { return this._data.email }
  get createdAt(): string { return this._data.created_at }
  get updatedAt(): string { return this._data.updated_at }

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

    if (!this._data.email) {
      errors.push('Email is required')
    } else {
      // メールアドレスの形式チェック
      if (!UserEntity.EMAIL_REGEX.test(this._data.email)) {
        errors.push('Invalid email format')
      }

      // 長さチェック
      if (this._data.email.length < UserEntity.MIN_EMAIL_LENGTH) {
        errors.push(`Email must be at least ${UserEntity.MIN_EMAIL_LENGTH} characters`)
      }

      if (this._data.email.length > UserEntity.MAX_EMAIL_LENGTH) {
        errors.push(`Email must be ${UserEntity.MAX_EMAIL_LENGTH} characters or less`)
      }
    }

    // 日付の妥当性
    if (this._data.created_at) {
      const createdDate = new Date(this._data.created_at)
      if (isNaN(createdDate.getTime())) {
        errors.push('Invalid created_at format')
      }
    }

    if (this._data.updated_at) {
      const updatedDate = new Date(this._data.updated_at)
      if (isNaN(updatedDate.getTime())) {
        errors.push('Invalid updated_at format')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * メールアドレスのドメインを取得
   */
  getEmailDomain(): string {
    const parts = this._data.email.split('@')
    return parts.length > 1 ? parts[1] : ''
  }

  /**
   * メールアドレスのローカル部分を取得
   */
  getEmailLocalPart(): string {
    const parts = this._data.email.split('@')
    return parts[0] || ''
  }

  /**
   * ユーザーの表示名を取得（メールアドレスのローカル部分）
   */
  getDisplayName(): string {
    return this.getEmailLocalPart()
  }

  /**
   * マスクされたメールアドレスを取得
   */
  getMaskedEmail(): string {
    const localPart = this.getEmailLocalPart()
    const domain = this.getEmailDomain()

    if (localPart.length <= 2) {
      return `${localPart}***@${domain}`
    }

    const firstChar = localPart.charAt(0)
    const lastChar = localPart.charAt(localPart.length - 1)
    const maskedMiddle = '*'.repeat(Math.min(localPart.length - 2, 3))

    return `${firstChar}${maskedMiddle}${lastChar}@${domain}`
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
   * 最終更新からの経過日数を取得
   */
  getDaysFromLastUpdate(): number {
    const updatedDate = new Date(this._data.updated_at)
    const now = new Date()
    const diffTime = now.getTime() - updatedDate.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * アカウントが新規ユーザーかどうかを判定（作成から7日以内）
   */
  isNewUser(): boolean {
    return this.getDaysFromCreation() <= 7
  }

  /**
   * アカウントが非アクティブかどうかを判定（30日以上更新なし）
   */
  isInactive(): boolean {
    return this.getDaysFromLastUpdate() >= 30
  }

  /**
   * 企業メールアドレスかどうかを判定
   */
  isCorporateEmail(): boolean {
    const domain = this.getEmailDomain().toLowerCase()
    const personalDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
      'icloud.com', 'me.com', 'mac.com', 'live.com', 'msn.com',
      'yahoo.co.jp', 'hotmail.co.jp', 'gmail.jp'
    ]

    return !personalDomains.includes(domain)
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
      ...updates,
      updated_at: new Date().toISOString()
    }

    return new UserEntity(newData)
  }

  /**
   * ファクトリーメソッド: APIレスポンスからUserエンティティを作成
   */
  static fromApiResponse(apiData: any): UserEntity {
    return new UserEntity({
      id: apiData.id,
      email: apiData.email,
      created_at: apiData.created_at,
      updated_at: apiData.updated_at
    })
  }

  /**
   * ファクトリーメソッド: 認証データからUserエンティティを作成
   */
  static fromAuth(authUser: { id: string; email?: string }): UserEntity {
    const now = new Date().toISOString()

    return new UserEntity({
      id: authUser.id,
      email: authUser.email || '',
      created_at: now,
      updated_at: now
    })
  }

  /**
   * メールアドレスの妥当性を検証
   */
  static isValidEmail(email: string): boolean {
    if (!email) {
      return false
    }
    if (email.length < UserEntity.MIN_EMAIL_LENGTH) {
      return false
    }
    if (email.length > UserEntity.MAX_EMAIL_LENGTH) {
      return false
    }
    return UserEntity.EMAIL_REGEX.test(email)
  }

  /**
   * ユーザーリストをメールアドレスでソート
   */
  static sortByEmail(users: UserEntity[], order: 'asc' | 'desc' = 'asc'): UserEntity[] {
    return [...users].sort((a, b) => {
      const comparison = a.email.localeCompare(b.email)
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
   * アクティブユーザーのみをフィルタリング
   */
  static filterActive(users: UserEntity[]): UserEntity[] {
    return users.filter(user => !user.isInactive())
  }

  /**
   * 新規ユーザーのみをフィルタリング
   */
  static filterNewUsers(users: UserEntity[]): UserEntity[] {
    return users.filter(user => user.isNewUser())
  }

  /**
   * 企業ユーザーのみをフィルタリング
   */
  static filterCorporateUsers(users: UserEntity[]): UserEntity[] {
    return users.filter(user => user.isCorporateEmail())
  }
}
