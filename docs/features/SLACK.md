# Slack連携機能

## 🚀 概要

このアプリケーションは包括的なSlack連携機能を提供し、シームレスなタスク管理ワークフローを実現します。

## ✨ 主要機能

### 1. ユーザー別Slack接続
- 各ユーザーが自分のSlackワークスペースを個別に接続
- OAuth認証による安全な接続
- 複数ワークスペース対応

### 2. Slackメッセージからタスク作成
- Slack URLからメッセージ内容を自動取得
- メンション自動変換（@ユーザー名、@グループ名、#チャンネル名）
- AI自動タイトル生成（GPT-4o mini）

### 3. 絵文字リアクション自動タスク化
- 特定の絵文字でリアクションするとタスク自動作成
- ユーザー固有の絵文字設定カスタマイズ
- 重複防止機能付き

### 4. スマートWebhook通知
- Slackリアクションでタスク作成時のみブラウザ通知
- 手動作成時は通知なし
- 作成元追跡による適切な通知制御

## 🔧 セットアップガイド

### Slack App設定

#### 1. Slack Appの作成

1. [Slack API](https://api.slack.com/apps)にアクセス
2. 「Create New App」をクリック→「From scratch」を選択
3. アプリ名とワークスペースを選択して作成

#### 2. 基本認証情報の取得

1. 左メニューの「Basic Information」をクリック
2. **App Credentials**から以下を取得して`.env.local`に設定：

```env
SLACK_CLIENT_ID=123456789.123456789123
NEXT_PUBLIC_SLACK_CLIENT_ID=123456789.123456789123  # 同じ値
SLACK_CLIENT_SECRET=abcdef123456789abcdef123456789a
SLACK_SIGNING_SECRET=abcdef123456789abcdef123456789a  # Event API用
```

#### 3. OAuth & Permissions設定

1. 左メニューの「OAuth & Permissions」をクリック
2. **Redirect URLs**に以下を追加：
   - 開発環境: `https://your-ngrok-url.ngrok-free.app/api/slack/auth`
   - 本番環境: `https://your-domain.com/api/slack/auth`

3. **User Token Scopes**に以下を追加：
   - `channels:history` - チャンネルメッセージの取得
   - `groups:history` - プライベートチャンネルメッセージの取得
   - `im:history` - DMメッセージの取得
   - `mpim:history` - マルチパーティDMメッセージの取得
   - `users:read` - ユーザー情報の取得
   - `conversations:read` - チャンネル情報の取得
   - `usergroups:read` - グループ情報の取得

#### 4. Event Subscriptions設定（リアクション自動タスク化）

1. 左メニューの「Event Subscriptions」をクリック
2. 「Enable Events」をONに
3. **Request URL**に以下を入力：

```
開発環境（初回設定用）:
https://your-ngrok-url.ngrok-free.app/api/slack/events/user/test-webhook-id

※ 初回はURL verificationのため仮のwebhook IDを使用
※ アプリで実際のWebhookを作成後、正しいURLに更新
```

4. URL verificationが成功したら「Subscribe to events on behalf of users」で以下を追加：
   - `reaction_added` - 絵文字リアクションの追加を検知

5. 「Save Changes」をクリック

#### 5. アプリのインストール

1. 「OAuth & Permissions」に戻る
2. 「Install to Workspace」をクリック
3. 権限を確認して許可

## 🛠️ 開発環境セットアップ

### 1. 環境変数の設定

`.env.local`に以下を設定：

```bash
SLACK_CLIENT_ID=your-client-id
NEXT_PUBLIC_SLACK_CLIENT_ID=your-client-id  # 同じ値
SLACK_CLIENT_SECRET=your-client-secret
SLACK_SIGNING_SECRET=your-signing-secret
```

### 2. ngrok Webhook開発環境

```bash
# ngrokを使ったWebhook開発環境を起動
npm run dev:webhook
```

起動すると以下が表示されます：

```
✅ Development environment ready!
📍 Local URL: http://localhost:3000
🌐 Public URL: https://abc123.ngrok.io
🔗 Slack Webhook URL: https://abc123.ngrok.io/api/slack/events/user/WEBHOOK_ID
```

### 3. アプリでSlack連携を有効化

1. `http://localhost:3000`にアクセス
2. 「設定」ページへ移動
3. 「Slackに接続」をクリックしてワークスペースを認証
4. 「絵文字リアクション連携を有効化」をクリック
5. 表示されたWebhook URLをコピー

### 4. Slack AppのEvent URL更新

1. [Slack API](https://api.slack.com/apps)でアプリを選択
2. 「Event Subscriptions」へ移動
3. **Request URL**を手順3でコピーしたURLに更新
4. URL verificationが成功することを確認
5. 「Save Changes」をクリック

## 📱 使用方法

### Slackワークスペース接続

1. アプリの「設定」画面で「Slackに接続」をクリック
2. 接続したいSlackワークスペースでアプリを認可
3. 接続完了後、そのワークスペースのメッセージを取得可能

### Slackメッセージからタスク作成

1. タスク作成モーダルの本文欄にSlackメッセージのURLを入力
2. SlackURLが検出されると自動でメッセージを取得（ボタン不要）
3. 取得されたメッセージ内容がプレビュー表示される
4. メンション（@ユーザー名、@グループ名、#チャンネル名）も自動で名前に変換
5. GPT-4o miniによる自動タイトル生成も実行
6. タスク保存時に、Slackメッセージの内容がタスクの本文として使用される

**対応URL形式**:
- チャンネル: `https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP`
- スレッド: `https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP?thread_ts=THREAD_TS`
- DM: `https://workspace.slack.com/archives/DM_ID/pTIMESTAMP`

### 絵文字リアクション自動タスク化

#### デフォルト絵文字設定

| 絵文字 | 名前 | 緊急度 | 期限 | 四象限 |
|--------|------|--------|------|--------|
| 📝 | `:memo:` | 今日中 | 今日 | 🔥 今すぐやる |
| 📋 | `:clipboard:` | 今日中 | 今日 | 🔥 今すぐやる |
| ✏️ | `:pencil:` | 明日 | 明日 | 📅 計画してやる |
| 🗒️ | `:spiral_note_pad:` | それより後 | なし | 📝 後回し |
| 📄 | `:page_with_curl:` | それより後 | なし | 📝 後回し |

#### カスタマイズ機能

- **設定場所**: アプリの「設定」ページ → 「絵文字リアクション設定」セクション
- **選択可能絵文字**: 🔥🔔⚡📅🕐⏳📝📌🔖💡⭐⚠️の12種類から選択
- **個人設定**: 各ユーザーが自分の好みやチーム文化に合わせて設定可能
- **即座反映**: 設定変更後、すぐにSlackリアクション連携に反映
- **デフォルトリセット**: ワンクリックでデフォルト設定に戻すことが可能

#### 動作フロー

1. ユーザーがSlackメッセージに設定した絵文字でリアクション
2. アプリがEvent APIでイベントを受信
3. **ユーザー認証**: リアクションしたユーザーが連携を行ったユーザー本人かを確認
4. **絵文字判定**: ユーザーの設定に基づいて緊急度を決定
5. メッセージ内容とURLを自動取得
6. 緊急度に応じたタスクを作成（OpenAIによる自動タイトル生成）
7. ダッシュボードに自動表示

## 🔒 セキュリティ機能

### ユーザー認証強化

- **本人認証**: リアクションしたSlackユーザーIDと連携ユーザーのSlack User IDを照合
- **不正防止**: 連携を行ったユーザー本人以外のリアクションは無視
- **設定必須**: ユーザーはSlack User IDの設定が必要（設定画面で案内）

### 重複防止システム

- **問題解決**: 1つの絵文字リアクションで2つのタスクが作成される重複処理を完全防止
- **根本原因**: Slackの仕様によるイベント重複送信（タイムアウト・ネットワーク遅延時のリトライ）
- **技術実装**:
  - 新テーブル`slack_event_processed`でイベント重複検知
  - ユニークキー（`channel + timestamp + reaction + user`）による確実な重複防止
  - 24時間後の自動クリーンアップで軽量化

### Webhook署名検証

- **署名検証**: HMAC-SHA256による署名確認
- **タイムスタンプ検証**: 5分以内のリクエストのみ許可
- **固有シークレット**: Webhook毎に個別のシークレット

## 🔧 API仕様

### `/api/slack` 🔐

**機能**: Slack URLからメッセージ内容を取得

**リクエスト**:
```json
{
  "slackUrl": "https://workspace.slack.com/archives/C1234567890/p1234567890123456"
}
```

**レスポンス**:
```json
{
  "message": "メッセージ内容",
  "userName": "送信者名",
  "timestamp": "投稿時刻",
  "channelName": "チャンネル名",
  "slackUrl": "元のURL"
}
```

### `/api/slack/auth` 🔐

**機能**: Slack OAuth認証処理

**処理内容**:
- OAuth tokenの交換
- workspace情報の保存
- 成功時は設定画面へリダイレクト

### `/api/slack/connections` 🔐

**機能**: 接続済みSlackワークスペース管理

**GET - 一覧取得**:
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

**DELETE - 接続削除**: `?id=connection_id`

### `/api/slack/webhook` 🔐

**機能**: ユーザー固有のWebhook管理

**POST - Webhook作成**:
```json
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

### `/api/slack/events/user/[webhook_id]` 🔑

**機能**: Slack Event APIからのイベント受信

**処理内容**:
- URL verification（初回設定時）
- reaction_addedイベントの処理
- 署名検証（webhook_secret使用）
- 重複イベント防止
- 自動タスク作成

### `/api/user/emoji-settings` 🔐

**機能**: 絵文字リアクション設定管理

**GET - 設定取得**:
```json
{
  "today_emojis": ["memo", "clipboard"],
  "tomorrow_emojis": ["pencil"],
  "later_emojis": ["spiral_note_pad", "page_with_curl"]
}
```

**PUT - 設定更新**:
```json
{
  "today_emojis": ["memo", "bookmark"],
  "tomorrow_emojis": ["pencil", "pencil2"],
  "later_emojis": ["spiral_note_pad"]
}
```

## 📊 データベース設計

### slack_connections テーブル

```sql
CREATE TABLE slack_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  workspace_name TEXT NOT NULL,
  team_name TEXT NOT NULL,
  access_token TEXT NOT NULL,  -- OAuth取得のアクセストークン
  scope TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, workspace_id)
);
```

### user_slack_webhooks テーブル

```sql
CREATE TABLE user_slack_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slack_connection_id UUID REFERENCES slack_connections(id) ON DELETE CASCADE,
  webhook_id TEXT UNIQUE NOT NULL,      -- Base64URL エンコードされた一意ID
  webhook_secret TEXT NOT NULL,        -- Webhook署名検証用シークレット
  is_active BOOLEAN DEFAULT true,
  last_event_at TIMESTAMP WITH TIME ZONE,
  event_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### user_emoji_settings テーブル

```sql
CREATE TABLE user_emoji_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  today_emojis TEXT[] DEFAULT ARRAY['memo', 'clipboard'],        -- 今日期限
  tomorrow_emojis TEXT[] DEFAULT ARRAY['pencil'],                -- 明日期限
  later_emojis TEXT[] DEFAULT ARRAY['spiral_note_pad', 'page_with_curl'], -- それより後
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id)
);
```

### slack_event_processed テーブル

```sql
CREATE TABLE slack_event_processed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT UNIQUE NOT NULL,      -- channel:timestamp:reaction:user
  processed_at TIMESTAMP DEFAULT NOW()
);
```

## 🔔 スマート通知システム

### リアルタイムWebhook通知

- **新機能**: Slackリアクションでタスク作成時に即座にブラウザ通知を受信
- **ユーザー固有**: 各ユーザーは自分のタスク作成時のみ通知を受信（完全分離）

**技術実装**:
- データベース: `users`テーブルに`enable_webhook_notifications`フィールド追加
- API: `/api/user/notifications`でユーザー固有の通知設定管理
- リアルタイム: Supabaseリアルタイムsubscriptionで即座に検出
- ブラウザ通知: Permission APIでネイティブ通知を表示

**UI機能**:
- 設定画面に通知ON/OFFトグル追加
- ブラウザ通知許可状態の表示と許可要求ボタン
- 通知プレビュー機能（許可時にテスト通知表示）

**通知内容**: タスクタイトル、緊急度、作成元情報を含む詳細通知

## 🛠️ トラブルシューティング

### OAuth設定エラー

**症状**: Slack認証が失敗する

**解決方法**:
1. **環境変数の確認**
   ```bash
   echo "SLACK_CLIENT_ID: $([[ -n "$SLACK_CLIENT_ID" ]] && echo "SET" || echo "NOT SET")"
   echo "SLACK_CLIENT_SECRET: $([[ -n "$SLACK_CLIENT_SECRET" ]] && echo "SET" || echo "NOT SET")"
   ```

2. **Redirect URL確認**
   - 開発環境: `http://localhost:3000/api/slack/auth`
   - 本番環境: `https://your-app.vercel.app/api/slack/auth`

### Event API関連

**Webhook URL検証エラー**:
1. **Webhook URLの確認**
   ```bash
   npm run dev:webhook
   # 表示されたWebhook URLをSlack Appに設定
   ```

2. **ngrok URLの更新**
   - `npm run dev:webhook` 実行時に表示されるURLをコピー
   - Slack App設定の **Event Subscriptions** → **Request URL** に貼り付け

**署名検証エラー**:
```bash
# SLACK_SIGNING_SECRETが正しく設定されているか確認
echo $SLACK_SIGNING_SECRET
```

### 権限関連

**User Token Scopes エラー**:
Slack App設定で以下の権限が付与されているか確認：
- `channels:history`, `groups:history`, `im:history`, `mpim:history`
- `users:read`, `conversations:read`, `usergroups:read`

## 📚 関連ドキュメント

- [セットアップガイド](../setup/SETUP.md) - 基本的なセットアップ手順
- [API仕様](../architecture/API.md) - Slack API詳細
- [データベース設計](../architecture/DATABASE.md) - Slack関連テーブル
- [トラブルシューティング](../setup/TROUBLESHOOTING.md) - よくある問題の解決方法