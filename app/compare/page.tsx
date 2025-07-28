'use client'

import { useState, useEffect } from 'react'
import { useTodoStore } from '@/store/todoStore'
import { Todo, ComparisonPair } from '@/types'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, ArrowRight, SkipForward, CheckCircle } from 'lucide-react'
import { TodoCard } from '@/components/todo/TodoCard'
import { useRouter } from 'next/navigation'
import { uiLogger } from '@/lib/client-logger'

export default function ComparePage() {
  const { user, todos, createComparison, fetchTodos } = useTodoStore()
  const [currentPair, setCurrentPair] = useState<ComparisonPair | null>(null)
  const [comparisonCount, setComparisonCount] = useState(0)
  const [remainingPairs, setRemainingPairs] = useState<ComparisonPair[]>([])
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    fetchTodos()
  }, [user, fetchTodos, router])

  useEffect(() => {
    // アクティブなTODOのみを対象に効率的な比較ペアを生成
    const activeTodos = todos.filter(todo => todo.status === 'open')

    if (activeTodos.length <= 1) {
      setRemainingPairs([])
      setCurrentPair(null)
      return
    }

    // 効率的比較アルゴリズム: アダプティブ・トーナメント方式
    const pairs = generateEfficiComparisonPairs(activeTodos)
    setRemainingPairs(pairs)

    if (pairs.length > 0) {
      setCurrentPair(pairs[0])
    }
  }, [todos])

  // 効率的な比較ペア生成アルゴリズム
  const generateEfficiComparisonPairs = (todos: Todo[]): ComparisonPair[] => {
    const pairs: ComparisonPair[] = []
    const n = todos.length

    uiLogger.debug({ todoCount: n }, 'Generating efficient pairs for comparison')

    // 1. タスクが少ない場合（≤5）: 全ペア比較
    if (n <= 5) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          pairs.push({ left: todos[i], right: todos[j] })
        }
      }
      uiLogger.debug({ pairCount: pairs.length }, 'Small set: using all pairs')
      return pairs.sort(() => Math.random() - 0.5)
    }

    // 2. タスクが多い場合（>5）: 階層的トーナメント + 重要度ベース選択

    // Phase 1: 重要度スコアでソートして上位候補を特定
    const sortedByImportance = [...todos].sort((a, b) => b.importance_score - a.importance_score)
    const topCandidates = sortedByImportance.slice(0, Math.min(8, Math.ceil(n * 0.4)))
    const remainingTodos = sortedByImportance.slice(topCandidates.length)

    uiLogger.debug({
      topCandidateCount: topCandidates.length,
      remainingCount: remainingTodos.length
    }, 'Split todos into top candidates and remaining')

    // Phase 2: 上位候補内での精密比較（全ペア）
    for (let i = 0; i < topCandidates.length; i++) {
      for (let j = i + 1; j < topCandidates.length; j++) {
        pairs.push({ left: topCandidates[i], right: topCandidates[j] })
      }
    }

    // Phase 3: 各上位候補 vs ランダムな下位タスク（2-3個ずつ）
    const samplesPerCandidate = Math.min(3, Math.max(1, Math.floor(remainingTodos.length / topCandidates.length)))
    topCandidates.forEach(candidate => {
      const shuffledRemaining = [...remainingTodos].sort(() => Math.random() - 0.5)
      const samples = shuffledRemaining.slice(0, samplesPerCandidate)

      samples.forEach(sample => {
        pairs.push({ left: candidate, right: sample })
      })
    })

    // Phase 4: 下位タスク間のサンプリング比較
    if (remainingTodos.length > 1) {
      const maxRemainingPairs = Math.min(5, Math.floor(remainingTodos.length / 2))
      const shuffledRemaining = [...remainingTodos].sort(() => Math.random() - 0.5)

      for (let i = 0; i < maxRemainingPairs && i * 2 + 1 < shuffledRemaining.length; i++) {
        pairs.push({
          left: shuffledRemaining[i * 2],
          right: shuffledRemaining[i * 2 + 1]
        })
      }
    }

    const fullPairCount = n * (n - 1) / 2
    const efficiencyGain = Math.round((1 - pairs.length / fullPairCount) * 100)
    uiLogger.debug({
      pairCount: pairs.length,
      fullPairCount,
      efficiencyGain: `${efficiencyGain}%`
    }, 'Efficient comparison algorithm results')

    // 最終的にランダムシャッフル
    return pairs.sort(() => Math.random() - 0.5)
  }

  const handleChoice = async (winner: Todo, loser: Todo) => {
    await createComparison(winner.id, loser.id)
    setComparisonCount(prev => prev + 1)

    // 次のペアに進む
    const newRemainingPairs = remainingPairs.slice(1)
    setRemainingPairs(newRemainingPairs)

    if (newRemainingPairs.length > 0) {
      setCurrentPair(newRemainingPairs[0])
    } else {
      setCurrentPair(null)
    }
  }

  const handleSkip = () => {
    // 現在のペアをスキップして最後に回す
    const newRemainingPairs = [...remainingPairs.slice(1), remainingPairs[0]]
    setRemainingPairs(newRemainingPairs)
    setCurrentPair(newRemainingPairs[0])
  }

  const handleFinish = () => {
    router.push('/')
  }

  if (!user) {
    return null
  }

  if (!currentPair || remainingPairs.length === 0) {
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2">タスクA</h3>
          </div>
          <TodoCard todo={currentPair.left} />
          <Button
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => handleChoice(currentPair.left, currentPair.right)}
          >
            <ArrowLeft className="w-5 h-5" />
            Aが重要
          </Button>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2">タスクB</h3>
          </div>
          <TodoCard todo={currentPair.right} />
          <Button
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => handleChoice(currentPair.right, currentPair.left)}
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
    </div>
  )
}
