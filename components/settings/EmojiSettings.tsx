'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { RotateCcw, Save } from 'lucide-react'

interface EmojiOption {
  name: string
  display: string
  label: string
}

interface EmojiSettingsType {
  today_emoji: string
  tomorrow_emoji: string
  later_emoji: string
}

export function EmojiSettings() {
  const [settings, setSettings] = useState<EmojiSettingsType>({
    today_emoji: 'fire',
    tomorrow_emoji: 'calendar',
    later_emoji: 'memo'
  })
  const [availableEmojis, setAvailableEmojis] = useState<EmojiOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/user/emoji-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        setAvailableEmojis(data.availableEmojis)
      } else {
        setMessage('設定の取得に失敗しました')
      }
    } catch (error) {
      setMessage('設定の取得中にエラーが発生しました')
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/user/emoji-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        setMessage('設定を保存しました')
      } else {
        const errorData = await response.json()
        setMessage(errorData.error || '保存に失敗しました')
      }
    } catch (error) {
      setMessage('保存中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('絵文字設定をデフォルトにリセットしますか？')) {
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/user/emoji-settings', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        setMessage('設定をデフォルトにリセットしました')
      } else {
        setMessage('リセットに失敗しました')
      }
    } catch (error) {
      setMessage('リセット中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const getEmojiDisplay = (emojiName: string) => {
    const emoji = availableEmojis.find(e => e.name === emojiName)
    return emoji ? emoji.display : emojiName
  }

  const urgencyOptions = [
    {
      key: 'today_emoji' as keyof EmojiSettingsType,
      label: '今日中',
      description: '🔥 緊急かつ重要なタスク',
      color: 'border-red-200 bg-red-50'
    },
    {
      key: 'tomorrow_emoji' as keyof EmojiSettingsType,
      label: '明日',
      description: '📅 重要だが緊急ではないタスク',
      color: 'border-blue-200 bg-blue-50'
    },
    {
      key: 'later_emoji' as keyof EmojiSettingsType,
      label: 'それより後',
      description: '📝 後回しにできるタスク',
      color: 'border-gray-200 bg-gray-50'
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">絵文字リアクション設定</h2>
        <Button
          onClick={handleReset}
          disabled={isLoading}
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-gray-600"
        >
          <RotateCcw className="w-4 h-4" />
          デフォルトに戻す
        </Button>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Slackでリアクションした時にタスクを作成する絵文字を設定できます
      </p>

      <div className="space-y-4 mb-6">
        {urgencyOptions.map((option) => (
          <div key={option.key} className={`rounded-lg border-2 p-4 ${option.color}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-medium text-gray-900">{option.label}</h3>
                <p className="text-sm text-gray-600">{option.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getEmojiDisplay(settings[option.key])}</span>
                <select
                  value={settings[option.key]}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    [option.key]: e.target.value
                  }))}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableEmojis.map((emoji) => (
                    <option key={emoji.name} value={emoji.name}>
                      {emoji.display} {emoji.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div>
          {message && (
            <p className={`text-sm ${message.includes('エラー') || message.includes('失敗') ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </p>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isLoading ? '保存中...' : '設定を保存'}
        </Button>
      </div>
    </div>
  )
}
