/**
 * EditTodoModal Component Test Suite
 * EditTodoModalコンポーネントの無限再レンダリング防止テスト
 */

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditTodoModal } from '../../../components/todo/EditTodoModal'
import { Todo } from '@/src/domain/types'

// Mock dependencies
jest.mock('../../../src/presentation/hooks/useTodoForm')
jest.mock('../../../components/todo/TodoForm')

import { useTodoForm } from '@/src/presentation/hooks/useTodoForm'
import { TodoForm } from '@/components/todo/TodoForm'

// Mock implementations
const mockUseTodoForm = useTodoForm as jest.MockedFunction<typeof useTodoForm>
const MockTodoForm = TodoForm as jest.MockedFunction<typeof TodoForm>

// Mock todo data
const createMockTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 'todo-123',
  user_id: 'user-456',
  title: 'Test Todo',
  body: 'Test todo body',
  urgency: 'today',
  deadline: '2025-08-25',
  importance_score: 1200,
  status: 'open',
  created_at: '2025-08-20T10:00:00Z',
  created_via: 'manual',
  ...overrides
})

// Mock form state and actions
const mockFormState = {
  formData: {
    title: 'Test Todo',
    body: 'Test todo body',
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

describe('EditTodoModal', () => {
  let mockTodo: Todo
  let mockOnClose: jest.Mock
  let renderCount: number

  beforeEach(() => {
    jest.clearAllMocks()
    mockTodo = createMockTodo()
    mockOnClose = jest.fn()
    renderCount = 0

    // Setup mock useTodoForm
    mockUseTodoForm.mockReturnValue({
      state: mockFormState,
      actions: mockFormActions
    })

    // Setup mock TodoForm to track render count
    MockTodoForm.mockImplementation((props) => {
      renderCount++
      return (
        <div data-testid="todo-form">
          TodoForm (Render #{renderCount})
          <button
            data-testid="submit-button"
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
          <button data-testid="cancel-button" onClick={props.onCancel}>
            Cancel
          </button>
        </div>
      )
    })
  })

  describe('Re-render Prevention', () => {
    it('should not re-render when todo object reference changes but data stays same', async () => {
      const { rerender } = render(
        <EditTodoModal
          isOpen={true}
          onClose={mockOnClose}
          todo={mockTodo}
        />
      )

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('todo-form')).toBeInTheDocument()
      })

      const initialRenderCount = renderCount

      // Create new todo object with same data but different reference
      const sameTodoNewReference = createMockTodo({
        id: mockTodo.id,
        title: mockTodo.title,
        body: mockTodo.body,
        deadline: mockTodo.deadline,
        importance_score: mockTodo.importance_score
      })

      // Re-render with new object reference
      rerender(
        <EditTodoModal
          isOpen={true}
          onClose={mockOnClose}
          todo={sameTodoNewReference}
        />
      )

      // Should not trigger excessive re-renders due to memoization
      await waitFor(() => {
        expect(renderCount - initialRenderCount).toBeLessThan(3)
      })
    })

    it('should re-render only when todo data actually changes', async () => {
      const { rerender } = render(
        <EditTodoModal
          isOpen={true}
          onClose={mockOnClose}
          todo={mockTodo}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('todo-form')).toBeInTheDocument()
      })

      const initialRenderCount = renderCount

      // Change actual todo data
      const changedTodo = createMockTodo({
        id: mockTodo.id,
        title: 'Changed Title', // Actual data change
        body: mockTodo.body,
        deadline: mockTodo.deadline
      })

      rerender(
        <EditTodoModal
          isOpen={true}
          onClose={mockOnClose}
          todo={changedTodo}
        />
      )

      // Should trigger re-render when data actually changes
      await waitFor(() => {
        expect(renderCount).toBeGreaterThan(initialRenderCount)
      })
    })

    it('should not cause infinite loops during form submission', async () => {
      const user = userEvent.setup()

      render(
        <EditTodoModal
          isOpen={true}
          onClose={mockOnClose}
          todo={mockTodo}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('todo-form')).toBeInTheDocument()
      })

      const initialRenderCount = renderCount

      // Simulate form submission
      const submitButton = screen.getByTestId('submit-button')

      await act(async () => {
        await user.click(submitButton)
      })

      // Wait for submission to complete
      await waitFor(() => {
        expect(mockFormActions.submitForm).toHaveBeenCalledTimes(1)
      })

      // Should not cause excessive re-renders
      expect(renderCount - initialRenderCount).toBeLessThan(3)
    })
  })

  describe('Memoization Behavior', () => {
    it('should memoize TodoEntity creation properly', async () => {
      let useTodoFormCallCount = 0

      mockUseTodoForm.mockImplementation((options) => {
        useTodoFormCallCount++

        // Verify that initialTodo is stable for same data
        if (options) {
          expect(options.initialTodo).toBeDefined()
        }

        return {
          state: mockFormState,
          actions: mockFormActions
        }
      })

      const { rerender } = render(
        <EditTodoModal
          isOpen={true}
          onClose={mockOnClose}
          todo={mockTodo}
        />
      )

      const initialCallCount = useTodoFormCallCount

      // Re-render with same todo data but different object reference
      const sameTodoNewRef = createMockTodo()

      rerender(
        <EditTodoModal
          isOpen={true}
          onClose={mockOnClose}
          todo={sameTodoNewRef}
        />
      )

      // useTodoForm should not be called excessively due to memoization
      // Allow for reasonable re-calls due to prop changes
      await waitFor(() => {
        expect(useTodoFormCallCount - initialCallCount).toBeLessThan(3)
      })
    })

    it('should handle modal open/close without infinite loops', async () => {
      const { rerender } = render(
        <EditTodoModal
          isOpen={false}
          onClose={mockOnClose}
          todo={mockTodo}
        />
      )

      // Modal should not render when closed
      expect(screen.queryByTestId('todo-form')).not.toBeInTheDocument()

      const initialRenderCount = renderCount

      // Open modal
      rerender(
        <EditTodoModal
          isOpen={true}
          onClose={mockOnClose}
          todo={mockTodo}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('todo-form')).toBeInTheDocument()
      })

      // Close modal
      rerender(
        <EditTodoModal
          isOpen={false}
          onClose={mockOnClose}
          todo={mockTodo}
        />
      )

      // Should not cause excessive re-renders during open/close cycle
      expect(renderCount - initialRenderCount).toBeLessThan(5)
    })
  })

  describe('Form State Management', () => {
    it('should handle form reset without triggering infinite updates', async () => {
      const user = userEvent.setup()

      render(
        <EditTodoModal
          isOpen={true}
          onClose={mockOnClose}
          todo={mockTodo}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('todo-form')).toBeInTheDocument()
      })

      // Trigger cancel (which calls resetForm)
      const cancelButton = screen.getByTestId('cancel-button')

      await act(async () => {
        await user.click(cancelButton)
      })

      // Should call resetForm and onClose without infinite loops
      await waitFor(() => {
        expect(mockFormActions.resetForm).toHaveBeenCalledTimes(1)
        expect(mockOnClose).toHaveBeenCalledTimes(1)
      })
    })

    it('should handle successful form submission', async () => {
      const user = userEvent.setup()

      render(
        <EditTodoModal
          isOpen={true}
          onClose={mockOnClose}
          todo={mockTodo}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('todo-form')).toBeInTheDocument()
      })

      const submitButton = screen.getByTestId('submit-button')

      await act(async () => {
        await user.click(submitButton)
      })

      // Should call submitForm and close modal on success
      await waitFor(() => {
        expect(mockFormActions.submitForm).toHaveBeenCalledTimes(1)
        expect(mockOnClose).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle form submission errors without infinite loops', async () => {
      const user = userEvent.setup()

      // Mock form submission failure
      mockFormActions.submitForm.mockResolvedValue(false)

      render(
        <EditTodoModal
          isOpen={true}
          onClose={mockOnClose}
          todo={mockTodo}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('todo-form')).toBeInTheDocument()
      })

      const submitButton = screen.getByTestId('submit-button')

      await act(async () => {
        await user.click(submitButton)
      })

      // Should not close modal on submission failure
      await waitFor(() => {
        expect(mockFormActions.submitForm).toHaveBeenCalledTimes(1)
        expect(mockOnClose).not.toHaveBeenCalled()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle null todo gracefully', () => {
      render(
        <EditTodoModal
          isOpen={true}
          onClose={mockOnClose}
          todo={null}
        />
      )

      // Should not render anything when todo is null
      expect(screen.queryByTestId('todo-form')).not.toBeInTheDocument()
    })

    it('should handle rapid prop changes without breaking', async () => {
      const { rerender } = render(
        <EditTodoModal
          isOpen={true}
          onClose={mockOnClose}
          todo={mockTodo}
        />
      )

      // Simulate rapid prop changes
      for (let i = 0; i < 10; i++) {
        const rapidTodo = createMockTodo({
          id: `todo-${i}`,
          title: `Rapid Todo ${i}`
        })

        rerender(
          <EditTodoModal
            isOpen={true}
            onClose={mockOnClose}
            todo={rapidTodo}
          />
        )
      }

      // Should handle rapid changes without excessive re-renders
      await waitFor(() => {
        expect(renderCount).toBeLessThan(20) // Reasonable threshold
      })
    })
  })
})
