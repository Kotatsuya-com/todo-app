# 環境変数設定ガイド

このドキュメントでは、各開発環境における環境変数の詳細な設定方法を説明します。

## 📝 環境変数ファイルの種類

| ファイル | 用途 |
|---------|------|
| `.env.local.example` | ローカル開発環境のテンプレート |
| `.env.production.example` | 本番環境のテンプレート |
| `.env.local` | 実際の設定ファイル（Git除外対象） |

## 🏠 ローカル開発環境

```bash
# テンプレートファイルをコピー
cp .env.local.example .env.local
```

### 基本設定

```env
# ローカルSupabase（デフォルト設定）
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# OpenAI（必須）
OPENAI_API_KEY=your-openai-api-key

# Slack OAuth（ユーザー別接続）
SLACK_CLIENT_ID=your-slack-app-client-id
NEXT_PUBLIC_SLACK_CLIENT_ID=your-slack-app-client-id
SLACK_CLIENT_SECRET=your-slack-app-client-secret
SLACK_SIGNING_SECRET=your-slack-signing-secret

# ngrok（Slack Webhook開発用、オプション）
# 注意: 認証トークンは `ngrok config add-authtoken` での設定を推奨
# NGROK_AUTHTOKEN=your-ngrok-authtoken-here
```

### Supabaseキーの取得方法

```bash
# ローカルSupabaseのキーを取得
npm run db:status
```

実行後、表示された `anon key` と `service_role key` を環境変数に設定してください。

## ☁️ 本番データベース接続での開発環境

```bash
# テンプレートファイルをコピー
cp .env.production.example .env.local
```

### 設定内容

```env
# Supabase（本番クラウド）
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI（必須）
OPENAI_API_KEY=your-openai-api-key

# Slack OAuth（ユーザー別接続）
SLACK_CLIENT_ID=your-slack-client-id
NEXT_PUBLIC_SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_SIGNING_SECRET=your-slack-signing-secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Supabase情報の取得方法

1. Supabaseダッシュボードで「Settings」→「API」
2. `Project URL`を`NEXT_PUBLIC_SUPABASE_URL`に設定
3. `anon public`キーを`NEXT_PUBLIC_SUPABASE_ANON_KEY`に設定
4. `service_role`キーを`SUPABASE_SERVICE_ROLE_KEY`に設定

## 🌐 本番環境（Vercel）

Vercelの環境変数設定で以下を追加：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Slack OAuth（ユーザー別接続）
SLACK_CLIENT_ID=your-slack-client-id
NEXT_PUBLIC_SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_SIGNING_SECRET=your-slack-signing-secret

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## 📋 環境変数詳細

### 必須設定

| 変数名 | 説明 | 取得方法 |
|--------|------|----------|
| `OPENAI_API_KEY` | タイトル生成機能で必須 | [OpenAI Platform](https://platform.openai.com/account/api-keys) |
| `NEXT_PUBLIC_SUPABASE_URL` | データベース接続用 | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 認証用 | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバーサイドAPI用 | Supabase Dashboard → Settings → API |

### Slack連携（オプション）

| 変数名 | 説明 | 取得方法 |
|--------|------|----------|
| `SLACK_CLIENT_ID` | Slack OAuth認証用（Client ID） | [Slack API](https://api.slack.com/apps) → Basic Information |
| `NEXT_PUBLIC_SLACK_CLIENT_ID` | クライアントサイド用（同じ値） | 上記と同じ |
| `SLACK_CLIENT_SECRET` | Slack OAuth認証用（Client Secret） | [Slack API](https://api.slack.com/apps) → Basic Information |
| `SLACK_SIGNING_SECRET` | Slack Event API署名検証用（必須） | [Slack API](https://api.slack.com/apps) → Basic Information |

### ngrok開発用（オプション）

| 変数名 | 説明 | 注意 |
|--------|------|------|
| `NGROK_AUTHTOKEN` | ngrok認証トークン | `ngrok config add-authtoken`での設定を推奨 |
| `NGROK_SUBDOMAIN` | カスタムサブドメイン | 有料プランのみ |

## 🔐 セキュリティ注意事項

### 機密情報の取り扱い

- **環境変数**: APIキーは必ず環境変数で管理
- **コミット禁止**: `.env` ファイルのコミット厳禁
- **ログ出力**: APIキーやパスワードのログ出力禁止
- **例外ファイル**: `.env.*.example` はプレースホルダーのみ

### 設定の確認方法

```bash
# 現在の環境変数を確認（値は表示されない）
echo "OPENAI_API_KEY is set: $([[ -n "$OPENAI_API_KEY" ]] && echo "YES" || echo "NO")"
echo "SUPABASE_URL is set: $([[ -n "$NEXT_PUBLIC_SUPABASE_URL" ]] && echo "YES" || echo "NO")"
```

## 🔄 環境の切り替え

### ローカル開発 → 本番DB開発

```bash
# 本番環境設定に切り替え
cp .env.production.example .env.local
# .env.localを編集して本番データベース情報を設定
```

### 本番DB開発 → ローカル開発

```bash
# ローカル環境設定に切り替え
cp .env.local.example .env.local
# .env.localを編集してSupabaseキーを設定
```

## 🛠️ よくある設定エラー

### Supabaseキーが見つからない場合

```bash
# ローカルSupabaseが起動していない
npm run db:start

# キーを再取得
npm run db:status
```

### Slack連携エラー

1. **Client IDが正しくない**
   - Slack APIダッシュボードで「Basic Information」を確認

2. **Signing Secretが設定されていない**
   - Event API使用時は必須

3. **Redirect URLが間違っている**
   - 開発環境: `http://localhost:3000/api/slack/auth`
   - 本番環境: `https://your-app.vercel.app/api/slack/auth`

### ngrok認証エラー

```bash
# 永続的な認証設定（推奨）
ngrok config add-authtoken YOUR_AUTHTOKEN

# 一時的な設定（非推奨）
export NGROK_AUTHTOKEN=your-token
```

## 📚 関連ドキュメント

- [セットアップガイド](./SETUP.md) - 基本的なセットアップ手順
- [トラブルシューティング](./TROUBLESHOOTING.md) - よくある問題の解決方法
- [Slack連携設定](../features/SLACK.md) - Slack連携の詳細設定