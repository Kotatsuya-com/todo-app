/**
 * UI Repository
 * コンポーネント層での外部API呼び出しを管理するリポジトリ
 */

import { ServiceResult } from '../services/WebhookService'
import { UIServiceRepository, SlackConnectionsData, SlackMessageData, TitleGenerationData } from '../services/UIService'

export class UIRepository implements UIServiceRepository {
  async checkSlackConnections(): Promise<ServiceResult<SlackConnectionsData>> {
    try {
      const response = await fetch('/api/slack/connections')

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.error || 'Failed to check Slack connections',
          statusCode: response.status
        }
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error during Slack connection check',
        statusCode: 500
      }
    }
  }

  async fetchSlackMessage(slackUrl: string): Promise<ServiceResult<SlackMessageData>> {
    try {
      const response = await fetch('/api/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slackUrl: slackUrl.trim() })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.error || errorData.details || 'Failed to fetch Slack message',
          statusCode: response.status
        }
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error during Slack message fetch',
        statusCode: 500
      }
    }
  }

  async generateTitle(content: string): Promise<ServiceResult<TitleGenerationData>> {
    try {
      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.error || 'Failed to generate title',
          statusCode: response.status
        }
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error during title generation',
        statusCode: 500
      }
    }
  }
}
