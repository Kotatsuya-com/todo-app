/**
 * Production Dependency Container
 * プロダクション環境用の依存関係コンテナ
 */

import { BaseDependencyContainer, ServiceDependencies, AuthDependencies, UtilityDependencies } from './DependencyContainer'
import { createServices } from '@/lib/services/BackendServiceFactory'
import { requireAuthentication, authenticateUser } from '@/lib/auth/authentication'
import { getAppBaseUrl } from '@/lib/ngrok-url'
import { webhookLogger } from '@/lib/logger'
import { verifySlackSignature } from '@/lib/slack-signature'

/**
 * プロダクション環境用の依存関係コンテナ
 */
export class ProductionContainer extends BaseDependencyContainer {
  public services!: ServiceDependencies
  public auth!: AuthDependencies
  public utils!: UtilityDependencies

  constructor() {
    super()
    this.initialize()
  }

  protected initialize(): void {
    // サービス層の初期化
    const serviceInstances = createServices()
    this.services = {
      slackService: serviceInstances.slackService || null,
      slackConnectionService: serviceInstances.slackConnectionService || null,
      slackAuthService: serviceInstances.slackAuthService || null,
      slackMessageService: serviceInstances.slackMessageService || null,
      emojiSettingsService: serviceInstances.emojiSettingsService || null,
      notificationSettingsService: serviceInstances.notificationSettingsService || null,
      titleGenerationService: serviceInstances.titleGenerationService || null,
      urlDetectionService: serviceInstances.urlDetectionService || null,
      slackDisconnectionService: serviceInstances.slackDisconnectionService || null,
      webhookService: serviceInstances.webhookService || null
    }

    // 認証層の初期化
    this.auth = {
      requireAuthentication,
      authenticateUser
    }

    // ユーティリティ層の初期化
    this.utils = {
      getAppBaseUrl,
      webhookLogger,
      verifySlackSignature
    }

    // 依存関係の検証
    this.validateDependencies()
  }
}

/**
 * プロダクション用のシングルトンコンテナインスタンス
 */
let _productionContainer: ProductionContainer | null = null

/**
 * プロダクション用依存関係コンテナの取得
 */
export function getProductionContainer(): ProductionContainer {
  if (!_productionContainer) {
    _productionContainer = new ProductionContainer()
  }
  return _productionContainer
}

/**
 * プロダクション用依存関係のリセット（テスト用）
 */
export function resetProductionContainer(): void {
  _productionContainer = null
}
