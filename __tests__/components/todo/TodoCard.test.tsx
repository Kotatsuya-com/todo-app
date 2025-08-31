import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TodoCard } from '../../../components/todo/TodoCard'
import { Todo } from '@/src/domain/types'

describe('TodoCard', () => {
  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-08-03T12:00:00Z'))
  })
  afterAll(() => jest.useRealTimers())

  const createTodo = (overrides: Partial<Todo> = {}): Todo => ({
    id: 't1',
    user_id: 'u1',
    title: 'カードタイトル',
    body: 'とても長い本文'.repeat(30),
    urgency: 'today',
    deadline: '2025-08-01', // overdue
    importance_score: 1200,
    status: 'open',
    created_at: '2025-08-01T00:00:00Z',
    created_via: 'manual',
    ...overrides
  })

  test('完了ボタンでonCompleteが呼ばれる', async () => {
    const onComplete = jest.fn().mockResolvedValue(undefined)
    render(<TodoCard todo={createTodo()} onComplete={onComplete} />)

    const completeBtn = screen.getByRole('button', { name: '完了' })
    fireEvent.click(completeBtn)
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('t1'))
  })

  test('期限延長ボタンでonUpdateが翌日で呼ばれる（期限切れ時のみ表示）', async () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined)
    render(<TodoCard todo={createTodo()} onUpdate={onUpdate} />)

    const extendBtn = screen.getByRole('button', { name: '期限延長' })
    fireEvent.click(extendBtn)

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith('t1', { deadline: tomorrowStr }))
  })

  test('削除ボタンは確認後にonDeleteを呼ぶ／キャンセル時は呼ばない', async () => {
    const onDelete = jest.fn().mockResolvedValue(undefined)
    const confirmSpy = jest.spyOn(window, 'confirm')

    render(<TodoCard todo={createTodo()} onDelete={onDelete} />)
    const delBtn = screen.getByRole('button', { name: '' }) // アイコンボタン（ラベルなし）

    confirmSpy.mockReturnValueOnce(false)
    fireEvent.click(delBtn)
    expect(onDelete).not.toHaveBeenCalled()

    confirmSpy.mockReturnValueOnce(true)
    fireEvent.click(delBtn)
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('t1'))
  })

  test('ホバー/展開で本文の表示が切り替わる', async () => {
    render(<TodoCard todo={createTodo()} />)

    const card = screen.getByText('カードタイトル').closest('div') as HTMLElement
    fireEvent.mouseEnter(card)
    // ホバー時に「もっと見る」ボタンが表示される（長文のみ）
    const more = await screen.findByText('もっと見る')
    fireEvent.click(more)
    // 展開後は「折りたたむ」に変わる
    await screen.findByText('折りたたむ')
  })
})
