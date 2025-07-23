'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useTodoStore } from '@/store/todoStore'
import { getDeadlineFromUrgency } from '@/lib/utils'
import { TodoForm } from './TodoForm'

interface CreateTodoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateTodoModal({ isOpen, onClose }: CreateTodoModalProps) {
  const { createTodo } = useTodoStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: {
    title: string
    body: string
    urgency: string
    deadline: string
    slackData: { text: string; url: string } | null
  }) => {
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
      await createTodo({
        body: finalBody,
        title: data.title || undefined,
        urgency: data.urgency as any,
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

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg w-full max-w-md p-6 z-50 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              新規タスク作成
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <TodoForm
            onSubmit={handleSubmit}
            onCancel={handleClose}
            submitLabel="作成"
            isSubmitting={isSubmitting}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
