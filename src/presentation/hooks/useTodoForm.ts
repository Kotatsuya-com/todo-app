/**
 * Todo Form Custom Hook
 * Todo作成・編集フォーム用のカスタムフック
 */

import { useState, useCallback, useEffect } from 'react'
import { TodoEntity } from '../../domain/entities/Todo'
import { createTodoUseCases } from '@/src/infrastructure/di/FrontendServiceFactory'
import { useAuth } from './useAuth'
import { getUIContainer, UIDependencyContainer } from '@/lib/containers/UIContainer'

export interface TodoFormData {
  title: string
  body: string
  deadline: string
  urgency: 'now' | 'today' | 'tomorrow' | 'later'
  slackData?: { text: string; url: string } | null
}

export interface TodoFormState {
  formData: TodoFormData
  loading: boolean
  error: string | null
  isDirty: boolean
  // Slack統合関連
  slackUrl: string
  slackConnections: any[]
  // AI生成関連
  generatingTitle: boolean
  titleSuggestions: string[]
}

export interface TodoFormActions {
  updateField: (_field: keyof TodoFormData, _value: string) => void
  resetForm: (_initialData?: Partial<TodoFormData>) => void
  submitForm: () => Promise<boolean>
  validateForm: () => { valid: boolean; errors: string[] }
  setUrgencyLevel: (_urgency: 'now' | 'today' | 'tomorrow' | 'later') => void
  // Slack統合
  setSlackUrl: (_url: string) => void
  loadSlackMessage: () => Promise<void>
  clearSlackData: () => void
  // AI生成
  generateTitle: () => Promise<void>
  selectTitleSuggestion: (_title: string) => void
  // Legacy methods
  fillFromSlackMessage: (_messageContent: string, _messageUrl?: string) => void
  createTodo: (_data: { title?: string; body: string; deadline?: string }) => Promise<void>
  updateTodo: (_todoId: string, _updates: any) => Promise<void>
  isSubmitting: boolean
}

export interface UseTodoFormReturn {
  state: TodoFormState
  actions: TodoFormActions
}

export interface UseTodoFormOptions {
  initialTodo?: TodoEntity | null
  onSuccess?: (_todo: TodoEntity) => void
  onError?: (_error: string) => void
  // 依存性注入のためのオプション（テスト時に使用）
  uiContainer?: UIDependencyContainer
}

const INITIAL_FORM_DATA: TodoFormData = {
  title: '',
  body: '',
  deadline: '',
  urgency: 'today',
  slackData: null
}

export const useTodoForm = (options: UseTodoFormOptions = {}): UseTodoFormReturn => {
  const { user } = useAuth()
  const todoUseCases = createTodoUseCases()
  const { initialTodo, onSuccess, onError, uiContainer = getUIContainer() } = options

  const [formData, setFormData] = useState<TodoFormData>(INITIAL_FORM_DATA)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [initialData, setInitialData] = useState<TodoFormData>(INITIAL_FORM_DATA)

  // Slack統合関連の状態
  const [slackUrl, setSlackUrlState] = useState('')
  const [slackConnections] = useState<any[]>([])

  // AI生成関連の状態
  const [generatingTitle, setGeneratingTitle] = useState(false)
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])

  /**
   * フォームフィールドを更新
   */
  const updateField = useCallback((field: keyof TodoFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setIsDirty(true)
    setError(null)
  }, [])

  /**
   * フォームをリセット
   */
  const resetForm = useCallback(() => {
    setFormData(initialData)
    setError(null)
    setIsDirty(false)
  }, [initialData])

  /**
   * フォームの妥当性を検証
   */
  const validateForm = useCallback((): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    // 本文は必須
    if (!formData.body.trim()) {
      errors.push('内容を入力してください')
    }

    // 本文の長さチェック
    if (formData.body.length > TodoEntity.MAX_BODY_LENGTH) {
      errors.push(`内容は${TodoEntity.MAX_BODY_LENGTH}文字以内で入力してください`)
    }

    // タイトルの長さチェック
    if (formData.title && formData.title.length > TodoEntity.MAX_TITLE_LENGTH) {
      errors.push(`タイトルは${TodoEntity.MAX_TITLE_LENGTH}文字以内で入力してください`)
    }

    // 期限の妥当性チェック
    if (formData.deadline) {
      const deadlineDate = new Date(formData.deadline)
      if (isNaN(deadlineDate.getTime())) {
        errors.push('有効な期限を入力してください')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }, [formData])

  /**
   * フォームを送信
   */
  const submitForm = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setError('ユーザーが認証されていません')
      return false
    }

    // バリデーション
    const validation = validateForm()
    if (!validation.valid) {
      setError(validation.errors.join('\n'))
      return false
    }

    setLoading(true)
    setError(null)

    try {
      let result

      if (initialTodo) {
        // 既存Todoの更新
        result = await todoUseCases.updateTodo({
          id: initialTodo.id,
          userId: user.id,
          updates: {
            title: formData.title || undefined,
            body: formData.body,
            deadline: formData.deadline || undefined
          }
        })
      } else {
        // 新規Todo作成
        result = await todoUseCases.createTodo({
          userId: user.id,
          title: formData.title || undefined,
          body: formData.body,
          deadline: formData.deadline || undefined,
          createdVia: 'manual'
        })
      }

      if (result.success && result.data) {
        setIsDirty(false)
        onSuccess?.(result.data)
        return true
      } else {
        const errorMessage = result.error || (initialTodo ? 'Todo の更新に失敗しました' : 'Todo の作成に失敗しました')
        setError(errorMessage)
        onError?.(errorMessage)
        return false
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '予期しないエラーが発生しました'
      setError(errorMessage)
      onError?.(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [user, formData, initialTodo, validateForm, todoUseCases, onSuccess, onError])

  /**
   * 初期データの設定
   */
  useEffect(() => {
    if (initialTodo) {
      const newFormData: TodoFormData = {
        title: initialTodo.title || '',
        body: initialTodo.body,
        deadline: initialTodo.deadline || '',
        urgency: initialTodo.getUrgencyFromDeadline(),
        slackData: null
      }
      setFormData(newFormData)
      setInitialData(newFormData)
      setIsDirty(false)
    } else {
      setFormData(INITIAL_FORM_DATA)
      setInitialData(INITIAL_FORM_DATA)
      setIsDirty(false)
    }
  }, [initialTodo])

  /**
   * 緊急度レベルから期限を設定するヘルパー
   */
  const setUrgencyLevel = useCallback((urgency: 'now' | 'today' | 'tomorrow' | 'later') => {
    const today = new Date()
    let deadline = ''

    switch (urgency) {
      case 'now':
      case 'today':
        deadline = today.toISOString().split('T')[0]
        break
      case 'tomorrow': {
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        deadline = tomorrow.toISOString().split('T')[0]
        break
      }
      case 'later':
      default:
        deadline = ''
        break
    }

    updateField('deadline', deadline)
  }, [updateField])

  /**
   * Slack URL設定
   */
  const setSlackUrl = useCallback((url: string) => {
    setSlackUrlState(url)
    updateField('body', url)
  }, [updateField])

  /**
   * Slackメッセージを読み込み
   */
  const loadSlackMessage = useCallback(async (): Promise<void> => {
    if (!slackUrl.trim()) {return}

    setLoading(true)
    setError(null)

    try {
      const result = await uiContainer.services.uiService.fetchSlackMessage(slackUrl.trim())

      if (result.success) {
        setFormData(prev => ({
          ...prev,
          slackData: {
            text: result.data?.text || '',
            url: result.data?.url || ''
          }
        }))
        updateField('body', result.data?.text || '')
      } else {
        setError(result.error || 'Slackメッセージの取得に失敗しました')
      }
    } catch (err) {
      setError('Slackメッセージの取得中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [slackUrl, updateField, setLoading, setError, uiContainer])

  /**
   * Slackデータをクリア
   */
  const clearSlackData = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      slackData: null
    }))
    setSlackUrlState('')
  }, [])

  /**
   * AIタイトル生成
   */
  const generateTitle = useCallback(async (): Promise<void> => {
    const content = formData.slackData?.text || formData.body.trim()
    if (!content) {return}

    setGeneratingTitle(true)
    setError(null)

    try {
      const result = await uiContainer.services.uiService.generateTitle(content)

      if (result.success) {
        updateField('title', result.data?.title || '')
        setTitleSuggestions([result.data?.title || ''])
      } else {
        setError(result.error || 'タイトル生成に失敗しました')
      }
    } catch (err) {
      setError('タイトル生成中にエラーが発生しました')
    } finally {
      setGeneratingTitle(false)
    }
  }, [formData, updateField, setError, uiContainer])

  /**
   * タイトル候補を選択
   */
  const selectTitleSuggestion = useCallback((title: string) => {
    updateField('title', title)
  }, [updateField])

  /**
   * Slackメッセージからの自動入力（レガシー互換性）
   */
  const fillFromSlackMessage = useCallback((messageContent: string, messageUrl?: string) => {
    const content = messageUrl ? `${messageContent}\n\nソース: ${messageUrl}` : messageContent
    updateField('body', content)
    if (messageUrl) {
      setFormData(prev => ({
        ...prev,
        slackData: { text: messageContent, url: messageUrl }
      }))
    }
  }, [updateField])

  /**
   * Todo作成（レガシー互換性）
   */
  const createTodo = useCallback(async (data: { title?: string; body: string; deadline?: string }): Promise<void> => {
    if (!user) {
      setError('ユーザーが認証されていません')
      return
    }

    const result = await todoUseCases.createTodo({
      userId: user.id,
      title: data.title,
      body: data.body,
      deadline: data.deadline,
      createdVia: 'manual'
    })

    if (result.success) {
      onSuccess?.(result.data!)
    } else {
      setError(result.error || 'Todo作成に失敗しました')
    }
  }, [user, todoUseCases, onSuccess, setError])

  /**
   * Todo更新（レガシー互換性）
   */
  const updateTodo = useCallback(async (todoId: string, updates: any): Promise<void> => {
    if (!user) {
      setError('ユーザーが認証されていません')
      return
    }

    const result = await todoUseCases.updateTodo({
      id: todoId,
      userId: user.id,
      updates
    })

    if (result.success) {
      onSuccess?.(result.data!)
    } else {
      setError(result.error || 'Todo更新に失敗しました')
    }
  }, [user, todoUseCases, onSuccess, setError])

  return {
    state: {
      formData,
      loading,
      error,
      isDirty,
      slackUrl,
      slackConnections,
      generatingTitle,
      titleSuggestions
    },
    actions: {
      updateField,
      resetForm,
      submitForm,
      validateForm,
      setUrgencyLevel,
      setSlackUrl,
      loadSlackMessage,
      clearSlackData,
      generateTitle,
      selectTitleSuggestion,
      fillFromSlackMessage,
      createTodo,
      updateTodo,
      isSubmitting: loading
    }
  }
}
