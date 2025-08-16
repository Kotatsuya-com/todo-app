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
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: null,
  totalTodos: 5,
  completedTodos: 2,
  createdAt: '2025-08-01T10:00:00Z',
  updatedAt: '2025-08-03T10:00:00Z'
})

// Mock todo
const mockTodo = new TodoEntity({
  id: 'todo-123',
  userId: 'test-user-id',
  title: 'Existing Todo',
  body: 'Existing todo body',
  deadline: '2025-08-10',
  importanceScore: 1000,
  status: 'active',
  createdAt: '2025-08-01T10:00:00Z',
  updatedAt: '2025-08-01T10:00:00Z',
  createdVia: 'manual'
})

// Mock TodoUseCases
const mockTodoUseCases = {
  createTodo: jest.fn(),
  updateTodo: jest.fn()
}

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
        ...mockTodo,
        title: null,
        deadline: null
      })

      const { result } = renderHook(() => 
        useTodoForm({ initialTodo: todoWithNulls })
      )

      expect(result.current.state.formData).toEqual({
        title: '',
        body: undefined,
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
      let resolveCreate: (value: any) => void
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
        ({ initialTodo }) => useTodoForm({ initialTodo }),
        { initialProps: { initialTodo: null } }
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