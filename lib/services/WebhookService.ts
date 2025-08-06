/**
 * Webhook Service
 * Slack Webhook管理のビジネスロジックを担う
 */

import { SlackRepositoryInterface } from '@/lib/repositories/SlackRepository'
import { SlackWebhookEntity, SlackWebhook } from '@/lib/entities/SlackConnection'

export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface UserWebhooksResult {
  webhooks: Array<SlackWebhook & {
    slack_connections?: {
      workspace_name: string
      team_name: string
    }
  }>
}

export interface WebhookResult {
  webhook: SlackWebhook
  webhook_url: string
  message: string
}

export interface CreateWebhookParams {
  userId: string
  slackConnectionId: string
  appBaseUrl: string
}

export interface WebhookServiceInterface {
  getUserWebhooks(_userId: string): Promise<ServiceResult<UserWebhooksResult>>
  createUserWebhook(_params: CreateWebhookParams): Promise<ServiceResult<WebhookResult>>
  deactivateWebhook(_webhookId: string, _userId: string): Promise<ServiceResult<void>>
}

export class WebhookService implements WebhookServiceInterface {
  constructor(private _slackRepo: SlackRepositoryInterface) {}

  /**
   * ユーザーのWebhook一覧を取得
   */
  async getUserWebhooks(userId: string): Promise<ServiceResult<UserWebhooksResult>> {
    try {
      // ユーザーのWebhook一覧を取得（SlackRepositoryでJOINクエリは実行されないため、分離実装が必要）
      const webhooksResult = await this._slackRepo.findWebhooksByUserId(userId)

      if (webhooksResult.error) {
        return {
          success: false,
          error: webhooksResult.error.message || 'Failed to fetch webhooks',
          statusCode: 500
        }
      }

      return {
        success: true,
        data: {
          webhooks: webhooksResult.data || []
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
   * ユーザーのWebhookを作成または再有効化
   */
  async createUserWebhook(params: CreateWebhookParams): Promise<ServiceResult<WebhookResult>> {
    const { userId, slackConnectionId, appBaseUrl } = params

    try {
      // Slack接続の存在確認
      const connectionResult = await this._slackRepo.findConnectionById(slackConnectionId)
      if (connectionResult.error || !connectionResult.data) {
        return {
          success: false,
          error: 'Slack connection not found',
          statusCode: 404
        }
      }

      // 接続の所有者確認
      if (connectionResult.data!.user_id !== userId) {
        return {
          success: false,
          error: 'Unauthorized access to Slack connection',
          statusCode: 403
        }
      }

      // 既存のWebhookがあるかチェック
      const existingWebhookResult = await this._slackRepo.findWebhookByConnectionId(userId, slackConnectionId)

      if (!existingWebhookResult.error && existingWebhookResult.data) {
        // 既存のWebhookがある場合は再有効化
        const webhookEntity = SlackWebhookEntity.fromPlainObject(existingWebhookResult.data)
        const activatedWebhook = webhookEntity.activate()

        const updateResult = await this._slackRepo.updateWebhook(
          existingWebhookResult.data.id,
          { is_active: true }
        )

        if (updateResult.error) {
          return {
            success: false,
            error: 'Failed to reactivate webhook',
            statusCode: 500
          }
        }

        const webhookUrl = `${appBaseUrl}/api/slack/events/user/${existingWebhookResult.data.webhook_id}`

        return {
          success: true,
          data: {
            webhook: activatedWebhook.toPlainObject(),
            webhook_url: webhookUrl,
            message: 'Webhook reactivated successfully'
          }
        }
      }

      // 新しいWebhookを作成
      const createResult = await this._slackRepo.createWebhook({
        user_id: userId,
        slack_connection_id: slackConnectionId,
        webhook_id: '', // RPC関数で生成される
        webhook_secret: '', // RPC関数で生成される
        is_active: true,
        event_count: 0,
        last_event_at: null
      })

      if (createResult.error || !createResult.data) {
        return {
          success: false,
          error: 'Failed to create webhook',
          statusCode: 500
        }
      }

      const webhookUrl = `${appBaseUrl}/api/slack/events/user/${createResult.data.webhook_id}`

      return {
        success: true,
        data: {
          webhook: createResult.data,
          webhook_url: webhookUrl,
          message: 'Webhook created successfully'
        },
        statusCode: 201
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
   * Webhookを非有効化
   */
  async deactivateWebhook(webhookId: string, userId: string): Promise<ServiceResult<void>> {
    try {
      // Webhookの存在確認と所有者確認
      const webhooksResult = await this._slackRepo.findWebhooksByUserId(userId)

      if (webhooksResult.error) {
        return {
          success: false,
          error: webhooksResult.error.message || 'Failed to fetch user webhooks',
          statusCode: 500
        }
      }

      const webhook = webhooksResult.data?.find(w => w.id === webhookId)
      if (!webhook) {
        return {
          success: false,
          error: 'Webhook not found or access denied',
          statusCode: 404
        }
      }

      // Webhookを非有効化
      const updateResult = await this._slackRepo.updateWebhook(webhookId, { is_active: false })

      if (updateResult.error) {
        return {
          success: false,
          error: 'Failed to deactivate webhook',
          statusCode: 500
        }
      }

      return {
        success: true,
        data: undefined
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
