'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTodoStore } from '@/store/todoStore'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase'
import { AuthForm } from '@/components/auth/AuthForm'
import { Trash2, ExternalLink } from 'lucide-react'
import { WebhookManager } from '@/components/slack/WebhookManager'

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

  // Slack認証完了処理（ngrok環境対応）
  useEffect(() => {
    console.log('Settings page useEffect triggered', {
      hasUser: !!user,
      currentUrl: window.location.href
    })

    const urlParams = new URLSearchParams(window.location.search)
    const slackAuthRequired = urlParams.get('slack_auth_required')
    const slackCode = urlParams.get('slack_code')

    console.log('URL parameters check:', {
      slackAuthRequired,
      hasSlackCode: !!slackCode,
      slackCodeLength: slackCode?.length
    })

    const processSlackAuth = async (code: string) => {
      try {
        setMessage('Slack接続を処理しています...')

        console.log('Authentication debug:', {
          hasUser: !!user,
          userId: user?.id,
          currentOrigin: window.location.origin
        })

        const response = await fetch('/api/slack/auth-process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        })

        if (response.ok) {
          setMessage('Slack接続が完了しました')
          await fetchSlackConnections()
          // URLパラメータをクリア
          window.history.replaceState({}, '', '/settings')
        } else {
          const errorData = await response.json()
          setMessage(errorData.error || 'Slack接続に失敗しました')
        }
      } catch (error) {
        console.error('Slack auth processing error:', error)
        setMessage('Slack接続の処理中にエラーが発生しました')
      }
    }

    if (slackAuthRequired && slackCode && user) {
      console.log('Processing Slack auth for authenticated user:', { slackCode: slackCode.substring(0, 20) + '...' })
      processSlackAuth(slackCode)
    }
  }, [user, fetchSlackConnections])

  const handleSlackConnect = async () => {
    const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID
    // 動的なngrok URLまたは現在のオリジンを取得
    let baseUrl = window.location.origin
    // 開発環境の場合、ngrok URLを取得
    try {
      const response = await fetch('/api/app-url')
      if (response.ok) {
        const data = await response.json()
        if (data.appUrl) {
          baseUrl = data.appUrl
        }
      }
    } catch (error) {
      console.warn('Failed to get app URL, using current origin:', error)
    }
    const redirectUri = `${baseUrl}/api/slack/auth`
    const userScope = 'channels:history,groups:history,im:history,mpim:history'
    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&user_scope=${userScope}&redirect_uri=${encodeURIComponent(redirectUri)}`

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-gray-600">
                Slackワークスペースに接続すると、Slackメッセージからタスクを作成できます
              </p>
              <Button
                onClick={handleSlackConnect}
                variant="secondary"
                className="flex items-center gap-2 whitespace-nowrap flex-shrink-0"
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

      {/* Webhookマネージャー */}
      <WebhookManager />
    </div>
  )
}
