# ✅ Slack連携 TODO管理アプリ

Next.js + Supabase + OpenAI APIを使用したTODO管理アプリケーションです。

## 🚀 セットアップ手順

### 前提条件

- Node.js 18.0.0以上
- npm または yarn
- Supabaseアカウント
- OpenAI APIキー
- Vercelアカウント（デプロイ用）

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd todo-app
```

### 2. 依存関係のインストール

```bash
npm install
# または
yarn install
```

### 3. Supabaseプロジェクトのセットアップ

1. [Supabase](https://supabase.com)にログインし、新しいプロジェクトを作成

2. SQLエディタで以下のテーブルを作成：

```sql
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
  urgency TEXT CHECK (urgency IN ('now', 'today', 'tomorrow', 'later')),
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

-- RLS（Row Level Security）を有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE completion_log ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
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
```

3. Authenticationを有効化し、Email/Passwordプロバイダーを設定

### 4. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. 開発サーバーの起動

```bash
npm run dev
# または
yarn dev
```

ブラウザで http://localhost:3000 を開きます。

## 📱 使い方

### 初回ログイン

1. アプリにアクセスし、「Sign Up」をクリック
2. メールアドレスとパスワードを入力して登録
3. 確認メールのリンクをクリックしてアカウントを有効化

### TODO作成

1. 右上の「＋新規タスク」ボタンをクリック
2. 本文を入力（SlackのURLなども含められます）
3. 緊急度を選択（自動で期限が設定されます）
4. 必要に応じて「見出し生成」ボタンでAIによるタイトル生成
5. 「保存」をクリック

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
- **ホスティング**: Vercel

## 📁 プロジェクト構造

```
todo-app/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # ダッシュボード
│   ├── compare/           # 比較画面
│   ├── report/            # レポート画面
│   └── api/               # APIルート
├── components/            # Reactコンポーネント
│   ├── ui/               # UIコンポーネント
│   ├── todo/             # TODOコンポーネント
│   └── layout/           # レイアウトコンポーネント
├── lib/                   # ユーティリティ
│   ├── supabase.ts       # Supabaseクライアント
│   └── openai.ts         # OpenAI設定
├── store/                 # Zustand store
└── types/                 # TypeScript型定義
```

## 🔒 セキュリティ

- Supabase RLS（Row Level Security）によるデータ保護
- 環境変数による機密情報の管理
- サーバーサイドでのAPI呼び出し

## 📝 ライセンス

MIT License

## 📄 必要なファイル一覧

プロジェクトに必要な全ファイルのリストです。これらのファイルを作成してください：

### ルートディレクトリ
- `package.json`
- `tsconfig.json`
- `next.config.js`
- `tailwind.config.js`
- `postcss.config.js`
- `middleware.ts`
- `.gitignore`
- `.env.local.example`
- `README.md`
- `QUICKSTART.md`
- `PROJECT_STRUCTURE.md`

### app/
- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `app/compare/page.tsx`
- `app/report/page.tsx`
- `app/api/generate-title/route.ts`

### components/
- `components/auth/AuthForm.tsx`
- `components/layout/Navigation.tsx`
- `components/providers/AuthProvider.tsx`
- `components/todo/TodoCard.tsx`
- `components/todo/CreateTodoModal.tsx`
- `components/ui/Button.tsx`

### lib/
- `lib/supabase.ts`
- `lib/utils.ts`

### store/
- `store/todoStore.ts`

### types/
- `types/index.ts`

全てのファイルが提供されています。[QUICKSTART.md](QUICKSTART.md)を参照して、最速でアプリケーションを起動してください。