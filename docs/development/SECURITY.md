# セキュリティガイド

## 🔒 セキュリティ概要

このアプリケーションは多層防御戦略を採用し、データ保護、認証・認可、外部API連携における包括的なセキュリティ対策を実装しています。

## 🛡️ 実装されているセキュリティ対策

### データベース・データ保護

#### Row Level Security (RLS)
**完全なユーザーデータ分離**

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

**適用対象**:
- `users`, `todos`, `comparisons`, `completion_log`（全テーブル）
- `slack_connections`, `user_slack_webhooks`, `user_emoji_settings`
- `slack_event_processed`

### 認証・認可システム

#### 3層認証パターン

1. **ユーザー認証** (`🔐`)
   - Supabase SSRを使用したCookieベース認証
   - `createServerSupabaseClient`でサーバーサイド認証
   - 失敗時は401 Unauthorizedを返す

```typescript
// 認証チェック例
const user = await supabase.auth.getUser()
if (!user.data.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

2. **Service Role認証** (`🔑`)
   - 環境変数`SUPABASE_SERVICE_ROLE_KEY`使用
   - RLS（Row Level Security）をバイパス
   - Slack APIなど外部サービス専用

```typescript
// Service Role クライアント
const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

3. **Webhook署名検証**
   - Slack署名検証: `x-slack-signature`ヘッダー
   - HMAC-SHA256で署名計算
   - タイムスタンプ5分以内チェック

```typescript
// Webhook署名検証
export function verifySlackSignature(
  body: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  const time = parseInt(timestamp)
  const now = Math.floor(Date.now() / 1000)
  
  // タイムスタンプ検証（5分以内）
  if (Math.abs(now - time) > 300) {
    return false
  }
  
  // 署名検証
  const baseString = `v0:${timestamp}:${body}`
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(baseString)
  const computedSignature = `v0=${hmac.digest('hex')}`
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  )
}
```

#### ルート保護

**ミドルウェア（middleware.ts）**
```typescript
export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createServerClient(/* ... */)
  
  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser()
  
  // 保護されたルートでの認証必須
  if (!user && protectedRoutes.includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  return response
}

export const config = {
  matcher: ['/compare', '/report']  // 保護対象ルート
}
```

### API保護

#### 全APIエンドポイントでの認証チェック

```typescript
// API認証テンプレート
export async function POST(request: NextRequest) {
  try {
    // 1. 認証チェック
    const supabase = createServerSupabaseClient(request)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // 2. 入力検証
    const body = await request.json()
    const validationResult = validateInput(body)
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.errors },
        { status: 400 }
      )
    }
    
    // 3. 処理実行
    // ...
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### XSS・CSRF対策

#### XSS対策
```typescript
// リンクのセキュア生成
export function linkifyText(text: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  })
}
```

#### CSRF対策
- Supabase SSR Cookie管理による保護
- Same-Siteクッキー設定
- セキュアなCookie管理

```typescript
// セキュアなCookie設定
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7 // 7日間
}
```

## 🔐 機密情報管理

### 環境変数の適切な管理

#### 必須セキュリティ原則
- **環境変数**: APIキーは必ず環境変数で管理
- **コミット禁止**: `.env` ファイルのコミット厳禁
- **ログ出力**: APIキーやパスワードのログ出力禁止
- **例外ファイル**: `.env.*.example` はプレースホルダーのみ

#### 環境変数分類

**パブリック（クライアントサイド可）**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
NEXT_PUBLIC_SLACK_CLIENT_ID=123456789.123456789123
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**プライベート（サーバーサイドのみ）**:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
OPENAI_API_KEY=sk-...
SLACK_CLIENT_SECRET=abcdef123456...
SLACK_SIGNING_SECRET=abcdef123456...
```

### 機密情報のログ除外

```typescript
// ✅ 安全なログ出力
console.log('User authenticated', {
  user_id: user.id,
  timestamp: new Date().toISOString()
})

// ❌ 危険なログ出力
console.log('API call', {
  api_key: process.env.OPENAI_API_KEY,  // 絶対禁止
  user_token: accessToken               // 絶対禁止
})

// ✅ 機密情報をマスクする関数
function sanitizeForLogging(obj: any): any {
  const sensitiveKeys = ['api_key', 'token', 'secret', 'password']
  const sanitized = { ...obj }
  
  for (const key in sanitized) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]'
    }
  }
  
  return sanitized
}
```

## 🔍 入力検証・サニタイゼーション

### 厳密な型安全性

```typescript
// TypeScript型定義による実行時エラー防止
interface CreateTodoRequest {
  title: string
  description?: string
  deadline?: string
  urgency: 'today' | 'tomorrow' | 'later'
}

// Zodを使用した入力検証例
import { z } from 'zod'

const CreateTodoSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  urgency: z.enum(['today', 'tomorrow', 'later'])
})

// バリデーション関数
export function validateCreateTodo(data: unknown): {
  valid: boolean
  data?: CreateTodoRequest
  errors?: string[]
} {
  try {
    const validData = CreateTodoSchema.parse(data)
    return { valid: true, data: validData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      }
    }
    return { valid: false, errors: ['Invalid input format'] }
  }
}
```

### SQLインジェクション対策

```typescript
// ✅ パラメータ化クエリ（Supabase）
const { data, error } = await supabase
  .from('todos')
  .select('*')
  .eq('user_id', userId)
  .eq('status', status)

// ❌ 文字列結合（絶対禁止）
const query = `SELECT * FROM todos WHERE user_id = '${userId}'`  // 危険
```

## 🌐 外部API連携セキュリティ

### Slack API セキュリティ

#### OAuth認証フロー
```typescript
// セキュアなOAuth実装
export async function exchangeSlackCode(code: string, redirectUri: string) {
  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri
    })
  })
  
  const data = await response.json()
  
  if (!data.ok) {
    throw new Error(`Slack OAuth error: ${data.error}`)
  }
  
  return {
    access_token: data.authed_user.access_token,
    workspace_id: data.team.id,
    workspace_name: data.team.name
  }
}
```

#### トークン管理
```typescript
// アクセストークンの安全な保存
async function storeSlackConnection(userId: string, oauthData: SlackOAuthData) {
  // TODO: 実装時はトークンの暗号化を検討
  const { data, error } = await supabase
    .from('slack_connections')
    .insert({
      user_id: userId,
      workspace_id: oauthData.workspace_id,
      access_token: oauthData.access_token,  // 暗号化推奨
      scope: oauthData.scope
    })
  
  if (error) throw error
  return data
}
```

### OpenAI API セキュリティ

#### レート制限・エラーハンドリング
```typescript
// セキュアなOpenAI API呼び出し
export async function generateTitle(content: string): Promise<string> {
  // 入力サニタイゼーション
  const sanitizedContent = content.substring(0, 1000) // 長さ制限
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Generate a concise task title in 15 characters or less.'
          },
          {
            role: 'user',
            content: sanitizedContent
          }
        ],
        max_tokens: 50,
        temperature: 0.7
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`)
    }
    
    const data = await response.json()
    return data.choices[0]?.message?.content || 'New Task'
    
  } catch (error) {
    console.error('OpenAI API error:', error)
    return 'New Task'  // フォールバック
  }
}
```

## 🚨 セキュリティ監視・ログ

### セキュリティイベントのログ

```typescript
// セキュリティ関連イベントの構造化ログ
export function logSecurityEvent(event: {
  type: 'auth_failure' | 'invalid_signature' | 'rate_limit' | 'unauthorized_access'
  user_id?: string
  ip_address?: string
  details: Record<string, any>
}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'SECURITY',
    event_type: event.type,
    user_id: event.user_id,
    ip_address: event.ip_address,
    details: sanitizeForLogging(event.details)
  }
  
  console.warn('SECURITY EVENT:', logEntry)
  
  // TODO: 本番環境では外部セキュリティ監視システムに送信
}

// 使用例
logSecurityEvent({
  type: 'invalid_signature',
  details: {
    webhook_id: webhookId,
    provided_signature: signature.substring(0, 10) + '...',
    user_agent: request.headers.get('user-agent')
  }
})
```

### 不正アクセス検知

```typescript
// Slackリアクション認証での不正アクセス防止
export async function validateSlackUser(
  reactionUserId: string,
  webhookUserId: string
): Promise<boolean> {
  if (reactionUserId !== webhookUserId) {
    // 不正アクセス試行をログ記録（DEBUGレベル）
    console.debug('Slack reaction from different user', {
      reaction_user: reactionUserId,
      webhook_user: webhookUserId,
      action: 'ignored'
    })
    return false
  }
  
  return true
}
```

## 🔧 セキュリティテスト

### 認証テスト

```typescript
// 認証が必要なAPIのテスト
describe('API Authentication', () => {
  test('should return 401 for unauthenticated request', async () => {
    const request = new NextRequest('http://localhost:3000/api/protected', {
      method: 'POST'
      // 認証ヘッダーなし
    })
    
    const response = await POST(request)
    expect(response.status).toBe(401)
  })
  
  test('should allow authenticated request', async () => {
    const mockUser = createMockUser()
    mockAuth(mockUser)
    
    const request = new NextRequest('http://localhost:3000/api/protected', {
      method: 'POST',
      headers: createAuthHeaders(mockUser)
    })
    
    const response = await POST(request)
    expect(response.status).not.toBe(401)
  })
})
```

### 入力検証テスト

```typescript
// 入力検証のテスト
describe('Input Validation', () => {
  test('should reject malicious input', async () => {
    const maliciousPayload = {
      title: '<script>alert("xss")</script>',
      description: 'DROP TABLE todos;'
    }
    
    const request = new NextRequest('http://localhost:3000/api/todos', {
      method: 'POST',
      body: JSON.stringify(maliciousPayload)
    })
    
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
```

## 📋 セキュリティチェックリスト

### 開発時チェック

- [ ] APIキーが環境変数で管理されている
- [ ] `.env`ファイルが`.gitignore`に含まれている
- [ ] 全APIエンドポイントで認証チェック実装
- [ ] 入力検証が適切に実装されている
- [ ] ログに機密情報が含まれていない
- [ ] RLSポリシーが全テーブルに適用されている
- [ ] Webhook署名検証が実装されている

### デプロイ前チェック

- [ ] セキュリティ脆弱性スキャン完了
- [ ] 本番環境の環境変数が適切に設定
- [ ] HTTPSが有効化されている
- [ ] セキュリティヘッダーが設定されている
- [ ] エラーメッセージで内部情報が漏洩していない

### 定期監査

- [ ] 依存関係の脆弱性チェック（`npm audit`）
- [ ] アクセスログの監視
- [ ] 不正アクセス試行の確認
- [ ] API使用量の異常検知

## 🛠️ セキュリティツール

### 推奨ツール

```bash
# セキュリティ脆弱性チェック
npm audit
npm audit fix

# 型安全性チェック
npx tsc --noEmit

# Lintによるセキュリティチェック
npm run lint
```

### CI/CDでのセキュリティチェック

```yaml
# .github/workflows/security.yml
name: Security Check
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm audit
      - run: npm run lint
      - run: npx tsc --noEmit
```

## 📚 関連ドキュメント

- [開発ガイド](./DEVELOPMENT.md) - セキュアな開発プロセス
- [API仕様](../architecture/API.md) - API認証の詳細
- [データベース設計](../architecture/DATABASE.md) - RLSポリシー
- [環境変数設定](../setup/ENVIRONMENT.md) - 機密情報管理