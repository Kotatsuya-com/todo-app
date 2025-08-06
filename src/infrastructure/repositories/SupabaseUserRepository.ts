/**
 * Supabase User Repository Implementation
 * SupabaseによるUserデータアクセス実装
 */

import { createClient } from '@/lib/supabase'
import { UserEntity } from '../../domain/entities/User'
import {
  UserRepositoryInterface,
  CreateUserRequest,
  UpdateUserRequest,
  RepositoryResult
} from '../../domain/repositories/UserRepositoryInterface'

export class SupabaseUserRepository implements UserRepositoryInterface {
  private supabase = createClient()

  /**
   * IDでユーザーを取得
   */
  async findById(id: string): Promise<RepositoryResult<UserEntity | null>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return {
            success: true,
            data: null
          }
        }
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: UserEntity.fromApiResponse(data)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }


  /**
   * 新しいユーザーを作成
   */
  async create(request: CreateUserRequest): Promise<RepositoryResult<UserEntity>> {
    try {
      const now = new Date().toISOString()

      const userData = {
        id: request.id,
        display_name: request.display_name || null,
        avatar_url: request.avatar_url || null,
        slack_user_id: request.slack_user_id || null,
        enable_webhook_notifications: request.enable_webhook_notifications ?? true,
        created_at: now
      }

      const { data, error } = await this.supabase
        .from('users')
        .insert(userData)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: UserEntity.fromApiResponse(data)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * 既存のユーザーを更新
   */
  async update(request: UpdateUserRequest): Promise<RepositoryResult<UserEntity>> {
    try {
      const updateData: any = {}

      if (request.display_name !== undefined) {
        updateData.display_name = request.display_name
      }

      if (request.avatar_url !== undefined) {
        updateData.avatar_url = request.avatar_url
      }

      if (request.slack_user_id !== undefined) {
        updateData.slack_user_id = request.slack_user_id
      }

      if (request.enable_webhook_notifications !== undefined) {
        updateData.enable_webhook_notifications = request.enable_webhook_notifications
      }

      const { data, error } = await this.supabase
        .from('users')
        .update(updateData)
        .eq('id', request.id)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: UserEntity.fromApiResponse(data)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * ユーザーを削除
   */
  async delete(id: string): Promise<RepositoryResult<void>> {
    try {
      // カスケード削除はデータベース側で設定されている前提
      // 必要に応じて関連データの削除処理を追加

      const { error } = await this.supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) {
        return {
          success: false,
          error: error.message
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
   * ユーザーの存在確認
   */
  async exists(id: string): Promise<RepositoryResult<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return {
            success: true,
            data: false
          }
        }
        return {
          success: false,
          error: error.message
        }
      }

      return {
        success: true,
        data: !!data
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }


  /**
   * 全ユーザーを取得（管理用）
   */
  async findAll(): Promise<RepositoryResult<UserEntity[]>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      const users = (data || []).map(item => UserEntity.fromApiResponse(item))

      return {
        success: true,
        data: users
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * アクティブユーザーを取得
   */
  async findActiveUsers(): Promise<RepositoryResult<UserEntity[]>> {
    try {
      // TODOが1つ以上あるユーザーをアクティブとみなす
      const { data, error } = await this.supabase
        .from('users')
        .select('*, todos!inner(id)')
        .order('created_at', { ascending: false })

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      const users = (data || []).map(item => UserEntity.fromApiResponse(item))

      return {
        success: true,
        data: users
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * 新規ユーザーを取得（作成から7日以内）
   */
  async findNewUsers(): Promise<RepositoryResult<UserEntity[]>> {
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      const users = (data || []).map(item => UserEntity.fromApiResponse(item))

      return {
        success: true,
        data: users
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Slack連携済みユーザーを取得
   */
  async findSlackUsers(): Promise<RepositoryResult<UserEntity[]>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .not('slack_user_id', 'is', null)
        .order('created_at', { ascending: false })

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      const users = (data || []).map(item => UserEntity.fromApiResponse(item))

      return {
        success: true,
        data: users
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }
}
