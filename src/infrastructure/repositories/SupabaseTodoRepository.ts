/**
 * Supabase Todo Repository Implementation
 * SupabaseによるTodoデータアクセス実装
 */

import { createClient } from '@/lib/supabase'
import { TodoEntity } from '../../domain/entities/Todo'
import {
  TodoRepositoryInterface,
  CreateTodoRequest,
  UpdateTodoRequest,
  TodoFilters,
  RepositoryResult
} from '../../domain/repositories/TodoRepositoryInterface'

export class SupabaseTodoRepository implements TodoRepositoryInterface {
  private supabase = createClient()

  /**
   * 指定されたフィルターでTodoを取得
   */
  async findTodos(filters: TodoFilters): Promise<RepositoryResult<TodoEntity[]>> {
    try {
      let query = this.supabase
        .from('todos')
        .select('*')
        .eq('user_id', filters.userId)
        .order('created_at', { ascending: false })

      // ステータスフィルター
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      const { data, error } = await query

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      const todos = (data || []).map(item => TodoEntity.fromApiResponse(item))

      // クライアントサイドフィルタリング
      let filteredTodos = todos

      if (filters.isOverdue !== undefined) {
        filteredTodos = filters.isOverdue
          ? filteredTodos.filter(todo => todo.isOverdue())
          : filteredTodos.filter(todo => !todo.isOverdue())
      }

      if (filters.quadrant) {
        filteredTodos = filteredTodos.filter(todo => todo.getQuadrant() === filters.quadrant)
      }

      return {
        success: true,
        data: filteredTodos
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * IDでTodoを取得
   */
  async findById(id: string): Promise<RepositoryResult<TodoEntity | null>> {
    try {
      const { data, error } = await this.supabase
        .from('todos')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return {
            success: true,
            data: null
          }
        }
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: TodoEntity.fromApiResponse(data)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * ユーザーの全Todoを取得
   */
  async findByUserId(userId: string): Promise<RepositoryResult<TodoEntity[]>> {
    return this.findTodos({ userId })
  }

  /**
   * アクティブなTodoのみを取得
   */
  async findActiveTodos(userId: string): Promise<RepositoryResult<TodoEntity[]>> {
    return this.findTodos({ userId, status: 'open' })
  }

  /**
   * 完了したTodoのみを取得
   */
  async findCompletedTodos(userId: string): Promise<RepositoryResult<TodoEntity[]>> {
    return this.findTodos({ userId, status: 'completed' })
  }

  /**
   * 期限切れのTodoを取得
   */
  async findOverdueTodos(userId: string): Promise<RepositoryResult<TodoEntity[]>> {
    return this.findTodos({ userId, status: 'open', isOverdue: true })
  }

  /**
   * 新しいTodoを作成
   */
  async create(request: CreateTodoRequest): Promise<RepositoryResult<TodoEntity>> {
    try {
      const now = new Date().toISOString()

      const todoData = {
        user_id: request.userId,
        title: request.title || null,
        body: request.body,
        deadline: request.deadline || null,
        importance_score: TodoEntity.DEFAULT_IMPORTANCE_SCORE,
        status: 'open' as const,
        created_at: now,
        updated_at: now,
        created_via: request.createdVia || 'manual'
      }

      const { data, error } = await this.supabase
        .from('todos')
        .insert(todoData)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: TodoEntity.fromApiResponse(data)
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
  async update(request: UpdateTodoRequest): Promise<RepositoryResult<TodoEntity>> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (request.title !== undefined) { updateData.title = request.title }
      if (request.body !== undefined) { updateData.body = request.body }
      if (request.deadline !== undefined) { updateData.deadline = request.deadline }
      if (request.importanceScore !== undefined) { updateData.importance_score = request.importanceScore }
      if (request.status !== undefined) { updateData.status = request.status }

      const { data, error } = await this.supabase
        .from('todos')
        .update(updateData)
        .eq('id', request.id)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: TodoEntity.fromApiResponse(data)
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
  async delete(id: string): Promise<RepositoryResult<void>> {
    try {
      // 関連するcomparisonsを先に削除
      await this.supabase
        .from('comparisons')
        .delete()
        .or(`winner_id.eq.${id},loser_id.eq.${id}`)

      // completion_logも削除
      await this.supabase
        .from('completion_log')
        .delete()
        .eq('todo_id', id)

      // Todoを削除
      const { error } = await this.supabase
        .from('todos')
        .delete()
        .eq('id', id)

      if (error) {
        return {
          success: false,
          error: error.message
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
   * Todoを完了状態に変更
   */
  async complete(id: string): Promise<RepositoryResult<TodoEntity>> {
    try {
      const now = new Date().toISOString()

      // Todoのステータスを更新
      const { data: todoData, error: todoError } = await this.supabase
        .from('todos')
        .update({
          status: 'completed',
          updated_at: now
        })
        .eq('id', id)
        .select()
        .single()

      if (todoError) {
        return {
          success: false,
          error: todoError.message
        }
      }

      // completion_logに記録
      await this.supabase
        .from('completion_log')
        .insert({
          todo_id: id,
          completed_at: now
        })

      return {
        success: true,
        data: TodoEntity.fromApiResponse(todoData)
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
  async reopen(id: string): Promise<RepositoryResult<TodoEntity>> {
    try {
      const now = new Date().toISOString()

      // Todoのステータスを更新
      const { data: todoData, error: todoError } = await this.supabase
        .from('todos')
        .update({
          status: 'open',
          updated_at: now
        })
        .eq('id', id)
        .select()
        .single()

      if (todoError) {
        return {
          success: false,
          error: todoError.message
        }
      }

      // completion_logから削除
      await this.supabase
        .from('completion_log')
        .delete()
        .eq('todo_id', id)

      return {
        success: true,
        data: TodoEntity.fromApiResponse(todoData)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * 複数のTodoの重要度スコアを一括更新
   */
  async updateImportanceScores(updates: Array<{ id: string; importanceScore: number }>): Promise<RepositoryResult<void>> {
    try {
      const now = new Date().toISOString()

      // Supabaseでは一括更新のため、個別に実行
      for (const update of updates) {
        const { error } = await this.supabase
          .from('todos')
          .update({
            importance_score: update.importanceScore,
            updated_at: now
          })
          .eq('id', update.id)

        if (error) {
          return {
            success: false,
            error: error.message
          }
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
   * ユーザーのTodo統計を取得
   */
  async getTodoStats(userId: string): Promise<RepositoryResult<{
    total: number
    completed: number
    active: number
    overdue: number
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('todos')
        .select('id, status, deadline')
        .eq('user_id', userId)

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      const todos = data || []
      const total = todos.length
      const completed = todos.filter(todo => todo.status === 'completed').length
      const active = todos.filter(todo => todo.status === 'open').length

      const overdue = todos.filter(todo => {
        if (!todo.deadline || todo.status !== 'open') { return false }
        const deadlineDate = new Date(todo.deadline)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        deadlineDate.setHours(0, 0, 0, 0)
        return deadlineDate < today
      }).length

      return {
        success: true,
        data: { total, completed, active, overdue }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Todoの存在確認
   */
  async exists(id: string): Promise<RepositoryResult<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from('todos')
        .select('id')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return {
            success: true,
            data: false
          }
        }
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: !!data
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * ユーザーの権限確認（指定されたTodoがユーザーのものかどうか）
   */
  async isOwnedByUser(todoId: string, userId: string): Promise<RepositoryResult<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from('todos')
        .select('user_id')
        .eq('id', todoId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return {
            success: true,
            data: false
          }
        }
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: data.user_id === userId
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
  async getCompletionReport(userId: string, startDate: string, endDate: string): Promise<RepositoryResult<Array<{
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
      const { data, error } = await this.supabase
        .from('completion_log')
        .select(`
          quadrant,
          completed_at,
          todos (
            id,
            title,
            body
          )
        `)
        .eq('user_id', userId)
        .gte('completed_at', startDate)
        .lte('completed_at', endDate)
        .order('completed_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      // データを四象限ごとに集計
      const aggregated = data?.reduce((acc: any, item: any) => {
        const quadrant = item.quadrant
        if (!acc[quadrant]) {
          acc[quadrant] = {
            quadrant,
            count: 0,
            todos: []
          }
        }
        acc[quadrant].count++
        acc[quadrant].todos.push({
          id: item.todos.id,
          title: item.todos.title,
          body: item.todos.body,
          completed_at: item.completed_at
        })
        return acc
      }, {})

      const result = Object.values(aggregated || {}) as Array<{
        quadrant: string
        count: number
        todos: Array<{
          id: string
          title?: string
          body: string
          completed_at: string
        }>
      }>

      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * 完了したTodoを未完了に戻す
   */
  async reopenTodo(todoId: string): Promise<RepositoryResult<TodoEntity>> {
    try {
      const { data, error } = await this.supabase
        .from('todos')
        .update({ status: 'open' })
        .eq('id', todoId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data) {
        return { success: false, error: 'Todo not found' }
      }

      const todoEntity = TodoEntity.fromApiResponse(data)
      return { success: true, data: todoEntity }
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
  async createComparison(winnerId: string, loserId: string, userId: string): Promise<RepositoryResult<void>> {
    try {
      // Create comparison record
      const { error: comparisonError } = await this.supabase
        .from('comparisons')
        .insert({
          winner_id: winnerId,
          loser_id: loserId,
          user_id: userId,
          created_at: new Date().toISOString()
        })

      if (comparisonError) {
        return { success: false, error: comparisonError.message }
      }

      // Get current importance scores for Elo calculation
      const { data: todos, error: todosError } = await this.supabase
        .from('todos')
        .select('id, importance_score')
        .in('id', [winnerId, loserId])

      if (todosError || !todos || todos.length !== 2) {
        return { success: false, error: 'Failed to fetch todos for Elo calculation' }
      }

      const winner = todos.find(t => t.id === winnerId)
      const loser = todos.find(t => t.id === loserId)

      if (!winner || !loser) {
        return { success: false, error: 'Winner or loser not found' }
      }

      // Calculate new Elo ratings (K-factor = 32)
      const K = 32
      const expectedWinner = 1 / (1 + Math.pow(10, (loser.importance_score - winner.importance_score) / 400))
      const expectedLoser = 1 / (1 + Math.pow(10, (winner.importance_score - loser.importance_score) / 400))

      const newWinnerScore = winner.importance_score + K * (1 - expectedWinner)
      const newLoserScore = loser.importance_score + K * (0 - expectedLoser)

      // Update importance scores
      const { error: updateError } = await this.supabase
        .from('todos')
        .upsert([
          { id: winnerId, importance_score: newWinnerScore },
          { id: loserId, importance_score: newLoserScore }
        ])

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}
