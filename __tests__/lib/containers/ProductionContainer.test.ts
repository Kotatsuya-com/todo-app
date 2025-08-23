/**
 * Production Dependency Container Tests
 * プロダクション環境用依存関係コンテナテスト
 */

import {
  ProductionContainer,
  getProductionContainer,
  resetProductionContainer
} from '@/lib/containers/ProductionContainer'

// 依存関係をモック
jest.mock('@/lib/services/BackendServiceFactory', () => ({
  createServices: jest.fn()
}))

jest.mock('@/lib/auth/authentication', () => ({
  requireAuthentication: jest.fn(),
  authenticateUser: jest.fn()
}))

jest.mock('@/lib/ngrok-url', () => ({
  getAppBaseUrl: jest.fn()
}))

jest.mock('@/lib/logger', () => ({
  webhookLogger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}))

jest.mock('@/lib/slack-signature', () => ({
  verifySlackSignature: jest.fn()
}))

import { createServices } from '@/lib/services/BackendServiceFactory'
import { requireAuthentication, authenticateUser } from '@/lib/auth/authentication'
import { getAppBaseUrl } from '@/lib/ngrok-url'
import { webhookLogger } from '@/lib/logger'
import { verifySlackSignature } from '@/lib/slack-signature'

describe('ProductionContainer', () => {
  // モックサービスインスタンス
  const mockServices = {
    slackService: { processWebhookEvent: jest.fn() },
    slackConnectionService: { createConnection: jest.fn() },
    slackAuthService: { processOAuthCallback: jest.fn() },
    slackMessageService: { fetchSlackMessage: jest.fn() },
    emojiSettingsService: { getUserEmojiSettings: jest.fn() },
    notificationSettingsService: { getUserNotificationSettings: jest.fn() },
    titleGenerationService: { generateTitle: jest.fn() },
    urlDetectionService: { detectUrl: jest.fn() },
    slackDisconnectionService: { disconnectSlack: jest.fn() },
    webhookService: { getUserWebhooks: jest.fn() }
  }

  beforeEach(() => {
    // createServicesのモック設定
    (createServices as jest.Mock).mockReturnValue(mockServices)

    // シングルトンをリセット
    resetProductionContainer()
  })

  afterEach(() => {
    jest.clearAllMocks()
    resetProductionContainer()
  })

  describe('ProductionContainer constructor', () => {
    it('should create container with all dependencies', () => {
      const container = new ProductionContainer()

      expect(container.services).toBeDefined()
      expect(container.auth).toBeDefined()
      expect(container.utils).toBeDefined()

      // サービス依存関係の確認
      expect(container.services.slackService).toBe(mockServices.slackService)
      expect(container.services.slackConnectionService).toBe(mockServices.slackConnectionService)
      expect(container.services.slackAuthService).toBe(mockServices.slackAuthService)
      expect(container.services.slackMessageService).toBe(mockServices.slackMessageService)
      expect(container.services.emojiSettingsService).toBe(mockServices.emojiSettingsService)
      expect(container.services.notificationSettingsService).toBe(mockServices.notificationSettingsService)
      expect(container.services.titleGenerationService).toBe(mockServices.titleGenerationService)
      expect(container.services.urlDetectionService).toBe(mockServices.urlDetectionService)
      expect(container.services.slackDisconnectionService).toBe(mockServices.slackDisconnectionService)
      expect(container.services.webhookService).toBe(mockServices.webhookService)

      // 認証依存関係の確認
      expect(container.auth.requireAuthentication).toBe(requireAuthentication)
      expect(container.auth.authenticateUser).toBe(authenticateUser)

      // ユーティリティ依存関係の確認
      expect(container.utils.getAppBaseUrl).toBe(getAppBaseUrl)
      expect(container.utils.webhookLogger).toBe(webhookLogger)
      expect(container.utils.verifySlackSignature).toBe(verifySlackSignature)
    })

    it('should call createServices during initialization', () => {
      new ProductionContainer()

      expect(createServices).toHaveBeenCalledTimes(1)
    })

    it('should throw error when services are null', () => {
      // 一部のサービスがnullを返すケース
      const partialServices = {
        ...mockServices,
        slackService: null,
        slackConnectionService: null
      }
      ;(createServices as jest.Mock).mockReturnValue(partialServices)

      expect(() => {
        new ProductionContainer()
      }).toThrow('Missing required service: slackService')
    })

    it('should throw error when some services are undefined', () => {
      // 一部のサービスが存在しないケース
      const incompleteServices = {
        slackService: mockServices.slackService,
        slackAuthService: mockServices.slackAuthService
        // 他のサービスは undefined
      }
      ;(createServices as jest.Mock).mockReturnValue(incompleteServices)

      expect(() => {
        new ProductionContainer()
      }).toThrow('Missing required service: slackConnectionService')
    })
  })

  describe('Dependency validation', () => {
    it('should validate dependencies successfully with all services', () => {
      expect(() => {
        new ProductionContainer()
      }).not.toThrow()
    })

    it('should throw error when createServices fails', () => {
      (createServices as jest.Mock).mockImplementation(() => {
        throw new Error('Service creation failed')
      })

      expect(() => {
        new ProductionContainer()
      }).toThrow('Service creation failed')
    })

    it('should validate with null services (validation should handle null)', () => {
      const servicesWithNulls = Object.keys(mockServices).reduce((acc, key) => {
        acc[key as keyof typeof mockServices] = null
        return acc
      }, {} as any)

      ;(createServices as jest.Mock).mockReturnValue(servicesWithNulls)

      // コンテナ作成時にvalidateDependencies()が呼ばれてエラーが発生するはず
      expect(() => {
        new ProductionContainer()
      }).toThrow('Missing required service')
    })
  })

  describe('getProductionContainer singleton pattern', () => {
    it('should return same instance on multiple calls', () => {
      const container1 = getProductionContainer()
      const container2 = getProductionContainer()

      expect(container1).toBe(container2)
      expect(container1).toBeInstanceOf(ProductionContainer)
    })

    it('should create new instance only once', () => {
      getProductionContainer()
      getProductionContainer()
      getProductionContainer()

      // createServices が1回だけ呼ばれることを確認
      expect(createServices).toHaveBeenCalledTimes(1)
    })

    it('should have all dependencies configured', () => {
      const container = getProductionContainer()

      expect(container.services).toBeDefined()
      expect(container.auth).toBeDefined()
      expect(container.utils).toBeDefined()

      // 具体的な依存関係の確認
      expect(container.services.slackService).toBeDefined()
      expect(container.auth.requireAuthentication).toBeDefined()
      expect(container.utils.getAppBaseUrl).toBeDefined()
    })
  })

  describe('resetProductionContainer', () => {
    it('should reset singleton instance', () => {
      const container1 = getProductionContainer()

      resetProductionContainer()

      const container2 = getProductionContainer()

      expect(container1).not.toBe(container2)
      expect(container2).toBeInstanceOf(ProductionContainer)
    })

    it('should allow new instance creation after reset', () => {
      getProductionContainer()
      expect(createServices).toHaveBeenCalledTimes(1)

      resetProductionContainer()

      getProductionContainer()
      expect(createServices).toHaveBeenCalledTimes(2)
    })

    it('should be safe to call multiple times', () => {
      const container1 = getProductionContainer()

      resetProductionContainer()
      resetProductionContainer()
      resetProductionContainer()

      const container2 = getProductionContainer()

      expect(container1).not.toBe(container2)
      expect(() => resetProductionContainer()).not.toThrow()
    })
  })

  describe('Service layer integration', () => {
    it('should properly integrate with BackendServiceFactory', () => {
      const container = new ProductionContainer()

      expect(createServices).toHaveBeenCalledWith()
      expect(container.services.slackService).toBe(mockServices.slackService)
      expect(container.services.webhookService).toBe(mockServices.webhookService)
    })

    it('should throw error when BackendServiceFactory returns empty object', () => {
      (createServices as jest.Mock).mockReturnValue({})

      expect(() => {
        new ProductionContainer()
      }).toThrow('Missing required service: slackService')
    })
  })

  describe('Authentication layer integration', () => {
    it('should properly integrate with authentication module', () => {
      const container = new ProductionContainer()

      expect(container.auth.requireAuthentication).toBe(requireAuthentication)
      expect(container.auth.authenticateUser).toBe(authenticateUser)
    })
  })

  describe('Utility layer integration', () => {
    it('should properly integrate with utility modules', () => {
      const container = new ProductionContainer()

      expect(container.utils.getAppBaseUrl).toBe(getAppBaseUrl)
      expect(container.utils.webhookLogger).toBe(webhookLogger)
      expect(container.utils.verifySlackSignature).toBe(verifySlackSignature)
    })

    it('should configure logger with all required methods', () => {
      const container = new ProductionContainer()

      expect(container.utils.webhookLogger.debug).toBeDefined()
      expect(container.utils.webhookLogger.error).toBeDefined()
      expect(container.utils.webhookLogger.info).toBeDefined()
      expect(container.utils.webhookLogger.warn).toBeDefined()
    })
  })

  describe('Error handling', () => {
    it('should handle service factory initialization errors', () => {
      (createServices as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      expect(() => {
        new ProductionContainer()
      }).toThrow('Database connection failed')
    })

    it('should propagate validation errors', () => {
      // サービスの一部を削除して検証エラーを発生させる
      const invalidServices = { ...mockServices }
      ;(invalidServices as any).slackService = undefined

      ;(createServices as jest.Mock).mockReturnValue(invalidServices)

      expect(() => {
        new ProductionContainer()
      }).toThrow('Missing required service: slackService')
    })

    it('should throw error when services are missing', () => {
      const partialServices = {
        slackService: mockServices.slackService,
        slackAuthService: mockServices.slackAuthService,
        webhookService: mockServices.webhookService
        // 他のサービスは undefined
      }
      ;(createServices as jest.Mock).mockReturnValue(partialServices)

      expect(() => {
        new ProductionContainer()
      }).toThrow('Missing required service: slackConnectionService')
    })
  })

  describe('Memory management', () => {
    it('should properly cleanup on reset', () => {
      const container1 = getProductionContainer()
      const weakRef = new WeakRef(container1)

      resetProductionContainer()

      // ガベージコレクションをトリガー (Node.js環境でのテスト)
      if (global.gc) {
        global.gc()
      }

      // WeakRef のテストは環境依存なので、基本的な動作のみテスト
      expect(getProductionContainer()).not.toBe(container1)
    })
  })
})
