# テストガイド

## 🧪 テスト戦略

Clean Architectureパターンに基づいた効率的なテスト戦略を採用し、保守性とテスタビリティを重視したテスト実装を行います。

**🎉 2025年8月: フロントエンド・バックエンド完全対応**

## 🎯 テスト対象の優先順位

### バックエンドテスト

#### 1. Service層（最重要）
**ビジネスロジックの単体テスト**
- 複雑なビジネスルールの検証
- 外部API連携の動作確認
- エラーハンドリングの検証

#### 2. Repository層
**データアクセスロジックのテスト**
- CRUD操作の動作確認
- エラーハンドリングの検証
- データ変換の正確性

#### 3. Entity層
**ドメインロジックとバリデーションのテスト**
- ビジネスルールの検証
- 状態変更の正確性
- バリデーション機能

#### 4. API層
**統合テスト（Service層モック使用）**
- HTTPリクエスト・レスポンスの検証
- 認証・認可の動作確認
- エラーレスポンスの検証

### フロントエンドテスト

#### 1. Use Cases層（最重要）
**ビジネスロジックの単体テスト**
- ドメインユースケースの動作確認
- Repository層との連携テスト
- エラーハンドリングの検証

#### 2. Repository層
**データアクセス実装のテスト**
- Supabaseクライアントとの連携
- データ変換の正確性
- エラーハンドリングの検証

#### 3. Entity層
**ドメインエンティティのテスト**
- ビジネスルールの検証
- データ変換の正確性
- バリデーション機能

#### 4. Presentation層（カスタムフック）
**UI論理の統合テスト**
- カスタムフックの動作確認
- Use Cases層との連携テスト
- 状態管理の検証

## 📝 テストパターン

### バックエンドテスト例

#### Service層テスト例

```typescript
// __tests__/lib/services/SlackService.test.ts
import { SlackService } from '@/lib/services/SlackService'
import { MockSlackRepository } from '@/__tests__/mocks/repositories'
import { MockTodoRepository } from '@/__tests__/mocks/repositories'

describe('SlackService', () => {
  let slackService: SlackService
  let mockSlackRepo: MockSlackRepository
  let mockTodoRepo: MockTodoRepository

  beforeEach(() => {
    mockSlackRepo = new MockSlackRepository()
    mockTodoRepo = new MockTodoRepository()
    slackService = new SlackService(mockSlackRepo, mockTodoRepo)
  })

  describe('processWebhookEvent', () => {
    test('should process valid webhook event successfully', async () => {
      // Arrange
      const webhookId = 'test-webhook-id'
      const payload = createMockSlackPayload()
      
      mockSlackRepo.setMockResults([
        { success: true, data: createMockWebhook() },
        { success: true, data: createMockConnection() }
      ])
      
      mockTodoRepo.setMockResults([
        { success: true, data: createMockTodo() }
      ])

      // Act
      const result = await slackService.processWebhookEvent(webhookId, payload)

      // Assert
      expect(result.success).toBe(true)
      expect(result.statusCode).toBe(200)
      expect(result.data).toBeDefined()
    })

    test('should return 404 when webhook not found', async () => {
      // Arrange
      const webhookId = 'non-existent-webhook'
      const payload = createMockSlackPayload()
      
      mockSlackRepo.setMockResults([
        { success: false, error: 'Webhook not found' }
      ])

      // Act
      const result = await slackService.processWebhookEvent(webhookId, payload)

      // Assert
      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(404)
      expect(result.error).toBe('Webhook not found')
    })
  })
})
```

#### Entity層テスト例

```typescript
// __tests__/lib/entities/Todo.test.ts
import { TodoEntity } from '@/lib/entities/Todo'
import { createMockTodo } from '@/__tests__/fixtures/entities'

describe('TodoEntity', () => {
  describe('getQuadrant', () => {
    test('should return urgent_important for urgent and important task', () => {
      // Arrange
      const todoData = createMockTodo({
        deadline: new Date().toISOString().split('T')[0], // Today
        importance_score: 0.8
      })
      const todo = new TodoEntity(todoData)

      // Act
      const quadrant = todo.getQuadrant()

      // Assert
      expect(quadrant).toBe('urgent_important')
    })

    test('should return not_urgent_important for future important task', () => {
      // Arrange
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      
      const todoData = createMockTodo({
        deadline: futureDate.toISOString().split('T')[0],
        importance_score: 0.8
      })
      const todo = new TodoEntity(todoData)

      // Act
      const quadrant = todo.getQuadrant()

      // Assert
      expect(quadrant).toBe('not_urgent_important')
    })
  })

  describe('isUrgent', () => {
    test('should return true for task with deadline today or past', () => {
      // Arrange
      const todoData = createMockTodo({
        deadline: new Date().toISOString().split('T')[0]
      })
      const todo = new TodoEntity(todoData)

      // Act
      const isUrgent = todo.isUrgent()

      // Assert
      expect(isUrgent).toBe(true)
    })

    test('should return false for task without deadline', () => {
      // Arrange
      const todoData = createMockTodo({ deadline: null })
      const todo = new TodoEntity(todoData)

      // Act
      const isUrgent = todo.isUrgent()

      // Assert
      expect(isUrgent).toBe(false)
    })
  })

  describe('isImportant', () => {
    test('should return true for high importance score', () => {
      // Arrange
      const todoData = createMockTodo({ importance_score: 0.8 })
      const todo = new TodoEntity(todoData)

      // Act
      const isImportant = todo.isImportant()

      // Assert
      expect(isImportant).toBe(true)
    })

    test('should return false for low importance score', () => {
      // Arrange
      const todoData = createMockTodo({ importance_score: 0.2 })
      const todo = new TodoEntity(todoData)

      // Act
      const isImportant = todo.isImportant()

      // Assert
      expect(isImportant).toBe(false)
    })
  })
})
```

#### API層テスト例

```typescript
// __tests__/api/slack/events/user/[webhook_id]/route.test.ts
import { POST } from '@/app/api/slack/events/user/[webhook_id]/route'
import { NextRequest } from 'next/server'
import { MockSlackService } from '@/__tests__/mocks/services'

// Service層のモック
jest.mock('@/lib/services/ServiceFactory', () => ({
  createServices: () => ({
    slackService: new MockSlackService()
  })
}))

describe('/api/slack/events/user/[webhook_id]', () => {
  let mockSlackService: MockSlackService

  beforeEach(() => {
    const { slackService } = require('@/lib/services/ServiceFactory').createServices()
    mockSlackService = slackService
  })

  test('should process valid webhook event', async () => {
    // Arrange
    const webhookId = 'test-webhook-id'
    const payload = createMockSlackPayload()
    
    mockSlackService.setMockResults([
      { success: true, data: { message: 'Event processed' }, statusCode: 200 }
    ])

    const request = new NextRequest('http://localhost:3000/api/slack/events/user/' + webhookId, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' }
    })

    // Act
    const response = await POST(request, { params: { webhook_id: webhookId } })
    const responseBody = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(responseBody.message).toBe('Event processed')
  })

  test('should return 404 for non-existent webhook', async () => {
    // Arrange
    const webhookId = 'non-existent-webhook'
    const payload = createMockSlackPayload()
    
    mockSlackService.setMockResults([
      { success: false, error: 'Webhook not found', statusCode: 404 }
    ])

    const request = new NextRequest('http://localhost:3000/api/slack/events/user/' + webhookId, {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    // Act
    const response = await POST(request, { params: { webhook_id: webhookId } })
    const responseBody = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(responseBody.error).toBe('Webhook not found')
  })
})
```

### フロントエンドテスト例

#### Use Cases層テスト例

```typescript
// __tests__/src/domain/use-cases/TodoUseCases.test.ts
import { TodoUseCases } from '@/src/domain/use-cases/TodoUseCases'
import { MockTodoRepository } from '@/__tests__/mocks/repositories'

describe('TodoUseCases', () => {
  let todoUseCases: TodoUseCases
  let mockTodoRepo: MockTodoRepository

  beforeEach(() => {
    mockTodoRepo = new MockTodoRepository()
    todoUseCases = new TodoUseCases(mockTodoRepo)
  })

  describe('createTodo', () => {
    test('should create todo successfully', async () => {
      // Arrange
      const params = {
        userId: 'user-123',
        title: 'Test Todo',
        body: 'Test description',
        deadline: '2025-12-31'
      }
      
      mockTodoRepo.setMockResults([
        { success: true, data: createMockTodoEntity() }
      ])

      // Act
      const result = await todoUseCases.createTodo(params)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })
  })
})
```

#### Repository層テスト例

```typescript
// __tests__/src/infrastructure/repositories/SupabaseTodoRepository.test.ts
import { SupabaseTodoRepository } from '@/src/infrastructure/repositories/SupabaseTodoRepository'
import { createMockSupabaseClient } from '@/__tests__/mocks/supabase'

describe('SupabaseTodoRepository', () => {
  let repository: SupabaseTodoRepository
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    repository = new SupabaseTodoRepository(mockSupabase)
  })

  describe('findById', () => {
    test('should return todo when found', async () => {
      // Arrange
      const todoId = 'todo-123'
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: createMockTodoData(),
              error: null
            })
          })
        })
      })

      // Act
      const result = await repository.findById(todoId)

      // Assert
      expect(result.success).toBe(true)
      expect(result.data).toBeInstanceOf(TodoEntity)
    })
  })
})
```

#### カスタムフックテスト例

```typescript
// __tests__/src/presentation/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/src/presentation/hooks/useAuth'
import { MockAuthUseCases } from '@/__tests__/mocks/use-cases'

// Use Cases層のモック
jest.mock('@/src/infrastructure/di/ServiceFactory', () => ({
  createAuthUseCases: () => new MockAuthUseCases()
}))

describe('useAuth', () => {
  let mockAuthUseCases: MockAuthUseCases

  beforeEach(() => {
    const { createAuthUseCases } = require('@/src/infrastructure/di/ServiceFactory')
    mockAuthUseCases = createAuthUseCases()
  })

  test('should handle user login successfully', async () => {
    // Arrange
    mockAuthUseCases.setMockResults([
      { success: true, data: createMockUserEntity() }
    ])

    const { result } = renderHook(() => useAuth())

    // Act
    await act(async () => {
      const loginResult = await result.current.login('test@example.com', 'password')
      expect(loginResult.success).toBe(true)
    })

    // Assert
    expect(result.current.user).toBeDefined()
    expect(result.current.loading).toBe(false)
  })
})
```

## 🔧 Jest設定の分離

### 環境別Jest設定（2025年8月実装）

プロジェクトでは2つのJest設定ファイルを使用して、テストを適切な環境で実行しています：

#### jest.config.js - Browser環境
- **対象**: `api/`, `src/`以下のテスト
- **環境**: `jest-environment-jsdom`
- **用途**: React/Next.js統合テスト、APIルートテスト
- **テスト数**: 約280テスト

#### jest.node.config.js - Node.js環境  
- **対象**: `lib/`以下のテスト
- **環境**: `node`
- **用途**: ビジネスロジック、サービス層、エンティティテスト
- **テスト数**: 約872テスト

#### なぜ分離するか？
1. **パフォーマンス**: lib/以下はNext.js非依存のため、軽量なNode環境で高速実行
2. **適切な環境**: UIテストはDOM環境、ビジネスロジックは純粋なNode環境
3. **依存関係の明確化**: 各層が必要とする環境を明示的に分離

#### 実行コマンド
```bash
npm run test           # 両環境で全テスト実行
npm run test:node      # Node環境のみ（lib/）
npm run test:browser   # Browser環境のみ（api/, src/）
```

## 🔧 モックシステム

### ts-auto-mock と Proxy-Based autoMock の併用

プロジェクトでは2つのモックシステムを使用しています：

#### 1. ts-auto-mock (TypeScript Transformer)
- **用途**: TypeScript型情報からの自動モック生成
- **設定**: jest.config.jsのtransformerとして設定
- **利点**: 型安全性、コンパイル時のモック生成
- **制限**: Node.js環境では互換性の問題により未使用

```typescript
// __tests__/fixtures/repositories.fixture.ts
import { createMock } from 'ts-auto-mock'

export const createMockSlackRepository = (): jest.Mocked<SlackRepositoryInterface> =>
  createMock<SlackRepositoryInterface>()
```

#### 2. Proxy-Based autoMock System (カスタム実装)

**2025年8月: JavaScript Proxy技術を活用した革新的な自動モックシステムを導入**

#### autoMock実装の利点
- **コード削減**: 従来の手動モック実装から20-30%のコード削減
- **保守性向上**: インターフェース変更時の自動追従
- **一貫性**: 全レイヤーで統一されたモックパターン
- **開発効率**: 単一行でのモック作成が可能

#### Proxy-Based autoMock Pattern

```typescript
// __tests__/utils/mockBuilder.ts
export function createAutoMock<T>(): T & MockControlInterface {
  const mockResults: any[] = []
  let callIndex = 0

  const proxy = new Proxy({} as T & MockControlInterface, {
    get(target, prop) {
      if (prop === 'setMockResults') {
        return (results: any[]) => {
          mockResults.length = 0
          mockResults.push(...results)
          callIndex = 0
        }
      }
      
      if (prop === 'getNextResult') {
        return () => {
          if (callIndex >= mockResults.length) {
            throw new Error('No more mock results available')
          }
          return mockResults[callIndex++]
        }
      }
      
      // すべてのメソッドを自動的にモック化
      return jest.fn().mockImplementation(() => {
        return proxy.getNextResult()
      })
    }
  })

  return proxy
}
```

#### Migration Success Examples

**Before: Manual Mock Implementation (606 lines)**
```typescript
class MockNotificationSettingsRepository implements NotificationSettingsRepositoryInterface {
  private results: RepositoryResult<any>[] = []
  private currentIndex = 0

  setResults(results: RepositoryResult<any>[]) {
    this.results = results
    this.currentIndex = 0
  }

  async findByUserId(userId: string): Promise<RepositoryResult<NotificationSettingsEntity | null>> {
    return this.getNextResult()
  }

  async create(settings: NotificationSettingsData): Promise<RepositoryResult<NotificationSettingsEntity>> {
    return this.getNextResult()
  }
  
  // ... 15+ methods with identical implementation
  
  private getNextResult(): RepositoryResult<any> {
    if (this.currentIndex >= this.results.length) {
      throw new Error('No more mock results available')
    }
    return this.results[this.currentIndex++]
  }
}
```

**After: autoMock Implementation (514 lines - 15% reduction)**
```typescript
// Simple one-line mock creation
let mockRepository: NotificationSettingsRepositoryInterface & MockControlInterface

beforeEach(() => {
  mockRepository = createAutoMock<NotificationSettingsRepositoryInterface>()
  service = new NotificationSettingsService(mockRepository)
})

test('should find notification settings by user ID', async () => {
  // Set mock results - all methods automatically available
  mockRepository.setMockResults([
    { success: true, data: createMockNotificationSettingsEntity() }
  ])

  const result = await service.findByUserId('user-123')
  expect(result.success).toBe(true)
})
```

### Result-Based Mocking

従来の複雑なmockチェーンを簡潔な結果ベースのアプローチに置き換え：

```typescript
// ✅ Result-Based Approach with autoMock
const mockService = createAutoMock<SlackServiceInterface>()
mockService.setMockResults([
  { success: true, data: result1, statusCode: 200 },
  { success: false, error: 'Not found', statusCode: 404 }
])

// ❌ 従来の複雑なmockチェーン
jest.fn()
  .mockResolvedValueOnce(mockResult1)
  .mockResolvedValueOnce(mockResult2)
  .mockResolvedValueOnce(mockResult3)
  // ... 30+ sequential mocks
```

### バックエンドモック

#### Service層モック

```typescript
// __tests__/mocks/services.ts
export class MockSlackService {
  private mockResults: SlackServiceResult<any>[] = []
  private callIndex = 0

  setMockResults(results: SlackServiceResult<any>[]) {
    this.mockResults = results
    this.callIndex = 0
  }

  async processWebhookEvent(
    webhookId: string,
    payload: SlackEventPayload
  ): Promise<SlackServiceResult<WebhookProcessingResult>> {
    return this.getNextResult()
  }

  private getNextResult(): SlackServiceResult<any> {
    if (this.callIndex >= this.mockResults.length) {
      throw new Error(`MockSlackService: No more mock results available (called ${this.callIndex} times)`)
    }
    return this.mockResults[this.callIndex++]
  }
}
```

#### Repository層モック

```typescript
// __tests__/mocks/repositories.ts
export class MockSlackRepository implements SlackRepositoryInterface {
  private mockResults: RepositoryResult<any>[] = []
  private callIndex = 0

  setMockResults(results: RepositoryResult<any>[]) {
    this.mockResults = results
    this.callIndex = 0
  }

  async findWebhookById(webhookId: string): Promise<RepositoryResult<SlackWebhook>> {
    return this.getNextResult()
  }

  async createTodoFromSlackMessage(
    userId: string,
    todoData: Partial<Todo>
  ): Promise<RepositoryResult<Todo>> {
    return this.getNextResult()
  }

  private getNextResult(): RepositoryResult<any> {
    if (this.callIndex >= this.mockResults.length) {
      throw new Error('MockSlackRepository: No more mock results available')
    }
    return this.mockResults[this.callIndex++]
  }
}
```

### フロントエンドモック

#### Use Cases層モック

```typescript
// __tests__/mocks/use-cases.ts
export class MockTodoUseCases {
  private mockResults: UseCaseResult<any>[] = []
  private callIndex = 0

  setMockResults(results: UseCaseResult<any>[]) {
    this.mockResults = results
    this.callIndex = 0
  }

  async createTodo(params: CreateTodoParams): Promise<UseCaseResult<TodoEntity>> {
    return this.getNextResult()
  }

  async updateTodo(params: UpdateTodoParams): Promise<UseCaseResult<TodoEntity>> {
    return this.getNextResult()
  }

  private getNextResult(): UseCaseResult<any> {
    if (this.callIndex >= this.mockResults.length) {
      throw new Error('MockTodoUseCases: No more mock results available')
    }
    return this.mockResults[this.callIndex++]
  }
}
```

#### Frontend Repository層モック

```typescript
// __tests__/mocks/frontend-repositories.ts
export class MockTodoRepository implements TodoRepositoryInterface {
  private mockResults: RepositoryResult<any>[] = []
  private callIndex = 0

  setMockResults(results: RepositoryResult<any>[]) {
    this.mockResults = results
    this.callIndex = 0
  }

  async findById(id: string): Promise<RepositoryResult<TodoEntity>> {
    return this.getNextResult()
  }

  async create(params: CreateTodoParams): Promise<RepositoryResult<TodoEntity>> {
    return this.getNextResult()
  }

  private getNextResult(): RepositoryResult<any> {
    if (this.callIndex >= this.mockResults.length) {
      throw new Error('MockTodoRepository: No more mock results available')
    }
    return this.mockResults[this.callIndex++]
  }
}
```

## 🧩 テストユーティリティ

### Fixture関数

#### バックエンドFixture

```typescript
// __tests__/fixtures/entities.ts
export const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 'mock-todo-id',
  user_id: 'mock-user-id',
  title: 'Mock Todo',
  description: 'Mock description',
  deadline: null,
  importance_score: 0.5,
  status: 'open',
  slack_url: null,
  created_via: 'manual',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

export const createMockSlackPayload = (overrides: Partial<SlackEventPayload> = {}): SlackEventPayload => ({
  type: 'event_callback',
  event: {
    type: 'reaction_added',
    user: 'U1234567890',
    reaction: 'memo',
    item: {
      channel: 'C1234567890',
      ts: '1234567890.123456'
    }
  },
  ...overrides
})
```

#### フロントエンドFixture

```typescript
// __tests__/fixtures/frontend-entities.ts
export const createMockTodoEntity = (overrides: Partial<TodoData> = {}): TodoEntity => {
  const todoData = {
    id: 'mock-todo-id',
    userId: 'mock-user-id',
    title: 'Mock Todo',
    body: 'Mock description',
    deadline: null,
    importanceScore: 0.5,
    status: 'open' as TodoStatus,
    createdVia: 'manual' as TodoCreatedVia,
    createdAt: new Date().toISOString(),
    ...overrides
  }
  return new TodoEntity(todoData)
}

export const createMockUserEntity = (overrides: Partial<UserData> = {}): UserEntity => {
  const userData = {
    id: 'mock-user-id',
    email: 'test@example.com',
    profile: {
      displayName: 'Test User',
      avatarUrl: null
    },
    ...overrides
  }
  return new UserEntity(userData)
}
```

### Helper関数

```typescript
// __tests__/helpers/date-helpers.ts
export const getDateString = (daysFromToday: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)
  return date.toISOString().split('T')[0]
}

export const getTodayString = (): string => getDateString(0)
export const getTomorrowString = (): string => getDateString(1)
export const getYesterdayString = (): string => getDateString(-1)
```

## 🚀 テスト実行

### 基本コマンド

```bash
# 全テスト実行
npm run test

# 監視モードでテスト実行
npm run test:watch

# カバレッジ付きテスト実行
npm run test:coverage

# 特定のテストファイルのみ実行
npm test SlackService.test.ts

# 特定のテストケースのみ実行
npm test -- --testNamePattern="should process valid webhook event"
```

### テスト設定

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/api/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
}
```

## 📊 カバレッジ目標

### バックエンド

#### Service層
- **関数カバレッジ**: 90%以上
- **ブランチカバレッジ**: 85%以上
- **行カバレッジ**: 90%以上

#### Repository層
- **関数カバレッジ**: 80%以上
- **ブランチカバレッジ**: 75%以上
- **行カバレッジ**: 80%以上

#### Entity層
- **関数カバレッジ**: 95%以上
- **ブランチカバレッジ**: 90%以上
- **行カバレッジ**: 95%以上

### フロントエンド

#### Use Cases層
- **関数カバレッジ**: 90%以上
- **ブランチカバレッジ**: 85%以上
- **行カバレッジ**: 90%以上

#### Repository層
- **関数カバレッジ**: 85%以上
- **ブランチカバレッジ**: 80%以上
- **行カバレッジ**: 85%以上

#### Entity層
- **関数カバレッジ**: 95%以上
- **ブランチカバレッジ**: 90%以上
- **行カバレッジ**: 95%以上

#### Presentation層（カスタムフック）
- **関数カバレッジ**: 80%以上
- **ブランチカバレッジ**: 75%以上
- **行カバレッジ**: 80%以上

## 🐛 テストデバッグ

### 一般的なテスト失敗の原因

1. **Date・Time関連**
   ```typescript
   // ❌ タイムゾーンの問題
   expect(todo.isUrgent()).toBe(true)  // 現地時間依存
   
   // ✅ 固定の日付を使用
   const mockDate = '2025-01-01'
   const todo = createMockTodo({ deadline: mockDate })
   ```

2. **非同期処理**
   ```typescript
   // ❌ awaitを忘れる
   const result = slackService.processWebhookEvent(webhookId, payload)
   
   // ✅ 適切な非同期処理
   const result = await slackService.processWebhookEvent(webhookId, payload)
   ```

3. **Mock設定の不備**
   ```typescript
   // ❌ Mock結果が不足
   mockService.setMockResults([result1])
   await service.methodThatCallsTwice()  // エラー
   
   // ✅ 十分なMock結果を用意
   mockService.setMockResults([result1, result2])
   ```

### デバッグ方法

```typescript
// テスト中のデバッグ出力
describe('SlackService', () => {
  test('debug test', async () => {
    console.log('Test input:', { webhookId, payload })
    
    const result = await slackService.processWebhookEvent(webhookId, payload)
    
    console.log('Test result:', result)
    expect(result.success).toBe(true)
  })
})
```

## 🔍 テストベストプラクティス

### Arrange-Act-Assert パターン

```typescript
test('should create todo from slack message', async () => {
  // Arrange - テストの準備
  const webhookId = 'test-webhook-id'
  const payload = createMockSlackPayload()
  mockSlackRepo.setMockResults([validWebhookResult])
  
  // Act - テスト対象の実行
  const result = await slackService.processWebhookEvent(webhookId, payload)
  
  // Assert - 結果の検証
  expect(result.success).toBe(true)
  expect(result.data.todo).toBeDefined()
})
```

### 適切なテスト名

```typescript
// ✅ 良いテスト名
test('should return 404 when webhook not found')
test('should create todo with correct urgency for memo emoji')
test('should reject event from non-connected user')

// ❌ 悪いテスト名
test('webhook test')
test('it works')
test('test1')
```

### テストの独立性

```typescript
// ✅ 各テストで新しいモックを作成
beforeEach(() => {
  mockSlackRepo = new MockSlackRepository()
  mockTodoRepo = new MockTodoRepository()
  slackService = new SlackService(mockSlackRepo, mockTodoRepo)
})

// ❌ グローバルなモックの再利用
let globalMockService = new MockSlackService()  // 危険
```

## 📋 継続的インテグレーション

### CI/CDでのテスト実行

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
      - run: npm run build
```

### テスト報告

```bash
# カバレッジレポートの生成
npm run test:coverage

# CI環境でのテスト結果出力
npm run test -- --ci --coverage --watchAll=false
```

## 📚 関連ドキュメント

- [開発ガイド](./DEVELOPMENT.md) - 開発プロセスとルール
- [セキュリティガイド](./SECURITY.md) - セキュリティテスト
- [アーキテクチャ概要](../architecture/ARCHITECTURE.md) - テスト可能な設計
- [API仕様](../architecture/API.md) - APIテストの詳細