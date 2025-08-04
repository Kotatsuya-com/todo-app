/**
 * Todo Use Cases
 * Todoに関するビジネスユースケースを定義
 */

import { TodoEntity } from '../entities/Todo'
import { TodoRepositoryInterface, CreateTodoRequest, UpdateTodoRequest, TodoFilters } from '../repositories/TodoRepositoryInterface'

export interface UseCaseResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface GetTodosUseCaseRequest {
  userId: string
  filters?: {
    status?: 'open' | 'completed'
    isOverdue?: boolean
    quadrant?: 'urgent_important' | 'not_urgent_important' | 'urgent_not_important' | 'not_urgent_not_important'
  }
  sortBy?: {
    field: 'importance' | 'deadline' | 'created_at'
    order: 'asc' | 'desc'
  }
}

export interface CreateTodoUseCaseRequest {
  userId: string
  title?: string
  body: string
  deadline?: string
  createdVia?: 'manual' | 'slack_webhook' | 'slack_url'
}

export interface UpdateTodoUseCaseRequest {
  id: string
  userId: string
  updates: {
    title?: string
    body?: string
    deadline?: string
    importanceScore?: number
  }
}

export interface CompleteTodoUseCaseRequest {
  id: string
  userId: string
}

export interface DeleteTodoUseCaseRequest {
  id: string
  userId: string
}

export interface GetTodoDashboardUseCaseRequest {
  userId: string
  includeCompleted?: boolean
  overdueOnly?: boolean
}

export interface TodoDashboardData {
  todos: TodoEntity[]
  quadrants: {
    urgent_important: TodoEntity[]
    not_urgent_important: TodoEntity[]
    urgent_not_important: TodoEntity[]
    not_urgent_not_important: TodoEntity[]
  }
  stats: {
    total: number
    active: number
    completed: number
    overdue: number
  }
}

export class TodoUseCases {
  constructor(private _todoRepository: TodoRepositoryInterface) {}

  /**
   * ユーザーのTodoを取得（フィルター・ソート対応）
   */
  async getTodos(request: GetTodosUseCaseRequest): Promise<UseCaseResult<TodoEntity[]>> {
    try {
      const filters: TodoFilters = {
        userId: request.userId,
        ...request.filters
      }

      const result = await this._todoRepository.findTodos(filters)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to fetch todos'
        }
      }

      let todos = result.data || []

      // ソート処理
      if (request.sortBy) {
        todos = TodoEntity.sort(todos, {
          by: request.sortBy.field,
          order: request.sortBy.order
        })
      }

      return {
        success: true,
        data: todos
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * 特定のTodoを取得
   */
  async getTodoById(id: string, userId: string): Promise<UseCaseResult<TodoEntity>> {
    try {
      // 権限確認
      const ownershipResult = await this._todoRepository.isOwnedByUser(id, userId)
      if (!ownershipResult.success || !ownershipResult.data) {
        return {
          success: false,
          error: 'Todo not found or access denied'
        }
      }

      const result = await this._todoRepository.findById(id)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to fetch todo'
        }
      }

      if (!result.data) {
        return {
          success: false,
          error: 'Todo not found'
        }
      }

      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * 新しいTodoを作成
   */
  async createTodo(request: CreateTodoUseCaseRequest): Promise<UseCaseResult<TodoEntity>> {
    try {
      // ビジネスルール検証用のエンティティを作成
      const tempEntity = TodoEntity.create({
        userId: request.userId,
        title: request.title,
        body: request.body,
        deadline: request.deadline,
        createdVia: request.createdVia
      })

      // バリデーション実行
      const validation = tempEntity.validate()
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        }
      }

      const createRequest: CreateTodoRequest = {
        userId: request.userId,
        title: request.title,
        body: request.body,
        deadline: request.deadline,
        createdVia: request.createdVia
      }

      const result = await this._todoRepository.create(createRequest)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to create todo'
        }
      }

      return {
        success: true,
        data: result.data!
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * 既存のTodoを更新
   */
  async updateTodo(request: UpdateTodoUseCaseRequest): Promise<UseCaseResult<TodoEntity>> {
    try {
      // 権限確認
      const ownershipResult = await this._todoRepository.isOwnedByUser(request.id, request.userId)
      if (!ownershipResult.success || !ownershipResult.data) {
        return {
          success: false,
          error: 'Todo not found or access denied'
        }
      }

      // 現在のTodoを取得してバリデーション
      const currentTodoResult = await this._todoRepository.findById(request.id)
      if (!currentTodoResult.success || !currentTodoResult.data) {
        return {
          success: false,
          error: 'Todo not found'
        }
      }

      // 更新後のエンティティでバリデーション
      const updatedEntity = currentTodoResult.data.update(request.updates)
      const validation = updatedEntity.validate()
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        }
      }

      const updateRequest: UpdateTodoRequest = {
        id: request.id,
        title: request.updates.title,
        body: request.updates.body,
        deadline: request.updates.deadline,
        importanceScore: request.updates.importanceScore
      }

      const result = await this._todoRepository.update(updateRequest)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to update todo'
        }
      }

      return {
        success: true,
        data: result.data!
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Todoを完了状態に変更
   */
  async completeTodo(request: CompleteTodoUseCaseRequest): Promise<UseCaseResult<TodoEntity>> {
    try {
      // 権限確認
      const ownershipResult = await this._todoRepository.isOwnedByUser(request.id, request.userId)
      if (!ownershipResult.success || !ownershipResult.data) {
        return {
          success: false,
          error: 'Todo not found or access denied'
        }
      }

      const result = await this._todoRepository.complete(request.id)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to complete todo'
        }
      }

      return {
        success: true,
        data: result.data!
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Todoを再開状態に変更
   */
  async reopenTodo(request: CompleteTodoUseCaseRequest): Promise<UseCaseResult<TodoEntity>> {
    try {
      // 権限確認
      const ownershipResult = await this._todoRepository.isOwnedByUser(request.id, request.userId)
      if (!ownershipResult.success || !ownershipResult.data) {
        return {
          success: false,
          error: 'Todo not found or access denied'
        }
      }

      const result = await this._todoRepository.reopen(request.id)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to reopen todo'
        }
      }

      return {
        success: true,
        data: result.data!
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Todoを削除
   */
  async deleteTodo(request: DeleteTodoUseCaseRequest): Promise<UseCaseResult<void>> {
    try {
      // 権限確認
      const ownershipResult = await this._todoRepository.isOwnedByUser(request.id, request.userId)
      if (!ownershipResult.success || !ownershipResult.data) {
        return {
          success: false,
          error: 'Todo not found or access denied'
        }
      }

      const result = await this._todoRepository.delete(request.id)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to delete todo'
        }
      }

      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * ダッシュボード用のデータを取得
   */
  async getTodoDashboard(request: GetTodoDashboardUseCaseRequest): Promise<UseCaseResult<TodoDashboardData>> {
    try {
      // 基本データの取得
      const filters: TodoFilters = {
        userId: request.userId
      }

      if (!request.includeCompleted) {
        filters.status = 'open'
      }

      const todosResult = await this._todoRepository.findTodos(filters)
      if (!todosResult.success) {
        return {
          success: false,
          error: todosResult.error || 'Failed to fetch todos'
        }
      }

      let todos = todosResult.data || []

      // 期限切れのみフィルター
      if (request.overdueOnly) {
        todos = TodoEntity.filterOverdue(todos)
      }

      // 象限でグループ化
      const quadrants = TodoEntity.groupByQuadrant(todos)

      // 統計データの取得
      const statsResult = await this._todoRepository.getTodoStats(request.userId)
      const stats = statsResult.success ? statsResult.data! : {
        total: 0,
        completed: 0,
        active: 0,
        overdue: 0
      }

      return {
        success: true,
        data: {
          todos,
          quadrants,
          stats
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * 複数のTodoの重要度スコアを更新
   */
  async updateImportanceScores(updates: Array<{ id: string; importanceScore: number }>, userId: string): Promise<UseCaseResult<void>> {
    try {
      // 全てのTodoの権限確認
      for (const update of updates) {
        const ownershipResult = await this._todoRepository.isOwnedByUser(update.id, userId)
        if (!ownershipResult.success || !ownershipResult.data) {
          return {
            success: false,
            error: `Access denied for todo ${update.id}`
          }
        }

        // 重要度スコアのバリデーション
        if (update.importanceScore < 0) {
          return {
            success: false,
            error: 'Importance score must be non-negative'
          }
        }
      }

      const result = await this._todoRepository.updateImportanceScores(updates)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to update importance scores'
        }
      }

      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * アクティブなTodoのみを取得
   */
  async getActiveTodos(userId: string): Promise<UseCaseResult<TodoEntity[]>> {
    try {
      const result = await this._todoRepository.findActiveTodos(userId)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to fetch active todos'
        }
      }

      return {
        success: true,
        data: result.data || []
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * 期限切れのTodoを取得
   */
  async getOverdueTodos(userId: string): Promise<UseCaseResult<TodoEntity[]>> {
    try {
      const result = await this._todoRepository.findOverdueTodos(userId)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to fetch overdue todos'
        }
      }

      return {
        success: true,
        data: result.data || []
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * 完了レポートデータを取得
   */
  async getCompletionReport(userId: string, startDate: string, endDate: string): Promise<UseCaseResult<Array<{
    quadrant: string
    count: number
    todos: Array<{
      id: string
      title?: string
      body: string
      completed_at: string
    }>
  }>>> {
    try {
      const result = await this._todoRepository.getCompletionReport(userId, startDate, endDate)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to fetch completion report'
        }
      }

      return {
        success: true,
        data: result.data || []
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }


  /**
   * タスク比較を作成（Elo レーティング更新）
   */
  async createComparison(userId: string, winnerId: string, loserId: string): Promise<UseCaseResult<void>> {
    try {
      // 両方のTodoの権限確認
      const winnerOwnership = await this._todoRepository.isOwnedByUser(winnerId, userId)
      const loserOwnership = await this._todoRepository.isOwnedByUser(loserId, userId)

      if (!winnerOwnership.success || !winnerOwnership.data ||
          !loserOwnership.success || !loserOwnership.data) {
        return {
          success: false,
          error: 'One or both todos not found or access denied'
        }
      }

      const result = await this._todoRepository.createComparison(winnerId, loserId, userId)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to create comparison'
        }
      }

      return {
        success: true,
        data: undefined
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}
