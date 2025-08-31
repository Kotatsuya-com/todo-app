import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { SlackIntegration } from '../../../components/slack/SlackIntegration'

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        single: async () => ({ data: { slack_user_id: 'U123' } })
      })
    })
  })
}))

describe('SlackIntegration (smoke)', () => {
  const originalFetch = global.fetch
  const originalClipboard = navigator.clipboard

  beforeEach(() => {
    // window.openをモック（jsdom未実装エラー回避）
    (window as any).open = jest.fn()
    ;(window as any).confirm = jest.fn().mockReturnValue(true)
    global.fetch = jest.fn((url: any, init?: any) => {
      if (init?.method === 'DELETE' && String(url).includes('/api/slack/integration/disconnect')) {
        return Promise.resolve({ ok: true, json: async () => ({}) }) as any
      }
      if (String(url).includes('/api/slack/connections')) {
        return Promise.resolve({ ok: true, json: async () => ({ connections: [{ id: 'c1', workspace_name: 'WS', created_at: '2025-08-01T00:00:00Z' }] }) }) as any
      }
      if (String(url).includes('/api/slack/webhook')) {
        return Promise.resolve({ ok: true, json: async () => ({ webhooks: [{ slack_connection_id: 'c1', is_active: true, webhook_id: 'wh1', event_count: 0 }] }) }) as any
      }
      if (String(url).includes('/api/app-url')) {
        return Promise.resolve({ ok: true, json: async () => ({ appUrl: 'http://localhost' }) }) as any
      }
      return Promise.resolve({ ok: true, json: async () => ({}) }) as any
    }) as any

    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) }
    })
  })

  afterEach(() => {
    global.fetch = originalFetch as any
    Object.assign(navigator, { clipboard: originalClipboard })
  })

  it('連携コンポーネントが描画され、基本情報が表示される', async () => {
    render(<SlackIntegration />)
    expect(await screen.findByText('Slack連携')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('WS')).toBeInTheDocument())
  })

  it('Webhook URLのコピーが実行される', async () => {
    render(<SlackIntegration />)
    const btns = await screen.findAllByRole('button')
    for (const b of btns) {
      fireEvent.click(b)
    }
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled())
  })

  it('連携解除ボタンでDELETE呼び出し', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<SlackIntegration />)
    const disconnect = await screen.findByRole('button', { name: '連携解除' })
    fireEvent.click(disconnect)
    await waitFor(() => {
      const delCalled = (global.fetch as any).mock.calls.some((c: any[]) => c[1]?.method === 'DELETE')
      expect(delCalled).toBe(true)
    })
    confirmSpy.mockRestore()
  })
})
