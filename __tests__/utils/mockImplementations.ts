/**
 * Mock Implementations
 * モック実装集 - 各種サービスとリポジトリのモック実装
 *
 * @fileoverview This file contains mock implementations and should not run as a test suite
 */

// Prevent Jest from treating this as a test file
if (typeof describe === 'undefined') {
  // This is a utility file, not a test file
}

import { TodoEntity } from '../../src/domain/entities/Todo'
import { UserEntity } from '../../src/domain/entities/User'
import { createTestTodoEntity, createTestUserEntity, createSuccessResult, createErrorResult } from './testUtilities'

/**
 * Mock TodoUseCases implementation
 * TodoUseCases のモック実装
 */
export class MockTodoUseCases {
  private mockResults: any[] = []
  private currentIndex = 0

  getTodoDashboard = jest.fn()
  createTodo = jest.fn()
  updateTodo = jest.fn()
  completeTodo = jest.fn()
  reopenTodo = jest.fn()
  deleteTodo = jest.fn()

  constructor(initialResults: any[] = []) {
    this.setMockResults(initialResults)
  }

  setMockResults(results: any[]): void {
    this.mockResults = results
    this.currentIndex = 0
    this.setupMocks()
  }

  private setupMocks(): void {
    const methods = [
      this.getTodoDashboard,
      this.createTodo,
      this.updateTodo,
      this.completeTodo,
      this.reopenTodo,
      this.deleteTodo
    ]

    methods.forEach(method => {
      method.mockImplementation(() => {
        if (this.currentIndex < this.mockResults.length) {
          return Promise.resolve(this.mockResults[this.currentIndex++])
        }
        return Promise.resolve(createSuccessResult({}))
      })
    })
  }

  reset(): void {
    this.currentIndex = 0
    jest.clearAllMocks()
  }
}

/**
 * Mock AuthUseCases implementation
 * AuthUseCases のモック実装
 */
export class MockAuthUseCases {
  private mockResults: any[] = []
  private currentIndex = 0

  signInWithEmail = jest.fn()
  signUpWithEmail = jest.fn()
  signOut = jest.fn()
  getCurrentUser = jest.fn()
  sendPasswordReset = jest.fn()
  refreshSession = jest.fn()
  subscribeToAuthChanges = jest.fn()

  constructor(initialResults: any[] = []) {
    this.setMockResults(initialResults)
  }

  setMockResults(results: any[]): void {
    this.mockResults = results
    this.currentIndex = 0
    this.setupMocks()
  }

  private setupMocks(): void {
    const methods = [
      this.signInWithEmail,
      this.signUpWithEmail,
      this.signOut,
      this.getCurrentUser,
      this.sendPasswordReset,
      this.refreshSession
    ]

    methods.forEach(method => {
      method.mockImplementation(() => {
        if (this.currentIndex < this.mockResults.length) {
          return Promise.resolve(this.mockResults[this.currentIndex++])
        }
        return Promise.resolve(createSuccessResult({}))
      })
    })

    // Special handling for subscribeToAuthChanges
    this.subscribeToAuthChanges.mockImplementation((callback: Function) => {
      return jest.fn() // Mock unsubscribe function
    })
  }

  reset(): void {
    this.currentIndex = 0
    jest.clearAllMocks()
  }
}

/**
 * Mock SlackService implementation
 * SlackService のモック実装
 */
export class MockSlackService {
  private mockResults: any[] = []
  private currentIndex = 0

  processWebhookEvent = jest.fn()
  createConnection = jest.fn()
  deleteConnection = jest.fn()
  getConnections = jest.fn()

  constructor(initialResults: any[] = []) {
    this.setMockResults(initialResults)
  }

  setMockResults(results: any[]): void {
    this.mockResults = results
    this.currentIndex = 0
    this.setupMocks()
  }

  private setupMocks(): void {
    const methods = [
      this.processWebhookEvent,
      this.createConnection,
      this.deleteConnection,
      this.getConnections
    ]

    methods.forEach(method => {
      method.mockImplementation(() => {
        if (this.currentIndex < this.mockResults.length) {
          return Promise.resolve(this.mockResults[this.currentIndex++])
        }
        return Promise.resolve(createSuccessResult({}))
      })
    })
  }

  reset(): void {
    this.currentIndex = 0
    jest.clearAllMocks()
  }
}

/**
 * Mock Repository implementations
 * リポジトリのモック実装
 */
export class MockTodoRepository {
  private mockResults: any[] = []
  private currentIndex = 0

  findById = jest.fn()
  findByUserId = jest.fn()
  create = jest.fn()
  update = jest.fn()
  delete = jest.fn()
  findDashboardData = jest.fn()

  constructor(initialResults: any[] = []) {
    this.setMockResults(initialResults)
  }

  setMockResults(results: any[]): void {
    this.mockResults = results
    this.currentIndex = 0
    this.setupMocks()
  }

  private setupMocks(): void {
    const methods = [
      this.findById,
      this.findByUserId,
      this.create,
      this.update,
      this.delete,
      this.findDashboardData
    ]

    methods.forEach(method => {
      method.mockImplementation(() => {
        if (this.currentIndex < this.mockResults.length) {
          return Promise.resolve(this.mockResults[this.currentIndex++])
        }
        return Promise.resolve(createSuccessResult({}))
      })
    })
  }

  reset(): void {
    this.currentIndex = 0
    jest.clearAllMocks()
  }
}

/**
 * Common test data factories
 * 共通テストデータファクトリ
 */
export const TestDataFactories = {
  /**
   * Create mock current user data
   */
  createMockCurrentUserData: () => ({
    userEntity: createTestUserEntity(),
    authUser: {
      id: 'test-user-id',
      email: 'test@example.com'
    }
  }),

  /**
   * Create mock dashboard data
   */
  createMockDashboardData: () => {
    const todos = [
      createTestTodoEntity({ id: 'todo-1', status: 'open' }),
      createTestTodoEntity({ id: 'todo-2', status: 'open' })
    ]
    return {
      todos,
      quadrants: TodoEntity.groupByQuadrant(todos),
      stats: {
        total: 3,
        active: 2,
        completed: 1,
        overdue: 0
      }
    }
  },

  /**
   * Create webhook event data
   */
  createWebhookEventData: () => ({
    type: 'reaction_added',
    event: {
      user: 'U1234567890',
      reaction: 'fire',
      item: {
        type: 'message',
        channel: 'C1234567890',
        ts: '1234567890.123456'
      }
    }
  }),

  /**
   * Create Slack connection data
   */
  createSlackConnectionData: () => ({
    id: 'slack-conn-id',
    user_id: 'test-user-id',
    workspace_id: 'T1234567890',
    workspace_name: 'Test Workspace',
    team_name: 'Test Team',
    access_token: 'xoxb-test-token',
    scope: 'channels:read,chat:write',
    created_at: '2025-08-01T10:00:00Z'
  })
}

/**
 * Pre-configured mock scenarios
 * 事前設定されたモックシナリオ
 */
export const MockScenarios = {
  /**
   * Successful operations scenario
   */
  success: {
    todoUseCases: () => new MockTodoUseCases([
      createSuccessResult(TestDataFactories.createMockDashboardData())
    ]),
    authUseCases: () => new MockAuthUseCases([
      createSuccessResult(TestDataFactories.createMockCurrentUserData())
    ]),
    slackService: () => new MockSlackService([
      createSuccessResult({ processed: true })
    ])
  },

  /**
   * Error operations scenario
   */
  error: {
    todoUseCases: () => new MockTodoUseCases([
      createErrorResult('Failed to fetch todos')
    ]),
    authUseCases: () => new MockAuthUseCases([
      createErrorResult('Authentication failed')
    ]),
    slackService: () => new MockSlackService([
      createErrorResult('Webhook processing failed')
    ])
  },

  /**
   * Mixed operations scenario
   */
  mixed: {
    todoUseCases: () => new MockTodoUseCases([
      createSuccessResult(TestDataFactories.createMockDashboardData()),
      createErrorResult('Update failed'),
      createSuccessResult({})
    ])
  }
}
