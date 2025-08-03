/**
 * SlackMessage Domain Entity
 * Slackメッセージ取得に関するビジネスルールとバリデーションを定義
 */

import { parseSlackUrl } from '@/lib/slack-message'

export interface SlackMessageRequest {
  slackUrl: string
  userId: string
}

export interface SlackConnectionMatch {
  workspace_id: string
  workspace_name: string
  team_name: string
  access_token: string
}

export interface SlackMessageData {
  text: string
  user: string
  timestamp: string
  channel: string
  url: string
  workspace: string
}

export interface SlackUrlParsed {
  workspace: string
  channel: string
  timestamp: string
  threadTs?: string
}

export class SlackMessageEntity {
  private _request: SlackMessageRequest
  private _parsedUrl: SlackUrlParsed | null = null

  constructor(request: SlackMessageRequest) {
    // Create a deep copy to maintain immutability
    this._request = {
      slackUrl: request.slackUrl,
      userId: request.userId
    }
  }

  get slackUrl(): string {
    return this._request.slackUrl
  }

  get userId(): string {
    return this._request.userId
  }

  get parsedUrl(): SlackUrlParsed | null {
    return this._parsedUrl
  }

  /**
   * Slack URLの基本バリデーション
   */
  isValidSlackUrl(): boolean {
    if (!this._request.slackUrl || typeof this._request.slackUrl !== 'string') {
      return false
    }

    this._parsedUrl = parseSlackUrl(this._request.slackUrl)
    return this._parsedUrl !== null
  }

  /**
   * ユーザーIDの有効性チェック
   */
  isValidUserId(): boolean {
    return Boolean(this._request.userId && typeof this._request.userId === 'string')
  }

  /**
   * リクエスト全体の整合性チェック
   */
  validateRequest(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.isValidUserId()) {
      errors.push('Valid user ID is required')
    }

    if (!this.isValidSlackUrl()) {
      errors.push('Valid Slack URL is required')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 接続の中から最適なワークスペースを選択
   */
  findBestConnection(connections: SlackConnectionMatch[]): SlackConnectionMatch | null {
    if (!connections || connections.length === 0) {
      return null
    }

    if (!this._parsedUrl) {
      return connections[0] // フォールバック：最初の接続
    }

    // 1. workspace_id での完全一致
    const exactMatch = connections.find(conn =>
      conn.workspace_id === this._parsedUrl!.workspace
    )
    if (exactMatch) {
      return exactMatch
    }

    // 2. workspace_name での大文字小文字無視一致
    const nameMatch = connections.find(conn =>
      conn.workspace_name.toLowerCase() === this._parsedUrl!.workspace.toLowerCase()
    )
    if (nameMatch) {
      return nameMatch
    }

    // 3. team_name での大文字小文字無視一致
    const teamMatch = connections.find(conn =>
      conn.team_name.toLowerCase() === this._parsedUrl!.workspace.toLowerCase()
    )
    if (teamMatch) {
      return teamMatch
    }

    // フォールバック：最初の接続
    return connections[0]
  }

  /**
   * 接続選択結果のメタデータを取得
   */
  getConnectionSelectionInfo(
    connections: SlackConnectionMatch[],
    selectedConnection: SlackConnectionMatch | null
  ): {
    urlWorkspace: string | null
    selectedWorkspace: { id: string; name: string } | null
    totalConnections: number
    selectionReason: 'exact_id' | 'name_match' | 'team_match' | 'fallback' | 'no_connection'
  } {
    if (!selectedConnection) {
      return {
        urlWorkspace: this._parsedUrl?.workspace || null,
        selectedWorkspace: null,
        totalConnections: connections.length,
        selectionReason: 'no_connection'
      }
    }

    let selectionReason: 'exact_id' | 'name_match' | 'team_match' | 'fallback' = 'fallback'

    if (this._parsedUrl) {
      if (selectedConnection.workspace_id === this._parsedUrl.workspace) {
        selectionReason = 'exact_id'
      } else if (selectedConnection.workspace_name.toLowerCase() === this._parsedUrl.workspace.toLowerCase()) {
        selectionReason = 'name_match'
      } else if (selectedConnection.team_name.toLowerCase() === this._parsedUrl.workspace.toLowerCase()) {
        selectionReason = 'team_match'
      }
    }

    return {
      urlWorkspace: this._parsedUrl?.workspace || null,
      selectedWorkspace: {
        id: selectedConnection.workspace_id,
        name: selectedConnection.workspace_name
      },
      totalConnections: connections.length,
      selectionReason
    }
  }

  /**
   * メッセージデータの作成
   */
  createMessageData(
    messageResult: any,
    selectedConnection: SlackConnectionMatch
  ): SlackMessageData {
    return {
      text: messageResult.text,
      user: messageResult.user,
      timestamp: messageResult.timestamp,
      channel: messageResult.channel,
      url: this._request.slackUrl,
      workspace: selectedConnection.workspace_name
    }
  }

  /**
   * ファクトリーメソッド
   */
  static fromRequest(slackUrl: string, userId: string): SlackMessageEntity {
    return new SlackMessageEntity({ slackUrl, userId })
  }
}
