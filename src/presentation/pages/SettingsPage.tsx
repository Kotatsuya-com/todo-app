/**
 * Settings Page with Clean Architecture
 * Clean Architectureパターンに従った設定ページ
 */

'use client'

import React from 'react'
import { useSettings } from '../hooks/useSettings'
import { AuthForm } from '@/components/auth/AuthForm'
import { SlackIntegration } from '@/components/slack/SlackIntegration'
import { EmojiSettings } from '@/components/settings/EmojiSettings'
import { NotificationSettings } from '@/components/settings/NotificationSettings'

export default function SettingsPage() {
  const {
    user,
    hasSlackConnection,
    loading,
    error
  } = useSettings()

  // 未認証の場合はログインフォームを表示
  if (!user) {
    return <AuthForm />
  }

  // ローディング表示
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

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-red-800 font-medium">エラーが発生しました</h3>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

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
