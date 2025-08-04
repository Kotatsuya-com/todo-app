# 開発ガイド

## 🏗️ 開発原則

このプロジェクトは**Clean Architecture**パターンを採用し、明確な開発ルールとコーディング規約に従って開発を行います。

## 📋 開発ルール

**🎉 2025年8月: Clean Architecture移行完了**

### バックエンド実装ルール（完了）

1. ✅ **必ずClean Architecture構造で実装**
2. ✅ **ビジネスロジックはService層に集約**
3. ✅ **データアクセスはRepository層で抽象化**
4. ✅ **APIはHTTP処理のみに専念**

### フロントエンド実装ルール（完了）

1. ✅ **ドメイン層**: エンティティとユースケースでビジネスロジック実装
2. ✅ **インフラ層**: Supabaseリポジトリ実装と依存性注入
3. ✅ **プレゼンテーション層**: カスタムフックでUI論理分離
4. ✅ **完全移行**: 全コンポーネントがClean Architecture準拠

### テスト実装方針

- Service層とRepository層を中心としたテスト作成
- Domain層（エンティティ・ユースケース）の単体テスト
- Presentation層（カスタムフック）のテスト

## 📁 ファイル構成ルール

```
# Next.js App Router（ページとAPI）
app/                   
├── api/               # バックエンドAPI（Clean Architecture完了）
└── [pages]/           # ページルーティング

# バックエンドClean Architecture（完了）
lib/
├── entities/          # Domain Layer - ビジネスオブジェクト
├── repositories/      # Infrastructure Layer - データアクセス
├── services/          # Application Layer - ビジネスロジック
└── [utils]/           # ユーティリティと共通ロジック

# フロントエンドClean Architecture（完了）
src/
├── domain/            # ドメイン層
│   ├── entities/      # エンティティ（Todo.ts, User.ts）
│   ├── repositories/  # リポジトリ抽象（TodoRepositoryInterface.ts等）
│   └── use-cases/     # ユースケース（TodoUseCases.ts, AuthUseCases.ts）
├── infrastructure/    # インフラ層
│   ├── di/            # 依存性注入（ServiceFactory.ts）
│   └── repositories/  # リポジトリ実装（SupabaseTodoRepository.ts等）
└── presentation/      # プレゼンテーション層
    ├── hooks/         # カスタムフック（useAuth.ts, useTodoForm.ts等）
    ├── pages/         # ページコンポーネント
    └── providers/     # プロバイダー（AuthProvider.tsx）

# UIコンポーネント
components/            # 再利用可能UIコンポーネント
├── ui/               # 基本UIコンポーネント（Button, Modal等）
├── layout/           # レイアウト関連（Navigation, Menu等）  
└── [feature]/        # 機能別コンポーネント（todo, auth等）

# 型定義とユーティリティ
types/                # TypeScript型定義
```

## 🔧 ESLint・コード品質

### 必須ルール

- **ESLintチェック**: 全コミット前に `npm run lint` を実行し、エラーゼロを確保
- **自動修正**: `npm run lint -- --fix` で修正可能な項目は自動修正
- **TypeScript厳格**: `no-explicit-any`は警告レベル（完全禁止ではないが最小限に）
- **未使用変数**: 引数で使用する場合は `_` プレフィックス（例：`_data`, `_event`）

### コードスタイル規約

```typescript
// ✅ 適切なTypeScript記述
interface TodoData {
  title: string
  deadline?: Date
}

const createTodo = async (data: TodoData): Promise<Todo> => {
  // 実装
}

// ❌ 避けるべき記述
const createTodo = async (data: any) => {
  // any型の使用は最小限に
}
```

## 🏛️ API設計原則

- **Clean Architecture準拠**: 新規APIは必ずClean Architecture構造で実装
- **レイヤー分離**: 各層の責務を明確に分離
- **統一エラー処理**: Repository層での一貫したエラーハンドリング
- **依存性注入**: Service層でのRepository注入によるテスタビリティ確保
- **セキュリティ**: 認証チェックと入力検証を必須実装
- **ログ出力**: デバッグ情報と本番運用に必要な情報を適切に出力

### APIレイヤー実装例

```typescript
// ✅ Clean Architecture準拠のAPI実装
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 認証チェック
    const user = await authenticateUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // リクエストデータの検証
    const payload = await request.json()
    const validationResult = validatePayload(payload)
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.errors },
        { status: 400 }
      )
    }

    // Service層に委譲
    const { slackService } = createServices()
    const result = await slackService.processWebhookEvent(
      params.webhook_id,
      payload
    )
    
    return NextResponse.json(result.data, { status: result.statusCode })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## ⚙️ エラーハンドリング

### 適切なエラーハンドリング

```typescript
// ✅ 適切なエラーハンドリング
try {
  const result = await apiCall()
  return result
} catch (error) {
  console.error('API call failed:', error)
  throw new Error('Failed to process request')
}

// ❌ 不適切なエラーハンドリング  
const result = await apiCall()  // エラー時の処理なし
return result || {}             // エラーを隠蔽
```

### Repository層エラーハンドリング

```typescript
// ✅ Repository層の統一エラーハンドリング
export class RepositoryUtils {
  static handleSupabaseResult<T>(result: PostgrestResponse<T>): RepositoryResult<T> {
    if (result.error) {
      console.error('Database error:', result.error)
      return {
        success: false,
        error: result.error.message,
        data: null
      }
    }
    
    return {
      success: true,
      error: null,
      data: result.data
    }
  }
}
```

## 📦 依存関係・ライブラリ管理

### 新しいライブラリ追加時の確認事項

- [ ] ライセンス互換性の確認
- [ ] セキュリティ脆弱性の確認
- [ ] バンドルサイズへの影響を考慮
- [ ] 既存ライブラリとの重複回避

### 推奨ライブラリとパターン

- **UI**: Radix UI（アクセシブルなプリミティブ）
- **日付**: date-fns（軽量、Tree-shaking対応）
- **HTTP**: Fetch API（Next.js標準、追加ライブラリ不要）
- **状態管理**: Zustand（シンプル、TypeScript親和性）

### ライブラリ追加例

```bash
# ライブラリ追加前の確認
npm audit                           # セキュリティチェック
npm list --depth=0                  # 既存依存関係確認

# 適切な追加
npm install --save-exact package-name    # バージョン固定
npm audit                               # 再セキュリティチェック
```

## 🚀 パフォーマンス・最適化

### コード最適化

```typescript
// ✅ useCallback/useMemoの適切な使用
const fetchData = useCallback(async () => {
  const data = await api.getData()
  return data
}, [dependencies])

const memoizedValue = useMemo(() => {
  return expensiveCalculation(data)
}, [data])

// ✅ 条件付きレンダリング
{user && <UserProfile user={user} />}

// ❌ 不適切な最適化
const fetchData = useCallback(async () => {
  const data = await api.getData()
  return data
}, []) // 依存関係の省略は危険
```

### バンドル最適化

```typescript
// ✅ 適切なimport
import { debounce } from 'lodash-es'

// ❌ 全体import
import _ from 'lodash'  // バンドルサイズが増大
```

## 🗄️ データベース開発

### マイグレーション管理

```bash
# 新しいマイグレーション作成
npm run migrate:new description

# SQLファイルを編集
# supabase/migrations/YYYYMMDDHHMMSS_description.sql

# ローカルでテスト
npm run db:reset  # ローカルDBをリセットしてマイグレーション実行

# リモートに適用
npm run db:migrate

# 型定義を更新
npm run types:generate
```

### マイグレーション例

```sql
-- 新しいテーブル作成例
CREATE TABLE example_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLSポリシー設定
ALTER TABLE example_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own data" ON example_table
  FOR ALL USING (auth.uid() = user_id);

-- インデックス作成
CREATE INDEX idx_example_table_user_id ON example_table(user_id);
```

## 🌱 開発用データ

### シードデータの活用

```bash
# テストデータを投入
npm run seed:dev

# 特定ユーザーでテストデータを投入
npm run seed:dev -- --email your@example.com

# データのリセット
npm run seed:dev  # 既存データクリア後、新しいデータ投入
```

### カスタムシードデータ

シードデータをカスタマイズする場合：

1. **SQLファイル編集**: `supabase/seed-dev.sql`を編集
2. **実行スクリプト編集**: `scripts/seed-dev-data.js`を編集
3. **新しいテストケース追加**: SQLのINSERT文を追加

## 🔄 Git・バージョン管理

### コミット前チェックリスト

- [ ] `npm run test` で全テスト成功
- [ ] `npm run lint` でESLintエラーゼロ
- [ ] `npm run build` でビルドエラーなし  
- [ ] Clean Architecture準拠（フロントエンド・バックエンド共に完了）
- [ ] Domain・Infrastructure・Presentation層のテスト作成済み
- [ ] TypeScriptコンパイルエラーなし
- [ ] Console.logの不要な出力を削除

### 開発フロー

```bash
# 開発開始前
npm run lint              # ESLintチェック
npm run build            # ビルドチェック

# 開発中
npm run dev              # 開発サーバー起動
npm run test:watch       # テスト監視モード

# コミット前  
npm run lint -- --fix    # 自動修正実行
npm run test             # 全テスト実行
npm run build            # 最終ビルドチェック

# コミット
git add .
git commit -m "feat: implement new feature"
```

### コミットメッセージ規約

```bash
# 推奨フォーマット
feat: 新機能の追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル変更（機能変更なし）
refactor: リファクタリング
test: テスト追加・修正
chore: ビルド・補助ツール変更

# 例
feat: add user authentication
fix: resolve Slack webhook signature validation
docs: update API documentation
refactor: complete frontend Clean Architecture migration
```

## 🔧 開発環境・ツール

### 開発コマンド

```bash
# 開発環境
npm run dev               # ローカル開発環境（Supabase + Next.js）
npm run dev:webhook       # Webhook開発環境（ngrok + Supabase + Next.js）
npm run dev:quick         # 本番DB接続での開発

# データベース操作
npm run db:start          # ローカルSupabaseを起動
npm run db:stop           # ローカルSupabaseを停止
npm run db:status         # ローカルSupabaseの状態確認
npm run db:studio         # Supabase Studioを開く
npm run db:reset          # データベースリセット

# 開発用シードデータ
npm run seed:dev          # 利用可能ユーザー一覧を表示、最初のユーザーを自動選択
npm run seed:dev -- --email test@example.com  # 指定ユーザーでシードデータ投入

# マイグレーション
npm run migrate:new       # 新しいマイグレーション作成
npm run db:migrate        # マイグレーション実行
npm run types:generate    # TypeScript型定義生成

# ビルド・テスト
npm run build             # 本番ビルド
npm run lint              # ESLintチェック
npm run test              # Jestテスト実行
npm run test:watch        # テスト監視モード
npm run test:coverage     # カバレッジ付きテスト
```

### エディタ設定

推奨VS Code拡張機能：

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-json"
  ]
}
```

### 環境変数管理

開発環境での環境変数設定：

```bash
# 環境変数テンプレートをコピー
cp .env.local.example .env.local

# 必要な環境変数を設定
# - OPENAI_API_KEY
# - Supabaseキー
# - Slack認証情報（オプション）
```

## 📝 ドキュメント管理

### README更新義務

- 新機能追加時は該当セクションを更新
- API変更時は仕様書を更新
- 環境変数追加時は設定例を追加

### ドキュメント構造

```
docs/
├── setup/              # セットアップ関連
├── architecture/       # アーキテクチャ・設計
├── development/        # 開発ガイド
├── features/          # 機能仕様
└── project/           # プロジェクト管理
```

## 🚀 デプロイメント

### 本番デプロイ前チェック

- [ ] 全テストが成功
- [ ] セキュリティ脆弱性チェック完了
- [ ] 環境変数が正しく設定
- [ ] データベースマイグレーション完了
- [ ] ログ出力に機密情報が含まれていない

### Vercelデプロイ

```bash
# Vercel CLI使用の場合
vercel --prod

# GitHub連携の場合
git push origin main  # 自動デプロイ
```

## 🛠️ よくある開発問題

### ESLintエラー

```bash
# 自動修正を試行
npm run lint -- --fix

# 手動でエラーを確認
npm run lint
```

### ビルドエラー

```bash
# 依存関係の問題
rm -rf node_modules package-lock.json
npm install

# TypeScript型エラー
npm run types:generate  # 型定義を再生成
npx tsc --noEmit       # 型チェックのみ実行
```

### データベース関連

```bash
# マイグレーションエラー
npm run db:reset       # 完全リセット

# テストデータ問題
npm run seed:dev       # シードデータ再投入
```

## 📚 関連ドキュメント

- [テストガイド](./TESTING.md) - テスト戦略と実装方法
- [セキュリティガイド](./SECURITY.md) - セキュリティ対策
- [アーキテクチャ概要](../architecture/ARCHITECTURE.md) - 全体設計
- [API仕様](../architecture/API.md) - APIの詳細仕様