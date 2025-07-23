'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useTodoStore } from '@/store/todoStore'
import { Todo, Urgency } from '@/types'
import { getDeadlineFromUrgency } from '@/lib/utils'
import { TodoForm } from './TodoForm'

interface EditTodoModalProps {
  isOpen: boolean
  onClose: () => void
  todo: Todo | null
}

export function EditTodoModal({ isOpen, onClose, todo }: EditTodoModalProps) {
  const { updateTodo } = useTodoStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialValues, setInitialValues] = useState({
    title: '',
    body: '',
    urgency: 'today' as Urgency,
    deadline: ''
  })

  // todoが変更されたときに初期値を設定
  useEffect(() => {
    if (todo && isOpen) {
      setInitialValues({
        title: todo.title || '',
        body: todo.body || '',
        deadline: todo.deadline || '',
        urgency: (() => {
          // deadline から urgency を推定
          if (todo.deadline) {
            const today = new Date().toISOString().split('T')[0]
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            const tomorrowStr = tomorrow.toISOString().split('T')[0]

            if (todo.deadline === today) {
              return 'today'
            } else if (todo.deadline === tomorrowStr) {
              return 'tomorrow'
            } else {
              return 'later'
            }
          } else {
            return 'later'
          }
        })()
      })
    }
  }, [todo, isOpen])

  const handleSubmit = async (data: {
    title: string
    body: string
    urgency: string
    deadline: string
    slackData: { text: string; url: string } | null
  }) => {
    if (!todo) {return}

    setIsSubmitting(true)
    try {
      let finalBody = data.body
      if (data.slackData) {
        // Slackメッセージがある場合、本文とSlackメッセージを改行で結合
        if (finalBody) {
          finalBody = `${finalBody}\n\n${data.slackData.text}`
        } else {
          finalBody = data.slackData.text
        }
      }
      await updateTodo(todo.id, {
        body: finalBody,
        title: data.title || undefined,
        deadline: data.deadline || getDeadlineFromUrgency(data.urgency as any)
      })

      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    onClose()
  }

  if (!todo) {return null}

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg w-full max-w-md p-6 z-50 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              タスクを編集
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <TodoForm
            key={`${todo.id}-${isOpen}`} // todoが変更されたときにフォームをリセット
            initialTitle={initialValues.title}
            initialBody={initialValues.body}
            initialUrgency={initialValues.urgency}
            initialDeadline={initialValues.deadline}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            submitLabel="保存"
            isSubmitting={isSubmitting}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
