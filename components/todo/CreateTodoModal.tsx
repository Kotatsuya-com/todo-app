'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import { X, ChevronDown, Sparkles, Calendar, Link } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTodoStore } from '@/store/todoStore'
import { Urgency } from '@/types'
import { getDeadlineFromUrgency } from '@/lib/utils'

interface CreateTodoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateTodoModal({ isOpen, onClose }: CreateTodoModalProps) {
  const { createTodo } = useTodoStore()
  const [body, setBody] = useState('')
  const [title, setTitle] = useState('')
  const [urgency, setUrgency] = useState<Urgency>('today')
  const [deadline, setDeadline] = useState<string>('')
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSlackUrl, setIsSlackUrl] = useState(false)
  const [slackData, setSlackData] = useState<{ text: string; url: string } | null>(null)
  const [isLoadingSlack, setIsLoadingSlack] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return

    setIsSubmitting(true)
    try {
      const finalBody = slackData ? slackData.text : body.trim()
      await createTodo({
        body: finalBody,
        title: title.trim() || undefined,
        urgency,
        deadline: deadline || getDeadlineFromUrgency(urgency),
      })
      
      // Reset form
      setBody('')
      setTitle('')
      setUrgency('today')
      setDeadline('')
      setSlackData(null)
      setIsSlackUrl(false)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateTitle = async () => {
    const content = slackData ? slackData.text : body.trim()
    if (!content) return

    setIsGeneratingTitle(true)
    try {
      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setTitle(data.title)
      }
    } catch (error) {
      console.error('Failed to generate title:', error)
    } finally {
      setIsGeneratingTitle(false)
    }
  }

  const isSlackUrlFormat = (text: string) => {
    return /https:\/\/[a-zA-Z0-9-]+\.slack\.com\/archives\/[A-Z0-9]+\/p[0-9]+/.test(text)
  }

  const handleBodyChange = (value: string) => {
    setBody(value)
    const isSlack = isSlackUrlFormat(value.trim())
    setIsSlackUrl(isSlack)
    
    if (!isSlack && slackData) {
      setSlackData(null)
    }
  }

  const fetchSlackMessage = async () => {
    if (!isSlackUrl || !body.trim()) return

    setIsLoadingSlack(true)
    try {
      const response = await fetch('/api/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slackUrl: body.trim() }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setSlackData({ text: data.text, url: data.url })
      } else {
        console.error('Failed to fetch Slack message')
      }
    } catch (error) {
      console.error('Failed to fetch Slack message:', error)
    } finally {
      setIsLoadingSlack(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-fade-in" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md bg-white rounded-lg shadow-xl animate-slide-in">
          <div className="flex items-center justify-between p-6 border-b">
            <Dialog.Title className="text-lg font-semibold">
              新規タスク作成
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                本文 <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <textarea
                  value={body}
                  onChange={(e) => handleBodyChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="タスクの内容またはSlackURLを入力してください..."
                  required
                />
                {isSlackUrl && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-sm text-blue-600">
                      <Link className="w-4 h-4 mr-1" />
                      SlackURLが検出されました
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={fetchSlackMessage}
                      disabled={isLoadingSlack}
                    >
                      {isLoadingSlack ? '取得中...' : 'メッセージ取得'}
                    </Button>
                  </div>
                )}
                {slackData && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-700 font-medium mb-1">Slackメッセージ:</div>
                    <div className="text-sm text-gray-700">{slackData.text}</div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                見出し
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="見出しを入力（省略可）"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={generateTitle}
                  disabled={(!body.trim() && !slackData) || isGeneratingTitle}
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  生成
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  緊急度
                </label>
                <Select.Root value={urgency} onValueChange={(value) => setUrgency(value as Urgency)}>
                  <Select.Trigger className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between">
                    <Select.Value />
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="bg-white border border-gray-300 rounded-lg shadow-lg">
                      <Select.Viewport className="p-1">
                        <Select.Item value="now" className="px-3 py-2 hover:bg-gray-100 rounded cursor-pointer">
                          <Select.ItemText>今すぐ</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="today" className="px-3 py-2 hover:bg-gray-100 rounded cursor-pointer">
                          <Select.ItemText>今日中</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="tomorrow" className="px-3 py-2 hover:bg-gray-100 rounded cursor-pointer">
                          <Select.ItemText>明日</Select.ItemText>
                        </Select.Item>
                        <Select.Item value="later" className="px-3 py-2 hover:bg-gray-100 rounded cursor-pointer">
                          <Select.ItemText>それより後</Select.ItemText>
                        </Select.Item>
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  期限日
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={(!body.trim() && !slackData) || isSubmitting}
                className="flex-1"
              >
                作成
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}