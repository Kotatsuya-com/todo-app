# ✅ Slack連携 TODO管理アプリ

Next.js + Supabase + OpenAI APIを使用したTODO管理アプリケーションです。

## ✨ 主な機能

- ユーザー認証（Supabase Auth）
- タスクの作成・編集・削除・完了
- Slack URLからのメッセージ取得とタスク化
- **Slackリアクション自動タスク化**（特定の絵文字でリアクションするとタスクが自動作成）
- OpenAI APIを使用したタスクタイトルの自動生成
- アイゼンハワーマトリクス（重要度×緊急度）による四象限表示
- タスクの重要度比較機能
- 完了レポート機能
- レスポンシブデザイン（モバイル対応）

## 🚀 セットアップガイド

このアプリケーションは3つの環境でセットアップできます。開発スタイルに応じて適切な方法を選択してください。

### 📋 前提条件のチェックリスト

- [ ] Node.js 18以上がインストール済み
- [ ] npmまたはyarnが使用可能
- [ ] OpenAIアカウントとAPIキー保有
- [ ] Supabaseアカウント保有
- [ ] Docker Desktop（ローカル開発の場合）
- [ ] Slack Bot Token（Slack連携機能を使用する場合）

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

`.env.local`を編集：

```env
# ローカルSupabase（デフォルト設定）
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# OpenAI（必須）
OPENAI_API_KEY=your-openai-api-key

# Slack（オプション）
SLACK_BOT_TOKEN=your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret

# ngrok（Slack Webhook開発用、オプション）
NGROK_AUTHTOKEN=your-ngrok-authtoken-here
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

### ステップ4: Slack Webhook開発（オプション）

Slackリアクション機能の開発をする場合：

```bash
# ngrokを使ったWebhook開発環境
npm run dev:webhook
```

起動後に表示されるWebhook URLをSlack App設定に登録してください。

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

`.env.local`を編集：

```env
# Supabase（本番クラウド）
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI（必須）
OPENAI_API_KEY=your-openai-api-key

# Slack（オプション）
SLACK_BOT_TOKEN=your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Supabase情報の取得方法

1. Supabaseダッシュボードで「Settings」→「API」
2. `Project URL`を`NEXT_PUBLIC_SUPABASE_URL`に設定
3. `anon public`キーを`NEXT_PUBLIC_SUPABASE_ANON_KEY`に設定
4. `service_role`キーを`SUPABASE_SERVICE_ROLE_KEY`に設定

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
4. 環境変数を設定（以下参照）
5. 「Deploy」をクリック

#### Vercel環境変数設定

Vercelの環境変数設定で以下を追加：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Slack（オプション）
SLACK_BOT_TOKEN=your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

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

2. **最初のTODO作成**
   - ログイン後、右上の「＋新規タスク」をクリック
   - タスクの内容を入力（SlackURLも入力可能）
   - 緊急度を選択（期限が自動設定される）
   - 「保存」をクリック

3. **機能を試す**
   - ダッシュボードで四象限表示とリスト表示を切り替え
   - 優先度比較タブで2つのタスクを比較
   - タスクを完了してレポートタブで確認

## 📱 使い方

### TODO作成

1. 右上の「＋新規タスク」ボタンをクリック
2. 本文を入力（SlackのURLなども含められます）
3. 緊急度を選択（自動で期限が設定されます）
4. 必要に応じて「見出し生成」ボタンでAIによるタイトル生成
5. 「保存」をクリック

### Slack連携機能

1. タスク作成モーダルの本文欄にSlackメッセージのURLを入力
2. SlackURLが検出されると「メッセージ取得」ボタンが表示
3. ボタンをクリックしてSlackからメッセージ内容を自動取得
4. 取得されたメッセージ内容がプレビュー表示される
5. タスク保存時に、Slackメッセージの内容がタスクの本文として使用される

**注意**: Slack連携機能を使用するには、事前にSlack Bot Tokenの設定が必要です。

### 優先度比較

1. 「優先度比較」タブをクリック
2. 表示される2つのタスクのうち、より重要な方を選択
3. 必要な回数だけ比較を行い、「ここで終了」をクリック
4. 比較結果に基づいて重要度スコアが更新されます

### レポート確認

1. 「レポート」タブをクリック
2. 期間を選択（日/週/月）
3. 完了タスクの統計とグラフを確認

## 📝 Slackリアクション自動タスク化

### 概要
特定の絵文字でSlackメッセージにリアクションすると、そのメッセージが自動的にタスクとして追加される機能です。

### Slack Bot Token を取得

1. [Slack API](https://api.slack.com/apps)にアクセス
2. 「Create New App」をクリック→「From scratch」を選択
3. アプリ名とワークスペースを選択して作成
4. 左メニューの「OAuth & Permissions」をクリック
5. 「Scopes」セクションで以下の権限を追加：
   - `reactions:read` - リアクション情報の取得
   - `channels:history` - チャンネルメッセージの取得
   - `groups:history` - プライベートチャンネルメッセージの取得
   - `im:history` - DMメッセージの取得
6. **Event Subscriptions**を有効化
7. **Request URL**を設定：`https://your-domain.com/api/slack/events`
8. **Subscribe to bot events**で `reaction_added` を追加
9. 「Install to Workspace」をクリックしてアプリをインストール
10. 表示される「Bot User OAuth Token」を`SLACK_BOT_TOKEN`に設定

### 環境変数設定
```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
```

### アプリ内設定
1. アプリの「設定」ページでSlack User IDを設定
2. Slack User IDの確認方法：
   - Slackで自分のプロフィールを開く
   - 「その他」→「メンバーIDをコピー」

### 対応絵文字と緊急度

| 絵文字 | 名前 | 緊急度 | 期限 |
|--------|------|--------|------|
| 📝 | `:memo:` | 今日中 | 今日 |
| 📋 | `:clipboard:` | 今日中 | 今日 |
| ✏️ | `:pencil:` | 明日 | 明日 |
| 🗒️ | `:spiral_note_pad:` | それより後 | なし |
| 📄 | `:page_with_curl:` | それより後 | なし |

### 動作フロー
1. ユーザーがSlackメッセージに対象絵文字でリアクション
2. アプリがEvent APIでイベントを受信
3. メッセージ内容とURLを自動取得
4. 絵文字に応じた緊急度でタスクを作成
5. ダッシュボードに自動表示

## 🔧 ローカル開発でのSlack Webhook設定

### ngrokセットアップ

#### 1. ngrokアカウント作成（推奨）
```bash
# 1. https://ngrok.com でアカウント作成
# 2. 認証トークンを取得
# 3. .env.localに追加
NGROK_AUTHTOKEN=your-ngrok-authtoken-here
```

#### 2. Webhook開発環境の起動
```bash
npm run dev:webhook
```

起動すると以下のような出力が表示されます：
```
✅ Development environment ready!
📍 Local URL: http://localhost:3000
🌐 Public URL: https://abc123.ngrok.io
🔗 Slack Webhook URL: https://abc123.ngrok.io/api/slack/events
```

#### 3. Slack App設定の更新

1. [Slack API](https://api.slack.com/apps)でアプリを選択
2. **Event Subscriptions**に移動
3. **Request URL**に表示されたWebhook URLを設定：
   ```
   https://abc123.ngrok.io/api/slack/events
   ```
4. **Subscribe to bot events**で`reaction_added`が追加されているか確認
5. **Save Changes**をクリック

#### 4. 開発・テストフロー

1. `npm run dev:webhook`で開発環境を起動
2. Slack App設定でWebhook URLを更新
3. Slackでメッセージに📝絵文字でリアクション
4. 自動的にタスクが作成される

#### 5. 注意事項

- **ngrokのURL変更**: `npm run dev:webhook`を再起動するたびにURLが変わります
- **Slack設定更新**: 新しいURLが表示されたらSlack App設定を更新してください
- **認証トークン**: ngrokアカウントなしでも使用可能ですが、セッション制限があります

## 🛠️ データベース管理（Supabase CLI）

### npm scriptsによる簡単操作

```bash
# 開発環境
npm run dev           # ローカル開発環境（Supabase + Next.js）
npm run dev:webhook   # Webhook開発環境（ngrok + Supabase + Next.js）
npm run dev:quick     # 本番DB接続での開発（クイック起動）
npm run dev:start     # Next.jsのみ起動（手動DB起動時）

# データベース操作
npm run db:start      # ローカルSupabaseを起動
npm run db:stop       # ローカルSupabaseを停止
npm run db:status     # ローカルSupabaseの状態確認
npm run db:studio     # Supabase Studioを開く

# マイグレーション
npm run migrate:new [name]  # 新しいマイグレーションファイルを作成
npm run db:migrate          # リモートDBにマイグレーションを適用
npm run db:reset            # ローカルDBをリセット

# スキーマ管理
npm run db:pull       # リモートDBからスキーマを取得
npm run db:diff       # ローカルとリモートの差分を確認
npm run types:generate # TypeScript型定義を生成

# ngrok統合
npm run ngrok:start   # ngrokを単体で起動
npm run webhook:test  # Slack Webhook URLの表示
```

### 開発環境詳細

#### ログ管理
- **ログファイル**: `logs/dev.log`に全開発環境のログを出力
- **ログローテーション**: 起動時に過去ログをアーカイブ
- **エラー監視**: Supabase、ngrok、Next.jsのエラーを統合監視

#### ngrok統合詳細
- **スクリプト**: `scripts/dev-with-webhook.js`, `scripts/start-ngrok.js`
- **認証**: `.env.local`の`NGROK_AUTHTOKEN`で認証（推奨）
- **カスタムサブドメイン**: 有料プランで`NGROK_SUBDOMAIN`設定可能
- **URL表示**: 起動時に自動でWebhook URLを表示
- **Hot Reload**: Next.jsとngrokの同時Hot Reload対応

### マイグレーション作業フロー

#### 1. 新しいマイグレーション作成
```bash
npm run migrate:new add_new_column
```

#### 2. SQLファイルを編集
`supabase/migrations/` にある新しいファイルを編集

#### 3. ローカルでテスト
```bash
npm run db:reset  # ローカルDBをリセットしてマイグレーション実行
```

#### 4. リモートに適用
```bash
npm run db:migrate
```

#### 5. 型定義更新
```bash
npm run types:generate
```



## 🛠️ 技術スタック

| 項目      | 使用技術                                        |
| ------- | ------------------------------------------- |
| フロントエンド | Next.js 14（App Router, TypeScript）             |
| UI      | Tailwind CSS + Radix UI                   |
| 状態管理    | Zustand                                   |
| バックエンド  | Supabase（PostgreSQL + Auth + Edge Function） |
| 認証      | @supabase/ssr（2024年推奨パッケージ）              |
| ホスティング  | Vercel                                      |
| LLM連携   | OpenAI API（/api/generate-title経由）           |
| Slack連携 | Slack Web API（Bot Token使用、チャンネル・スレッド対応）  |

## 📋 詳細機能仕様

### コア機能一覧

| 機能               | 内容                                 |
| ---------------- | ---------------------------------- |
| ✅ 任意の期限日設定       | TODOに「期限日（date型、時間なし）」を設定可能        |
| 🔥 緊急度の期限日自動変換   | 緊急度選択時に自動で期限日に変換（今すぐ/今日→本日、明日→明日、それより後→期限なし） |
| ⏰ 期限切れTODO操作     | 期限切れのTODOだけを表示し、ワンタップで期限更新または削除できる |
| 🧭 タブ型UI         | ダッシュボード / 比較 / レポートをSPA内で即時切替可能    |
| 🪟 TODO作成ポップアップ  | 作成画面はモーダルで表示（ダッシュボード上に出現）          |
| ⚖️ 比較の途中完了反映     | 比較を全てやりきらずとも、そこまでの優先度を使って並べ替えに反映   |
| 🔗 Slack連携        | SlackURL（チャンネル・DM・スレッド）からメッセージ内容を取得してタスク化 |
| 📱 モバイル対応       | ハンバーガーメニューと縦表示レイアウト |
| 🤖 Slackリアクション自動タスク化 | 特定の絵文字でリアクションするとタスクが自動作成 |

### 画面構成とUI仕様

#### グローバル構成（全ページ共通）

* ナビゲーションタブ（上部固定）：
  * 📋 ダッシュボード（TODO一覧）
  * ⚖️ 優先度比較
  * 📊 レポート
  * ⚙️ 設定
* 右上に「＋新規タスク」ボタン → モーダルでタスク作成画面表示
* モバイル時はハンバーガーメニューに収納

#### 1. 📋 ダッシュボード画面（`/`）

**主な要素**
* 表示切替トグル：
  * 四象限マトリクスビュー（緊急度×重要度）
  * フラットなリストビュー
* TODOカード：
  * 見出し（LLM生成 or 編集）
  * 本文（Slackリンクや任意URLが自動リンク化）
  * 緊急度バッジ・期限日表示
  * 操作：✅ 完了、✏️ 編集、🗑️ 削除
* 期限切れフィルター（toggle）：
  * `期限 < 今日` のTODOを抽出
  * ワンタップで「期限延長」or「削除」選択可能

#### 2. ⚖️ タスク比較画面（`/compare`）

**主な要素**
* 比較対象 TODO カード × 2（本文 / 期限 / 見出し）
* アクション：
  * ⬅️ 左が重要 ／ 右が重要 ➡️
  * 🔁 スキップ ／ ✅ ここで終了
* 終了時点までの重要度スコアで仮ソートが反映

#### 3. 📊 レポート画面（`/report`）

**主な要素**
* 時間単位切替：📅 日 / 週 / 月
* グラフ表示（四象限ごとの完了件数）：
  * Recharts使用（PieChart, BarChart）
  * 四象限別の色分け表示
* 過去の完了タスク一覧（完了日時・タイトル・象限）
* 完了タスクの推移チャート（時系列）
* 日本語ロケール対応（date-fns使用）

**データ取得**
* `completion_log`テーブルからの四象限別集計
* リアルタイムでの統計更新
* 期間フィルタリング機能

#### 4. ➕ タスク作成モーダル（ポップアップ）

**主な要素**
* 📄 本文入力（複数行、任意のURLを含めてOK）
* 🔗 Slack連携（SlackURLを検出し、メッセージ内容を自動取得）
* 🧠 LLM見出し生成ボタン（内容から一言タイトル）
* 🔥 緊急度選択（→ 自動で期限日補完）
* 📅 期限日（カレンダーで任意日選択も可能）
* 💾 保存ボタン（作成 → ダッシュボードに反映）

**Slack連携機能**
* 本文入力欄にSlackのメッセージURLを入力すると自動検出
* 対応URL形式：
  - チャンネルメッセージ: `https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP`
  - スレッド内メッセージ: `https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP?thread_ts=THREAD_TS`
* 「メッセージ取得」ボタンでSlack APIからメッセージ内容を取得
* 取得したメッセージ内容をプレビュー表示
* 保存時は取得したSlackメッセージ内容をタスクの本文として使用
* 必要な権限: `channels:history`, `groups:history`, `im:history`, `mpim:history`

### 画面遷移仕様（SPA内）

```
[ / ] ──┬── 📋 ダッシュボード（初期表示）
        ├── ⚖️ 比較画面（/compare）
        ├── 📊 レポート画面（/report）
        └── ⚙️ 設定画面（/settings）

[ ＋ ] → タスク作成モーダル（全画面共通、オーバーレイ表示）
```

## 🗃️ データベース設計（Supabase PostgreSQL）

### 🔐 users テーブル

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  avatar_url TEXT,
  slack_user_id TEXT UNIQUE,  -- Slack連携用ユーザーID
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 📋 todos テーブル

```sql
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT,
  body TEXT,
  deadline DATE,  -- 期限日（時間なし）、緊急度から自動変換
  importance_score REAL DEFAULT 0.0,
  status TEXT CHECK (status IN ('open', 'done')) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

**⚠️ 重要**: `urgency`フィールドは削除済み。緊急度はUI選択時に`deadline`に自動変換されるためDBに保存しない。

### ⚖️ comparisons テーブル

```sql
CREATE TABLE comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  winner_id UUID REFERENCES todos(id),
  loser_id UUID REFERENCES todos(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 📊 completion_log テーブル

```sql
CREATE TABLE completion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID REFERENCES todos(id),
  quadrant TEXT CHECK (
    quadrant IN (
      'urgent_important',
      'not_urgent_important', 
      'urgent_not_important',
      'not_urgent_not_important'
    )
  ),
  completed_at TIMESTAMP
);
```

### セキュリティ（Row Level Security）

- 全テーブルでRLS（Row Level Security）を有効化
- ユーザーは自分のデータのみアクセス可能
- Supabase Authとの連携により自動的にユーザー分離

### データベーストリガー

#### 新規ユーザー自動作成
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, display_name)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### データ整合性
- **カスケード削除**: todoStore.tsで関連データ（comparisons, completion_log）を手動削除
- **外部キー制約**: 削除時の整合性を保証
- **ユーザー分離**: 全テーブルでRLSによる完全な分離

## 🧠 技術仕様・ルール

| 項目         | 内容                                                    |
| ---------- | ----------------------------------------------------- |
| 緊急度 → 期限日変換 | now/today: 今日 ／ tomorrow: 明日 ／ later: null（期限なし） |
| 期限切れ抽出     | `WHERE deadline < CURRENT_DATE AND status = 'open'`   |
| LLM連携      | `/api/generate-title` 経由でOpenAI API呼び出し              |
| Slack連携    | `/api/slack` 経由でSlack Web API呼び出し                    |
| 並び順ロジック    | `importance_score DESC`, `deadline ASC`               |
| 比較の途中反映    | Eloスコアの暫定計算でTODOの重要度ソートに反映                            |
| 緊急判定      | 期限日ベース: `deadline <= CURRENT_DATE` で緊急判定             |
| 四象限分析     | 緊急度（期限日ベース） × 重要度（importance_score > 0.5）        |

### 🔌 API詳細仕様

#### `/api/generate-title`
- **使用モデル**: OpenAI GPT-3.5-turbo
- **システムプロンプト**: 「15文字以内で、タスクの本質を表する見出しを生成」
- **パラメータ**: `temperature: 0.7`, `max_tokens: 50`
- **入力**: タスクの本文（Slackメッセージまたは直接入力）
- **出力**: JSON形式の生成されたタイトル

#### `/api/slack`
- **対応URL形式**: 
  - チャンネルメッセージ: `https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP`
  - スレッドメッセージ: `https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP?thread_ts=THREAD_TS`
- **タイムスタンプ変換**: URLの`p123456789012`を`123456.789012`形式に変換
- **API使用**: スレッドは`conversations.replies`、通常は`conversations.history`
- **取得情報**: メッセージテキスト、ユーザー名、投稿時刻

#### `/api/slack/events`
- **対象絵文字**: `memo`(📝), `clipboard`(📋), `pencil`(✏️), `spiral_note_pad`(🗒️), `page_with_curl`(📄)
- **緊急度マッピング**: 
  - `memo`, `clipboard` → `today`（今日）
  - `pencil` → `tomorrow`（明日）
  - `spiral_note_pad`, `page_with_curl` → `later`（それより後）
- **非同期処理**: 3秒制限のため即座にレスポンス返却後、バックグラウンドでタスク作成
- **URL構築**: `https://slack.com/archives/${channel}/p${timestamp.replace('.', '')}`

### ⚖️ Eloレーティングシステム詳細

#### アルゴリズム
- **K-factor**: 32（変動幅の調整値）
- **期待スコア計算**: `expectedScore = 1 / (1 + Math.pow(10, (loserScore - winnerScore) / 0.4))`
- **スコア更新**: 勝者・敗者双方のスコアを同時更新
- **正規化**: 全スコアを0-1の範囲に正規化して重要度として使用

#### 比較機能
- **ペア生成**: 全組み合わせをランダムシャッフル
- **スキップ機能**: 現在のペアを最後に回す
- **途中終了**: 「ここで終了」で部分的な比較結果も即座に反映

### 🔐 認証・セキュリティ詳細

#### ミドルウェア（middleware.ts）
- **保護ルート**: `/compare`, `/report`（設定画面は保護なし）
- **認証方式**: Supabase SSR Cookieベース認証
- **Cookie管理**: リクエスト・レスポンス両方のCookieを適切に更新
- **エラーハンドリング**: Cookie関連エラー時も処理続行

#### Row Level Security（RLS）
- **適用テーブル**: users, todos, comparisons, completion_log（全テーブル）
- **基本ポリシー**: `auth.uid() = user_id`による完全なユーザー分離
- **completion_log**: JOINを使用した複雑なポリシー（todo経由でuser_id確認）

### 🎨 UI/UX実装詳細

#### 四象限表示
- **判定ロジック**: 
  - 緊急: `deadline <= CURRENT_DATE`
  - 重要: `importance_score > 0.5`
- **モバイル対応**: デスクトップは2x2グリッド、モバイルは縦1列
- **カード操作**: 編集（クリック）、完了（チェック）、削除（ゴミ箱）

#### フォーム機能
- **SlackURL自動検出**: 正規表現による即座の検出とボタン表示
- **メッセージプレビュー**: 取得後に青色ボックスで内容確認
- **見出し生成**: Slackメッセージまたはフリーテキストから自動生成
- **期限日自動設定**: 緊急度選択時に`getDeadlineFromUrgency()`で即座に変換

#### ユーティリティ機能
- **URLリンク化**: `linkifyText()`でHTTPリンクを自動リンク化（XSS対策済み）
- **期限表示**: 「今日」「明日」「X日後」「X日遅れ」の日本語表示
- **期限切れ判定**: `isOverdue()`で視覚的な期限切れ表示

## 📁 プロジェクト構造

```
todo-app/
├── app/                          # Next.js App Router
│   ├── api/                      # APIルート
│   │   ├── generate-title/       # LLM見出し生成API
│   │   │   └── route.ts
│   │   └── slack/                # Slack連携API
│   │       ├── route.ts
│   │       └── events/           # Slack Event API
│   │           └── route.ts
│   ├── compare/                  # 優先度比較画面
│   │   └── page.tsx
│   ├── report/                   # レポート画面
│   │   └── page.tsx
│   ├── settings/                 # 設定画面
│   │   └── page.tsx
│   ├── globals.css              # グローバルCSS
│   ├── layout.tsx               # ルートレイアウト
│   └── page.tsx                 # ダッシュボード（ホーム）
│
├── components/                   # Reactコンポーネント
│   ├── auth/                    # 認証関連
│   │   └── AuthForm.tsx         # ログイン/サインアップフォーム
│   ├── layout/                  # レイアウトコンポーネント
│   │   ├── Navigation.tsx       # ナビゲーションバー
│   │   └── MobileMenu.tsx       # モバイルメニュー
│   ├── providers/               # コンテキストプロバイダー
│   │   └── AuthProvider.tsx     # 認証プロバイダー
│   ├── todo/                    # TODO関連コンポーネント
│   │   ├── CreateTodoModal.tsx  # TODO作成モーダル
│   │   ├── EditTodoModal.tsx    # TODO編集モーダル
│   │   ├── TodoCard.tsx         # TODOカード
│   │   └── TodoForm.tsx         # TODO共通フォーム
│   └── ui/                      # 汎用UIコンポーネント
│       └── Button.tsx           # ボタンコンポーネント
│
├── lib/                         # ライブラリ・ユーティリティ
│   ├── supabase.ts             # Supabaseクライアント設定
│   └── utils.ts                # ユーティリティ関数
│
├── scripts/                     # 開発スクリプト
│   ├── start-ngrok.js          # ngrok起動スクリプト
│   └── dev-with-webhook.js     # Webhook開発環境起動
│
├── store/                       # 状態管理
│   └── todoStore.ts            # Zustand store
│
├── supabase/                    # Supabase設定
│   ├── config.toml             # Supabase設定
│   ├── migrations/             # DBマイグレーション
│   └── seed.sql                # 初期データ
│
├── types/                       # TypeScript型定義
│   └── index.ts                # 共通型定義
│
├── .env.local.example          # ローカル環境変数テンプレート
├── .env.production.example     # 本番環境変数テンプレート
├── .gitignore                  # Git除外設定
├── middleware.ts               # Next.js middleware（認証保護）
├── next.config.js              # Next.js設定
├── package.json                # 依存関係
├── postcss.config.js           # PostCSS設定
├── tailwind.config.js          # Tailwind CSS設定
└── tsconfig.json               # TypeScript設定
```

### 主要な機能モジュール

#### 認証システム
- `middleware.ts`: ルート保護
- `components/auth/AuthForm.tsx`: ログイン/サインアップUI
- `components/providers/AuthProvider.tsx`: 認証状態管理

#### TODO管理
- `store/todoStore.ts`: TODO状態管理（CRUD操作）
- `components/todo/TodoCard.tsx`: TODO表示・操作
- `components/todo/TodoForm.tsx`: TODO共通フォーム
- `components/todo/CreateTodoModal.tsx`: TODO作成
- `components/todo/EditTodoModal.tsx`: TODO編集

#### 優先度管理
- `app/compare/page.tsx`: 比較インターフェース
- Eloレーティングシステムによる重要度スコア計算

#### レポート機能
- `app/report/page.tsx`: 完了タスクの統計表示
- 四象限分析とグラフ表示

#### Slack連携
- `app/api/slack/route.ts`: Slack API連携
- `app/api/slack/events/route.ts`: Slack Event API（リアクション処理）
- SlackURLからメッセージ内容を自動取得

#### 設定管理
- `app/settings/page.tsx`: アプリ設定画面
- Slack User ID設定とアカウント情報管理

#### 型定義・ユーティリティ
- `types/index.ts`: 共通型定義
  - `Urgency`: `'now' | 'today' | 'tomorrow' | 'later'`
  - `Quadrant`: 四象限の厳密な型定義
  - `TodoWithQuadrant`: 拡張Todo型
- `lib/utils.ts`: ユーティリティ関数
  - `linkifyText()`: URL自動リンク化（XSS対策）
  - `formatDeadline()`: 期限の日本語表示
  - `isOverdue()`: 期限切れ判定
  - `getQuadrant()`: 四象限判定

### データフロー

1. **認証フロー**
   - Supabase Auth → AuthProvider → 各コンポーネント

2. **TODO操作フロー**
   - UI操作 → Zustand Store → Supabase DB → UI更新

3. **LLM連携フロー**
   - TODO本文 → API Route → OpenAI API → 見出し生成

4. **Slack連携フロー**
   - SlackURL → API Route → Slack Web API → メッセージ取得
   - Slackリアクション → Event API → 自動タスク作成

## 🔧 トラブルシューティング

### Supabase接続エラー
- 環境変数が正しく設定されているか確認
- Supabaseプロジェクトがアクティブか確認

### OpenAI APIエラー
- APIキーが正しいか確認
- APIの利用制限に達していないか確認

### Slack連携エラー
- `SLACK_BOT_TOKEN`が正しく設定されているか確認
- Slackアプリに必要な権限が付与されているか確認
- SlackURLの形式が正しいか確認（`https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP`）

### ビルドエラー
```bash
# 依存関係をクリーンインストール
rm -rf node_modules package-lock.json
npm install
```

### ngrok関連
- **ngrok認証エラー**: `NGROK_AUTHTOKEN`を`.env.local`に設定
- **トンネル接続失敗**: Docker Desktopが起動しているか確認
- **URL変更頻度**: 有料プランで固定サブドメインを使用可能

### Slack Webhook
- **Challenge失敗**: URLが正しく設定されているか確認
- **イベント未受信**: Bot権限とEvent Subscriptionの設定を確認
- **リアクション無効**: User IDとBotトークンが正しく設定されているか確認

### サポート

問題が解決しない場合は、以下を確認してください：
- Node.jsのバージョン: `node --version`
- npmのバージョン: `npm --version`
- `.env.local`の設定内容（APIキーは隠して）
- Supabaseプロジェクトの状態: `npm run db:status`

## 🔒 セキュリティ

### 実装されているセキュリティ対策

- **Supabase RLS**: Row Level Securityによる完全なユーザーデータ分離
- **環境変数管理**: 機密情報の適切な管理とサーバーサイド処理
- **API保護**: 全API RouteでSupabase認証チェック
- **型安全性**: 厳密なTypeScript型定義による実行時エラー防止
- **XSS対策**: `linkifyText()`でrel="noopener noreferrer"付きリンク生成
- **CSRF対策**: Supabase SSR Cookie管理による保護
- **認証Cookie**: セキュアなCookie管理とミドルウェア保護

### セキュリティ設定
- **保護ルート**: `/compare`, `/report`は認証必須
- **公開ルート**: `/settings`（認証後にリダイレクト）
- **API認証**: 全APIエンドポイントでユーザー認証チェック

## 🎛️ 設定とカスタマイズ

### 環境変数詳細

#### 必須設定
- `OPENAI_API_KEY`: タイトル生成機能で必須
- `NEXT_PUBLIC_SUPABASE_URL`: データベース接続用
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 認証用
- `SUPABASE_SERVICE_ROLE_KEY`: サーバーサイドAPI用

#### オプション設定
- `SLACK_BOT_TOKEN`: Slack連携機能用
- `SLACK_SIGNING_SECRET`: Slack Event API検証用
- `NGROK_AUTHTOKEN`: ローカルWebhook開発用
- `NGROK_SUBDOMAIN`: カスタムサブドメイン（有料）

### アプリ内設定
- **Slack User ID**: Slackリアクション機能で自分のリアクションを識別
- **表示名**: ユーザープロフィール表示用
- **表示モード**: 四象限/リスト表示の切り替え保存
