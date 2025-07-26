'use client'

import { useEffect, useState } from 'react'
import { useTodoStore } from '@/store/todoStore'
import { TodoCard } from '@/components/todo/TodoCard'
import { EditTodoModal } from '@/components/todo/EditTodoModal'
import { Button } from '@/components/ui/Button'
import { Grid3x3, List, Filter } from 'lucide-react'
import { getQuadrant, isOverdue } from '@/lib/utils'
import { AuthForm } from '@/components/auth/AuthForm'
import { Todo } from '@/types'

export default function DashboardPage() {
  const { user, todos, loading, fetchTodos } = useTodoStore()
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix')
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)
  const [editTodo, setEditTodo] = useState<Todo | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  useEffect(() => {
    if (user) {
      fetchTodos()
    }
  }, [user, fetchTodos])

  if (!user) {
    return <AuthForm />
  }

  const activeTodos = todos.filter(todo => todo.status === 'open')
  const displayTodos = showOverdueOnly
    ? activeTodos.filter(todo => isOverdue(todo.deadline))
    : activeTodos

  // デバッグ: タスクのスコアと四象限をログ出力
  console.log('🔍 [DEBUG] Dashboard - displayTodos:')
  displayTodos.forEach(todo => {
    const quadrant = getQuadrant(todo.deadline, todo.importance_score)
    console.log(`🔍 [DEBUG] Todo "${todo.title}": score=${todo.importance_score}, deadline=${todo.deadline}, quadrant=${quadrant}`)
  })

  const quadrants = {
    urgent_important: displayTodos.filter(todo => getQuadrant(todo.deadline, todo.importance_score) === 'urgent_important'),
    not_urgent_important: displayTodos.filter(todo => getQuadrant(todo.deadline, todo.importance_score) === 'not_urgent_important'),
    urgent_not_important: displayTodos.filter(todo => getQuadrant(todo.deadline, todo.importance_score) === 'urgent_not_important'),
    not_urgent_not_important: displayTodos.filter(todo => getQuadrant(todo.deadline, todo.importance_score) === 'not_urgent_not_important')
  }

  console.log('🔍 [DEBUG] Quadrant counts:')
  Object.entries(quadrants).forEach(([key, todos]) => {
    console.log(`🔍 [DEBUG] ${key}: ${todos.length} todos`)
  })

  const quadrantInfo = {
    urgent_important: { title: '🔥 今すぐやる', color: 'bg-red-50 border-red-200' },
    not_urgent_important: { title: '📅 計画してやる', color: 'bg-blue-50 border-blue-200' },
    urgent_not_important: { title: '🤝 誰かに任せる', color: 'bg-yellow-50 border-yellow-200' },
    not_urgent_not_important: { title: '🗑️ やらない', color: 'bg-gray-50 border-gray-200' }
  }

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">マトリクス</h2>

        <div className="flex items-center gap-3">
          <Button
            variant={showOverdueOnly ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowOverdueOnly(!showOverdueOnly)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            期限切れのみ
          </Button>

          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('matrix')}
              className={`p-2 rounded ${viewMode === 'matrix' ? 'bg-white shadow-sm' : ''}`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : displayTodos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {showOverdueOnly ? '期限切れのタスクはありません' : 'タスクがありません'}
          </p>
        </div>
      ) : viewMode === 'matrix' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(quadrants).map(([key, todos]) => (
            <div
              key={key}
              className={`rounded-lg border-2 p-4 min-h-[300px] ${quadrantInfo[key as keyof typeof quadrantInfo].color}`}
            >
              <h3 className="font-semibold text-gray-700 mb-3">
                {quadrantInfo[key as keyof typeof quadrantInfo].title}
              </h3>
              <div className="space-y-3">
                {todos.map(todo => (
                  <TodoCard
                    key={todo.id}
                    todo={todo}
                    onEdit={() => {
                      setEditTodo(todo)
                      setIsEditModalOpen(true)
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {displayTodos
            .sort((a, b) => {
              // 重要度でソート（降順）
              if (b.importance_score !== a.importance_score) {
                return b.importance_score - a.importance_score
              }
              // 期限でソート（昇順）
              if (a.deadline && b.deadline) {
                return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
              }
              return 0
            })
            .map(todo => (
              <TodoCard
                key={todo.id}
                todo={todo}
                onEdit={() => {
                  setEditTodo(todo)
                  setIsEditModalOpen(true)
                }}
              />
            ))}
        </div>
      )}

      <EditTodoModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditTodo(null)
        }}
        todo={editTodo}
      />
    </div>
  )
}
