/**
 * Repository モック
 * 新しいアーキテクチャ用のテストモック
 */

import {
  SlackRepositoryInterface
} from '@/lib/repositories/SlackRepository'
import {
  TodoRepositoryInterface
} from '@/lib/repositories/TodoRepository'
import {
  RepositoryResult,
  RepositoryListResult,
  RepositoryUtils
} from '@/lib/repositories/BaseRepository'

export class MockSlackRepository implements SlackRepositoryInterface {
  private mockResults: any[] = []
  private callIndex = 0

  constructor(mockResults: any[] = []) {
    this.mockResults = mockResults
  }

  private getNextResult(): any {
    const result = this.mockResults[this.callIndex] || { data: null, error: null }
    this.callIndex++
    return result
  }

  // Mock implementations
  async findConnectionById(id: string): Promise<RepositoryResult<any>> {
    return this.getNextResult()
  }

  async findConnectionsByUserId(userId: string): Promise<RepositoryListResult<any>> {
    return this.getNextResult()
  }

  async createConnection(connection: any): Promise<RepositoryResult<any>> {
    return this.getNextResult()
  }

  async deleteConnection(id: string, userId: string): Promise<RepositoryResult<void>> {
    return this.getNextResult()
  }

  async findWebhookById(webhookId: string): Promise<RepositoryResult<any>> {
    return this.getNextResult()
  }

  async findWebhooksByUserId(userId: string): Promise<RepositoryListResult<any>> {
    return this.getNextResult()
  }

  async findWebhookByConnectionId(userId: string, connectionId: string): Promise<RepositoryResult<any>> {
    return this.getNextResult()
  }

  async createWebhook(webhook: any): Promise<RepositoryResult<any>> {
    return this.getNextResult()
  }

  async updateWebhook(id: string, updates: any): Promise<RepositoryResult<any>> {
    return this.getNextResult()
  }

  async updateWebhookStats(id: string, eventCount: number): Promise<RepositoryResult<void>> {
    return this.getNextResult()
  }

  async findProcessedEvent(eventKey: string): Promise<RepositoryResult<any>> {
    return this.getNextResult()
  }

  async createProcessedEvent(event: any): Promise<RepositoryResult<any>> {
    return this.getNextResult()
  }

  async findUserWithSettings(userId: string): Promise<RepositoryResult<any>> {
    return this.getNextResult()
  }

  async getAllWebhooks(): Promise<RepositoryListResult<any>> {
    return this.getNextResult()
  }

  async getDirectSlackUserId(userId: string): Promise<RepositoryResult<any>> {
    return this.getNextResult()
  }
}

export class MockTodoRepository implements TodoRepositoryInterface {
  private mockResults: any[] = []
  private callIndex = 0

  constructor(mockResults: any[] = []) {
    this.mockResults = mockResults
  }

  private getNextResult(): any {
    const result = this.mockResults[this.callIndex] || { data: null, error: null }
    this.callIndex++
    return result
  }

  // Mock implementations
  async findById(id: string): Promise<RepositoryResult<any>> {
    return this.getNextResult()
  }

  async findByUserId(userId: string): Promise<RepositoryListResult<any>> {
    return this.getNextResult()
  }

  async create(todo: any): Promise<RepositoryResult<any>> {
    return this.getNextResult()
  }

  async update(id: string, updates: any): Promise<RepositoryResult<any>> {
    return this.getNextResult()
  }

  async delete(id: string): Promise<RepositoryResult<void>> {
    return this.getNextResult()
  }

  async createViaRPC(todoData: any): Promise<RepositoryResult<any>> {
    return this.getNextResult()
  }

  async findComparisonsByUserId(userId: string): Promise<RepositoryListResult<any>> {
    return this.getNextResult()
  }

  async createComparison(comparison: any): Promise<RepositoryResult<any>> {
    return this.getNextResult()
  }

  async deleteComparisonsForTodo(todoId: string): Promise<RepositoryResult<void>> {
    return this.getNextResult()
  }

  async createCompletionLog(log: any): Promise<RepositoryResult<any>> {
    return this.getNextResult()
  }

  async deleteCompletionLogForTodo(todoId: string): Promise<RepositoryResult<void>> {
    return this.getNextResult()
  }

  async updateImportanceScores(updates: any[]): Promise<RepositoryResult<void>> {
    return this.getNextResult()
  }
}

// 結果ベースのモック作成ヘルパー
export const createMockRepositoryResult = <T>(data: T, error: any = null): RepositoryResult<T> => {
  if (error) {
    return RepositoryUtils.failure(error)
  }
  return RepositoryUtils.success(data)
}

export const createMockRepositoryListResult = <T>(data: T[], error: any = null): RepositoryListResult<T> => {
  if (error) {
    return RepositoryUtils.failureList(error)
  }
  return RepositoryUtils.successList(data)
}