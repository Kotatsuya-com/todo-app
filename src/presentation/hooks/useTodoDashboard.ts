/**
 * Todo Dashboard Custom Hook
 * ダッシュボード画面用のカスタムフック - UI状態とビジネスロジックを分離
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { TodoEntity } from '../../domain/entities/Todo'
import { UserEntity } from '../../domain/entities/User'
import { createTodoUseCases } from '@/src/infrastructure/di/FrontendServiceFactory'
import { useAuth } from './useAuth'

export interface DashboardFilters {
  showOverdueOnly: boolean
  viewMode: 'matrix' | 'list'
}

export interface QuadrantData {
  urgent_important: TodoEntity[]
  not_urgent_important: TodoEntity[]
  urgent_not_important: TodoEntity[]
  not_urgent_not_important: TodoEntity[]
}

export interface DashboardStats {
  total: number
  active: number
  completed: number
  overdue: number
}

export interface DashboardState {
  todos: TodoEntity[]
  quadrants: QuadrantData
  stats: DashboardStats
  filteredTodos: TodoEntity[]
  loading: boolean
  error: string | null
}

export interface DashboardActions {
  refreshTodos: () => Promise<void>
  completeTodo: (_todoId: string) => Promise<void>
  reopenTodo: (_todoId: string) => Promise<void>
  deleteTodo: (_todoId: string) => Promise<void>
  updateTodo: (_todoId: string, _updates: {
    title?: string
    body?: string
    deadline?: string
    importanceScore?: number
  }) => Promise<void>
}

export interface DashboardUI {
  filters: DashboardFilters
  setShowOverdueOnly: (_show: boolean) => void
  setViewMode: (_mode: 'matrix' | 'list') => void
  selectedTodo: TodoEntity | null
  setSelectedTodo: (_todo: TodoEntity | null) => void
  isEditModalOpen: boolean
  setIsEditModalOpen: (_open: boolean) => void
}

export interface UseTodoDashboardReturn {
  state: DashboardState
  actions: DashboardActions
  ui: DashboardUI
  user: UserEntity | null
}

export const useTodoDashboard = (): UseTodoDashboardReturn => {
  const { user, loading: authLoading } = useAuth()
  const todoUseCases = createTodoUseCases()

  // データ状態
  const [todos, setTodos] = useState<TodoEntity[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    active: 0,
    completed: 0,
    overdue: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // UI状態
  const [filters, setFilters] = useState<DashboardFilters>({
    showOverdueOnly: false,
    viewMode: 'matrix'
  })
  const [selectedTodo, setSelectedTodo] = useState<TodoEntity | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  /**
   * Todoを取得
   */
  const fetchTodos = useCallback(async () => {
    if (!user) {return}

    setLoading(true)
    setError(null)

    try {
      const result = await todoUseCases.getTodoDashboard({
        userId: user.id,
        includeCompleted: false,
        overdueOnly: false
      })

      if (result.success && result.data) {
        setTodos(result.data.todos)
        setStats(result.data.stats)
      } else {
        setError(result.error || 'Failed to fetch todos')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }, [user, todoUseCases])

  /**
   * Todoを完了状態に変更 - 楽観的更新でパフォーマンス向上
   */
  const completeTodo = useCallback(async (todoId: string) => {
    if (!user) {return}

    // 楽観的更新：UIを即座に更新（完了済みTodoは表示から削除）
    const optimisticTodos = todos.filter(todo => todo.id !== todoId)
    setTodos(optimisticTodos)

    try {
      const result = await todoUseCases.completeTodo({
        id: todoId,
        userId: user.id
      })

      if (!result.success) {
        // 失敗した場合は元のデータを復元
        await fetchTodos()
        setError(result.error || 'Failed to complete todo')
      }
    } catch (err) {
      // エラーが発生した場合も元のデータを復元
      await fetchTodos()
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    }
  }, [user, todos, todoUseCases, fetchTodos])

  /**
   * Todoを再開状態に変更
   */
  const reopenTodo = useCallback(async (todoId: string) => {
    if (!user) {return}

    try {
      const result = await todoUseCases.reopenTodo({
        id: todoId,
        userId: user.id
      })

      if (result.success) {
        await fetchTodos() // データを再取得
      } else {
        setError(result.error || 'Failed to reopen todo')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    }
  }, [user, todoUseCases, fetchTodos])

  /**
   * Todoを削除 - 楽観的更新でパフォーマンス向上
   */
  const deleteTodo = useCallback(async (todoId: string) => {
    if (!user) {return}

    // 楽観的更新：UIを即座に更新（削除されたTodoを表示から削除）
    const optimisticTodos = todos.filter(todo => todo.id !== todoId)
    setTodos(optimisticTodos)

    try {
      const result = await todoUseCases.deleteTodo({
        id: todoId,
        userId: user.id
      })

      if (!result.success) {
        // 失敗した場合は元のデータを復元
        await fetchTodos()
        setError(result.error || 'Failed to delete todo')
      }
    } catch (err) {
      // エラーが発生した場合も元のデータを復元
      await fetchTodos()
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    }
  }, [user, todos, todoUseCases, fetchTodos])

  /**
   * Todoを更新 - 楽観的更新を使用してパフォーマンスを向上
   */
  const updateTodo = useCallback(async (
    todoId: string,
    updates: {
      title?: string
      body?: string
      deadline?: string
      importanceScore?: number
    }
  ) => {
    if (!user) {return}

    // 楽観的更新：UIを即座に更新
    const optimisticTodos = todos.map(todo =>
      todo.id === todoId
        ? new TodoEntity({
          ...todo.getData(),
          title: updates.title !== undefined ? updates.title : todo.title,
          body: updates.body !== undefined ? updates.body : todo.body,
          deadline: updates.deadline !== undefined ? updates.deadline : todo.deadline,
          importance_score: updates.importanceScore !== undefined ? updates.importanceScore : todo.importanceScore,
          updated_at: new Date().toISOString()
        })
        : todo
    )
    setTodos(optimisticTodos)

    try {
      const result = await todoUseCases.updateTodo({
        id: todoId,
        userId: user.id,
        updates
      })

      if (!result.success) {
        // 失敗した場合は元のデータを復元
        await fetchTodos()
        setError(result.error || 'Failed to update todo')
      }
      // 成功した場合は楽観的更新がそのまま残る
    } catch (err) {
      // エラーが発生した場合も元のデータを復元
      await fetchTodos()
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    }
  }, [user, todos, todoUseCases, fetchTodos])

  /**
   * フィルタリングされたTodo（期限切れフィルター適用）
   */
  const filteredTodos = useMemo(() => {
    let result = todos

    if (filters.showOverdueOnly) {
      result = TodoEntity.filterOverdue(result)
    } else {
      result = TodoEntity.filterActive(result)
    }

    return result
  }, [todos, filters.showOverdueOnly])

  /**
   * 象限でグループ化されたTodo
   */
  const quadrants = useMemo(() => {
    return TodoEntity.groupByQuadrant(filteredTodos)
  }, [filteredTodos])

  /**
   * ビューモード用にソートされたTodo
   */
  const sortedTodos = useMemo(() => {
    if (filters.viewMode === 'list') {
      return TodoEntity.sort(filteredTodos, {
        by: 'importance',
        order: 'desc'
      })
    }
    return filteredTodos
  }, [filteredTodos, filters.viewMode])

  // UI状態管理のヘルパー関数
  const setShowOverdueOnly = useCallback((show: boolean) => {
    setFilters(prev => ({ ...prev, showOverdueOnly: show }))
  }, [])

  const setViewMode = useCallback((mode: 'matrix' | 'list') => {
    setFilters(prev => ({ ...prev, viewMode: mode }))
  }, [])

  // 初期データ取得
  useEffect(() => {
    if (user && !authLoading) {
      fetchTodos()
    }
  }, [user, authLoading, fetchTodos])

  // Slack認証リダイレクト処理
  useEffect(() => {
    if (typeof window === 'undefined') {return}

    const urlParams = new URLSearchParams(window.location.search)
    const slackAuthRequired = urlParams.get('slack_auth_required')
    const slackCode = urlParams.get('slack_code')

    if (slackAuthRequired && slackCode && user) {
      window.location.href = `/settings?slack_auth_required=true&slack_code=${slackCode}`
    }
  }, [user])

  return {
    state: {
      todos: sortedTodos,
      quadrants,
      stats,
      filteredTodos,
      loading: loading || authLoading,
      error
    },
    actions: {
      refreshTodos: fetchTodos,
      completeTodo,
      reopenTodo,
      deleteTodo,
      updateTodo
    },
    ui: {
      filters,
      setShowOverdueOnly,
      setViewMode,
      selectedTodo,
      setSelectedTodo,
      isEditModalOpen,
      setIsEditModalOpen
    },
    user
  }
}
