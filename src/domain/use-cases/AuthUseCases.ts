/**
 * Auth Use Cases
 * 認証に関するビジネスユースケースを定義
 */

import { UserEntity } from '../entities/User'
import { AuthRepositoryInterface, AuthUser, SignInRequest, SignUpRequest } from '../repositories/AuthRepositoryInterface'
import { UserRepositoryInterface } from '../repositories/UserRepositoryInterface'

export interface UseCaseResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface SignInUseCaseRequest {
  email: string
  password: string
}

export interface SignUpUseCaseRequest {
  email: string
  password: string
}

export interface CurrentUserData {
  authUser: AuthUser
  userEntity: UserEntity
}

export class AuthUseCases {
  constructor(
    private _authRepository: AuthRepositoryInterface,
    private _userRepository: UserRepositoryInterface
  ) {}

  /**
   * 現在のユーザーを取得
   */
  async getCurrentUser(): Promise<UseCaseResult<CurrentUserData | null>> {
    try {
      const authResult = await this._authRepository.getCurrentUser()

      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error || 'Failed to get current user'
        }
      }

      if (!authResult.data) {
        return {
          success: true,
          data: null
        }
      }

      const authUser = authResult.data

      // ユーザーエンティティの取得
      const userResult = await this._userRepository.findById(authUser.id)

      if (!userResult.success) {
        return {
          success: false,
          error: userResult.error || 'Failed to get user details'
        }
      }

      if (!userResult.data) {
        // 認証ユーザーは存在するがUserエンティティが存在しない場合、新規作成
        const createResult = await this._userRepository.create({
          id: authUser.id,
          email: authUser.email || ''
        })

        if (!createResult.success) {
          return {
            success: false,
            error: createResult.error || 'Failed to create user profile'
          }
        }

        return {
          success: true,
          data: {
            authUser,
            userEntity: createResult.data!
          }
        }
      }

      return {
        success: true,
        data: {
          authUser,
          userEntity: userResult.data
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * メールアドレスとパスワードでサインイン
   */
  async signInWithEmail(request: SignInUseCaseRequest): Promise<UseCaseResult<CurrentUserData>> {
    try {
      // 入力検証
      if (!request.email || !request.password) {
        return {
          success: false,
          error: 'Email and password are required'
        }
      }

      if (!UserEntity.isValidEmail(request.email)) {
        return {
          success: false,
          error: 'Invalid email format'
        }
      }

      const signInRequest: SignInRequest = {
        email: request.email,
        password: request.password
      }

      const authResult = await this._authRepository.signInWithEmail(signInRequest)

      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error || 'Sign in failed'
        }
      }

      const authUser = authResult.data!

      // ユーザーエンティティの取得または作成
      const userResult = await this._userRepository.findById(authUser.id)

      let userEntity: UserEntity

      if (!userResult.success || !userResult.data) {
        // ユーザーエンティティが存在しない場合は作成
        const createResult = await this._userRepository.create({
          id: authUser.id,
          email: authUser.email || request.email
        })

        if (!createResult.success) {
          return {
            success: false,
            error: createResult.error || 'Failed to create user profile'
          }
        }

        userEntity = createResult.data!
      } else {
        userEntity = userResult.data
      }

      return {
        success: true,
        data: {
          authUser,
          userEntity
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * 新規ユーザー登録
   */
  async signUpWithEmail(request: SignUpUseCaseRequest): Promise<UseCaseResult<CurrentUserData>> {
    try {
      // 入力検証
      if (!request.email || !request.password) {
        return {
          success: false,
          error: 'Email and password are required'
        }
      }

      if (!UserEntity.isValidEmail(request.email)) {
        return {
          success: false,
          error: 'Invalid email format'
        }
      }

      if (request.password.length < 6) {
        return {
          success: false,
          error: 'Password must be at least 6 characters'
        }
      }

      // メールアドレスの重複確認
      const emailTakenResult = await this._userRepository.isEmailTaken(request.email)
      if (emailTakenResult.success && emailTakenResult.data) {
        return {
          success: false,
          error: 'Email address is already registered'
        }
      }

      const signUpRequest: SignUpRequest = {
        email: request.email,
        password: request.password
      }

      const authResult = await this._authRepository.signUpWithEmail(signUpRequest)

      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error || 'Sign up failed'
        }
      }

      const authUser = authResult.data!

      // ユーザーエンティティの作成
      const createResult = await this._userRepository.create({
        id: authUser.id,
        email: authUser.email || request.email
      })

      if (!createResult.success) {
        return {
          success: false,
          error: createResult.error || 'Failed to create user profile'
        }
      }

      return {
        success: true,
        data: {
          authUser,
          userEntity: createResult.data!
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * サインアウト
   */
  async signOut(): Promise<UseCaseResult<void>> {
    try {
      const result = await this._authRepository.signOut()

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Sign out failed'
        }
      }

      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * パスワードリセットメールを送信
   */
  async sendPasswordResetEmail(email: string): Promise<UseCaseResult<void>> {
    try {
      if (!email) {
        return {
          success: false,
          error: 'Email is required'
        }
      }

      if (!UserEntity.isValidEmail(email)) {
        return {
          success: false,
          error: 'Invalid email format'
        }
      }

      const result = await this._authRepository.sendPasswordResetEmail(email)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to send password reset email'
        }
      }

      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * 認証状態の変更を監視
   */
  onAuthStateChange(callback: (_userData: CurrentUserData | null) => void): () => void {
    return this._authRepository.onAuthStateChange(async (authUser) => {
      if (!authUser) {
        callback(null)
        return
      }

      try {
        // ユーザーエンティティの取得
        const userResult = await this._userRepository.findById(authUser.id)

        if (userResult.success && userResult.data) {
          callback({
            authUser,
            userEntity: userResult.data
          })
        } else {
          // ユーザーエンティティが存在しない場合は作成
          const createResult = await this._userRepository.create({
            id: authUser.id,
            email: authUser.email || ''
          })

          if (createResult.success) {
            callback({
              authUser,
              userEntity: createResult.data!
            })
          } else {
            callback(null)
          }
        }
      } catch (error) {
        callback(null)
      }
    })
  }

  /**
   * セッションの有効性を確認
   */
  async validateSession(): Promise<UseCaseResult<boolean>> {
    try {
      const result = await this._authRepository.isSessionValid()

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to validate session'
        }
      }

      return {
        success: true,
        data: result.data || false
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * セッションの更新
   */
  async refreshSession(): Promise<UseCaseResult<CurrentUserData | null>> {
    try {
      const refreshResult = await this._authRepository.refreshSession()

      if (!refreshResult.success) {
        return {
          success: false,
          error: refreshResult.error || 'Failed to refresh session'
        }
      }

      if (!refreshResult.data) {
        return {
          success: true,
          data: null
        }
      }

      const authUser = refreshResult.data

      // ユーザーエンティティの取得
      const userResult = await this._userRepository.findById(authUser.id)

      if (!userResult.success || !userResult.data) {
        return {
          success: false,
          error: 'User profile not found'
        }
      }

      return {
        success: true,
        data: {
          authUser,
          userEntity: userResult.data
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}
