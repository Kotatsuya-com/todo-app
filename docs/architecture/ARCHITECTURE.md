# アーキテクチャ概要

## 🏗️ Clean Architecture 採用

このプロジェクトは**Clean Architecture**パターンを採用し、ビジネスロジックとインフラストラクチャを分離することで、保守性・テスタビリティ・再利用性を向上させています。

**🎉 2025年8月: フロントエンド・バックエンド完全移行完了**

## 📐 アーキテクチャ構造

```
# バックエンドClean Architecture（完了）
app/api/               # Presentation Layer (HTTP handlers)
lib/services/          # Application Layer (use cases & business logic)
lib/repositories/      # Infrastructure Layer (data access)
lib/entities/          # Domain Layer (business objects & rules)

# フロントエンドClean Architecture（完了）
src/
├── domain/            # Domain Layer (entities, use cases, abstractions)
├── infrastructure/    # Infrastructure Layer (repositories, DI)
└── presentation/      # Presentation Layer (hooks, pages, providers)

# UIコンポーネント
components/            # UI Layer (view components)
```

### 🏛️ Domain Layer

#### バックエンド (`lib/entities/`)

**責務**: ビジネスルールとドメインロジック

- 外部依存を持たない純粋なビジネスオブジェクト
- エンティティのバリデーションと状態変更
- ビジネス不変条件の保証

**主要クラス**:
- `TodoEntity`: タスクのビジネスロジック（四象限判定、緊急度計算）
- `UserEntity`: ユーザーの状態管理とバリデーション
- `SlackConnectionEntity`: Slack接続の管理
- `SlackWebhookEntity`: Webhookの状態変更

#### フロントエンド (`src/domain/`)

**責務**: フロントエンドビジネスロジックとドメインルール

**構造**:
- `entities/`: ドメインエンティティ（Todo.ts, User.ts）
- `repositories/`: リポジトリ抽象インターフェース
- `use-cases/`: ビジネスユースケース（TodoUseCases.ts, AuthUseCases.ts）

**実装例**:
```typescript
// src/domain/entities/Todo.ts
export class TodoEntity {
  constructor(private todo: TodoData) {}
  
  getQuadrant(): TodoQuadrant {
    const urgent = this.isUrgent()
    const important = this.isImportant()
    
    if (urgent && important) return 'urgent_important'
    if (!urgent && important) return 'not_urgent_important'
    if (urgent && !important) return 'urgent_not_important'
    return 'not_urgent_not_important'
  }
}

// src/domain/use-cases/TodoUseCases.ts
export class TodoUseCases {
  constructor(private todoRepo: TodoRepositoryInterface) {}
  
  async createTodo(params: CreateTodoParams): Promise<UseCaseResult<TodoEntity>> {
    // ビジネスロジック実装
  }
}
```


### 📊 Infrastructure Layer

#### バックエンド (`lib/repositories/`)

**責務**: データアクセスの抽象化

- Supabaseクライアントのカプセル化
- 統一されたエラーハンドリング
- データベース操作の詳細を隠蔽

**主要クラス**:
- `BaseRepository`: 共通のリポジトリインターフェース
- `TodoRepository`: タスクデータアクセス
- `SlackRepository`: Slack関連データアクセス
- `EmojiSettingsRepository`: 絵文字設定データアクセス

#### フロントエンド (`src/infrastructure/`)

**責務**: データアクセス実装と依存性管理

**構造**:
- `repositories/`: Supabaseリポジトリ実装（SupabaseTodoRepository.ts等）
- `di/`: 依存性注入ファクトリー（ServiceFactory.ts）

**実装例**:
```typescript
// src/infrastructure/repositories/SupabaseTodoRepository.ts
export class SupabaseTodoRepository implements TodoRepositoryInterface {
  constructor(private supabase: SupabaseClient) {}
  
  async findById(id: string): Promise<RepositoryResult<TodoEntity>> {
    const { data, error } = await this.supabase
      .from('todos')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) return { success: false, error: error.message }
    return { success: true, data: new TodoEntity(data) }
  }
}

// src/infrastructure/di/ServiceFactory.ts
export const createTodoUseCases = (): TodoUseCases => {
  const supabase = createClient()
  const todoRepo = new SupabaseTodoRepository(supabase)
  return new TodoUseCases(todoRepo)
}
```


### ⚙️ Application Layer

#### バックエンド (`lib/services/`)

**責務**: ビジネスユースケースの実装

- 複数リポジトリを協調させたビジネスユースケース
- 外部API連携（Slack、OpenAI）
- トランザクション管理
- ビジネスロジックの調整

**主要クラス**:
- `SlackService`: Slack連携の全ビジネスロジック
- `EmojiSettingsService`: 絵文字設定管理
- `ServiceFactory`: 依存性注入とサービス生成

#### フロントエンド

**フロントエンドはApplication Layerを実装していません。**

フロントエンドのビジネスロジックは以下に分散されます：
- **Domain Layer**: Use Cases（TodoUseCases.ts、AuthUseCases.ts）
- **Presentation Layer**: カスタムフック（useAuth.ts、useTodoForm.ts等）

これにより、フロントエンドではシンプルで軽量なアーキテクチャを実現しています。


### 🌐 Presentation Layer

#### バックエンド (`app/api/`)

**責務**: HTTP固有の処理のみ

- リクエスト/レスポンスの変換
- サービス層への委譲
- HTTPステータスコードの管理
- 認証・認可チェック

#### フロントエンド (`src/presentation/`)

**責務**: UI論理とユーザーインタラクション

**構造**:
- `hooks/`: カスタムフック（UI論理の分離）
- `pages/`: ページコンポーネント（Clean Architecture準拠）
- `providers/`: データプロバイダー

**カスタムフック実装例**:
```typescript
// src/presentation/hooks/useAuth.ts
export const useAuth = (): UseAuthReturn => {
  const authUseCases = createAuthUseCases()
  const [user, setUser] = useState<UserEntity | null>(null)
  
  const login = useCallback(async (email: string, password: string) => {
    const result = await authUseCases.login({ email, password })
    if (result.success) {
      setUser(result.data)
    }
    return result
  }, [authUseCases])
  
  return { user, login, logout, loading, error }
}

// src/presentation/hooks/useTodoForm.ts
export const useTodoForm = (): UseTodoFormReturn => {
  const todoUseCases = createTodoUseCases()
  const { user } = useAuth()
  
  const submitForm = useCallback(async () => {
    const result = await todoUseCases.createTodo({
      userId: user.id,
      ...formData
    })
    return result.success
  }, [todoUseCases, user, formData])
  
  return { formData, updateField, submitForm, loading, error }
}
```


## 🔧 技術スタック

| レイヤー | 技術 | 詳細 |
|---------|------|------|
| フロントエンド | Next.js 14（App Router, TypeScript） | React Server Components |
| UI | Tailwind CSS + Radix UI | アクセシブルなデザインシステム |
| 状態管理 | Clean Architecture Hooks | Zustand→カスタムフック完全移行 |
| バックエンド | Supabase（PostgreSQL + Auth） | BaaS with RLS |
| 認証 | @supabase/ssr | SSR対応の認証 |
| ホスティング | Vercel | サーバーレス展開 |
| LLM連携 | OpenAI API | GPT-4o miniによるタイトル生成 |
| Slack連携 | Slack Web API | OAuth + Event API |

## 🎯 設計原則

### 依存性の方向

#### バックエンド
```
Domain ← Application ← Infrastructure
   ↑         ↑             ↑
   └─── Presentation ────────┘
```

#### フロントエンド
```
Domain ← Infrastructure
   ↑         ↑
   └─── Presentation ──┘
```

**依存関係ルール**:
- **Domain Layer**: 他の層に依存しない（バックエンド・フロントエンド共通）
- **Infrastructure Layer**: Domain Layerのみに依存（フロントエンドはApplication Layer不要）
- **Presentation Layer**: すべての層に依存可能

### 開発ルール

**🎉 2025年8月: Clean Architecture移行完了**

#### バックエンド実装ルール（完了）

1. ✅ **必ずClean Architecture構造で実装**
2. ✅ **ビジネスロジックはService層に集約**
3. ✅ **データアクセスはRepository層で抽象化**
4. ✅ **APIはHTTP処理のみに専念**

#### フロントエンド実装ルール（完了）

1. ✅ **ドメイン層**: エンティティとユースケースでビジネスロジック実装
2. ✅ **インフラ層**: Supabaseリポジトリ実装と依存性注入
3. ✅ **プレゼンテーション層**: カスタムフックでUI論理分離
4. ✅ **完全移行**: 全コンポーネントがClean Architecture準拠

### ファイル構成ルール

```
# Next.js App Router（ページとAPI）
app/                   
├── api/               # バックエンドAPI（Clean Architecture完了）
└── [pages]/           # ページルーティング

# バックエンドClean Architecture（完了）
lib/
├── entities/          # Domain Layer - ビジネスオブジェクト
├── repositories/      # Infrastructure Layer - データアクセス
├── services/          # Application Layer - ビジネスロジック
└── [utils]/           # ユーティリティと共通ロジック

# フロントエンドClean Architecture（完了）
src/
├── domain/            # ドメイン層
│   ├── entities/      # エンティティ（Todo.ts, User.ts）
│   ├── repositories/  # リポジトリ抽象（TodoRepositoryInterface.ts等）
│   └── use-cases/     # ユースケース（TodoUseCases.ts, AuthUseCases.ts）
├── infrastructure/    # インフラ層
│   ├── di/            # 依存性注入（ServiceFactory.ts）
│   └── repositories/  # リポジトリ実装（SupabaseTodoRepository.ts等）
└── presentation/      # プレゼンテーション層
    ├── hooks/         # カスタムフック（useAuth.ts, useTodoForm.ts等）
    ├── pages/         # ページコンポーネント
    └── providers/     # プロバイダー（AuthProvider.tsx）

# UIコンポーネント
components/            # 再利用可能UIコンポーネント
├── ui/               # 基本UIコンポーネント（Button, Modal等）
├── layout/           # レイアウト関連（Navigation, Menu等）  
└── [feature]/        # 機能別コンポーネント（todo, auth等）

# 型定義とユーティリティ
types/                # TypeScript型定義
```

## 🔄 データフロー

### 1. 認証フロー
```
Supabase Auth → AuthProvider → 各コンポーネント
```

### 2. TODO操作フロー
```
UI操作 → Zustand Store → Supabase DB → UI更新
```

### 3. LLM連携フロー
```
TODO本文 → API Route → OpenAI API → 見出し生成
```

### 4. Slack連携フロー
```
SlackURL → API Route → Slack Web API → メッセージ取得
Slackリアクション → Event API → 自動タスク作成 → リアルタイム通知
```

### 5. スマート通知フロー
```
タスク作成 → データベース挿入（created_via設定）
→ Supabaseリアルタイム検知 → created_via判定 → 条件付き通知表示
```

## 🧪 テスト戦略

### テスト対象の優先順位

1. **Service層**: ビジネスロジックの単体テスト（最重要）
2. **Repository層**: データアクセスロジックのテスト
3. **Entity層**: ドメインロジックとバリデーションのテスト
4. **API層**: 統合テスト（Service層モック使用）

### テストパターン

```typescript
// ✅ Service層テスト例
const mockSlackRepo = new MockSlackRepository([
  webhookNotFoundResponse(),
  eventQueuedResponse()
])
const slackService = new SlackService(mockSlackRepo, mockTodoRepo)
const result = await slackService.processWebhookEvent(webhookId, payload)
expect(result.success).toBe(true)

// ✅ Entity層テスト例  
const todo = new TodoEntity(mockTodoData)
expect(todo.isUrgent()).toBe(true)
expect(todo.getQuadrant()).toBe('urgent_important')
```

## 🔒 セキュリティ設計

### 認証・認可

- **認証必須**: API呼び出し時は認証状態を確認
- **ユーザー分離**: 他ユーザーのデータアクセス防止
- **セッション管理**: 適切なCookie設定とCSRF対策

### データ保護

- **Row Level Security (RLS)**: 全テーブルでユーザー分離
- **環境変数管理**: 機密情報の適切な管理
- **API保護**: 全エンドポイントで認証チェック

## 🚀 パフォーマンス考慮

### 効率的な処理

- **アダプティブ・トーナメント方式**: 比較回数を最大97%削減
- **リアルタイム更新**: Supabaseリアルタイム機能活用
- **キャッシュ戦略**: 適切な状態管理とメモ化

### スケーラビリティ

- **サーバーレス**: Vercelでの自動スケーリング
- **データベース最適化**: インデックスとクエリ最適化
- **外部API制限**: レート制限とエラーハンドリング

## 📚 関連ドキュメント

- [データベース設計](./DATABASE.md) - 詳細なデータベース設計
- [API仕様](./API.md) - 全APIエンドポイントの仕様
- [開発ガイド](../development/DEVELOPMENT.md) - 開発プロセスとルール
- [テストガイド](../development/TESTING.md) - テスト戦略と実装方法