/**
 * Auth Repository Interface
 * 認証関連のデータアクセス抽象化インターフェース
 */


export interface AuthUser {
  id: string
  email?: string
  emailVerified?: boolean
  lastSignInAt?: string
}

export interface SignInRequest {
  email: string
  password: string
}

export interface SignUpRequest {
  email: string
  password: string
}

export interface RepositoryResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface AuthRepositoryInterface {
  /**
   * 現在認証されているユーザーを取得
   */
  getCurrentUser(): Promise<RepositoryResult<AuthUser | null>>

  /**
   * メールアドレスとパスワードでサインイン
   */
  signInWithEmail(_request: SignInRequest): Promise<RepositoryResult<AuthUser>>

  /**
   * 新規ユーザー登録
   */
  signUpWithEmail(_request: SignUpRequest): Promise<RepositoryResult<AuthUser>>

  /**
   * サインアウト
   */
  signOut(): Promise<RepositoryResult<void>>

  /**
   * 認証状態の変更を監視
   */
  onAuthStateChange(_callback: (_user: AuthUser | null) => void): () => void

  /**
   * パスワードリセットメールを送信
   */
  sendPasswordResetEmail(_email: string): Promise<RepositoryResult<void>>

  /**
   * メールアドレス確認メールを再送信
   */
  resendConfirmationEmail(): Promise<RepositoryResult<void>>

  /**
   * 認証トークンを取得
   */
  getAccessToken(): Promise<RepositoryResult<string | null>>

  /**
   * 認証トークンをリフレッシュ
   */
  refreshSession(): Promise<RepositoryResult<AuthUser | null>>

  /**
   * ユーザーセッションの有効性を確認
   */
  isSessionValid(): Promise<RepositoryResult<boolean>>
}
