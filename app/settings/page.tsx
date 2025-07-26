'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTodoStore } from '@/store/todoStore'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase'
import { AuthForm } from '@/components/auth/AuthForm'
import { Trash2, ExternalLink } from 'lucide-react'

interface SlackConnection {
  id: string
  workspace_id: string
  workspace_name: string
  team_name: string
  created_at: string
}

export default function SettingsPage() {
  const { user } = useTodoStore()
  const [slackUserId, setSlackUserId] = useState('')
  const [slackConnections, setSlackConnections] = useState<SlackConnection[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const fetchUserSettings = useCallback(async () => {
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
  }, [user?.id])

  const fetchSlackConnections = useCallback(async () => {
    try {
      const response = await fetch('/api/slack/connections')
      if (response.ok) {
        const data = await response.json()
        setSlackConnections(data.connections || [])
      }
    } catch (error) {
      console.error('Error fetching Slack connections:', error)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchUserSettings()
      fetchSlackConnections()
    }
  }, [user, fetchUserSettings, fetchSlackConnections])

  const handleSlackConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID
    const redirectUri = `${window.location.origin}/api/slack/auth`
    const scope = 'channels:history,groups:history,im:history,mpim:history,users:read,conversations:read,usergroups:read'
    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}`

    window.location.href = slackAuthUrl
  }

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm('このSlack接続を削除しますか？')) {
      return
    }

    try {
      const response = await fetch('/api/slack/connections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId })
      })

      if (response.ok) {
        setSlackConnections(prev => prev.filter(conn => conn.id !== connectionId))
        setMessage('Slack接続を削除しました')
      } else {
        setMessage('削除に失敗しました')
      }
    } catch (error) {
      setMessage('削除中にエラーが発生しました')
    }
  }

  const handleSaveSettings = async () => {
    if (!user) {return}

    setIsLoading(true)
    setMessage('')

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          slack_user_id: slackUserId.trim() || null,
          display_name: user.display_name
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">🐱 設定</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Slackワークスペース接続 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Slackワークスペース接続</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Slackワークスペースに接続すると、Slackメッセージからタスクを作成できます
              </p>
              <Button
                onClick={handleSlackConnect}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Slackに接続
              </Button>
            </div>

            {slackConnections.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">接続済みワークスペース</h3>
                {slackConnections.map((connection) => (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{connection.workspace_name}</div>
                      <div className="text-sm text-gray-500">
                        接続日: {new Date(connection.created_at).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDeleteConnection(connection.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 絵文字リアクション設定 */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">絵文字リアクション設定</h2>

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
