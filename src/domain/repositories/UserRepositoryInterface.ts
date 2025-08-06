/**
 * User Repository Interface
 * Userデータアクセスの抽象化インターフェース
 */

import { UserEntity } from '../entities/User'

export interface CreateUserRequest {
  id: string
  display_name?: string | null
  avatar_url?: string | null
  slack_user_id?: string | null
  enable_webhook_notifications?: boolean
}

export interface UpdateUserRequest {
  id: string
  display_name?: string | null
  avatar_url?: string | null
  slack_user_id?: string | null
  enable_webhook_notifications?: boolean
}

export interface RepositoryResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface UserRepositoryInterface {
  /**
   * IDでユーザーを取得
   */
  findById(_id: string): Promise<RepositoryResult<UserEntity | null>>

  /**
   * 新しいユーザーを作成
   */
  create(_request: CreateUserRequest): Promise<RepositoryResult<UserEntity>>

  /**
   * 既存のユーザーを更新
   */
  update(_request: UpdateUserRequest): Promise<RepositoryResult<UserEntity>>

  /**
   * ユーザーを削除
   */
  delete(_id: string): Promise<RepositoryResult<void>>

  /**
   * ユーザーの存在確認
   */
  exists(_id: string): Promise<RepositoryResult<boolean>>

  /**
   * 全ユーザーを取得（管理用）
   */
  findAll(): Promise<RepositoryResult<UserEntity[]>>

  /**
   * アクティブユーザーを取得
   */
  findActiveUsers(): Promise<RepositoryResult<UserEntity[]>>

  /**
   * 新規ユーザーを取得（作成から7日以内）
   */
  findNewUsers(): Promise<RepositoryResult<UserEntity[]>>

  /**
   * Slack連携済みユーザーを取得
   */
  findSlackUsers(): Promise<RepositoryResult<UserEntity[]>>
}
