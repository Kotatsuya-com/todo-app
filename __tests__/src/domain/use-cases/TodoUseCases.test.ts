/**
 * TodoUseCases Test Suite
 * TodoUseCasesのビジネスロジックテスト
 */

import { TodoUseCases } from '../../../../src/domain/use-cases/TodoUseCases'
import { TodoEntity } from '../../../../src/domain/entities/Todo'
import { TodoRepositoryInterface, CreateTodoRequest, UpdateTodoRequest, TodoFilters } from '../../../../src/domain/repositories/TodoRepositoryInterface'

// Mock crypto.randomUUID for Node.js environment
global.crypto = {
  ...global.crypto,
  randomUUID: () => `mock-uuid-${Math.random().toString(36).substr(2, 9)}`
} as any

// Mock Repository
class MockTodoRepository implements TodoRepositoryInterface {
  private todos: TodoEntity[] = []
  private nextId = 1

  async findTodos(filters: TodoFilters): Promise<{ success: boolean; data?: TodoEntity[]; error?: string }> {
    let filteredTodos = this.todos.filter(t => t.userId === filters.userId)

    if (filters.status) {
      filteredTodos = filteredTodos.filter(t => t.status === filters.status)
    }

    if (filters.isOverdue) {
      filteredTodos = filteredTodos.filter(t => t.isOverdue())
    }

    if (filters.quadrant) {
      filteredTodos = filteredTodos.filter(t => t.getQuadrant() === filters.quadrant)
    }

    return { success: true, data: filteredTodos }
  }

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

  async findActiveTodos(userId: string): Promise<{ success: boolean; data?: TodoEntity[]; error?: string }> {
    const activeTodos = this.todos.filter(t => t.userId === userId && t.status === 'open')
    return { success: true, data: activeTodos }
  }

  async findCompletedTodos(userId: string): Promise<{ success: boolean; data?: TodoEntity[]; error?: string }> {
    const completedTodos = this.todos.filter(t => t.userId === userId && t.status === 'completed')
    return { success: true, data: completedTodos }
  }

  async findOverdueTodos(userId: string): Promise<{ success: boolean; data?: TodoEntity[]; error?: string }> {
    const overdueTodos = this.todos.filter(t => t.userId === userId && t.isOverdue())
    return { success: true, data: overdueTodos }
  }

  async create(todoData: CreateTodoRequest): Promise<{ success: boolean; data?: TodoEntity; error?: string }> {
    const newTodo = new TodoEntity({
      id: `todo-${this.nextId++}`,
      user_id: todoData.userId, // Fixed: use user_id
      title: todoData.title || null,
      body: todoData.body,
      deadline: todoData.deadline || null,
      importance_score: 1000, // Fixed: use importance_score
      status: 'open', // Fixed: use 'open' instead of 'active'
      created_at: new Date().toISOString(), // Fixed: use created_at
      updated_at: new Date().toISOString(), // Fixed: use updated_at
      created_via: todoData.createdVia || 'manual' // Fixed: use created_via
    })
    this.todos.push(newTodo)
    return { success: true, data: newTodo }
  }

  async update(updateRequest: UpdateTodoRequest): Promise<{ success: boolean; data?: TodoEntity; error?: string }> {
    const index = this.todos.findIndex(t => t.id === updateRequest.id)
    if (index === -1) {
      return { success: false, error: 'Todo not found' }
    }

    const existingTodo = this.todos[index]
    const updatedTodo = new TodoEntity({
      ...existingTodo.getData(),
      title: updateRequest.title !== undefined ? updateRequest.title : existingTodo.title,
      body: updateRequest.body !== undefined ? updateRequest.body : existingTodo.body,
      deadline: updateRequest.deadline !== undefined ? updateRequest.deadline : existingTodo.deadline,
      importance_score: updateRequest.importanceScore !== undefined ? updateRequest.importanceScore : existingTodo.importanceScore,
      status: updateRequest.status !== undefined ? updateRequest.status : existingTodo.status,
      updated_at: new Date().toISOString()
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

  async complete(id: string): Promise<{ success: boolean; data?: TodoEntity; error?: string }> {
    const index = this.todos.findIndex(t => t.id === id)
    if (index === -1) {
      return { success: false, error: 'Todo not found' }
    }

    const existingTodo = this.todos[index]
    const completedTodo = new TodoEntity({
      ...existingTodo.getData(),
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    this.todos[index] = completedTodo
    return { success: true, data: completedTodo }
  }

  async reopen(id: string): Promise<{ success: boolean; data?: TodoEntity; error?: string }> {
    const index = this.todos.findIndex(t => t.id === id)
    if (index === -1) {
      return { success: false, error: 'Todo not found' }
    }

    const existingTodo = this.todos[index]
    const reopenedTodo = new TodoEntity({
      ...existingTodo.getData(),
      status: 'open',
      updated_at: new Date().toISOString()
    })
    this.todos[index] = reopenedTodo
    return { success: true, data: reopenedTodo }
  }

  async updateImportanceScores(updates: Array<{ id: string; importanceScore: number }>): Promise<{ success: boolean; error?: string }> {
    for (const update of updates) {
      const index = this.todos.findIndex(t => t.id === update.id)
      if (index !== -1) {
        const existingTodo = this.todos[index]
        const updatedTodo = new TodoEntity({
          ...existingTodo.getData(),
          importance_score: update.importanceScore,
          updated_at: new Date().toISOString()
        })
        this.todos[index] = updatedTodo
      }
    }
    return { success: true }
  }

  async getTodoStats(userId: string): Promise<{ success: boolean; data?: { total: number; completed: number; active: number; overdue: number }; error?: string }> {
    const userTodos = this.todos.filter(t => t.userId === userId)
    const completed = userTodos.filter(t => t.status === 'completed').length
    const active = userTodos.filter(t => t.status === 'open').length
    const overdue = userTodos.filter(t => t.isOverdue()).length

    return {
      success: true,
      data: {
        total: userTodos.length,
        completed,
        active,
        overdue
      }
    }
  }

  async exists(id: string): Promise<{ success: boolean; data?: boolean; error?: string }> {
    const exists = this.todos.some(t => t.id === id)
    return { success: true, data: exists }
  }

  async isOwnedByUser(todoId: string, userId: string): Promise<{ success: boolean; data?: boolean; error?: string }> {
    const todo = this.todos.find(t => t.id === todoId)
    if (!todo) {
      return { success: false, error: 'Todo not found' }
    }
    return { success: true, data: todo.userId === userId }
  }

  async getCompletionReport(userId: string, startDate: string, endDate: string): Promise<{ success: boolean; data?: Array<{ quadrant: string; count: number; todos: Array<{ id: string; title?: string; body: string; completed_at: string }> }>; error?: string }> {
    // Simple mock implementation
    return { success: true, data: [] }
  }

  async reopenTodo(todoId: string): Promise<{ success: boolean; data?: TodoEntity; error?: string }> {
    return this.reopen(todoId)
  }

  async createComparison(winnerId: string, loserId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    // Simple mock implementation
    return { success: true }
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
  let existingTodo: TodoEntity

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
      expect(result.error).toBe('Todo not found or access denied')
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
      expect(result.error).toBe('Todo not found or access denied')
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
      expect(result.data!.status).toBe('open')
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
      const getResult = await todoUseCases.getTodoById(existingTodo.id, userId)
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
      const result = await todoUseCases.getTodoById(existingTodo.id, userId)

      expect(result.success).toBe(true)
      expect(result.data!.id).toBe(existingTodo.id)
      expect(result.data!.body).toBe('Todo to find')
    })

    it('should handle non-existent todo', async () => {
      const result = await todoUseCases.getTodoById('non-existent-id', userId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Todo not found or access denied')
    })
  })

  describe('getTodoDashboard', () => {
    beforeEach(async () => {
      // Create test todos with different characteristics
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      const urgentImportant = await todoUseCases.createTodo({
        userId,
        body: 'Urgent and important',
        deadline: yesterdayStr, // Yesterday - definitely overdue/urgent
        createdVia: 'manual'
      })

      const notUrgentImportant = await todoUseCases.createTodo({
        userId,
        body: 'Not urgent but important',
        deadline: '2025-12-31', // Future date to make it not urgent
        createdVia: 'manual'
      })

      const urgentNotImportant = await todoUseCases.createTodo({
        userId,
        body: 'Urgent but not important',
        deadline: yesterdayStr, // Yesterday - definitely overdue/urgent
        createdVia: 'manual'
      })

      const notUrgentNotImportant = await todoUseCases.createTodo({
        userId,
        body: 'Not urgent and not important',
        deadline: '2025-12-31', // Future date to make it not urgent
        createdVia: 'manual'
      })

      // Update importance scores to create proper quadrants
      await todoUseCases.updateImportanceScores([
        { id: urgentImportant.data!.id, importanceScore: 1500 }, // Important (>=1200)
        { id: notUrgentImportant.data!.id, importanceScore: 1500 }, // Important (>=1200)
        { id: urgentNotImportant.data!.id, importanceScore: 800 }, // Not important (<1200)
        { id: notUrgentNotImportant.data!.id, importanceScore: 800 } // Not important (<1200)
      ], userId)

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

  describe('getTodos', () => {
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
      const result = await todoUseCases.getTodos({ userId })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      result.data!.forEach(todo => {
        expect(todo.userId).toBe(userId)
      })
    })

    it('should return empty array for user with no todos', async () => {
      const result = await todoUseCases.getTodos({ userId: 'no-todos-user' })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      const errorRepository = {
        findById: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        isOwnedByUser: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      } as any

      const useCases = new TodoUseCases(errorRepository)

      const result = await useCases.getTodoById('test-id', 'test-user')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection failed')
    })

    it('should handle unexpected errors', async () => {
      const errorRepository = {
        findById: jest.fn().mockRejectedValue('Unexpected error'),
        isOwnedByUser: jest.fn().mockRejectedValue('Unexpected error')
      } as any

      const useCases = new TodoUseCases(errorRepository)

      const result = await useCases.getTodoById('test-id', 'test-user')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error occurred')
    })
  })
})
