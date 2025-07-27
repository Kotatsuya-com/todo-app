'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase'
import { UserSlackWebhook } from '@/types'
import { Copy, ExternalLink, Trash2, Plus, CheckCircle, AlertCircle } from 'lucide-react'

interface SlackConnection {
  id: string
  workspace_name: string
  team_name: string
}

interface WebhookWithConnection extends UserSlackWebhook {
  slack_connections: SlackConnection
}

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookWithConnection[]>([])
  const [slackConnections, setSlackConnections] = useState<SlackConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const supabase = createClient()
      // Slack接続を取得
      const { data: connections, error: connectionsError } = await supabase
        .from('slack_connections')
        .select('id, workspace_name, team_name')
        .order('created_at', { ascending: false })

      if (connectionsError) {
        console.error('Failed to fetch connections:', connectionsError)
        setMessage('Slack接続の取得に失敗しました')
        return
      }

      setSlackConnections(connections || [])

      // Webhookを取得
      const { data: webhookData, error: webhookError } = await fetch('/api/slack/webhook')
        .then(res => res.json())

      if (webhookError || !webhookData) {
        console.error('Failed to fetch webhooks:', webhookError)
        setMessage('Webhookの取得に失敗しました')
        return
      }

      setWebhooks(webhookData.webhooks || [])

    } catch (error) {
      console.error('Data fetch error:', error)
      setMessage('データの取得中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const createWebhook = async (slackConnectionId: string) => {
    setCreating(true)
    setMessage('')

    try {
      const response = await fetch('/api/slack/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slack_connection_id: slackConnectionId })
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.error || 'Webhookの作成に失敗しました')
        return
      }

      setMessage(data.message || 'Webhook作成成功')
      await fetchData() // データを再取得

    } catch (error) {
      console.error('Create webhook error:', error)
      setMessage('Webhookの作成中にエラーが発生しました')
    } finally {
      setCreating(false)
    }
  }

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('このWebhookを無効化しますか？')) {
      return
    }

    try {
      const response = await fetch(`/api/slack/webhook?id=${webhookId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.error || 'Webhookの削除に失敗しました')
        return
      }

      setMessage('Webhook無効化成功')
      await fetchData()

    } catch (error) {
      console.error('Delete webhook error:', error)
      setMessage('Webhookの削除中にエラーが発生しました')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setMessage('URLをクリップボードにコピーしました')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Copy failed:', error)
      setMessage('コピーに失敗しました')
    }
  }

  const formatLastEventAt = (dateString?: string) => {
    if (!dateString) {
      return '未受信'
    }
    return new Date(dateString).toLocaleString('ja-JP')
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">🎯 絵文字リアクション連携</h2>
          <p className="text-sm text-gray-600 mt-1">
            Slackで絵文字リアクションするとタスクが自動作成されます
          </p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.includes('成功') || message.includes('コピー')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {slackConnections.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 mb-4">
            まずSlackワークスペースに接続してください
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 接続されたワークスペース一覧 */}
          <div className="space-y-4">
            {slackConnections.map(connection => {
              const webhook = webhooks.find(w => w.slack_connection_id === connection.id)
              return (
                <div key={connection.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{connection.workspace_name}</h3>
                      <p className="text-sm text-gray-500">{connection.team_name}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {webhook?.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          有効
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          無効
                        </span>
                      )}
                    </div>
                  </div>

                  {webhook?.is_active ? (
                    <div className="space-y-3">
                      {/* Webhook URL */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Webhook URL
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={`${window.location.origin}/api/slack/events/user/${webhook.webhook_id}`}
                            readOnly
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 font-mono"
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => copyToClipboard(`${window.location.origin}/api/slack/events/user/${webhook.webhook_id}`)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* 統計情報 */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">イベント数:</span>
                          <span className="ml-2 font-medium">{webhook.event_count}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">最終受信:</span>
                          <span className="ml-2 font-medium">{formatLastEventAt(webhook.last_event_at)}</span>
                        </div>
                      </div>

                      {/* アクション */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open('https://api.slack.com/apps', '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Slack設定画面
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => deleteWebhook(webhook.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          無効化
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Button
                        onClick={() => createWebhook(connection.id)}
                        disabled={creating}
                        className="inline-flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {creating ? '設定中...' : '絵文字リアクション連携を有効化'}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 設定ガイド */}
          <div className="border border-blue-200 rounded-lg bg-blue-50 p-4">
            <h3 className="font-medium text-blue-900 mb-2">📋 Slackアプリ設定手順</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>上記のWebhook URLをコピー</li>
              <li>「Slack設定画面」ボタンからSlack APIページを開く</li>
              <li>あなたのアプリを選択</li>
              <li>「Event Subscriptions」→「Enable Events」をON</li>
              <li>「Request URL」に上記URLを貼り付けて検証</li>
              <li>「Subscribe to bot events」で「reaction_added」を追加</li>
              <li>「Save Changes」で保存</li>
            </ol>
          </div>

          {/* 対応絵文字一覧 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">🎯 対応絵文字と緊急度</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                <span>📝 :memo:</span>
                <span className="font-medium text-red-600">今日中</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                <span>📋 :clipboard:</span>
                <span className="font-medium text-red-600">今日中</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                <span>✏️ :pencil:</span>
                <span className="font-medium text-yellow-600">明日</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                <span>🗒️ :spiral_note_pad:</span>
                <span className="font-medium text-yellow-600">明日</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>📄 :page_with_curl:</span>
                <span className="font-medium text-gray-600">それより後</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
