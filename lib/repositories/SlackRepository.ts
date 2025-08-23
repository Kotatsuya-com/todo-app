/**
 * Slack Repository
 * Slack関連データアクセスの責務を担う
 */


import {
  RepositoryContext,
  BaseRepository,
  RepositoryResult,
  RepositoryListResult,
  RepositoryUtils
} from './BaseRepository'
import {
  SlackConnection,
  SlackWebhook,
  SlackEventProcessed
} from '@/lib/entities/SlackConnection'
import { UserWithSettings } from '@/lib/entities/User'

export interface SlackRepositoryInterface {
  // Slack Connections
  findConnectionById(_id: string): Promise<RepositoryResult<SlackConnection>>
  findConnectionsByUserId(_userId: string): Promise<RepositoryListResult<SlackConnection>>
  createConnection(_connection: Omit<SlackConnection, 'id' | 'created_at'>): Promise<RepositoryResult<SlackConnection>>
  upsertConnection(_connection: Omit<SlackConnection, 'id' | 'created_at'>): Promise<RepositoryResult<SlackConnection>>
  deleteConnection(_id: string, _userId: string): Promise<RepositoryResult<void>>

  // User Management
  updateUserSlackId(_userId: string, _slackUserId: string): Promise<RepositoryResult<void>>

  // Slack Webhooks
  findWebhookById(_webhookId: string): Promise<RepositoryResult<SlackWebhook>>
  findWebhooksByUserId(_userId: string): Promise<RepositoryListResult<SlackWebhook>>
  findWebhookByConnectionId(_userId: string, _connectionId: string): Promise<RepositoryResult<SlackWebhook>>
  createWebhook(_webhook: Omit<SlackWebhook, 'id' | 'created_at' | 'updated_at'>): Promise<RepositoryResult<SlackWebhook>>
  updateWebhook(_id: string, _updates: Partial<SlackWebhook>): Promise<RepositoryResult<SlackWebhook>>
  updateWebhookStats(_id: string, _eventCount: number): Promise<RepositoryResult<void>>

  // Bulk operations for disconnection
  deleteWebhooksByConnectionIds(_connectionIds: string[]): Promise<RepositoryResult<void>>
  deleteConnectionsByUserId(_userId: string): Promise<RepositoryResult<void>>
  resetUserSlackId(_userId: string): Promise<RepositoryResult<void>>

  // Event Processing
  findProcessedEvent(_eventKey: string): Promise<RepositoryResult<SlackEventProcessed>>
  createProcessedEvent(_event: Omit<SlackEventProcessed, 'id' | 'processed_at'>): Promise<RepositoryResult<SlackEventProcessed>>

  // User Data for Webhook Processing
  findUserWithSettings(_userId: string): Promise<RepositoryResult<UserWithSettings>>
  getDirectSlackUserId(_userId: string): Promise<RepositoryResult<{ slack_user_id: string | null }>>
}

export class SlackRepository implements SlackRepositoryInterface, BaseRepository {
  constructor(private _context: RepositoryContext) {}

  get client() {
    return this._context.getServiceClient()
  }

  // Slack Connections
  async findConnectionById(id: string): Promise<RepositoryResult<SlackConnection>> {
    const result = await this.client
      .from('slack_connections')
      .select('*')
      .eq('id', id)
      .single()

    return RepositoryUtils.handleSupabaseResult(result)
  }

  async findConnectionsByUserId(_userId: string): Promise<RepositoryListResult<SlackConnection>> {
    const result = await this.client
      .from('slack_connections')
      .select('*')
      .eq('user_id', _userId)
      .order('created_at', { ascending: false })

    return RepositoryUtils.handleSupabaseListResult(result)
  }

  async createConnection(_connection: Omit<SlackConnection, 'id' | 'created_at'>): Promise<RepositoryResult<SlackConnection>> {
    const result = await this.client
      .from('slack_connections')
      .insert(_connection)
      .select()
      .single()

    return RepositoryUtils.handleSupabaseResult(result)
  }

  async deleteConnection(id: string, userId: string): Promise<RepositoryResult<void>> {
    const result = await this.client
      .from('slack_connections')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (result.error) {
      return RepositoryUtils.failure(RepositoryUtils.handleSupabaseResult(result).error!)
    }
    return RepositoryUtils.success(undefined)
  }

  async upsertConnection(_connection: Omit<SlackConnection, 'id' | 'created_at'>): Promise<RepositoryResult<SlackConnection>> {
    const result = await this.client
      .from('slack_connections')
      .upsert(_connection, {
        onConflict: 'user_id,workspace_id'
      })
      .select()
      .single()

    return RepositoryUtils.handleSupabaseResult(result)
  }

  // User Management
  async updateUserSlackId(_userId: string, _slackUserId: string): Promise<RepositoryResult<void>> {
    const result = await this.client
      .from('users')
      .update({ slack_user_id: _slackUserId })
      .eq('id', _userId)
      .select('slack_user_id')

    if (result.error) {
      return RepositoryUtils.failure(RepositoryUtils.handleSupabaseResult(result).error!)
    }
    return RepositoryUtils.success(undefined)
  }

  // Slack Webhooks
  async findWebhookById(_webhookId: string): Promise<RepositoryResult<SlackWebhook>> {
    const result = await this.client
      .from('user_slack_webhooks')
      .select('*')
      .eq('webhook_id', _webhookId)
      .eq('is_active', true)
      .single()

    return RepositoryUtils.handleSupabaseResult(result)
  }

  async findWebhooksByUserId(_userId: string): Promise<RepositoryListResult<SlackWebhook>> {
    const result = await this.client
      .from('user_slack_webhooks')
      .select(`
        id,
        user_id,
        slack_connection_id,
        webhook_id,
        webhook_secret,
        is_active,
        last_event_at,
        event_count,
        created_at,
        updated_at
      `)
      .eq('user_id', _userId)
      .order('created_at', { ascending: false })

    return RepositoryUtils.handleSupabaseListResult(result)
  }

  async findWebhookByConnectionId(_userId: string, _connectionId: string): Promise<RepositoryResult<SlackWebhook>> {
    const result = await this.client
      .from('user_slack_webhooks')
      .select('*')
      .eq('user_id', _userId)
      .eq('slack_connection_id', _connectionId)
      .single()

    return RepositoryUtils.handleSupabaseResult(result)
  }

  async createWebhook(_webhook: Omit<SlackWebhook, 'id' | 'created_at' | 'updated_at'>): Promise<RepositoryResult<SlackWebhook>> {
    // RPC関数を使用してWebhookを作成
    const result = await this.client
      .rpc('create_user_slack_webhook', {
        p_user_id: _webhook.user_id,
        p_slack_connection_id: _webhook.slack_connection_id
      })

    if (result.error) {
      return RepositoryUtils.failure(RepositoryUtils.handleSupabaseResult(result).error!)
    }

    // RPCの結果は配列で返される場合があるので、最初の要素を取得
    const newWebhook = Array.isArray(result.data) ? result.data[0] : result.data
    return RepositoryUtils.success(newWebhook)
  }

  async updateWebhook(_id: string, _updates: Partial<SlackWebhook>): Promise<RepositoryResult<SlackWebhook>> {
    const result = await this.client
      .from('user_slack_webhooks')
      .update(_updates)
      .eq('id', _id)
      .select()
      .single()

    return RepositoryUtils.handleSupabaseResult(result)
  }

  async updateWebhookStats(_id: string, _eventCount: number): Promise<RepositoryResult<void>> {
    const result = await this.client
      .from('user_slack_webhooks')
      .update({
        last_event_at: new Date().toISOString(),
        event_count: _eventCount
      })
      .eq('id', _id)

    if (result.error) {
      return RepositoryUtils.failure(RepositoryUtils.handleSupabaseResult(result).error!)
    }
    return RepositoryUtils.success(undefined)
  }

  // Event Processing
  async findProcessedEvent(_eventKey: string): Promise<RepositoryResult<SlackEventProcessed>> {
    const result = await this.client
      .from('slack_event_processed')
      .select('*')
      .eq('event_key', _eventKey)
      .single()

    return RepositoryUtils.handleSupabaseResult(result)
  }

  async createProcessedEvent(_event: Omit<SlackEventProcessed, 'id' | 'processed_at'>): Promise<RepositoryResult<SlackEventProcessed>> {
    const result = await this.client
      .from('slack_event_processed')
      .insert({
        ..._event,
        processed_at: new Date().toISOString()
      })
      .select()
      .single()

    return RepositoryUtils.handleSupabaseResult(result)
  }

  // User Data for Webhook Processing
  async findUserWithSettings(_userId: string): Promise<RepositoryResult<UserWithSettings>> {
    const result = await this.client
      .from('users')
      .select(`
        id,
        slack_user_id,
        enable_webhook_notifications,
        created_at,
        user_emoji_settings (
          id,
          user_id,
          today_emoji,
          tomorrow_emoji,
          later_emoji,
          created_at,
          updated_at
        )
      `)
      .eq('id', _userId)
      .single()

    return RepositoryUtils.handleSupabaseResult(result)
  }

  // Debug methods
  async getAllWebhooks(): Promise<RepositoryListResult<any>> {
    const result = await this.client
      .from('user_slack_webhooks')
      .select('webhook_id, is_active, user_id')

    return RepositoryUtils.handleSupabaseListResult(result)
  }

  async getDirectSlackUserId(_userId: string): Promise<RepositoryResult<{ slack_user_id: string | null }>> {
    const result = await this.client
      .from('users')
      .select('slack_user_id')
      .eq('id', _userId)
      .single()

    return RepositoryUtils.handleSupabaseResult(result)
  }

  // Bulk operations for disconnection
  async deleteWebhooksByConnectionIds(_connectionIds: string[]): Promise<RepositoryResult<void>> {
    const result = await this.client
      .from('user_slack_webhooks')
      .delete()
      .in('slack_connection_id', _connectionIds)

    if (result.error) {
      return RepositoryUtils.failure(RepositoryUtils.handleSupabaseResult(result).error!)
    }
    return RepositoryUtils.success(undefined)
  }

  async deleteConnectionsByUserId(_userId: string): Promise<RepositoryResult<void>> {
    const result = await this.client
      .from('slack_connections')
      .delete()
      .eq('user_id', _userId)

    if (result.error) {
      return RepositoryUtils.failure(RepositoryUtils.handleSupabaseResult(result).error!)
    }
    return RepositoryUtils.success(undefined)
  }

  async resetUserSlackId(_userId: string): Promise<RepositoryResult<void>> {
    const result = await this.client
      .from('users')
      .update({ slack_user_id: null })
      .eq('id', _userId)

    if (result.error) {
      return RepositoryUtils.failure(RepositoryUtils.handleSupabaseResult(result).error!)
    }
    return RepositoryUtils.success(undefined)
  }
}
