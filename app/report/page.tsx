'use client'

import { useState, useEffect } from 'react'
import { useTodoStore } from '@/store/todoStore'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Calendar, BarChart3, PieChart } from 'lucide-react'
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import { PieChart as RechartsPC, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useRouter } from 'next/navigation'

type TimeRange = 'day' | 'week' | 'month'

interface CompletionData {
  quadrant: string
  count: number
  todos: {
    title?: string
    body: string
    completed_at: string
  }[]
}

export default function ReportPage() {
  const { user } = useTodoStore()
  const [timeRange, setTimeRange] = useState<TimeRange>('week')
  const [completionData, setCompletionData] = useState<CompletionData[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
  }, [user, router])

  useEffect(() => {
    if (user) {
      fetchCompletionData()
    }
  }, [user, timeRange])

  const fetchCompletionData = async () => {
    setLoading(true)
    const supabase = createClient()
    
    // 期間の設定
    const now = new Date()
    let startDate: Date
    let endDate = new Date()
    
    switch (timeRange) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0))
        break
      case 'week':
        startDate = startOfWeek(now, { locale: ja })
        endDate = endOfWeek(now, { locale: ja })
        break
      case 'month':
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
        break
    }

    try {
      const { data, error } = await supabase
        .from('completion_log')
        .select(`
          quadrant,
          completed_at,
          todos (
            title,
            body
          )
        `)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString())
        .order('completed_at', { ascending: false })

      if (error) throw error

      // データを四象限ごとに集計
      const aggregated = data?.reduce((acc: any, item: any) => {
        const quadrant = item.quadrant
        if (!acc[quadrant]) {
          acc[quadrant] = {
            quadrant,
            count: 0,
            todos: []
          }
        }
        acc[quadrant].count++
        acc[quadrant].todos.push({
          title: item.todos.title,
          body: item.todos.body,
          completed_at: item.completed_at
        })
        return acc
      }, {})

      const result = Object.values(aggregated || {}) as CompletionData[]
      setCompletionData(result)
    } catch (error) {
      console.error('Failed to fetch completion data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  const quadrantLabels: Record<string, string> = {
    urgent_important: '緊急×重要',
    not_urgent_important: '重要×緊急でない',
    urgent_not_important: '緊急×重要でない',
    not_urgent_not_important: '緊急でない×重要でない',
  }

  const quadrantColors: Record<string, string> = {
    urgent_important: '#ef4444',
    not_urgent_important: '#3b82f6',
    urgent_not_important: '#eab308',
    not_urgent_not_important: '#6b7280',
  }

  const pieData = completionData.map(item => ({
    name: quadrantLabels[item.quadrant] || item.quadrant,
    value: item.count,
    color: quadrantColors[item.quadrant] || '#6b7280'
  }))

  const totalCompleted = completionData.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">完了レポート</h2>
        
        <div className="flex gap-2">
          {(['day', 'week', 'month'] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="flex items-center gap-1"
            >
              <Calendar className="w-3 h-3" />
              {range === 'day' ? '日' : range === 'week' ? '週' : '月'}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : totalCompleted === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">この期間に完了したタスクはありません</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-soft p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                四象限別完了数
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPC>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPC>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-soft p-6">
              <h3 className="text-lg font-semibold mb-4">統計情報</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">合計完了数</span>
                  <span className="text-2xl font-bold">{totalCompleted}</span>
                </div>
                {completionData.map((item) => (
                  <div key={item.quadrant} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: quadrantColors[item.quadrant] }}
                      />
                      <span className="text-sm text-gray-600">
                        {quadrantLabels[item.quadrant]}
                      </span>
                    </div>
                    <span className="font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-soft p-6">
            <h3 className="text-lg font-semibold mb-4">完了したタスク一覧</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {completionData.flatMap(data => 
                data.todos.map((todo, index) => (
                  <div key={`${data.quadrant}-${index}`} className="border-b pb-3 last:border-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {todo.title || todo.body.substring(0, 50) + '...'}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{todo.body}</p>
                      </div>
                      <div className="text-right ml-4">
                        <div 
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: `${quadrantColors[data.quadrant]}20`,
                            color: quadrantColors[data.quadrant]
                          }}
                        >
                          {quadrantLabels[data.quadrant]}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(todo.completed_at), 'MM/dd HH:mm', { locale: ja })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}