/**
 * Compare Hook for Clean Architecture
 * 比較機能のカスタムフック
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { useTodoDashboard } from './useTodoDashboard'
import { TodoEntity } from '@/src/domain/entities/Todo'
import { createTodoUseCases } from '@/src/infrastructure/di/FrontendServiceFactory'

export interface ComparisonPair {
  left: TodoEntity
  right: TodoEntity
}

export interface UseCompareReturn {
  currentPair: ComparisonPair | null
  comparisonCount: number
  remainingPairs: ComparisonPair[]
  loading: boolean
  error: string | null
  handleChoice: (_winner: TodoEntity, _loser: TodoEntity) => Promise<void>
  handleSkip: () => void
  handleFinish: () => void
  isComplete: boolean
}

export const useCompare = (): UseCompareReturn => {
  const { user } = useAuth()
  const { state } = useTodoDashboard()
  const { todos } = state

  const [currentPair, setCurrentPair] = useState<ComparisonPair | null>(null)
  const [comparisonCount, setComparisonCount] = useState(0)
  const [remainingPairs, setRemainingPairs] = useState<ComparisonPair[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate efficient comparison pairs using adaptive tournament algorithm
  const generateEfficientComparisonPairs = useCallback((todoEntities: TodoEntity[]): ComparisonPair[] => {
    const pairs: ComparisonPair[] = []
    const n = todoEntities.length

    // 1. For small sets (≤5): compare all pairs
    if (n <= 5) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          pairs.push({ left: todoEntities[i], right: todoEntities[j] })
        }
      }
      return pairs.sort(() => Math.random() - 0.5)
    }

    // 2. For larger sets (>5): hierarchical tournament + importance-based selection

    // Phase 1: Sort by importance score and identify top candidates
    const sortedByImportance = [...todoEntities].sort((a, b) => b.importanceScore - a.importanceScore)
    const topCandidates = sortedByImportance.slice(0, Math.min(8, Math.ceil(n * 0.4)))
    const remainingTodos = sortedByImportance.slice(topCandidates.length)

    // Phase 2: Precise comparison within top candidates (all pairs)
    for (let i = 0; i < topCandidates.length; i++) {
      for (let j = i + 1; j < topCandidates.length; j++) {
        pairs.push({ left: topCandidates[i], right: topCandidates[j] })
      }
    }

    // Phase 3: Each top candidate vs random lower-ranked tasks (2-3 each)
    const samplesPerCandidate = Math.min(3, Math.max(1, Math.floor(remainingTodos.length / topCandidates.length)))
    topCandidates.forEach(candidate => {
      const shuffledRemaining = [...remainingTodos].sort(() => Math.random() - 0.5)
      const samples = shuffledRemaining.slice(0, samplesPerCandidate)

      samples.forEach(sample => {
        pairs.push({ left: candidate, right: sample })
      })
    })

    // Phase 4: Sampling comparison among lower-ranked tasks
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

    // Final random shuffle
    return pairs.sort(() => Math.random() - 0.5)
  }, [])

  // Generate comparison pairs when todos change
  useEffect(() => {
    // Only active todos for comparison
    const activeTodos = todos.filter(todo => todo.isActive())

    if (activeTodos.length <= 1) {
      setRemainingPairs([])
      setCurrentPair(null)
      return
    }

    // Generate efficient comparison pairs
    const pairs = generateEfficientComparisonPairs(activeTodos)
    setRemainingPairs(pairs)

    if (pairs.length > 0) {
      setCurrentPair(pairs[0])
    }
  }, [todos, generateEfficientComparisonPairs])

  // Handle user choice in comparison
  const handleChoice = useCallback(async (winner: TodoEntity, loser: TodoEntity) => {
    if (!user) { return }

    setLoading(true)
    setError(null)

    try {
      const todoUseCases = createTodoUseCases()
      const result = await todoUseCases.createComparison(user.id, winner.id, loser.id)

      if (result.success) {
        setComparisonCount(prev => prev + 1)

        // Move to next pair
        const newRemainingPairs = remainingPairs.slice(1)
        setRemainingPairs(newRemainingPairs)

        if (newRemainingPairs.length > 0) {
          setCurrentPair(newRemainingPairs[0])
        } else {
          setCurrentPair(null)
        }
      } else {
        setError(result.error || 'Failed to create comparison')
      }
    } catch (err) {
      setError('Failed to create comparison')
      // Error creating comparison
    } finally {
      setLoading(false)
    }
  }, [user, remainingPairs])

  // Skip current pair and move it to the end
  const handleSkip = useCallback(() => {
    if (remainingPairs.length === 0) { return }

    const newRemainingPairs = [...remainingPairs.slice(1), remainingPairs[0]]
    setRemainingPairs(newRemainingPairs)
    setCurrentPair(newRemainingPairs[0])
  }, [remainingPairs])

  // Finish comparison and navigate back
  const handleFinish = useCallback(() => {
    // This will be handled by the component using this hook
    // Navigation should be handled in the presentation layer
  }, [])

  const isComplete = !currentPair || remainingPairs.length === 0

  return {
    currentPair,
    comparisonCount,
    remainingPairs,
    loading,
    error,
    handleChoice,
    handleSkip,
    handleFinish,
    isComplete
  }
}
