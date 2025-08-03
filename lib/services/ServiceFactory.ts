/**
 * Service Factory
 * Clean Architectureサービス層のインスタンス作成を管理
 */

import { SupabaseRepositoryContext } from '@/lib/repositories/BaseRepository'
import { SlackRepository } from '@/lib/repositories/SlackRepository'
import { TodoRepository } from '@/lib/repositories/TodoRepository'
import { EmojiSettingsRepository } from '@/lib/repositories/EmojiSettingsRepository'
import { NotificationSettingsRepository } from '@/lib/repositories/NotificationSettingsRepository'
import { SlackService } from '@/lib/services/SlackService'
import { SlackConnectionService } from '@/lib/services/SlackConnectionService'
import { SlackAuthService } from '@/lib/services/SlackAuthService'
import { EmojiSettingsService } from '@/lib/services/EmojiSettingsService'
import { NotificationSettingsService } from '@/lib/services/NotificationSettingsService'

/**
 * サービス層のインスタンスを作成するファクトリー
 */
export function createServices() {
  // Repository Context（Supabaseクライアント管理）
  const context = new SupabaseRepositoryContext()

  // Repository Layer
  const slackRepo = new SlackRepository(context)
  const todoRepo = new TodoRepository(context)
  const emojiSettingsRepo = new EmojiSettingsRepository(context)
  const notificationSettingsRepo = new NotificationSettingsRepository(context)

  // Service Layer
  const slackService = new SlackService(slackRepo, todoRepo)
  const slackConnectionService = new SlackConnectionService(slackRepo)
  const slackAuthService = new SlackAuthService(slackRepo)
  const emojiSettingsService = new EmojiSettingsService(emojiSettingsRepo)
  const notificationSettingsService = new NotificationSettingsService(notificationSettingsRepo)

  return {
    // Services
    slackService,
    slackConnectionService,
    slackAuthService,
    emojiSettingsService,
    notificationSettingsService,

    // Repositories (必要に応じて直接アクセス)
    slackRepo,
    todoRepo,
    emojiSettingsRepo,
    notificationSettingsRepo
  }
}

/**
 * 個別サービスの作成用ヘルパー
 */
export function createEmojiSettingsService() {
  const context = new SupabaseRepositoryContext()
  const emojiSettingsRepo = new EmojiSettingsRepository(context)
  return new EmojiSettingsService(emojiSettingsRepo)
}

export function createSlackService() {
  const context = new SupabaseRepositoryContext()
  const slackRepo = new SlackRepository(context)
  const todoRepo = new TodoRepository(context)
  return new SlackService(slackRepo, todoRepo)
}

export function createNotificationSettingsService() {
  const context = new SupabaseRepositoryContext()
  const notificationSettingsRepo = new NotificationSettingsRepository(context)
  return new NotificationSettingsService(notificationSettingsRepo)
}

export function createSlackConnectionService() {
  const context = new SupabaseRepositoryContext()
  const slackRepo = new SlackRepository(context)
  return new SlackConnectionService(slackRepo)
}

export function createSlackAuthService() {
  const context = new SupabaseRepositoryContext()
  const slackRepo = new SlackRepository(context)
  return new SlackAuthService(slackRepo)
}
