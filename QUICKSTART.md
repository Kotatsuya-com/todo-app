# 🚀 クイックスタートガイド

このガイドでは、TODO管理アプリを最速でセットアップして起動する方法を説明します。

## 前提条件のチェックリスト

- [ ] Node.js 18以上がインストールされている
- [ ] npmまたはyarnが使用可能
- [ ] Supabaseアカウントを持っている
- [ ] OpenAIアカウントとAPIキーを持っている

## ステップ1: プロジェクトのセットアップ（5分）

```bash
# 1. プロジェクトディレクトリを作成
mkdir todo-app && cd todo-app

# 2. 必要なファイルをすべてコピー
# （提供されたファイルをプロジェクトディレクトリに配置）

# 3. 依存関係をインストール
npm install
```

## ステップ2: Supabaseプロジェクトの作成（10分）

1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. 「New project」をクリック
3. プロジェクト名とパスワードを設定
4. 地域を選択（東京推奨）して作成

### データベースセットアップ

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

## ステップ3: 環境変数の設定（3分）

1. `.env.local.example`を`.env.local`にコピー：
```bash
cp .env.local.example .env.local
```

2. `.env.local`を編集：

### Supabaseの情報を取得
- Supabaseダッシュボードで「Settings」→「API」
- `Project URL`をコピーして`NEXT_PUBLIC_SUPABASE_URL`に設定
- `anon public`キーをコピーして`NEXT_PUBLIC_SUPABASE_ANON_KEY`に設定
- `service_role`キーをコピーして`SUPABASE_SERVICE_ROLE_KEY`に設定

### OpenAI APIキーを取得
- [OpenAI Platform](https://platform.openai.com/api-keys)でAPIキーを作成
- `OPENAI_API_KEY`に設定

## ステップ4: アプリケーションの起動（1分）

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

## ステップ5: 初回利用（3分）

1. **アカウント作成**
   - 「アカウントをお持ちでない方はこちら」をクリック
   - メールアドレスとパスワードを入力
   - 確認メールのリンクをクリック

2. **最初のTODO作成**
   - ログイン後、右上の「＋新規タスク」をクリック
   - タスクの内容を入力
   - 緊急度を選択（期限が自動設定される）
   - 「保存」をクリック

3. **機能を試す**
   - ダッシュボードで四象限表示とリスト表示を切り替え
   - 優先度比較タブで2つのタスクを比較
   - タスクを完了してレポートタブで確認

## トラブルシューティング

### Supabase接続エラー
- 環境変数が正しく設定されているか確認
- Supabaseプロジェクトがアクティブか確認

### OpenAI APIエラー
- APIキーが正しいか確認
- APIの利用制限に達していないか確認

### ビルドエラー
```bash
# 依存関係をクリーンインストール
rm -rf node_modules package-lock.json
npm install
```

## 次のステップ

- [README.md](README.md)で詳細な機能説明を確認
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)でコード構造を理解
- Vercelへのデプロイ手順はREADMEを参照

## サポート

問題が解決しない場合は、以下を確認してください：
- Node.jsのバージョン: `node --version`
- npmのバージョン: `npm --version`
- `.env.local`の設定内容（APIキーは隠して）