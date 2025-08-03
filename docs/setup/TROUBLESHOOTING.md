# トラブルシューティング

このドキュメントでは、開発環境でよく発生する問題と解決方法を説明します。

## 🔍 よくある問題の診断

問題が発生した場合は、まず以下を確認してください：

```bash
# システム情報の確認
node --version          # Node.js バージョン
npm --version           # npm バージョン
npm run db:status       # Supabaseプロジェクトの状態
```

## 🗄️ Supabase接続エラー

### 症状
- データベースに接続できない
- 認証エラーが発生する
- `connect ECONNREFUSED 127.0.0.1:54321` エラー

### 解決方法

1. **環境変数の確認**
   ```bash
   # .env.local の設定内容を確認（APIキーは隠して共有）
   cat .env.local | grep -v "API_KEY\|SECRET"
   ```

2. **Supabaseプロジェクトの確認**
   ```bash
   # ローカルSupabaseの起動状況を確認
   npm run db:status
   
   # 停止している場合は起動
   npm run db:start
   ```

3. **Docker Desktopの確認**
   - Docker Desktopが起動しているか確認
   - リソース不足の場合は再起動

4. **完全リセット**
   ```bash
   # 全データ削除して再構築
   npm run db:stop
   docker system prune -f
   npm run dev
   ```

## 🤖 OpenAI APIエラー

### 症状
- タイトル生成機能が動作しない
- `401 Unauthorized` エラー
- `Rate limit exceeded` エラー

### 解決方法

1. **APIキーの確認**
   - [OpenAI Platform](https://platform.openai.com/account/api-keys)でキーが有効か確認
   - `.env.local`のキーが正しく設定されているか確認

2. **利用制限の確認**
   - APIの利用制限に達していないか確認
   - [Usage Dashboard](https://platform.openai.com/account/usage)で使用量をチェック

3. **APIキーの再生成**
   ```bash
   # 新しいAPIキーを生成して再設定
   # OpenAI Platformで新しいキーを作成
   # .env.localを更新
   ```

## 📱 Slack連携エラー

### 認証関連

#### OAuth設定エラー
**症状**: Slack認証が失敗する

**解決方法**:
1. **環境変数の確認**
   ```bash
   # 必要な変数が設定されているか確認
   echo "SLACK_CLIENT_ID: $([[ -n "$SLACK_CLIENT_ID" ]] && echo "SET" || echo "NOT SET")"
   echo "SLACK_CLIENT_SECRET: $([[ -n "$SLACK_CLIENT_SECRET" ]] && echo "SET" || echo "NOT SET")"
   echo "SLACK_SIGNING_SECRET: $([[ -n "$SLACK_SIGNING_SECRET" ]] && echo "SET" || echo "NOT SET")"
   ```

2. **Slack App設定の確認**
   - [Slack API](https://api.slack.com/apps)でアプリを選択
   - **Basic Information**で Client ID、Client Secret を確認
   - **OAuth & Permissions**で Redirect URLs が正しいか確認
     - 開発環境: `http://localhost:3000/api/slack/auth`
     - 本番環境: `https://your-app.vercel.app/api/slack/auth`

#### Signing Secret エラー
**症状**: `❌ Invalid Slack signature` エラー

**解決方法**:
```bash
# Signing Secretが正しく設定されているか確認
echo $SLACK_SIGNING_SECRET

# Slack AppのEvent SubscriptionsページでSigning Secretを再確認
# Basic Information → App Credentials → Signing Secret
```

### Event API関連

#### Webhook URL検証エラー
**症状**: Slack AppでURL verificationが失敗する

**解決方法**:
1. **Webhook URLの確認**
   ```bash
   # 開発環境
   npm run dev:webhook
   # 表示されたWebhook URLをSlack Appに設定
   ```

2. **ngrok URLの更新**
   - `npm run dev:webhook` 実行時に表示されるURLをコピー
   - Slack App設定の **Event Subscriptions** → **Request URL** に貼り付け

#### Webhook取得エラー
**症状**: データベースにWebhook IDが存在しない

**解決方法**:
1. **Webhookの再作成**
   - アプリの設定画面でWebhookを削除
   - 新しいWebhookを作成
   
2. **ログの確認**
   ```bash
   # 開発ログを確認
   tail -f logs/dev.log
   ```

### 権限関連

#### User Token Scopes エラー
**症状**: Slackメッセージの取得に失敗する

**解決方法**:
Slack App設定で以下の権限が付与されているか確認：
- `channels:history`
- `groups:history`
- `im:history`
- `mpim:history`
- `users:read`
- `conversations:read`
- `usergroups:read`

#### SlackURL形式エラー
**症状**: Slack URLからメッセージを取得できない

**正しい形式**:
```
https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP
https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP?thread_ts=THREAD_TS
```

## 🔧 ngrok関連エラー

### 接続エラー（ECONNREFUSED 127.0.0.1:4040）

**症状**:
```bash
❌ Failed to start development environment: connect ECONNREFUSED 127.0.0.1:4040
```

**原因と解決方法**:

1. **ngrokがインストールされていない**
   ```bash
   # macOS (Homebrew)
   brew install ngrok/ngrok/ngrok
   
   # または公式サイトからダウンロード
   # https://ngrok.com/download
   ```

2. **ngrokが起動していない**
   ```bash
   # 手動でngrokを起動して確認
   ngrok http 3000
   ```

3. **認証トークンが設定されていない**
   ```bash
   # 認証トークンを設定
   ngrok config add-authtoken YOUR_AUTHTOKEN
   ```

4. **ポート衝突**
   ```bash
   # 他のプロセスがポート4040を使用していないか確認
   lsof -i :4040
   ```

5. **ngrok Node.jsライブラリの問題**
   ```bash
   # ライブラリを再インストール
   npm uninstall ngrok
   npm install ngrok@latest
   npm run dev:webhook
   ```

### ngrok認証エラー

**解決方法**:
```bash
# 永続的な認証設定（推奨）
ngrok config add-authtoken YOUR_AUTHTOKEN

# 環境変数での設定（一時的）
# .env.localに追加
NGROK_AUTHTOKEN=your-ngrok-authtoken-here
```

### その他のngrok問題

- **トンネル接続失敗**: Docker Desktopが起動しているか確認
- **URL変更頻度**: 有料プランで固定サブドメインを使用可能
- **セッション制限**: 無料プランは同時接続数に制限あり

## 🏗️ ビルドエラー

### Node.js依存関係エラー

**症状**: `npm install` や `npm run build` でエラー

**解決方法**:
```bash
# 依存関係をクリーンインストール
rm -rf node_modules package-lock.json
npm install

# Node.jsバージョンの確認
node --version  # 18以上が必要
```

### TypeScript型エラー

**症状**: ビルド時に型エラーが発生

**解決方法**:
```bash
# 型定義を再生成
npm run types:generate

# TypeScriptの型チェック
npx tsc --noEmit
```

### ESLintエラー

**症状**: Lintエラーでビルドが失敗

**解決方法**:
```bash
# 自動修正を試行
npm run lint -- --fix

# 手動でエラーを確認
npm run lint
```

## 🗃️ データベース関連エラー

### マイグレーションエラー

**症状**: `column does not exist` や `relation does not exist` エラー

**解決方法**:
```bash
# 増分マイグレーションを試行
npm run db:migrate

# エラーが続く場合は完全リセット
npm run db:stop
npm run dev  # 自動的に再構築される
```

### データ不整合エラー

**症状**: 古いデータが原因でエラーが発生

**解決方法**:
```bash
# 開発データをリセット
npm run db:stop
docker volume prune
npm run dev
```

## 🧪 テスト関連エラー

### テスト失敗

**解決方法**:
```bash
# 単体でテストを実行
npm test -- --testNamePattern="特定のテスト名"

# カバレッジ付きでテスト実行
npm run test:coverage

# 監視モードでテスト実行
npm run test:watch
```

## 🚀 パフォーマンス問題

### 起動が遅い

**解決方法**:
```bash
# Next.jsキャッシュをクリア
rm -rf .next

# 依存関係の最適化
npm ci
```

### ページ表示が遅い

**確認事項**:
- OpenAI APIのレスポンス時間
- Supabaseクエリの最適化
- 大量データの処理方法

## 🆘 サポート

上記の解決方法で問題が解決しない場合：

1. **エラーログの収集**
   ```bash
   # 開発ログを確認
   cat logs/dev.log
   
   # ブラウザのコンソールエラーを確認
   # F12 → Console
   ```

2. **環境情報の整理**
   - Node.jsバージョン: `node --version`
   - npmバージョン: `npm --version`
   - OSとブラウザの情報
   - エラーメッセージの詳細

3. **最小再現手順の作成**
   - 問題が発生する最小限の手順
   - 期待する動作と実際の動作の違い

## 📚 関連ドキュメント

- [セットアップガイド](./SETUP.md) - 基本的なセットアップ手順
- [環境変数設定](./ENVIRONMENT.md) - 環境変数の詳細設定
- [開発ガイド](../development/DEVELOPMENT.md) - 開発方法の詳細
- [Slack連携設定](../features/SLACK.md) - Slack連携の詳細