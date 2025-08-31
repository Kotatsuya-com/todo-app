/**
 * Dashboard Page with Clean Architecture
 * Clean Architectureパターンに従ったダッシュボードページ
 */

'use client'

import React, { useMemo } from 'react'
import { useTodoDashboard } from '../hooks/useTodoDashboard'
import { Button } from '@/components/ui/Button'
import { TodoCard } from '@/components/todo/TodoCard'
import { EditTodoModal } from '@/components/todo/EditTodoModal'
import { AuthForm } from '@/components/auth/AuthForm'
import { Grid3x3, List, Filter } from 'lucide-react'
import { Urgency, Status, CreatedVia } from '@/src/domain/types'

const QUADRANT_INFO = {
  urgent_important: { title: '🔥 今すぐやる', color: 'bg-red-50 border-red-200' },
  not_urgent_important: { title: '📅 計画してやる', color: 'bg-blue-50 border-blue-200' },
  urgent_not_important: { title: '⚡ さっさと片付ける', color: 'bg-yellow-50 border-yellow-200' },
  not_urgent_not_important: { title: '📝 後回し', color: 'bg-gray-50 border-gray-200' }
} as const

export default function DashboardPage() {
  const { state, actions, ui, user } = useTodoDashboard()
  const { todos, quadrants, loading, error } = state
  const { completeTodo, deleteTodo, updateTodo } = actions
  const {
    filters,
    setShowOverdueOnly,
    setViewMode,
    selectedTodo,
    setSelectedTodo,
    isEditModalOpen,
    setIsEditModalOpen
  } = ui

  /**
   * メモ化されたEditTodoModal用のtodoオブジェクト - 実際のデータが変更された場合のみ再作成
   */
  const memoizedEditTodo = useMemo(() => {
    if (!selectedTodo) {return null}

    return {
      id: selectedTodo.id,
      title: selectedTodo.title || undefined,
      body: selectedTodo.body,
      urgency: (selectedTodo.deadline ? 'today' : 'later') as Urgency,
      deadline: selectedTodo.deadline || undefined,
      importance_score: selectedTodo.importanceScore,
      status: (selectedTodo.status === 'done' ? 'done' : 'open') as Status,
      created_at: selectedTodo.createdAt,
      user_id: selectedTodo.userId,
      created_via: (selectedTodo.createdVia === 'slack_url' ? 'slack_webhook' : selectedTodo.createdVia) as CreatedVia
    }
  }, [selectedTodo])

  /**
   * TodoCard用のメモ化されたtodoオブジェクト生成ヘルパー
   */
  const createMemoizedTodoCardProps = useMemo(() => {
    const memoMap = new Map<string, any>()

    return (todo: any) => {
      const key = `${todo.id}-${todo.title}-${todo.body}-${todo.deadline}-${todo.importanceScore}-${todo.status}-${todo.createdAt}`

      if (memoMap.has(key)) {
        return memoMap.get(key)
      }

      const todoProps = {
        id: todo.id,
        title: todo.title || undefined,
        body: todo.body,
        urgency: (todo.deadline ? 'today' : 'later') as Urgency,
        deadline: todo.deadline || undefined,
        importance_score: todo.importanceScore,
        status: (todo.status === 'done' ? 'done' : 'open') as Status,
        created_at: todo.createdAt,
        user_id: todo.userId,
        created_via: (todo.createdVia === 'slack_url' ? 'slack_webhook' : todo.createdVia) as CreatedVia
      }

      memoMap.set(key, todoProps)
      return todoProps
    }
  }, [])

  /**
   * 編集モーダルを開く
   */
  const handleEditTodo = (todo: any) => {
    setSelectedTodo(todo)
    setIsEditModalOpen(true)
  }

  /**
   * 編集モーダルを閉じる
   */
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedTodo(null)
  }

  // 未認証の場合はログインフォームを表示
  if (!user) {
    return <AuthForm />
  }

  /**
   * エラー表示
   */
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">エラーが発生しました</h3>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">マトリクス</h2>

        <div className="flex items-center gap-3">
          {/* 期限切れフィルター */}
          <Button
            variant={filters.showOverdueOnly ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowOverdueOnly(!filters.showOverdueOnly)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            期限切れのみ
          </Button>

          {/* ビューモード切り替え */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('matrix')}
              className={`p-2 rounded ${filters.viewMode === 'matrix' ? 'bg-white shadow-sm' : ''}`}
              aria-label="マトリクス表示"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${filters.viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              aria-label="リスト表示"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ローディング表示 */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : todos.length === 0 ? (
        /* 空状態 */
        <div className="text-center py-12">
          <p className="text-gray-500">
            {filters.showOverdueOnly ? '期限切れのタスクはありません' : 'タスクがありません'}
          </p>
        </div>
      ) : filters.viewMode === 'matrix' ? (
        /* マトリクス表示 */
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          {Object.entries(quadrants).map(([key, quadrantTodos]) => (
            <div
              key={key}
              className={`rounded-lg border-2 p-4 min-h-[300px] ${
                QUADRANT_INFO[key as keyof typeof QUADRANT_INFO].color
              }`}
            >
              <h3 className="font-semibold text-gray-700 mb-3">
                {QUADRANT_INFO[key as keyof typeof QUADRANT_INFO].title}
              </h3>
              <div className="space-y-3">
                {quadrantTodos.map((todo: any) => (
                  <TodoCard
                    key={todo.id}
                    todo={createMemoizedTodoCardProps(todo)}
                    onEdit={() => handleEditTodo(todo)}
                    onComplete={completeTodo}
                    onDelete={deleteTodo}
                    onUpdate={updateTodo}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* リスト表示 */
        <div className="space-y-3">
          {todos.map(todo => (
            <TodoCard
              key={todo.id}
              todo={createMemoizedTodoCardProps(todo)}
              onEdit={() => handleEditTodo(todo)}
              onComplete={completeTodo}
              onDelete={deleteTodo}
              onUpdate={updateTodo}
            />
          ))}
        </div>
      )}

      {/* 編集モーダル */}
      <EditTodoModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        todo={memoizedEditTodo}
      />
    </div>
  )
}
