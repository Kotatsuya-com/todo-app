/**
 * UI Container
 * コンポーネント層用の依存性注入コンテナ
 */

import { UIService, UIServiceInterface } from '../services/UIService'
import { UIRepository } from '../repositories/UIRepository'

export interface UIDependencyContainer {
  services: {
    uiService: UIServiceInterface
  }
}

/**
 * プロダクション用のUIコンテナ
 */
export class ProductionUIContainer implements UIDependencyContainer {
  private static instance: ProductionUIContainer

  public readonly services: {
    uiService: UIServiceInterface
  }

  private constructor() {
    // Repository層を作成
    const uiRepository = new UIRepository()

    // Service層を作成（repositoryを注入）
    this.services = {
      uiService: new UIService(uiRepository)
    }
  }

  static getInstance(): ProductionUIContainer {
    if (!ProductionUIContainer.instance) {
      ProductionUIContainer.instance = new ProductionUIContainer()
    }
    return ProductionUIContainer.instance
  }

  /**
   * シングルトンインスタンスをリセット（テスト用）
   */
  static resetInstance(): void {
    ProductionUIContainer.instance = null as any
  }
}

/**
 * プロダクション用コンテナのインスタンスを取得
 */
export function getUIContainer(): UIDependencyContainer {
  return ProductionUIContainer.getInstance()
}

/**
 * テスト用のモックコンテナ
 */
export class MockUIContainer implements UIDependencyContainer {
  public services: {
    uiService: UIServiceInterface
  }

  constructor(mockServices: Partial<{ uiService: UIServiceInterface }> = {}) {
    // デフォルトのモックサービスを作成
    const defaultUIService: UIServiceInterface = {
      checkSlackConnections: jest.fn().mockResolvedValue({
        success: true,
        data: { connections: [] }
      }),
      fetchSlackMessage: jest.fn().mockResolvedValue({
        success: true,
        data: {
          text: 'Mock Slack message content',
          url: 'https://workspace.slack.com/archives/C123/p123456789',
          workspace: 'Mock Workspace'
        }
      }),
      generateTitle: jest.fn().mockResolvedValue({
        success: true,
        data: { title: 'Generated Mock Title' }
      })
    }

    this.services = {
      uiService: mockServices.uiService || defaultUIService
    }
  }

  /**
   * サービスのモック実装を更新
   */
  updateServiceMock(serviceName: 'uiService', mockMethods: Partial<UIServiceInterface>): void {
    this.services[serviceName] = {
      ...this.services[serviceName],
      ...mockMethods
    } as UIServiceInterface
  }
}
