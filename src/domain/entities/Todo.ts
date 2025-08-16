/**
 * Todo Domain Entity
 * フロントエンド用のTodoエンティティ - ビジネスルールと検証ロジックを定義
 */

export type TodoStatus = 'open' | 'completed'
export type TodoUrgency = 'now' | 'today' | 'tomorrow' | 'later'
export type TodoQuadrant = 'urgent_important' | 'not_urgent_important' | 'urgent_not_important' | 'not_urgent_not_important'
export type TodoCreatedVia = 'manual' | 'slack_webhook' | 'slack_url'

export interface TodoData {
  id: string
  user_id: string
  title: string | null
  body: string
  deadline: string | null
  importance_score: number
  status: TodoStatus
  created_at: string
  updated_at: string
  created_via: TodoCreatedVia
}

export interface TodoValidationResult {
  valid: boolean
  errors: string[]
}

export interface TodoSortOptions {
  by: 'importance' | 'deadline' | 'created_at'
  order: 'asc' | 'desc'
}

export interface UpdateTodoData {
  title?: string | null
  body?: string
  deadline?: string | null
  importance_score?: number
  status?: TodoStatus
}

export class TodoEntity {
  private _data: TodoData

  // ビジネスルール定数
  public static readonly MIN_BODY_LENGTH = 1
  public static readonly MAX_BODY_LENGTH = 5000
  public static readonly MAX_TITLE_LENGTH = 200
  public static readonly DEFAULT_IMPORTANCE_SCORE = 1000
  public static readonly URGENT_THRESHOLD_HOURS = 24
  public static readonly IMPORTANT_SCORE_THRESHOLD = 1200

  constructor(data: TodoData) {
    this._data = { ...data }
  }

  // Getters for immutable access
  get id(): string { return this._data.id }
  get userId(): string { return this._data.user_id }
  get title(): string | null { return this._data.title }
  get body(): string { return this._data.body }
  get deadline(): string | null { return this._data.deadline }
  get importanceScore(): number { return this._data.importance_score }
  get status(): TodoStatus { return this._data.status }
  get createdAt(): string { return this._data.created_at }
  get updatedAt(): string { return this._data.updated_at }
  get createdVia(): TodoCreatedVia { return this._data.created_via }

  /**
   * 完全なデータコピーを取得（不変性保証）
   */
  getData(): TodoData {
    return { ...this._data }
  }

  /**
   * Todoの検証を実行
   */
  validate(): TodoValidationResult {
    const errors: string[] = []

    // 必須フィールドチェック
    if (!this._data.user_id) {
      errors.push('User ID is required')
    }

    if (!this._data.body || this._data.body.trim().length === 0) {
      errors.push('Body is required')
    }

    // 長さ制限チェック
    if (this._data.body && this._data.body.length > TodoEntity.MAX_BODY_LENGTH) {
      errors.push(`Body must be ${TodoEntity.MAX_BODY_LENGTH} characters or less`)
    }

    if (this._data.body && this._data.body.trim().length < TodoEntity.MIN_BODY_LENGTH) {
      errors.push(`Body must be at least ${TodoEntity.MIN_BODY_LENGTH} character`)
    }

    if (this._data.title && this._data.title.length > TodoEntity.MAX_TITLE_LENGTH) {
      errors.push(`Title must be ${TodoEntity.MAX_TITLE_LENGTH} characters or less`)
    }

    // 重要度スコアの妥当性
    if (this._data.importance_score < 0) {
      errors.push('Importance score must be non-negative')
    }

    // 日付の妥当性
    if (this._data.deadline) {
      const deadlineDate = new Date(this._data.deadline)
      if (isNaN(deadlineDate.getTime())) {
        errors.push('Invalid deadline format')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * タスクが期限切れかどうかを判定
   */
  isOverdue(): boolean {
    if (!this._data.deadline) {
      return false
    }

    const now = new Date()
    const deadlineDate = new Date(this._data.deadline)

    // 日付のみで比較（時間は考慮しない）
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const deadline = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate())

    return deadline < today
  }

  /**
   * タスクが緊急かどうかを判定（24時間以内）
   */
  isUrgent(): boolean {
    if (!this._data.deadline) {
      return false
    }

    const now = new Date()
    const deadlineDate = new Date(this._data.deadline)
    const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    return hoursUntilDeadline <= TodoEntity.URGENT_THRESHOLD_HOURS && hoursUntilDeadline >= 0
  }

  /**
   * タスクが重要かどうかを判定
   */
  isImportant(): boolean {
    return this._data.importance_score >= TodoEntity.IMPORTANT_SCORE_THRESHOLD
  }

  /**
   * アイゼンハワーマトリクスの象限を取得
   */
  getQuadrant(): TodoQuadrant {
    const urgent = this.isUrgent() || this.isOverdue()
    const important = this.isImportant()

    if (urgent && important) {
      return 'urgent_important'
    }
    if (!urgent && important) {
      return 'not_urgent_important'
    }
    if (urgent && !important) {
      return 'urgent_not_important'
    }
    return 'not_urgent_not_important'
  }

  /**
   * 表示用のタイトルを取得（タイトルがない場合は本文から生成）
   */
  getDisplayTitle(): string {
    if (this._data.title && this._data.title.trim()) {
      return this._data.title
    }

    // HTMLタグを除去
    const plainText = this._data.body.replace(/<[^>]*>/g, '').trim()

    if (plainText.length <= 20) {
      return plainText
    }

    return plainText.substring(0, 20) + '...'
  }

  /**
   * HTMLタグを除去した本文を取得
   */
  getPlainTextBody(): string {
    return this._data.body.replace(/<[^>]*>/g, '').trim()
  }

  /**
   * 指定した長さでトリミングした本文を取得
   */
  getTrimmedBody(maxLength: number = 200): string {
    const plainText = this.getPlainTextBody()

    if (plainText.length <= maxLength) {
      return plainText
    }

    return plainText.substring(0, maxLength) + '...'
  }

  /**
   * タスクの完了状態を判定
   */
  isCompleted(): boolean {
    return this._data.status === 'completed'
  }

  /**
   * タスクがアクティブ（未完了）かどうかを判定
   */
  isActive(): boolean {
    return this._data.status === 'open'
  }

  /**
   * 期限までの日数を取得
   */
  getDaysUntilDeadline(): number | null {
    if (!this._data.deadline) {
      return null
    }

    const now = new Date()
    const deadlineDate = new Date(this._data.deadline)

    // 日付のみで計算
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const deadline = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate())

    const diffTime = deadline.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * 期限の表示用文字列を取得
   */
  getFormattedDeadline(): string | null {
    if (!this._data.deadline) {
      return null
    }

    const daysUntil = this.getDaysUntilDeadline()

    if (daysUntil === null) {
      return null
    }

    if (daysUntil < 0) {
      return `${Math.abs(daysUntil)}日前期限切れ`
    } else if (daysUntil === 0) {
      return '今日期限'
    } else if (daysUntil === 1) {
      return '明日期限'
    } else {
      return `${daysUntil}日後期限`
    }
  }

  /**
   * 新しいデータでTodoエンティティを更新
   */
  update(updates: Partial<TodoData>): TodoEntity {
    const newData = {
      ...this._data,
      ...updates,
      updated_at: new Date().toISOString()
    }

    return new TodoEntity(newData)
  }

  /**
   * タスクを完了状態に変更
   */
  complete(): TodoEntity {
    return this.update({
      status: 'completed'
    })
  }

  /**
   * タスクを再開状態に変更
   */
  reopen(): TodoEntity {
    return this.update({
      status: 'open'
    })
  }

  /**
   * 重要度スコアを更新
   */
  updateImportanceScore(score: number): TodoEntity {
    if (score < 0) {
      throw new Error('Importance score must be non-negative')
    }

    return this.update({
      importance_score: score
    })
  }

  /**
   * バリデーション専用メソッド: データ検証のみ実行（ID生成なし）
   */
  static validateData(params: {
    userId: string
    title?: string
    body: string
    deadline?: string
    createdVia?: TodoCreatedVia
  }): TodoValidationResult {
    const now = new Date().toISOString()

    const data: TodoData = {
      id: 'validation-temp-id', // バリデーション用ダミーID
      user_id: params.userId,
      title: params.title || null,
      body: params.body,
      deadline: params.deadline || null,
      importance_score: TodoEntity.DEFAULT_IMPORTANCE_SCORE,
      status: 'open',
      created_at: now,
      updated_at: now,
      created_via: params.createdVia || 'manual'
    }

    const tempEntity = new TodoEntity(data)
    return tempEntity.validate()
  }

  /**
   * ファクトリーメソッド: 新しいTodoを作成
   */
  static create(params: {
    userId: string
    title?: string
    body: string
    deadline?: string
    createdVia?: TodoCreatedVia
  }): TodoEntity {
    const now = new Date().toISOString()

    const data: TodoData = {
      id: crypto.randomUUID(),
      user_id: params.userId,
      title: params.title || null,
      body: params.body,
      deadline: params.deadline || null,
      importance_score: TodoEntity.DEFAULT_IMPORTANCE_SCORE,
      status: 'open',
      created_at: now,
      updated_at: now,
      created_via: params.createdVia || 'manual'
    }

    return new TodoEntity(data)
  }

  /**
   * ファクトリーメソッド: APIレスポンスからTodoエンティティを作成
   */
  static fromApiResponse(apiData: any): TodoEntity {
    return new TodoEntity({
      id: apiData.id,
      user_id: apiData.user_id,
      title: apiData.title,
      body: apiData.body,
      deadline: apiData.deadline,
      importance_score: apiData.importance_score || TodoEntity.DEFAULT_IMPORTANCE_SCORE,
      status: apiData.status || 'open',
      created_at: apiData.created_at,
      updated_at: apiData.updated_at,
      created_via: apiData.created_via || 'manual'
    })
  }

  /**
   * 複数のTodoエンティティをソート
   */
  static sort(todos: TodoEntity[], options: TodoSortOptions): TodoEntity[] {
    return [...todos].sort((a, b) => {
      let comparison = 0

      switch (options.by) {
        case 'importance':
          comparison = b.importanceScore - a.importanceScore
          break
        case 'deadline':
          if (!a.deadline && !b.deadline) {
            return 0
          }
          if (!a.deadline) {
            return 1
          }
          if (!b.deadline) {
            return -1
          }
          comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          break
        case 'created_at':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }

      return options.order === 'desc' ? -comparison : comparison
    })
  }

  /**
   * 複数のTodoエンティティを象限でグループ化
   */
  static groupByQuadrant(todos: TodoEntity[]): Record<TodoQuadrant, TodoEntity[]> {
    const quadrants: Record<TodoQuadrant, TodoEntity[]> = {
      urgent_important: [],
      not_urgent_important: [],
      urgent_not_important: [],
      not_urgent_not_important: []
    }

    todos.forEach(todo => {
      const quadrant = todo.getQuadrant()
      quadrants[quadrant].push(todo)
    })

    return quadrants
  }

  /**
   * アクティブなTodoのみをフィルタリング
   */
  static filterActive(todos: TodoEntity[]): TodoEntity[] {
    return todos.filter(todo => todo.isActive())
  }

  /**
   * 期限切れのTodoのみをフィルタリング
   */
  static filterOverdue(todos: TodoEntity[]): TodoEntity[] {
    return todos.filter(todo => todo.isOverdue())
  }

  /**
   * 緊急度から期限日を取得
   */
  static getDeadlineFromUrgency(urgency: TodoUrgency): string | undefined {
    const now = new Date()
    switch (urgency) {
      case 'today':
      case 'now':
        return now.toISOString().split('T')[0]
      case 'tomorrow':
        now.setDate(now.getDate() + 1)
        return now.toISOString().split('T')[0]
      case 'later':
        return undefined
      default:
        return undefined
    }
  }

  /**
   * 期限日から緊急度を推定
   */
  getUrgencyFromDeadline(): TodoUrgency {
    if (!this._data.deadline) {
      return 'later'
    }

    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    if (this._data.deadline === today) {
      return 'today'
    } else if (this._data.deadline === tomorrowStr) {
      return 'tomorrow'
    } else {
      return 'later'
    }
  }
}
