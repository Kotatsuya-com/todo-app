/**
 * UI Service
 * コンポーネント層での外部API呼び出しを管理する依存性注入対応サービス
 */

import { ServiceResult } from './WebhookService'

export interface SlackConnection {
  id: string
  workspace_name: string
  team_name: string
  created_at: string
}

export interface SlackConnectionsData {
  connections: SlackConnection[]
}

export interface SlackMessageData {
  text: string
  url: string
  workspace?: string
  user?: any
  channel?: any
}

export interface TitleGenerationData {
  title: string
}

export interface UIServiceInterface {
  // Slack connection check
  checkSlackConnections(): Promise<ServiceResult<SlackConnectionsData>>

  // Slack message retrieval
  fetchSlackMessage(_slackUrl: string): Promise<ServiceResult<SlackMessageData>>

  // Title generation
  generateTitle(_content: string): Promise<ServiceResult<TitleGenerationData>>
}

export interface UIServiceRepository {
  checkSlackConnections(): Promise<ServiceResult<SlackConnectionsData>>
  fetchSlackMessage(_slackUrl: string): Promise<ServiceResult<SlackMessageData>>
  generateTitle(_content: string): Promise<ServiceResult<TitleGenerationData>>
}

export class UIService implements UIServiceInterface {
  constructor(private _repository: UIServiceRepository) {}

  async checkSlackConnections(): Promise<ServiceResult<SlackConnectionsData>> {
    try {
      const result = await this._repository.checkSlackConnections()

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to check Slack connections',
          statusCode: result.statusCode || 500
        }
      }

      return { success: true, data: result.data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check Slack connections',
        statusCode: 500
      }
    }
  }

  async fetchSlackMessage(slackUrl: string): Promise<ServiceResult<SlackMessageData>> {
    try {
      if (!slackUrl || !slackUrl.trim()) {
        return {
          success: false,
          error: 'Slack URL is required',
          statusCode: 400
        }
      }

      const result = await this._repository.fetchSlackMessage(slackUrl)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to fetch Slack message',
          statusCode: result.statusCode || 500
        }
      }

      return { success: true, data: result.data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Slack message',
        statusCode: 500
      }
    }
  }

  async generateTitle(content: string): Promise<ServiceResult<TitleGenerationData>> {
    try {
      if (!content || !content.trim()) {
        return {
          success: false,
          error: 'Content is required for title generation',
          statusCode: 400
        }
      }

      const result = await this._repository.generateTitle(content)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to generate title',
          statusCode: result.statusCode || 500
        }
      }

      return { success: true, data: result.data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate title',
        statusCode: 500
      }
    }
  }
}
