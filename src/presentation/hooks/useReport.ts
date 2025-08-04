/**
 * Report Hook for Clean Architecture
 * レポート機能のカスタムフック
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { createTodoUseCases } from '@/src/infrastructure/di/ServiceFactory'
import { UserEntity } from '@/src/domain/entities/User'

export type TimeRange = 'day' | 'week' | 'month'

export interface CompletionData {
  quadrant: string
  count: number
  todos: {
    id: string
    title?: string
    body: string
    completed_at: string
  }[]
}

export interface UseReportReturn {
  user: UserEntity | null
  timeRange: TimeRange
  setTimeRange: (_range: TimeRange) => void
  completionData: CompletionData[]
  loading: boolean
  error: string | null
  totalCompleted: number
  quadrantLabels: Record<string, string>
  quadrantColors: Record<string, string>
  pieData: Array<{
    name: string
    value: number
    color: string
  }>
  reopenTodo: (_todoId: string) => Promise<void>
  refreshData: () => Promise<void>
}

export const useReport = (): UseReportReturn => {
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState<TimeRange>('week')
  const [completionData, setCompletionData] = useState<CompletionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Business logic constants
  const quadrantLabels: Record<string, string> = {
    urgent_important: '緊急×重要',
    not_urgent_important: '重要×緊急でない',
    urgent_not_important: '緊急×重要でない',
    not_urgent_not_important: '緊急でない×重要でない'
  }

  const quadrantColors: Record<string, string> = {
    urgent_important: '#ef4444',
    not_urgent_important: '#3b82f6',
    urgent_not_important: '#eab308',
    not_urgent_not_important: '#6b7280'
  }

  // Calculate derived data
  const totalCompleted = completionData.reduce((sum, item) => sum + item.count, 0)

  const pieData = completionData.map(item => ({
    name: quadrantLabels[item.quadrant] || item.quadrant,
    value: item.count,
    color: quadrantColors[item.quadrant] || '#6b7280'
  }))

  // Fetch completion data based on time range
  const fetchCompletionData = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const todoUseCases = createTodoUseCases()

      // Calculate date range
      const now = new Date()
      let startDate: Date
      let endDate = new Date()

      switch (timeRange) {
        case 'day':
          startDate = new Date(now.setHours(0, 0, 0, 0))
          break
        case 'week': {
          // Start of week (Monday)
          const dayOfWeek = now.getDay()
          const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
          startDate = new Date(now.setDate(now.getDate() + diffToMonday))
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date(startDate)
          endDate.setDate(startDate.getDate() + 6)
          endDate.setHours(23, 59, 59, 999)
          break
        }
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
          break
      }

      const result = await todoUseCases.getCompletionReport(
        user.id,
        startDate.toISOString(),
        endDate.toISOString()
      )

      if (result.success && result.data) {
        setCompletionData(result.data)
      } else {
        setError(result.error || 'Failed to fetch completion data')
      }
    } catch (err) {
      setError('Failed to fetch completion data')
      // Error fetching completion data
    } finally {
      setLoading(false)
    }
  }, [user, timeRange])

  // Reopen a completed todo
  const reopenTodo = useCallback(async (todoId: string) => {
    if (!user) { return }

    try {
      const todoUseCases = createTodoUseCases()
      const result = await todoUseCases.reopenTodo({
        id: todoId,
        userId: user.id
      })

      if (result.success) {
        // Refresh data after reopening
        await fetchCompletionData()
      } else {
        setError(result.error || 'Failed to reopen todo')
      }
    } catch (err) {
      setError('Failed to reopen todo')
      // Error reopening todo
    }
  }, [user, fetchCompletionData])

  const refreshData = useCallback(async () => {
    await fetchCompletionData()
  }, [fetchCompletionData])

  // Fetch data when user or time range changes
  useEffect(() => {
    fetchCompletionData()
  }, [fetchCompletionData])

  return {
    user,
    timeRange,
    setTimeRange,
    completionData,
    loading,
    error,
    totalCompleted,
    quadrantLabels,
    quadrantColors,
    pieData,
    reopenTodo,
    refreshData
  }
}
