import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { EmojiSettings } from '../../../components/settings/EmojiSettings'

describe('EmojiSettings (smoke)', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ settings: { today_emoji: 'fire', tomorrow_emoji: 'calendar', later_emoji: 'memo' }, availableEmojis: [] })
    } as any)
  })

  afterEach(() => {
    global.fetch = originalFetch as any
  })

  it('初期描画が行われ、主要要素が存在する', async () => {
    render(<EmojiSettings />)
    expect(await screen.findByText('絵文字リアクション設定')).toBeInTheDocument()
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
  })
})

