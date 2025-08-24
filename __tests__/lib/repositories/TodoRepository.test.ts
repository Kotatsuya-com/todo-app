/**
 * @jest-environment node
 */

import { TodoRepository, TodoRepositoryInterface } from '@/lib/repositories/TodoRepository'
import { RepositoryContext, RepositoryUtils } from '@/lib/repositories/BaseRepository'
import { SupabaseClient } from '@supabase/supabase-js'
import { mock, MockProxy } from 'jest-mock-extended'
import {
  createMockTodo,
  createMockComparison,
  createMockCompletionLog
} from '@/__tests__/fixtures/entities.fixture'
import { createSupabaseSuccessResponse, createSupabaseErrorResponse } from '@/__tests__/utils/testUtilities'

describe('TodoRepository', () => {
  let repository: TodoRepository
  let mockSupabaseClient: MockProxy<SupabaseClient>
  let mockContext: MockProxy<RepositoryContext>

  beforeEach(() => {
    mockSupabaseClient = mock<SupabaseClient>()
    mockContext = mock<RepositoryContext>()
    mockContext.getServiceClient.mockReturnValue(mockSupabaseClient)
    mockContext.getAuthenticatedClient.mockReturnValue(mockSupabaseClient)
    repository = new TodoRepository(mockContext)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('findById', () => {
    it('should return todo successfully', async () => {
      const mockTodo = createMockTodo({})
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockTodo, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findById('todo-123')

      expect(result.data).toEqual(mockTodo)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('todos')
      expect(mockFromResult.select).toHaveBeenCalledWith('*')
      expect(mockFromResult.eq).toHaveBeenCalledWith('id', 'todo-123')
      expect(mockFromResult.single).toHaveBeenCalled()
    })

    it('should handle not found error', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findById('non-existent')

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('JSON object requested')
    })

    it('should handle database error', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'DB_ERROR', message: 'Database connection failed' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findById('todo-123')

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Database connection failed')
    })
  })

  describe('findByUserId', () => {
    it('should return todos list successfully', async () => {
      const mockTodos = [
        createMockTodo({ id: 'todo-1', importance_score: 0.8 }),
        createMockTodo({ id: 'todo-2', importance_score: 0.6 }),
        createMockTodo({ id: 'todo-3', importance_score: 0.4 })
      ]
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: mockTodos, error: null })
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByUserId('user-123')

      expect(result.data).toEqual(mockTodos)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('todos')
      expect(mockFromResult.eq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(mockFromResult.order).toHaveBeenCalledWith('importance_score', { ascending: false })
    })

    it('should return empty array when no todos found', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByUserId('user-123')

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })

    it('should handle user with no todos', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findByUserId('empty-user')

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })
  })

  describe('create', () => {
    it('should create todo successfully', async () => {
      const todoData = {
        user_id: 'user-123',
        title: 'Test Todo',
        body: 'Test description',
        deadline: '2025-12-31',
        importance_score: 0.7,
        status: 'open' as const,
        created_via: 'manual' as const
      }
      const mockCreatedTodo = createMockTodo(todoData)

      const mockFromResult = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedTodo, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.create(todoData)

      expect(result.data).toEqual(mockCreatedTodo)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('todos')
      expect(mockFromResult.insert).toHaveBeenCalledWith(todoData)
    })

    it('should handle creation failure', async () => {
      const todoData = {
        user_id: 'user-123',
        title: 'Test Todo',
        body: 'Test description',
        deadline: null,
        importance_score: 0.5,
        status: 'open' as const,
        created_via: 'manual' as const
      }

      const mockFromResult = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'CONSTRAINT_VIOLATION', message: 'Invalid data' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.create(todoData)

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Invalid data')
    })

    it('should handle missing required fields', async () => {
      const todoData = {
        user_id: '',
        title: '',
        body: '',
        deadline: null,
        importance_score: 0.5,
        status: 'open' as const,
        created_via: 'manual' as const
      }

      const mockFromResult = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'NOT_NULL_VIOLATION', message: 'Title cannot be null' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.create(todoData)

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Title cannot be null')
    })
  })

  describe('update', () => {
    it('should update todo successfully', async () => {
      const updates = {
        title: 'Updated Todo',
        importance_score: 0.9,
        status: 'done' as const
      }
      const mockUpdatedTodo = createMockTodo({ ...updates })

      const mockFromResult = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUpdatedTodo, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.update('todo-123', updates)

      expect(result.data).toEqual(mockUpdatedTodo)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('todos')
      expect(mockFromResult.update).toHaveBeenCalledWith({
        ...updates,
        updated_at: expect.any(String)
      })
      expect(mockFromResult.eq).toHaveBeenCalledWith('id', 'todo-123')
    })

    it('should handle update failure', async () => {
      const updates = { title: 'Updated Todo' }

      const mockFromResult = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Todo not found' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.update('non-existent', updates)

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Todo not found')
    })
  })

  describe('delete', () => {
    it('should delete todo successfully', async () => {
      const mockFromResult = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.delete('todo-123')

      expect(result.data).toBeUndefined()
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('todos')
      expect(mockFromResult.delete).toHaveBeenCalled()
      expect(mockFromResult.eq).toHaveBeenCalledWith('id', 'todo-123')
    })

    it('should handle deletion failure', async () => {
      const mockFromResult = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: { code: 'NOT_FOUND', message: 'Todo not found' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.delete('non-existent')

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
    })
  })

  describe('createViaRPC', () => {
    it('should create todo via RPC successfully', async () => {
      const rpcData = {
        p_user_id: 'user-123',
        p_title: 'RPC Todo',
        p_body: 'Created via RPC',
        p_deadline: '2025-12-31',
        p_importance_score: 0.7,
        p_status: 'open',
        p_created_via: 'slack'
      }
      const mockCreatedTodo = createMockTodo({
        user_id: rpcData.p_user_id,
        title: rpcData.p_title,
        body: rpcData.p_body,
        deadline: rpcData.p_deadline,
        importance_score: rpcData.p_importance_score,
        status: rpcData.p_status as any,
        created_via: rpcData.p_created_via as any
      })

      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockCreatedTodo,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      })

      const result = await repository.createViaRPC(rpcData)

      expect(result.data).toEqual(mockCreatedTodo)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('insert_todo_for_user', rpcData)
    })

    it('should handle RPC failure', async () => {
      const rpcData = {
        p_user_id: 'user-123',
        p_title: 'RPC Todo',
        p_body: 'Created via RPC',
        p_deadline: null,
        p_importance_score: 0.5,
        p_status: 'open',
        p_created_via: 'slack'
      }

      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: {
          code: 'RPC_ERROR',
          message: 'Function execution failed',
          details: 'RPC function failed to execute',
          hint: 'Check function parameters',
          name: 'PostgrestError'
        },
        count: null,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const result = await repository.createViaRPC(rpcData)

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Function execution failed')
    })
  })

  describe('findComparisonsByUserId', () => {
    it('should return comparisons successfully', async () => {
      const mockComparisons = [
        createMockComparison({ id: 'comp-1' }),
        createMockComparison({ id: 'comp-2' })
      ]
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockComparisons, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findComparisonsByUserId('user-123')

      expect(result.data).toEqual(mockComparisons)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('comparisons')
      expect(mockFromResult.eq).toHaveBeenCalledWith('user_id', 'user-123')
    })

    it('should return empty array when no comparisons found', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findComparisonsByUserId('user-123')

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })
  })

  describe('createComparison', () => {
    it('should create comparison successfully', async () => {
      const comparisonData = {
        user_id: 'user-123',
        todo_a_id: 'todo-1',
        todo_b_id: 'todo-2',
        winner_id: 'todo-1',
        loser_id: 'todo-2'
      }
      const mockCreatedComparison = createMockComparison(comparisonData)

      const mockFromResult = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedComparison, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.createComparison(comparisonData)

      expect(result.data).toEqual(mockCreatedComparison)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('comparisons')
      expect(mockFromResult.insert).toHaveBeenCalledWith(comparisonData)
    })
  })

  describe('deleteComparisonsForTodo', () => {
    it('should delete comparisons for todo successfully', async () => {
      const mockFromResult = {
        delete: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.deleteComparisonsForTodo('todo-123')

      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('comparisons')
      expect(mockFromResult.or).toHaveBeenCalledWith('winner_id.eq.todo-123,loser_id.eq.todo-123')
    })
  })

  describe('createCompletionLog', () => {
    it('should create completion log successfully', async () => {
      const logData = {
        user_id: 'user-123',
        todo_id: 'todo-123',
        quadrant: 'urgent_important' as const,
        completed_at: new Date().toISOString()
      }
      const mockCreatedLog = createMockCompletionLog(logData)

      const mockFromResult = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockCreatedLog, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.createCompletionLog(logData)

      expect(result.data).toEqual(mockCreatedLog)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('completion_log')
      expect(mockFromResult.insert).toHaveBeenCalledWith(logData)
    })
  })

  describe('deleteCompletionLogForTodo', () => {
    it('should delete completion log for todo successfully', async () => {
      const mockFromResult = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.deleteCompletionLogForTodo('todo-123')

      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('completion_log')
      expect(mockFromResult.eq).toHaveBeenCalledWith('todo_id', 'todo-123')
    })
  })

  describe('updateImportanceScores', () => {
    it('should update importance scores successfully', async () => {
      const updates = [
        { id: 'todo-1', importance_score: 0.8 },
        { id: 'todo-2', importance_score: 0.6 },
        { id: 'todo-3', importance_score: 0.4 }
      ]

      // Mock individual update operations for Promise.all
      const mockFromResult = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.updateImportanceScores(updates)

      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('todos')
      expect(mockFromResult.update).toHaveBeenCalledTimes(3)
    })

    it('should handle bulk update failure', async () => {
      const updates = [
        { id: 'todo-1', importance_score: 0.8 }
      ]

      // Mock individual update operation that fails
      const mockFromResult = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: {
            code: 'UPDATE_ERROR',
            message: 'Failed to update todo'
          }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.updateImportanceScores(updates)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Bulk update failed: Error: Failed to update 1 todos')
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Network error'))
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      await expect(repository.findById('todo-123')).rejects.toThrow('Network error')
    })

    it('should handle empty parameters', async () => {
      const mockFromResult = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.findById('')

      expect(mockFromResult.eq).toHaveBeenCalledWith('id', '')
    })

    it('should handle invalid score values', async () => {
      const updates = [
        { id: 'todo-1', importance_score: -1 },
        { id: 'todo-2', importance_score: 2 }
      ]

      // Mock individual update operations with invalid score error
      const mockFromResult = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: {
            code: 'CHECK_VIOLATION',
            message: 'Invalid importance score'
          }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.updateImportanceScores(updates)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Bulk update failed: Error: Failed to update 2 todos')
    })

    it('should handle large dataset operations', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `todo-${i}`,
        importance_score: Math.random()
      }))

      // Mock individual update operations for large dataset
      const mockFromResult = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.updateImportanceScores(largeDataset)

      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('todos')
      expect(mockFromResult.update).toHaveBeenCalledTimes(1000)
    })

    it('should handle malformed dates in creation', async () => {
      const todoData = {
        user_id: 'user-123',
        title: 'Test Todo',
        body: 'Test description',
        deadline: 'invalid-date',
        importance_score: 0.5,
        status: 'open' as const,
        created_via: 'manual' as const
      }

      const mockFromResult = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'INVALID_TEXT_REPRESENTATION', message: 'Invalid date format' }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockFromResult as any)

      const result = await repository.create(todoData)

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Invalid date format')
    })
  })
})
