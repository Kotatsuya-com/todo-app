/**
 * EmojiSettings Service
 * 絵文字設定に関するビジネスロジックを担う
 */

import { EmojiSettingsRepositoryInterface } from '@/lib/repositories/EmojiSettingsRepository'
import {
  EmojiSetting,
  EmojiSettingsEntity,
  EmojiUpdateRequest,
  AvailableEmoji,
  DEFAULT_EMOJI_SETTINGS
} from '@/lib/entities/EmojiSettings'

export interface EmojiSettingsServiceResult<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface EmojiSettingsWithAvailable {
  settings: EmojiSetting
  availableEmojis: AvailableEmoji[]
}

export class EmojiSettingsService {
  constructor(
    private _emojiSettingsRepo: EmojiSettingsRepositoryInterface
  ) {}

  /**
   * ユーザーの絵文字設定を取得
   * 設定が存在しない場合はデフォルト設定を返す
   */
  async getUserEmojiSettings(userId: string): Promise<EmojiSettingsServiceResult<EmojiSettingsWithAvailable>> {
    try {
      const result = await this._emojiSettingsRepo.findByUserId(userId)

      if (result.error) {
        return {
          success: false,
          error: 'Failed to fetch emoji settings',
          statusCode: 500
        }
      }

      // 設定が存在しない場合はデフォルト設定を返す
      let settings: EmojiSetting
      if (!result.data) {
        settings = {
          id: '', // 仮のID（実際のレスポンスでは使用されない）
          user_id: userId,
          ...DEFAULT_EMOJI_SETTINGS,
          created_at: '',
          updated_at: ''
        }
      } else {
        settings = result.data
      }

      return {
        success: true,
        data: {
          settings,
          availableEmojis: EmojiSettingsEntity.getAvailableEmojis()
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500
      }
    }
  }

  /**
   * ユーザーの絵文字設定を更新
   */
  async updateUserEmojiSettings(
    userId: string,
    updateRequest: EmojiUpdateRequest
  ): Promise<EmojiSettingsServiceResult<{ message: string; settings: EmojiSetting }>> {
    try {
      // バリデーション
      const validation = EmojiSettingsEntity.validateEmojiUpdateRequest(updateRequest)
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid emoji selection: ${validation.errors.join(', ')}`,
          statusCode: 400
        }
      }

      // 設定を更新（UPSERT）
      const settingsToUpdate = EmojiSettingsEntity.createFromUpdateRequest(userId, updateRequest)
      const result = await this._emojiSettingsRepo.upsert(settingsToUpdate)

      if (result.error) {
        return {
          success: false,
          error: 'Failed to update emoji settings',
          statusCode: 500
        }
      }

      if (!result.data) {
        return {
          success: false,
          error: 'Failed to update emoji settings - no data returned',
          statusCode: 500
        }
      }

      return {
        success: true,
        data: {
          message: 'Settings updated successfully',
          settings: result.data
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500
      }
    }
  }

  /**
   * ユーザーの絵文字設定をデフォルトにリセット
   */
  async resetUserEmojiSettings(
    userId: string
  ): Promise<EmojiSettingsServiceResult<{ message: string; settings: EmojiSetting }>> {
    try {
      // デフォルト設定でUPSERT
      const defaultSettings = EmojiSettingsEntity.createWithDefaults(userId)
      const result = await this._emojiSettingsRepo.upsert(defaultSettings)

      if (result.error) {
        return {
          success: false,
          error: 'Failed to reset emoji settings',
          statusCode: 500
        }
      }

      if (!result.data) {
        return {
          success: false,
          error: 'Failed to reset emoji settings - no data returned',
          statusCode: 500
        }
      }

      return {
        success: true,
        data: {
          message: 'Settings reset to default',
          settings: result.data
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500
      }
    }
  }

  /**
   * 利用可能な絵文字リストを取得
   */
  getAvailableEmojis(): AvailableEmoji[] {
    return EmojiSettingsEntity.getAvailableEmojis()
  }

  /**
   * 絵文字名から絵文字情報を取得
   */
  getEmojiByName(name: string): AvailableEmoji | null {
    return EmojiSettingsEntity.getAvailableEmojiByName(name)
  }

  /**
   * デフォルト設定を取得
   */
  getDefaultSettings(): typeof DEFAULT_EMOJI_SETTINGS {
    return DEFAULT_EMOJI_SETTINGS
  }

  /**
   * 絵文字設定の統計情報を取得（管理者用）
   */
  async getEmojiUsageStats(): Promise<EmojiSettingsServiceResult<{
    totalUsers: number
    defaultUsers: number
    customUsers: number
    popularEmojis: Array<{ emoji: string; count: number }>
  }>> {
    try {
      // デフォルト設定を使用しているユーザー数を取得
      const defaultUsersResult = await this._emojiSettingsRepo.countDefaultUsers()
      if (defaultUsersResult.error) {
        return {
          success: false,
          error: 'Failed to fetch usage statistics',
          statusCode: 500
        }
      }

      const defaultUsers = defaultUsersResult.data || 0

      // 全設定を取得して統計を計算
      const allSettingsResult = await this._emojiSettingsRepo.findAll()
      if (allSettingsResult.error) {
        return {
          success: false,
          error: 'Failed to fetch usage statistics',
          statusCode: 500
        }
      }

      const allSettings = allSettingsResult.data || []
      const totalUsers = allSettings.length
      const customUsers = totalUsers - defaultUsers

      // 絵文字の使用頻度を計算
      const emojiCount = new Map<string, number>()
      allSettings.forEach(setting => {
        emojiCount.set(setting.today_emoji, (emojiCount.get(setting.today_emoji) || 0) + 1)
        emojiCount.set(setting.tomorrow_emoji, (emojiCount.get(setting.tomorrow_emoji) || 0) + 1)
        emojiCount.set(setting.later_emoji, (emojiCount.get(setting.later_emoji) || 0) + 1)
      })

      const popularEmojis = Array.from(emojiCount.entries())
        .map(([emoji, count]) => ({ emoji, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10) // 上位10個

      return {
        success: true,
        data: {
          totalUsers,
          defaultUsers,
          customUsers,
          popularEmojis
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500
      }
    }
  }

  /**
   * 特定の絵文字を使用しているユーザーを検索（管理者用）
   */
  async findUsersByEmoji(emojiName: string): Promise<EmojiSettingsServiceResult<EmojiSetting[]>> {
    try {
      // 絵文字名の妥当性をチェック
      const availableEmoji = this.getEmojiByName(emojiName)
      if (!availableEmoji) {
        return {
          success: false,
          error: `Unknown emoji: ${emojiName}`,
          statusCode: 400
        }
      }

      const result = await this._emojiSettingsRepo.findByEmoji(emojiName)
      if (result.error) {
        return {
          success: false,
          error: 'Failed to search emoji usage',
          statusCode: 500
        }
      }

      return {
        success: true,
        data: result.data || []
      }
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500
      }
    }
  }
}
