/**
 * Mock Builder Pattern
 * 流暢なAPIでモックを段階的に構築するビルダーパターン
 *
 * チェーンメソッドで必要なモックの振る舞いを定義し、
 * 最終的に型安全なモックオブジェクトを生成します。
 */

import { jest } from '@jest/globals'
import { createAutoMock, mockResult, serviceResult } from './autoMock'

/**
 * 汎用Mock Builder
 * 任意のインターフェースに対してモックを段階的に構築
 *
 * @example
 * const mockRepo = new MockBuilder<SlackRepositoryInterface>()
 *   .withMethod('findWebhookById', mockWebhook)
 *   .withError('updateWebhook', 'Database error')
 *   .build();
 */
export class MockBuilder<T> {
  private mock: jest.Mocked<T>
  private setupHistory: string[] = []

  constructor() {
    this.mock = createAutoMock<T>()
  }

  /**
   * メソッドに成功レスポンスを設定
   */
  withSuccess<K extends keyof T>(
    method: K,
    returnValue: any
  ): this {
    (this.mock[method] as any) = jest.fn().mockResolvedValue(returnValue)
    this.setupHistory.push(`${String(method)}: success`)
    return this
  }

  /**
   * メソッドにエラーレスポンスを設定
   */
  withError<K extends keyof T>(
    method: K,
    error: string | Error
  ): this {
    (this.mock[method] as any) = jest.fn().mockRejectedValue(
      error instanceof Error ? error : new Error(error)
    )
    this.setupHistory.push(`${String(method)}: error`)
    return this
  }

  /**
   * メソッドにカスタム実装を設定
   */
  withImplementation<K extends keyof T>(
    method: K,
    implementation: (...args: any[]) => any
  ): this {
    (this.mock[method] as any) = jest.fn().mockImplementation(implementation)
    this.setupHistory.push(`${String(method)}: custom`)
    return this
  }

  /**
   * メソッドに連続した異なる戻り値を設定
   */
  withSequence<K extends keyof T>(
    method: K,
    ...values: any[]
  ): this {
    const mock = jest.fn()
    values.forEach(value => {
      mock.mockResolvedValueOnce(value)
    });
    (this.mock[method] as any) = mock
    this.setupHistory.push(`${String(method)}: sequence(${values.length})`)
    return this
  }

  /**
   * 一度だけ特定の値を返すように設定
   */
  withOnce<K extends keyof T>(
    method: K,
    value: any
  ): this {
    if (!this.mock[method]) {
      (this.mock[method] as any) = jest.fn()
    }
    (this.mock[method] as any).mockResolvedValueOnce(value)
    this.setupHistory.push(`${String(method)}: once`)
    return this
  }

  /**
   * 設定履歴を取得（デバッグ用）
   */
  getSetupHistory(): string[] {
    return [...this.setupHistory]
  }

  /**
   * 構築したモックを取得
   */
  build(): jest.Mocked<T> {
    return this.mock
  }
}

/**
 * Repository専用Mock Builder
 * Repository Resultパターンに特化したビルダー
 *
 * @example
 * const mockRepo = new RepositoryMockBuilder<SlackRepositoryInterface>()
 *   .withData('findWebhookById', mockWebhook)
 *   .withNotFound('findWebhookByConnectionId')
 *   .withDatabaseError('updateWebhook')
 *   .build();
 */
export class RepositoryMockBuilder<T> extends MockBuilder<T> {
  /**
   * 成功レスポンス（data付き）を設定
   */
  withData<K extends keyof T>(
    method: K,
    data: any
  ): this {
    return this.withSuccess(method, mockResult.success(data))
  }

  /**
   * エラーレスポンスを設定
   */
  withRepositoryError<K extends keyof T>(
    method: K,
    error: string
  ): this {
    return this.withSuccess(method, mockResult.error(error))
  }

  /**
   * Not Foundレスポンスを設定
   */
  withNotFound<K extends keyof T>(
    method: K
  ): this {
    return this.withSuccess(method, mockResult.error('Not found'))
  }

  /**
   * データベースエラーを設定
   */
  withDatabaseError<K extends keyof T>(
    method: K
  ): this {
    return this.withSuccess(method, mockResult.error('Database error'))
  }

  /**
   * 複数のデータを返すように設定
   */
  withMultipleData<K extends keyof T>(
    method: K,
    ...dataArray: any[]
  ): this {
    const results = dataArray.map(data => mockResult.success(data))
    return this.withSequence(method, ...results)
  }
}

/**
 * Service専用Mock Builder
 * Service Resultパターンに特化したビルダー
 *
 * @example
 * const mockService = new ServiceMockBuilder<SlackService>()
 *   .withServiceSuccess('processWebhookEvent', { processed: true })
 *   .withServiceError('disconnectWorkspace', 'Unauthorized', 403)
 *   .build();
 */
export class ServiceMockBuilder<T> extends MockBuilder<T> {
  /**
   * Service成功レスポンスを設定
   */
  withServiceSuccess<K extends keyof T>(
    method: K,
    data: any,
    statusCode = 200
  ): this {
    return this.withSuccess(method, serviceResult.success(data, statusCode))
  }

  /**
   * Serviceエラーレスポンスを設定
   */
  withServiceError<K extends keyof T>(
    method: K,
    error: string,
    statusCode = 500
  ): this {
    return this.withSuccess(method, serviceResult.error(error, statusCode))
  }

  /**
   * 認証エラーを設定
   */
  withUnauthorized<K extends keyof T>(
    method: K
  ): this {
    return this.withServiceError(method, 'Unauthorized', 401)
  }

  /**
   * 権限エラーを設定
   */
  withForbidden<K extends keyof T>(
    method: K
  ): this {
    return this.withServiceError(method, 'Forbidden', 403)
  }

  /**
   * Not Foundエラーを設定
   */
  withNotFound<K extends keyof T>(
    method: K
  ): this {
    return this.withServiceError(method, 'Not found', 404)
  }

  /**
   * バリデーションエラーを設定
   */
  withValidationError<K extends keyof T>(
    method: K,
    errors: string[]
  ): this {
    return this.withServiceError(method, errors.join(', '), 400)
  }
}

/**
 * Scenario Builder
 * 複数のモックを組み合わせてテストシナリオを構築
 *
 * @example
 * const scenario = new ScenarioBuilder()
 *   .withRepository('slack', mockSlackRepo)
 *   .withService('notification', mockNotificationService)
 *   .withSuccessFlow('webhook-creation')
 *   .build();
 */
export class ScenarioBuilder {
  private repositories: Map<string, any> = new Map()
  private services: Map<string, any> = new Map()
  private flows: Map<string, () => void> = new Map()

  withRepository(name: string, mock: any): this {
    this.repositories.set(name, mock)
    return this
  }

  withService(name: string, mock: any): this {
    this.services.set(name, mock)
    return this
  }

  withFlow(name: string, setup: () => void): this {
    this.flows.set(name, setup)
    return this
  }

  withSuccessFlow(scenario: string): this {
    // 事前定義された成功シナリオ
    const successFlows: Record<string, () => void> = {
      'webhook-creation': () => {
        // Webhook作成の成功フローをセットアップ
        const slackRepo = this.repositories.get('slack')
        if (slackRepo) {
          slackRepo.findWebhookById.mockResolvedValue(
            mockResult.success({ id: 'webhook-123', is_active: true })
          )
        }
      }
      // 他のシナリオ...
    }

    const flow = successFlows[scenario]
    if (flow) {
      flow()
    }
    return this
  }

  build() {
    return {
      repositories: Object.fromEntries(this.repositories),
      services: Object.fromEntries(this.services),
      executeFlow: (name: string) => {
        const flow = this.flows.get(name)
        if (flow) {flow()}
      }
    }
  }
}

// Export helper function for quick mock creation
export function mockBuilder<T>() {
  return new MockBuilder<T>()
}

export function repositoryMock<T>() {
  return new RepositoryMockBuilder<T>()
}

export function serviceMock<T>() {
  return new ServiceMockBuilder<T>()
}

export function scenario() {
  return new ScenarioBuilder()
}
