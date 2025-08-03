# セットアップガイド

このアプリケーションは3つの環境でセットアップできます。開発スタイルに応じて適切な方法を選択してください。

## 📋 前提条件のチェックリスト

- [ ] Node.js 18以上がインストール済み
- [ ] npmまたはyarnが使用可能
- [ ] OpenAIアカウントとAPIキー保有
- [ ] Supabaseアカウント保有
- [ ] Docker Desktop（ローカル開発の場合）
- [ ] Slack OAuth設定（Slack連携機能を使用する場合）

---

## 🏠 1. ローカル開発環境セットアップ（推奨）

完全にローカルで動作する開発環境です。Supabaseもローカルで実行されるため、本番データに影響しません。

### ステップ1: プロジェクトのセットアップ

```bash
# 1. リポジトリのクローン
git clone <repository-url>
cd todo-app

# 2. 依存関係をインストール
npm install

# 3. ローカル環境変数を設定
cp .env.local.example .env.local
```

### ステップ2: 環境変数の設定

`.env.local`を編集してください。詳細は[環境変数設定ガイド](./ENVIRONMENT.md)を参照してください。

**⚠️ 重要**: Slack Event API機能を使用する場合、Service Role Keyの設定が必須です。

```bash
# 1. ローカルSupabaseのキーを取得
npm run db:status

# 2. 表示された anon key と service_role key を .env.local に設定
```

### ステップ3: アプリケーションの起動

```bash
# Docker Desktopを起動してから実行
npm run dev
```

このコマンドで以下が自動実行されます：
- ローカルSupabaseの起動
- データベースマイグレーションの実行
- Next.js開発サーバーの起動

**📧 ローカル環境でのメール認証について**
- ローカル開発環境では、メール認証がスキップされます（`supabase/config.toml`で設定済み）
- 新規アカウント作成時に確認メールなしで即座にサインインできます
- メール送信のテストは `http://localhost:54324` (Inbucket) で確認可能

### ステップ4: Slack Webhook開発（オプション）

Slackリアクション機能の開発をする場合、まずngrokをインストールしてください：

#### ngrokのインストール

**方法1: Homebrew（macOS）**
```bash
brew install ngrok/ngrok/ngrok
```

**方法2: 公式サイトからダウンロード**
1. [ngrok公式サイト](https://ngrok.com/download)からダウンロード
2. ダウンロードしたファイルを解凍し、PATHの通った場所に配置

#### ngrok認証設定（必須）

**推奨方法: ngrok config（永続設定）**
```bash
# ngrokアカウント作成後、認証トークンを設定
ngrok config add-authtoken YOUR_AUTHTOKEN
```

**代替方法: 環境変数（一時設定）**
```env
# .env.localに設定（注意: config設定が優先される）
NGROK_AUTHTOKEN=your-ngrok-authtoken-here
```

**⚠️ 重要**: 
- `ngrok config add-authtoken`での設定が最も確実です
- 環境変数のみの設定では認証エラーが発生する場合があります
- 既に`ngrok config`で設定済みの場合、環境変数は無視される場合があります

#### Webhook開発環境の起動

```bash
# ngrokを使ったWebhook開発環境
npm run dev:webhook
```

起動後に表示されるWebhook URLをSlack App設定に登録してください。

#### ngrok不要での開発

Slackリアクション機能を使わない場合、通常のローカル開発環境で十分です：

```bash
# ngrok不要の通常開発
npm run dev
```

この場合、以下の機能は使用できません：
- Slackリアクション自動タスク化
- Slack Event API

その他の機能（Slack URL取得、タスク作成、AI見出し生成等）は正常に動作します。

---

## ☁️ 2. 本番データベース接続での開発環境

Supabaseクラウドのデータベースに接続して開発する場合です。本番データを使用するため注意が必要です。

### ステップ1: Supabaseクラウドプロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. 「New project」をクリック
3. プロジェクト名とパスワードを設定
4. 地域を選択（東京推奨）して作成

### ステップ2: データベースのセットアップ

#### 方法1: マイグレーション（推奨）

```bash
# 1. プロジェクトをリンク
npx supabase link --project-ref YOUR_PROJECT_REF

# 2. マイグレーションを実行
npm run db:migrate
```

#### 方法2: 手動セットアップ

1. Supabaseダッシュボードの「SQL Editor」をクリック
2. `supabase/migrations/20250721085254_initial_schema.sql`の内容を実行
3. Authenticationを有効化し、Email/Passwordプロバイダーを設定

### ステップ3: 本番環境変数の設定

```bash
# 本番環境の設定をベースに作成
cp .env.production.example .env.local
```

`.env.local`を編集してください。詳細は[環境変数設定ガイド](./ENVIRONMENT.md)を参照してください。

### ステップ4: アプリケーションの起動

```bash
# 本番DBに接続して開発
npm run dev:quick
```

---

## 🌐 3. 本番環境セットアップ（Vercel + Supabase）

実際の本番運用環境をセットアップします。

### ステップ1: Supabaseプロジェクトの準備

上記「本番データベース接続での開発環境」と同じ手順でSupabaseプロジェクトを作成・設定してください。

### ステップ2: GitHubリポジトリの準備

```bash
# コードをGitHubにプッシュ
git add .
git commit -m "Initial commit"
git push origin main
```

### ステップ3: Vercelへのデプロイ

1. [Vercel](https://vercel.com)にログイン
2. 「New Project」をクリック
3. GitHubリポジトリを選択してインポート
4. 環境変数を設定（[環境変数設定ガイド](./ENVIRONMENT.md)参照）
5. 「Deploy」をクリック

### ステップ4: Slack App設定の更新（オプション）

Slackリアクション機能を使用する場合：

1. [Slack API](https://api.slack.com/apps)でアプリを選択
2. **Event Subscriptions**の**Request URL**を更新：
   ```
   https://your-app.vercel.app/api/slack/events
   ```
3. **Save Changes**をクリック

---

## 🔄 環境の切り替え

### ローカル → 本番データベース接続
```bash
cp .env.production.example .env.local
# .env.localを編集して本番データベース情報を設定
npm run dev:quick
```

### 本番データベース接続 → ローカル
```bash
cp .env.local.example .env.local
# .env.localを編集してOpenAI API Keyを設定
npm run dev
```

## 📱 初回利用ガイド

どの環境でも、初回利用時は以下の手順で開始できます：

1. **アカウント作成**
   - 「アカウントをお持ちでない方はこちら」をクリック
   - メールアドレスとパスワードを入力
   - 確認メールのリンクをクリック

2. **シードデータの投入（推奨）**
   - テスト用のサンプルデータを投入してUIの動作確認が可能
   - 現在ログインしているユーザーでテストしたい場合：`npm run seed:dev -- --email your@email.com`
   - 詳細は[開発ガイド](../development/DEVELOPMENT.md)を参照

3. **最初のTODO作成**
   - ログイン後、右上の「＋新規タスク」をクリック
   - タスクの内容を入力（SlackURLも入力可能）
   - 緊急度を選択（期限が自動設定される）
   - 「保存」をクリック

4. **機能を試す**
   - ダッシュボードで四象限表示とリスト表示を切り替え
   - 優先度比較タブで2つのタスクを比較
   - タスクを完了してレポートタブで確認

---

## 次のステップ

- [環境変数設定ガイド](./ENVIRONMENT.md) - 詳細な環境変数設定
- [トラブルシューティング](./TROUBLESHOOTING.md) - よくある問題の解決方法
- [開発ガイド](../development/DEVELOPMENT.md) - 開発方法の詳細
- [Slack連携設定](../features/SLACK.md) - Slack連携の詳細設定