/**
 * Domain Types Export
 * Clean Architectureドメイン層の型定義を統一エクスポート
 */

// エンティティからの型エクスポート
export type { TodoData, TodoQuadrant, TodoStatus, TodoCreatedVia } from '../entities/Todo'
export type { UserData } from '../entities/User'

// 既存のレガシー型との互換性のための型エイリアス
export type Urgency = 'today' | 'tomorrow' | 'later'
export type Status = 'open' | 'completed'
export type CreatedVia = 'manual' | 'slack_webhook' | 'slack_url'
export type Quadrant = 'urgent_important' | 'urgent_not_important' | 'not_urgent_important' | 'not_urgent_not_important'

// レガシー互換のためのTodo型（徐々に移行予定）
export interface Todo {
  id: string
  user_id: string
  title?: string
  body: string
  urgency: Urgency
  deadline?: string
  importance_score: number
  status: Status
  created_via: CreatedVia
  created_at: string
  completed_at?: string
}

// レガシー互換のためのUser型（徐々に移行予定）
export interface User {
  id: string
  display_name?: string
  avatar_url?: string
  created_at: string
}

// その他の型（そのまま維持）
export interface Comparison {
  id: string
  user_id: string
  winner_id: string
  loser_id: string
  created_at: string
}

export interface CompletionLog {
  id: string
  todo_id: string
  quadrant: Quadrant
  completed_at: string
}

export interface TodoWithQuadrant extends Todo {
  quadrant: Quadrant
}

export interface ComparisonPair {
  left: Todo
  right: Todo
}

export interface UserSlackWebhook {
  id: string
  user_id: string
  slack_connection_id: string
  webhook_id: string
  webhook_secret: string
  is_active: boolean
  last_event_at?: string
  event_count: number
  created_at: string
  updated_at: string
}

export interface SlackReactionEvent {
  type: 'reaction_added'
  user: string
  reaction: string
  item_user: string
  item: {
    type: 'message'
    channel: string
    ts: string
  }
  event_ts: string
}

export interface SlackEventPayload {
  token: string
  team_id: string
  api_app_id: string
  event: SlackReactionEvent
  type: 'event_callback' | 'url_verification'
  challenge?: string
  authorized_users?: string[]
}
