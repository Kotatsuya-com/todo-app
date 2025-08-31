import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoForm } from '../../../components/todo/TodoForm'
import { UIDependencyContainer } from '@/lib/containers/UIContainer'

describe('TodoForm', () => {
  const setup = async (overrides: Partial<React.ComponentProps<typeof TodoForm>> = {}) => {
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    const onCancel = jest.fn()

    const uiContainer: UIDependencyContainer = {
      services: {
        uiService: {
          checkSlackConnections: jest.fn().mockResolvedValue({ success: true, data: { connections: [] } }),
          fetchSlackMessage: jest.fn().mockResolvedValue({
            success: true,
            data: { text: 'Slack message text', url: 'https://x.slack.com/archives/C1/p123', workspace: 'WS' }
          }),
          generateTitle: jest.fn().mockResolvedValue({ success: true, data: { title: '生成タイトル' } })
        }
      }
    }

    render(
      <TodoForm
        onSubmit={onSubmit}
        onCancel={onCancel}
        submitLabel="保存"
        uiContainer={uiContainer}
        {...overrides}
      />
    )

    return { onSubmit, onCancel, uiContainer }
  }

  test('本文入力で送信が有効化され、onSubmitが呼ばれる', async () => {
    const user = userEvent.setup()
    const { onSubmit } = await setup()

    const textarea = screen.getByPlaceholderText('タスクの内容またはSlackURLを入力してください...') as HTMLTextAreaElement
    const submit = screen.getByRole('button', { name: '保存' })

    expect(submit).toBeDisabled()
    await user.type(textarea, '  本文テキスト  ')
    expect(submit).toBeEnabled()

    await user.click(submit)

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const args = onSubmit.mock.calls[0][0]
    expect(args.body).toBe('本文テキスト') // trimされる
    expect(args.title).toBe('') // 初期は空
    expect(['today', 'tomorrow', 'later']).toContain(args.urgency)
  })

  test('緊急度変更で期限日が自動設定/クリアされる', async () => {
    const user = userEvent.setup()
    await setup()

    const tomorrowBtn = screen.getByRole('button', { name: /明日/ })
    const laterBtn = screen.getByRole('button', { name: /それより後/ })
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement

    await user.click(tomorrowBtn)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    expect(dateInput.value).toBe(tomorrowStr)

    await user.click(laterBtn)
    expect(dateInput.value).toBe('')
  })

  test('生成ボタンでタイトルが生成される', async () => {
    const user = userEvent.setup()
    const { uiContainer } = await setup()

    const textarea = screen.getByPlaceholderText('タスクの内容またはSlackURLを入力してください...')
    const genBtn = screen.getByRole('button', { name: /生成/ })

    await user.type(textarea, '本文あり')
    await user.click(genBtn)

    await waitFor(() => {
      expect(uiContainer.services.uiService.generateTitle).toHaveBeenCalled()
    })

    const titleInput = screen.getByPlaceholderText('タスクの見出し（自動生成可能）') as HTMLInputElement
    expect(titleInput.value).toBe('生成タイトル')
  })

  test('キャンセル押下でonCancelが呼ばれる', async () => {
    const user = userEvent.setup()
    const { onCancel } = await setup()
    const cancel = screen.getByRole('button', { name: 'キャンセル' })
    await user.click(cancel)
    expect(onCancel).toHaveBeenCalled()
  })
})
