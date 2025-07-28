import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Urgency, Quadrant } from '@/types'
import { createLogger } from './logger'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDeadlineFromUrgency(urgency: Urgency): string | undefined {
  const now = new Date()

  switch (urgency) {
    case 'today':
      return now.toISOString().split('T')[0]
    case 'tomorrow':
      now.setDate(now.getDate() + 1)
      return now.toISOString().split('T')[0]
    case 'later':
      return undefined
  }
}

export function getQuadrant(deadline: string | null | undefined, importanceScore: number): Quadrant {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isUrgent = deadline ? new Date(deadline) <= today : false
  // より多くのタスクが重要として扱われるよう閾値を調整
  // 0.4以上なら重要とする（デフォルト0.5から初期値が0.5の場合の問題を解決）
  const isImportant = importanceScore >= 0.4

  // デバッグログ
  const logger = createLogger({ module: 'utils' })
  logger.debug({ deadline, importanceScore, isUrgent, isImportant }, 'getQuadrant calculation')

  if (isUrgent && isImportant) {return 'urgent_important'}
  if (!isUrgent && isImportant) {return 'not_urgent_important'}
  if (isUrgent && !isImportant) {return 'urgent_not_important'}
  return 'not_urgent_not_important'
}

export function formatDeadline(deadline?: string): string {
  if (!deadline) {return '期限なし'}

  const date = new Date(deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {return `${Math.abs(diffDays)}日遅れ`}
  if (diffDays === 0) {return '今日'}
  if (diffDays === 1) {return '明日'}
  if (diffDays < 7) {return `${diffDays}日後`}

  return date.toLocaleDateString('ja-JP')
}

export function isOverdue(deadline?: string): boolean {
  if (!deadline) {return false}

  const date = new Date(deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  return date < today
}

export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.match(urlRegex) || []
}

export function linkifyText(text: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>')
}
