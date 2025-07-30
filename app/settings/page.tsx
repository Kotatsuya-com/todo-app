'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTodoStore } from '@/store/todoStore'
import { AuthForm } from '@/components/auth/AuthForm'
import { SlackIntegration } from '@/components/slack/SlackIntegration'
import { EmojiSettings } from '@/components/settings/EmojiSettings'
import { NotificationSettings } from '@/components/settings/NotificationSettings'
import { authLogger } from '@/lib/client-logger'

export default function SettingsPage() {
  const { user } = useTodoStore()
  const [hasSlackConnection, setHasSlackConnection] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkSlackConnection = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/slack/connections')
      if (response.ok) {
        const data = await response.json()
        setHasSlackConnection((data.connections || []).length > 0)
      }
    } catch (error) {
      authLogger.error({ error }, 'Error checking Slack connections')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    checkSlackConnection()
  }, [checkSlackConnection])

  // Slack認証完了処理（ngrok環境対応）
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const slackAuthRequired = urlParams.get('slack_auth_required')
    const slackCode = urlParams.get('slack_code')

    if (slackAuthRequired && slackCode && user) {
      // OAuth処理完了後に接続状態を再チェック
      const timer = setTimeout(() => {
        checkSlackConnection()
        // URLパラメータをクリア
        window.history.replaceState({}, '', '/settings')
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [user, checkSlackConnection])


  if (!user) {
    return <AuthForm />
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">🐱 設定</h1>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-10 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">🐱 設定</h1>

      <div className="space-y-6">
        {/* 統合されたSlack連携 */}
        <SlackIntegration />

        {/* 絵文字設定は連携後のみ表示 */}
        {hasSlackConnection && <EmojiSettings />}

        {/* 通知設定 */}
        <NotificationSettings />
      </div>
    </div>
  )
}
