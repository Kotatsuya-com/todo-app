/**
 * Compare Page with Clean Architecture
 * Clean Architectureパターンに従った比較ページ
 */

'use client'

import React from 'react'
import { useCompare } from '../hooks/useCompare'
import { useRouter } from 'next/navigation'
// import { AuthForm } from '@/components/auth/AuthForm'
import { TodoCard } from '@/components/todo/TodoCard'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, ArrowRight, SkipForward, CheckCircle } from 'lucide-react'

export default function ComparePage() {
  const {
    currentPair,
    comparisonCount,
    remainingPairs,
    loading,
    error,
    handleChoice,
    handleSkip,
    isComplete
  } = useCompare()

  const router = useRouter()

  // Navigate back to dashboard
  const handleFinish = () => {
    router.push('/')
  }

  // 未認証の場合はリダイレクト（useCompareフック内でuseAuthを使用）
  // ここでは単純にnullを返す
  if (!currentPair && !isComplete && remainingPairs.length === 0 && comparisonCount === 0) {
    return null
  }

  /**
   * エラー表示
   */
  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">エラーが発生しました</h3>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
        <Button onClick={handleFinish} className="mt-4">
          ダッシュボードに戻る
        </Button>
      </div>
    )
  }

  /**
   * 比較完了画面
   */
  if (isComplete) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">
          {comparisonCount > 0 ? '比較完了！' : '比較するタスクがありません'}
        </h2>
        {comparisonCount > 0 && (
          <p className="text-gray-600 mb-6">
            {comparisonCount}回の比較を行いました。重要度スコアが更新されました。
          </p>
        )}
        <Button onClick={handleFinish}>
          ダッシュボードに戻る
        </Button>
      </div>
    )
  }

  /**
   * ローディング表示
   */
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">🐱 ジャッジ</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  /**
   * 比較画面
   */
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">🐱 ジャッジ</h2>
        <p className="text-gray-600">
          より重要だと思うタスクを選択してください
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {comparisonCount}回比較済み / 残り{remainingPairs.length}ペア
        </p>
      </div>

      {currentPair && (
        <>
          <div className="grid grid-cols-2 gap-8 mb-8 max-sm:grid-cols-1">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-2">タスクA</h3>
              </div>
              <TodoCard
                todo={{
                  id: currentPair.left.id,
                  title: currentPair.left.title || undefined,
                  body: currentPair.left.body,
                  urgency: currentPair.left.deadline ? 'today' : 'later',
                  deadline: currentPair.left.deadline || undefined,
                  importance_score: currentPair.left.importanceScore,
                  status: currentPair.left.status === 'done' ? 'done' : 'open',
                  created_at: currentPair.left.createdAt,
                  user_id: currentPair.left.userId,
                  created_via: currentPair.left.createdVia === 'slack_url' ? 'slack_webhook' : currentPair.left.createdVia as any
                }}
              />
              <Button
                variant="primary"
                size="lg"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => handleChoice(currentPair.left, currentPair.right)}
                disabled={loading}
              >
                <ArrowLeft className="w-5 h-5" />
                Aが重要
              </Button>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-2">タスクB</h3>
              </div>
              <TodoCard
                todo={{
                  id: currentPair.right.id,
                  title: currentPair.right.title || undefined,
                  body: currentPair.right.body,
                  urgency: currentPair.right.deadline ? 'today' : 'later',
                  deadline: currentPair.right.deadline || undefined,
                  importance_score: currentPair.right.importanceScore,
                  status: currentPair.right.status === 'done' ? 'done' : 'open',
                  created_at: currentPair.right.createdAt,
                  user_id: currentPair.right.userId,
                  created_via: currentPair.right.createdVia === 'slack_url' ? 'slack_webhook' : currentPair.right.createdVia as any
                }}
              />
              <Button
                variant="primary"
                size="lg"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => handleChoice(currentPair.right, currentPair.left)}
                disabled={loading}
              >
                Bが重要
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button
              variant="secondary"
              onClick={handleSkip}
              className="flex items-center gap-2"
              disabled={loading}
            >
              <SkipForward className="w-4 h-4" />
              スキップ
            </Button>
            <Button
              variant="secondary"
              onClick={handleFinish}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              ここで終了
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
