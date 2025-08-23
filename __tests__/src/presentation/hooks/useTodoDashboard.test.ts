/**
 * useTodoDashboard Hook Test Suite
 * useTodoDashboardフックのテスト
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useTodoDashboard } from '../../../../src/presentation/hooks/useTodoDashboard'
import { TodoEntity } from '../../../../src/domain/entities/Todo'
import { UserEntity } from '../../../../src/domain/entities/User'
import { LOADING_TIMEOUT_MS } from '../../../../src/constants/timeConstants'

// Mock dependencies
jest.mock('../../../../src/presentation/hooks/useAuth')
jest.mock('../../../../src/infrastructure/di/FrontendServiceFactory')

import { useAuth } from '../../../../src/presentation/hooks/useAuth'
import { createTodoUseCases } from '@/src/infrastructure/di/FrontendServiceFactory'

// Mock implementations
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockCreateTodoUseCases = createTodoUseCases as jest.MockedFunction<typeof createTodoUseCases>

// Mock user
const mockUser = new UserEntity({
  id: 'test-user-id',
  display_name: 'Test User',
  avatar_url: null,
  slack_user_id: null,
  enable_webhook_notifications: false,
  created_at: '2025-08-01T10:00:00Z'
})

// Mock todos - using snake_case properties matching TodoData interface
const mockTodos = [
  new TodoEntity({
    id: 'todo-1',
    user_id: 'test-user-id',
    title: 'Urgent Important Todo',
    body: 'This is urgent and important',
    deadline: '2025-08-03T18:00:00Z', // 6 hours from now (urgent)
    importance_score: 1500,
    status: 'open',
    created_at: '2025-08-01T10:00:00Z',
    updated_at: '2025-08-01T10:00:00Z',
    created_via: 'manual'
  }),
  new TodoEntity({
    id: 'todo-2',
    user_id: 'test-user-id',
    title: 'Not Urgent Important Todo',
    body: 'This is important but not urgent',
    deadline: '2025-08-10', // One week later (not urgent)
    importance_score: 1500,
    status: 'open',
    created_at: '2025-08-01T10:00:00Z',
    updated_at: '2025-08-01T10:00:00Z',
    created_via: 'manual'
  }),
  new TodoEntity({
    id: 'todo-3',
    user_id: 'test-user-id',
    title: 'Completed Todo',
    body: 'This is completed',
    deadline: null,
    importance_score: 1000,
    status: 'completed',
    created_at: '2025-08-01T10:00:00Z',
    updated_at: '2025-08-02T10:00:00Z',
    created_via: 'manual'
  })
]

// Mock TodoUseCases
const mockTodoUseCases = {
  getTodos: jest.fn(),
  getTodoById: jest.fn(),
  createTodo: jest.fn(),
  updateTodo: jest.fn(),
  completeTodo: jest.fn(),
  reopenTodo: jest.fn(),
  deleteTodo: jest.fn(),
  getTodoDashboard: jest.fn(),
  updateImportanceScores: jest.fn(),
  getActiveTodos: jest.fn(),
  getOverdueTodos: jest.fn(),
  getCompletionReport: jest.fn(),
  createComparison: jest.fn()
} as any

describe('useTodoDashboard', () => {
  beforeAll(() => {
    // Fix the date to 2025-08-03 for consistent test results
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-08-03T12:00:00Z'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock implementations
    mockUseAuth.mockReturnValue({
      user: mockUser,
      authUser: null,
      loading: false,
      error: null,
      isAuthenticated: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      sendPasswordReset: jest.fn(),
      refreshSession: jest.fn(),
      clearError: jest.fn()
    })

    mockCreateTodoUseCases.mockReturnValue(mockTodoUseCases)

    mockTodoUseCases.getTodoDashboard.mockResolvedValue({
      success: true,
      data: {
        todos: mockTodos.filter(t => t.status === 'open'),
        quadrants: TodoEntity.groupByQuadrant(mockTodos.filter(t => t.status === 'open')),
        stats: {
          total: mockTodos.length,
          active: mockTodos.filter(t => t.status === 'open').length,
          completed: mockTodos.filter(t => t.status === 'completed').length,
          overdue: mockTodos.filter(t => t.isOverdue()).length
        }
      }
    })
  })

  describe('Initial State', () => {
    it('should initialize with correct default state', async () => {
      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result
      })

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.state.loading).toBe(false)
      }, { timeout: LOADING_TIMEOUT_MS })

      // Check initial state
      expect(result.current.state.error).toBeNull()

      // Should have loaded todos
      expect(result.current.state.todos).toHaveLength(2) // Only active todos
      expect(result.current.state.stats.total).toBe(3)
      expect(result.current.state.stats.active).toBe(2)
      expect(result.current.state.stats.completed).toBe(1)
    })

    it('should initialize UI state correctly', async () => {
      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result

      })

      expect(result.current.ui.filters.showOverdueOnly).toBe(false)
      expect(result.current.ui.filters.viewMode).toBe('matrix')
      expect(result.current.ui.selectedTodo).toBeNull()
      expect(result.current.ui.isEditModalOpen).toBe(false)
    })
  })

  describe('Authentication Handling', () => {
    it('should not fetch todos when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        authUser: null,
        loading: false,
        error: null,
        isAuthenticated: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        sendPasswordReset: jest.fn(),
        refreshSession: jest.fn(),
        clearError: jest.fn()
      })

      await act(async () => {
        renderHook(() => useTodoDashboard())

      })

      expect(mockTodoUseCases.getTodoDashboard).not.toHaveBeenCalled()
    })

    it('should not fetch todos during auth loading', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        authUser: null,
        loading: true,
        error: null,
        isAuthenticated: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        sendPasswordReset: jest.fn(),
        refreshSession: jest.fn(),
        clearError: jest.fn()
      })

      await act(async () => {
        renderHook(() => useTodoDashboard())

      })

      expect(mockTodoUseCases.getTodoDashboard).not.toHaveBeenCalled()
    })
  })

  describe('Data Fetching', () => {
    it('should fetch todos on mount when user is authenticated', async () => {
      await act(async () => {
        renderHook(() => useTodoDashboard())
      })

      await waitFor(() => {
        expect(mockTodoUseCases.getTodoDashboard).toHaveBeenCalledWith({
          userId: 'test-user-id',
          includeCompleted: false,
          overdueOnly: false
        })
      })
    })

    it('should handle fetch errors', async () => {
      mockTodoUseCases.getTodoDashboard.mockResolvedValue({
        success: false,
        error: 'Failed to fetch todos'
      })

      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result
      })

      await waitFor(() => {
        expect(result.current.state.error).toBe('Failed to fetch todos')
        expect(result.current.state.loading).toBe(false)
      })
    })

    it('should handle unexpected errors', async () => {
      mockTodoUseCases.getTodoDashboard.mockRejectedValue(new Error('Network error'))

      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result
      })

      await waitFor(() => {
        expect(result.current.state.error).toBe('Network error')
        expect(result.current.state.loading).toBe(false)
      })
    })
  })

  describe('Filter Functionality', () => {
    it('should filter overdue todos when showOverdueOnly is true', async () => {
      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result
      })

      await waitFor(() => {
        expect(result.current.state.loading).toBe(false)
      })

      act(() => {
        result.current.ui.setShowOverdueOnly(true)
      })

      // Should filter to only overdue todos
      const overdueTodos = result.current.state.todos.filter((todo: TodoEntity) => todo.isOverdue())
      expect(result.current.state.todos).toEqual(overdueTodos)
    })

    it('should change view mode', async () => {
      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result

      })

      act(() => {
        result.current.ui.setViewMode('list')
      })

      expect(result.current.ui.filters.viewMode).toBe('list')
    })

    it('should sort todos correctly in list view', async () => {
      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result

      })

      await waitFor(() => {
        expect(result.current.state.loading).toBe(false)
      })

      act(() => {
        result.current.ui.setViewMode('list')
      })

      // In list view, todos should be sorted by importance (desc)
      const todos = result.current.state.todos
      for (let i = 0; i < todos.length - 1; i++) {
        expect(todos[i].importanceScore).toBeGreaterThanOrEqual(todos[i + 1].importanceScore)
      }
    })
  })

  describe('Todo Actions', () => {
    beforeEach(() => {
      mockTodoUseCases.completeTodo.mockResolvedValue({ success: true })
      mockTodoUseCases.reopenTodo.mockResolvedValue({ success: true })
      mockTodoUseCases.deleteTodo.mockResolvedValue({ success: true })
      mockTodoUseCases.updateTodo.mockResolvedValue({ success: true })
    })

    it('should complete todo and refresh data', async () => {
      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result

      })

      await waitFor(() => {
        expect(result.current.state.loading).toBe(false)
      })

      await act(async () => {
        await result.current.actions.completeTodo('todo-1')
      })

      expect(mockTodoUseCases.completeTodo).toHaveBeenCalledWith({
        id: 'todo-1',
        userId: 'test-user-id'
      })

      // Should call getTodoDashboard again to refresh data
      expect(mockTodoUseCases.getTodoDashboard).toHaveBeenCalledTimes(2)
    })

    it('should handle complete todo errors', async () => {
      mockTodoUseCases.completeTodo.mockResolvedValue({
        success: false,
        error: 'Failed to complete todo'
      })

      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result

      })

      await waitFor(() => {
        expect(result.current.state.loading).toBe(false)
      })

      await act(async () => {
        await result.current.actions.completeTodo('todo-1')
      })

      expect(result.current.state.error).toBe('Failed to complete todo')
    })

    it('should reopen todo and refresh data', async () => {
      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result

      })

      await waitFor(() => {
        expect(result.current.state.loading).toBe(false)
      })

      await act(async () => {
        await result.current.actions.reopenTodo('todo-3')
      })

      expect(mockTodoUseCases.reopenTodo).toHaveBeenCalledWith({
        id: 'todo-3',
        userId: 'test-user-id'
      })
    })

    it('should delete todo and refresh data', async () => {
      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result

      })

      await waitFor(() => {
        expect(result.current.state.loading).toBe(false)
      })

      await act(async () => {
        await result.current.actions.deleteTodo('todo-1')
      })

      expect(mockTodoUseCases.deleteTodo).toHaveBeenCalledWith({
        id: 'todo-1',
        userId: 'test-user-id'
      })
    })

    it('should update todo and refresh data', async () => {
      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result

      })

      await waitFor(() => {
        expect(result.current.state.loading).toBe(false)
      })

      const updates = {
        title: 'Updated title',
        body: 'Updated body'
      }

      await act(async () => {
        await result.current.actions.updateTodo('todo-1', updates)
      })

      expect(mockTodoUseCases.updateTodo).toHaveBeenCalledWith({
        id: 'todo-1',
        userId: 'test-user-id',
        updates
      })
    })

    it('should not perform actions when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        authUser: null,
        loading: false,
        error: null,
        isAuthenticated: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        sendPasswordReset: jest.fn(),
        refreshSession: jest.fn(),
        clearError: jest.fn()
      })

      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result

      })

      await act(async () => {
        await result.current.actions.completeTodo('todo-1')
      })

      expect(mockTodoUseCases.completeTodo).not.toHaveBeenCalled()
    })
  })

  describe('UI State Management', () => {
    it('should manage selected todo state', async () => {
      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result

      })

      const testTodo = mockTodos[0]

      act(() => {
        result.current.ui.setSelectedTodo(testTodo)
      })

      expect(result.current.ui.selectedTodo).toBe(testTodo)

      act(() => {
        result.current.ui.setSelectedTodo(null)
      })

      expect(result.current.ui.selectedTodo).toBeNull()
    })

    it('should manage edit modal state', async () => {
      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result

      })

      act(() => {
        result.current.ui.setIsEditModalOpen(true)
      })

      expect(result.current.ui.isEditModalOpen).toBe(true)

      act(() => {
        result.current.ui.setIsEditModalOpen(false)
      })

      expect(result.current.ui.isEditModalOpen).toBe(false)
    })
  })

  describe('Quadrant Data', () => {
    it('should group todos by quadrant correctly', async () => {
      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result

      })

      await waitFor(() => {
        expect(result.current.state.loading).toBe(false)
      })

      const quadrants = result.current.state.quadrants

      expect(quadrants.urgent_important).toHaveLength(1)
      expect(quadrants.not_urgent_important).toHaveLength(1)
      expect(quadrants.urgent_not_important).toHaveLength(0)
      expect(quadrants.not_urgent_not_important).toHaveLength(0)
    })
  })

  describe('Slack Redirect Handling', () => {
    beforeEach(() => {
      // Mock window.location
      delete (window as any).location;
      (window as any).location = {
        search: '',
        href: ''
      }
    })

    it('should handle Slack auth redirect when parameters are present', async () => {
      window.location.search = '?slack_auth_required=true&slack_code=test-code'

      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result

      })

      await waitFor(() => {
        expect(window.location.href).toBe('/settings?slack_auth_required=true&slack_code=test-code')
      })
    })

    it('should not redirect when Slack parameters are missing', async () => {
      window.location.search = ''

      await act(async () => {
        renderHook(() => useTodoDashboard())

      })

      expect(window.location.href).toBe('')
    })

    it('should not redirect when user is not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        authUser: null,
        loading: false,
        error: null,
        isAuthenticated: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        sendPasswordReset: jest.fn(),
        refreshSession: jest.fn(),
        clearError: jest.fn()
      })

      window.location.search = '?slack_auth_required=true&slack_code=test-code'

      await act(async () => {
        renderHook(() => useTodoDashboard())

      })

      expect(window.location.href).toBe('')
    })
  })

  describe('Return Value Structure', () => {
    it('should return correct structure', async () => {
      let result: any

      await act(async () => {
        const hookResult = renderHook(() => useTodoDashboard())
        result = hookResult.result

      })

      await waitFor(() => {
        expect(result.current.state.loading).toBe(false)
      })

      // Check state structure
      expect(result.current.state).toHaveProperty('todos')
      expect(result.current.state).toHaveProperty('quadrants')
      expect(result.current.state).toHaveProperty('stats')
      expect(result.current.state).toHaveProperty('filteredTodos')
      expect(result.current.state).toHaveProperty('loading')
      expect(result.current.state).toHaveProperty('error')

      // Check actions structure
      expect(result.current.actions).toHaveProperty('refreshTodos')
      expect(result.current.actions).toHaveProperty('completeTodo')
      expect(result.current.actions).toHaveProperty('reopenTodo')
      expect(result.current.actions).toHaveProperty('deleteTodo')
      expect(result.current.actions).toHaveProperty('updateTodo')

      // Check UI structure
      expect(result.current.ui).toHaveProperty('filters')
      expect(result.current.ui).toHaveProperty('setShowOverdueOnly')
      expect(result.current.ui).toHaveProperty('setViewMode')
      expect(result.current.ui).toHaveProperty('selectedTodo')
      expect(result.current.ui).toHaveProperty('setSelectedTodo')
      expect(result.current.ui).toHaveProperty('isEditModalOpen')
      expect(result.current.ui).toHaveProperty('setIsEditModalOpen')

      // Check user
      expect(result.current.user).toBe(mockUser)
    })
  })
})
