/**
 * Todo Repository Interface
 * Todoデータアクセスの抽象化インターフェース
 */

import { TodoEntity } from '../entities/Todo'

export interface CreateTodoRequest {
  userId: string
  title?: string
  body: string
  deadline?: string
  createdVia?: 'manual' | 'slack_webhook' | 'slack_url'
}

export interface UpdateTodoRequest {
  id: string
  title?: string
  body?: string
  deadline?: string
  importanceScore?: number
  status?: 'open' | 'completed'
}

export interface TodoFilters {
  userId: string
  status?: 'open' | 'completed'
  isOverdue?: boolean
  quadrant?: 'urgent_important' | 'not_urgent_important' | 'urgent_not_important' | 'not_urgent_not_important'
}

export interface RepositoryResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface TodoRepositoryInterface {
  /**
   * 指定されたフィルターでTodoを取得
   */
  findTodos(_filters: TodoFilters): Promise<RepositoryResult<TodoEntity[]>>

  /**
   * IDでTodoを取得
   */
  findById(_id: string): Promise<RepositoryResult<TodoEntity | null>>

  /**
   * ユーザーの全Todoを取得
   */
  findByUserId(_userId: string): Promise<RepositoryResult<TodoEntity[]>>

  /**
   * アクティブなTodoのみを取得
   */
  findActiveTodos(_userId: string): Promise<RepositoryResult<TodoEntity[]>>

  /**
   * 完了したTodoのみを取得
   */
  findCompletedTodos(_userId: string): Promise<RepositoryResult<TodoEntity[]>>

  /**
   * 期限切れのTodoを取得
   */
  findOverdueTodos(_userId: string): Promise<RepositoryResult<TodoEntity[]>>

  /**
   * 新しいTodoを作成
   */
  create(_request: CreateTodoRequest): Promise<RepositoryResult<TodoEntity>>

  /**
   * 既存のTodoを更新
   */
  update(_request: UpdateTodoRequest): Promise<RepositoryResult<TodoEntity>>

  /**
   * Todoを削除
   */
  delete(_id: string): Promise<RepositoryResult<void>>

  /**
   * Todoを完了状態に変更
   */
  complete(_id: string): Promise<RepositoryResult<TodoEntity>>

  /**
   * Todoを再開状態に変更
   */
  reopen(_id: string): Promise<RepositoryResult<TodoEntity>>

  /**
   * 複数のTodoの重要度スコアを一括更新
   */
  updateImportanceScores(_updates: Array<{ id: string; importanceScore: number }>): Promise<RepositoryResult<void>>

  /**
   * ユーザーのTodo統計を取得
   */
  getTodoStats(_userId: string): Promise<RepositoryResult<{
    total: number
    completed: number
    active: number
    overdue: number
  }>>

  /**
   * Todoの存在確認
   */
  exists(_id: string): Promise<RepositoryResult<boolean>>

  /**
   * ユーザーの権限確認（指定されたTodoがユーザーのものかどうか）
   */
  isOwnedByUser(_todoId: string, _userId: string): Promise<RepositoryResult<boolean>>

  /**
   * 完了レポートデータを取得
   */
  getCompletionReport(_userId: string, _startDate: string, _endDate: string): Promise<RepositoryResult<Array<{
    quadrant: string
    count: number
    todos: Array<{
      id: string
      title?: string
      body: string
      completed_at: string
    }>
  }>>>

  /**
   * 完了したTodoを未完了に戻す
   */
  reopenTodo(_todoId: string): Promise<RepositoryResult<TodoEntity>>

  /**
   * タスク比較を作成（Elo レーティング更新）
   */
  createComparison(_winnerId: string, _loserId: string, _userId: string): Promise<RepositoryResult<void>>
}
