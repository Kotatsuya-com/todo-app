'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTodoStore } from '@/store/todoStore'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase'
import { AuthForm } from '@/components/auth/AuthForm'
import { Trash2, ExternalLink, UserCheck } from 'lucide-react'
import { WebhookManager } from '@/components/slack/WebhookManager'
import { EmojiSettings } from '@/components/settings/EmojiSettings'
import { authLogger } from '@/lib/client-logger'

interface SlackConnection {
  id: string
  workspace_id: string
  workspace_name: string
  team_name: string
  created_at: string
}

export default function SettingsPage() {
  const { user } = useTodoStore()
  const [slackConnections, setSlackConnections] = useState<SlackConnection[]>([])
  const [slackUserId, setSlackUserId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [fetchingUserId, setFetchingUserId] = useState<string | null>(null)


  const fetchSlackConnections = useCallback(async () => {
    try {
      const response = await fetch('/api/slack/connections')
      if (response.ok) {
        const data = await response.json()
        setSlackConnections(data.connections || [])
      }
    } catch (error) {
      authLogger.error({ error }, 'Error fetching Slack connections')
    }
  }, [])

  const fetchUserSlackId = useCallback(async () => {
    if (!user) {
      return
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('slack_user_id')
        .eq('id', user.id)
        .single()

      if (!error && data?.slack_user_id) {
        setSlackUserId(data.slack_user_id)
      }
    } catch (error) {
      authLogger.error({ error }, 'Error fetching user Slack ID')
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchSlackConnections()
      fetchUserSlackId()
    }
  }, [user, fetchSlackConnections, fetchUserSlackId])

  // Slack認証完了処理（ngrok環境対応）
  useEffect(() => {
    const logger = authLogger.child({ hasUser: !!user })
    logger.debug({ currentUrl: window.location.href }, 'Settings page useEffect triggered')

    const urlParams = new URLSearchParams(window.location.search)
    const slackAuthRequired = urlParams.get('slack_auth_required')
    const slackCode = urlParams.get('slack_code')

    logger.debug({
      slackAuthRequired,
      hasSlackCode: !!slackCode,
      slackCodeLength: slackCode?.length
    }, 'URL parameters check')

    const processSlackAuth = async (code: string) => {
      try {
        setMessage('Slack接続を処理しています...')

        logger.debug({
          userId: user?.id,
          currentOrigin: window.location.origin
        }, 'Authentication debug')

        const response = await fetch('/api/slack/auth-process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        })

        if (response.ok) {
          setMessage('Slack接続が完了しました')
          await fetchSlackConnections()
          await fetchUserSlackId()  // Slack User IDも再取得
          // URLパラメータをクリア
          window.history.replaceState({}, '', '/settings')
        } else {
          const errorData = await response.json()
          setMessage(errorData.error || 'Slack接続に失敗しました')
        }
      } catch (error) {
        logger.error({ error }, 'Slack auth processing error')
        setMessage('Slack接続の処理中にエラーが発生しました')
      }
    }

    if (slackAuthRequired && slackCode && user) {
      logger.info({ slackCodePreview: slackCode.substring(0, 20) + '...' }, 'Processing Slack auth for authenticated user')
      processSlackAuth(slackCode)
    }
  }, [user, fetchSlackConnections, fetchUserSlackId])

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
      authLogger.warn({ error }, 'Failed to get app URL, using current origin')
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

  const handleFetchUserId = async (connectionId: string) => {
    setFetchingUserId(connectionId)
    setMessage('')

    try {
      const response = await fetch('/api/slack/fetch-user-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId })
      })

      if (response.ok) {
        const data = await response.json()
        setSlackUserId(data.slackUserId)
        setMessage(`Slack User ID (${data.slackUserId}) を取得しました`)
      } else {
        const errorData = await response.json()
        setMessage(errorData.error || 'Slack User IDの取得に失敗しました')
      }
    } catch (error) {
      setMessage('Slack User IDの取得中にエラーが発生しました')
    } finally {
      setFetchingUserId(null)
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
                    <div className="flex items-center gap-2">
                      {!slackUserId && (
                        <Button
                          onClick={() => handleFetchUserId(connection.id)}
                          variant="secondary"
                          size="sm"
                          disabled={fetchingUserId === connection.id}
                          className="flex items-center gap-1"
                        >
                          <UserCheck className="w-4 h-4" />
                          {fetchingUserId === connection.id ? '取得中...' : 'User ID取得'}
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDeleteConnection(connection.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Slack User ID表示 */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Slack User ID</h3>
          {slackUserId ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm text-gray-900">{slackUserId}</div>
                  <div className="text-xs text-green-600 mt-1">
                    このIDを持つユーザーのリアクションのみタスクを作成します
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm text-yellow-800 font-medium mb-1">Slack User IDが未設定です</div>
              <div className="text-xs text-yellow-700">
                絵文字リアクションでのタスク作成を使用するには、Slack User IDが必要です。
                上記の「User ID取得」ボタンで設定してください。
              </div>
            </div>
          )}
        </div>

        {message && (
          <div className="pt-4 border-t border-gray-200">
            <p className={`text-sm ${message.includes('エラー') ? 'text-red-600' : 'text-green-600'}`}>
              {message}
            </p>
          </div>
        )}
      </div>

      {/* 絵文字リアクション設定 */}
      <EmojiSettings />

      {/* Webhookマネージャー */}
      <WebhookManager />
    </div>
  )
}
