'use client'

import { useState, useEffect } from 'react'
import { useTodoStore } from '@/store/todoStore'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase'
import { AuthForm } from '@/components/auth/AuthForm'

export default function SettingsPage() {
  const { user } = useTodoStore()
  const [slackUserId, setSlackUserId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) {
      fetchUserSettings()
    }
  }, [user])

  const fetchUserSettings = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('slack_user_id')
        .eq('id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data?.slack_user_id) {
        setSlackUserId(data.slack_user_id)
      }
    } catch (error) {
      console.error('Error fetching user settings:', error)
    }
  }

  const handleSaveSettings = async () => {
    if (!user) return

    setIsLoading(true)
    setMessage('')

    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          slack_user_id: slackUserId.trim() || null,
          display_name: user.email,
        })

      if (error) {
        throw error
      }

      setMessage('設定を保存しました')
    } catch (error: any) {
      setMessage(`エラー: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return <AuthForm />
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Slack連携</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slack User ID
              </label>
              <input
                type="text"
                value={slackUserId}
                onChange={(e) => setSlackUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="U1234567890"
              />
              <p className="text-sm text-gray-500 mt-1">
                SlackのUser IDを設定すると、絵文字リアクションでタスクが自動作成されます
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Slack User IDの確認方法</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Slackで自分のプロフィールを開く</li>
                <li>2. 「その他」→「メンバーIDをコピー」をクリック</li>
                <li>3. コピーされたIDを上記フィールドに入力</li>
              </ol>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">対応絵文字</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                <div>📝 :memo: → 今日中</div>
                <div>📋 :clipboard: → 今日中</div>
                <div>✏️ :pencil: → 明日</div>
                <div>🗒️ :spiral_note_pad: → それより後</div>
                <div>📄 :page_with_curl: → それより後</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div>
            {message && (
              <p className={`text-sm ${message.includes('エラー') ? 'text-red-600' : 'text-green-600'}`}>
                {message}
              </p>
            )}
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            {isLoading ? '保存中...' : '設定を保存'}
          </Button>
        </div>
      </div>
    </div>
  )
}