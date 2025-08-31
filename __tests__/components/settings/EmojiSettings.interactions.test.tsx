import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { EmojiSettings } from '../../../components/settings/EmojiSettings'

describe('EmojiSettings interactions', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = jest.fn((url: any, init?: any) => {
      if (!init) {
        // 初期GET
        return Promise.resolve({ ok: true, json: async () => ({
          settings: { today_emoji: 'fire', tomorrow_emoji: 'calendar', later_emoji: 'memo' },
          availableEmojis: [
            { name: 'fire', display: '🔥', label: '緊急' },
            { name: 'calendar', display: '📅', label: '計画' },
            { name: 'memo', display: '📝', label: 'メモ' },
            { name: 'warning', display: '⚠️', label: '警告' }
          ]
        }) }) as any
      }
      // 保存PUT
      if (init?.method === 'PUT') {
        return Promise.resolve({ ok: true, json: async () => ({}) }) as any
      }
      return Promise.resolve({ ok: true, json: async () => ({}) }) as any
    }) as any
  })

  afterEach(() => {
    global.fetch = originalFetch as any
  })

  it('セレクト変更で保存APIが呼ばれる', async () => {
    render(<EmojiSettings />)
    // 今日中のセレクト（表示上は3つあるが、最後のselectに対して変更してもOK）
    const selects = await screen.findAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'warning' } })
    await waitFor(() => {
      // 2回目のfetchがPUTで呼ばれているはず
      const putCalled = (global.fetch as any).mock.calls.some((c: any[]) => c[1]?.method === 'PUT')
      expect(putCalled).toBe(true)
    })
  })
})

