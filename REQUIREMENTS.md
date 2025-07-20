# ✅ Slack連携 TODO管理アプリ 設計ドキュメント（Next.js + Supabase）

---

## 🧭 全体構成（技術スタック）

| 項目      | 使用技術                                        |
| ------- | ------------------------------------------- |
| フロントエンド | Next.js（App Router, TypeScript）             |
| UI      | Tailwind CSS + Radix UI                   |
| 状態管理    | Zustand                                   |
| バックエンド  | Supabase（PostgreSQL + Auth + Edge Function） |
| 認証      | @supabase/ssr（2024年推奨パッケージ）              |
| ホスティング  | Vercel                                      |
| LLM連携   | OpenAI API（/api/generate-title経由）           |
| Slack連携 | Slack Web API（Bot Token使用、チャンネル・スレッド対応）  |

---

## 🧩 コア機能仕様（要約）

| 機能               | 内容                                 |
| ---------------- | ---------------------------------- |
| ✅ 任意の期限日設定       | TODOに「期限日（date型、時間なし）」を設定可能        |
| 🔥 緊急度の期限日自動変換   | 緊急度選択時に自動で期限日に変換（今すぐ/今日→本日、明日→明日、それより後→期限なし） |
| ⏰ 期限切れTODO操作     | 期限切れのTODOだけを表示し、ワンタップで期限更新または削除できる |
| 🧭 タブ型UI         | ダッシュボード / 比較 / レポートをSPA内で即時切替可能    |
| 🪟 TODO作成ポップアップ  | 作成画面はモーダルで表示（ダッシュボード上に出現）          |
| ⚖️ 比較の途中完了反映     | 比較を全てやりきらずとも、そこまでの優先度を使って並べ替えに反映   |
| 🔗 Slack連携        | SlackURL（チャンネル・DM・スレッド）からメッセージ内容を取得してタスク化 |

---

## 🖥️ 画面構成とUI仕様

### 🌐 グローバル構成（全ページ共通）

* ナビゲーションタブ（上部固定）：

  * 📋 ダッシュボード（TODO一覧）
  * ⚖️ 優先度比較
  * 📊 レポート
* 右上に「＋新規タスク」ボタン → モーダルでタスク作成画面表示

---

### 1. 📋 ダッシュボード画面（`/`）

#### 主な要素

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

---

### 2. ⚖️ タスク比較画面（`/compare`）

#### 主な要素

* 比較対象 TODO カード × 2（本文 / 期限 / 見出し）
* アクション：

  * ⬅️ 左が重要 ／ 右が重要 ➡️
  * 🔁 スキップ ／ ✅ ここで終了
* 終了時点までの重要度スコアで仮ソートが反映

---

### 3. 📊 レポート画面（`/report`）

#### 主な要素

* 時間単位切替：📅 日 / 週 / 月
* グラフ表示（四象限ごとの完了件数）：

  * ドーナツ or 棒グラフ
* 過去の完了タスク一覧（完了日時・タイトル・象限）
* 完了タスクの推移チャート（時系列）

---

### 4. ➕ タスク作成モーダル（ポップアップ）

#### 主な要素

* 📄 本文入力（複数行、任意のURLを含めてOK）
* 🔗 Slack連携（SlackURLを検出し、メッセージ内容を自動取得）
* 🧠 LLM見出し生成ボタン（内容から一言タイトル）
* 🔥 緊急度選択（→ 自動で期限日補完）
* 📅 期限日（カレンダーで任意日選択も可能）
* 💾 保存ボタン（作成 → ダッシュボードに反映）

#### Slack連携機能

* 本文入力欄にSlackのメッセージURLを入力すると自動検出
* 対応URL形式：
  - チャンネルメッセージ: `https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP`
  - スレッド内メッセージ: `https://workspace.slack.com/archives/CHANNEL_ID/pTIMESTAMP?thread_ts=THREAD_TS`
* 「メッセージ取得」ボタンでSlack APIからメッセージ内容を取得
* 取得したメッセージ内容をプレビュー表示
* 保存時は取得したSlackメッセージ内容をタスクの本文として使用
* 必要な権限: `channels:history`, `groups:history`, `im:history`, `mpim:history`

---

## 🔄 画面遷移仕様（SPA内）

```
[ / ] ──┬── 📋 ダッシュボード（初期表示）
        ├── ⚖️ 比較画面（/compare）
        └── 📊 レポート画面（/report）

[ ＋ ] → タスク作成モーダル（全画面共通、オーバーレイ表示）
```

---

## 🗃️ Supabase データベース設計（PostgreSQL）

### 🔐 users テーブル

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

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

**⚠️ 変更点**: `urgency`フィールドを削除。緊急度はUI選択時に`deadline`に自動変換されるためDBに保存しない。

---

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

---

### 📊 completion\_log テーブル

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

---

## 🧠 補足仕様・ルール

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

---

## 🔄 アップデート履歴

### v1.1.0 - 2024年12月

#### 🆕 追加機能
- **Slack連携**: チャンネル・DM・スレッド内メッセージの取得機能
- **期限日自動変換**: 緊急度選択時の自動期限設定機能

#### ⚡ 変更内容  
- **データベース構造**: `todos`テーブルから`urgency`フィールドを削除
- **認証システム**: `@supabase/ssr`パッケージへの移行（Cookie問題解決）
- **緊急度判定**: urgencyフィールドから期限日ベースの判定に変更
- **API仕様**: `/api/llm-summary` → `/api/generate-title` に変更

#### 🛠️ 技術改善
- **セキュリティ**: 最新のSupabase認証ベストプラクティス準拠
- **パフォーマンス**: 不要なフィールド削除によるDB最適化
- **安定性**: エラーハンドリングとナビゲーション問題の解決
