/**
 * Repository mocks for service layer testing
 * サービス層テスト用のリポジトリモック
 */

import { SlackRepositoryInterface } from '@/lib/repositories/SlackRepository'
import { TodoRepositoryInterface } from '@/lib/repositories/TodoRepository'
import { createMock } from 'ts-auto-mock'
import { RepositoryResult, RepositoryListResult, RepositoryUtils } from '@/lib/repositories/BaseRepository'

/**
 * モックSlackRepository
 */
export const createMockSlackRepository = (): jest.Mocked<SlackRepositoryInterface> =>
  createMock<SlackRepositoryInterface>() as unknown as jest.Mocked<SlackRepositoryInterface>

/**
 * モックTodoRepository
 */
export const createMockTodoRepository = (): jest.Mocked<TodoRepositoryInterface> =>
  createMock<TodoRepositoryInterface>() as unknown as jest.Mocked<TodoRepositoryInterface>

/**
 * フォールバック: 手書きモック（ts-auto-mockが使えない環境向け）
 */
export const createManualMockSlackRepository = (): jest.Mocked<SlackRepositoryInterface> => ({
  findConnectionById: jest.fn(),
  findConnectionsByUserId: jest.fn(),
  createConnection: jest.fn(),
  upsertConnection: jest.fn(),
  deleteConnection: jest.fn(),
  deleteWebhooksByConnectionIds: jest.fn(),
  deleteConnectionsByUserId: jest.fn(),
  resetUserSlackId: jest.fn(),
  updateUserSlackId: jest.fn(),
  findWebhookById: jest.fn(),
  findWebhooksByUserId: jest.fn(),
  findWebhookByConnectionId: jest.fn(),
  createWebhook: jest.fn(),
  updateWebhook: jest.fn(),
  updateWebhookStats: jest.fn(),
  findProcessedEvent: jest.fn(),
  createProcessedEvent: jest.fn(),
  findUserWithSettings: jest.fn(),
  getDirectSlackUserId: jest.fn()
})

/**
 * 成功結果のヘルパー
 */
export const mockRepositorySuccess = <T>(data: T): RepositoryResult<T> =>
  RepositoryUtils.success(data)

export const mockRepositoryListSuccess = <T>(data: T[]): RepositoryListResult<T> =>
  RepositoryUtils.successList(data)

/**
 * エラー結果のヘルパー
 */
export const mockRepositoryError = <T>(message: string): RepositoryResult<T> =>
  RepositoryUtils.failure(new Error(message))

export const mockRepositoryListError = <T>(message: string): RepositoryListResult<T> =>
  RepositoryUtils.failureList(new Error(message))

/**
 * 404 Not Found結果のヘルパー
 */
export const mockRepositoryNotFound = <T>(): RepositoryResult<T> =>
  RepositoryUtils.failure(new Error('Not found'))

export const mockRepositoryListNotFound = <T>(): RepositoryListResult<T> =>
  RepositoryUtils.successList([])

/**
 * リポジトリモックのセットアップヘルパー
 */
export const setupSlackRepositoryMocks = (
  mockRepo: jest.Mocked<SlackRepositoryInterface>,
  config: {
    findWebhookById?: RepositoryResult<any>
    findUserWithSettings?: RepositoryResult<any>
    getDirectSlackUserId?: RepositoryResult<any>
    findConnectionById?: RepositoryResult<any>
    findProcessedEvent?: RepositoryResult<any>
  } = {}
) => {
  if (config.findWebhookById !== undefined) {
    mockRepo.findWebhookById.mockResolvedValue(config.findWebhookById)
  }
  if (config.findUserWithSettings !== undefined) {
    mockRepo.findUserWithSettings.mockResolvedValue(config.findUserWithSettings)
  }
  if (config.getDirectSlackUserId !== undefined) {
    mockRepo.getDirectSlackUserId.mockResolvedValue(config.getDirectSlackUserId)
  }
  if (config.findConnectionById !== undefined) {
    mockRepo.findConnectionById.mockResolvedValue(config.findConnectionById)
  }
  if (config.findProcessedEvent !== undefined) {
    mockRepo.findProcessedEvent.mockResolvedValue(config.findProcessedEvent)
  }

  return mockRepo
}

export const setupTodoRepositoryMocks = (
  mockRepo: jest.Mocked<TodoRepositoryInterface>,
  config: {
    createViaRPC?: RepositoryResult<any>
    create?: RepositoryResult<any>
  } = {}
) => {
  if (config.createViaRPC !== undefined) {
    mockRepo.createViaRPC.mockResolvedValue(config.createViaRPC)
  }
  if (config.create !== undefined) {
    mockRepo.create.mockResolvedValue(config.create)
  }

  return mockRepo
}
