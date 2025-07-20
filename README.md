# ✅ Slack連携 TODO管理アプリ

Next.js + Supabase + OpenAI APIを使用したTODO管理アプリケーションです。

## 🚀 クイックスタートガイド

このガイドでは、TODO管理アプリを最速でセットアップして起動する方法を説明します。

### 前提条件のチェックリスト

- [ ] Node.js 18以上がインストールされている
- [ ] npmまたはyarnが使用可能
- [ ] Supabaseアカウントを持っている
- [ ] OpenAIアカウントとAPIキーを持っている
- [ ] Slack Bot Token（Slack連携機能を使用する場合、オプション）
- [ ] Vercelアカウント（デプロイ用）

### ステップ1: プロジェクトのセットアップ（5分）

```bash
# 1. リポジトリのクローン
git clone <repository-url>
cd todo-app

# 2. 依存関係をインストール
npm install
# または
yarn install
```

### ステップ2: Supabaseプロジェクトの作成（10分）

1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. 「New project」をクリック
3. プロジェクト名とパスワードを設定
4. 地域を選択（東京推奨）して作成

#### データベースセットアップ

1. 左メニューの「SQL Editor」をクリック
2. 以下のSQLを実行：

```sql
-- 全てのテーブルとRLSポリシーを一度に作成
-- usersテーブル
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- todosテーブル
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT,
  body TEXT,
  deadline DATE,
  importance_score REAL DEFAULT 0.0,
  status TEXT CHECK (status IN ('open', 'done')) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- comparisonsテーブル
CREATE TABLE comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  winner_id UUID REFERENCES todos(id),
  loser_id UUID REFERENCES todos(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- completion_logテーブル
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

-- RLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE completion_log ENABLE ROW LEVEL SECURITY;

-- RLSポリシーを作成
CREATE POLICY "Users can view own profile" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own todos" ON todos
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own comparisons" ON comparisons
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own completion log" ON completion_log
  FOR ALL USING (
    auth.uid() = (
      SELECT user_id FROM todos WHERE todos.id = completion_log.todo_id
    )
  );

-- トリガー関数：新規ユーザー作成時にusersテーブルにレコードを追加
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, display_name)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーを作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

3. Authenticationを有効化し、Email/Passwordプロバイダーを設定

### ステップ3: 環境変数の設定（3分）

1. `.env.local.example`を`.env.local`にコピー：
```bash
cp .env.local.example .env.local
```

2. `.env.local`を編集し、以下の環境変数を設定：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Slack（オプション）
SLACK_BOT_TOKEN=your-slack-bot-token

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Supabaseの情報を取得
- Supabaseダッシュボードで「Settings」→「API」
- `Project URL`をコピーして`NEXT_PUBLIC_SUPABASE_URL`に設定
- `anon public`キーをコピーして`NEXT_PUBLIC_SUPABASE_ANON_KEY`に設定
- `service_role`キーをコピーして`SUPABASE_SERVICE_ROLE_KEY`に設定

#### OpenAI APIキーを取得
- [OpenAI Platform](https://platform.openai.com/api-keys)でAPIキーを作成
- `OPENAI_API_KEY`に設定

#### Slack Bot Token を取得（オプション）
Slack連携機能を使用する場合のみ設定：

1. [Slack API](https://api.slack.com/apps)にアクセス
2. 「Create New App」をクリック→「From scratch」を選択
3. アプリ名とワークスペースを選択して作成
4. 左メニューの「OAuth & Permissions」をクリック
5. 「Scopes」セクションで以下の権限を追加：
   - `channels:history` - パブリックチャンネルのメッセージを読む
   - `groups:history` - プライベートチャンネルのメッセージを読む
   - `im:history` - ダイレクトメッセージを読む
   - `mpim:history` - グループダイレクトメッセージを読む
6. 「Install to Workspace」をクリックしてアプリをインストール
7. 表示される「Bot User OAuth Token」を`SLACK_BOT_TOKEN`に設定

### ステップ4: アプリケーションの起動（1分）

```bash
npm run dev
# または
yarn dev
```

ブラウザで http://localhost:3000 を開きます。

### ステップ5: 初回利用（3分）

1. **アカウント作成**
   - 「アカウントをお持ちでない方はこちら」をクリック
   - メールアドレスとパスワードを入力
   - 確認メールのリンクをクリック

2. **最初のTODO作成**
   - ログイン後、右上の「＋新規タスク」をクリック
   - タスクの内容を入力（SlackURLも入力可能）
   - Slack連携を設定している場合、SlackURLを入力して「メッセージ取得」可能
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

## 🚀 Vercelへのデプロイ

1. GitHubにリポジトリをプッシュ

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. [Vercel](https://vercel.com)にログイン

3. 「New Project」をクリックし、GitHubリポジトリを選択

4. 環境変数を設定（`.env.local`と同じ値）

5. 「Deploy」をクリック

## 🛠️ 技術スタック

- **フロントエンド**: Next.js 14 (App Router), TypeScript
- **UI**: Tailwind CSS, Radix UI
- **状態管理**: Zustand
- **バックエンド**: Supabase (PostgreSQL, Auth, Edge Functions)
- **AI**: OpenAI API
- **Slack連携**: Slack Web API
- **ホスティング**: Vercel

## 📁 プロジェクト構造

```
todo-app/
├── app/                          # Next.js App Router
│   ├── api/                      # APIルート
│   │   ├── generate-title/       # LLM見出し生成API
│   │   │   └── route.ts
│   │   └── slack/                # Slack連携API
│   │       └── route.ts
│   ├── compare/                  # 優先度比較画面
│   │   └── page.tsx
│   ├── report/                   # レポート画面
│   │   └── page.tsx
│   ├── globals.css              # グローバルCSS
│   ├── layout.tsx               # ルートレイアウト
│   └── page.tsx                 # ダッシュボード（ホーム）
│
├── components/                   # Reactコンポーネント
│   ├── auth/                    # 認証関連
│   │   └── AuthForm.tsx         # ログイン/サインアップフォーム
│   ├── layout/                  # レイアウトコンポーネント
│   │   └── Navigation.tsx       # ナビゲーションバー
│   ├── providers/               # コンテキストプロバイダー
│   │   └── AuthProvider.tsx     # 認証プロバイダー
│   ├── todo/                    # TODO関連コンポーネント
│   │   ├── CreateTodoModal.tsx  # TODO作成モーダル
│   │   └── TodoCard.tsx         # TODOカード
│   └── ui/                      # 汎用UIコンポーネント
│       └── Button.tsx           # ボタンコンポーネント
│
├── lib/                         # ライブラリ・ユーティリティ
│   ├── supabase.ts             # Supabaseクライアント設定
│   └── utils.ts                # ユーティリティ関数
│
├── store/                       # 状態管理
│   └── todoStore.ts            # Zustand store
│
├── types/                       # TypeScript型定義
│   └── index.ts                # 共通型定義
│
├── .env.local.example          # 環境変数テンプレート
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
- `components/todo/CreateTodoModal.tsx`: TODO作成

#### 優先度管理
- `app/compare/page.tsx`: 比較インターフェース
- Eloレーティングシステムによる重要度スコア計算

#### レポート機能
- `app/report/page.tsx`: 完了タスクの統計表示
- 四象限分析とグラフ表示

#### Slack連携
- `app/api/slack/route.ts`: Slack API連携
- SlackURLからメッセージ内容を自動取得

### データフロー

1. **認証フロー**
   - Supabase Auth → AuthProvider → 各コンポーネント

2. **TODO操作フロー**
   - UI操作 → Zustand Store → Supabase DB → UI更新

3. **LLM連携フロー**
   - TODO本文 → API Route → OpenAI API → 見出し生成

4. **Slack連携フロー**
   - SlackURL → API Route → Slack Web API → メッセージ取得

### 開発のヒント

- 新しいコンポーネントは`components/`の適切なサブディレクトリに配置
- API関連の処理は`app/api/`に配置
- 共通の型定義は`types/index.ts`に追加
- ユーティリティ関数は`lib/utils.ts`に追加

## 🔒 セキュリティ

- Supabase RLS（Row Level Security）によるデータ保護
- 環境変数による機密情報の管理
- サーバーサイドでのAPI呼び出し

## 🚀 最新の更新内容

### v1.1.0 - 2024年12月更新

#### 🆕 新機能
- **Slack連携機能**: SlackメッセージのURLからタスクを自動作成
  - チャンネル・DM・スレッド内メッセージに対応
  - メッセージ内容の自動取得とプレビュー表示
  - 適切なBot Token設定で安全にアクセス

#### ⚡ 改善
- **緊急度システムの最適化**: 
  - 緊急度選択を期限日に自動変換（DB構造の簡素化）
  - 今すぐ・今日中 → 本日、明日 → 明日、それより後 → 期限なし
  - 期限ベースの四象限判定に変更

- **認証システムの現代化**:
  - 非推奨の`@supabase/auth-helpers-nextjs`を削除
  - 最新の`@supabase/ssr`パッケージに完全移行
  - セキュアな`getUser()`APIでの認証チェック
  - Cookieパースエラーの根本的解決

- **ナビゲーション修正**:
  - 優先度比較・レポートページへのアクセス問題を解決
  - middlewareの最適化とエラーハンドリング強化

#### 🔧 技術改善
- **データベーススキーマ更新**: `urgency`フィールドを削除し、期限日ベースの管理に統一
- **Supabase認証のベストプラクティス準拠**: 2024年の最新セキュリティ仕様に対応
- **エラーハンドリング強化**: より安定した動作とユーザー体験の向上

#### 🛠️ 設定変更
- **環境変数追加**: 
  ```env
  # Slack連携（オプション）
  SLACK_BOT_TOKEN=your-slack-bot-token
  ```
- **パッケージ更新**: 
  - 削除: `@supabase/auth-helpers-nextjs`
  - 活用: `@supabase/ssr` (既存)

#### 📱 使用方法の更新
1. **Slack連携の使用**:
   - タスク作成時にSlackURLを入力
   - 「メッセージ取得」ボタンでSlackから内容を自動取得
   - プレビュー確認後、タスクとして保存

2. **緊急度の新しい動作**:
   - UI上で緊急度を選択
   - 自動的に適切な期限日に変換されて保存
   - 期限日ベースでの四象限分析

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

### サポート

問題が解決しない場合は、以下を確認してください：
- Node.jsのバージョン: `node --version`
- npmのバージョン: `npm --version`
- `.env.local`の設定内容（APIキーは隠して）
