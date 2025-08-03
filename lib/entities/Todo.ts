/**
 * Todo Domain Entity
 * TODOに関するビジネスルールとバリデーションを定義
 */

export interface Todo {
  id: string
  user_id: string
  title: string
  body?: string | null
  status: 'open' | 'done'
  deadline?: string | null
  importance_score: number
  created_via: 'manual' | 'slack_webhook'
  created_at: string
  updated_at: string
  completed_at?: string | null
}

export interface Comparison {
  id: string
  user_id: string
  winner_id: string
  loser_id: string
  created_at: string
}

export interface CompletionLog {
  id: string
  todo_id: string
  quadrant: 'urgent_important' | 'not_urgent_important' | 'urgent_not_important' | 'not_urgent_not_important'
  completed_at: string
}

export type Urgency = 'today' | 'tomorrow' | 'later'
export type TodoQuadrant = 'urgent_important' | 'not_urgent_important' | 'urgent_not_important' | 'not_urgent_not_important'

export class TodoEntity {
  constructor(private _todo: Todo) {}

  get id(): string {
    return this._todo.id
  }

  get userId(): string {
    return this._todo.user_id
  }

  get title(): string {
    return this._todo.title
  }

  get body(): string | null {
    return this._todo.body || null
  }

  get status(): 'open' | 'done' {
    return this._todo.status
  }

  get deadline(): string | null {
    return this._todo.deadline || null
  }

  get importanceScore(): number {
    return this._todo.importance_score
  }

  get createdVia(): 'manual' | 'slack_webhook' {
    return this._todo.created_via
  }

  get isCompleted(): boolean {
    return this._todo.status === 'done'
  }

  get isOpen(): boolean {
    return this._todo.status === 'open'
  }

  isOverdue(): boolean {
    if (!this.deadline) {return false}
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlineDate = new Date(this.deadline)
    return deadlineDate < today
  }

  isDueToday(): boolean {
    if (!this.deadline) {return false}
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlineDate = new Date(this.deadline)
    return deadlineDate.getTime() === today.getTime()
  }

  isUrgent(): boolean {
    return this.isOverdue() || this.isDueToday()
  }

  isImportant(): boolean {
    return this._todo.importance_score > 0.5
  }

  getQuadrant(): TodoQuadrant {
    const urgent = this.isUrgent()
    const important = this.isImportant()

    if (urgent && important) {return 'urgent_important'}
    if (!urgent && important) {return 'not_urgent_important'}
    if (urgent && !important) {return 'urgent_not_important'}
    return 'not_urgent_not_important'
  }

  calculateInitialImportanceScore(): number {
    if (this.isOverdue()) {
      return 0.7 // 期限切れは高めの重要度
    } else if (this.isDueToday()) {
      return 0.6 // 今日期限は中程度の重要度
    } else {
      // ランダムに0.3-0.7の範囲で初期化（中央値を避ける）
      return 0.3 + Math.random() * 0.4
    }
  }

  static urgencyToDeadline(urgency: Urgency): string | null {
    const now = new Date()
    switch (urgency) {
      case 'today':
        return now.toISOString().split('T')[0]
      case 'tomorrow':
        now.setDate(now.getDate() + 1)
        return now.toISOString().split('T')[0]
      case 'later':
        return null
    }
  }

  static deadlineToUrgency(deadline: string | null): Urgency {
    if (!deadline) {return 'later'}

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlineDate = new Date(deadline)

    if (deadlineDate.getTime() === today.getTime()) {return 'today'}

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (deadlineDate.getTime() === tomorrow.getTime()) {return 'tomorrow'}

    return 'later'
  }

  complete(): TodoEntity {
    return new TodoEntity({
      ...this._todo,
      status: 'done',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }

  reopen(): TodoEntity {
    return new TodoEntity({
      ...this._todo,
      status: 'open',
      completed_at: null,
      updated_at: new Date().toISOString()
    })
  }

  updateImportanceScore(newScore: number): TodoEntity {
    const clampedScore = Math.max(0, Math.min(1, newScore))
    return new TodoEntity({
      ...this._todo,
      importance_score: clampedScore,
      updated_at: new Date().toISOString()
    })
  }

  toPlainObject(): Todo {
    return { ...this._todo }
  }

  static fromPlainObject(todo: Todo): TodoEntity {
    return new TodoEntity(todo)
  }

  static createNew(data: {
    user_id: string
    title: string
    body?: string
    deadline?: string | null
    urgency?: Urgency
    created_via?: 'manual' | 'slack_webhook'
  }): Omit<Todo, 'id' | 'created_at' | 'updated_at' | 'completed_at'> {
    const deadline = data.deadline || (data.urgency ? TodoEntity.urgencyToDeadline(data.urgency) : null)
    const tempTodo = new TodoEntity({
      id: '', // Will be set by database
      user_id: data.user_id,
      title: data.title,
      body: data.body || null,
      status: 'open',
      deadline,
      importance_score: 0.5, // Will be calculated
      created_via: data.created_via || 'manual',
      created_at: '', // Will be set by database
      updated_at: '' // Will be set by database
    })

    return {
      user_id: data.user_id,
      title: data.title,
      body: data.body || null,
      status: 'open',
      deadline,
      importance_score: tempTodo.calculateInitialImportanceScore(),
      created_via: data.created_via || 'manual'
    }
  }
}
