# 🐱 do'nTODO - やるべきこと・やるべきでないことを明確にするアプリ

Next.js + Supabase + OpenAI APIを使用した革新的なタスク管理アプリケーションです。

## 💡 コンセプト

**do'nTODO**は従来のTODOアプリとは異なり、Eisenhower Matrix（重要度×緊急度）による分析を通じて、**やるべきこと**だけでなく**やるべきでないこと**も明確にします。これにより、本当に重要なタスクに集中し、生産性を最大化できます。

## ✨ 主な機能

- 🔐 ユーザー認証（Supabase Auth）
- 📝 タスクの作成・編集・削除・完了
- ⏰ **期限切れタスクの完了許可**（期限が過ぎてもタスクを完了できる）
- 🖱️ **タスクカードホバー機能**（マウスホバーで本文プレビュー、200文字超過時は展開ボタン表示）
- ⚖️ **効率的重要度比較システム**（アダプティブ・トーナメント方式で最大97%の比較回数削減）
- 🎯 **改善された四象限マトリクス**（重要度判定の閾値最適化で適切なタスク振り分け）
- 👥 **ユーザー別Slack接続**（各ユーザーが自分のSlackワークスペースを接続可能）
- 🔗 Slack URLからのメッセージ取得とタスク化（自動タイトル生成・メンション変換対応）
- 🎭 **Slackリアクション自動タスク化**（カスタマイズ可能な絵文字でリアクションするとタスクが自動作成）
- 🎨 **絵文字リアクション設定のカスタマイズ**（ユーザーが緊急度ごとに好みの絵文字を選択可能）
- 🔄 **重複タスク作成防止**（同一イベントの重複処理を検知し、確実に1つのタスクのみ作成）
- 🔔 **スマートWebhook通知**（Slackリアクションでタスク作成時のみ選択的にブラウザ通知を受信）
- 🤖 OpenAI APIを使用したタスクタイトルの自動生成
- 📊 アイゼンハワーマトリクス（重要度×緊急度）による四象限表示
- 📈 タスクの重要度比較機能
- 📋 完了レポート機能
- 📱 レスポンシブデザイン（モバイル対応）

## 🏗️ アーキテクチャ

このプロジェクトは**Clean Architecture**パターンを採用し、保守性・テスタビリティ・再利用性を重視した設計になっています。

```
app/api/               # Presentation Layer (HTTP handlers)
lib/services/          # Application Layer (use cases & business logic)
lib/repositories/      # Infrastructure Layer (data access)
lib/entities/          # Domain Layer (business objects & rules)
components/            # UI Layer (view components)
```

## 🚀 クイックスタート

### 前提条件
- Node.js 18以上
- Docker Desktop
- OpenAI APIキー
- Slack App（Slack連携使用時）

### 1. ローカル開発環境（推奨）

```bash
# 1. プロジェクトセットアップ
git clone <repository-url>
cd todo-app
npm install

# 2. 環境変数設定
cp .env.local.example .env.local
# .env.localを編集してAPIキーを設定

# 3. 開発環境起動
npm run dev
```

### 2. 詳細なセットアップ

より詳細なセットアップ手順については、[セットアップガイド](./docs/setup/SETUP.md)を参照してください。

## 📚 ドキュメント

### 🚀 セットアップ・環境構築
- [セットアップガイド](./docs/setup/SETUP.md) - 3つの環境でのセットアップ手順
- [環境変数設定](./docs/setup/ENVIRONMENT.md) - 詳細な環境変数設定方法
- [トラブルシューティング](./docs/setup/TROUBLESHOOTING.md) - よくある問題と解決方法

### 🏗️ アーキテクチャ・設計
- [アーキテクチャ概要](./docs/architecture/ARCHITECTURE.md) - Clean Architecture設計とレイヤー構成
- [データベース設計](./docs/architecture/DATABASE.md) - Supabase PostgreSQL設計とRLS
- [API仕様](./docs/architecture/API.md) - 全APIエンドポイントの詳細仕様

### 👨‍💻 開発・運用
- [開発ガイド](./docs/development/DEVELOPMENT.md) - 開発ルール・コーディング規約・ワークフロー
- [テストガイド](./docs/development/TESTING.md) - Clean Architectureテスト戦略と実装
- [セキュリティガイド](./docs/development/SECURITY.md) - セキュリティ対策とベストプラクティス

### ✨ 機能仕様
- [Slack連携機能](./docs/features/SLACK.md) - 包括的なSlack連携機能の詳細
- [UI・UX仕様](./docs/features/UI_SPEC.md) - デザインシステムとコンポーネント仕様

### 📋 プロジェクト管理
- [プロジェクト構造](./docs/project/STRUCTURE.md) - ディレクトリ構成とファイル組織
- [変更履歴](./docs/project/CHANGELOG.md) - 機能追加・改善の履歴

## 🛠️ 開発コマンド

```bash
# 開発環境
npm run dev              # ローカル開発環境（Supabase + Next.js）
npm run dev:webhook      # Webhook開発環境（ngrok + Supabase + Next.js）
npm run dev:quick        # 本番DB接続での開発

# データベース
npm run db:start         # ローカルSupabaseを起動
npm run db:studio        # Supabase Studioを開く
npm run db:migrate       # マイグレーション実行
npm run types:generate   # TypeScript型定義生成

# 開発ツール
npm run build            # 本番ビルド
npm run lint             # ESLintチェック
npm run test             # テスト実行
npm run test:coverage    # カバレッジ付きテスト

# 開発用データ
npm run seed:dev         # 開発用シードデータ投入
```

## 🔧 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 14 (App Router), TypeScript, Tailwind CSS, Radix UI |
| バックエンド | Supabase (PostgreSQL, Auth, Realtime) |
| 状態管理 | Zustand |
| 認証 | @supabase/ssr |
| ホスティング | Vercel |
| 外部API | OpenAI API, Slack Web API |
| 開発ツール | Jest, ESLint, Docker, ngrok |

## 🤝 開発ルール

このプロジェクトは**Clean Architecture**を採用しています。新規開発時は以下のルールに従ってください：

1. ✅ **必ずClean Architecture構造で実装**
2. ✅ **ビジネスロジックはService層に集約**
3. ✅ **データアクセスはRepository層で抽象化**
4. ✅ **APIはHTTP処理のみに専念**

詳細は [開発ガイド](./docs/development/DEVELOPMENT.md) を参照してください。

## 🔒 セキュリティ

- **Row Level Security (RLS)**: 全テーブルでユーザーデータ完全分離
- **認証・認可**: Supabase SSR + ミドルウェアによる保護
- **API保護**: 全エンドポイントで認証チェック
- **Webhook署名検証**: HMAC-SHA256による検証
- **入力検証**: TypeScript + Zod による厳密な型安全性

詳細は [セキュリティガイド](./docs/development/SECURITY.md) を参照してください。

## 📊 最近の主要アップデート

### 2025年1月
- 🔔 **リアルタイムWebhook通知システム** - Slackリアクション作成時の即座通知
- 🔄 **重複タスク作成防止** - 同一イベントの重複処理を完全防止
- 🎨 **絵文字設定カスタマイズ** - ユーザー固有の絵文字リアクション設定
- 🔒 **セキュリティ強化** - ユーザー認証とアクセス制御の強化

詳細は [変更履歴](./docs/project/CHANGELOG.md) を参照してください。

## 🆘 サポート

### トラブルシューティング
よくある問題と解決方法は [トラブルシューティングガイド](./docs/setup/TROUBLESHOOTING.md) を参照してください。

### 追加ヘルプ
- 問題が解決しない場合は、環境情報（Node.js、npm バージョン等）とエラーメッセージを添えてお問い合わせください
- 新機能の提案や改善案も歓迎します

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。