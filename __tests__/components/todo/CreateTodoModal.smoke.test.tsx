import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CreateTodoModal } from '../../../components/todo/CreateTodoModal'

jest.mock('../../../src/presentation/hooks/useTodoDashboard', () => {
  return {
    useTodoDashboard: () => ({ actions: { refreshTodos: jest.fn() } })
  }
})

// モック: TodoForm を軽量化
jest.mock('../../../components/todo/TodoForm', () => ({
  TodoForm: (props: any) => (
    <div>
      <button data-testid='submit' onClick={() => props.onSubmit({ title: '', body: 'b', urgency: 'today', deadline: '', slackData: null })}>submit</button>
      <button data-testid='cancel' onClick={props.onCancel}>cancel</button>
    </div>
  )
}))

// モック: useTodoForm
const resetForm = jest.fn()
const submitForm = jest.fn().mockResolvedValue(true)
const fillFromSlackMessage = jest.fn()
const updateField = jest.fn()

jest.mock('../../../src/presentation/hooks/useTodoForm', () => ({
  useTodoForm: (options?: any) => ({
    state: { loading: false, formData: { title: '', body: '', deadline: '', urgency: 'today' } },
    actions: {
      resetForm: () => {
        resetForm()
      },
      submitForm: async () => {
        const res = await submitForm()
        if (res && options?.onSuccess) {
          options.onSuccess()
        }
        return res
      },
      fillFromSlackMessage,
      updateField
    }
  })
}))

describe('CreateTodoModal (smoke)', () => {
  it('open時にタイトルが描画される', () => {
    render(<CreateTodoModal isOpen={true} onClose={() => {}} />)
    expect(screen.getByText('新しいタスクを作成')).toBeInTheDocument()
  })

  it('cancelでresetFormとonCloseが呼ばれる', () => {
    const onClose = jest.fn()
    render(<CreateTodoModal isOpen={true} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('cancel'))
    expect(resetForm).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('submitでsubmitFormが呼ばれる', async () => {
    render(<CreateTodoModal isOpen={true} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('submit'))
    await waitFor(() => expect(submitForm).toHaveBeenCalled())
  })
})

