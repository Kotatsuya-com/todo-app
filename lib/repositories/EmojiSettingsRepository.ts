/**
 * EmojiSettings Repository
 * 絵文字設定のデータアクセスを担う
 */

import {
  RepositoryContext,
  BaseRepository,
  RepositoryResult,
  RepositoryUtils
} from './BaseRepository'
import { EmojiSetting } from '@/lib/entities/EmojiSettings'

export interface EmojiSettingsRepositoryInterface {
  findByUserId(_userId: string): Promise<RepositoryResult<EmojiSetting | null>>
  upsert(_settings: Omit<EmojiSetting, 'id' | 'created_at' | 'updated_at'>): Promise<RepositoryResult<EmojiSetting>>
  findAll(): Promise<RepositoryResult<EmojiSetting[]>>
  findByEmoji(_emojiName: string): Promise<RepositoryResult<EmojiSetting[]>>
  countDefaultUsers(): Promise<RepositoryResult<number>>
}

export class EmojiSettingsRepository implements EmojiSettingsRepositoryInterface, BaseRepository {
  constructor(private _context: RepositoryContext) {}

  get client() {
    return this._context.getServiceClient()
  }

  /**
   * ユーザーIDで絵文字設定を取得
   */
  async findByUserId(_userId: string): Promise<RepositoryResult<EmojiSetting | null>> {
    const result = await this.client
      .from('user_emoji_settings')
      .select('id, user_id, today_emoji, tomorrow_emoji, later_emoji, created_at, updated_at')
      .eq('user_id', _userId)
      .single()

    // PGRST116エラー（データが見つからない）は正常なケースとして扱う
    if (result.error && result.error.code === 'PGRST116') {
      return RepositoryUtils.success(null)
    }

    return RepositoryUtils.handleSupabaseResult(result)
  }

  /**
   * 絵文字設定をUPSERT（存在しない場合は作成、存在する場合は更新）
   */
  async upsert(_settings: Omit<EmojiSetting, 'id' | 'created_at' | 'updated_at'>): Promise<RepositoryResult<EmojiSetting>> {
    const result = await this.client
      .from('user_emoji_settings')
      .upsert(_settings)
      .select('id, user_id, today_emoji, tomorrow_emoji, later_emoji, created_at, updated_at')
      .single()

    return RepositoryUtils.handleSupabaseResult(result)
  }

  /**
   * ユーザーの絵文字設定を削除（テスト用）
   */
  async deleteByUserId(_userId: string): Promise<RepositoryResult<void>> {
    const result = await this.client
      .from('user_emoji_settings')
      .delete()
      .eq('user_id', _userId)

    if (result.error) {
      return RepositoryUtils.failure(RepositoryUtils.handleSupabaseResult(result).error!)
    }
    return RepositoryUtils.success(undefined)
  }

  /**
   * すべての絵文字設定を取得（管理用）
   */
  async findAll(): Promise<RepositoryResult<EmojiSetting[]>> {
    const result = await this.client
      .from('user_emoji_settings')
      .select('id, user_id, today_emoji, tomorrow_emoji, later_emoji, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (result.error) {
      return RepositoryUtils.failure(RepositoryUtils.handleSupabaseResult(result).error!)
    }
    return RepositoryUtils.success(result.data || [])
  }

  /**
   * 特定の絵文字を使用している設定を検索
   */
  async findByEmoji(emojiName: string): Promise<RepositoryResult<EmojiSetting[]>> {
    const result = await this.client
      .from('user_emoji_settings')
      .select('id, user_id, today_emoji, tomorrow_emoji, later_emoji, created_at, updated_at')
      .or(`today_emoji.eq.${emojiName},tomorrow_emoji.eq.${emojiName},later_emoji.eq.${emojiName}`)

    if (result.error) {
      return RepositoryUtils.failure(RepositoryUtils.handleSupabaseResult(result).error!)
    }
    return RepositoryUtils.success(result.data || [])
  }

  /**
   * デフォルト設定を使用しているユーザー数を取得
   */
  async countDefaultUsers(): Promise<RepositoryResult<number>> {
    const result = await this.client
      .from('user_emoji_settings')
      .select('*', { count: 'exact', head: true })
      .eq('today_emoji', 'fire')
      .eq('tomorrow_emoji', 'calendar')
      .eq('later_emoji', 'memo')

    if (result.error) {
      return RepositoryUtils.failure(RepositoryUtils.handleSupabaseResult(result).error!)
    }
    return RepositoryUtils.success(result.count || 0)
  }
}
