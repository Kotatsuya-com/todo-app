'use client'

import { Todo } from '@/src/domain/types'
import { TodoEntity } from '@/src/domain/entities/Todo'
import { Button } from '@/components/ui/Button'
import { Check, Trash2, Calendar, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { uiLogger } from '@/lib/client-logger'

interface TodoCardProps {
  todo: Todo
  onEdit?: () => void
  onComplete?: (_todoId: string) => Promise<void>
  onDelete?: (_todoId: string) => Promise<void>
  onUpdate?: (_todoId: string, _updates: any) => Promise<void>
}

export function TodoCard({ todo, onEdit, onComplete, onDelete, onUpdate }: TodoCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  // TodoEntityを作成してビジネスロジックを使用
  const todoEntity = new TodoEntity({
    id: todo.id,
    user_id: todo.user_id,
    title: todo.title || null,
    body: todo.body,
    deadline: todo.deadline || null,
    importance_score: todo.importance_score,
    status: todo.status === 'open' ? 'open' : 'done',
    created_at: todo.created_at,
    updated_at: new Date().toISOString(),
    created_via: todo.created_via || 'manual'
  })

  const overdue = todoEntity.isOverdue()

  // Entity メソッドを使用
  const getDisplayContent = () => todoEntity.getDisplayTitle()
  const getPlainTextBody = () => todoEntity.getPlainTextBody()
  const getHoverBodyText = () => todoEntity.getTrimmedBody(200)
  const getFullBodyText = () => todoEntity.getPlainTextBody()
  const hasLongBody = todoEntity.getPlainTextBody().length > 200

  const handleComplete = async () => {
    if (onComplete) {
      await onComplete(todo.id)
    }
  }

  const handleDelete = async () => {
    if (window.confirm('このタスクを削除してもよろしいですか？')) {
      setIsDeleting(true)
      try {
        if (onDelete) {
          await onDelete(todo.id)
        }
      } catch (error) {
        uiLogger.error({ error, todoId: todo.id }, 'Failed to delete todo')
        setIsDeleting(false)
      }
    }
  }

  const handleExtendDeadline = async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (onUpdate) {
      await onUpdate(todo.id, { deadline: tomorrow.toISOString().split('T')[0] })
    }
  }

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  // 既存データの互換性のため、'now'を'today'として扱う
  const normalizedUrgency = (todo.urgency as string) === 'now' ? 'today' : todo.urgency

  const urgencyColors = {
    today: 'bg-orange-100 text-orange-800',
    tomorrow: 'bg-yellow-100 text-yellow-800',
    later: 'bg-gray-100 text-gray-800'
  }

  const urgencyLabels = {
    today: '今日中',
    tomorrow: '明日',
    later: 'それより後'
  }

  return (
    <div
      className={`
        bg-white rounded-lg shadow-soft p-4 transition-all duration-200 cursor-pointer
        ${todo.status === 'done' ? 'opacity-60' : ''}
        ${overdue ? 'border-2 border-red-300' : 'border border-gray-200'}
        ${isDeleting ? 'scale-95 opacity-50' : 'hover:shadow-md'}
        ${isHovered || isExpanded ? 'transform scale-105 shadow-lg z-10' : ''}
      `}
      onClick={onEdit}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h3 className="font-semibold text-gray-900 mb-3 break-words break-all">
        {getDisplayContent()}
      </h3>

      {/* ホバー時またはExpanded時の本文表示 */}
      {(isHovered || isExpanded) && getPlainTextBody() && (
        <div className="mb-3 p-3 bg-gray-50 rounded-md border">
          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
            {isExpanded ? getFullBodyText() : getHoverBodyText()}
          </p>
          {hasLongBody && (
            <button
              onClick={handleExpandToggle}
              className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  折りたたむ
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  もっと見る
                </>
              )}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${urgencyColors[normalizedUrgency as keyof typeof urgencyColors]}`}>
          {urgencyLabels[normalizedUrgency as keyof typeof urgencyLabels]}
        </span>

        {todo.deadline && (
          <span className={`inline-flex items-center gap-1 text-sm ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
            <Calendar className="w-3 h-3" />
            {todoEntity.getFormattedDeadline()}
            {overdue && <AlertCircle className="w-3 h-3" />}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {todo.status === 'open' && (
          <>
            <Button
              size="sm"
              variant="primary"
              onClick={handleComplete}
              className="flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              完了
            </Button>
            {overdue && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleExtendDeadline}
                className="flex items-center gap-1"
              >
                期限延長
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
