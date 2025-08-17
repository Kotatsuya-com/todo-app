/**
 * NotificationSettings Service
 * 通知設定に関するビジネスロジックを担う
 */

import { NotificationSettingsRepositoryInterface } from '@/lib/repositories/NotificationSettingsRepository'
import {
  NotificationSettings,
  NotificationSettingsEntity,
  NotificationUpdateRequest,
  DEFAULT_NOTIFICATION_SETTINGS
} from '@/lib/entities/NotificationSettings'

export interface NotificationSettingsServiceResult<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface NotificationSettingsWithSummary {
  settings: NotificationSettings
  summary: {
    webhookNotifications: 'enabled' | 'disabled'
    isDefault: boolean
    lastUpdated?: string
  }
}

export class NotificationSettingsService {
  constructor(
    private _notificationRepo: NotificationSettingsRepositoryInterface
  ) {}

  /**
   * ユーザーの通知設定を取得
   * 設定が存在しない場合はデフォルト設定を返す
   */
  async getUserNotificationSettings(userId: string): Promise<NotificationSettingsServiceResult<NotificationSettingsWithSummary>> {
    try {
      const result = await this._notificationRepo.findByUserId(userId)

      if (result.error) {
        return {
          success: false,
          error: 'Failed to fetch notification settings',
          statusCode: 500
        }
      }

      // 設定が存在しない場合はデフォルト設定を返す
      let settings: NotificationSettings
      if (!result.data) {
        settings = {
          user_id: userId,
          ...DEFAULT_NOTIFICATION_SETTINGS
        }
      } else {
        settings = result.data
      }

      const entity = new NotificationSettingsEntity(settings)

      return {
        success: true,
        data: {
          settings,
          summary: entity.getSettingsSummary()
        },
        error: undefined
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
   * ユーザーの通知設定を更新
   */
  async updateUserNotificationSettings(
    userId: string,
    updateRequest: NotificationUpdateRequest
  ): Promise<NotificationSettingsServiceResult<{ message: string; settings: NotificationSettings }>> {
    try {
      // バリデーション
      const validation = NotificationSettingsEntity.validateNotificationUpdateRequest(updateRequest)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', '),
          statusCode: 400
        }
      }

      // 設定を更新
      const settingsToUpdate = NotificationSettingsEntity.createFromUpdateRequest(userId, updateRequest)
      const result = await this._notificationRepo.update(userId, settingsToUpdate)

      if (result.error) {
        return {
          success: false,
          error: 'Failed to update notification settings',
          statusCode: 500
        }
      }

      if (!result.data) {
        return {
          success: false,
          error: 'Failed to update notification settings - no data returned',
          statusCode: 500
        }
      }

      return {
        success: true,
        data: {
          message: 'Notification preferences updated successfully',
          settings: result.data
        },
        error: undefined
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
   * ユーザーの通知設定をデフォルトにリセット
   */
  async resetUserNotificationSettings(
    userId: string
  ): Promise<NotificationSettingsServiceResult<{ message: string; settings: NotificationSettings }>> {
    try {
      // デフォルト設定で更新
      const defaultSettings = NotificationSettingsEntity.createWithDefaults(userId)
      const result = await this._notificationRepo.update(userId, defaultSettings)

      if (result.error) {
        return {
          success: false,
          error: 'Failed to reset notification settings',
          statusCode: 500
        }
      }

      if (!result.data) {
        return {
          success: false,
          error: 'Failed to reset notification settings - no data returned',
          statusCode: 500
        }
      }

      return {
        success: true,
        data: {
          message: 'Notification settings reset to default',
          settings: result.data
        },
        error: undefined
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
   * デフォルト設定を取得
   */
  getDefaultSettings(): typeof DEFAULT_NOTIFICATION_SETTINGS {
    return DEFAULT_NOTIFICATION_SETTINGS
  }

  /**
   * 通知設定の統計情報を取得（管理者用）
   */
  async getNotificationStats(): Promise<NotificationSettingsServiceResult<{
    totalUsers: number
    enabledUsers: number
    disabledUsers: number
    enabledPercentage: number
  }>> {
    try {
      const result = await this._notificationRepo.getNotificationStats()

      if (result.error) {
        return {
          success: false,
          error: 'Failed to fetch notification statistics',
          statusCode: 500
        }
      }

      const stats = result.data!
      const enabledPercentage = stats.totalUsers > 0
        ? Math.round((stats.enabledUsers / stats.totalUsers) * 100)
        : 0

      return {
        success: true,
        data: {
          ...stats,
          enabledPercentage
        },
        error: undefined
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
   * 通知が有効なユーザーIDリストを取得
   */
  async getUsersWithNotificationsEnabled(): Promise<NotificationSettingsServiceResult<string[]>> {
    try {
      const result = await this._notificationRepo.findUsersWithNotificationsEnabled()

      if (result.error) {
        return {
          success: false,
          error: 'Failed to fetch users with notifications enabled',
          statusCode: 500
        }
      }

      return {
        success: true,
        data: result.data || [],
        error: undefined
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
   * ユーザーが通知を受信できるかどうかを確認
   */
  async canUserReceiveNotifications(userId: string): Promise<NotificationSettingsServiceResult<boolean>> {
    try {
      const result = await this._notificationRepo.findByUserId(userId)

      if (result.error) {
        return {
          success: false,
          error: 'Failed to check notification status',
          statusCode: 500
        }
      }

      // 設定が存在しない場合はデフォルト設定を使用
      const canReceive = result.data?.enable_webhook_notifications ?? DEFAULT_NOTIFICATION_SETTINGS.enable_webhook_notifications

      return {
        success: true,
        data: canReceive,
        error: undefined
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
