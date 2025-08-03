/**
 * NotificationSettings Domain Entity
 * 通知設定に関するビジネスルールとバリデーションを定義
 */

export interface NotificationSettings {
  user_id: string
  enable_webhook_notifications: boolean
  updated_at?: string
}

export interface NotificationUpdateRequest {
  enable_webhook_notifications: boolean
}

// デフォルト通知設定
export const DEFAULT_NOTIFICATION_SETTINGS = {
  enable_webhook_notifications: true
} as const

export class NotificationSettingsEntity {
  constructor(private _settings: NotificationSettings) {}

  get userId(): string {
    return this._settings.user_id
  }

  get webhookNotificationsEnabled(): boolean {
    return this._settings.enable_webhook_notifications
  }

  get updatedAt(): string | undefined {
    return this._settings.updated_at
  }

  /**
   * 設定がデフォルト設定かどうかを判定
   */
  isDefaultSetting(): boolean {
    return this._settings.enable_webhook_notifications === DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications
  }

  /**
   * カスタマイズされているかどうかを判定
   */
  hasCustomization(): boolean {
    return !this.isDefaultSetting()
  }

  /**
   * 通知設定の更新リクエストを検証
   */
  static validateNotificationUpdateRequest(request: NotificationUpdateRequest): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (typeof request.enable_webhook_notifications !== 'boolean') {
      errors.push('enable_webhook_notifications must be a boolean')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * デフォルト設定で新しいエンティティを作成
   */
  static createWithDefaults(userId: string): Omit<NotificationSettings, 'updated_at'> {
    return {
      user_id: userId,
      ...DEFAULT_NOTIFICATION_SETTINGS
    }
  }

  /**
   * 更新リクエストから新しいエンティティを作成
   */
  static createFromUpdateRequest(
    userId: string,
    request: NotificationUpdateRequest
  ): Omit<NotificationSettings, 'updated_at'> {
    return {
      user_id: userId,
      enable_webhook_notifications: request.enable_webhook_notifications
    }
  }

  /**
   * 設定を更新
   */
  updateSettings(request: NotificationUpdateRequest): NotificationSettingsEntity {
    return new NotificationSettingsEntity({
      ...this._settings,
      enable_webhook_notifications: request.enable_webhook_notifications,
      updated_at: new Date().toISOString()
    })
  }

  /**
   * 設定をデフォルトにリセット
   */
  resetToDefaults(): NotificationSettingsEntity {
    return new NotificationSettingsEntity({
      ...this._settings,
      ...DEFAULT_NOTIFICATION_SETTINGS,
      updated_at: new Date().toISOString()
    })
  }

  /**
   * プレーンオブジェクトに変換
   */
  toPlainObject(): NotificationSettings {
    return { ...this._settings }
  }

  /**
   * プレーンオブジェクトからエンティティを作成
   */
  static fromPlainObject(settings: NotificationSettings): NotificationSettingsEntity {
    return new NotificationSettingsEntity(settings)
  }

  /**
   * ユーザーがWebhook通知を受信できるかどうかを判定
   */
  canReceiveWebhookNotifications(): boolean {
    return this._settings.enable_webhook_notifications
  }

  /**
   * 通知設定の概要を取得
   */
  getSettingsSummary(): {
    webhookNotifications: 'enabled' | 'disabled'
    isDefault: boolean
    lastUpdated?: string
    } {
    return {
      webhookNotifications: this._settings.enable_webhook_notifications ? 'enabled' : 'disabled',
      isDefault: this.isDefaultSetting(),
      lastUpdated: this._settings.updated_at
    }
  }
}
