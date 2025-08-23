/**
 * Test Dependency Container Tests
 * テスト環境用依存関係コンテナテスト
 */

import {
  TestContainer
} from '@/lib/containers/TestContainer'
import {
  TestDependencyOverrides
} from '@/lib/containers/DependencyContainer'

describe('TestContainer', () => {
  let container: TestContainer

  beforeEach(() => {
    container = new TestContainer()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Constructor and initialization', () => {
    it('should create container with default mock dependencies', () => {
      expect(container.services).toBeDefined()
      expect(container.auth).toBeDefined()
      expect(container.utils).toBeDefined()

      // サービス依存関係の確認
      expect(container.services.slackService).toBeDefined()
      expect(container.services.slackConnectionService).toBeDefined()
      expect(container.services.slackAuthService).toBeDefined()
      expect(container.services.slackMessageService).toBeDefined()
      expect(container.services.emojiSettingsService).toBeDefined()
      expect(container.services.notificationSettingsService).toBeDefined()
      expect(container.services.titleGenerationService).toBeDefined()
      expect(container.services.urlDetectionService).toBeDefined()
      expect(container.services.slackDisconnectionService).toBeDefined()
      expect(container.services.webhookService).toBeDefined()
    })

    it('should create container with service overrides', () => {
      const customSlackService = { customMethod: jest.fn() }
      const overrides: TestDependencyOverrides = {
        services: {
          slackService: customSlackService
        }
      }

      const containerWithOverrides = new TestContainer(overrides)

      expect(containerWithOverrides.services.slackService).toBe(customSlackService)
      expect(containerWithOverrides.services.slackConnectionService).toBeDefined()
    })

    it('should create container with auth overrides', () => {
      const customAuth = {
        requireAuthentication: jest.fn().mockResolvedValue('custom-user-id'),
        authenticateUser: jest.fn().mockResolvedValue({
          success: true,
          userId: 'custom-user-id'
        })
      }
      const overrides: TestDependencyOverrides = {
        auth: customAuth
      }

      const containerWithOverrides = new TestContainer(overrides)

      expect(containerWithOverrides.auth).toEqual(expect.objectContaining(customAuth))
    })

    it('should create container with utility overrides', () => {
      const customUtils = {
        getAppBaseUrl: jest.fn().mockReturnValue('https://custom.example.com'),
        verifySlackSignature: jest.fn().mockResolvedValue(false)
      }
      const overrides: TestDependencyOverrides = {
        utils: customUtils
      }

      const containerWithOverrides = new TestContainer(overrides)

      expect(containerWithOverrides.utils.getAppBaseUrl).toBe(customUtils.getAppBaseUrl)
      expect(containerWithOverrides.utils.verifySlackSignature).toBe(customUtils.verifySlackSignature)
      expect(containerWithOverrides.utils.webhookLogger).toBeDefined() // デフォルト値
    })

    it('should throw error when initialize() is called directly', () => {
      expect(() => {
        // protected method にアクセスするために any でキャスト
        (container as any).initialize()
      }).toThrow('Use initializeWithOverrides instead')
    })
  })

  describe('Default mock services', () => {
    it('should have common CRUD methods', () => {
      const service = container.services.slackService

      expect(service.create).toBeDefined()
      expect(service.update).toBeDefined()
      expect(service.delete).toBeDefined()
      expect(service.get).toBeDefined()
      expect(service.list).toBeDefined()
      expect(jest.isMockFunction(service.create)).toBe(true)
    })

    it('should have webhook service specific methods', () => {
      const webhookService = container.services.webhookService

      expect(webhookService.getUserWebhooks).toBeDefined()
      expect(webhookService.createUserWebhook).toBeDefined()
      expect(webhookService.deactivateWebhook).toBeDefined()
      expect(jest.isMockFunction(webhookService.getUserWebhooks)).toBe(true)
    })

    it('should have slack service specific methods', () => {
      const slackService = container.services.slackService

      expect(slackService.processWebhookEvent).toBeDefined()
      expect(jest.isMockFunction(slackService.processWebhookEvent)).toBe(true)
    })

    it('should have emoji settings service specific methods', () => {
      const emojiService = container.services.emojiSettingsService

      expect(emojiService.getUserEmojiSettings).toBeDefined()
      expect(emojiService.updateUserEmojiSettings).toBeDefined()
      expect(emojiService.resetUserEmojiSettings).toBeDefined()
      expect(jest.isMockFunction(emojiService.getUserEmojiSettings)).toBe(true)
    })

    it('should have notification settings service specific methods', () => {
      const notificationService = container.services.notificationSettingsService

      expect(notificationService.getUserNotificationSettings).toBeDefined()
      expect(jest.isMockFunction(notificationService.getUserNotificationSettings)).toBe(true)
    })

    it('should have slack auth service specific methods', () => {
      const slackAuthService = container.services.slackAuthService

      expect(slackAuthService.processOAuthCallback).toBeDefined()
      expect(jest.isMockFunction(slackAuthService.processOAuthCallback)).toBe(true)
    })

    it('should have slack disconnection service specific methods', () => {
      const disconnectionService = container.services.slackDisconnectionService

      expect(disconnectionService.authenticateUser).toBeDefined()
      expect(disconnectionService.disconnectSlackIntegration).toBeDefined()
      expect(jest.isMockFunction(disconnectionService.disconnectSlackIntegration)).toBe(true)
    })
  })

  describe('Default mock authentication', () => {
    it('should have default auth mocks', async () => {
      expect(container.auth.requireAuthentication).toBeDefined()
      expect(container.auth.authenticateUser).toBeDefined()

      const userId = await container.auth.requireAuthentication()
      expect(userId).toBe('mock-user-id')

      const authResult = await container.auth.authenticateUser()
      expect(authResult).toEqual({
        success: true,
        userId: 'mock-user-id'
      })
    })

    it('should allow auth mock customization', async () => {
      // モックの戻り値を変更
      (container.auth.requireAuthentication as jest.Mock).mockResolvedValue('different-user-id')

      const userId = await container.auth.requireAuthentication()
      expect(userId).toBe('different-user-id')
    })
  })

  describe('Default mock utilities', () => {
    it('should have default utility mocks', async () => {
      expect(container.utils.getAppBaseUrl).toBeDefined()
      expect(container.utils.webhookLogger).toBeDefined()
      expect(container.utils.verifySlackSignature).toBeDefined()

      const baseUrl = container.utils.getAppBaseUrl({} as any)
      expect(baseUrl).toBe('http://localhost:3000')

      const isValid = await container.utils.verifySlackSignature({} as any, 'test-body')
      expect(isValid).toBe(true)
    })

    it('should have mock logger with all methods', () => {
      const logger = container.utils.webhookLogger

      expect(logger.debug).toBeDefined()
      expect(logger.error).toBeDefined()
      expect(logger.info).toBeDefined()
      expect(logger.warn).toBeDefined()
      expect(jest.isMockFunction(logger.debug)).toBe(true)
    })
  })

  describe('Mock service method execution', () => {
    it('should execute webhook service methods with expected results', async () => {
      const webhookService = container.services.webhookService

      // getUserWebhooks
      const webhooks = await webhookService.getUserWebhooks()
      expect(webhooks).toEqual({ success: true, data: [] })

      // createUserWebhook
      const createResult = await webhookService.createUserWebhook()
      expect(createResult.success).toBe(true)
      expect(createResult.data.webhook.webhook_id).toBe('mock-webhook-id')
    })

    it('should execute emoji settings service methods with expected results', async () => {
      const emojiService = container.services.emojiSettingsService

      const settings = await emojiService.getUserEmojiSettings()
      expect(settings.success).toBe(true)
      expect(settings.data.emojiSettings).toEqual({
        urgent_important: '🔥',
        not_urgent_important: '📋',
        urgent_not_important: '⚡',
        not_urgent_not_important: '💡',
        completed: '✅'
      })
    })

    it('should execute slack auth service methods with expected results', async () => {
      const slackAuthService = container.services.slackAuthService

      const oauthResult = await slackAuthService.processOAuthCallback()
      expect(oauthResult.success).toBe(true)
      expect(oauthResult.data.connection.workspace_id).toBe('TWORKSPACE123')
      expect(oauthResult.data.webhookCreated).toBe(true)
    })

    it('should execute title generation service methods with expected results', async () => {
      const titleService = container.services.titleGenerationService

      const titleResult = await titleService.generateTitle()
      expect(titleResult.success).toBe(true)
      expect(titleResult.data.title).toBe('Generated Task Title')
    })
  })

  describe('resetAllMocks', () => {
    it('should reset all service mocks', async () => {
      const slackService = container.services.slackService

      // モックメソッドを呼び出し
      await slackService.create()
      expect(slackService.create).toHaveBeenCalledTimes(1)

      // リセット実行
      container.resetAllMocks()

      // 呼び出し回数がリセットされることを確認
      expect(slackService.create).toHaveBeenCalledTimes(0)
    })

    it('should reset all auth mocks', async () => {
      // 認証メソッドを呼び出し
      await container.auth.requireAuthentication()
      expect(container.auth.requireAuthentication).toHaveBeenCalledTimes(1)

      // リセット実行
      container.resetAllMocks()

      // 呼び出し回数がリセットされることを確認
      expect(container.auth.requireAuthentication).toHaveBeenCalledTimes(0)
    })

    it('should reset all utility mocks', async () => {
      const logger = container.utils.webhookLogger

      // ログメソッドを呼び出し
      logger.debug('test message')
      expect(logger.debug).toHaveBeenCalledTimes(1)

      // リセット実行
      container.resetAllMocks()

      // 呼び出し回数がリセットされることを確認
      expect(logger.debug).toHaveBeenCalledTimes(0)
    })

    it('should handle non-mock objects gracefully', () => {
      // 非モック関数を含むサービスでもエラーが発生しないことを確認
      const customService = {
        mockMethod: jest.fn(),
        regularMethod: () => 'not a mock',
        nestedObject: {
          innerMock: jest.fn(),
          innerRegular: 'string value'
        }
      }

      const containerWithCustom = new TestContainer({
        services: {
          slackService: customService
        }
      })

      // リセットが正常に実行されることを確認
      expect(() => containerWithCustom.resetAllMocks()).not.toThrow()
    })
  })

  describe('Complex override scenarios', () => {
    it('should handle partial service overrides correctly', () => {
      const customWebhookService = {
        getUserWebhooks: jest.fn().mockResolvedValue({ success: false, error: 'Custom error' })
      }

      const containerWithPartialOverride = new TestContainer({
        services: {
          webhookService: customWebhookService
        }
      })

      expect(containerWithPartialOverride.services.webhookService).toBe(customWebhookService)
      expect(containerWithPartialOverride.services.slackService).toBeDefined() // デフォルト値
    })

    it('should handle multiple category overrides', () => {
      const overrides: TestDependencyOverrides = {
        services: {
          slackService: { customSlackMethod: jest.fn() }
        },
        auth: {
          requireAuthentication: jest.fn().mockResolvedValue('custom-auth-user')
        },
        utils: {
          getAppBaseUrl: jest.fn().mockReturnValue('https://override.example.com')
        }
      }

      const containerWithMultipleOverrides = new TestContainer(overrides)

      expect(containerWithMultipleOverrides.services.slackService).toBe(overrides.services!.slackService)
      expect(containerWithMultipleOverrides.auth.requireAuthentication).toBe(overrides.auth!.requireAuthentication)
      expect(containerWithMultipleOverrides.utils.getAppBaseUrl).toBe(overrides.utils!.getAppBaseUrl)
    })

    it('should handle empty overrides', () => {
      const containerWithEmpty = new TestContainer({})

      expect(containerWithEmpty.services).toBeDefined()
      expect(containerWithEmpty.auth).toBeDefined()
      expect(containerWithEmpty.utils).toBeDefined()
    })
  })

  describe('Mock function verification', () => {
    it('should ensure all service methods are jest mock functions', () => {
      Object.values(container.services).forEach(service => {
        if (service && typeof service === 'object') {
          // 主要なメソッドがmock functionであることを確認
          if (service.create) {expect(jest.isMockFunction(service.create)).toBe(true)}
          if (service.update) {expect(jest.isMockFunction(service.update)).toBe(true)}
          if (service.delete) {expect(jest.isMockFunction(service.delete)).toBe(true)}
          if (service.get) {expect(jest.isMockFunction(service.get)).toBe(true)}
          if (service.list) {expect(jest.isMockFunction(service.list)).toBe(true)}
        }
      })
    })

    it('should ensure all auth methods are jest mock functions', () => {
      expect(jest.isMockFunction(container.auth.requireAuthentication)).toBe(true)
      expect(jest.isMockFunction(container.auth.authenticateUser)).toBe(true)
    })

    it('should ensure utility methods are jest mock functions', () => {
      expect(jest.isMockFunction(container.utils.getAppBaseUrl)).toBe(true)
      expect(jest.isMockFunction(container.utils.verifySlackSignature)).toBe(true)

      const logger = container.utils.webhookLogger
      expect(jest.isMockFunction(logger.debug)).toBe(true)
      expect(jest.isMockFunction(logger.error)).toBe(true)
      expect(jest.isMockFunction(logger.info)).toBe(true)
      expect(jest.isMockFunction(logger.warn)).toBe(true)
    })
  })
})
