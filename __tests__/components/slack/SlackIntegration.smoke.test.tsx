import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
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
    global.fetch = jest.fn((url: any) => {
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
})

