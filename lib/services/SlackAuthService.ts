/**
 * SlackAuthService
 * Slack OAuth認証フローのビジネスロジックを担う
 */

import { SlackRepositoryInterface } from '@/lib/repositories/SlackRepository'
import { SlackOAuthEntity, SlackOAuthTokenData } from '@/lib/entities/SlackOAuth'
import { SlackConnection } from '@/lib/entities/SlackConnection'
import { UserEntity } from '@/lib/entities/User'
import crypto from 'crypto'

export interface SlackAuthServiceResult<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface SlackOAuthResult {
  slackUserId: string | null
  connection: SlackConnection
  webhookCreated: boolean
  webhookId: string | null
}

export interface SlackTokenExchangeRequest {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
}

export class SlackAuthService {
  constructor(
    private _slackRepo: SlackRepositoryInterface,
    private _retryDelayMs: number = 1000
  ) {}

  /**
   * OAuth認証フロー全体を処理
   */
  async processOAuthCallback(
    code: string,
    userId: string,
    tokenExchangeRequest: SlackTokenExchangeRequest
  ): Promise<SlackAuthServiceResult<SlackOAuthResult>> {
    try {
      // 1. ユーザーの存在確認
      const userValidation = await this.validateUserExists(userId)
      if (!userValidation.success) {
        return {
          success: false,
          error: userValidation.error,
          statusCode: userValidation.statusCode
        }
      }

      // 2. Slack OAuth トークン交換
      const tokenResult = await this.exchangeCodeForTokens(tokenExchangeRequest)
      if (!tokenResult.success) {
        return {
          success: false,
          error: tokenResult.error,
          statusCode: 400
        }
      }

      const oauthEntity = tokenResult.data!

      // 3. Slack接続を作成/更新
      const connectionResult = await this.createSlackConnection(userId, oauthEntity)
      if (!connectionResult.success) {
        return {
          success: false,
          error: connectionResult.error,
          statusCode: 500
        }
      }

      const connection = connectionResult.data!
      const slackUserId = oauthEntity.extractSlackUserId()

      // 4. ユーザーのSlack IDを更新
      let userUpdateSuccess = false
      if (slackUserId) {
        const userUpdateResult = await this.updateUserSlackId(userId, slackUserId)
        userUpdateSuccess = userUpdateResult.success
      }

      // 5. Webhook自動作成
      let webhookCreated = false
      let webhookId = null
      if (slackUserId && userUpdateSuccess) {
        const webhookResult = await this.autoCreateWebhook(userId, connection.id)
        webhookCreated = webhookResult.success
        webhookId = webhookResult.data?.webhook_id || null
      }

      return {
        success: true,
        data: {
          slackUserId,
          connection,
          webhookCreated,
          webhookId
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error during OAuth processing',
        statusCode: 500
      }
    }
  }

  /**
   * ユーザーの存在を確認
   */
  async validateUserExists(userId: string): Promise<SlackAuthServiceResult<void>> {
    try {
      const result = await this._slackRepo.findUserWithSettings(userId)

      if (result.error) {
        if ((result.error as any).code === 'PGRST116') {
          return {
            success: false,
            error: 'User record not found in database',
            statusCode: 404
          }
        }
        return {
          success: false,
          error: 'Failed to check user record',
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
   * Slack OAuth コードをトークンに交換
   */
  async exchangeCodeForTokens(
    request: SlackTokenExchangeRequest
  ): Promise<SlackAuthServiceResult<SlackOAuthEntity>> {
    try {
      const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: request.clientId,
          client_secret: request.clientSecret,
          code: request.code,
          redirect_uri: request.redirectUri
        })
      })

      if (!tokenResponse.ok) {
        return {
          success: false,
          error: 'Failed to communicate with Slack API',
          statusCode: 500
        }
      }

      const tokenData: SlackOAuthTokenData = await tokenResponse.json()
      const oauthEntity = SlackOAuthEntity.fromTokenResponse(tokenData)

      if (oauthEntity.hasError()) {
        return {
          success: false,
          error: `Slack OAuth error: ${oauthEntity.getError()}`,
          statusCode: 400
        }
      }

      if (!oauthEntity.isValidTokenResponse()) {
        return {
          success: false,
          error: 'Invalid token response from Slack',
          statusCode: 400
        }
      }

      const validation = oauthEntity.validateIntegrity()
      if (!validation.valid) {
        return {
          success: false,
          error: `OAuth validation failed: ${validation.errors.join(', ')}`,
          statusCode: 400
        }
      }

      return {
        success: true,
        data: oauthEntity
      }
    } catch (error) {
      return {
        success: false,
        error: 'Network error during token exchange',
        statusCode: 500
      }
    }
  }

  /**
   * Slack接続をデータベースに作成/更新
   */
  async createSlackConnection(
    userId: string,
    oauthEntity: SlackOAuthEntity
  ): Promise<SlackAuthServiceResult<SlackConnection>> {
    try {
      const connectionData = oauthEntity.toConnectionData(userId)

      const result = await this._slackRepo.upsertConnection({
        user_id: connectionData.user_id,
        workspace_id: connectionData.workspace_id,
        workspace_name: connectionData.workspace_name,
        team_name: connectionData.team_name,
        access_token: connectionData.access_token,
        scope: connectionData.scope
      })

      if (result.error) {
        return {
          success: false,
          error: 'Failed to save Slack connection to database',
          statusCode: 500
        }
      }

      return {
        success: true,
        data: result.data!
      }
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error during connection creation',
        statusCode: 500
      }
    }
  }

  /**
   * ユーザーのSlack IDを更新（リトライ付き）
   */
  async updateUserSlackId(
    userId: string,
    slackUserId: string
  ): Promise<SlackAuthServiceResult<void>> {
    try {
      // Slack User IDのバリデーション
      const userEntity = new UserEntity({
        id: userId,
        display_name: null,
        avatar_url: null,
        slack_user_id: slackUserId,
        enable_webhook_notifications: false,
        created_at: new Date().toISOString()
      })

      if (!userEntity.validateSlackUserId(slackUserId)) {
        return {
          success: false,
          error: 'Invalid Slack User ID format',
          statusCode: 400
        }
      }

      // リトライロジック付きでユーザーデータを更新
      const maxRetries = 3
      let lastError: any = null

      for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
        const result = await this._slackRepo.updateUserSlackId(userId, slackUserId)

        if (!result.error) {
          // 成功したら検証
          const verification = await this.verifyUserSlackIdUpdate(userId, slackUserId)
          if (verification.success) {
            return { success: true }
          }
          lastError = { message: 'Verification failed after successful update' }
        } else {
          lastError = result.error
        }

        // 最後の試行でなければ待機
        if (retryCount < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, this._retryDelayMs * (retryCount + 1)))
        }
      }

      return {
        success: false,
        error: `Failed to update user Slack ID after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
        statusCode: 500
      }
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error during user ID update',
        statusCode: 500
      }
    }
  }

  /**
   * ユーザーのSlack ID更新を検証
   */
  async verifyUserSlackIdUpdate(
    userId: string,
    expectedSlackUserId: string
  ): Promise<SlackAuthServiceResult<void>> {
    try {
      const result = await this._slackRepo.getDirectSlackUserId(userId)

      if (result.error) {
        return {
          success: false,
          error: 'Failed to verify Slack User ID update',
          statusCode: 500
        }
      }

      const actualSlackUserId = result.data?.slack_user_id
      if (!actualSlackUserId) {
        return {
          success: false,
          error: 'Slack User ID not found after update',
          statusCode: 500
        }
      }

      if (actualSlackUserId !== expectedSlackUserId) {
        return {
          success: false,
          error: 'Slack User ID mismatch after update',
          statusCode: 500
        }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error during verification',
        statusCode: 500
      }
    }
  }

  /**
   * OAuth成功後にWebhookを自動作成
   */
  async autoCreateWebhook(
    userId: string,
    connectionId: string
  ): Promise<SlackAuthServiceResult<{ webhook_id: string }>> {
    try {
      const result = await this._slackRepo.createWebhook({
        user_id: userId,
        slack_connection_id: connectionId,
        webhook_id: Buffer.from(crypto.randomBytes(32)).toString('base64url'),
        webhook_secret: crypto.randomBytes(32).toString('hex'),
        is_active: true,
        event_count: 0
      })

      if (result.error) {
        return {
          success: false,
          error: 'Failed to auto-create webhook',
          statusCode: 500
        }
      }

      return {
        success: true,
        data: {
          webhook_id: result.data!.webhook_id
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error during webhook creation',
        statusCode: 500
      }
    }
  }

  /**
   * 接続ID取得のためのヘルパーメソッド
   */
  async findConnectionByWorkspace(
    userId: string,
    workspaceId: string
  ): Promise<SlackAuthServiceResult<SlackConnection>> {
    try {
      const result = await this._slackRepo.findConnectionsByUserId(userId)

      if (result.error) {
        return {
          success: false,
          error: 'Failed to fetch user connections',
          statusCode: 500
        }
      }

      const connection = result.data.find(conn => conn.workspace_id === workspaceId)
      if (!connection) {
        return {
          success: false,
          error: 'Connection not found for workspace',
          statusCode: 404
        }
      }

      return {
        success: true,
        data: connection
      }
    } catch (error) {
      return {
        success: false,
        error: 'Internal server error during connection lookup',
        statusCode: 500
      }
    }
  }
}
