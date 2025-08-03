/**
 * SlackDisconnection Domain Entity
 * Slack統合完全切断に関するビジネスルールとバリデーションを定義
 */

export interface SlackConnection {
  id: string
  workspace_name: string
}

export interface SlackDisconnectionRequest {
  userId: string
}

export interface SlackDisconnectionResult {
  success: boolean
  disconnectedWorkspaces: string[]
  itemsRemoved: {
    connections: number
    webhooks: number
    userIdCleared: boolean
  }
  verificationResults: {
    remainingConnections: number
    remainingWebhooks: number
    userSlackIdCleared: boolean
  }
}

export interface DisconnectionSummary {
  connectionIds: string[]
  workspaceNames: string[]
  totalConnections: number
  hasConnections: boolean
}

export interface DisconnectionVerification {
  connectionsRemaining: number
  webhooksRemaining: number
  userSlackIdCleared: boolean
  isComplete: boolean
}

export class SlackDisconnectionEntity {
  private _request: SlackDisconnectionRequest
  private _connections: SlackConnection[]

  // ビジネスルール定数
  public static readonly MIN_USER_ID_LENGTH = 1
  public static readonly MAX_WORKSPACE_NAME_LENGTH = 100
  public static readonly REQUIRED_FIELDS = ['userId'] as const

  constructor(request: SlackDisconnectionRequest, connections: SlackConnection[] = []) {
    // イミュータビリティを保証するため深いコピーを作成
    this._request = {
      userId: request.userId
    }

    this._connections = connections.map(conn => ({
      id: conn.id,
      workspace_name: conn.workspace_name
    }))
  }

  get userId(): string {
    return this._request.userId
  }

  get connections(): SlackConnection[] {
    return [...this._connections]
  }

  /**
   * リクエストの基本バリデーション
   */
  validateRequest(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this._request.userId) {
      errors.push('User ID is required')
    } else if (typeof this._request.userId !== 'string') {
      errors.push('User ID must be a string')
    } else if (this._request.userId.length < SlackDisconnectionEntity.MIN_USER_ID_LENGTH) {
      errors.push('User ID is too short')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 接続データの整合性チェック
   */
  validateConnections(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    for (const connection of this._connections) {
      if (!connection.id) {
        errors.push('Connection ID is required')
      }

      if (!connection.workspace_name) {
        errors.push('Workspace name is required')
      } else if (connection.workspace_name.length > SlackDisconnectionEntity.MAX_WORKSPACE_NAME_LENGTH) {
        errors.push(`Workspace name too long: ${connection.workspace_name}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 完全なバリデーション（リクエスト + 接続データ）
   */
  validateDisconnection(): { valid: boolean; errors: string[] } {
    const requestValidation = this.validateRequest()
    const connectionsValidation = this.validateConnections()

    return {
      valid: requestValidation.valid && connectionsValidation.valid,
      errors: [...requestValidation.errors, ...connectionsValidation.errors]
    }
  }

  /**
   * 切断対象の接続があるかチェック
   */
  hasConnectionsToDisconnect(): boolean {
    return this._connections.length > 0
  }

  /**
   * 切断操作のサマリーを作成
   */
  createDisconnectionSummary(): DisconnectionSummary {
    const connectionIds = this._connections.map(c => c.id)
    const workspaceNames = this._connections.map(c => c.workspace_name)

    return {
      connectionIds,
      workspaceNames,
      totalConnections: this._connections.length,
      hasConnections: this._connections.length > 0
    }
  }

  /**
   * 切断検証結果の評価
   */
  evaluateVerification(
    remainingConnections: number,
    remainingWebhooks: number,
    userSlackIdCleared: boolean
  ): DisconnectionVerification {
    const isComplete = remainingConnections === 0 &&
                      remainingWebhooks === 0 &&
                      userSlackIdCleared

    return {
      connectionsRemaining: remainingConnections,
      webhooksRemaining: remainingWebhooks,
      userSlackIdCleared,
      isComplete
    }
  }

  /**
   * 切断結果オブジェクトを作成
   */
  createResult(
    summary: DisconnectionSummary,
    verification: DisconnectionVerification
  ): SlackDisconnectionResult {
    return {
      success: verification.isComplete,
      disconnectedWorkspaces: summary.workspaceNames,
      itemsRemoved: {
        connections: summary.totalConnections,
        webhooks: summary.connectionIds.length,
        userIdCleared: verification.userSlackIdCleared
      },
      verificationResults: {
        remainingConnections: verification.connectionsRemaining,
        remainingWebhooks: verification.webhooksRemaining,
        userSlackIdCleared: verification.userSlackIdCleared
      }
    }
  }

  /**
   * 切断対象ワークスペースの重複チェック
   */
  hasDuplicateWorkspaces(): boolean {
    const workspaceNames = this._connections.map(c => c.workspace_name)
    const uniqueNames = new Set(workspaceNames)
    return workspaceNames.length !== uniqueNames.size
  }

  /**
   * 特定のワークスペースが含まれているかチェック
   */
  includesWorkspace(workspaceName: string): boolean {
    return this._connections.some(c => c.workspace_name === workspaceName)
  }

  /**
   * 接続IDが重複していないかチェック
   */
  hasDuplicateConnectionIds(): boolean {
    const connectionIds = this._connections.map(c => c.id)
    const uniqueIds = new Set(connectionIds)
    return connectionIds.length !== uniqueIds.size
  }

  /**
   * ファクトリーメソッド: ユーザーIDから作成
   */
  static forUser(userId: string): SlackDisconnectionEntity {
    return new SlackDisconnectionEntity({ userId })
  }

  /**
   * ファクトリーメソッド: ユーザーIDと接続データから作成
   */
  static withConnections(userId: string, connections: SlackConnection[]): SlackDisconnectionEntity {
    return new SlackDisconnectionEntity({ userId }, connections)
  }

  /**
   * 空の結果オブジェクトを作成（接続がない場合）
   */
  static createEmptyResult(): SlackDisconnectionResult {
    return {
      success: true,
      disconnectedWorkspaces: [],
      itemsRemoved: {
        connections: 0,
        webhooks: 0,
        userIdCleared: false
      },
      verificationResults: {
        remainingConnections: 0,
        remainingWebhooks: 0,
        userSlackIdCleared: true
      }
    }
  }

  /**
   * 接続データの更新（新しいインスタンスを返す）
   */
  withUpdatedConnections(connections: SlackConnection[]): SlackDisconnectionEntity {
    return new SlackDisconnectionEntity(this._request, connections)
  }
}
