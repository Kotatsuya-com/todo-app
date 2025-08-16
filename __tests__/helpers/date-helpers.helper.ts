/**
 * Date testing helpers
 * 日付関連テスト用のヘルパー関数
 */

/**
 * 固定日付でシステム時間をモック
 */
export const setupDateMocks = (fixedDate: string = '2023-01-15T00:00:00Z') => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date(fixedDate))
}

/**
 * 日付モックをクリーンアップ
 */
export const cleanupDateMocks = () => {
  jest.useRealTimers()
}

/**
 * 指定した日数前/後の日付を取得
 */
export const getDateOffset = (baseDate: string, offsetDays: number): string => {
  const date = new Date(baseDate)
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().split('T')[0]
}

/**
 * 今日の日付を YYYY-MM-DD 形式で取得
 * Uses local time to match TodoEntity date comparison logic
 */
export const getTodayString = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 明日の日付を YYYY-MM-DD 形式で取得
 * Uses local time to match TodoEntity date comparison logic
 */
export const getTomorrowString = (): string => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const year = tomorrow.getFullYear()
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
  const day = String(tomorrow.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 昨日の日付を YYYY-MM-DD 形式で取得
 * Uses local time to match TodoEntity date comparison logic
 */
export const getYesterdayString = (): string => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const year = yesterday.getFullYear()
  const month = String(yesterday.getMonth() + 1).padStart(2, '0')
  const day = String(yesterday.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 日付が今日かどうかを判定
 */
export const isToday = (dateString: string): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(dateString)
  return targetDate.getTime() === today.getTime()
}

/**
 * 日付が過去かどうかを判定
 */
export const isPast = (dateString: string): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(dateString)
  return targetDate < today
}

/**
 * 日付が未来かどうかを判定
 */
export const isFuture = (dateString: string): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(dateString)
  return targetDate > today
}

/**
 * テスト用の日付範囲
 */
export const DateRanges = {
  PAST: '2023-01-10',
  TODAY: '2023-01-15',
  TOMORROW: '2023-01-16',
  FUTURE: '2023-01-22'
} as const

/**
 * 期限に基づく重要度スコアの期待値
 */
export const ExpectedImportanceScores = {
  OVERDUE: 0.7,
  TODAY: 0.6,
  RANDOM_MIN: 0.3,
  RANDOM_MAX: 0.7
} as const
