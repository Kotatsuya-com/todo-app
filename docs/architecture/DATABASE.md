# データベース設計

## 🗄️ 概要

Supabase PostgreSQLを使用したタスク管理システムのデータベース設計です。Row Level Security (RLS)により完全なユーザー分離を実現しています。

## 📊 データベース構造

### ER図概要
```
auth.users (Supabase Auth)
    ↓ (1:1)
users
    ↓ (1:N)
┌─ todos ──────── comparisons (N:N)
│    ↓ (1:N)
│ completion_log
│
├─ slack_connections (1:N)
│    ↓ (1:N)
│ user_slack_webhooks
│
├─ user_emoji_settings (1:1)
│
└─ slack_event_processed
```

## 🔐 テーブル詳細

### users テーブル
ユーザーの基本情報とアプリ設定を管理

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  slack_user_id TEXT,                          -- Slack User ID（リアクション連携用）
  enable_webhook_notifications BOOLEAN DEFAULT true,  -- Webhook通知設定
  created_at TIMESTAMP DEFAULT NOW()
);
```

**重要なフィールド**:
- `slack_user_id`: Slackリアクション連携でのユーザー認証に使用
- `enable_webhook_notifications`: Webhook通知のON/OFF制御

### todos テーブル
タスクの詳細情報を管理

```sql
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  deadline DATE,                                -- 期限日（緊急度判定に使用）
  importance_score REAL DEFAULT 0.5,           -- 重要度スコア（0.0-1.0）
  status VARCHAR(20) DEFAULT 'open',           -- 'open' or 'completed'
  slack_url TEXT,                              -- Slack連携時のURL
  created_via VARCHAR(50) DEFAULT 'manual',    -- 作成元（'manual' | 'slack_url' | 'slack_reaction'）
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**設計ポイント**:
- `urgency`フィールドは削除済み（UIで期限日に自動変換）
- `created_via`でタスク作成元を追跡し、通知制御に使用
- `importance_score`は比較システムで動的に更新

### comparisons テーブル
タスク間の重要度比較履歴

```sql
CREATE TABLE comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  winner_id UUID REFERENCES todos(id),
  loser_id UUID REFERENCES todos(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**用途**: Eloレーティングシステムでの重要度スコア計算

### completion_log テーブル
完了したタスクの履歴

```sql
CREATE TABLE completion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID REFERENCES todos(id),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  quadrant VARCHAR(50),                        -- 完了時の四象限
  completed_at TIMESTAMP DEFAULT NOW()
);
```

**用途**: レポート機能での統計分析

### slack_connections テーブル
ユーザー別Slackワークスペース接続情報

```sql
CREATE TABLE slack_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  workspace_name TEXT NOT NULL,
  team_name TEXT NOT NULL,
  access_token TEXT NOT NULL,                  -- OAuth取得のアクセストークン
  scope TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, workspace_id)
);
```

**セキュリティ**: アクセストークンは暗号化推奨

### user_slack_webhooks テーブル
ユーザー固有のWebhook管理

```sql
CREATE TABLE user_slack_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slack_connection_id UUID REFERENCES slack_connections(id) ON DELETE CASCADE,
  webhook_id TEXT UNIQUE NOT NULL,             -- Base64URL エンコードされた一意ID
  webhook_secret TEXT NOT NULL,               -- Webhook署名検証用シークレット
  is_active BOOLEAN DEFAULT true,
  last_event_at TIMESTAMP WITH TIME ZONE,
  event_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**特徴**:
- ユーザーごとに個別のWebhook URL
- `webhook_id`はBase64URLエンコードで生成
- 署名検証による不正アクセス防止

### user_emoji_settings テーブル
ユーザー固有の絵文字設定

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

**用途**: Slackリアクションの絵文字と緊急度のマッピング

### slack_event_processed テーブル
重複イベント防止

```sql
CREATE TABLE slack_event_processed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT UNIQUE NOT NULL,             -- channel:timestamp:reaction:user
  processed_at TIMESTAMP DEFAULT NOW()
);
```

**目的**: 
- Slackイベントの重複処理を防止
- 同一リアクションで複数タスクが作成される問題を解決
- 24時間後の自動クリーンアップで軽量化

## 🔒 セキュリティ（Row Level Security）

### RLS ポリシー

すべてのテーブルでRLSを有効化し、ユーザー分離を実現：

```sql
-- 基本ポリシー例（todosテーブル）
CREATE POLICY "Users can only access their own todos" ON todos
  FOR ALL USING (auth.uid() = user_id);

-- 複雑なポリシー例（completion_logテーブル）
CREATE POLICY "Users can only access their own completion logs" ON completion_log
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM todos WHERE todos.id = completion_log.todo_id
    )
  );
```

### 認証パターン

1. **ユーザー認証** (`auth.uid() = user_id`)
   - 通常のCRUD操作で使用
   - Supabase Authによる自動認証

2. **Service Role認証** 
   - Slack Event APIなど外部サービス用
   - RLSを適切にバイパス

## 🔄 データ整合性

### 外部キー制約

- **CASCADE DELETE**: `slack_connections` → `user_slack_webhooks`
- **手動削除**: `todos` → `comparisons`, `completion_log`（アプリケーションで処理）

### データベーストリガー

```sql
-- 新規ユーザー作成時の自動処理
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 📈 パフォーマンス最適化

### インデックス設計

```sql
-- 頻繁なクエリに対するインデックス
CREATE INDEX idx_todos_user_status ON todos(user_id, status);
CREATE INDEX idx_todos_deadline ON todos(deadline) WHERE status = 'open';
CREATE INDEX idx_comparisons_user_created ON comparisons(user_id, created_at);
CREATE INDEX idx_webhooks_webhook_id ON user_slack_webhooks(webhook_id);
```

### クエリ最適化

- **複合インデックス**: 複数条件での検索最適化
- **部分インデックス**: ステータス別の効率的な検索
- **外部キーインデックス**: JOIN操作の高速化

## 🧮 ビジネスルール

### 重要度スコア計算

```sql
-- 初期重要度スコア設定ルール
CASE 
  WHEN deadline < CURRENT_DATE THEN 0.7        -- 期限切れ: 高重要度
  WHEN deadline = CURRENT_DATE THEN 0.6        -- 今日期限: 中重要度  
  ELSE 0.3 + (RANDOM() * 0.4)                  -- その他: 0.3-0.7ランダム
END
```

### 四象限分類

```sql
-- 緊急度判定
urgent = (deadline IS NOT NULL AND deadline <= CURRENT_DATE)

-- 重要度判定（改善済み）
important = (importance_score >= 0.4)  -- 従来の0.5から0.4に変更

-- 四象限分類
CASE 
  WHEN urgent AND important THEN 'urgent_important'
  WHEN NOT urgent AND important THEN 'not_urgent_important'  
  WHEN urgent AND NOT important THEN 'urgent_not_important'
  ELSE 'not_urgent_not_important'
END
```

## 🔧 マイグレーション管理

### マイグレーション履歴

```bash
supabase/migrations/
├── 20250721085254_initial_schema.sql          # 初期スキーマ
├── 20250725180821_slack_connections.sql       # Slack接続機能
├── 20250727024659_user_slack_webhooks.sql     # ユーザー固有Webhook
├── 20250727085000_fix_webhook_encoding.sql    # Webhook ID修正
├── 20250728173625_user_emoji_settings.sql     # 絵文字設定
├── 20250729175521_add_slack_event_deduplication.sql # 重複防止
├── 20250730145916_add_notification_preferences.sql  # 通知設定
├── 20250730175158_add_created_via_to_todos.sql      # 作成元追跡
├── 20250730180000_fix_realtime_rls.sql              # リアルタイム修正
└── 20250731080000_enable_realtime_todos.sql         # リアルタイム有効化
```

### 開発コマンド

```bash
# 新しいマイグレーション作成
npm run migrate:new description

# ローカルマイグレーション適用
npm run db:migrate

# 型定義生成
npm run types:generate

# データベースリセット
npm run db:reset
```

## 📊 データ分析

### レポート用クエリ

```sql
-- 四象限別完了タスク数
SELECT 
  quadrant,
  COUNT(*) as count,
  DATE_TRUNC('day', completed_at) as date
FROM completion_log 
WHERE user_id = $1
GROUP BY quadrant, DATE_TRUNC('day', completed_at)
ORDER BY date DESC;

-- 重要度スコア分布
SELECT 
  ROUND(importance_score, 1) as score_range,
  COUNT(*) as count
FROM todos 
WHERE user_id = $1 AND status = 'open'
GROUP BY ROUND(importance_score, 1)
ORDER BY score_range;
```

## 🚀 スケーラビリティ考慮

### 将来の拡張性

- **パーティショニング**: 大量データ対応の準備
- **読み取り専用レプリカ**: レポート機能の分離
- **アーカイブ戦略**: 古いデータの効率的な管理

### モニタリング

- **クエリパフォーマンス**: Supabase Dashboardでの監視
- **コネクション数**: 接続プールの最適化
- **ストレージ使用量**: 定期的な容量チェック

## 📚 関連ドキュメント

- [アーキテクチャ概要](./ARCHITECTURE.md) - 全体設計とClean Architecture
- [API仕様](./API.md) - データベースを利用するAPI詳細
- [セットアップガイド](../setup/SETUP.md) - データベース環境構築
- [開発ガイド](../development/DEVELOPMENT.md) - マイグレーション管理