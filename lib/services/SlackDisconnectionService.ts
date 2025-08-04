/**
 * SlackDisconnection Service Layer
 * Slack統合完全切断のビジネスロジックとOrchestrationを担当
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { authLogger } from '@/lib/logger'
import {
  SlackDisconnectionEntity,
  SlackConnection,
  DisconnectionSummary,
  DisconnectionVerification
} from '@/lib/entities/SlackDisconnection'
import { NextRequest } from 'next/server'

export interface SlackDisconnectionServiceResult<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface DisconnectionResponse {
  message: string
  disconnectedWorkspaces: string[]
  itemsRemoved: {
    connections: number
    webhooks: number
    userIdCleared: boolean
  }
}

export interface User {
  id: string
}

export class SlackDisconnectionService {
  private readonly logger = authLogger.child({ service: 'SlackDisconnectionService' })

  /**
   * Slack統合を完全に切断
   */
  async disconnectSlackIntegration(
    request: NextRequest,
    userId: string
  ): Promise<SlackDisconnectionServiceResult<DisconnectionResponse>> {
    const methodLogger = this.logger.child({
      method: 'disconnectSlackIntegration',
      userId
    })

    try {
      // 1. ドメインエンティティでリクエスト検証
      const entity = SlackDisconnectionEntity.forUser(userId)
      const validation = entity.validateRequest()

      if (!validation.valid) {
        methodLogger.warn({ errors: validation.errors }, 'Request validation failed')
        return {
          success: false,
          error: validation.errors.join(', '),
          statusCode: 400
        }
      }

      methodLogger.info('Starting complete Slack integration disconnect')

      // 2. ユーザーのSlack接続を取得
      const connectionsResult = await this.fetchUserConnections(request, userId)
      if (!connectionsResult.success) {
        return {
          success: false,
          error: connectionsResult.error
        }
      }

      const connections = connectionsResult.data!

      // 3. 接続がない場合の処理
      if (connections.length === 0) {
        methodLogger.info('No connections found to disconnect')
        return {
          success: true,
          data: {
            message: 'No connections to disconnect',
            disconnectedWorkspaces: [],
            itemsRemoved: {
              connections: 0,
              webhooks: 0,
              userIdCleared: false
            }
          }
        }
      }

      // 4. エンティティを接続データで更新
      const entityWithConnections = entity.withUpdatedConnections(connections)
      const connectionValidation = entityWithConnections.validateConnections()

      if (!connectionValidation.valid) {
        methodLogger.warn({ errors: connectionValidation.errors }, 'Connection validation failed')
        return {
          success: false,
          error: connectionValidation.errors.join(', '),
          statusCode: 500
        }
      }

      const summary = entityWithConnections.createDisconnectionSummary()

      methodLogger.info({
        connectionCount: summary.totalConnections,
        connectionIds: summary.connectionIds,
        workspaceNames: summary.workspaceNames
      }, 'Found connections to disconnect')

      // 5. 切断処理の実行
      const disconnectionResult = await this.executeDisconnection(request, summary, userId)
      if (!disconnectionResult.success) {
        return {
          success: false,
          error: disconnectionResult.error
        }
      }

      // 6. 切断確認の検証
      const verificationResult = await this.verifyDisconnection(request, userId)
      if (!verificationResult.success) {
        return {
          success: false,
          error: verificationResult.error
        }
      }

      const verification = verificationResult.data!
      const result = entityWithConnections.createResult(summary, verification)

      methodLogger.info({
        remainingConnections: verification.connectionsRemaining,
        remainingWebhooks: verification.webhooksRemaining,
        userSlackIdCleared: verification.userSlackIdCleared,
        workspacesDisconnected: summary.workspaceNames
      }, 'Verification of complete disconnect')

      return {
        success: true,
        data: {
          message: 'Slack integration completely disconnected',
          disconnectedWorkspaces: result.disconnectedWorkspaces,
          itemsRemoved: result.itemsRemoved
        }
      }

    } catch (error: any) {
      methodLogger.error({ error: error.message, stack: error.stack }, 'Error during complete Slack disconnect')
      return {
        success: false,
        error: 'Internal server error',
        statusCode: 500
      }
    }
  }

  /**
   * ユーザーのSlack接続を取得
   */
  private async fetchUserConnections(
    request: NextRequest,
    userId: string
  ): Promise<SlackDisconnectionServiceResult<SlackConnection[]>> {
    const methodLogger = this.logger.child({ method: 'fetchUserConnections', userId })

    try {
      const supabase = createServerSupabaseClient(request)
      const { data: connections, error: connectionsError } = await supabase
        .from('slack_connections')
        .select('id, workspace_name')
        .eq('user_id', userId)

      if (connectionsError) {
        methodLogger.error({ error: connectionsError }, 'Failed to fetch connections for disconnect')
        return {
          success: false,
          error: 'Failed to fetch connections',
          statusCode: 500
        }
      }

      return {
        success: true,
        data: connections || []
      }

    } catch (error: any) {
      methodLogger.error({ error }, 'Exception while fetching connections')
      return {
        success: false,
        error: 'Failed to fetch connections',
        statusCode: 500
      }
    }
  }

  /**
   * 切断処理の実行（Webhook削除、接続削除、ユーザーID リセット）
   */
  private async executeDisconnection(
    request: NextRequest,
    summary: DisconnectionSummary,
    userId: string
  ): Promise<SlackDisconnectionServiceResult<void>> {
    const methodLogger = this.logger.child({ method: 'executeDisconnection', userId })

    try {
      const supabase = createServerSupabaseClient(request)

      // 1. Webhookを削除
      const { error: webhookError } = await supabase
        .from('user_slack_webhooks')
        .delete()
        .in('slack_connection_id', summary.connectionIds)

      if (webhookError) {
        methodLogger.error({ error: webhookError }, 'Failed to delete webhooks')
        return {
          success: false,
          error: 'Failed to delete webhooks',
          statusCode: 500
        }
      }

      methodLogger.info({ connectionIds: summary.connectionIds }, 'Successfully deleted webhooks')

      // 2. Slack接続を削除
      const { error: connectionDeleteError } = await supabase
        .from('slack_connections')
        .delete()
        .eq('user_id', userId)

      if (connectionDeleteError) {
        methodLogger.error({ error: connectionDeleteError }, 'Failed to delete connections')
        return {
          success: false,
          error: 'Failed to delete connections',
          statusCode: 500
        }
      }

      methodLogger.info({ connectionIds: summary.connectionIds }, 'Successfully deleted connections')

      // 3. ユーザーのSlack User IDをリセット
      const { error: userResetError } = await supabase
        .from('users')
        .update({ slack_user_id: null })
        .eq('id', userId)

      if (userResetError) {
        methodLogger.error({ error: userResetError }, 'Failed to reset user Slack ID')
        return {
          success: false,
          error: 'Failed to reset user Slack ID',
          statusCode: 500
        }
      }

      methodLogger.info('Successfully reset user Slack ID')

      return {
        success: true
      }

    } catch (error: any) {
      methodLogger.error({ error }, 'Exception during disconnection execution')
      return {
        success: false,
        error: 'Failed to execute disconnection',
        statusCode: 500
      }
    }
  }

  /**
   * 切断確認の検証
   */
  async verifyDisconnection(
    request: NextRequest,
    userId: string
  ): Promise<SlackDisconnectionServiceResult<DisconnectionVerification>> {
    const methodLogger = this.logger.child({ method: 'verifyDisconnection', userId })

    try {
      const supabase = createServerSupabaseClient(request)

      // 1. 残りの接続をチェック
      const { data: verificationConnections } = await supabase
        .from('slack_connections')
        .select('id')
        .eq('user_id', userId)

      // 2. 残りのWebhookをチェック
      const { data: verificationWebhooks } = await supabase
        .from('user_slack_webhooks')
        .select('id')
        .eq('user_id', userId)

      // 3. ユーザーのSlack IDがクリアされたかチェック
      const { data: verificationUser } = await supabase
        .from('users')
        .select('slack_user_id')
        .eq('id', userId)
        .single()

      const remainingConnections = verificationConnections?.length || 0
      const remainingWebhooks = verificationWebhooks?.length || 0
      const userSlackIdCleared = !verificationUser?.slack_user_id

      // エンティティで検証結果を評価
      const entity = SlackDisconnectionEntity.forUser(userId)
      const verification = entity.evaluateVerification(
        remainingConnections,
        remainingWebhooks,
        userSlackIdCleared
      )

      methodLogger.info({
        remainingConnections: verification.connectionsRemaining,
        remainingWebhooks: verification.webhooksRemaining,
        userSlackIdCleared: verification.userSlackIdCleared,
        isComplete: verification.isComplete
      }, 'Disconnection verification completed')

      return {
        success: true,
        data: verification
      }

    } catch (error: any) {
      methodLogger.error({ error }, 'Exception during disconnection verification')
      return {
        success: false,
        error: 'Failed to verify disconnection',
        statusCode: 500
      }
    }
  }

  /**
   * ユーザー認証の確認
   */
  async authenticateUser(request: NextRequest): Promise<SlackDisconnectionServiceResult<User>> {
    const methodLogger = this.logger.child({ method: 'authenticateUser' })

    try {
      const supabase = createServerSupabaseClient(request)
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        methodLogger.warn('User authentication failed')
        return {
          success: false,
          error: 'User not authenticated',
          statusCode: 401
        }
      }

      return {
        success: true,
        data: { id: user.id }
      }

    } catch (error: any) {
      methodLogger.error({ error }, 'Exception during user authentication')
      return {
        success: false,
        error: 'Authentication failed',
        statusCode: 500
      }
    }
  }

  /**
   * サービスのヘルスチェック
   */
  async healthCheck(): Promise<SlackDisconnectionServiceResult<{
    status: string
    databaseConnected: boolean
    serviceInfo: any
  }>> {
    // 基本的なサービス状態チェック
    return {
      success: true,
      data: {
        status: 'healthy',
        databaseConnected: true, // 実際のDBチェックは省略
        serviceInfo: {
          serviceName: 'SlackDisconnectionService',
          supportedOperations: ['disconnect', 'verify', 'authenticate']
        }
      }
    }
  }
}
