/**
 * SlackConnectionService
 * Slack連携管理に関するビジネスロジックを担う
 */

import { SlackRepositoryInterface } from '@/lib/repositories/SlackRepository'
import {
  SlackConnection,
  SlackConnectionEntity
} from '@/lib/entities/SlackConnection'

export interface SlackConnectionServiceResult<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface SlackConnectionSummary {
  connections: SlackConnection[]
  totalCount: number
  workspaceNames: string[]
  hasActiveConnections: boolean
}

export interface SlackConnectionDeletionResult {
  success: boolean
  message: string
  deletedConnection?: SlackConnection
}

export class SlackConnectionService {
  constructor(
    private _slackRepo: SlackRepositoryInterface
  ) {}

  /**
   * ユーザーのSlack接続一覧を取得
   */
  async getUserConnections(userId: string): Promise<SlackConnectionServiceResult<SlackConnectionSummary>> {
    try {
      const result = await this._slackRepo.findConnectionsByUserId(userId)

      if (result.error) {
        return {
          success: false,
          error: 'Failed to fetch connections',
          statusCode: 500
        }
      }

      const connections = result.data
      const summary: SlackConnectionSummary = {
        connections,
        totalCount: connections.length,
        workspaceNames: connections.map(conn => conn.workspace_name),
        hasActiveConnections: connections.length > 0
      }

      return {
        success: true,
        data: summary
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
   * ユーザーのSlack接続を削除
   */
  async deleteUserConnection(
    connectionId: string,
    userId: string
  ): Promise<SlackConnectionServiceResult<SlackConnectionDeletionResult>> {
    try {
      // 接続の存在と所有権を検証
      const validationResult = await this.validateConnectionOwnership(connectionId, userId)
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error,
          statusCode: validationResult.statusCode
        }
      }

      const connectionToDelete = validationResult.data!

      // 接続を削除
      const deleteResult = await this._slackRepo.deleteConnection(connectionId, userId)

      if (deleteResult.error) {
        return {
          success: false,
          error: 'Failed to delete connection',
          statusCode: 500
        }
      }

      return {
        success: true,
        data: {
          success: true,
          message: `Successfully deleted connection to ${connectionToDelete.workspace_name}`,
          deletedConnection: connectionToDelete
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
   * 接続の所有権を検証
   */
  async validateConnectionOwnership(
    connectionId: string,
    userId: string
  ): Promise<SlackConnectionServiceResult<SlackConnection>> {
    try {
      const result = await this._slackRepo.findConnectionById(connectionId)

      if (result.error) {
        return {
          success: false,
          error: 'Failed to verify connection ownership',
          statusCode: 500
        }
      }

      if (!result.data) {
        return {
          success: false,
          error: 'Connection not found',
          statusCode: 404
        }
      }

      const connection = result.data
      const entity = new SlackConnectionEntity(connection)

      if (entity.userId !== userId) {
        return {
          success: false,
          error: 'Unauthorized - connection belongs to different user',
          statusCode: 403
        }
      }

      return {
        success: true,
        data: connection
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
   * 特定の接続を取得
   */
  async getConnection(connectionId: string, userId: string): Promise<SlackConnectionServiceResult<SlackConnection>> {
    try {
      const validationResult = await this.validateConnectionOwnership(connectionId, userId)

      if (!validationResult.success) {
        return validationResult
      }

      return {
        success: true,
        data: validationResult.data
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
   * ユーザーが特定のワークスペースに接続しているかチェック
   */
  async hasWorkspaceConnection(userId: string, workspaceId: string): Promise<SlackConnectionServiceResult<boolean>> {
    try {
      const result = await this._slackRepo.findConnectionsByUserId(userId)

      if (result.error) {
        return {
          success: false,
          error: 'Failed to check workspace connection',
          statusCode: 500
        }
      }

      const hasConnection = result.data.some(conn => {
        const entity = new SlackConnectionEntity(conn)
        return entity.workspaceId === workspaceId
      })

      return {
        success: true,
        data: hasConnection
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
   * 接続の詳細な統計情報を取得
   */
  async getConnectionStats(userId: string): Promise<SlackConnectionServiceResult<{
    totalConnections: number
    validConnections: number
    workspaceTypes: string[]
    oldestConnection?: SlackConnection
    newestConnection?: SlackConnection
  }>> {
    try {
      const result = await this._slackRepo.findConnectionsByUserId(userId)

      if (result.error) {
        return {
          success: false,
          error: 'Failed to fetch connection statistics',
          statusCode: 500
        }
      }

      const connections = result.data
      const validConnections = connections.filter(conn => {
        const entity = new SlackConnectionEntity(conn)
        return entity.isValidWorkspaceId()
      })

      const workspaceTypes = Array.from(new Set(connections.map(conn => conn.team_name)))

      const sortedByDate = connections.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

      return {
        success: true,
        data: {
          totalConnections: connections.length,
          validConnections: validConnections.length,
          workspaceTypes,
          oldestConnection: sortedByDate[0],
          newestConnection: sortedByDate[sortedByDate.length - 1]
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
}
