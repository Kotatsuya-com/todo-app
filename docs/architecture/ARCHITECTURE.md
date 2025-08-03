# アーキテクチャ概要

## 🏗️ Clean Architecture 採用

このプロジェクトは**Clean Architecture**パターンを採用し、ビジネスロジックとインフラストラクチャを分離することで、保守性・テスタビリティ・再利用性を向上させています。

## 📐 アーキテクチャ構造

```
app/api/               # Presentation Layer (HTTP handlers)
lib/services/          # Application Layer (use cases & business logic)
lib/repositories/      # Infrastructure Layer (data access)
lib/entities/          # Domain Layer (business objects & rules)
components/            # UI Layer (view components)
```

### 🏛️ Domain Layer (`lib/entities/`)

**責務**: ビジネスルールとドメインロジック

- 外部依存を持たない純粋なビジネスオブジェクト
- エンティティのバリデーションと状態変更
- ビジネス不変条件の保証

**主要クラス**:
- `TodoEntity`: タスクのビジネスロジック（四象限判定、緊急度計算）
- `UserEntity`: ユーザーの状態管理とバリデーション
- `SlackConnectionEntity`: Slack接続の管理
- `SlackWebhookEntity`: Webhookの状態変更

**実装例**:
```typescript
export class TodoEntity {
  constructor(private todo: Todo) {}

  getQuadrant(): TodoQuadrant {
    const urgent = this.isUrgent()
    const important = this.isImportant()
    
    if (urgent && important) return 'urgent_important'
    if (!urgent && important) return 'not_urgent_important'
    if (urgent && !important) return 'urgent_not_important'
    return 'not_urgent_not_important'
  }

  isUrgent(): boolean {
    if (!this.todo.deadline) return false
    return new Date(this.todo.deadline) <= new Date()
  }

  isImportant(): boolean {
    return this.todo.importance_score >= 0.4
  }
}
```

### 📊 Infrastructure Layer (`lib/repositories/`)

**責務**: データアクセスの抽象化

- Supabaseクライアントのカプセル化
- 統一されたエラーハンドリング
- データベース操作の詳細を隠蔽

**主要クラス**:
- `BaseRepository`: 共通のリポジトリインターフェース
- `TodoRepository`: タスクデータアクセス
- `SlackRepository`: Slack関連データアクセス
- `EmojiSettingsRepository`: 絵文字設定データアクセス

**実装例**:
```typescript
export class SlackRepository implements SlackRepositoryInterface {
  constructor(private client: SupabaseClient) {}

  async findWebhookById(webhookId: string): Promise<RepositoryResult<SlackWebhook>> {
    const result = await this.client
      .from('user_slack_webhooks')
      .select('*')
      .eq('webhook_id', webhookId)
      .single()
    
    return RepositoryUtils.handleSupabaseResult(result)
  }
}
```

### ⚙️ Application Layer (`lib/services/`)

**責務**: ビジネスユースケースの実装

- 複数リポジトリを協調させたビジネスユースケース
- 外部API連携（Slack、OpenAI）
- トランザクション管理
- ビジネスロジックの調整

**主要クラス**:
- `SlackService`: Slack連携の全ビジネスロジック
- `EmojiSettingsService`: 絵文字設定管理
- `ServiceFactory`: 依存性注入とサービス生成

**実装例**:
```typescript
export class SlackService {
  constructor(
    private slackRepo: SlackRepositoryInterface,
    private todoRepo: TodoRepositoryInterface
  ) {}

  async processWebhookEvent(
    webhookId: string,
    payload: SlackEventPayload
  ): Promise<SlackServiceResult<WebhookProcessingResult>> {
    // Webhook検証
    const webhookResult = await this.slackRepo.findWebhookById(webhookId)
    if (!webhookResult.success) {
      return { success: false, error: 'Webhook not found', statusCode: 404 }
    }

    // ビジネスロジック実行
    // ...
  }
}
```

### 🌐 Presentation Layer (`app/api/`)

**責務**: HTTP固有の処理のみ

- リクエスト/レスポンスの変換
- サービス層への委譲
- HTTPステータスコードの管理
- 認証・認可チェック

**実装例**:
```typescript
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slackService } = createServices()
    const payload = await request.json()
    
    const result = await slackService.processWebhookEvent(
      params.webhook_id,
      payload
    )
    
    return NextResponse.json(result.data, { status: result.statusCode })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## 🔧 技術スタック

| レイヤー | 技術 | 詳細 |
|---------|------|------|
| フロントエンド | Next.js 14（App Router, TypeScript） | React Server Components |
| UI | Tailwind CSS + Radix UI | アクセシブルなデザインシステム |
| 状態管理 | Zustand | 軽量で型安全な状態管理 |
| バックエンド | Supabase（PostgreSQL + Auth） | BaaS with RLS |
| 認証 | @supabase/ssr | SSR対応の認証 |
| ホスティング | Vercel | サーバーレス展開 |
| LLM連携 | OpenAI API | GPT-4o miniによるタイトル生成 |
| Slack連携 | Slack Web API | OAuth + Event API |

## 🎯 設計原則

### 依存性の方向

```
Domain ← Application ← Infrastructure
   ↑         ↑             ↑
   └─── Presentation ────────┘
```

- **Domain Layer**: 他の層に依存しない
- **Application Layer**: Domain Layerのみに依存
- **Infrastructure Layer**: Domain + Application Layerに依存
- **Presentation Layer**: すべての層に依存可能

### 開発ルール

#### 新規実装時の必須事項

1. ✅ **必ずClean Architecture構造で実装**
2. ✅ **ビジネスロジックはService層に集約**
3. ✅ **データアクセスはRepository層で抽象化**
4. ✅ **APIはHTTP処理のみに専念**

#### レガシーコード移行方針

- 既存のAPI（直接Supabase使用）は段階的にClean Architecture版に移行
- 新機能は必ずClean Architecture版で実装
- テストはService層とRepository層を中心に作成

### ファイル構成ルール

```
app/                   # Next.js App Router（ページとAPI）
components/            # 再利用可能UIコンポーネント
  ├── ui/             # 基本UIコンポーネント（Button, Modal等）
  ├── layout/         # レイアウト関連（Navigation, Menu等）  
  └── [feature]/      # 機能別コンポーネント（todo, auth等）
lib/
  ├── entities/       # 🆕 Domain Layer - ビジネスオブジェクト
  ├── repositories/   # 🆕 Infrastructure Layer - データアクセス
  ├── services/       # 🆕 Application Layer - ビジネスロジック
  └── [utils]/        # ユーティリティと共通ロジック
store/                 # Zustand状態管理（段階的にService層に移行）
types/                 # TypeScript型定義
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