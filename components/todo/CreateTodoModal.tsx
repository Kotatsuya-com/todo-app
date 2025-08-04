'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useTodoForm } from '@/src/presentation/hooks/useTodoForm'
import { useTodoDashboard } from '@/src/presentation/hooks/useTodoDashboard'
import { TodoEntity } from '@/src/domain/entities/Todo'
import { TodoForm } from './TodoForm'

interface CreateTodoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateTodoModal({ isOpen, onClose }: CreateTodoModalProps) {
  const { actions: dashboardActions } = useTodoDashboard()
  const { state, actions } = useTodoForm({
    onSuccess: () => {
      onClose()
      dashboardActions.refreshTodos()
    }
  })

  const handleSubmit = async (data: {
    title: string
    body: string
    urgency: string
    deadline: string
    slackData: { text: string; url: string } | null
  }) => {
    // Slackデータを処理
    let finalBody = data.body
    if (data.slackData) {
      if (finalBody) {
        finalBody = `${finalBody}\n\n${data.slackData.text}`
      } else {
        finalBody = data.slackData.text
      }
      // SlackデータをfillFromSlackMessageで設定
      actions.fillFromSlackMessage(data.slackData.text, data.slackData.url)
    } else {
      // フォームデータを直接更新
      actions.updateField('title', data.title)
      actions.updateField('body', finalBody)
      actions.updateField('deadline', data.deadline || TodoEntity.getDeadlineFromUrgency(data.urgency as any) || '')
    }

    // フォームを送信
    await actions.submitForm()
  }

  const handleClose = () => {
    actions.resetForm()
    onClose()
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 animate-in fade-in" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between p-6 border-b">
            <Dialog.Title className="text-xl font-semibold">
              新しいタスクを作成
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-2 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
            <TodoForm
              onSubmit={handleSubmit}
              onCancel={handleClose}
              submitLabel="作成"
              isSubmitting={state.loading}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
