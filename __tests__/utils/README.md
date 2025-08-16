# Test Utilities

このディレクトリには、プロジェクト全体で再利用可能なテストユーティリティとモック実装が含まれています。

## ファイル構成

- `testUtilities.ts` - 汎用テストヘルパー関数とファクトリ
- `mockImplementations.ts` - サービス・リポジトリ層のモック実装
- `README.md` - このファイル（使用ガイド）

## 主要機能

### 1. テスト環境のセットアップ

```typescript
import { setupTestEnvironment, setupFakeTimers, cleanupFakeTimers } from '../utils/testUtilities'

describe('MyComponent', () => {
  setupTestEnvironment() // crypto mock と console.error suppression を自動設定
  
  beforeEach(() => {
    setupFakeTimers('2025-08-06T00:00:00Z')
  })
  
  afterEach(() => {
    cleanupFakeTimers()
  })
})
```

### 2. テストデータの作成

```typescript
import { createTestTodoEntity, createTestUserEntity, createTestTodoSet } from '../utils/testUtilities'

// 基本的なエンティティ作成
const todo = createTestTodoEntity({
  title: 'Custom title',
  importance_score: 1500
})

const user = createTestUserEntity({
  display_name: 'Custom User'
})

// 象限テスト用のTodoセット
const todoSet = createTestTodoSet()
// todoSet.urgentImportant, todoSet.notUrgentImportant, etc.
```

### 3. モック実装の使用

```typescript
import { MockTodoUseCases, MockAuthUseCases, TestDataFactories } from '../utils/mockImplementations'

describe('useTodoDashboard', () => {
  let mockTodoUseCases: MockTodoUseCases
  
  beforeEach(() => {
    mockTodoUseCases = new MockTodoUseCases([
      createSuccessResult(TestDataFactories.createMockDashboardData())
    ])
    
    // モックをDIコンテナに注入
    mockCreateTodoUseCases.mockReturnValue(mockTodoUseCases)
  })
})
```

### 4. 事前設定されたシナリオ

```typescript
import { MockScenarios } from '../utils/mockImplementations'

// 成功シナリオ
const successMocks = MockScenarios.success.todoUseCases()

// エラーシナリオ
const errorMocks = MockScenarios.error.authUseCases()

// 混合シナリオ（複数の結果パターン）
const mixedMocks = MockScenarios.mixed.todoUseCases()
```

## ベストプラクティス

### 1. プロパティ命名規則

**❌ 避けるべき：** camelCase（JavaScript慣例）
```typescript
// これは失敗する
new TodoEntity({
  userId: 'test-user',     // ❌ user_id を使用
  importanceScore: 1000,   // ❌ importance_score を使用
  createdAt: '2025-08-01'  // ❌ created_at を使用
})
```

**✅ 推奨：** snake_case（データベーススキーマに準拠）
```typescript
// これは成功する
createTestTodoEntity({
  user_id: 'test-user',
  importance_score: 1000,
  created_at: '2025-08-01T10:00:00Z'
})
```

### 2. 時間依存テストの処理

```typescript
import { setupFakeTimers, cleanupFakeTimers } from '../utils/testUtilities'

describe('Time-dependent tests', () => {
  beforeEach(() => {
    setupFakeTimers('2025-08-06T00:00:00Z') // 固定日時
  })
  
  afterEach(() => {
    cleanupFakeTimers()
  })
  
  it('should detect urgent todos', () => {
    // 現在時刻が固定されているので、一貫したテスト結果が得られる
    const urgentTodo = createTestTodoEntity({
      deadline: '2025-08-06T23:59:59Z' // 今日（緊急）
    })
    expect(urgentTodo.isUrgent()).toBe(true)
  })
})
```

### 3. 非同期テストのハンドリング

```typescript
import { waitForLoadingToComplete, actAsync } from '../utils/testUtilities'

it('should handle async operations', async () => {
  const { result } = renderHook(() => useMyHook())
  
  // ローディング完了を待つ
  await waitForLoadingToComplete(result)
  
  // 非同期アクションを実行
  await actAsync(async () => {
    await result.current.performAsyncAction()
  })
  
  expect(result.current.data).toBeDefined()
})
```

### 4. Jest Mock のホイスティング対応

```typescript
// Factory Pattern を使用
jest.mock('../../path/to/service', () => ({
  ServiceClass: jest.fn()
}))

import { ServiceClass } from '../../path/to/service'
import { MockServiceClass } from '../utils/mockImplementations'

let mockService: MockServiceClass

beforeEach(() => {
  mockService = new MockServiceClass()
  ;(ServiceClass as jest.MockedClass<typeof ServiceClass>)
    .mockImplementation(() => mockService as any)
})
```

## 共通エラーパターンと解決法

### 1. crypto.randomUUID エラー
```
ReferenceError: crypto is not defined
```
**解決法：** `setupTestEnvironment()` を使用

### 2. プロパティ命名エラー
```
Expected length: 2, Received length: 0
```
**解決法：** snake_case プロパティを使用（user_id, importance_score, etc.）

### 3. 時間依存テストの不安定性
```
Test results vary based on execution time
```
**解決法：** `setupFakeTimers()` で固定日時を設定

### 4. React act() 警告
```
Warning: An update to TestComponent inside a test was not wrapped in act(...)
```
**解決法：** `setupTestEnvironment()` で警告を抑制、または `actAsync()` を使用

## マイグレーション例

### Before（修正前）
```typescript
describe('TodoEntity', () => {
  it('should create todo', () => {
    const todo = new TodoEntity({
      id: 'test-id',
      userId: 'user-id',           // ❌ camelCase
      importanceScore: 1000,       // ❌ camelCase
      status: 'active'             // ❌ 'open' を使用すべき
    })
    expect(todo.isImportant()).toBe(false)
  })
})
```

### After（修正後）
```typescript
import { createTestTodoEntity, setupTestEnvironment } from '../utils/testUtilities'

describe('TodoEntity', () => {
  setupTestEnvironment()
  
  it('should create todo', () => {
    const todo = createTestTodoEntity({
      user_id: 'user-id',          // ✅ snake_case
      importance_score: 1000,      // ✅ snake_case
      status: 'open'               // ✅ 正しいステータス
    })
    expect(todo.isImportant()).toBe(false)
  })
})
```

## まとめ

これらのユーティリティを使用することで：

1. **一貫性** - 全テストで統一されたデータ構造とモック実装
2. **保守性** - 共通ロジックの中央管理により変更時の影響範囲を限定
3. **可読性** - テストコードがビジネスロジックに集中できる
4. **安定性** - 時間依存やモック関連の問題を回避

新しいテストを作成する際は、まずこれらのユーティリティで要件を満たせるか確認してください。