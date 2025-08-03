/**
 * Todo Repository
 * TODO関連データアクセスの責務を担う
 */

import { NextRequest } from 'next/server'
import {
  RepositoryContext,
  BaseRepository,
  RepositoryResult,
  RepositoryListResult,
  RepositoryUtils
} from './BaseRepository'
import { Todo, Comparison, CompletionLog } from '@/lib/entities/Todo'

export interface TodoRepositoryInterface {
  // Todo CRUD
  findById(_id: string): Promise<RepositoryResult<Todo>>
  findByUserId(_userId: string): Promise<RepositoryListResult<Todo>>
  create(_todo: Omit<Todo, 'id' | 'created_at' | 'updated_at' | 'completed_at'>): Promise<RepositoryResult<Todo>>
  update(_id: string, _updates: Partial<Todo>): Promise<RepositoryResult<Todo>>
  delete(_id: string): Promise<RepositoryResult<void>>

  // Todo via RPC function (for real-time notifications)
  createViaRPC(_todoData: {
    p_user_id: string
    p_title: string
    p_body: string
    p_deadline?: string | null
    p_importance_score: number
    p_status: string
    p_created_via: string
  }): Promise<RepositoryResult<Todo>>

  // Comparisons
  findComparisonsByUserId(_userId: string): Promise<RepositoryListResult<Comparison>>
  createComparison(_comparison: Omit<Comparison, 'id' | 'created_at'>): Promise<RepositoryResult<Comparison>>
  deleteComparisonsForTodo(_todoId: string): Promise<RepositoryResult<void>>

  // Completion Log
  createCompletionLog(_log: Omit<CompletionLog, 'id'>): Promise<RepositoryResult<CompletionLog>>
  deleteCompletionLogForTodo(_todoId: string): Promise<RepositoryResult<void>>

  // Bulk operations
  updateImportanceScores(_updates: Array<{ id: string; importance_score: number }>): Promise<RepositoryResult<void>>
}

export class TodoRepository implements TodoRepositoryInterface, BaseRepository {
  constructor(private _context: RepositoryContext) {}

  get client() {
    return this._context.getServiceClient()
  }

  private getAuthenticatedClient(request?: NextRequest) {
    return this._context.getAuthenticatedClient(request)
  }

  // Todo CRUD
  async findById(_id: string): Promise<RepositoryResult<Todo>> {
    const result = await this.client
      .from('todos')
      .select('*')
      .eq('id', _id)
      .single()

    return RepositoryUtils.handleSupabaseResult(result)
  }

  async findByUserId(_userId: string): Promise<RepositoryListResult<Todo>> {
    const result = await this.client
      .from('todos')
      .select('*')
      .eq('user_id', _userId)
      .order('importance_score', { ascending: false })
      .order('deadline', { ascending: true })

    return RepositoryUtils.handleSupabaseListResult(result)
  }

  async create(_todo: Omit<Todo, 'id' | 'created_at' | 'updated_at' | 'completed_at'>): Promise<RepositoryResult<Todo>> {
    const result = await this.client
      .from('todos')
      .insert(_todo)
      .select()
      .single()

    return RepositoryUtils.handleSupabaseResult(result)
  }

  async update(_id: string, _updates: Partial<Todo>): Promise<RepositoryResult<Todo>> {
    const result = await this.client
      .from('todos')
      .update({
        ..._updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', _id)
      .select()
      .single()

    return RepositoryUtils.handleSupabaseResult(result)
  }

  async delete(_id: string): Promise<RepositoryResult<void>> {
    const result = await this.client
      .from('todos')
      .delete()
      .eq('id', _id)

    if (result.error) {
      return RepositoryUtils.failure(RepositoryUtils.handleSupabaseResult(result).error!)
    }
    return RepositoryUtils.success(undefined)
  }

  // Todo via RPC function (for real-time notifications)
  async createViaRPC(_todoData: {
    p_user_id: string
    p_title: string
    p_body: string
    p_deadline?: string | null
    p_importance_score: number
    p_status: string
    p_created_via: string
  }): Promise<RepositoryResult<Todo>> {
    const result = await this.client
      .rpc('insert_todo_for_user', _todoData)

    if (result.error) {
      return RepositoryUtils.failure(RepositoryUtils.handleSupabaseResult(result).error!)
    }

    // 関数は配列を返すので最初の要素を取得
    const newTodo = Array.isArray(result.data) ? result.data[0] : result.data
    return RepositoryUtils.success(newTodo)
  }

  // Comparisons
  async findComparisonsByUserId(_userId: string): Promise<RepositoryListResult<Comparison>> {
    const result = await this.client
      .from('comparisons')
      .select('*')
      .eq('user_id', _userId)

    return RepositoryUtils.handleSupabaseListResult(result)
  }

  async createComparison(_comparison: Omit<Comparison, 'id' | 'created_at'>): Promise<RepositoryResult<Comparison>> {
    const result = await this.client
      .from('comparisons')
      .insert(_comparison)
      .select()
      .single()

    return RepositoryUtils.handleSupabaseResult(result)
  }

  async deleteComparisonsForTodo(_todoId: string): Promise<RepositoryResult<void>> {
    const result = await this.client
      .from('comparisons')
      .delete()
      .or(`winner_id.eq.${_todoId},loser_id.eq.${_todoId}`)

    if (result.error) {
      return RepositoryUtils.failure(RepositoryUtils.handleSupabaseResult(result).error!)
    }
    return RepositoryUtils.success(undefined)
  }

  // Completion Log
  async createCompletionLog(_log: Omit<CompletionLog, 'id'>): Promise<RepositoryResult<CompletionLog>> {
    const result = await this.client
      .from('completion_log')
      .insert(_log)
      .select()
      .single()

    return RepositoryUtils.handleSupabaseResult(result)
  }

  async deleteCompletionLogForTodo(_todoId: string): Promise<RepositoryResult<void>> {
    const result = await this.client
      .from('completion_log')
      .delete()
      .eq('todo_id', _todoId)

    if (result.error) {
      return RepositoryUtils.failure(RepositoryUtils.handleSupabaseResult(result).error!)
    }
    return RepositoryUtils.success(undefined)
  }

  // Bulk operations
  async updateImportanceScores(_updates: Array<{ id: string; importance_score: number }>): Promise<RepositoryResult<void>> {
    try {
      // バッチ更新のためのPromise配列
      const updatePromises = _updates.map(update =>
        this.client
          .from('todos')
          .update({ importance_score: update.importance_score })
          .eq('id', update.id)
      )

      // 全ての更新を並列実行
      const results = await Promise.all(updatePromises)

      // エラーチェック
      const errors = results.filter(result => result.error)
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} todos`)
      }

      return RepositoryUtils.success(undefined)
    } catch (error) {
      return RepositoryUtils.failure(new Error(`Bulk update failed: ${error}`))
    }
  }
}
