'use client'

import { useState, useEffect } from 'react'
import * as Select from '@radix-ui/react-select'
import { ChevronDown, Sparkles, Calendar, Link } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Urgency } from '@/types'

interface TodoFormProps {
  initialTitle?: string
  initialBody?: string
  initialUrgency?: Urgency
  initialDeadline?: string
  onSubmit: (data: {
    title: string
    body: string
    urgency: Urgency
    deadline: string
    slackData: { text: string; url: string } | null
  }) => Promise<void>
  onCancel: () => void
  submitLabel: string
  isSubmitting?: boolean
}

export function TodoForm({
  initialTitle = '',
  initialBody = '',
  initialUrgency = 'today',
  initialDeadline = '',
  onSubmit,
  onCancel,
  submitLabel,
  isSubmitting = false
}: TodoFormProps) {
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState(initialBody)
  const [urgency, setUrgency] = useState<Urgency>(initialUrgency)
  const [deadline, setDeadline] = useState<string>(initialDeadline)
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false)
  const [isSlackUrl, setIsSlackUrl] = useState(false)
  const [slackData, setSlackData] = useState<{ text: string; url: string } | null>(null)
  const [isLoadingSlack, setIsLoadingSlack] = useState(false)

  // 初期値が変更されたときに状態を更新
  useEffect(() => {
    setTitle(initialTitle)
    setBody(initialBody)
    setUrgency(initialUrgency)
    setDeadline(initialDeadline)
    setSlackData(null)
    setIsSlackUrl(false)
  }, [initialTitle, initialBody, initialUrgency, initialDeadline])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      title: title.trim(),
      body: body.trim(),
      urgency,
      deadline,
      slackData
    })
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
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <div className="flex items-center gap-2 mb-1">
          <label className="block text-sm font-medium text-gray-700">
            見出し
          </label>
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
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="タスクの見出し（自動生成可能）"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          緊急度
        </label>
        <Select.Root value={urgency} onValueChange={(value: Urgency) => setUrgency(value)}>
          <Select.Trigger className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between">
            <Select.Value />
            <ChevronDown className="w-4 h-4" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg-white border border-gray-300 rounded-lg shadow-lg z-50">
              <Select.Viewport className="p-1">
                <Select.Item value="now" className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded">
                  <Select.ItemText>今すぐ</Select.ItemText>
                </Select.Item>
                <Select.Item value="today" className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded">
                  <Select.ItemText>今日中</Select.ItemText>
                </Select.Item>
                <Select.Item value="tomorrow" className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded">
                  <Select.ItemText>明日</Select.ItemText>
                </Select.Item>
                <Select.Item value="later" className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded">
                  <Select.ItemText>それより後</Select.ItemText>
                </Select.Item>
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Calendar className="w-4 h-4 inline mr-1" />
          期限日（任意）
        </label>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
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
          {isSubmitting ? '保存中...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}