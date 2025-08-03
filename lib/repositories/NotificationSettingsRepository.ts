/**
 * NotificationSettings Repository
 * 通知設定のデータアクセスを担う
 */

import {
  RepositoryContext,
  BaseRepository,
  RepositoryResult,
  RepositoryUtils,
  RepositoryError
} from './BaseRepository'
import { NotificationSettings } from '@/lib/entities/NotificationSettings'

export interface NotificationSettingsRepositoryInterface {
  findByUserId(_userId: string): Promise<RepositoryResult<NotificationSettings | null>>
  update(_userId: string, _settings: Omit<NotificationSettings, 'user_id' | 'updated_at'>): Promise<RepositoryResult<NotificationSettings>>
  getNotificationStats(): Promise<RepositoryResult<{
    totalUsers: number
    enabledUsers: number
    disabledUsers: number
  }>>
  findUsersWithNotificationsEnabled(): Promise<RepositoryResult<string[]>>
}

export class NotificationSettingsRepository implements NotificationSettingsRepositoryInterface, BaseRepository {
  constructor(private _context: RepositoryContext) {}

  get client() {
    return this._context.getServiceClient()
  }

  /**
   * ユーザーIDで通知設定を取得
   */
  async findByUserId(_userId: string): Promise<RepositoryResult<NotificationSettings | null>> {
    const result = await this.client
      .from('users')
      .select('id, enable_webhook_notifications, updated_at')
      .eq('id', _userId)
      .single()

    // PGRST116エラー（データが見つからない）は正常なケースとして扱う
    if (result.error && result.error.code === 'PGRST116') {
      return RepositoryUtils.success(null)
    }

    if (result.error) {
      return RepositoryUtils.failure(RepositoryError.fromSupabaseError(result.error))
    }

    if (!result.data) {
      return RepositoryUtils.success(null)
    }

    // データを NotificationSettings 形式に変換
    const notificationSettings: NotificationSettings = {
      user_id: result.data.id,
      enable_webhook_notifications: result.data.enable_webhook_notifications ?? true,
      updated_at: result.data.updated_at
    }

    return RepositoryUtils.success(notificationSettings)
  }

  /**
   * ユーザーの通知設定を更新
   */
  async update(_userId: string, _settings: Omit<NotificationSettings, 'user_id' | 'updated_at'>): Promise<RepositoryResult<NotificationSettings>> {
    const result = await this.client
      .from('users')
      .update({
        enable_webhook_notifications: _settings.enable_webhook_notifications,
        updated_at: new Date().toISOString()
      })
      .eq('id', _userId)
      .select('id, enable_webhook_notifications, updated_at')
      .single()

    if (result.error) {
      return RepositoryUtils.failure(RepositoryError.fromSupabaseError(result.error))
    }

    if (!result.data) {
      return RepositoryUtils.failure(new RepositoryError(
        'Failed to update notification settings - no data returned',
        'UPDATE_FAILED'
      ))
    }

    // データを NotificationSettings 形式に変換
    const notificationSettings: NotificationSettings = {
      user_id: result.data.id,
      enable_webhook_notifications: result.data.enable_webhook_notifications,
      updated_at: result.data.updated_at
    }

    return RepositoryUtils.success(notificationSettings)
  }

  /**
   * 全ユーザーの通知設定統計を取得（管理用）
   */
  async getNotificationStats(): Promise<RepositoryResult<{
    totalUsers: number
    enabledUsers: number
    disabledUsers: number
  }>> {
    const result = await this.client
      .from('users')
      .select('enable_webhook_notifications')

    if (result.error) {
      return RepositoryUtils.failure(RepositoryError.fromSupabaseError(result.error))
    }

    const users = result.data || []
    const totalUsers = users.length
    const enabledUsers = users.filter(user => user.enable_webhook_notifications === true).length
    const disabledUsers = totalUsers - enabledUsers

    return RepositoryUtils.success({
      totalUsers,
      enabledUsers,
      disabledUsers
    })
  }

  /**
   * 通知が有効なユーザーのIDリストを取得
   */
  async findUsersWithNotificationsEnabled(): Promise<RepositoryResult<string[]>> {
    const result = await this.client
      .from('users')
      .select('id')
      .eq('enable_webhook_notifications', true)

    if (result.error) {
      return RepositoryUtils.failure(RepositoryError.fromSupabaseError(result.error))
    }

    const userIds = (result.data || []).map(user => user.id)
    return RepositoryUtils.success(userIds)
  }
}
