# プロジェクト構造

```
todo-app/
├── app/                          # Next.js App Router
│   ├── api/                      # APIルート
│   │   └── generate-title/       # LLM見出し生成API
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
├── README.md                   # プロジェクトREADME
├── tailwind.config.js          # Tailwind CSS設定
└── tsconfig.json               # TypeScript設定
```

## 主要な機能モジュール

### 認証システム
- `middleware.ts`: ルート保護
- `components/auth/AuthForm.tsx`: ログイン/サインアップUI
- `components/providers/AuthProvider.tsx`: 認証状態管理

### TODO管理
- `store/todoStore.ts`: TODO状態管理（CRUD操作）
- `components/todo/TodoCard.tsx`: TODO表示・操作
- `components/todo/CreateTodoModal.tsx`: TODO作成

### 優先度管理
- `app/compare/page.tsx`: 比較インターフェース
- Eloレーティングシステムによる重要度スコア計算

### レポート機能
- `app/report/page.tsx`: 完了タスクの統計表示
- 四象限分析とグラフ表示

## データフロー

1. **認証フロー**
   - Supabase Auth → AuthProvider → 各コンポーネント

2. **TODO操作フロー**
   - UI操作 → Zustand Store → Supabase DB → UI更新

3. **LLM連携フロー**
   - TODO本文 → API Route → OpenAI API → 見出し生成

## 開発のヒント

- 新しいコンポーネントは`components/`の適切なサブディレクトリに配置
- API関連の処理は`app/api/`に配置
- 共通の型定義は`types/index.ts`に追加
- ユーティリティ関数は`lib/utils.ts`に追加