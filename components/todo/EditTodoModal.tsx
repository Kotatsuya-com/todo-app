'use client'

import { useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useTodoForm } from '@/src/presentation/hooks/useTodoForm'
import { TodoEntity } from '@/src/domain/entities/Todo'
import { Todo, Urgency } from '@/types'
import { TodoForm } from './TodoForm'

interface EditTodoModalProps {
  isOpen: boolean
  onClose: () => void
  todo: Todo | null
  onUpdate?: (_todoId: string, _updates: any) => Promise<void>
}

export function EditTodoModal({ isOpen, onClose, todo, onUpdate }: EditTodoModalProps) {
  // Clean Architecture: Use custom hook for form management
  const { state, actions } = useTodoForm({
    initialTodo: todo ? new TodoEntity({
      id: todo.id,
      user_id: todo.user_id,
      title: todo.title || null,
      body: todo.body,
      deadline: todo.deadline || null,
      importance_score: todo.importance_score,
      status: todo.status === 'open' ? 'open' : 'completed',
      created_at: todo.created_at,
      updated_at: new Date().toISOString(),
      created_via: todo.created_via || 'manual'
    }) : null,
    onSuccess: () => {
      onClose()
    }
  })

  // Initialize form when todo changes
  useEffect(() => {
    if (todo && isOpen) {
      // Clean Architecture用のエンティティ作成は不要（useTodoFormで処理）
      // resetFormも不要（initialTodoで初期化される）
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

    // フォームデータを更新
    actions.updateField('title', data.title)
    actions.updateField('body', data.body)
    actions.updateField('deadline', data.deadline)

    // Clean Architecture経由で更新
    await actions.submitForm()

    // レガシー互換性のため、onUpdateも呼び出す
    if (onUpdate) {
      await onUpdate(todo.id, {
        title: data.title,
        body: data.body,
        deadline: data.deadline
      })
    }
  }

  const handleClose = () => {
    actions.resetForm()
    onClose()
  }

  if (!todo) {return null}

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 animate-in fade-in" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between p-6 border-b">
            <Dialog.Title className="text-xl font-semibold">
              タスクを編集
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-2 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
            <TodoForm
              initialTitle={state.formData.title}
              initialBody={state.formData.body}
              initialUrgency={state.formData.urgency === 'now' ? 'today' : state.formData.urgency as Urgency}
              initialDeadline={state.formData.deadline}
              onSubmit={handleSubmit}
              onCancel={handleClose}
              submitLabel="更新"
              isSubmitting={state.loading}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
