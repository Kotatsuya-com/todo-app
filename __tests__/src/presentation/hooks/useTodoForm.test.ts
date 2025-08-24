/**
 * useTodoForm Hook Test Suite
 * useTodoFormフックのテスト
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useTodoForm } from '../../../../src/presentation/hooks/useTodoForm'
import { TodoEntity } from '../../../../src/domain/entities/Todo'
import { UserEntity } from '../../../../src/domain/entities/User'

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

// Mock todo
const mockTodo = new TodoEntity({
  id: 'todo-123',
  user_id: 'test-user-id',
  title: 'Existing Todo',
  body: 'Existing todo body',
  deadline: '2025-08-10',
  importance_score: 1000,
  status: 'open',
  created_at: '2025-08-01T10:00:00Z',
  updated_at: '2025-08-01T10:00:00Z',
  created_via: 'manual'
})

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

describe('useTodoForm', () => {
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

    mockTodoUseCases.createTodo.mockResolvedValue({
      success: true,
      data: mockTodo
    })

    mockTodoUseCases.updateTodo.mockResolvedValue({
      success: true,
      data: mockTodo
    })
  })

  describe('Initial State', () => {
    it('should initialize with empty form data', () => {
      const { result } = renderHook(() => useTodoForm())

      expect(result.current.state.formData).toEqual({
        title: '',
        body: '',
        deadline: '',
        slackData: null,
        urgency: 'today'
      })
      expect(result.current.state.loading).toBe(false)
      expect(result.current.state.error).toBeNull()
      expect(result.current.state.isDirty).toBe(false)
    })

    it('should initialize with existing todo data', () => {
      const { result } = renderHook(() =>
        useTodoForm({ initialTodo: mockTodo })
      )

      expect(result.current.state.formData).toEqual({
        title: 'Existing Todo',
        body: 'Existing todo body',
        deadline: '2025-08-10',
        slackData: null,
        urgency: 'later'
      })
      expect(result.current.state.isDirty).toBe(false)
    })

    it('should handle todo with null title and deadline', () => {
      const todoWithNulls = new TodoEntity({
        id: mockTodo.id,
        user_id: mockTodo.userId,
        title: null,
        body: mockTodo.body,
        deadline: null,
        importance_score: mockTodo.importanceScore,
        status: mockTodo.status,
        created_at: mockTodo.createdAt,
        updated_at: mockTodo.updatedAt,
        created_via: 'manual'
      })

      const { result } = renderHook(() =>
        useTodoForm({ initialTodo: todoWithNulls })
      )

      expect(result.current.state.formData).toEqual({
        title: '',
        body: 'Existing todo body',
        deadline: '',
        slackData: null,
        urgency: 'later'
      })
    })
  })

  describe('Form Field Updates', () => {
    it('should update form fields correctly', () => {
      const { result } = renderHook(() => useTodoForm())

      act(() => {
        result.current.actions.updateField('title', 'New Title')
      })

      expect(result.current.state.formData.title).toBe('New Title')
      expect(result.current.state.isDirty).toBe(true)
      expect(result.current.state.error).toBeNull()
    })

    it('should update body field', () => {
      const { result } = renderHook(() => useTodoForm())

      act(() => {
        result.current.actions.updateField('body', 'New body content')
      })

      expect(result.current.state.formData.body).toBe('New body content')
      expect(result.current.state.isDirty).toBe(true)
    })

    it('should update deadline field', () => {
      const { result } = renderHook(() => useTodoForm())

      act(() => {
        result.current.actions.updateField('deadline', '2025-08-15')
      })

      expect(result.current.state.formData.deadline).toBe('2025-08-15')
      expect(result.current.state.isDirty).toBe(true)
    })
  })

  describe('Form Reset', () => {
    it('should reset form to initial state', () => {
      const { result } = renderHook(() => useTodoForm())

      // Make changes
      act(() => {
        result.current.actions.updateField('title', 'Changed Title')
        result.current.actions.updateField('body', 'Changed Body')
      })

      expect(result.current.state.isDirty).toBe(true)

      // Reset form
      act(() => {
        result.current.actions.resetForm()
      })

      expect(result.current.state.formData).toEqual({
        title: '',
        body: '',
        deadline: '',
        slackData: null,
        urgency: 'today'
      })
      expect(result.current.state.isDirty).toBe(false)
      expect(result.current.state.error).toBeNull()
    })

    it('should reset form to initial todo data', () => {
      const { result } = renderHook(() =>
        useTodoForm({ initialTodo: mockTodo })
      )

      // Make changes
      act(() => {
        result.current.actions.updateField('title', 'Changed Title')
      })

      // Reset form
      act(() => {
        result.current.actions.resetForm()
      })

      expect(result.current.state.formData).toEqual({
        title: 'Existing Todo',
        body: 'Existing todo body',
        deadline: '2025-08-10',
        slackData: null,
        urgency: 'later'
      })
      expect(result.current.state.isDirty).toBe(false)
    })
  })

  describe('Form Validation', () => {
    it('should validate empty body as invalid', () => {
      const { result } = renderHook(() => useTodoForm())

      const validation = result.current.actions.validateForm()

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('内容を入力してください')
    })

    it('should validate valid form data', () => {
      const { result } = renderHook(() => useTodoForm())

      act(() => {
        result.current.actions.updateField('body', 'Valid todo content')
      })

      const validation = result.current.actions.validateForm()

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should validate body length', () => {
      const { result } = renderHook(() => useTodoForm())

      act(() => {
        result.current.actions.updateField('body', 'a'.repeat(TodoEntity.MAX_BODY_LENGTH + 1))
      })

      const validation = result.current.actions.validateForm()

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain(`内容は${TodoEntity.MAX_BODY_LENGTH}文字以内で入力してください`)
    })

    it('should validate title length', () => {
      const { result } = renderHook(() => useTodoForm())

      act(() => {
        result.current.actions.updateField('title', 'a'.repeat(TodoEntity.MAX_TITLE_LENGTH + 1))
        result.current.actions.updateField('body', 'Valid body')
      })

      const validation = result.current.actions.validateForm()

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain(`タイトルは${TodoEntity.MAX_TITLE_LENGTH}文字以内で入力してください`)
    })

    it('should validate deadline format', () => {
      const { result } = renderHook(() => useTodoForm())

      act(() => {
        result.current.actions.updateField('body', 'Valid body')
        result.current.actions.updateField('deadline', 'invalid-date')
      })

      const validation = result.current.actions.validateForm()

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('有効な期限を入力してください')
    })
  })

  describe('Form Submission - Create Todo', () => {
    it('should create new todo successfully', async () => {
      const onSuccess = jest.fn()
      const { result } = renderHook(() =>
        useTodoForm({ onSuccess })
      )

      act(() => {
        result.current.actions.updateField('title', 'New Todo')
        result.current.actions.updateField('body', 'New todo body')
        result.current.actions.updateField('deadline', '2025-08-15')
      })

      let submitResult: boolean
      await act(async () => {
        submitResult = await result.current.actions.submitForm()
      })

      expect(submitResult!).toBe(true)
      expect(mockTodoUseCases.createTodo).toHaveBeenCalledWith({
        userId: 'test-user-id',
        title: 'New Todo',
        body: 'New todo body',
        deadline: '2025-08-15',
        createdVia: 'manual'
      })
      expect(onSuccess).toHaveBeenCalledWith(mockTodo)
      expect(result.current.state.isDirty).toBe(false)
    })

    it('should create todo with undefined title when empty', async () => {
      const { result } = renderHook(() => useTodoForm())

      act(() => {
        result.current.actions.updateField('body', 'Todo without title')
      })

      await act(async () => {
        await result.current.actions.submitForm()
      })

      expect(mockTodoUseCases.createTodo).toHaveBeenCalledWith({
        userId: 'test-user-id',
        title: undefined,
        body: 'Todo without title',
        deadline: undefined,
        createdVia: 'manual'
      })
    })

    it('should handle create todo failure', async () => {
      const onError = jest.fn()
      mockTodoUseCases.createTodo.mockResolvedValue({
        success: false,
        error: 'Creation failed'
      })

      const { result } = renderHook(() =>
        useTodoForm({ onError })
      )

      act(() => {
        result.current.actions.updateField('body', 'Valid body')
      })

      let submitResult: boolean
      await act(async () => {
        submitResult = await result.current.actions.submitForm()
      })

      expect(submitResult!).toBe(false)
      expect(result.current.state.error).toBe('Creation failed')
      expect(onError).toHaveBeenCalledWith('Creation failed')
    })
  })

  describe('Form Submission - Update Todo', () => {
    it('should update existing todo successfully', async () => {
      const onSuccess = jest.fn()
      const { result } = renderHook(() =>
        useTodoForm({ initialTodo: mockTodo, onSuccess })
      )

      act(() => {
        result.current.actions.updateField('title', 'Updated Title')
        result.current.actions.updateField('body', 'Updated body')
      })

      let submitResult: boolean
      await act(async () => {
        submitResult = await result.current.actions.submitForm()
      })

      expect(submitResult!).toBe(true)
      expect(mockTodoUseCases.updateTodo).toHaveBeenCalledWith({
        id: 'todo-123',
        userId: 'test-user-id',
        updates: {
          title: 'Updated Title',
          body: 'Updated body',
          deadline: '2025-08-10'
        }
      })
      expect(onSuccess).toHaveBeenCalledWith(mockTodo)
    })

    it('should handle update todo failure', async () => {
      const onError = jest.fn()
      mockTodoUseCases.updateTodo.mockResolvedValue({
        success: false,
        error: 'Update failed'
      })

      const { result } = renderHook(() =>
        useTodoForm({ initialTodo: mockTodo, onError })
      )

      act(() => {
        result.current.actions.updateField('body', 'Updated body')
      })

      let submitResult: boolean
      await act(async () => {
        submitResult = await result.current.actions.submitForm()
      })

      expect(submitResult!).toBe(false)
      expect(result.current.state.error).toBe('Update failed')
      expect(onError).toHaveBeenCalledWith('Update failed')
    })
  })

  describe('Authentication Handling', () => {
    it('should handle unauthenticated user', async () => {
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

      const { result } = renderHook(() => useTodoForm())

      act(() => {
        result.current.actions.updateField('body', 'Valid body')
      })

      let submitResult: boolean
      await act(async () => {
        submitResult = await result.current.actions.submitForm()
      })

      expect(submitResult!).toBe(false)
      expect(result.current.state.error).toBe('ユーザーが認証されていません')
    })
  })

  describe('Validation Before Submission', () => {
    it('should prevent submission with invalid data', async () => {
      const { result } = renderHook(() => useTodoForm())

      // Don't set body (invalid)
      let submitResult: boolean
      await act(async () => {
        submitResult = await result.current.actions.submitForm()
      })

      expect(submitResult!).toBe(false)
      expect(result.current.state.error).toBe('内容を入力してください')
      expect(mockTodoUseCases.createTodo).not.toHaveBeenCalled()
    })
  })

  describe('Memoization and Stability Prevention', () => {
    it('should not re-initialize form when initialTodo object reference changes but data stays same', () => {
      // Create initial todo
      const initialTodo = new TodoEntity({
        id: 'stable-todo',
        user_id: 'test-user-id',
        title: 'Stable Title',
        body: 'Stable body',
        deadline: '2025-08-15',
        importance_score: 1000,
        status: 'open',
        created_at: '2025-08-01T10:00:00Z',
        updated_at: '2025-08-01T10:00:00Z',
        created_via: 'manual'
      })

      const { result, rerender } = renderHook(
        ({ todo }) => useTodoForm({ initialTodo: todo }),
        { initialProps: { todo: initialTodo } }
      )

      // Get initial form state
      const initialFormData = result.current.state.formData
      const initialIsDirty = result.current.state.isDirty

      // Create new TodoEntity with same data but different object reference
      const sameTodoNewReference = new TodoEntity({
        id: 'stable-todo',
        user_id: 'test-user-id',
        title: 'Stable Title',
        body: 'Stable body',
        deadline: '2025-08-15',
        importance_score: 1000,
        status: 'open',
        created_at: '2025-08-01T10:00:00Z',
        updated_at: '2025-08-01T10:00:00Z',
        created_via: 'manual'
      })

      // Re-render with new object reference but same data
      rerender({ todo: sameTodoNewReference })

      // Form should not re-initialize due to memoization
      expect(result.current.state.formData).toEqual(initialFormData)
      expect(result.current.state.isDirty).toBe(initialIsDirty)
    })

    it('should re-initialize form only when initialTodo data actually changes', () => {
      const initialTodo = new TodoEntity({
        id: 'changing-todo',
        user_id: 'test-user-id',
        title: 'Original Title',
        body: 'Original body',
        deadline: '2025-08-15',
        importance_score: 1000,
        status: 'open',
        created_at: '2025-08-01T10:00:00Z',
        updated_at: '2025-08-01T10:00:00Z',
        created_via: 'manual'
      })

      const { result, rerender } = renderHook(
        ({ todo }) => useTodoForm({ initialTodo: todo }),
        { initialProps: { todo: initialTodo } }
      )

      expect(result.current.state.formData.title).toBe('Original Title')

      // Create todo with actually changed data
      const changedTodo = new TodoEntity({
        id: 'changing-todo',
        user_id: 'test-user-id',
        title: 'Changed Title', // Actual data change
        body: 'Original body',
        deadline: '2025-08-15',
        importance_score: 1000,
        status: 'open',
        created_at: '2025-08-01T10:00:00Z',
        updated_at: '2025-08-01T10:00:00Z',
        created_via: 'manual'
      })

      rerender({ todo: changedTodo })

      // Form should re-initialize with new data
      expect(result.current.state.formData.title).toBe('Changed Title')
      expect(result.current.state.isDirty).toBe(false) // Should be clean after re-init
    })

    it('should handle rapid initialTodo changes without infinite loops', async () => {
      const { result, rerender } = renderHook(
        ({ todo }) => useTodoForm({ initialTodo: todo }),
        { initialProps: { todo: mockTodo } }
      )

      const startTime = Date.now()

      // Simulate rapid changes
      for (let i = 0; i < 20; i++) {
        const rapidTodo = new TodoEntity({
          ...mockTodo.getData(),
          title: `Rapid Title ${i}`,
          id: `rapid-${i}`
        })

        rerender({ todo: rapidTodo })

        // Should complete each update quickly
        if (Date.now() - startTime > 5000) {
          throw new Error('Infinite loop detected - took too long')
        }
      }

      // Should complete all updates within reasonable time
      expect(Date.now() - startTime).toBeLessThan(1000)
    })

    it('should maintain form state stability during field updates', () => {
      const { result } = renderHook(() => useTodoForm({ initialTodo: mockTodo }))

      // Make multiple rapid field updates
      act(() => {
        result.current.actions.updateField('title', 'Update 1')
        result.current.actions.updateField('title', 'Update 2')
        result.current.actions.updateField('body', 'Body Update 1')
        result.current.actions.updateField('title', 'Update 3')
      })

      // Should maintain consistent state
      expect(result.current.state.formData.title).toBe('Update 3')
      expect(result.current.state.formData.body).toBe('Body Update 1')
      expect(result.current.state.isDirty).toBe(true)
    })

    it('should prevent infinite loops when resetForm is called repeatedly', () => {
      const { result } = renderHook(() => useTodoForm({ initialTodo: mockTodo }))

      // Make the form dirty first
      act(() => {
        result.current.actions.updateField('title', 'Dirty Title')
      })

      expect(result.current.state.isDirty).toBe(true)

      // Call resetForm multiple times rapidly
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.actions.resetForm()
        }
      })

      // Should be clean and stable
      expect(result.current.state.isDirty).toBe(false)
      expect(result.current.state.formData.title).toBe(mockTodo.title)
    })

    it('should handle validation without triggering state loops', () => {
      const { result } = renderHook(() => useTodoForm())

      // Perform multiple validations
      const validationResults: any[] = []

      act(() => {
        for (let i = 0; i < 5; i++) {
          validationResults.push(result.current.actions.validateForm())
        }
      })

      // All validations should return consistent results
      validationResults.forEach(validation => {
        expect(validation.valid).toBe(false) // Empty body is invalid
        expect(validation.errors).toContain('内容を入力してください')
      })
    })
  })

  describe('Form Dependency Stability', () => {
    it('should maintain stable callback references', () => {
      const { result, rerender } = renderHook(() => useTodoForm({ initialTodo: mockTodo }))

      const initialCallbacks = {
        updateField: result.current.actions.updateField,
        resetForm: result.current.actions.resetForm,
        submitForm: result.current.actions.submitForm,
        validateForm: result.current.actions.validateForm
      }

      // Re-render multiple times
      rerender()
      rerender()
      rerender()

      // Callbacks should remain stable (same reference)
      expect(result.current.actions.updateField).toBe(initialCallbacks.updateField)
      expect(result.current.actions.resetForm).toBe(initialCallbacks.resetForm)
      expect(result.current.actions.submitForm).toBe(initialCallbacks.submitForm)
      expect(result.current.actions.validateForm).toBe(initialCallbacks.validateForm)
    })

    it('should handle memoizedFormData updates correctly', () => {
      let renderCount = 0

      const { result, rerender } = renderHook(
        ({ todo }) => {
          renderCount++
          return useTodoForm({ initialTodo: todo })
        },
        { initialProps: { todo: mockTodo } }
      )

      const initialRenderCount = renderCount

      // Re-render with same todo (should not cause form data recalculation)
      rerender({ todo: mockTodo })

      // Should not have caused additional renders beyond the React re-render
      expect(renderCount - initialRenderCount).toBeLessThanOrEqual(2)
    })

    it('should prevent submission loops on success callback', async () => {
      let onSuccessCallCount = 0

      const onSuccess = jest.fn(() => {
        onSuccessCallCount++
        if (onSuccessCallCount > 5) {
          throw new Error('Infinite onSuccess loop detected')
        }
      })

      const { result } = renderHook(() => useTodoForm({
        initialTodo: mockTodo,
        onSuccess
      }))

      act(() => {
        result.current.actions.updateField('body', 'Valid body for submission')
      })

      await act(async () => {
        await result.current.actions.submitForm()
      })

      // Should only call onSuccess once per successful submission
      expect(onSuccessCallCount).toBe(1)
      expect(mockTodoUseCases.updateTodo).toHaveBeenCalledTimes(1)
    })
  })

  describe('Memory Leak Prevention', () => {
    it('should cleanup properly when component unmounts', () => {
      const { result, unmount } = renderHook(() => useTodoForm({ initialTodo: mockTodo }))

      // Verify hook is working
      expect(result.current.state.formData.title).toBe(mockTodo.title)

      // Unmount should not cause errors
      expect(() => unmount()).not.toThrow()
    })

    it('should not retain stale references after prop changes', () => {
      const firstTodo = mockTodo
      const secondTodo = new TodoEntity({
        ...mockTodo.getData(),
        id: 'second-todo',
        title: 'Second Todo Title'
      })

      const { result, rerender } = renderHook(
        ({ todo }) => useTodoForm({ initialTodo: todo }),
        { initialProps: { todo: firstTodo } }
      )

      expect(result.current.state.formData.title).toBe(firstTodo.title)

      // Change to second todo
      rerender({ todo: secondTodo })

      // Should reflect new todo data, not retain old references
      expect(result.current.state.formData.title).toBe(secondTodo.title)
      expect(result.current.state.formData.title).not.toBe(firstTodo.title)
    })
  })

  describe('Urgency Level Setting', () => {
    it('should set deadline for "now" urgency', () => {
      const { result } = renderHook(() => useTodoForm())

      act(() => {
        result.current.actions.setUrgencyLevel('now')
      })

      const today = new Date().toISOString().split('T')[0]
      expect(result.current.state.formData.deadline).toBe(today)
      expect(result.current.state.isDirty).toBe(true)
    })

    it('should set deadline for "today" urgency', () => {
      const { result } = renderHook(() => useTodoForm())

      act(() => {
        result.current.actions.setUrgencyLevel('today')
      })

      const today = new Date().toISOString().split('T')[0]
      expect(result.current.state.formData.deadline).toBe(today)
    })

    it('should set deadline for "tomorrow" urgency', () => {
      const { result } = renderHook(() => useTodoForm())

      act(() => {
        result.current.actions.setUrgencyLevel('tomorrow')
      })

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      expect(result.current.state.formData.deadline).toBe(tomorrowStr)
    })

    it('should clear deadline for "later" urgency', () => {
      const { result } = renderHook(() => useTodoForm())

      // First set a deadline
      act(() => {
        result.current.actions.updateField('deadline', '2025-08-15')
      })

      // Then set to later
      act(() => {
        result.current.actions.setUrgencyLevel('later')
      })

      expect(result.current.state.formData.deadline).toBe('')
    })
  })

  describe('Slack Message Integration', () => {
    it('should fill form from Slack message with URL', () => {
      const { result } = renderHook(() => useTodoForm())

      act(() => {
        result.current.actions.fillFromSlackMessage(
          'Important task from Slack',
          'https://slack.com/message/123'
        )
      })

      expect(result.current.state.formData.body).toBe(
        'Important task from Slack\n\nソース: https://slack.com/message/123'
      )
      expect(result.current.state.isDirty).toBe(true)
    })

    it('should fill form from Slack message without URL', () => {
      const { result } = renderHook(() => useTodoForm())

      act(() => {
        result.current.actions.fillFromSlackMessage('Just the message content')
      })

      expect(result.current.state.formData.body).toBe('Just the message content')
    })
  })

  describe('Error Handling', () => {
    it('should handle unexpected errors during submission', async () => {
      const onError = jest.fn()
      mockTodoUseCases.createTodo.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() =>
        useTodoForm({ onError })
      )

      act(() => {
        result.current.actions.updateField('body', 'Valid body')
      })

      let submitResult: boolean
      await act(async () => {
        submitResult = await result.current.actions.submitForm()
      })

      expect(submitResult!).toBe(false)
      expect(result.current.state.error).toBe('Network error')
      expect(onError).toHaveBeenCalledWith('Network error')
    })

    it('should handle non-Error exceptions', async () => {
      mockTodoUseCases.createTodo.mockRejectedValue('Unexpected error')

      const { result } = renderHook(() => useTodoForm())

      act(() => {
        result.current.actions.updateField('body', 'Valid body')
      })

      await act(async () => {
        await result.current.actions.submitForm()
      })

      expect(result.current.state.error).toBe('予期しないエラーが発生しました')
    })
  })

  describe('Loading States', () => {
    it('should show loading during form submission', async () => {
      let resolveCreate: (value: { success: boolean; data?: TodoEntity; error?: string }) => void
      const createPromise = new Promise(resolve => {
        resolveCreate = resolve
      })

      mockTodoUseCases.createTodo.mockReturnValue(createPromise)

      const { result } = renderHook(() => useTodoForm())

      act(() => {
        result.current.actions.updateField('body', 'Valid body')
      })

      // Start submission
      act(() => {
        result.current.actions.submitForm()
      })

      expect(result.current.state.loading).toBe(true)

      // Resolve submission
      await act(async () => {
        resolveCreate!({ success: true, data: mockTodo })
      })

      expect(result.current.state.loading).toBe(false)
    })
  })

  describe('Initial Todo Changes', () => {
    it('should update form when initialTodo changes', () => {
      const { result, rerender } = renderHook(
        ({ initialTodo }: { initialTodo: TodoEntity | null }) => useTodoForm({ initialTodo }),
        { initialProps: { initialTodo: null as TodoEntity | null } }
      )

      expect(result.current.state.formData.title).toBe('')

      // Change initialTodo
      rerender({ initialTodo: mockTodo })

      expect(result.current.state.formData.title).toBe('Existing Todo')
      expect(result.current.state.formData.body).toBe('Existing todo body')
      expect(result.current.state.formData.deadline).toBe('2025-08-10')
      expect(result.current.state.isDirty).toBe(false)
    })
  })

  describe('Return Value Structure', () => {
    it('should return correct structure', () => {
      const { result } = renderHook(() => useTodoForm())

      // Check state structure
      expect(result.current.state).toHaveProperty('formData')
      expect(result.current.state).toHaveProperty('loading')
      expect(result.current.state).toHaveProperty('error')
      expect(result.current.state).toHaveProperty('isDirty')

      // Check actions structure
      expect(result.current.actions).toHaveProperty('updateField')
      expect(result.current.actions).toHaveProperty('resetForm')
      expect(result.current.actions).toHaveProperty('submitForm')
      expect(result.current.actions).toHaveProperty('validateForm')
      expect(result.current.actions).toHaveProperty('setUrgencyLevel')
      expect(result.current.actions).toHaveProperty('fillFromSlackMessage')

      // Check that all actions are functions
      expect(typeof result.current.actions.updateField).toBe('function')
      expect(typeof result.current.actions.resetForm).toBe('function')
      expect(typeof result.current.actions.submitForm).toBe('function')
      expect(typeof result.current.actions.validateForm).toBe('function')
      expect(typeof result.current.actions.setUrgencyLevel).toBe('function')
      expect(typeof result.current.actions.fillFromSlackMessage).toBe('function')
    })
  })
})
