/**
 * User Domain Entity
 * ユーザーに関するビジネスルールとバリデーションを定義
 */

export interface User {
  id: string
  email: string
  slack_user_id?: string | null
  enable_webhook_notifications: boolean
  created_at: string
  updated_at: string
}

export interface UserEmojiSettings {
  id: string
  user_id: string
  today_emoji: string
  tomorrow_emoji: string
  later_emoji: string
  created_at: string
  updated_at: string
}

export interface UserWithSettings extends User {
  user_emoji_settings?: UserEmojiSettings[]
}

export class UserEntity {
  constructor(private _user: User) {}

  get id(): string {
    return this._user.id
  }

  get email(): string {
    return this._user.email
  }

  get slackUserId(): string | null {
    return this._user.slack_user_id || null
  }

  get notificationsEnabled(): boolean {
    return this._user.enable_webhook_notifications
  }

  hasSlackUserId(): boolean {
    return !!this._user.slack_user_id
  }

  canReceiveWebhookNotifications(): boolean {
    return this._user.enable_webhook_notifications && this.hasSlackUserId()
  }

  validateSlackUserId(slackUserId: string): boolean {
    // Slack User IDのフォーマット検証
    return /^U[A-Z0-9]{8,}$/.test(slackUserId)
  }

  toPlainObject(): User {
    return { ...this._user }
  }

  static fromPlainObject(user: User): UserEntity {
    return new UserEntity(user)
  }
}
