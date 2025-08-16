/**
 * Service layer mocks
 * 新しいアーキテクチャのサービス層をモック化
 */

import { SlackServiceResult, WebhookProcessingResult } from '@/lib/services/SlackService'
import { SlackEventPayload } from '@/src/domain/types'

export class MockSlackService {
  private mockResults: any[] = []
  private callIndex = 0

  constructor(mockResults: any[] = []) {
    this.mockResults = mockResults
    this.callIndex = 0
  }

  setMockResults(results: any[]) {
    this.mockResults = results
    this.callIndex = 0
  }

  private getNextResult(): any {
    if (this.callIndex >= this.mockResults.length) {
      // デフォルトの成功レスポンス
      return {
        success: true,
        data: {
          message: 'Event received and queued for processing'
        }
      }
    }
    const result = this.mockResults[this.callIndex]
    this.callIndex++
    return result
  }

  async processWebhookEvent(
    webhookId: string,
    payload: SlackEventPayload
  ): Promise<SlackServiceResult<WebhookProcessingResult>> {
    return this.getNextResult()
  }

  async getConnections(userId: string): Promise<SlackServiceResult<any[]>> {
    return this.getNextResult()
  }

  async deleteConnection(connectionId: string, userId: string): Promise<SlackServiceResult<void>> {
    return this.getNextResult()
  }

  async getWebhooks(userId: string): Promise<SlackServiceResult<any[]>> {
    return this.getNextResult()
  }

  async createWebhook(userId: string, slackConnectionId: string, request: any): Promise<SlackServiceResult<any>> {
    return this.getNextResult()
  }

  async deactivateWebhook(webhookId: string, userId: string): Promise<SlackServiceResult<void>> {
    return this.getNextResult()
  }
}

// テスト用のレスポンス生成ヘルパー
export const createSlackServiceSuccess = <T>(data: T): SlackServiceResult<T> => ({
  success: true,
  data
})

export const createSlackServiceError = (error: string, statusCode: number = 500): SlackServiceResult<any> => ({
  success: false,
  error,
  statusCode
})

// 特定のテストケース用のレスポンス
export const webhookNotFoundResponse = (): SlackServiceResult<WebhookProcessingResult> => ({
  success: false,
  error: 'Webhook not found',
  statusCode: 404
})

export const eventAlreadyProcessedResponse = (existingTodoId: string): SlackServiceResult<WebhookProcessingResult> => ({
  success: true,
  data: {
    message: 'Event already processed',
    existingTodoId
  }
})

export const userMismatchResponse = (): SlackServiceResult<WebhookProcessingResult> => ({
  success: true,
  data: {
    message: 'Reaction ignored - only the webhook owner can create tasks'
  }
})

export const slackUserIdNotConfiguredResponse = (): SlackServiceResult<WebhookProcessingResult> => ({
  success: false,
  error: 'Slack User ID not configured. Please set your Slack User ID in the settings.',
  statusCode: 400
})

export const emojiNotConfiguredResponse = (): SlackServiceResult<WebhookProcessingResult> => ({
  success: true,
  data: {
    message: 'Emoji not configured for task creation'
  }
})

export const eventQueuedResponse = (): SlackServiceResult<WebhookProcessingResult> => ({
  success: true,
  data: {
    message: 'Event received and queued for processing'
  }
})
