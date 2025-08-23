/**
 * Dependency Container Tests
 * 依存性注入コンテナの基底クラステスト
 */

import { NextRequest } from 'next/server'
import {
  BaseDependencyContainer,
  DependencyContainer,
  ServiceDependencies,
  AuthDependencies,
  UtilityDependencies,
  RequestScopedContainer,
  TestDependencyOverrides
} from '@/lib/containers/DependencyContainer'

describe('DependencyContainer', () => {
  // テスト用の具象クラス
  class TestDependencyContainer extends BaseDependencyContainer {
    public services: ServiceDependencies
    public auth: AuthDependencies
    public utils: UtilityDependencies

    constructor(
      services?: Partial<ServiceDependencies>,
      auth?: Partial<AuthDependencies>,
      utils?: Partial<UtilityDependencies>
    ) {
      super()
      this.services = {
        slackService: services && 'slackService' in services ? services.slackService : jest.fn(),
        slackConnectionService: services && 'slackConnectionService' in services ? services.slackConnectionService : jest.fn(),
        slackAuthService: services && 'slackAuthService' in services ? services.slackAuthService : jest.fn(),
        slackMessageService: services && 'slackMessageService' in services ? services.slackMessageService : jest.fn(),
        emojiSettingsService: services && 'emojiSettingsService' in services ? services.emojiSettingsService : jest.fn(),
        notificationSettingsService: services && 'notificationSettingsService' in services ? services.notificationSettingsService : jest.fn(),
        titleGenerationService: services && 'titleGenerationService' in services ? services.titleGenerationService : jest.fn(),
        urlDetectionService: services && 'urlDetectionService' in services ? services.urlDetectionService : jest.fn(),
        slackDisconnectionService: services && 'slackDisconnectionService' in services ? services.slackDisconnectionService : jest.fn(),
        webhookService: services && 'webhookService' in services ? services.webhookService : jest.fn()
      }
      this.auth = {
        requireAuthentication: auth && 'requireAuthentication' in auth ? auth.requireAuthentication : jest.fn() as any,
        authenticateUser: auth && 'authenticateUser' in auth ? auth.authenticateUser : jest.fn() as any
      }
      this.utils = {
        getAppBaseUrl: utils && 'getAppBaseUrl' in utils ? utils.getAppBaseUrl : jest.fn() as any,
        webhookLogger: utils && 'webhookLogger' in utils ? utils.webhookLogger : { debug: jest.fn(), error: jest.fn(), info: jest.fn() },
        verifySlackSignature: utils && 'verifySlackSignature' in utils ? utils.verifySlackSignature : jest.fn() as any
      }
      this.initialize()
    }

    protected initialize(): void {
      // テスト用初期化（必要に応じて処理を追加）
    }

    // protected メソッドをテストするためのpublic wrapper
    public testValidateDependencies(): void {
      this.validateDependencies()
    }
  }

  // リクエストスコープ付きコンテナのテスト実装
  class TestRequestScopedContainer extends TestDependencyContainer implements RequestScopedContainer {
    private requestContext?: NextRequest

    setRequestContext(request: NextRequest): void {
      this.requestContext = request
    }

    getRequestContext(): NextRequest | undefined {
      return this.requestContext
    }
  }

  describe('BaseDependencyContainer', () => {
    it('should create container with all required dependencies', () => {
      const container = new TestDependencyContainer()

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

      // 認証依存関係の確認
      expect(container.auth.requireAuthentication).toBeDefined()
      expect(container.auth.authenticateUser).toBeDefined()

      // ユーティリティ依存関係の確認
      expect(container.utils.getAppBaseUrl).toBeDefined()
      expect(container.utils.webhookLogger).toBeDefined()
      expect(container.utils.verifySlackSignature).toBeDefined()
    })

    it('should validate all dependencies successfully', () => {
      const container = new TestDependencyContainer()

      expect(() => container.testValidateDependencies()).not.toThrow()
    })

    it('should throw error when service dependency is missing', () => {
      const container = new TestDependencyContainer({
        slackService: undefined // 必要な依存関係を削除
      } as any)

      expect(() => container.testValidateDependencies()).toThrow('Missing required service: slackService')
    })

    it('should throw error when multiple service dependencies are missing', () => {
      const container = new TestDependencyContainer({
        slackService: undefined,
        slackConnectionService: undefined
      } as any)

      expect(() => container.testValidateDependencies()).toThrow('Missing required service: slackService')
    })

    it('should throw error when auth dependency is missing', () => {
      const container = new TestDependencyContainer(undefined, {
        requireAuthentication: undefined
      } as any)

      expect(() => container.testValidateDependencies()).toThrow('Missing required auth dependencies')
    })

    it('should throw error when both auth dependencies are missing', () => {
      const container = new TestDependencyContainer(undefined, {
        requireAuthentication: undefined,
        authenticateUser: undefined
      } as any)

      expect(() => container.testValidateDependencies()).toThrow('Missing required auth dependencies')
    })

    it('should throw error when utility dependency is missing', () => {
      const container = new TestDependencyContainer(undefined, undefined, {
        getAppBaseUrl: undefined
      } as any)

      expect(() => container.testValidateDependencies()).toThrow('Missing required utility dependencies')
    })

    it('should throw error when webhook logger is missing', () => {
      const container = new TestDependencyContainer(undefined, undefined, {
        webhookLogger: undefined
      } as any)

      expect(() => container.testValidateDependencies()).toThrow('Missing required utility dependencies')
    })

    it('should throw error when verifySlackSignature is missing', () => {
      const container = new TestDependencyContainer(undefined, undefined, {
        verifySlackSignature: undefined
      } as any)

      expect(() => container.testValidateDependencies()).toThrow('Missing required utility dependencies')
    })

    it('should allow custom service implementations', () => {
      const customSlackService = { customMethod: jest.fn() }
      const customAuthService = { customAuthMethod: jest.fn() }

      const container = new TestDependencyContainer({
        slackService: customSlackService,
        slackAuthService: customAuthService
      })

      expect(container.services.slackService).toBe(customSlackService)
      expect(container.services.slackAuthService).toBe(customAuthService)
      expect(() => container.testValidateDependencies()).not.toThrow()
    })

    it('should allow custom auth implementations', () => {
      const customRequireAuth = jest.fn()
      const customAuthenticateUser = jest.fn()

      const container = new TestDependencyContainer(undefined, {
        requireAuthentication: customRequireAuth,
        authenticateUser: customAuthenticateUser
      })

      expect(container.auth.requireAuthentication).toBe(customRequireAuth)
      expect(container.auth.authenticateUser).toBe(customAuthenticateUser)
      expect(() => container.testValidateDependencies()).not.toThrow()
    })

    it('should allow custom utility implementations', () => {
      const customGetAppBaseUrl = jest.fn()
      const customLogger = { debug: jest.fn(), error: jest.fn() }
      const customVerifySignature = jest.fn()

      const container = new TestDependencyContainer(undefined, undefined, {
        getAppBaseUrl: customGetAppBaseUrl,
        webhookLogger: customLogger,
        verifySlackSignature: customVerifySignature
      })

      expect(container.utils.getAppBaseUrl).toBe(customGetAppBaseUrl)
      expect(container.utils.webhookLogger).toBe(customLogger)
      expect(container.utils.verifySlackSignature).toBe(customVerifySignature)
      expect(() => container.testValidateDependencies()).not.toThrow()
    })
  })

  describe('RequestScopedContainer', () => {
    let container: TestRequestScopedContainer
    let mockRequest: NextRequest

    beforeEach(() => {
      container = new TestRequestScopedContainer()
      mockRequest = {
        headers: new Headers(),
        url: 'https://example.com/api/test'
      } as NextRequest
    })

    it('should set and get request context', () => {
      expect(container.getRequestContext()).toBeUndefined()

      container.setRequestContext(mockRequest)

      expect(container.getRequestContext()).toBe(mockRequest)
    })

    it('should handle multiple request context changes', () => {
      const request1 = { url: 'https://example.com/api/test1' } as NextRequest
      const request2 = { url: 'https://example.com/api/test2' } as NextRequest

      container.setRequestContext(request1)
      expect(container.getRequestContext()).toBe(request1)

      container.setRequestContext(request2)
      expect(container.getRequestContext()).toBe(request2)
    })

    it('should maintain all base container functionality', () => {
      container.setRequestContext(mockRequest)

      expect(container.services).toBeDefined()
      expect(container.auth).toBeDefined()
      expect(container.utils).toBeDefined()
      expect(() => container.testValidateDependencies()).not.toThrow()
    })
  })

  describe('Type Safety and Interface Compliance', () => {
    it('should satisfy DependencyContainer interface', () => {
      const container: DependencyContainer = new TestDependencyContainer()

      expect(container.services).toBeDefined()
      expect(container.auth).toBeDefined()
      expect(container.utils).toBeDefined()

      // TypeScript will catch interface violations at compile time
      expect(typeof container.services).toBe('object')
      expect(typeof container.auth).toBe('object')
      expect(typeof container.utils).toBe('object')
    })

    it('should satisfy RequestScopedContainer interface', () => {
      const container: RequestScopedContainer = new TestRequestScopedContainer()

      expect(typeof container.setRequestContext).toBe('function')
      expect(typeof container.getRequestContext).toBe('function')
      expect(container.services).toBeDefined()
      expect(container.auth).toBeDefined()
      expect(container.utils).toBeDefined()
    })

    it('should handle ServiceDependencies interface correctly', () => {
      const services: ServiceDependencies = {
        slackService: jest.fn(),
        slackConnectionService: jest.fn(),
        slackAuthService: jest.fn(),
        slackMessageService: jest.fn(),
        emojiSettingsService: jest.fn(),
        notificationSettingsService: jest.fn(),
        titleGenerationService: jest.fn(),
        urlDetectionService: jest.fn(),
        slackDisconnectionService: jest.fn(),
        webhookService: jest.fn()
      }

      const container = new TestDependencyContainer(services)
      expect(container.services).toEqual(services)
    })

    it('should handle AuthDependencies interface correctly', () => {
      const auth: AuthDependencies = {
        requireAuthentication: jest.fn(),
        authenticateUser: jest.fn()
      }

      const container = new TestDependencyContainer(undefined, auth)
      expect(container.auth).toEqual(auth)
    })

    it('should handle UtilityDependencies interface correctly', () => {
      const utils: UtilityDependencies = {
        getAppBaseUrl: jest.fn(),
        webhookLogger: { debug: jest.fn(), error: jest.fn(), info: jest.fn() },
        verifySlackSignature: jest.fn()
      }

      const container = new TestDependencyContainer(undefined, undefined, utils)
      expect(container.utils).toEqual(utils)
    })
  })

  describe('TestDependencyOverrides interface', () => {
    it('should handle partial service overrides', () => {
      const overrides: TestDependencyOverrides = {
        services: {
          slackService: { customMethod: jest.fn() }
        }
      }

      const container = new TestDependencyContainer(overrides.services)

      expect(container.services.slackService).toBe(overrides.services!.slackService)
      expect(container.services.slackConnectionService).toBeDefined() // デフォルト値
    })

    it('should handle partial auth overrides', () => {
      const overrides: TestDependencyOverrides = {
        auth: {
          requireAuthentication: jest.fn().mockResolvedValue('test-user-id')
        }
      }

      const container = new TestDependencyContainer(undefined, overrides.auth)

      expect(container.auth.requireAuthentication).toBe(overrides.auth!.requireAuthentication)
      expect(container.auth.authenticateUser).toBeDefined() // デフォルト値
    })

    it('should handle partial utility overrides', () => {
      const overrides: TestDependencyOverrides = {
        utils: {
          getAppBaseUrl: jest.fn().mockReturnValue('https://test.example.com')
        }
      }

      const container = new TestDependencyContainer(undefined, undefined, overrides.utils)

      expect(container.utils.getAppBaseUrl).toBe(overrides.utils!.getAppBaseUrl)
      expect(container.utils.webhookLogger).toBeDefined() // デフォルト値
      expect(container.utils.verifySlackSignature).toBeDefined() // デフォルト値
    })

    it('should handle multiple override categories', () => {
      const overrides: TestDependencyOverrides = {
        services: {
          slackService: { custom: 'slack' }
        },
        auth: {
          requireAuthentication: jest.fn()
        },
        utils: {
          getAppBaseUrl: jest.fn()
        }
      }

      const container = new TestDependencyContainer(
        overrides.services,
        overrides.auth,
        overrides.utils
      )

      expect(container.services.slackService).toBe(overrides.services!.slackService)
      expect(container.auth.requireAuthentication).toBe(overrides.auth!.requireAuthentication)
      expect(container.utils.getAppBaseUrl).toBe(overrides.utils!.getAppBaseUrl)
    })
  })

  describe('Error Handling', () => {
    it('should handle null dependencies gracefully', () => {
      expect(() => {
        new TestDependencyContainer({
          slackService: null
        } as any)
      }).not.toThrow()

      const container = new TestDependencyContainer({
        slackService: null
      } as any)

      expect(() => container.testValidateDependencies()).toThrow('Missing required service: slackService')
    })

    it('should validate all service dependencies systematically', () => {
      const requiredServices = [
        'slackService', 'slackConnectionService', 'slackAuthService',
        'slackMessageService', 'emojiSettingsService', 'notificationSettingsService',
        'titleGenerationService', 'urlDetectionService', 'slackDisconnectionService',
        'webhookService'
      ]

      requiredServices.forEach(serviceName => {
        const container = new TestDependencyContainer({
          [serviceName]: undefined
        } as any)

        expect(() => container.testValidateDependencies())
          .toThrow(`Missing required service: ${serviceName}`)
      })
    })
  })
})
