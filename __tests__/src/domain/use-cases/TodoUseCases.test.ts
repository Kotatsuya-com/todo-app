/**
 * TodoUseCases Test Suite
 * TodoUseCasesのビジネスロジックテスト
 */

import { TodoUseCases } from '../../../../src/domain/use-cases/TodoUseCases'
import { TodoEntity } from '../../../../src/domain/entities/Todo'
import { TodoRepositoryInterface } from '../../../../src/domain/repositories/TodoRepositoryInterface'

// Mock Repository
class MockTodoRepository implements TodoRepositoryInterface {
  private todos: TodoEntity[] = []
  private nextId = 1

  async findById(id: string): Promise<{ success: boolean; data?: TodoEntity; error?: string }> {
    const todo = this.todos.find(t => t.id === id)
    return todo 
      ? { success: true, data: todo }
      : { success: false, error: 'Todo not found' }
  }

  async findByUserId(userId: string): Promise<{ success: boolean; data?: TodoEntity[]; error?: string }> {
    const userTodos = this.todos.filter(t => t.userId === userId)
    return { success: true, data: userTodos }
  }

  async create(todo: Omit<TodoEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data?: TodoEntity; error?: string }> {
    const newTodo = new TodoEntity({
      ...todo,
      id: `todo-${this.nextId++}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    this.todos.push(newTodo)
    return { success: true, data: newTodo }
  }

  async update(id: string, updates: Partial<Pick<TodoEntity, 'title' | 'body' | 'deadline' | 'importanceScore' | 'status'>>): Promise<{ success: boolean; data?: TodoEntity; error?: string }> {
    const index = this.todos.findIndex(t => t.id === id)
    if (index === -1) {
      return { success: false, error: 'Todo not found' }
    }

    const updatedTodo = new TodoEntity({
      ...this.todos[index],
      ...updates,
      updatedAt: new Date().toISOString()
    })
    this.todos[index] = updatedTodo
    return { success: true, data: updatedTodo }
  }

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const index = this.todos.findIndex(t => t.id === id)
    if (index === -1) {
      return { success: false, error: 'Todo not found' }
    }
    this.todos.splice(index, 1)
    return { success: true }
  }

  async findActiveByUserId(userId: string): Promise<{ success: boolean; data?: TodoEntity[]; error?: string }> {
    const activeTodos = this.todos.filter(t => t.userId === userId && t.status === 'active')
    return { success: true, data: activeTodos }
  }

  async findCompletedByUserId(userId: string): Promise<{ success: boolean; data?: TodoEntity[]; error?: string }> {
    const completedTodos = this.todos.filter(t => t.userId === userId && t.status === 'completed')
    return { success: true, data: completedTodos }
  }

  async findOverdueByUserId(userId: string): Promise<{ success: boolean; data?: TodoEntity[]; error?: string }> {
    const overdueTodos = this.todos.filter(t => t.userId === userId && t.isOverdue())
    return { success: true, data: overdueTodos }
  }

  // Helper method for tests
  setTodos(todos: TodoEntity[]) {
    this.todos = todos
  }

  getTodos(): TodoEntity[] {
    return this.todos
  }
}

describe('TodoUseCases', () => {
  let mockRepository: MockTodoRepository
  let todoUseCases: TodoUseCases

  const userId = 'test-user-id'

  beforeEach(() => {
    mockRepository = new MockTodoRepository()
    todoUseCases = new TodoUseCases(mockRepository)
  })

  describe('createTodo', () => {
    it('should create a new todo successfully', async () => {
      const params = {
        userId,
        title: 'Test Todo',
        body: 'Test description',
        deadline: '2025-08-10',
        createdVia: 'manual' as const
      }

      const result = await todoUseCases.createTodo(params)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.title).toBe('Test Todo')
      expect(result.data!.body).toBe('Test description')
      expect(result.data!.userId).toBe(userId)
      expect(result.data!.createdVia).toBe('manual')
    })

    it('should create todo with default importance score', async () => {
      const params = {
        userId,
        body: 'Test todo without importance',
        createdVia: 'manual' as const
      }

      const result = await todoUseCases.createTodo(params)

      expect(result.success).toBe(true)
      expect(result.data!.importanceScore).toBe(TodoEntity.DEFAULT_IMPORTANCE_SCORE)
    })

    it('should validate todo data before creation', async () => {
      const params = {
        userId,
        body: '', // Invalid: empty body
        createdVia: 'manual' as const
      }

      const result = await todoUseCases.createTodo(params)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Body is required')
    })

    it('should handle repository errors', async () => {
      // Mock repository to fail
      const failingRepository = {
        ...mockRepository,
        create: jest.fn().mockResolvedValue({ success: false, error: 'Database error' })
      } as any

      const useCases = new TodoUseCases(failingRepository)
      
      const params = {
        userId,
        body: 'Valid todo',
        createdVia: 'manual' as const
      }

      const result = await useCases.createTodo(params)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('updateTodo', () => {
    let existingTodo: TodoEntity

    beforeEach(async () => {
      const createResult = await todoUseCases.createTodo({
        userId,
        body: 'Original todo',
        createdVia: 'manual'
      })
      existingTodo = createResult.data!
    })

    it('should update todo successfully', async () => {
      const updates = {
        title: 'Updated Title',
        body: 'Updated body',
        deadline: '2025-08-15'
      }

      const result = await todoUseCases.updateTodo({
        id: existingTodo.id,
        userId,
        updates
      })

      expect(result.success).toBe(true)
      expect(result.data!.title).toBe('Updated Title')
      expect(result.data!.body).toBe('Updated body')
      expect(result.data!.deadline).toBe('2025-08-15')
    })

    it('should validate updated data', async () => {
      const updates = {
        body: '' // Invalid: empty body
      }

      const result = await todoUseCases.updateTodo({
        id: existingTodo.id,
        userId,
        updates
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Body is required')
    })

    it('should handle non-existent todo', async () => {
      const result = await todoUseCases.updateTodo({
        id: 'non-existent-id',
        userId,
        updates: { body: 'Updated' }
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Todo not found')
    })
  })

  describe('completeTodo', () => {
    let existingTodo: TodoEntity

    beforeEach(async () => {
      const createResult = await todoUseCases.createTodo({
        userId,
        body: 'Todo to complete',
        createdVia: 'manual'
      })
      existingTodo = createResult.data!
    })

    it('should complete todo successfully', async () => {
      const result = await todoUseCases.completeTodo({
        id: existingTodo.id,
        userId
      })

      expect(result.success).toBe(true)
      expect(result.data!.status).toBe('completed')
    })

    it('should handle non-existent todo', async () => {
      const result = await todoUseCases.completeTodo({
        id: 'non-existent-id',
        userId
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Todo not found')
    })
  })

  describe('reopenTodo', () => {
    let completedTodo: TodoEntity

    beforeEach(async () => {
      const createResult = await todoUseCases.createTodo({
        userId,
        body: 'Todo to reopen',
        createdVia: 'manual'
      })
      const completeResult = await todoUseCases.completeTodo({
        id: createResult.data!.id,
        userId
      })
      completedTodo = completeResult.data!
    })

    it('should reopen completed todo successfully', async () => {
      const result = await todoUseCases.reopenTodo({
        id: completedTodo.id,
        userId
      })

      expect(result.success).toBe(true)
      expect(result.data!.status).toBe('active')
    })
  })

  describe('deleteTodo', () => {
    let existingTodo: TodoEntity

    beforeEach(async () => {
      const createResult = await todoUseCases.createTodo({
        userId,
        body: 'Todo to delete',
        createdVia: 'manual'
      })
      existingTodo = createResult.data!
    })

    it('should delete todo successfully', async () => {
      const result = await todoUseCases.deleteTodo({
        id: existingTodo.id,
        userId
      })

      expect(result.success).toBe(true)

      // Verify todo is deleted
      const getResult = await todoUseCases.getTodoById({
        id: existingTodo.id,
        userId
      })
      expect(getResult.success).toBe(false)
    })
  })

  describe('getTodoById', () => {
    let existingTodo: TodoEntity

    beforeEach(async () => {
      const createResult = await todoUseCases.createTodo({
        userId,
        body: 'Todo to find',
        createdVia: 'manual'
      })
      existingTodo = createResult.data!
    })

    it('should retrieve todo by ID', async () => {
      const result = await todoUseCases.getTodoById({
        id: existingTodo.id,
        userId
      })

      expect(result.success).toBe(true)
      expect(result.data!.id).toBe(existingTodo.id)
      expect(result.data!.body).toBe('Todo to find')
    })

    it('should handle non-existent todo', async () => {
      const result = await todoUseCases.getTodoById({
        id: 'non-existent-id',
        userId
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Todo not found')
    })
  })

  describe('getTodoDashboard', () => {
    beforeEach(async () => {
      // Create test todos with different characteristics
      await todoUseCases.createTodo({
        userId,
        body: 'Urgent and important',
        deadline: new Date().toISOString().split('T')[0], // Today
        importanceScore: 1500,
        createdVia: 'manual'
      })

      await todoUseCases.createTodo({
        userId,
        body: 'Not urgent but important',
        deadline: '2025-08-10',
        importanceScore: 1500,
        createdVia: 'manual'
      })

      await todoUseCases.createTodo({
        userId,
        body: 'Urgent but not important',
        deadline: new Date().toISOString().split('T')[0], // Today
        importanceScore: 800,
        createdVia: 'manual'
      })

      await todoUseCases.createTodo({
        userId,
        body: 'Not urgent and not important',
        deadline: '2025-08-10',
        importanceScore: 800,
        createdVia: 'manual'
      })

      // Create a completed todo
      const completeResult = await todoUseCases.createTodo({
        userId,
        body: 'Completed todo',
        createdVia: 'manual'
      })
      await todoUseCases.completeTodo({
        id: completeResult.data!.id,
        userId
      })
    })

    it('should return dashboard with quadrants and stats', async () => {
      const result = await todoUseCases.getTodoDashboard({
        userId,
        includeCompleted: false,
        overdueOnly: false
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()

      const { todos, quadrants, stats } = result.data!

      // Should have 4 active todos (excluding completed)
      expect(todos).toHaveLength(4)

      // Check quadrants have correct todos
      expect(quadrants.urgent_important).toHaveLength(1)
      expect(quadrants.not_urgent_important).toHaveLength(1)
      expect(quadrants.urgent_not_important).toHaveLength(1)
      expect(quadrants.not_urgent_not_important).toHaveLength(1)

      // Check stats
      expect(stats.total).toBe(5) // Including completed
      expect(stats.active).toBe(4)
      expect(stats.completed).toBe(1)
      expect(stats.overdue).toBeGreaterThanOrEqual(0)
    })

    it('should include completed todos when requested', async () => {
      const result = await todoUseCases.getTodoDashboard({
        userId,
        includeCompleted: true,
        overdueOnly: false
      })

      expect(result.success).toBe(true)
      expect(result.data!.todos).toHaveLength(5) // Including completed todo
    })

    it('should filter overdue only when requested', async () => {
      const result = await todoUseCases.getTodoDashboard({
        userId,
        includeCompleted: false,
        overdueOnly: true
      })

      expect(result.success).toBe(true)
      // Check that only overdue todos are returned
      result.data!.todos.forEach(todo => {
        expect(todo.isOverdue()).toBe(true)
      })
    })

    it('should handle empty todo list', async () => {
      const emptyUserId = 'empty-user'
      
      const result = await todoUseCases.getTodoDashboard({
        userId: emptyUserId,
        includeCompleted: false,
        overdueOnly: false
      })

      expect(result.success).toBe(true)
      expect(result.data!.todos).toHaveLength(0)
      expect(result.data!.stats.total).toBe(0)
      expect(result.data!.stats.active).toBe(0)
      expect(result.data!.stats.completed).toBe(0)
      expect(result.data!.stats.overdue).toBe(0)
    })
  })

  describe('getUserTodos', () => {
    beforeEach(async () => {
      await todoUseCases.createTodo({
        userId,
        body: 'User todo 1',
        createdVia: 'manual'
      })

      await todoUseCases.createTodo({
        userId,
        body: 'User todo 2',
        createdVia: 'slack_webhook'
      })

      // Create todo for different user
      await todoUseCases.createTodo({
        userId: 'other-user',
        body: 'Other user todo',
        createdVia: 'manual'
      })
    })

    it('should return todos for specific user only', async () => {
      const result = await todoUseCases.getUserTodos({ userId })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      result.data!.forEach(todo => {
        expect(todo.userId).toBe(userId)
      })
    })

    it('should return empty array for user with no todos', async () => {
      const result = await todoUseCases.getUserTodos({ userId: 'no-todos-user' })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      const errorRepository = {
        findById: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      } as any

      const useCases = new TodoUseCases(errorRepository)

      const result = await useCases.getTodoById({
        id: 'test-id',
        userId: 'test-user'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection failed')
    })

    it('should handle unexpected errors', async () => {
      const errorRepository = {
        findById: jest.fn().mockRejectedValue('Unexpected error')
      } as any

      const useCases = new TodoUseCases(errorRepository)

      const result = await useCases.getTodoById({
        id: 'test-id',
        userId: 'test-user'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error occurred')
    })
  })
})