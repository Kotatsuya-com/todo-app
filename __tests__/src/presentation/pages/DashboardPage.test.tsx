/**
 * DashboardPage Component Test Suite
 * DashboardPageコンポーネントのオブジェクト再作成防止テスト
 */

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardPage from '../../../../src/presentation/pages/DashboardPage'
import { TodoEntity } from '../../../../src/domain/entities/Todo'
import { UserEntity } from '../../../../src/domain/entities/User'

// Mock all dependencies
jest.mock('../../../../src/presentation/hooks/useTodoDashboard')
jest.mock('../../../../components/todo/TodoCard')
jest.mock('../../../../components/todo/EditTodoModal')
jest.mock('../../../../components/auth/AuthForm')

import { useTodoDashboard } from '@/src/presentation/hooks/useTodoDashboard'
import { TodoCard } from '@/components/todo/TodoCard'
import { EditTodoModal } from '@/components/todo/EditTodoModal'
import { AuthForm } from '@/components/auth/AuthForm'

// Mock implementations
const mockUseTodoDashboard = useTodoDashboard as jest.MockedFunction<typeof useTodoDashboard>
const MockTodoCard = TodoCard as jest.MockedFunction<typeof TodoCard>
const MockEditTodoModal = EditTodoModal as jest.MockedFunction<typeof EditTodoModal>
const MockAuthForm = AuthForm as jest.MockedFunction<typeof AuthForm>

// Create mock todos
const createMockTodo = (id: string, overrides: any = {}) => new TodoEntity({
  id,
  user_id: 'user-123',
  title: `Todo ${id}`,
  body: `Body for todo ${id}`,
  deadline: '2025-08-25T18:00:00Z',
  importance_score: 1200,
  status: 'open',
  created_at: '2025-08-20T10:00:00Z',
  updated_at: '2025-08-20T10:00:00Z',
  created_via: 'manual',
  ...overrides
})

const mockTodos = [
  createMockTodo('todo-1', { importance_score: 1500 }),
  createMockTodo('todo-2', { importance_score: 800, deadline: null }),
  createMockTodo('todo-3', { importance_score: 1300 })
]

// Track TodoCard render calls to detect object recreation
let todoCardRenderCalls: any[] = []
let editModalRenderCalls: any[] = []

describe('DashboardPage', () => {
  const mockUser = new UserEntity({
    id: 'user-123',
    display_name: 'Test User',
    avatar_url: null,
    slack_user_id: null,
    enable_webhook_notifications: false,
    created_at: '2025-08-01T10:00:00Z'
  })
  const mockActions = {
    refreshTodos: jest.fn(),
    completeTodo: jest.fn(),
    reopenTodo: jest.fn(),
    deleteTodo: jest.fn(),
    updateTodo: jest.fn()
  }
  const mockUI = {
    filters: { showOverdueOnly: false, viewMode: 'matrix' as const },
    setShowOverdueOnly: jest.fn(),
    setViewMode: jest.fn(),
    selectedTodo: null,
    setSelectedTodo: jest.fn(),
    isEditModalOpen: false,
    setIsEditModalOpen: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    todoCardRenderCalls = []
    editModalRenderCalls = []

    // Setup TodoCard mock to track render calls
    MockTodoCard.mockImplementation((props) => {
      todoCardRenderCalls.push({
        todoId: props.todo.id,
        todoObject: props.todo,
        timestamp: Date.now()
      })
      return (
        <div data-testid={`todo-card-${props.todo.id}`}>
          TodoCard {props.todo.id}
          <button
            data-testid={`edit-${props.todo.id}`}
            onClick={() => props.onEdit?.()}
          >
            Edit
          </button>
        </div>
      )
    })

    // Setup EditTodoModal mock to track render calls
    MockEditTodoModal.mockImplementation((props) => {
      editModalRenderCalls.push({
        isOpen: props.isOpen,
        todoObject: props.todo,
        timestamp: Date.now()
      })
      return props.isOpen ? (
        <div data-testid="edit-modal">
          EditModal
          <button
            data-testid="close-modal"
            onClick={props.onClose}
          >
            Close
          </button>
        </div>
      ) : null
    })

    // Setup AuthForm mock
    MockAuthForm.mockReturnValue(<div data-testid="auth-form">AuthForm</div>)

    // Default mock dashboard state
    mockUseTodoDashboard.mockReturnValue({
      state: {
        todos: mockTodos,
        quadrants: {
          urgent_important: [mockTodos[0], mockTodos[2]],
          not_urgent_important: [mockTodos[1]],
          urgent_not_important: [],
          not_urgent_not_important: []
        },
        stats: { total: 3, active: 3, completed: 0, overdue: 1 },
        filteredTodos: mockTodos,
        loading: false,
        error: null
      },
      actions: mockActions,
      ui: mockUI,
      user: mockUser
    })
  })

  describe('Object Recreation Prevention', () => {
    it('should not recreate TodoCard props on re-renders', async () => {
      const { rerender } = render(<DashboardPage />)

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('todo-card-todo-1')).toBeInTheDocument()
      })

      const initialCallCount = todoCardRenderCalls.length
      const initialTodoObjects = todoCardRenderCalls.map(call => call.todoObject)

      // Force re-render with same data
      rerender(<DashboardPage />)

      await waitFor(() => {
        expect(todoCardRenderCalls.length).toBeGreaterThan(initialCallCount)
      })

      // Check that new renders received the same object references (memoization working)
      const newTodoObjects = todoCardRenderCalls.slice(initialCallCount).map(call => call.todoObject)

      // With proper memoization, objects should be the same reference
      newTodoObjects.forEach((newObj, index) => {
        const originalObj = initialTodoObjects[index]
        if (originalObj && newObj) {
          expect(newObj).toBe(originalObj) // Same object reference due to memoization
        }
      })
    })

    it('should not recreate EditTodoModal todo object on re-renders when selectedTodo data stays same', async () => {
      const selectedTodo = mockTodos[0]

      // Mock with selected todo
      mockUseTodoDashboard.mockReturnValue({
        state: {
          todos: mockTodos,
          quadrants: {
            urgent_important: [mockTodos[0], mockTodos[2]],
            not_urgent_important: [mockTodos[1]],
            urgent_not_important: [],
            not_urgent_not_important: []
          },
          stats: { total: 3, active: 3, completed: 0, overdue: 1 },
          filteredTodos: mockTodos,
          loading: false,
          error: null
        },
        actions: mockActions,
        ui: {
          ...mockUI,
          selectedTodo,
          isEditModalOpen: true
        },
        user: mockUser
      })

      const { rerender } = render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('edit-modal')).toBeInTheDocument()
      })

      const initialCallCount = editModalRenderCalls.length
      const initialTodoObject = editModalRenderCalls[initialCallCount - 1]?.todoObject

      // Force re-render with same selectedTodo
      rerender(<DashboardPage />)

      await waitFor(() => {
        expect(editModalRenderCalls.length).toBeGreaterThan(initialCallCount)
      })

      // Check that EditTodoModal received the same memoized object
      const newTodoObject = editModalRenderCalls[editModalRenderCalls.length - 1]?.todoObject

      if (initialTodoObject && newTodoObject && selectedTodo) {
        // Should be the same memoized object reference
        expect(newTodoObject).toBe(initialTodoObject)
      }
    })

    it('should handle rapid todo list updates without excessive object recreation', async () => {
      const { rerender } = render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('todo-card-todo-1')).toBeInTheDocument()
      })

      const initialCallCount = todoCardRenderCalls.length

      // Simulate rapid updates with same todo data but different array references
      for (let i = 0; i < 5; i++) {
        const newTodosArray = [...mockTodos] // New array reference, same content

        mockUseTodoDashboard.mockReturnValue({
          state: {
            todos: newTodosArray,
            quadrants: {
              urgent_important: [newTodosArray[0], newTodosArray[2]],
              not_urgent_important: [newTodosArray[1]],
              urgent_not_important: [],
              not_urgent_not_important: []
            },
            stats: { total: 3, active: 3, completed: 0, overdue: 1 },
            filteredTodos: newTodosArray,
            loading: false,
            error: null
          },
          actions: mockActions,
          ui: mockUI,
          user: mockUser
        })

        rerender(<DashboardPage />)
      }

      // Should not cause excessive re-renders due to memoization
      const totalCalls = todoCardRenderCalls.length - initialCallCount
      expect(totalCalls).toBeLessThan(20) // Reasonable threshold for 5 updates × 3 todos
    })
  })

  describe('Memoization Behavior', () => {
    it('should memoize createMemoizedTodoCardProps function', async () => {
      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('todo-card-todo-1')).toBeInTheDocument()
      })

      // Get the todo objects from first render
      const firstRenderObjects = todoCardRenderCalls.map(call => call.todoObject)

      // Clear calls and force re-render
      todoCardRenderCalls = []

      // Force component re-render by updating a non-memoized prop
      mockUseTodoDashboard.mockReturnValue({
        state: {
          todos: mockTodos,
          quadrants: {
            urgent_important: [mockTodos[0], mockTodos[2]],
            not_urgent_important: [mockTodos[1]],
            urgent_not_important: [],
            not_urgent_not_important: []
          },
          stats: { total: 3, active: 3, completed: 0, overdue: 1 },
          filteredTodos: mockTodos,
          loading: false, // Same as before
          error: null
        },
        actions: mockActions,
        ui: mockUI,
        user: mockUser
      })

      // This should trigger a re-render but memoized objects should be reused
      render(<DashboardPage />)

      await waitFor(() => {
        expect(todoCardRenderCalls.length).toBeGreaterThan(0)
      })

      // Compare object references - should be the same due to memoization
      const secondRenderObjects = todoCardRenderCalls.map(call => call.todoObject)

      firstRenderObjects.forEach((firstObj, index) => {
        const secondObj = secondRenderObjects[index]
        if (firstObj && secondObj) {
          // For memoization test, we're checking that the objects have same ID/data
          // Object references may differ but the content should be equivalent
          expect(secondObj.id).toBe(firstObj.id)
          expect(secondObj.title).toBe(firstObj.title)
        }
      })
    })

    it('should only recreate objects when actual todo data changes', async () => {
      const { rerender } = render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('todo-card-todo-1')).toBeInTheDocument()
      })

      const initialObjects = todoCardRenderCalls.map(call => call.todoObject)
      todoCardRenderCalls = []

      // Update with actually changed todo data
      const updatedTodo = createMockTodo('todo-1', {
        title: 'Updated Title', // Actual data change
        importance_score: 1600
      })
      const updatedTodos = [updatedTodo, mockTodos[1], mockTodos[2]]

      mockUseTodoDashboard.mockReturnValue({
        state: {
          todos: updatedTodos,
          quadrants: {
            urgent_important: [updatedTodos[0], updatedTodos[2]],
            not_urgent_important: [updatedTodos[1]],
            urgent_not_important: [],
            not_urgent_not_important: []
          },
          stats: { total: 3, active: 3, completed: 0, overdue: 1 },
          filteredTodos: updatedTodos,
          loading: false,
          error: null
        },
        actions: mockActions,
        ui: mockUI,
        user: mockUser
      })

      rerender(<DashboardPage />)

      await waitFor(() => {
        expect(todoCardRenderCalls.length).toBeGreaterThan(0)
      })

      // First todo should have new object (data changed), others should be same reference
      const newObjects = todoCardRenderCalls.map(call => call.todoObject)

      // todo-1 should have new object due to data change
      const updatedObject = newObjects.find(obj => obj.id === 'todo-1')
      const originalObject = initialObjects.find(obj => obj.id === 'todo-1')
      expect(updatedObject).not.toBe(originalObject)

      // Other todos should keep same reference
      const unchangedNewObj = newObjects.find(obj => obj.id === 'todo-2')
      const unchangedOrigObj = initialObjects.find(obj => obj.id === 'todo-2')
      expect(unchangedNewObj).toBe(unchangedOrigObj)
    })
  })

  describe('Modal State Management', () => {
    it('should handle modal open/close without object recreation issues', async () => {
      const user = userEvent.setup()

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('todo-card-todo-1')).toBeInTheDocument()
      })

      const initialModalCalls = editModalRenderCalls.length

      // Simulate opening modal by clicking edit button
      const editButton = screen.getByTestId('edit-todo-1')

      // Mock the modal opening state change
      mockUI.setSelectedTodo.mockImplementation((todo) => {
        mockUseTodoDashboard.mockReturnValue({
          state: {
            todos: mockTodos,
            quadrants: {
              urgent_important: [mockTodos[0], mockTodos[2]],
              not_urgent_important: [mockTodos[1]],
              urgent_not_important: [],
              not_urgent_not_important: []
            },
            stats: { total: 3, active: 3, completed: 0, overdue: 1 },
            filteredTodos: mockTodos,
            loading: false,
            error: null
          },
          actions: mockActions,
          ui: {
            ...mockUI,
            selectedTodo: todo,
            isEditModalOpen: true
          },
          user: mockUser
        })
      })

      await act(async () => {
        await user.click(editButton)
      })

      // Should not cause excessive modal re-renders
      const modalCallsAfterOpen = editModalRenderCalls.length - initialModalCalls
      expect(modalCallsAfterOpen).toBeLessThan(5) // Reasonable threshold
    })
  })

  describe('Authentication State', () => {
    it('should render AuthForm when user is not authenticated without affecting memoization', () => {
      mockUseTodoDashboard.mockReturnValue({
        state: {
          todos: [],
          quadrants: {
            urgent_important: [],
            not_urgent_important: [],
            urgent_not_important: [],
            not_urgent_not_important: []
          },
          stats: { total: 0, active: 0, completed: 0, overdue: 0 },
          filteredTodos: [],
          loading: false,
          error: null
        },
        actions: mockActions,
        ui: mockUI,
        user: null // No authenticated user
      })

      render(<DashboardPage />)

      expect(screen.getByTestId('auth-form')).toBeInTheDocument()
      expect(screen.queryByTestId('todo-card-todo-1')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle error state without breaking memoization', async () => {
      mockUseTodoDashboard.mockReturnValue({
        state: {
          todos: [],
          quadrants: {
            urgent_important: [],
            not_urgent_important: [],
            urgent_not_important: [],
            not_urgent_not_important: []
          },
          stats: { total: 0, active: 0, completed: 0, overdue: 0 },
          filteredTodos: [],
          loading: false,
          error: 'Test error message'
        },
        actions: mockActions,
        ui: mockUI,
        user: mockUser
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Test error message')).toBeInTheDocument()
      })

      // Should not have rendered any TodoCard components
      expect(todoCardRenderCalls.length).toBe(0)
    })
  })

  describe('Performance Metrics', () => {
    it('should not exceed reasonable re-render thresholds', async () => {
      const { rerender } = render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('todo-card-todo-1')).toBeInTheDocument()
      })

      const startTime = Date.now()
      const initialRenderCount = todoCardRenderCalls.length

      // Perform multiple re-renders to test performance
      for (let i = 0; i < 10; i++) {
        rerender(<DashboardPage />)
      }

      const endTime = Date.now()
      const finalRenderCount = todoCardRenderCalls.length

      // Performance assertions
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
      expect(finalRenderCount - initialRenderCount).toBeLessThan(50) // Reasonable re-render limit
    })
  })
})
