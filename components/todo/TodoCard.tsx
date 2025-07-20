'use client'

import { Todo } from '@/types'
import { Button } from '@/components/ui/Button'
import { Check, Edit2, Trash2, Calendar, AlertCircle } from 'lucide-react'
import { formatDeadline, isOverdue, linkifyText } from '@/lib/utils'
import { useTodoStore } from '@/store/todoStore'
import { useState } from 'react'

interface TodoCardProps {
  todo: Todo
  onEdit?: () => void
}

export function TodoCard({ todo, onEdit }: TodoCardProps) {
  const { completeTodo, deleteTodo, updateTodo } = useTodoStore()
  const [isDeleting, setIsDeleting] = useState(false)
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

  const handleComplete = async () => {
    await completeTodo(todo.id)
  }

  const handleDelete = async () => {
    if (window.confirm('このタスクを削除してもよろしいですか？')) {
      setIsDeleting(true)
      try {
        await deleteTodo(todo.id)
      } catch (error) {
        console.error('Failed to delete todo:', error)
        setIsDeleting(false)
      }
    }
  }

  const handleExtendDeadline = async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    await updateTodo(todo.id, { deadline: tomorrow.toISOString().split('T')[0] })
  }

  const urgencyColors = {
    now: 'bg-red-100 text-red-800',
    today: 'bg-orange-100 text-orange-800',
    tomorrow: 'bg-yellow-100 text-yellow-800',
    later: 'bg-gray-100 text-gray-800',
  }

  const urgencyLabels = {
    now: '今すぐ',
    today: '今日中',
    tomorrow: '明日',
    later: 'それより後',
  }

  return (
    <div 
      className={`
        bg-white rounded-lg shadow-soft p-4 transition-all duration-200 cursor-pointer
        ${todo.status === 'done' ? 'opacity-60' : ''}
        ${overdue ? 'border-2 border-red-300' : 'border border-gray-200'}
        ${isDeleting ? 'scale-95 opacity-50' : 'hover:shadow-md'}
      `}
      onClick={onEdit}
    >
      <h3 className="font-semibold text-gray-900 mb-3 break-words break-all">
        {getDisplayContent()}
      </h3>

      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${urgencyColors[todo.urgency]}`}>
          {urgencyLabels[todo.urgency]}
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
            {overdue ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleExtendDeadline}
                  className="flex-1"
                >
                  期限延長
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex-1"
                >
                  削除
                </Button>
              </>
            ) : (
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
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}