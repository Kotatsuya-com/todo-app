/**
 * Dependency Container Interface
 * 依存性注入のためのコンテナインターフェース
 */

import { NextRequest } from 'next/server'

// サービス層の依存関係
export interface ServiceDependencies {
  slackService: any
  slackConnectionService: any
  slackAuthService: any
  slackMessageService: any
  emojiSettingsService: any
  notificationSettingsService: any
  titleGenerationService: any
  urlDetectionService: any
  slackDisconnectionService: any
  webhookService: any
}

// 認証層の依存関係
export interface AuthDependencies {
  requireAuthentication: (_request?: NextRequest) => Promise<string>
  authenticateUser: (_request?: NextRequest) => Promise<{
    success: boolean
    userId?: string
    error?: string
    statusCode?: number
  }>
}

// その他のユーティリティ依存関係
export interface UtilityDependencies {
  getAppBaseUrl: (_request: NextRequest) => string
  webhookLogger: any
  verifySlackSignature: (_request: NextRequest, _body: string) => Promise<boolean>
}

// 全体の依存関係コンテナ
export interface DependencyContainer {
  services: ServiceDependencies
  auth: AuthDependencies
  utils: UtilityDependencies
}

/**
 * API Handler の依存関係を注入するための基底クラス
 */
export abstract class BaseDependencyContainer implements DependencyContainer {
  abstract services: ServiceDependencies
  abstract auth: AuthDependencies
  abstract utils: UtilityDependencies

  /**
   * コンテナの初期化（必要に応じてオーバーライド）
   */
  protected abstract initialize(): void

  /**
   * 依存関係の検証
   */
  protected validateDependencies(): void {
    const requiredServices = [
      'slackService', 'slackConnectionService', 'slackAuthService',
      'slackMessageService', 'emojiSettingsService', 'notificationSettingsService',
      'titleGenerationService', 'urlDetectionService', 'slackDisconnectionService',
      'webhookService'
    ]

    for (const service of requiredServices) {
      if (!this.services[service as keyof ServiceDependencies]) {
        throw new Error(`Missing required service: ${service}`)
      }
    }

    if (!this.auth.requireAuthentication || !this.auth.authenticateUser) {
      throw new Error('Missing required auth dependencies')
    }

    if (!this.utils.getAppBaseUrl || !this.utils.webhookLogger || !this.utils.verifySlackSignature) {
      throw new Error('Missing required utility dependencies')
    }
  }
}

/**
 * リクエストスコープ付き依存関係コンテナ
 */
export interface RequestScopedContainer extends DependencyContainer {
  /**
   * リクエストコンテキストを設定
   */
  setRequestContext(_request: NextRequest): void

  /**
   * リクエストコンテキストを取得
   */
  getRequestContext(): NextRequest | undefined
}

/**
 * テスト用の依存関係オーバーライドインターフェース
 */
export interface TestDependencyOverrides {
  services?: Partial<ServiceDependencies>
  auth?: Partial<AuthDependencies>
  utils?: Partial<UtilityDependencies>
}
