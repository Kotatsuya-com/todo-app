# プロジェクト構造

## 📁 ディレクトリ構成

```
todo-app/
├── app/                          # Next.js App Router
│   ├── api/                      # APIルート
│   │   ├── app-url/              # アプリURL取得API
│   │   ├── generate-title/       # OpenAI見出し生成API
│   │   ├── slack/                # Slack連携API
│   │   │   ├── auth/             # OAuth認証
│   │   │   ├── connections/      # 接続管理
│   │   │   ├── events/user/[webhook_id]/ # Event API
│   │   │   ├── integration/disconnect/   # 連携解除
│   │   │   ├── route.ts          # メッセージ取得
│   │   │   └── webhook/          # Webhook管理
│   │   └── user/                 # ユーザー設定API
│   │       ├── emoji-settings/   # 絵文字設定
│   │       └── notifications/    # 通知設定
│   ├── compare/                  # 優先度比較画面
│   ├── report/                   # レポート画面
│   ├── settings/                 # 設定画面
│   ├── globals.css               # グローバルCSS
│   ├── layout.tsx                # ルートレイアウト
│   └── page.tsx                  # ダッシュボード
│
├── components/                   # Reactコンポーネント
│   ├── auth/                     # 認証関連
│   ├── layout/                   # レイアウトコンポーネント
│   ├── providers/                # コンテキストプロバイダー
│   ├── settings/                 # 設定関連コンポーネント
│   ├── slack/                    # Slack連携コンポーネント
│   ├── todo/                     # TODO関連コンポーネント
│   └── ui/                       # 汎用UIコンポーネント
│
├── docs/                         # 📚 ドキュメント
│   ├── setup/                    # セットアップ関連
│   │   ├── SETUP.md              # セットアップガイド
│   │   ├── ENVIRONMENT.md        # 環境変数設定
│   │   └── TROUBLESHOOTING.md    # トラブルシューティング
│   ├── architecture/             # アーキテクチャ・設計
│   │   ├── ARCHITECTURE.md       # アーキテクチャ概要
│   │   ├── DATABASE.md           # データベース設計
│   │   └── API.md                # API仕様
│   ├── development/              # 開発ガイド
│   │   ├── DEVELOPMENT.md        # 開発ガイド
│   │   ├── TESTING.md            # テストガイド
│   │   └── SECURITY.md           # セキュリティガイド
│   ├── features/                 # 機能仕様
│   │   ├── SLACK.md              # Slack連携機能
│   │   └── UI_SPEC.md            # UI・UX仕様
│   └── project/                  # プロジェクト管理
│       ├── STRUCTURE.md          # プロジェクト構造
│       └── CHANGELOG.md          # 変更履歴
│
├── hooks/                        # カスタムフック
│   └── useWebhookNotifications.ts
│
├── lib/                          # 🏛️ Clean Architecture
│   ├── entities/                 # Domain Layer
│   │   ├── EmojiSettings.ts      # 絵文字設定エンティティ
│   │   ├── SlackConnection.ts    # Slack接続エンティティ
│   │   ├── Todo.ts               # TODOエンティティ
│   │   └── User.ts               # ユーザーエンティティ
│   ├── repositories/             # Infrastructure Layer
│   │   ├── BaseRepository.ts     # リポジトリ基底クラス
│   │   ├── EmojiSettingsRepository.ts
│   │   ├── SlackRepository.ts
│   │   └── TodoRepository.ts
│   ├── services/                 # Application Layer
│   │   ├── EmojiSettingsService.ts
│   │   ├── ServiceFactory.ts     # 依存性注入
│   │   └── SlackService.ts
│   ├── auth/                     # 認証関連
│   ├── client-logger.ts          # クライアントログ
│   ├── logger.ts                 # サーバーログ
│   ├── ngrok-url.ts              # ngrok URL取得
│   ├── notifications.ts          # 通知機能
│   ├── openai-title.ts           # OpenAI連携
│   ├── slack-message.ts          # Slackメッセージ処理
│   ├── slack-signature.ts        # Slack署名検証
│   ├── supabase-server.ts        # Supabaseサーバー
│   ├── supabase.ts               # Supabaseクライアント
│   └── utils.ts                  # ユーティリティ
│
├── logs/                         # ログファイル
│   └── dev.log                   # 開発環境ログ
│
├── middleware.ts                 # Next.js認証ミドルウェア
│
├── scripts/                     # 開発スクリプト
│   ├── dev-with-webhook.js       # Webhook開発環境
│   ├── seed-dev-data.js          # シードデータ投入
│   ├── start-ngrok.js            # ngrok起動
│   └── temp-clear.sql            # 一時データクリア
│
├── store/                        # Zustand状態管理
│   └── todoStore.ts              # TODO状態管理
│
├── supabase/                     # Supabase設定
│   ├── config.toml               # Supabase設定
│   ├── migrations/               # データベースマイグレーション
│   │   ├── 20250721085254_initial_schema.sql
│   │   ├── 20250725180821_slack_connections.sql
│   │   ├── 20250727024659_user_slack_webhooks.sql
│   │   ├── 20250727085000_fix_webhook_encoding.sql
│   │   ├── 20250728173625_user_emoji_settings.sql
│   │   ├── 20250729175521_add_slack_event_deduplication.sql
│   │   ├── 20250730145916_add_notification_preferences.sql
│   │   ├── 20250730175158_add_created_via_to_todos.sql
│   │   ├── 20250730180000_fix_realtime_rls.sql
│   │   └── 20250731080000_enable_realtime_todos.sql
│   ├── seed.sql                  # 本番用シードデータ
│   └── seed-dev.sql              # 開発用シードデータ
│
├── types/                        # TypeScript型定義
│   ├── index.ts                  # 共通型定義
│   └── supabase.ts               # Supabase型定義
│
├── __tests__/                    # テストファイル
│   ├── api/                      # APIテスト
│   ├── fixtures/                 # テスト用データ
│   ├── helpers/                  # テストヘルパー
│   ├── lib/                      # ライブラリテスト
│   └── mocks/                    # モックファイル
│
├── .env.local.example            # ローカル環境変数テンプレート
├── .env.production.example       # 本番環境変数テンプレート
├── .gitignore                    # Git除外設定
├── CLAUDE.md                     # Claude Code用指示書
├── README.md                     # プロジェクト概要
├── jest.config.js                # Jest設定
├── jest.setup.js                 # Jestセットアップ
├── next.config.js                # Next.js設定
├── package.json                  # 依存関係・スクリプト
├── postcss.config.js             # PostCSS設定
├── tailwind.config.js            # Tailwind CSS設定
└── tsconfig.json                 # TypeScript設定
```

## 🏗️ アーキテクチャレイヤー

### Clean Architecture採用

```
┌─────────────────────────────────────┐
│           UI Layer                  │
│         (components/)               │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│       Presentation Layer            │
│          (app/api/)                 │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│      Application Layer              │
│        (lib/services/)              │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│     Infrastructure Layer            │
│      (lib/repositories/)            │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│        Domain Layer                 │
│       (lib/entities/)               │
└─────────────────────────────────────┘
```

### レイヤー別責務

#### 1. Domain Layer (`lib/entities/`)
- **責務**: ビジネスルールとドメインロジック
- **特徴**: 外部依存なし、純粋なビジネスオブジェクト
- **例**: `TodoEntity.getQuadrant()`, `UserEntity.canReceiveNotifications()`

#### 2. Infrastructure Layer (`lib/repositories/`)
- **責務**: データアクセスの抽象化
- **特徴**: Supabaseクライアントのカプセル化、統一エラーハンドリング
- **例**: `SlackRepository.findWebhookById()`, `TodoRepository.createTodo()`

#### 3. Application Layer (`lib/services/`)
- **責務**: ビジネスユースケースの実装
- **特徴**: 複数リポジトリの協調、外部API連携
- **例**: `SlackService.processWebhookEvent()`, `EmojiSettingsService.updateSettings()`

#### 4. Presentation Layer (`app/api/`)
- **責務**: HTTP固有の処理
- **特徴**: リクエスト/レスポンス変換、サービス層への委譲
- **例**: APIルートハンドラー、認証チェック

#### 5. UI Layer (`components/`)
- **責務**: ユーザーインターフェース
- **特徴**: 状態管理、ユーザー操作の処理
- **例**: `TodoCard`, `CreateTodoModal`, `SlackIntegration`

## 📂 ディレクトリ別詳細

### `/app` - Next.js App Router

#### API Routes (`/app/api`)
```
api/
├── app-url/              # 動的アプリURL取得
├── generate-title/       # OpenAI見出し生成
├── slack/                # Slack連携
│   ├── auth/            # OAuth認証フロー
│   ├── connections/     # ワークスペース接続管理
│   ├── events/user/[webhook_id]/ # イベント受信
│   ├── integration/disconnect/   # 連携解除
│   ├── route.ts         # メッセージ取得
│   └── webhook/         # Webhook管理
└── user/                # ユーザー設定
    ├── emoji-settings/  # 絵文字リアクション設定
    └── notifications/   # 通知設定
```

#### Pages (`/app`)
```
app/
├── page.tsx             # ダッシュボード（/）
├── compare/page.tsx     # 優先度比較（/compare）
├── report/page.tsx      # 完了レポート（/report）
├── settings/page.tsx    # 設定画面（/settings）
└── layout.tsx           # ルートレイアウト
```

### `/components` - React Components

#### 機能別コンポーネント
```
components/
├── auth/                # 認証関連
│   └── AuthForm.tsx     # ログイン・サインアップフォーム
├── layout/              # レイアウト
│   ├── Navigation.tsx   # ナビゲーションバー
│   └── MobileMenu.tsx   # モバイルメニュー
├── providers/           # コンテキスト
│   └── AuthProvider.tsx # 認証プロバイダー
├── settings/            # 設定画面
│   ├── EmojiSettings.tsx        # 絵文字設定
│   └── NotificationSettings.tsx # 通知設定
├── slack/               # Slack連携
│   └── SlackIntegration.tsx     # Slack統合管理
├── todo/                # TODO管理
│   ├── CreateTodoModal.tsx      # 作成モーダル
│   ├── EditTodoModal.tsx        # 編集モーダル
│   ├── TodoCard.tsx             # TODOカード
│   └── TodoForm.tsx             # 共通フォーム
└── ui/                  # 汎用UI
    └── Button.tsx       # ボタンコンポーネント
```

### `/lib` - Clean Architecture Core

#### Clean Architecture実装
```
lib/
├── entities/            # 🏛️ Domain Layer
│   ├── EmojiSettings.ts # 絵文字設定ドメイン
│   ├── SlackConnection.ts # Slack接続ドメイン
│   ├── Todo.ts          # TODOドメイン
│   └── User.ts          # ユーザードメイン
├── repositories/        # 📊 Infrastructure Layer
│   ├── BaseRepository.ts        # 基底リポジトリ
│   ├── EmojiSettingsRepository.ts
│   ├── SlackRepository.ts
│   └── TodoRepository.ts
├── services/           # ⚙️ Application Layer
│   ├── EmojiSettingsService.ts  # 絵文字設定サービス
│   ├── ServiceFactory.ts        # 依存性注入
│   └── SlackService.ts          # Slack統合サービス
└── [utilities]         # ユーティリティ
    ├── auth/           # 認証関連
    ├── openai-title.ts # OpenAI連携
    ├── slack-*.ts      # Slack関連
    └── supabase*.ts    # Supabase関連
```

### `/supabase` - Database Management

#### マイグレーション履歴
```
migrations/
├── 20250721085254_initial_schema.sql          # 初期スキーマ
├── 20250725180821_slack_connections.sql       # Slack接続
├── 20250727024659_user_slack_webhooks.sql     # ユーザーWebhook
├── 20250727085000_fix_webhook_encoding.sql    # Webhook修正
├── 20250728173625_user_emoji_settings.sql     # 絵文字設定
├── 20250729175521_add_slack_event_deduplication.sql # 重複防止
├── 20250730145916_add_notification_preferences.sql  # 通知設定
├── 20250730175158_add_created_via_to_todos.sql      # 作成元追跡
├── 20250730180000_fix_realtime_rls.sql              # リアルタイム修正
└── 20250731080000_enable_realtime_todos.sql         # リアルタイム有効化
```

### `/docs` - Documentation

#### 構造化ドキュメント
```
docs/
├── setup/               # 🚀 セットアップ
│   ├── SETUP.md         # セットアップガイド
│   ├── ENVIRONMENT.md   # 環境変数設定
│   └── TROUBLESHOOTING.md # トラブルシューティング
├── architecture/        # 🏗️ アーキテクチャ
│   ├── ARCHITECTURE.md  # 設計概要
│   ├── DATABASE.md      # データベース設計
│   └── API.md           # API仕様
├── development/         # 👨‍💻 開発
│   ├── DEVELOPMENT.md   # 開発ガイド
│   ├── TESTING.md       # テスト戦略
│   └── SECURITY.md      # セキュリティ
├── features/            # ✨ 機能
│   ├── SLACK.md         # Slack連携
│   └── UI_SPEC.md       # UI・UX仕様
└── project/             # 📋 プロジェクト
    ├── STRUCTURE.md     # プロジェクト構造
    └── CHANGELOG.md     # 変更履歴
```

### `/types` - Type Definitions

#### 型定義構成
```typescript
// types/index.ts
export type Urgency = 'today' | 'tomorrow' | 'later'
export type TodoQuadrant = 'urgent_important' | 'not_urgent_important' | 'urgent_not_important' | 'not_urgent_not_important'
export type CreatedVia = 'manual' | 'slack_url' | 'slack_reaction'

// types/supabase.ts - 自動生成
export interface Database {
  // Supabaseから自動生成される型定義
}
```

## 🔧 設定ファイル

### 主要設定ファイル

#### Next.js設定 (`next.config.js`)
```javascript
module.exports = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  images: {
    domains: ['localhost', '*.ngrok.io']
  }
}
```

#### TypeScript設定 (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

#### Jest設定 (`jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/api/**/*.{ts,tsx}'
  ]
}
```

#### Tailwind設定 (`tailwind.config.js`)
```javascript
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // カスタムカラー
      }
    }
  }
}
```

## 📦 パッケージ管理

### 主要依存関係

#### 本番依存関係
```json
{
  "@supabase/supabase-js": "^2.x",
  "@supabase/ssr": "^0.x",
  "next": "14.x",
  "react": "18.x",
  "zustand": "^4.x",
  "lucide-react": "^0.x",
  "tailwindcss": "^3.x",
  "openai": "^4.x",
  "recharts": "^2.x"
}
```

#### 開発依存関係
```json
{
  "@types/node": "^20.x",
  "@types/react": "^18.x",
  "typescript": "^5.x",
  "jest": "^29.x",
  "@testing-library/react": "^14.x",
  "eslint": "^8.x",
  "prettier": "^3.x"
}
```

## 🚀 スクリプト

### 開発スクリプト (`package.json`)
```json
{
  "scripts": {
    "dev": "開発環境（ローカルSupabase）",
    "dev:webhook": "Webhook開発環境（ngrok）",
    "dev:quick": "本番DB接続開発",
    "build": "本番ビルド",
    "test": "テスト実行",
    "lint": "ESLintチェック",
    "db:start": "ローカルSupabase起動",
    "db:migrate": "マイグレーション実行",
    "seed:dev": "開発用シードデータ投入"
  }
}
```

## 📊 メトリクス・統計

### プロジェクト規模（概算）

| 項目 | 数量 |
|------|------|
| 総ファイル数 | ~150 |
| TypeScriptファイル | ~80 |
| Reactコンポーネント | ~25 |
| APIエンドポイント | ~15 |
| データベーステーブル | 8 |
| マイグレーション | 9 |
| テストファイル | ~30 |
| ドキュメントページ | 12 |

### コード統計（概算）

| 言語 | 行数 |
|------|------|
| TypeScript/TSX | ~8,000 |
| SQL | ~1,500 |
| Markdown | ~5,000 |
| CSS/Tailwind | ~500 |
| JSON/Config | ~300 |

## 📋 依存関係マップ

### レイヤー間依存関係

```
UI Layer (components/)
    ↓
Presentation Layer (app/api/)
    ↓
Application Layer (lib/services/)
    ↓
Infrastructure Layer (lib/repositories/)
    ↓
Domain Layer (lib/entities/)
```

### 外部依存関係

```
External Services:
├── Supabase (Database, Auth, Realtime)
├── OpenAI API (Title Generation)
├── Slack API (OAuth, Web API, Events)
└── Vercel (Hosting, Serverless)

Development Tools:
├── Next.js (Framework)
├── TypeScript (Type Safety)
├── Tailwind CSS (Styling)
├── Jest (Testing)
├── ESLint (Code Quality)
└── ngrok (Webhook Development)
```

## 📚 関連ドキュメント

- [アーキテクチャ概要](../architecture/ARCHITECTURE.md) - 設計思想と技術選択
- [開発ガイド](../development/DEVELOPMENT.md) - 開発プロセスとルール
- [API仕様](../architecture/API.md) - 詳細なAPI設計
- [データベース設計](../architecture/DATABASE.md) - データモデル