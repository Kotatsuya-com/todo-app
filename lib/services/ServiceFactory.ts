/**
 * Service Factory
 * Clean Architectureサービス層のインスタンス作成を管理
 */

import { SupabaseRepositoryContext } from '@/lib/repositories/BaseRepository'
import { SlackRepository } from '@/lib/repositories/SlackRepository'
import { TodoRepository } from '@/lib/repositories/TodoRepository'
import { EmojiSettingsRepository } from '@/lib/repositories/EmojiSettingsRepository'
import { SlackService } from '@/lib/services/SlackService'
import { EmojiSettingsService } from '@/lib/services/EmojiSettingsService'

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

  // Service Layer
  const slackService = new SlackService(slackRepo, todoRepo)
  const emojiSettingsService = new EmojiSettingsService(emojiSettingsRepo)

  return {
    // Services
    slackService,
    emojiSettingsService,

    // Repositories (必要に応じて直接アクセス)
    slackRepo,
    todoRepo,
    emojiSettingsRepo
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
