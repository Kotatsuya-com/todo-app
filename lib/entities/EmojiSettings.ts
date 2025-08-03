/**
 * EmojiSettings Domain Entity
 * 絵文字設定に関するビジネスルールとバリデーションを定義
 */

export interface EmojiSetting {
  id: string
  user_id: string
  today_emoji: string
  tomorrow_emoji: string
  later_emoji: string
  created_at: string
  updated_at: string
}

export interface AvailableEmoji {
  name: string
  display: string
  label: string
}

export interface EmojiUpdateRequest {
  today_emoji: string
  tomorrow_emoji: string
  later_emoji: string
}

// デフォルト絵文字設定
export const DEFAULT_EMOJI_SETTINGS = {
  today_emoji: 'fire',      // 🔥
  tomorrow_emoji: 'calendar', // 📅
  later_emoji: 'memo'       // 📝
} as const

// 利用可能な絵文字リスト（拡張可能）
export const AVAILABLE_EMOJIS: AvailableEmoji[] = [
  { name: 'fire', display: '🔥', label: '緊急' },
  { name: 'calendar', display: '📅', label: '計画' },
  { name: 'memo', display: '📝', label: 'メモ' },
  { name: 'warning', display: '⚠️', label: '警告' },
  { name: 'clock', display: '🕐', label: '時計' },
  { name: 'hourglass', display: '⏳', label: '砂時計' },
  { name: 'pushpin', display: '📌', label: 'ピン' },
  { name: 'bookmark', display: '🔖', label: 'ブックマーク' },
  { name: 'bulb', display: '💡', label: 'アイデア' },
  { name: 'star', display: '⭐', label: 'スター' },
  { name: 'zap', display: '⚡', label: '稲妻' },
  { name: 'bell', display: '🔔', label: 'ベル' }
]

export class EmojiSettingsEntity {
  constructor(private _settings: EmojiSetting) {}

  get id(): string {
    return this._settings.id
  }

  get userId(): string {
    return this._settings.user_id
  }

  get todayEmoji(): string {
    return this._settings.today_emoji
  }

  get tomorrowEmoji(): string {
    return this._settings.tomorrow_emoji
  }

  get laterEmoji(): string {
    return this._settings.later_emoji
  }

  get createdAt(): string {
    return this._settings.created_at
  }

  get updatedAt(): string {
    return this._settings.updated_at
  }

  /**
   * 設定された絵文字がデフォルト設定かどうかを判定
   */
  isDefaultSetting(): boolean {
    return (
      this._settings.today_emoji === DEFAULT_EMOJI_SETTINGS.today_emoji &&
      this._settings.tomorrow_emoji === DEFAULT_EMOJI_SETTINGS.tomorrow_emoji &&
      this._settings.later_emoji === DEFAULT_EMOJI_SETTINGS.later_emoji
    )
  }

  /**
   * カスタマイズされているかどうかを判定
   */
  hasCustomization(): boolean {
    return !this.isDefaultSetting()
  }

  /**
   * 絵文字設定の更新リクエストを検証
   */
  static validateEmojiUpdateRequest(request: EmojiUpdateRequest): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    const availableEmojiNames = AVAILABLE_EMOJIS.map(e => e.name)

    if (!availableEmojiNames.includes(request.today_emoji)) {
      errors.push(`Invalid today_emoji: ${request.today_emoji}`)
    }

    if (!availableEmojiNames.includes(request.tomorrow_emoji)) {
      errors.push(`Invalid tomorrow_emoji: ${request.tomorrow_emoji}`)
    }

    if (!availableEmojiNames.includes(request.later_emoji)) {
      errors.push(`Invalid later_emoji: ${request.later_emoji}`)
    }

    // 重複チェック（同じ絵文字を複数の用途に使用することは許可しない）
    const emojiSet = new Set([
      request.today_emoji,
      request.tomorrow_emoji,
      request.later_emoji
    ])

    if (emojiSet.size < 3) {
      errors.push('Each emoji must be unique across today, tomorrow, and later settings')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 絵文字名から利用可能な絵文字情報を取得
   */
  static getAvailableEmojiByName(name: string): AvailableEmoji | null {
    return AVAILABLE_EMOJIS.find(emoji => emoji.name === name) || null
  }

  /**
   * すべての利用可能な絵文字を取得
   */
  static getAvailableEmojis(): AvailableEmoji[] {
    return [...AVAILABLE_EMOJIS]
  }

  /**
   * デフォルト設定で新しいエンティティを作成
   */
  static createWithDefaults(userId: string): Omit<EmojiSetting, 'id' | 'created_at' | 'updated_at'> {
    return {
      user_id: userId,
      ...DEFAULT_EMOJI_SETTINGS
    }
  }

  /**
   * 更新リクエストから新しいエンティティを作成
   */
  static createFromUpdateRequest(
    userId: string,
    request: EmojiUpdateRequest
  ): Omit<EmojiSetting, 'id' | 'created_at' | 'updated_at'> {
    return {
      user_id: userId,
      today_emoji: request.today_emoji,
      tomorrow_emoji: request.tomorrow_emoji,
      later_emoji: request.later_emoji
    }
  }

  /**
   * 現在の設定をデフォルトにリセット
   */
  resetToDefaults(): EmojiSettingsEntity {
    return new EmojiSettingsEntity({
      ...this._settings,
      ...DEFAULT_EMOJI_SETTINGS,
      updated_at: new Date().toISOString()
    })
  }

  /**
   * 設定を更新
   */
  updateSettings(request: EmojiUpdateRequest): EmojiSettingsEntity {
    return new EmojiSettingsEntity({
      ...this._settings,
      today_emoji: request.today_emoji,
      tomorrow_emoji: request.tomorrow_emoji,
      later_emoji: request.later_emoji,
      updated_at: new Date().toISOString()
    })
  }

  /**
   * 緊急度に対応する絵文字を取得
   */
  getEmojiForUrgency(urgency: 'today' | 'tomorrow' | 'later'): string {
    switch (urgency) {
      case 'today':
        return this._settings.today_emoji
      case 'tomorrow':
        return this._settings.tomorrow_emoji
      case 'later':
        return this._settings.later_emoji
    }
  }

  /**
   * 絵文字から緊急度を逆引き
   */
  getUrgencyForEmoji(emoji: string): 'today' | 'tomorrow' | 'later' | null {
    if (emoji === this._settings.today_emoji) {
      return 'today'
    }
    if (emoji === this._settings.tomorrow_emoji) {
      return 'tomorrow'
    }
    if (emoji === this._settings.later_emoji) {
      return 'later'
    }
    return null
  }

  /**
   * プレーンオブジェクトに変換
   */
  toPlainObject(): EmojiSetting {
    return { ...this._settings }
  }

  /**
   * プレーンオブジェクトからエンティティを作成
   */
  static fromPlainObject(settings: EmojiSetting): EmojiSettingsEntity {
    return new EmojiSettingsEntity(settings)
  }
}
