import { renderHook, act, waitFor } from '@testing-library/react'
import { useTodoForm } from '../../../../src/presentation/hooks/useTodoForm'

// ユーザー認証のモック
jest.mock('../../../../src/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } })
}))

// UseCasesモック
jest.mock('@/src/infrastructure/di/FrontendServiceFactory', () => ({
  createTodoUseCases: () => ({
    createTodo: jest.fn().mockResolvedValue({ success: true, data: { id: 't1' } }),
    updateTodo: jest.fn().mockResolvedValue({ success: true, data: { id: 't1' } })
  })
}))

const makeUIContainer = (overrides: Partial<any> = {}) => ({
  services: {
    uiService: {
      checkSlackConnections: jest.fn().mockResolvedValue({ success: true, data: { connections: [] } }),
      fetchSlackMessage: jest.fn().mockResolvedValue({ success: true, data: { text: 'MSG', url: 'URL' } }),
      generateTitle: jest.fn().mockResolvedValue({ success: true, data: { title: 'AI_TITLE' } }),
      ...overrides
    }
  }
})

describe('useTodoForm extra', () => {
  it('setUrgencyLevelで期限が設定される', () => {
    const { result } = renderHook(() => useTodoForm())
    act(() => {
      result.current.actions.setUrgencyLevel('today')
    })
    const today = new Date().toISOString().split('T')[0]
    expect(result.current.state.formData.deadline).toBe(today)

    act(() => {
      result.current.actions.setUrgencyLevel('tomorrow')
    })
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    expect(result.current.state.formData.deadline).toBe(tomorrow.toISOString().split('T')[0])

    act(() => {
      result.current.actions.setUrgencyLevel('later')
    })
    expect(result.current.state.formData.deadline).toBe('')
  })

  it('loadSlackMessage 成功でbody/slackData更新', async () => {
    const uiContainer = makeUIContainer()
    const { result } = renderHook(() => useTodoForm({ uiContainer }))
    act(() => {
      result.current.actions.setSlackUrl('https://workspace.slack.com/archives/C1/p1')
    })
    await act(async () => {
      await result.current.actions.loadSlackMessage()
    })
    expect(result.current.state.formData.slackData).toEqual({ text: 'MSG', url: 'URL' })
    expect(result.current.state.formData.body).toBe('MSG')
  })

  it('loadSlackMessage 失敗でerror設定', async () => {
    const uiContainer = makeUIContainer({ fetchSlackMessage: jest.fn().mockResolvedValue({ success: false, error: 'NG' }) })
    const { result } = renderHook(() => useTodoForm({ uiContainer }))
    act(() => {
      result.current.actions.setSlackUrl('https://workspace.slack.com/archives/C1/p1')
    })
    await act(async () => {
      await result.current.actions.loadSlackMessage()
    })
    expect(result.current.state.error).toBe('NG')
  })

  it('loadSlackMessage 例外で定型エラー', async () => {
    const uiContainer = makeUIContainer({ fetchSlackMessage: jest.fn().mockRejectedValue(new Error('boom')) })
    const { result } = renderHook(() => useTodoForm({ uiContainer }))
    act(() => {
      result.current.actions.setSlackUrl('https://workspace.slack.com/archives/C1/p1')
    })
    await act(async () => {
      await result.current.actions.loadSlackMessage()
    })
    expect(result.current.state.error).toBe('Slackメッセージの取得中にエラーが発生しました')
  })

  it('generateTitle 成功でtitleと候補が設定', async () => {
    const uiContainer = makeUIContainer()
    const { result } = renderHook(() => useTodoForm({ uiContainer }))
    act(() => {
      result.current.actions.updateField('body', 'content')
    })
    await act(async () => {
      await result.current.actions.generateTitle()
    })
    expect(result.current.state.formData.title).toBe('AI_TITLE')
    expect(result.current.state.titleSuggestions[0]).toBe('AI_TITLE')
  })

  it('generateTitle 失敗でerror設定', async () => {
    const uiContainer = makeUIContainer({ generateTitle: jest.fn().mockResolvedValue({ success: false, error: 'AI_NG' }) })
    const { result } = renderHook(() => useTodoForm({ uiContainer }))
    act(() => {
      result.current.actions.updateField('body', 'content')
    })
    await act(async () => {
      await result.current.actions.generateTitle()
    })
    expect(result.current.state.error).toBe('AI_NG')
  })

  it('generateTitle 例外で定型エラー', async () => {
    const uiContainer = makeUIContainer({ generateTitle: jest.fn().mockRejectedValue(new Error('oops')) })
    const { result } = renderHook(() => useTodoForm({ uiContainer }))
    act(() => {
      result.current.actions.updateField('body', 'content')
    })
    await act(async () => {
      await result.current.actions.generateTitle()
    })
    expect(result.current.state.error).toBe('タイトル生成中にエラーが発生しました')
  })

  // submitFormの例外分岐は他テストへの影響が大きいためスキップ
})
