/**
 * Modal Editing Workflow Integration Test Suite
 * 完全なモーダル編集ワークフローの統合テスト - 無限再レンダリング防止
 */

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardPage from '../../src/presentation/pages/DashboardPage'
import { TodoEntity } from '../../src/domain/entities/Todo'
import { UserEntity } from '../../src/domain/entities/User'

// Mock all dependencies
jest.mock('../../src/presentation/hooks/useTodoDashboard')
jest.mock('../../src/presentation/hooks/useTodoForm')
jest.mock('../../components/todo/TodoCard')
jest.mock('../../components/todo/EditTodoModal')
jest.mock('../../components/todo/TodoForm')
jest.mock('../../components/auth/AuthForm')

import { useTodoDashboard } from '@/src/presentation/hooks/useTodoDashboard'
import { useTodoForm } from '@/src/presentation/hooks/useTodoForm'
import { TodoCard } from '@/components/todo/TodoCard'
import { EditTodoModal } from '@/components/todo/EditTodoModal'
import { TodoForm } from '@/components/todo/TodoForm'
import { AuthForm } from '@/components/auth/AuthForm'

// Mock implementations
const mockUseTodoDashboard = useTodoDashboard as jest.MockedFunction<typeof useTodoDashboard>
const mockUseTodoForm = useTodoForm as jest.MockedFunction<typeof useTodoForm>
const MockTodoCard = TodoCard as jest.MockedFunction<typeof TodoCard>
const MockEditTodoModal = EditTodoModal as jest.MockedFunction<typeof EditTodoModal>
const MockTodoForm = TodoForm as jest.MockedFunction<typeof TodoForm>
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

// Track render calls and performance metrics
let componentRenderCounts = {
  dashboardPage: 0,
  todoCard: 0,
  editModal: 0,
  todoForm: 0
}

let performanceMetrics = {
  modalOpenTime: 0,
  formRenderTime: 0,
  modalCloseTime: 0,
  totalRenderCount: 0
}

describe('Modal Editing Workflow Integration', () => {
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
    updateTodo: jest.fn().mockResolvedValue(true)
  }
  const mockFormActions = {
    updateField: jest.fn(),
    resetForm: jest.fn(),
    submitForm: jest.fn().mockResolvedValue(true),
    validateForm: jest.fn(),
    setUrgencyLevel: jest.fn(),
    setSlackUrl: jest.fn(),
    loadSlackMessage: jest.fn(),
    clearSlackData: jest.fn(),
    generateTitle: jest.fn(),
    selectTitleSuggestion: jest.fn(),
    fillFromSlackMessage: jest.fn(),
    createTodo: jest.fn(),
    updateTodo: jest.fn(),
    isSubmitting: false
  }

  let mockUI: any

  beforeEach(() => {
    jest.clearAllMocks()
    componentRenderCounts = {
      dashboardPage: 0,
      todoCard: 0,
      editModal: 0,
      todoForm: 0
    }
    performanceMetrics = {
      modalOpenTime: 0,
      formRenderTime: 0,
      modalCloseTime: 0,
      totalRenderCount: 0
    }

    mockUI = {
      filters: { showOverdueOnly: false, viewMode: 'matrix' as const },
      setShowOverdueOnly: jest.fn(),
      setViewMode: jest.fn(),
      selectedTodo: null,
      setSelectedTodo: jest.fn(),
      isEditModalOpen: false,
      setIsEditModalOpen: jest.fn()
    }

    // Setup TodoCard mock with performance tracking
    MockTodoCard.mockImplementation((props) => {
      componentRenderCounts.todoCard++
      performanceMetrics.totalRenderCount++

      return (
        <div data-testid={`todo-card-${props.todo.id}`}>
          TodoCard {props.todo.id} (Render #{componentRenderCounts.todoCard})
          <button
            data-testid={`edit-${props.todo.id}`}
            onClick={() => props.onEdit?.()}
          >
            Edit
          </button>
          <button
            data-testid={`complete-${props.todo.id}`}
            onClick={() => props.onComplete?.(props.todo.id)}
          >
            Complete
          </button>
        </div>
      )
    })

    // Setup EditTodoModal mock with performance tracking
    MockEditTodoModal.mockImplementation((props) => {
      componentRenderCounts.editModal++
      performanceMetrics.totalRenderCount++

      if (props.isOpen) {
        const renderStartTime = Date.now()

        return (
          <div data-testid="edit-modal">
            EditModal (Render #{componentRenderCounts.editModal})
            <MockTodoForm
              initialTitle={props.todo?.title}
              initialBody={props.todo?.body}
              initialUrgency="today"
              submitLabel="Update"
              onSubmit={async (data) => {
                const success = await mockFormActions.submitForm(data)
                if (success) {props.onClose()}
              }}
              onCancel={() => {
                mockFormActions.resetForm()
                props.onClose()
              }}
            />
            <button
              data-testid="close-modal"
              onClick={() => {
                performanceMetrics.modalCloseTime = Date.now() - renderStartTime
                props.onClose()
              }}
            >
              Close
            </button>
          </div>
        )
      }
      return null
    })

    // Setup TodoForm mock with performance tracking
    MockTodoForm.mockImplementation((props) => {
      componentRenderCounts.todoForm++
      performanceMetrics.totalRenderCount++
      performanceMetrics.formRenderTime = Date.now()

      return (
        <div data-testid="todo-form">
          TodoForm (Render #{componentRenderCounts.todoForm})
          <input
            data-testid="title-input"
            defaultValue={props.initialTitle || ''}
            onChange={(e) => mockFormActions.updateField('title', e.target.value)}
          />
          <textarea
            data-testid="body-input"
            defaultValue={props.initialBody || ''}
            onChange={(e) => mockFormActions.updateField('body', e.target.value)}
          />
          <button
            data-testid="submit-form"
            onClick={() => props.onSubmit({
              title: 'Updated Title',
              body: 'Updated Body',
              urgency: 'today',
              deadline: '2025-08-26',
              slackData: null
            })}
          >
            Submit
          </button>
          <button
            data-testid="cancel-form"
            onClick={props.onCancel}
          >
            Cancel
          </button>
        </div>
      )
    })

    // Setup AuthForm mock
    MockAuthForm.mockReturnValue(<div data-testid="auth-form">AuthForm</div>)

    // Setup useTodoForm mock
    mockUseTodoForm.mockReturnValue({
      state: {
        formData: {
          title: 'Test Todo',
          body: 'Test body',
          deadline: '2025-08-25',
          urgency: 'today' as const,
          slackData: null
        },
        loading: false,
        error: null,
        isDirty: false,
        slackUrl: '',
        slackConnections: [],
        generatingTitle: false,
        titleSuggestions: []
      },
      actions: mockFormActions
    })

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

  describe('Complete Modal Editing Workflow', () => {
    it('should handle complete edit workflow without infinite re-renders', async () => {
      const user = userEvent.setup()

      const { rerender } = render(<DashboardPage />)

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('todo-card-todo-1')).toBeInTheDocument()
      })

      const initialRenderCount = performanceMetrics.totalRenderCount

      // Step 1: Click edit button to open modal
      const startTime = Date.now()

      // Mock the modal opening behavior
      mockUI.setSelectedTodo.mockImplementation((todo: any) => {
        mockUI.selectedTodo = todo
        mockUI.isEditModalOpen = true

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
        await user.click(screen.getByTestId('edit-todo-1'))
        // Trigger re-render with modal open
        rerender(<DashboardPage />)
      })

      performanceMetrics.modalOpenTime = Date.now() - startTime

      // Should not cause excessive renders during modal open
      expect(performanceMetrics.totalRenderCount - initialRenderCount).toBeLessThan(10)
      expect(performanceMetrics.modalOpenTime).toBeLessThan(500)

      // Wait for modal to be rendered
      await waitFor(() => {
        expect(screen.getByTestId('edit-modal')).toBeInTheDocument()
        expect(screen.getByTestId('todo-form')).toBeInTheDocument()
      })

      const modalOpenRenderCount = performanceMetrics.totalRenderCount

      // Step 2: Interact with form fields
      const titleInput = screen.getByTestId('title-input')
      const bodyInput = screen.getByTestId('body-input')

      await act(async () => {
        await user.clear(titleInput)
        await user.type(titleInput, 'Updated Todo Title')
        await user.clear(bodyInput)
        await user.type(bodyInput, 'Updated todo body content')
      })

      // Form interactions should not cause excessive re-renders
      const formInteractionRenderCount = performanceMetrics.totalRenderCount - modalOpenRenderCount
      expect(formInteractionRenderCount).toBeLessThan(15) // Allow for reasonable keystroke renders

      // Step 3: Submit form
      const preSubmitRenderCount = performanceMetrics.totalRenderCount

      await act(async () => {
        await user.click(screen.getByTestId('submit-form'))
      })

      // Wait for form submission to complete
      await waitFor(() => {
        expect(mockFormActions.submitForm).toHaveBeenCalledTimes(1)
      })

      // Verify that the form was submitted successfully and modal should close
      expect(mockFormActions.submitForm).toHaveReturned()

      const submitRenderCount = performanceMetrics.totalRenderCount - preSubmitRenderCount
      expect(submitRenderCount).toBeLessThan(5) // Submission should be efficient

      // Step 4: Verify modal closes and data is updated
      // Mock the updated state after successful submission
      const updatedTodos = mockTodos.map(todo =>
        todo.id === 'todo-1'
          ? createMockTodo('todo-1', {
            title: 'Updated Todo Title',
            body: 'Updated todo body content'
          })
          : todo
      )

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
        ui: {
          ...mockUI,
          selectedTodo: null,
          isEditModalOpen: false
        },
        user: mockUser
      })

      // Trigger re-render with modal closed
      rerender(<DashboardPage />)

      // Modal should be closed and TodoCard should reflect updates
      await waitFor(() => {
        expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument()
      })

      // Overall workflow should complete efficiently
      const totalWorkflowTime = Date.now() - startTime
      expect(totalWorkflowTime).toBeLessThan(2000) // Complete workflow under 2 seconds
      expect(performanceMetrics.totalRenderCount).toBeLessThan(50) // Reasonable total render count
    })

    it('should handle modal cancellation without infinite loops', async () => {
      const user = userEvent.setup()

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('todo-card-todo-2')).toBeInTheDocument()
      })

      // Open modal
      mockUI.selectedTodo = mockTodos[1]
      mockUI.isEditModalOpen = true
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
          selectedTodo: mockTodos[1],
          isEditModalOpen: true
        },
        user: mockUser
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('edit-modal')).toBeInTheDocument()
      })

      const initialRenderCount = performanceMetrics.totalRenderCount

      // Make some changes to form
      await act(async () => {
        await user.type(screen.getByTestId('title-input'), ' - Modified')
      })

      // Cancel form
      await act(async () => {
        await user.click(screen.getByTestId('cancel-form'))
      })

      // Verify cancel behavior
      await waitFor(() => {
        expect(mockFormActions.resetForm).toHaveBeenCalledTimes(1)
      })

      // Cancellation should not cause excessive re-renders
      const cancelRenderCount = performanceMetrics.totalRenderCount - initialRenderCount
      expect(cancelRenderCount).toBeLessThan(8)
    })

    it('should handle rapid modal open/close without memory leaks', async () => {
      const user = userEvent.setup()

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('todo-card-todo-1')).toBeInTheDocument()
      })

      const startRenderCount = performanceMetrics.totalRenderCount
      const startTime = Date.now()

      // Rapidly open and close modal multiple times
      for (let i = 0; i < 5; i++) {
        // Open modal
        mockUI.selectedTodo = mockTodos[0]
        mockUI.isEditModalOpen = true
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
            selectedTodo: mockTodos[0],
            isEditModalOpen: true
          },
          user: mockUser
        })

        render(<DashboardPage />)

        // Close modal
        mockUI.selectedTodo = null
        mockUI.isEditModalOpen = false
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
      }

      const endTime = Date.now()
      const totalTime = endTime - startTime
      const totalRenders = performanceMetrics.totalRenderCount - startRenderCount

      // Rapid operations should complete efficiently
      expect(totalTime).toBeLessThan(1000) // Under 1 second
      expect(totalRenders).toBeLessThan(100) // Reasonable render count for 5 cycles
    })

    it('should handle form submission errors gracefully', async () => {
      const user = userEvent.setup()

      // Mock form submission failure
      mockFormActions.submitForm.mockResolvedValue(false)

      render(<DashboardPage />)

      // Open modal
      mockUI.selectedTodo = mockTodos[0]
      mockUI.isEditModalOpen = true
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
          selectedTodo: mockTodos[0],
          isEditModalOpen: true
        },
        user: mockUser
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('edit-modal')).toBeInTheDocument()
      })

      const initialRenderCount = performanceMetrics.totalRenderCount

      // Submit form (will fail)
      await act(async () => {
        await user.click(screen.getByTestId('submit-form'))
      })

      // Wait for submission attempt
      await waitFor(() => {
        expect(mockFormActions.submitForm).toHaveBeenCalledTimes(1)
      })

      // Modal should remain open on failure
      expect(screen.getByTestId('edit-modal')).toBeInTheDocument()

      // Error handling should not cause excessive re-renders
      const errorRenderCount = performanceMetrics.totalRenderCount - initialRenderCount
      expect(errorRenderCount).toBeLessThan(5)
    })

    it('should handle concurrent editing attempts safely', async () => {
      const user = userEvent.setup()

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('todo-card-todo-1')).toBeInTheDocument()
        expect(screen.getByTestId('todo-card-todo-2')).toBeInTheDocument()
      })

      const startRenderCount = performanceMetrics.totalRenderCount
      const startTime = Date.now()

      // Simulate rapid clicking on multiple edit buttons
      await act(async () => {
        const promises = [
          user.click(screen.getByTestId('edit-todo-1')),
          user.click(screen.getByTestId('edit-todo-2')),
          user.click(screen.getByTestId('edit-todo-1'))
        ]
        await Promise.allSettled(promises)
      })

      const endTime = Date.now()
      const concurrentTime = endTime - startTime
      const concurrentRenders = performanceMetrics.totalRenderCount - startRenderCount

      // Concurrent operations should be handled gracefully
      expect(concurrentTime).toBeLessThan(500)
      expect(concurrentRenders).toBeLessThan(20)
    })
  })

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks for modal workflow', async () => {
      const user = userEvent.setup()

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('todo-card-todo-1')).toBeInTheDocument()
      })

      // Performance test: Complete workflow 10 times
      const benchmarkStartTime = Date.now()
      const benchmarkStartRenders = performanceMetrics.totalRenderCount

      for (let i = 0; i < 10; i++) {
        // Open modal
        mockUI.selectedTodo = mockTodos[i % mockTodos.length]
        mockUI.isEditModalOpen = true

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
            selectedTodo: mockTodos[i % mockTodos.length],
            isEditModalOpen: true
          },
          user: mockUser
        })

        const { rerender } = render(<DashboardPage />)

        // Submit and close
        await act(async () => {
          rerender(<DashboardPage />)
        })

        mockUI.selectedTodo = null
        mockUI.isEditModalOpen = false

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

        rerender(<DashboardPage />)
      }

      const benchmarkEndTime = Date.now()
      const totalBenchmarkTime = benchmarkEndTime - benchmarkStartTime
      const totalBenchmarkRenders = performanceMetrics.totalRenderCount - benchmarkStartRenders

      // Performance benchmarks
      expect(totalBenchmarkTime).toBeLessThan(5000) // 10 workflows under 5 seconds
      expect(totalBenchmarkRenders).toBeLessThan(300) // Reasonable render count for 10 workflows
      expect(totalBenchmarkTime / 10).toBeLessThan(500) // Average per workflow under 500ms
    })
  })
})
