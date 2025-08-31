/**
 * Slack Service
 * Slack関連のビジネスロジックを担う
 */

import { SlackRepositoryInterface } from '@/lib/repositories/SlackRepository'
import { TodoRepositoryInterface } from '@/lib/repositories/TodoRepository'
import {
  SlackConnection,
  SlackWebhook,
  SlackWebhookEntity
} from '@/lib/entities/SlackConnection'
import { UserWithSettings, UserEmojiSettings } from '@/lib/entities/User'
import { TodoEntity, Urgency } from '@/lib/entities/Todo'
import { SlackEventPayload, SlackReactionEvent } from '@/src/domain/types'
import { getSlackMessage } from '@/lib/slack-message'
import { generateTaskTitle } from '@/lib/openai-title'
import { getAppBaseUrl } from '@/lib/ngrok-url'
import { NextRequest } from 'next/server'
import { slackLogger } from '@/lib/logger'

// デフォルト絵文字設定（ユーザー設定がない場合のフォールバック）
const DEFAULT_EMOJI_SETTINGS = {
  id: 'default',
  user_id: 'default',
  today_emoji: 'fire',
  tomorrow_emoji: 'calendar',
  later_emoji: 'memo',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

export interface SlackServiceResult<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface WebhookProcessingResult {
  message: string
  existingTodoId?: string
  todoId?: string
}

export class SlackService {
  constructor(
    private _slackRepo: SlackRepositoryInterface,
    private _todoRepo: TodoRepositoryInterface
  ) {}

  // Slack Connections
  async getConnections(userId: string): Promise<SlackServiceResult<SlackConnection[]>> {
    const result = await this._slackRepo.findConnectionsByUserId(userId)

    if (result.error) {
      return {
        success: false,
        error: 'Failed to fetch connections',
        statusCode: 500
      }
    }

    return {
      success: true,
      data: result.data
    }
  }

  async deleteConnection(connectionId: string, userId: string): Promise<SlackServiceResult<void>> {
    const result = await this._slackRepo.deleteConnection(connectionId, userId)

    if (result.error) {
      return {
        success: false,
        error: 'Failed to delete connection',
        statusCode: 500
      }
    }

    return {
      success: true
    }
  }

  // Slack Webhooks
  async getWebhooks(userId: string): Promise<SlackServiceResult<any[]>> {
    const result = await this._slackRepo.findWebhooksByUserId(userId)

    if (result.error) {
      return {
        success: false,
        error: 'Failed to fetch webhooks',
        statusCode: 500
      }
    }

    return {
      success: true,
      data: result.data
    }
  }

  async createWebhook(
    userId: string,
    slackConnectionId: string,
    request: NextRequest
  ): Promise<SlackServiceResult<{ webhook: SlackWebhook; webhook_url: string; message: string }>> {
    // Slack接続の存在確認
    const connectionResult = await this._slackRepo.findConnectionById(slackConnectionId)

    if (connectionResult.error || !connectionResult.data) {
      return {
        success: false,
        error: 'Slack connection not found',
        statusCode: 404
      }
    }

    const connection = connectionResult.data
    if (connection.user_id !== userId) {
      return {
        success: false,
        error: 'Unauthorized',
        statusCode: 401
      }
    }

    // 既存のwebhookがあるかチェック
    const existingResult = await this._slackRepo.findWebhookByConnectionId(userId, slackConnectionId)

    if (existingResult.data) {
      // 既存のwebhookを再有効化
      const webhookEntity = SlackWebhookEntity.fromPlainObject(existingResult.data)
      const reactivatedWebhook = webhookEntity.activate()

      const updateResult = await this._slackRepo.updateWebhook(
        existingResult.data.id,
        reactivatedWebhook.toPlainObject()
      )

      if (updateResult.error) {
        return {
          success: false,
          error: 'Failed to reactivate webhook',
          statusCode: 500
        }
      }

      const webhookUrl = `${getAppBaseUrl(request)}/api/slack/events/user/${existingResult.data.webhook_id}`

      return {
        success: true,
        data: {
          webhook: updateResult.data!,
          webhook_url: webhookUrl,
          message: 'Webhook reactivated successfully'
        }
      }
    }

    // 新しいwebhookを作成
    const newWebhookResult = await this._slackRepo.createWebhook({
      user_id: userId,
      slack_connection_id: slackConnectionId,
      webhook_id: '', // RPCで生成される
      webhook_secret: '', // RPCで生成される
      is_active: true,
      event_count: 0
    })

    if (newWebhookResult.error || !newWebhookResult.data) {
      return {
        success: false,
        error: 'Failed to create webhook',
        statusCode: 500
      }
    }

    const webhookUrl = `${getAppBaseUrl(request)}/api/slack/events/user/${newWebhookResult.data.webhook_id}`

    return {
      success: true,
      data: {
        webhook: newWebhookResult.data,
        webhook_url: webhookUrl,
        message: 'Webhook created successfully'
      }
    }
  }

  async deactivateWebhook(webhookId: string, userId: string): Promise<SlackServiceResult<void>> {
    // 1. Webhookの所有者確認
    const webhookResult = await this._slackRepo.findWebhookById(webhookId)
    if (!webhookResult || webhookResult.error || !webhookResult.data) {
      return {
        success: false,
        error: webhookResult?.error?.message || 'Webhook not found',
        statusCode: 404
      }
    }

    // 2. ユーザー所有権の確認
    const webhook = webhookResult.data
    if (webhook.user_id !== userId) {
      return {
        success: false,
        error: 'Unauthorized access to webhook',
        statusCode: 403
      }
    }

    // 3. Webhook非アクティブ化
    const result = await this._slackRepo.updateWebhook(webhookId, {
      is_active: false,
      updated_at: new Date().toISOString()
    })

    if (result.error) {
      return {
        success: false,
        error: 'Failed to deactivate webhook',
        statusCode: 500
      }
    }

    return {
      success: true
    }
  }

  // Webhook Event Processing
  async processWebhookEvent(
    webhookId: string,
    payload: SlackEventPayload
  ): Promise<SlackServiceResult<WebhookProcessingResult>> {
    try {
      // webhook設定を取得
      const webhookResult = await this._slackRepo.findWebhookById(webhookId)

      if (!webhookResult || webhookResult.error || !webhookResult.data) {
        return {
          success: false,
          error: 'Webhook not found',
          statusCode: 404
        }
      }

      const webhook = webhookResult.data

      // ユーザー情報と絵文字設定を取得
      const userResult = await this._slackRepo.findUserWithSettings(webhook.user_id)

      if (!userResult || userResult.error) {
        slackLogger.error({
          error: userResult?.error,
          webhookId,
          userId: webhook.user_id
        }, 'Failed to fetch user data for webhook processing')

        return {
          success: false,
          error: 'Failed to fetch user data',
          statusCode: 500
        }
      }

      const userWithSettings = userResult.data

      // 追加でユーザーのSlack User IDを取得
      const slackUserIdResult = await this._slackRepo.getDirectSlackUserId(webhook.user_id)
      const userSlackId = userWithSettings?.slack_user_id || slackUserIdResult?.data?.slack_user_id || null

      // Slack接続情報を取得
      const connectionResult = await this._slackRepo.findConnectionById(webhook.slack_connection_id)

      if (!connectionResult || connectionResult.error || !connectionResult.data) {
        slackLogger.error({
          error: connectionResult?.error,
          webhookId,
          slackConnectionId: webhook.slack_connection_id,
          userId: webhook.user_id
        }, 'Failed to fetch Slack connection for webhook processing')

        return {
          success: false,
          error: 'Slack connection not found',
          statusCode: 500
        }
      }

      const slackConnection = connectionResult.data

      // イベント処理
      if (payload.type === 'event_callback' && payload.event.type === 'reaction_added') {
        return await this.processReactionEvent(
          payload.event,
          webhook,
          userSlackId,
          userWithSettings,
          slackConnection
        )
      }

      return {
        success: true,
        data: {
          message: 'Event received and queued for processing'
        }
      }

    } catch (error) {
      slackLogger.error({
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        webhookId,
        payload: {
          type: payload.type,
          eventType: payload.event?.type
        }
      }, 'Unhandled error in webhook event processing')

      return {
        success: false,
        error: error instanceof Error ? `Processing failed: ${error.message}` : 'Internal server error',
        statusCode: 500
      }
    }
  }

  private async processReactionEvent(
    event: SlackReactionEvent,
    webhook: SlackWebhook,
    userSlackId: string | null,
    userWithSettings: UserWithSettings | null,
    slackConnection: SlackConnection
  ): Promise<SlackServiceResult<WebhookProcessingResult>> {
    // ユーザー検証
    if (!userSlackId) {
      return {
        success: false,
        error: 'Slack User ID not configured. Please set your Slack User ID in the settings.',
        statusCode: 400
      }
    }

    if (event.user !== userSlackId) {
      return {
        success: true,
        data: {
          message: 'Reaction ignored - only the webhook owner can create tasks'
        }
      }
    }

    // イベント重複チェック
    const eventKey = `${event.item.channel}:${event.item.ts}:${event.reaction}:${event.user}`
    const existingEventResult = await this._slackRepo.findProcessedEvent(eventKey)

    if (existingEventResult && existingEventResult.data) {
      return {
        success: true,
        data: {
          message: 'Event already processed',
          existingTodoId: existingEventResult.data.todo_id
        }
      }
    }

    // ユーザーの絵文字設定を取得
    let userEmojiSettings = DEFAULT_EMOJI_SETTINGS

    if (userWithSettings?.user_emoji_settings && Array.isArray(userWithSettings.user_emoji_settings) && userWithSettings.user_emoji_settings.length > 0) {
      userEmojiSettings = userWithSettings.user_emoji_settings[0]
    } else if (userWithSettings?.user_emoji_settings && !Array.isArray(userWithSettings.user_emoji_settings)) {
      userEmojiSettings = userWithSettings.user_emoji_settings as any
    }

    const taskEmojis = [
      userEmojiSettings.today_emoji,
      userEmojiSettings.tomorrow_emoji,
      userEmojiSettings.later_emoji
    ]

    // 対象絵文字かチェック
    if (!taskEmojis.includes(event.reaction)) {
      return {
        success: true,
        data: {
          message: 'Emoji not configured for task creation'
        }
      }
    }

    // 非同期でタスク処理を実行
    this.processReactionEventAsync(
      event,
      webhook,
      userEmojiSettings,
      slackConnection,
      eventKey,
      userWithSettings?.enable_webhook_notifications ?? true
    ).catch((error) => {
      slackLogger.error({
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        eventKey,
        webhookId: webhook.id,
        userId: webhook.user_id,
        reaction: event.reaction,
        channel: event.item.channel,
        messageTs: event.item.ts
      }, 'Background task processing failed - this should not prevent webhook response')
    })

    return {
      success: true,
      data: {
        message: 'Event received and queued for processing'
      }
    }
  }

  private async processReactionEventAsync(
    event: SlackReactionEvent,
    webhook: SlackWebhook,
    emojiSettings: UserEmojiSettings,
    slackConnection: SlackConnection,
    eventKey: string,
    _notificationsEnabled: boolean
  ): Promise<string | null> {
    try {
      slackLogger.info({
        eventKey,
        userId: webhook.user_id,
        webhookId: webhook.id,
        reaction: event.reaction,
        channel: event.item.channel,
        messageTs: event.item.ts
      }, 'Starting background task processing')

      // メッセージ内容を取得
      slackLogger.info({ channel: event.item.channel, ts: event.item.ts }, 'Fetching Slack message content')
      const messageData = await getSlackMessage(event.item.channel, event.item.ts, slackConnection.access_token)

      if (!messageData?.text) {
        slackLogger.warn({ messageData }, 'No message text found - skipping task creation')
        return null
      }

      slackLogger.info({ messageLength: messageData.text.length, messagePreview: messageData.text.substring(0, 100) }, 'Successfully fetched message content')

      // タイトルを自動生成
      let title: string
      try {
        slackLogger.info({ messageText: messageData.text.substring(0, 100) }, 'Generating task title with OpenAI')
        title = await generateTaskTitle(messageData.text)
        slackLogger.info({ generatedTitle: title }, 'Successfully generated task title')
      } catch (error) {
        title = `Slack reaction: ${event.reaction}`
        slackLogger.warn({ error, fallbackTitle: title }, 'Failed to generate title, using fallback')
      }

      // 緊急度を絵文字から決定
      let urgency: Urgency = 'later'
      if (event.reaction === emojiSettings.today_emoji) {
        urgency = 'today'
      } else if (event.reaction === emojiSettings.tomorrow_emoji) {
        urgency = 'tomorrow'
      } else if (event.reaction === emojiSettings.later_emoji) {
        urgency = 'later'
      }

      slackLogger.info({
        reaction: event.reaction,
        mappedUrgency: urgency,
        emojiSettings: {
          today: emojiSettings.today_emoji,
          tomorrow: emojiSettings.tomorrow_emoji,
          later: emojiSettings.later_emoji
        }
      }, 'Mapped reaction to urgency level')

      // Todoエンティティを作成
      const todoData = TodoEntity.createNew({
        user_id: webhook.user_id,
        title,
        body: messageData.text,
        urgency,
        created_via: 'slack_webhook'
      })

      slackLogger.info({
        todoData: {
          user_id: todoData.user_id,
          title: todoData.title,
          importance_score: todoData.importance_score,
          deadline: todoData.deadline,
          created_via: todoData.created_via,
          status: todoData.status
        },
        originalUrgency: urgency
      }, 'Created TodoEntity')

      // タスクを作成 - データベース関数を使用してリアルタイム通知に対応
      slackLogger.info({
        rpcParams: {
          p_user_id: webhook.user_id,
          p_title: title,
          p_body: messageData.text.substring(0, 100),
          p_deadline: todoData.deadline,
          p_importance_score: todoData.importance_score,
          p_status: 'open',
          p_created_via: 'slack_webhook'
        }
      }, 'Attempting to create todo via RPC function')

      let newTodo
      try {
        const todoResult = await this._todoRepo.createViaRPC({
          p_user_id: webhook.user_id,
          p_title: title,
          p_body: messageData.text,
          p_deadline: todoData.deadline,
          p_importance_score: todoData.importance_score,
          p_status: 'open',
          p_created_via: 'slack_webhook'
        })

        if (!todoResult || todoResult.error || !todoResult.data) {
          slackLogger.warn({
            error: todoResult?.error instanceof Error
              ? { message: todoResult.error.message, stack: todoResult.error.stack }
              : todoResult?.error || 'Unknown RPC error'
          }, 'RPC creation failed, attempting fallback method')

          // フォールバック: 従来の方法を使用
          const fallbackResult = await this._todoRepo.create(todoData)
          if (!fallbackResult || fallbackResult.error || !fallbackResult.data) {
            slackLogger.error({
              fallbackError: fallbackResult?.error instanceof Error
                ? { message: fallbackResult.error.message, stack: fallbackResult.error.stack }
                : fallbackResult?.error || 'Unknown fallback error'
            }, 'Both RPC and fallback creation failed')
            throw new Error(`Failed to create todo: RPC error - ${todoResult?.error instanceof Error ? todoResult.error.message : 'Unknown RPC error'}, Fallback error - ${fallbackResult?.error instanceof Error ? fallbackResult.error.message : 'Unknown fallback error'}`)
          }
          newTodo = fallbackResult.data!
          slackLogger.info({ todoId: newTodo.id }, 'Successfully created todo via fallback method')
        } else {
          newTodo = todoResult.data!
          slackLogger.info({ todoId: newTodo.id }, 'Successfully created todo via RPC method')
        }
      } catch (error) {
        slackLogger.warn({
          error: error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error
        }, 'RPC creation threw exception, attempting fallback method')

        // フォールバック: 従来の方法を使用
        const fallbackResult = await this._todoRepo.create(todoData)
        if (!fallbackResult || fallbackResult.error || !fallbackResult.data) {
          slackLogger.error({
            fallbackError: fallbackResult?.error instanceof Error
              ? { message: fallbackResult.error.message, stack: fallbackResult.error.stack }
              : fallbackResult?.error || 'Unknown fallback error'
          }, 'Both RPC and fallback creation failed')
          throw new Error(`Failed to create todo: RPC threw exception - ${error instanceof Error ? error.message : 'Unknown exception'}, Fallback error - ${fallbackResult?.error instanceof Error ? fallbackResult.error.message : 'Unknown fallback error'}`)
        }
        newTodo = fallbackResult.data!
        slackLogger.info({ todoId: newTodo.id }, 'Successfully created todo via fallback method after RPC exception')
      }

      // イベント処理完了を記録（重複防止用）
      slackLogger.info({ eventKey, todoId: newTodo.id }, 'Recording processed event')
      try {
        await this._slackRepo.createProcessedEvent({
          event_key: eventKey,
          user_id: webhook.user_id,
          channel_id: event.item.channel,
          message_ts: event.item.ts,
          reaction: event.reaction,
          todo_id: newTodo.id
        })
        slackLogger.info({ eventKey }, 'Successfully recorded processed event')
      } catch (error) {
        slackLogger.error({
          error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
          eventKey,
          todoId: newTodo.id
        }, 'Failed to record processed event - this may allow duplicate processing')
      }

      // Webhook統計を更新
      slackLogger.info({ webhookId: webhook.id, newEventCount: webhook.event_count + 1 }, 'Updating webhook statistics')
      try {
        await this._slackRepo.updateWebhookStats(webhook.id, webhook.event_count + 1)
        slackLogger.info({ webhookId: webhook.id }, 'Successfully updated webhook statistics')
      } catch (error) {
        slackLogger.error({
          error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
          webhookId: webhook.id
        }, 'Failed to update webhook statistics - this is non-critical')
      }

      slackLogger.info({
        todoId: newTodo.id,
        eventKey,
        processingTime: Date.now()
      }, 'Background task processing completed successfully')

      return newTodo.id

    } catch (error) {
      slackLogger.error({
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        eventKey,
        webhookId: webhook.id,
        userId: webhook.user_id
      }, 'Error processing reaction event in background task')
      throw error
    }
  }
}
