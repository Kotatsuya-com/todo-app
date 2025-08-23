# API仕様

## 🌐 API概要

Next.js App Routerを使用したRESTful APIの詳細仕様です。Clean Architectureパターンに基づき、適切な認証・認可・エラーハンドリングを実装しています。

## 🔐 認証システム

### 認証パターン

| パターン | 説明 | 使用例 |
|---------|------|-------|
| `🔐` | ユーザー認証必須 | Supabase認証でログインユーザーのみアクセス可能 |
| `🔑` | Service Role認証 | Slack APIなど外部サービスからのアクセス用 |
| `🌐` | 認証不要 | 公開エンドポイント |

### 認証フロー

#### 1. ユーザー認証 (`🔐`)
- Supabase SSRを使用したCookieベース認証
- `createServerSupabaseClient`でサーバーサイド認証
- 失敗時は401 Unauthorizedを返す

#### 2. Service Role認証 (`🔑`)
- 環境変数`SUPABASE_SERVICE_ROLE_KEY`使用
- RLS（Row Level Security）をバイパス
- Slack APIなど外部サービス専用

#### 3. Webhook署名検証
- Slack署名検証: `x-slack-signature`ヘッダー
- HMAC-SHA256で署名計算
- タイムスタンプ5分以内チェック

## 📋 APIエンドポイント一覧

### 🤖 AI・LLM連携

#### `/api/generate-title` 🔐

**機能**: OpenAI GPT-4o miniでタスクタイトルを自動生成

**リクエスト**:
```http
POST /api/generate-title
Content-Type: application/json

{
  "content": "プレゼン資料を作成して、来週の会議で発表する準備をする"
}
```

**レスポンス**:
```json
{
  "title": "プレゼン資料作成と発表準備",
  "success": true
}
```

**詳細**:
- 使用モデル: GPT-4o mini
- システムプロンプト: 「15文字以内で、タスクの本質を表する見出しを生成」
- パラメータ: `temperature: 0.7`, `max_tokens: 50`
- レート制限: OpenAI API制限に準拠

### 💬 Slack連携

#### `/api/slack` 🔐

**機能**: Slack URLからメッセージ内容を取得

**リクエスト**:
```http
POST /api/slack
Content-Type: application/json

{
  "url": "https://workspace.slack.com/archives/C1234567890/p1234567890123456"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "content": "APIの仕様について確認をお願いします",
    "user": "@john_doe",
    "timestamp": "2025-01-01T10:00:00Z",
    "channel": "#general"
  }
}
```

**対応URL形式**:
- チャンネル: `https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP`
- スレッド: `https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP?thread_ts=THREAD_TS`

#### `/api/slack/auth` 🔐

**機能**: Slack OAuth認証処理（リダイレクト先）

**リクエスト**:
```http
GET /api/slack/auth?code=slack_auth_code&state=csrf_token
```

**処理**:
- OAuth tokenの交換
- workspace情報の保存
- 成功時は設定画面へリダイレクト

#### `/api/slack/connections` 🔐

**機能**: 接続済みSlackワークスペース管理

**GET - 一覧取得**:
```http
GET /api/slack/connections
```

**レスポンス**:
```json
{
  "connections": [
    {
      "id": "uuid",
      "workspace_name": "My Company",
      "team_name": "Development Team",
      "created_at": "2025-01-01T10:00:00Z"
    }
  ]
}
```

**DELETE - 接続削除**:
```http
DELETE /api/slack/connections?id=connection_id
```

### 👤 ユーザー設定API

#### `/api/user/emoji-settings` 🔐

**機能**: ユーザーごとのSlack絵文字設定を管理

**リクエスト**:
```http
GET /api/user/emoji-settings
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "emojiSettings": [
      {
        "id": "uuid",
        "emoji": "🔥",
        "urgency": "now",
        "custom": false
      }
    ],
    "customEmojiSettings": [
      {
        "id": "uuid",
        "emoji": "custom_emoji",
        "urgency": "tomorrow",
        "workspace_id": "T1234567890"
      }
    ]
  }
}
```

#### `/api/user/notifications` 🔐

**機能**: 通知設定の取得・更新

**リクエスト (GET)**:
```http
GET /api/user/notifications
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "email_notifications": true,
    "slack_notifications": false,
    "notification_time": "09:00:00"
  }
}
```

**リクエスト (PUT)**:
```http
PUT /api/user/notifications
Content-Type: application/json

{
  "email_notifications": false,
  "slack_notifications": true,
  "notification_time": "18:00:00"
}
```

#### `/api/slack/webhook` 🔐

**機能**: ユーザー固有のWebhook管理

**GET - Webhook一覧取得**:
```http
GET /api/slack/webhook
```

**レスポンス**:
```json
{
  "webhooks": [
    {
      "id": "uuid",
      "webhook_id": "base64url_encoded_id",
      "is_active": true,
      "event_count": 42,
      "last_event_at": "2025-01-01T10:00:00Z"
    }
  ]
}
```

**POST - Webhook作成**:
```http
POST /api/slack/webhook
Content-Type: application/json

{
  "slack_connection_id": "connection_uuid"
}
```

**レスポンス**:
```json
{
  "webhook": {
    "id": "uuid",
    "webhook_id": "base64url_encoded_id"
  },
  "webhook_url": "https://app.com/api/slack/events/user/WEBHOOK_ID",
  "message": "Webhook created successfully"
}
```

**DELETE - Webhook削除**:
```http
DELETE /api/slack/webhook?id=webhook_id
```

#### `/api/slack/events/user/[webhook_id]` 🔑

**機能**: Slack Event APIからのイベント受信

**POST - イベント処理**:
```http
POST /api/slack/events/user/WEBHOOK_ID
Content-Type: application/json
X-Slack-Signature: v0=signature
X-Slack-Request-Timestamp: timestamp

{
  "type": "event_callback",
  "event": {
    "type": "reaction_added",
    "user": "U1234567890",
    "reaction": "memo",
    "item": {
      "channel": "C1234567890",
      "ts": "1234567890.123456"
    }
  }
}
```

**処理内容**:
- URL verification（初回設定時）
- reaction_addedイベントの処理
- 署名検証（webhook_secret使用）
- 重複イベント防止
- 自動タスク作成

**対象絵文字と緊急度**:
- 📝 `memo`, 📋 `clipboard` → 今日期限
- ✏️ `pencil` → 明日期限
- 🗒️ `spiral_note_pad`, 📄 `page_with_curl` → それより後

**GET - Webhook情報確認**:
```http
GET /api/slack/events/user/WEBHOOK_ID
```

### 👤 ユーザー設定

#### `/api/user/notifications` 🔐

**機能**: ユーザーの通知設定管理

**GET - 設定取得**:
```http
GET /api/user/notifications
```

**レスポンス**:
```json
{
  "enable_webhook_notifications": true,
  "browser_permission": "granted"
}
```

**PUT - 設定更新**:
```http
PUT /api/user/notifications
Content-Type: application/json

{
  "enable_webhook_notifications": false
}
```

#### `/api/user/emoji-settings` 🔐

**機能**: 絵文字リアクション設定管理

**GET - 設定取得**:
```http
GET /api/user/emoji-settings
```

**レスポンス**:
```json
{
  "today_emojis": ["memo", "clipboard"],
  "tomorrow_emojis": ["pencil"],
  "later_emojis": ["spiral_note_pad", "page_with_curl"]
}
```

**PUT - 設定更新**:
```http
PUT /api/user/emoji-settings
Content-Type: application/json

{
  "today_emojis": ["memo", "bookmark"],
  "tomorrow_emojis": ["pencil", "pencil2"],
  "later_emojis": ["spiral_note_pad"]
}
```

### 🛠️ ユーティリティ

#### `/api/app-url` 🌐

**機能**: 現在のアプリケーションURLを返す（ngrok対応）

**リクエスト**:
```http
GET /api/app-url
```

**レスポンス**:
```json
{
  "url": "https://abc123.ngrok.io",
  "environment": "development"
}
```

## 🚨 エラーハンドリング

### HTTPステータスコード

| コード | 説明 | 用途 |
|--------|------|------|
| 200 | OK | 成功レスポンス |
| 201 | Created | リソース作成成功 |
| 400 | Bad Request | 不正なリクエスト |
| 401 | Unauthorized | 認証が必要 |
| 403 | Forbidden | 権限不足 |
| 404 | Not Found | リソースが見つからない |
| 429 | Too Many Requests | レート制限 |
| 500 | Internal Server Error | サーバーエラー |

### エラーレスポンス形式

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific error details"
  }
}
```

### 一般的なエラー例

**認証エラー**:
```json
{
  "error": "Authentication required",
  "code": "AUTH_REQUIRED"
}
```

**バリデーションエラー**:
```json
{
  "error": "Invalid request data",
  "code": "VALIDATION_ERROR",
  "details": {
    "url": "Invalid Slack URL format"
  }
}
```

**外部API エラー**:
```json
{
  "error": "OpenAI API rate limit exceeded",
  "code": "EXTERNAL_API_ERROR",
  "details": {
    "provider": "openai",
    "retry_after": 60
  }
}
```

## 🔒 セキュリティ対策

### API保護

- **認証チェック**: 全API Routeで認証状態確認
- **CORS設定**: 同一オリジンのみ許可（ngrok環境では調整）
- **レート制限**: 外部API呼び出し制限
- **入力検証**: 厳密なバリデーション実装

### Webhook セキュリティ

- **署名検証**: HMAC-SHA256による署名確認
- **タイムスタンプ検証**: 5分以内のリクエストのみ許可
- **固有シークレット**: Webhook毎に個別のシークレット

### データ保護

- **RLS適用**: 全データベースアクセスでユーザー分離
- **機密情報**: 環境変数での適切な管理
- **ログ出力**: 機密情報のログ除外

## 🔄 データ統合

### Supabaseクライアント

```typescript
// ユーザー認証クライアント
const supabase = createServerSupabaseClient(request)

// Service Roleクライアント（外部API用）
const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### リアルタイム機能

- **Supabase Realtime**: リアルタイムデータ更新
- **ブラウザ通知**: Webhook通知の即座配信
- **状態同期**: UI状態とデータベースの同期

## 📊 モニタリング・ログ

### APIログ

```typescript
// 構造化ログ例
console.log('API Request', {
  endpoint: '/api/slack/events',
  method: 'POST',
  user_id: userId,
  timestamp: new Date().toISOString(),
  webhook_id: webhookId
})
```

### メトリクス

- **レスポンス時間**: API応答時間の監視
- **エラー率**: HTTPエラーの発生率
- **外部API使用量**: OpenAI・Slack APIの使用状況

## 🚀 パフォーマンス

### 最適化戦略

- **キャッシュ**: 適切なHTTPキャッシュヘッダー
- **バッチ処理**: 複数操作の効率化
- **非同期処理**: I/O集約的な処理の最適化

### レート制限

```typescript
// OpenAI API制限例
const rateLimiter = {
  requests_per_minute: 60,
  tokens_per_minute: 150000
}
```

## 📚 関連ドキュメント

- [アーキテクチャ概要](./ARCHITECTURE.md) - 全体設計とClean Architecture
- [データベース設計](./DATABASE.md) - データモデルの詳細
- [Slack連携設定](../features/SLACK.md) - Slack連携の詳細設定
- [開発ガイド](../development/DEVELOPMENT.md) - API開発のベストプラクティス