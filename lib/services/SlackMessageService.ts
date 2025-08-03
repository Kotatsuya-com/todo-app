/**
 * SlackMessageService
 * Slackメッセージ取得のビジネスロジックを担う
 */

import { SlackRepositoryInterface } from '@/lib/repositories/SlackRepository'
import { SlackMessageEntity, SlackConnectionMatch } from '@/lib/entities/SlackMessage'
import { getSlackMessageFromUrl } from '@/lib/slack-message'
import { slackLogger } from '@/lib/logger'

export interface SlackMessageServiceResult<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface SlackMessageResponse {
  text: string
  user: string
  timestamp: string
  channel: string
  url: string
  workspace: string
}

export class SlackMessageService {
  constructor(
    private _slackRepo: SlackRepositoryInterface
  ) {}

  /**
   * Slackメッセージ取得の全体フローを処理
   */
  async retrieveMessage(
    slackUrl: string,
    userId: string
  ): Promise<SlackMessageServiceResult<SlackMessageResponse>> {
    try {
      // 1. リクエストの検証
      const messageEntity = SlackMessageEntity.fromRequest(slackUrl, userId)
      const validation = messageEntity.validateRequest()

      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', '),
          statusCode: 400
        }
      }

      // 2. ユーザーの存在確認
      const userValidation = await this.validateUserExists(userId)
      if (!userValidation.success) {
        return {
          success: false,
          error: userValidation.error,
          statusCode: userValidation.statusCode
        }
      }

      // 3. ユーザーのSlack接続を取得
      const connectionsResult = await this.getUserConnections(userId)
      if (!connectionsResult.success) {
        return {
          success: false,
          error: connectionsResult.error,
          statusCode: connectionsResult.statusCode
        }
      }

      const connections = connectionsResult.data!

      // 4. 最適な接続を選択
      const selectedConnection = messageEntity.findBestConnection(connections)
      if (!selectedConnection) {
        return {
          success: false,
          error: 'Slackワークスペースに接続されていません。設定画面で接続してください。',
          statusCode: 400
        }
      }

      // 5. 接続選択をログに記録
      this.logConnectionSelection(messageEntity, connections, selectedConnection)

      // 6. メッセージを取得
      const messageResult = await this.fetchSlackMessage(slackUrl, selectedConnection.access_token)
      if (!messageResult.success) {
        return {
          success: false,
          error: messageResult.error,
          statusCode: 404
        }
      }

      // 7. レスポンスデータを作成
      const responseData = messageEntity.createMessageData(messageResult.data, selectedConnection)

      return {
        success: true,
        data: responseData
      }
    } catch (error) {
      slackLogger.error({ error, slackUrl }, 'Slack message retrieval error')
      return {
        success: false,
        error: 'Slackメッセージの取得に失敗しました',
        statusCode: 500
      }
    }
  }

  /**
   * ユーザーの存在を確認
   */
  private async validateUserExists(userId: string): Promise<SlackMessageServiceResult<void>> {
    try {
      const result = await this._slackRepo.findUserWithSettings(userId)

      if (result.error) {
        if ((result.error as any).code === 'PGRST116') {
          return {
            success: false,
            error: 'User not found',
            statusCode: 401
          }
        }
        return {
          success: false,
          error: 'Failed to validate user',
          statusCode: 500
        }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error during user validation',
        statusCode: 500
      }
    }
  }

  /**
   * ユーザーのSlack接続を取得
   */
  private async getUserConnections(userId: string): Promise<SlackMessageServiceResult<SlackConnectionMatch[]>> {
    try {
      const result = await this._slackRepo.findConnectionsByUserId(userId)

      if (result.error) {
        return {
          success: false,
          error: 'Failed to fetch Slack connections',
          statusCode: 500
        }
      }

      if (!result.data || result.data.length === 0) {
        return {
          success: false,
          error: 'Slackワークスペースに接続されていません。設定画面で接続してください。',
          statusCode: 400
        }
      }

      // 必要なフィールドのみを含むデータに変換
      const connections: SlackConnectionMatch[] = result.data.map(conn => ({
        workspace_id: conn.workspace_id,
        workspace_name: conn.workspace_name,
        team_name: conn.team_name,
        access_token: conn.access_token
      }))

      return {
        success: true,
        data: connections
      }
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error during connection lookup',
        statusCode: 500
      }
    }
  }

  /**
   * Slackメッセージを取得
   */
  private async fetchSlackMessage(
    slackUrl: string,
    accessToken: string
  ): Promise<SlackMessageServiceResult<any>> {
    try {
      const messageResult = await getSlackMessageFromUrl(slackUrl, accessToken)

      if (!messageResult) {
        return {
          success: false,
          error: 'メッセージが見つかりませんでした。Slackメッセージへのアクセス権限がないか、メッセージが削除されている可能性があります。'
        }
      }

      return {
        success: true,
        data: messageResult
      }
    } catch (error) {
      slackLogger.error({ error, slackUrl }, 'Failed to fetch Slack message')
      return {
        success: false,
        error: 'Failed to fetch message from Slack API'
      }
    }
  }

  /**
   * 接続選択をログに記録
   */
  private logConnectionSelection(
    messageEntity: SlackMessageEntity,
    connections: SlackConnectionMatch[],
    selectedConnection: SlackConnectionMatch
  ): void {
    const selectionInfo = messageEntity.getConnectionSelectionInfo(connections, selectedConnection)

    if (selectionInfo.selectionReason === 'fallback') {
      slackLogger.warn({
        urlWorkspace: selectionInfo.urlWorkspace,
        availableWorkspaces: connections.map(c => ({
          id: c.workspace_id,
          name: c.workspace_name,
          team: c.team_name
        }))
      }, 'No matching workspace found, using first connection')
    }

    slackLogger.debug({
      urlWorkspace: selectionInfo.urlWorkspace,
      selectedWorkspace: selectionInfo.selectedWorkspace,
      totalConnections: selectionInfo.totalConnections,
      selectionReason: selectionInfo.selectionReason
    }, 'Selected Slack connection')
  }
}
