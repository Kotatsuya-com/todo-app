/**
 * Test Dependency Container
 * テスト環境用の依存関係コンテナ
 */

import {
  BaseDependencyContainer,
  ServiceDependencies,
  AuthDependencies,
  UtilityDependencies,
  TestDependencyOverrides
} from './DependencyContainer'

/**
 * テスト環境用の依存関係コンテナ
 */
export class TestContainer extends BaseDependencyContainer {
  public services!: ServiceDependencies
  public auth!: AuthDependencies
  public utils!: UtilityDependencies

  constructor(overrides: TestDependencyOverrides = {}) {
    super()
    this.initializeWithOverrides(overrides)
  }

  protected initialize(): void {
    // TestContainerでは使用されない（initializeWithOverridesを使用）
    throw new Error('Use initializeWithOverrides instead')
  }

  private initializeWithOverrides(overrides: TestDependencyOverrides): void {
    // デフォルトのモックサービスを設定
    this.services = {
      slackService: this.createMockService('slackService'),
      slackConnectionService: this.createMockService('slackConnectionService'),
      slackAuthService: this.createMockService('slackAuthService'),
      slackMessageService: this.createMockService('slackMessageService'),
      emojiSettingsService: this.createMockService('emojiSettingsService'),
      notificationSettingsService: this.createMockService('notificationSettingsService'),
      titleGenerationService: this.createMockService('titleGenerationService'),
      urlDetectionService: this.createMockService('urlDetectionService'),
      slackDisconnectionService: this.createMockService('slackDisconnectionService'),
      webhookService: this.createMockService('webhookService'),
      ...overrides.services
    }

    // デフォルトのモック認証を設定
    this.auth = {
      requireAuthentication: jest.fn().mockResolvedValue('mock-user-id'),
      authenticateUser: jest.fn().mockResolvedValue({
        success: true,
        userId: 'mock-user-id'
      }),
      ...overrides.auth
    }

    // デフォルトのモックユーティリティを設定
    this.utils = {
      getAppBaseUrl: jest.fn().mockReturnValue('http://localhost:3000'),
      webhookLogger: this.createMockLogger(),
      verifySlackSignature: jest.fn().mockResolvedValue(true),
      ...overrides.utils
    }

    // 依存関係の検証をスキップ（テスト環境ではモックを使用）
  }

  /**
   * 汎用的なモックサービスを作成
   */
  private createMockService(serviceName: string) {
    return {
      // 一般的なサービスメソッドのモック
      create: jest.fn().mockResolvedValue({ success: true, data: {} }),
      update: jest.fn().mockResolvedValue({ success: true, data: {} }),
      delete: jest.fn().mockResolvedValue({ success: true, data: {} }),
      get: jest.fn().mockResolvedValue({ success: true, data: {} }),
      list: jest.fn().mockResolvedValue({ success: true, data: [] }),

      // webhook service 固有のメソッド
      getUserWebhooks: jest.fn().mockResolvedValue({ success: true, data: [] }),
      createUserWebhook: jest.fn().mockResolvedValue({
        success: true,
        data: {
          webhook: { webhook_id: 'mock-webhook-id' },
          message: 'Webhook created successfully'
        }
      }),
      deactivateWebhook: jest.fn().mockResolvedValue({ success: true, data: {} }),

      // slack service 固有のメソッド
      processWebhookEvent: jest.fn().mockResolvedValue({ success: true, data: {} }),

      // slack disconnection service 固有のメソッド
      authenticateUser: jest.fn().mockResolvedValue({
        success: true,
        data: { id: 'mock-user-id', email: 'test@example.com' }
      }),
      disconnectSlackIntegration: jest.fn().mockResolvedValue({
        success: true,
        data: {
          message: 'Slack integration completely disconnected',
          disconnectedWorkspaces: ['Test Workspace'],
          itemsRemoved: { connections: 1, webhooks: 1, emojiSettings: 1 }
        }
      }),

      // emoji settings service 固有のメソッド
      getUserEmojiSettings: jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'mock-settings-id',
          userId: 'mock-user-id',
          emojiSettings: {
            urgent_important: '🔥',
            not_urgent_important: '📋',
            urgent_not_important: '⚡',
            not_urgent_not_important: '💡',
            completed: '✅'
          }
        }
      }),
      updateUserEmojiSettings: jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'mock-settings-id',
          userId: 'mock-user-id',
          emojiSettings: {
            urgent_important: '🔥',
            not_urgent_important: '📋',
            urgent_not_important: '⚡',
            not_urgent_not_important: '💡',
            completed: '✅'
          }
        }
      }),
      resetUserEmojiSettings: jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'mock-settings-id',
          userId: 'mock-user-id',
          message: 'Emoji settings reset to defaults'
        }
      }),

      // notification settings service 固有のメソッド
      getUserNotificationSettings: jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'mock-notification-settings-id',
          userId: 'mock-user-id',
          email_enabled: true,
          push_enabled: false,
          slack_enabled: true,
          frequency: 'daily'
        }
      }),
      updateUserNotificationSettings: jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'mock-notification-settings-id',
          userId: 'mock-user-id',
          email_enabled: true,
          push_enabled: false,
          slack_enabled: true,
          frequency: 'daily'
        }
      }),

      // slack connection service 固有のメソッド
      getUserConnections: jest.fn().mockResolvedValue({
        success: true,
        data: {
          connections: [
            {
              id: 'mock-connection-id',
              workspace_id: 'TWORKSPACE123',
              workspace_name: 'Test Workspace',
              team_name: 'Test Team',
              access_token: 'xoxb-mock-token',
              scope: 'chat:write,files:read',
              created_at: '2025-01-01T00:00:00Z'
            }
          ]
        }
      }),
      deleteUserConnection: jest.fn().mockResolvedValue({
        success: true,
        data: {}
      }),

      // slack auth service 固有のメソッド
      processOAuthCallback: jest.fn().mockResolvedValue({
        success: true,
        data: {
          slackUserId: 'U12345',
          connection: {
            id: 'mock-connection-id',
            workspace_id: 'TWORKSPACE123',
            workspace_name: 'Test Workspace',
            team_name: 'Test Team',
            access_token: 'xoxb-mock-token',
            scope: 'chat:write,files:read',
            created_at: '2025-01-01T00:00:00Z'
          },
          webhookCreated: true,
          webhookId: 'mock-webhook-id'
        }
      }),

      // slack message service 固有のメソッド
      retrieveMessage: jest.fn().mockResolvedValue({
        success: true,
        data: {
          message: {
            text: 'Mock Slack message content',
            user: 'U12345',
            channel: 'C1234567890',
            timestamp: '1640995200.000100'
          },
          channelInfo: {
            id: 'C1234567890',
            name: 'general'
          },
          userInfo: {
            id: 'U12345',
            name: 'testuser'
          }
        }
      }),

      // title generation service 固有のメソッド
      generateTitle: jest.fn().mockResolvedValue({
        success: true,
        data: {
          title: 'Generated Task Title'
        }
      }),

      // url detection service 固有のメソッド
      detectAppUrlSimple: jest.fn().mockResolvedValue({
        success: true,
        data: {
          appUrl: 'http://localhost:3000',
          protocol: 'http:',
          hostname: 'localhost',
          port: '3000'
        }
      }),

      // サービス名をメタデータとして保持
      _mockServiceName: serviceName
    }
  }

  /**
   * モックロガーを作成
   */
  private createMockLogger() {
    const mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      child: jest.fn().mockReturnThis()
    }

    // child() メソッドが同じモックロガーを返すように設定
    mockLogger.child.mockReturnValue(mockLogger)

    return mockLogger
  }

  /**
   * 特定のサービスのモックを更新
   */
  public updateServiceMock(serviceName: keyof ServiceDependencies, mockImplementation: any): void {
    this.services[serviceName] = {
      ...this.services[serviceName],
      ...mockImplementation
    }
  }

  /**
   * 認証モックを更新
   */
  public updateAuthMock(mockImplementation: Partial<AuthDependencies>): void {
    this.auth = {
      ...this.auth,
      ...mockImplementation
    }
  }

  /**
   * ユーティリティモックを更新
   */
  public updateUtilsMock(mockImplementation: Partial<UtilityDependencies>): void {
    this.utils = {
      ...this.utils,
      ...mockImplementation
    }
  }

  /**
   * 全てのモックをリセット
   */
  public resetAllMocks(): void {
    Object.values(this.services).forEach(service => {
      if (service && typeof service === 'object') {
        Object.values(service).forEach(method => {
          if (jest.isMockFunction(method)) {
            method.mockReset()
          }
        })
      }
    })

    Object.values(this.auth).forEach(method => {
      if (jest.isMockFunction(method)) {
        method.mockReset()
      }
    })

    Object.values(this.utils).forEach(utility => {
      if (jest.isMockFunction(utility)) {
        utility.mockReset()
      } else if (utility && typeof utility === 'object') {
        Object.values(utility).forEach(method => {
          if (jest.isMockFunction(method)) {
            method.mockReset()
          }
        })
      }
    })
  }
}
