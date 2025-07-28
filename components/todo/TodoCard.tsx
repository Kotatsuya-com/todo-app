'use client'

import { Todo } from '@/types'
import { Button } from '@/components/ui/Button'
import { Check, Trash2, Calendar, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDeadline, isOverdue } from '@/lib/utils'
import { useTodoStore } from '@/store/todoStore'
import { useState } from 'react'
import { uiLogger } from '@/lib/client-logger'

interface TodoCardProps {
  todo: Todo
  onEdit?: () => void
}

export function TodoCard({ todo, onEdit }: TodoCardProps) {
  const { completeTodo, deleteTodo, updateTodo } = useTodoStore()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const overdue = isOverdue(todo.deadline)

  // 表示用のタイトル/内容を決定
  const getDisplayContent = () => {
    if (todo.title && todo.title.trim()) {
      return todo.title
    }
    // 見出しがない場合は本文の最初の20文字 + ...
    const plainText = todo.body.replace(/<[^>]*>/g, '').trim()
    if (plainText.length <= 20) {
      return plainText
    }
    return plainText.substring(0, 20) + '...'
  }

  // 本文の処理（HTMLタグを除去）
  const getPlainTextBody = () => {
    return todo.body.replace(/<[^>]*>/g, '').trim()
  }

  // ホバー時に表示する本文（200文字まで）
  const getHoverBodyText = () => {
    const plainText = getPlainTextBody()
    if (plainText.length <= 200) {
      return plainText
    }
    return plainText.substring(0, 200) + '...'
  }

  // 全文表示用の本文
  const getFullBodyText = () => {
    return getPlainTextBody()
  }

  // 本文が200文字を超えるかどうか
  const hasLongBody = getPlainTextBody().length > 200

  const handleComplete = async () => {
    await completeTodo(todo.id)
  }

  const handleDelete = async () => {
    if (window.confirm('このタスクを削除してもよろしいですか？')) {
      setIsDeleting(true)
      try {
        await deleteTodo(todo.id)
      } catch (error) {
        uiLogger.error({ error, todoId: todo.id }, 'Failed to delete todo')
        setIsDeleting(false)
      }
    }
  }

  const handleExtendDeadline = async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await updateTodo(todo.id, { deadline: tomorrow.toISOString().split('T')[0] })
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
            {formatDeadline(todo.deadline)}
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
