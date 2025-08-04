/**
 * Report Page with Clean Architecture
 * Clean Architectureパターンに従ったレポートページ
 */

'use client'

import React from 'react'
import { useReport, TimeRange } from '../hooks/useReport'
// import { useRouter } from 'next/navigation'
import { AuthForm } from '@/components/auth/AuthForm'
import { Button } from '@/components/ui/Button'
import { Calendar, PieChart, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { PieChart as RechartsPC, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export default function ReportPage() {
  const {
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
    reopenTodo
  } = useReport()

  // const router = useRouter()

  // 未認証の場合はログインフォームを表示
  if (!user) {
    return <AuthForm />
  }

  /**
   * エラー表示
   */
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">エラーが発生しました</h3>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">🐱 レポート</h2>

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
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
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
                        <Button
                          onClick={() => reopenTodo(todo.id)}
                          variant="secondary"
                          size="sm"
                          className="flex items-center gap-1 text-xs"
                        >
                          <RotateCcw className="w-3 h-3" />
                          未完了に戻す
                        </Button>
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
