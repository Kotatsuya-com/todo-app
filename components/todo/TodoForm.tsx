'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Calendar, Link } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Urgency } from '@/types'
import { getDeadlineFromUrgency } from '@/lib/utils'
import { apiLogger } from '@/lib/client-logger'

interface TodoFormProps {
  initialTitle?: string
  initialBody?: string
  initialUrgency?: Urgency
  initialDeadline?: string
  onSubmit: (_data: {
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
  const [slackData, setSlackData] = useState<{ text: string; url: string; workspace?: string } | null>(null)
  const [isLoadingSlack, setIsLoadingSlack] = useState(false)
  const [slackError, setSlackError] = useState<string | null>(null)
  const [hasSlackConnection, setHasSlackConnection] = useState<boolean | null>(null)

  // Slack連携状態をチェック
  const checkSlackConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/slack/connections')
      if (response.ok) {
        const data = await response.json()
        setHasSlackConnection((data.connections || []).length > 0)
      } else {
        setHasSlackConnection(false)
      }
    } catch (error) {
      apiLogger.error({ error }, 'Failed to check Slack connection')
      setHasSlackConnection(false)
    }
  }, [])

  // コンポーネントマウント時にSlack連携状態をチェック
  useEffect(() => {
    checkSlackConnection()
  }, [checkSlackConnection])

  // 初期値が変更されたときに状態を更新
  useEffect(() => {
    setTitle(initialTitle)
    setBody(initialBody)
    setUrgency(initialUrgency)
    setDeadline(initialDeadline)
    setSlackData(null)
    setIsSlackUrl(false)
    setSlackError(null)
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
    if (!content) {return}

    setIsGeneratingTitle(true)
    try {
      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })

      if (response.ok) {
        const data = await response.json()
        setTitle(data.title)
      }
    } catch (error) {
      apiLogger.error({ error }, 'Failed to generate title')
    } finally {
      setIsGeneratingTitle(false)
    }
  }

  const isSlackUrlFormat = (text: string) => {
    return /https:\/\/[a-zA-Z0-9-]+\.slack\.com\/archives\/[A-Z0-9]+\/p[0-9]+/.test(text)
  }

  const fetchSlackMessage = useCallback(async () => {
    if (!isSlackUrl || !body.trim()) {return}

    setIsLoadingSlack(true)
    setSlackError(null)
    try {
      const response = await fetch('/api/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slackUrl: body.trim() })
      })

      if (response.ok) {
        const data = await response.json()
        setSlackData({
          text: data.text,
          url: data.url,
          workspace: data.workspace
        })
        setSlackError(null)

        // Slackメッセージ取得成功時に自動でタイトル生成
        if (data.text && !title.trim()) {
          setIsGeneratingTitle(true)
          try {
            const titleResponse = await fetch('/api/generate-title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: data.text })
            })

            if (titleResponse.ok) {
              const titleData = await titleResponse.json()
              setTitle(titleData.title)
            }
          } catch (titleError) {
            apiLogger.error({ error: titleError }, 'Failed to generate title from Slack content')
          } finally {
            setIsGeneratingTitle(false)
          }
        }
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.details || errorData.error || 'メッセージの取得に失敗しました'
        setSlackError(errorMessage)
        apiLogger.error({ status: response.status, errorData }, 'Failed to fetch Slack message')

        // 401または400エラーの場合は連携状態を再チェック
        if (response.status === 401 || response.status === 400) {
          await checkSlackConnection()
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ネットワークエラーが発生しました'
      setSlackError(errorMessage)
      apiLogger.error({ error }, 'Failed to fetch Slack message')
    } finally {
      setIsLoadingSlack(false)
    }
  }, [isSlackUrl, body, title, checkSlackConnection])

  const handleBodyChange = (value: string) => {
    setBody(value)
    const isSlack = isSlackUrlFormat(value.trim())
    setIsSlackUrl(isSlack)

    if (!isSlack && slackData) {
      setSlackData(null)
      setSlackError(null)
    }
  }

  // Slack URLが検出されたときに自動的にメッセージを取得（連携済みの場合のみ）
  useEffect(() => {
    if (isSlackUrl && body.trim() && !slackData && !isLoadingSlack && hasSlackConnection === true) {
      fetchSlackMessage()
    }
  }, [isSlackUrl, body, slackData, isLoadingSlack, hasSlackConnection, fetchSlackMessage])

  const handleUrgencyChange = (newUrgency: Urgency) => {
    setUrgency(newUrgency)

    // 緊急度に応じて期限日を自動設定
    const autoDeadline = getDeadlineFromUrgency(newUrgency)
    if (autoDeadline !== undefined) {
      setDeadline(autoDeadline)
    } else {
      // "later"の場合は期限日をクリア
      setDeadline('')
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
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center text-sm text-blue-600">
                  <Link className="w-4 h-4 mr-1" />
                  SlackURLが検出されました
                </div>
                {hasSlackConnection === true && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={fetchSlackMessage}
                    disabled={isLoadingSlack}
                  >
                    {isLoadingSlack ? '取得中...' : '再取得'}
                  </Button>
                )}
              </div>
              {hasSlackConnection === false && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="text-sm text-amber-700 font-medium mb-1">
                    Slack連携が必要です
                  </div>
                  <div className="text-sm text-amber-600 mb-2">
                    Slack連携を行うとメッセージを自動取得できます
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open('/settings', '_blank')}
                  >
                    <Link className="w-4 h-4 mr-1" />
                    Slack連携（設定画面を開く）
                  </Button>
                </div>
              )}
            </div>
          )}
          {slackError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-700 font-medium mb-1">エラー:</div>
              <div className="text-sm text-red-600">{slackError}</div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={fetchSlackMessage}
                disabled={isLoadingSlack}
                className="mt-2"
              >
                再試行
              </Button>
            </div>
          )}
          {slackData && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-700 font-medium mb-1">
                Slackメッセージ: {slackData.workspace && `(${slackData.workspace})`}
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{slackData.text}</div>
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
        <label className="block text-sm font-medium text-gray-700 mb-3">
          緊急度
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleUrgencyChange('today')}
            className={`px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm ${
              urgency === 'today'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50'
            }`}
          >
            ⏰ 今日中
          </button>
          <button
            type="button"
            onClick={() => handleUrgencyChange('tomorrow')}
            className={`px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm ${
              urgency === 'tomorrow'
                ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-yellow-300 hover:bg-yellow-50'
            }`}
          >
            📅 明日
          </button>
          <button
            type="button"
            onClick={() => handleUrgencyChange('later')}
            className={`px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm ${
              urgency === 'later'
                ? 'border-gray-500 bg-gray-50 text-gray-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            📋 それより後
          </button>
        </div>
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
