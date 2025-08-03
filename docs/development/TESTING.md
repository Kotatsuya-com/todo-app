# テストガイド

## 🧪 テスト戦略

Clean Architectureパターンに基づいた効率的なテスト戦略を採用し、保守性とテスタビリティを重視したテスト実装を行います。

## 🎯 テスト対象の優先順位

### 1. Service層（最重要）
**ビジネスロジックの単体テスト**
- 複雑なビジネスルールの検証
- 外部API連携の動作確認
- エラーハンドリングの検証

### 2. Repository層
**データアクセスロジックのテスト**
- CRUD操作の動作確認
- エラーハンドリングの検証
- データ変換の正確性

### 3. Entity層
**ドメインロジックとバリデーションのテスト**
- ビジネスルールの検証
- 状態変更の正確性
- バリデーション機能

### 4. API層
**統合テスト（Service層モック使用）**
- HTTPリクエスト・レスポンスの検証
- 認証・認可の動作確認
- エラーレスポンスの検証

## 📝 テストパターン

### Service層テスト例

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

### Entity層テスト例

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

### API層テスト例

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

## 🔧 モックシステム

### Result-Based Mocking

従来の複雑なmockチェーンを簡潔な結果ベースのアプローチに置き換え：

```typescript
// ✅ Result-Based Approach
export class MockSlackService {
  private mockResults: any[] = []
  private callIndex = 0

  setMockResults(results: any[]) {
    this.mockResults = results
    this.callIndex = 0
  }

  async processWebhookEvent(webhookId: string, payload: any) {
    const result = this.getNextResult()
    return result
  }

  private getNextResult() {
    if (this.callIndex >= this.mockResults.length) {
      throw new Error('No more mock results available')
    }
    return this.mockResults[this.callIndex++]
  }
}

// ❌ 従来の複雑なmockチェーン
jest.fn()
  .mockResolvedValueOnce(mockResult1)
  .mockResolvedValueOnce(mockResult2)
  .mockResolvedValueOnce(mockResult3)
  // ... 30+ sequential mocks
```

### Service層モック

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

### Repository層モック

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

## 🧩 テストユーティリティ

### Fixture関数

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

### Service層
- **関数カバレッジ**: 90%以上
- **ブランチカバレッジ**: 85%以上
- **行カバレッジ**: 90%以上

### Repository層
- **関数カバレッジ**: 80%以上
- **ブランチカバレッジ**: 75%以上
- **行カバレッジ**: 80%以上

### Entity層
- **関数カバレッジ**: 95%以上
- **ブランチカバレッジ**: 90%以上
- **行カバレッジ**: 95%以上

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