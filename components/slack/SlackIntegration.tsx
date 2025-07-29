'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase'
import { ExternalLink, CheckCircle, AlertTriangle, Loader2, Trash2, Copy } from 'lucide-react'
import { authLogger } from '@/lib/client-logger'

interface SlackConnection {
  id: string
  workspace_id: string
  workspace_name: string
  team_name: string
  created_at: string
}

interface SlackWebhook {
  id: string
  webhook_id: string
  is_active: boolean
  event_count: number
  last_event_at?: string
}

type IntegrationState = 'not_connected' | 'connecting' | 'connected' | 'configuring' | 'fully_integrated'

interface IntegrationStatus {
  state: IntegrationState
  connection?: SlackConnection
  userId?: string
  webhook?: SlackWebhook
  error?: string
}

export function SlackIntegration() {
  const [status, setStatus] = useState<IntegrationStatus>({ state: 'not_connected' })
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')

  const fetchIntegrationStatus = useCallback(async () => {
    try {
      setLoading(true)

      // Slack接続を取得
      const connectionsResponse = await fetch('/api/slack/connections')
      const connectionsData = await connectionsResponse.json()
      const connections = connectionsData.connections || []

      if (connections.length === 0) {
        setStatus({ state: 'not_connected' })
        return
      }

      const connection = connections[0] // 最初の接続を使用

      // User IDを取得
      const supabase = createClient()
      const { data: userData } = await supabase
        .from('users')
        .select('slack_user_id')
        .single()

      const userId = userData?.slack_user_id

      // Webhookを取得
      const webhookResponse = await fetch('/api/slack/webhook')
      const webhookData = await webhookResponse.json()
      const webhooks = webhookData.webhooks || []
      const webhook = webhooks.find((w: any) => w.slack_connection_id === connection.id)

      // 状態を判定
      let state: IntegrationState = 'connected'
      if (userId && webhook?.is_active) {
        state = 'fully_integrated'
      } else if (userId) {
        state = 'configuring'
      }

      setStatus({
        state,
        connection,
        userId,
        webhook: webhook?.is_active ? webhook : undefined
      })

    } catch (error) {
      authLogger.error({ error }, 'Failed to fetch integration status')
      setStatus({
        state: 'not_connected',
        error: 'データの取得に失敗しました'
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIntegrationStatus()
  }, [fetchIntegrationStatus])

  const handleConnect = async () => {
    setProcessing(true)
    setMessage('')

    try {
      const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID

      // 動的なngrok URLまたは現在のオリジンを取得
      let baseUrl = window.location.origin
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
      const userScope = 'channels:history,groups:history,im:history,mpim:history,users:read'
      const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&user_scope=${userScope}&redirect_uri=${encodeURIComponent(redirectUri)}`

      // 状態を更新
      setStatus(prev => ({ ...prev, state: 'connecting' }))

      // Slack認証画面にリダイレクト
      window.location.href = slackAuthUrl

    } catch (error) {
      authLogger.error({ error }, 'Failed to initiate Slack connection')
      setMessage('Slack連携の開始に失敗しました')
      setProcessing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Slack連携を完全に解除しますか？\n・OAuth接続\n・ユーザーID\n・Webhook設定\nすべてが削除されます。')) {
      return
    }

    setProcessing(true)
    setMessage('')

    try {
      // 統合削除APIを呼び出し
      const response = await fetch('/api/slack/integration/disconnect', {
        method: 'DELETE'
      })

      if (response.ok) {
        setMessage('Slack連携を完全に解除しました')
        await fetchIntegrationStatus()
      } else {
        const errorData = await response.json()
        setMessage(errorData.error || '連携解除に失敗しました')
      }

    } catch (error) {
      authLogger.error({ error }, 'Failed to disconnect integration')
      setMessage('連携解除中にエラーが発生しました')
    } finally {
      setProcessing(false)
    }
  }

  const copyWebhookUrl = async () => {
    if (!status.webhook) {
      return
    }

    const webhookUrl = `${window.location.origin}/api/slack/events/user/${status.webhook.webhook_id}`

    try {
      await navigator.clipboard.writeText(webhookUrl)
      setMessage('Webhook URLをクリップボードにコピーしました')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('コピーに失敗しました')
    }
  }

  const renderProgress = () => {
    const steps = [
      { key: 'connection', label: 'Slack連携', completed: status.state !== 'not_connected' },
      { key: 'user_id', label: 'ユーザーID取得', completed: !!status.userId },
      { key: 'webhook', label: 'Webhook設定', completed: !!status.webhook }
    ]

    return (
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center space-x-3">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
              step.completed
                ? 'bg-green-100 text-green-600'
                : status.state === 'connecting' && index === 0
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-400'
            }`}>
              {step.completed ? (
                <CheckCircle className="w-4 h-4" />
              ) : status.state === 'connecting' && index === 0 ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="text-xs font-medium">{index + 1}</span>
              )}
            </div>
            <span className={`text-sm ${
              step.completed ? 'text-green-700 font-medium' : 'text-gray-600'
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">🚀 Slack連携</h2>
        <p className="text-sm text-gray-600">
          Slackワークスペースに接続して、メッセージからのタスク作成と絵文字リアクション連携を有効化
        </p>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.includes('成功') || message.includes('完了') || message.includes('コピー')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {status.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
            <span className="text-sm text-red-700">{status.error}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* プログレス表示 */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">設定進行状況</h3>
          {renderProgress()}
        </div>

        {/* メインアクション */}
        {status.state === 'not_connected' && (
          <div className="text-center py-6">
            <p className="text-gray-600 mb-4">
              Slackワークスペースに接続して連携を開始
            </p>
            <Button
              onClick={handleConnect}
              disabled={processing}
              className="inline-flex items-center"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  接続中...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Slackに接続
                </>
              )}
            </Button>
          </div>
        )}

        {status.state === 'connecting' && (
          <div className="text-center py-6">
            <Loader2 className="w-8 h-8 mx-auto text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">Slack認証を処理中...</p>
          </div>
        )}

        {(status.state === 'connected' || status.state === 'configuring' || status.state === 'fully_integrated') && status.connection && (
          <div className="space-y-4">
            {/* 接続情報 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-green-900">{status.connection.workspace_name}</h3>
                  <p className="text-sm text-green-700">
                    接続日: {new Date(status.connection.created_at).toLocaleDateString('ja-JP')}
                  </p>
                  {status.userId && (
                    <p className="text-xs text-green-600 mt-1 font-mono">
                      User ID: {status.userId}
                    </p>
                  )}
                </div>
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>

            {/* Webhook情報 */}
            {status.webhook && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-3">🎯 絵文字リアクション連携</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">
                      Webhook URL
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={`${window.location.origin}/api/slack/events/user/${status.webhook.webhook_id}`}
                        readOnly
                        className="flex-1 px-2 py-1 text-xs border border-blue-300 rounded bg-white font-mono"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={copyWebhookUrl}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-blue-600">イベント数:</span>
                      <span className="ml-1 font-medium">{status.webhook.event_count}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">最終受信:</span>
                      <span className="ml-1 font-medium">
                        {status.webhook.last_event_at
                          ? new Date(status.webhook.last_event_at).toLocaleDateString('ja-JP')
                          : '未受信'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* アクション */}
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                onClick={() => window.open('https://api.slack.com/apps', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Slack設定画面
              </Button>

              <Button
                variant="secondary"
                onClick={handleDisconnect}
                disabled={processing}
                className="text-red-600 hover:text-red-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    解除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    連携解除
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* 設定ガイド（連携完了後のみ表示） */}
        {status.state === 'fully_integrated' && (
          <div className="border border-blue-200 rounded-lg bg-blue-50 p-4">
            <h3 className="font-medium text-blue-900 mb-2">📋 Slackアプリ設定手順</h3>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              <li>上記のWebhook URLをコピー</li>
              <li>「Slack設定画面」ボタンからSlack APIページを開く</li>
              <li>あなたのアプリを選択</li>
              <li>「Event Subscriptions」→「Enable Events」をON</li>
              <li>「Request URL」に上記URLを貼り付けて検証</li>
              <li>「Subscribe to bot events」で「reaction_added」を追加</li>
              <li>「Save Changes」で保存</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
