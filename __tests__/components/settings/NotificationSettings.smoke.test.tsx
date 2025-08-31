import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { NotificationSettings } from '../../../components/settings/NotificationSettings'

describe('NotificationSettings (smoke)', () => {
  const originalFetch = global.fetch
  const originalNotification = (global as any).Notification

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enable_webhook_notifications: true })
    } as any)
    ;(global as any).Notification = {
      permission: 'default',
      requestPermission: jest.fn().mockResolvedValue('granted')
    }
  })

  afterEach(() => {
    global.fetch = originalFetch as any
    ;(global as any).Notification = originalNotification
  })

  it('初期描画が行われ、見出しが表示される', async () => {
    render(<NotificationSettings />)
    expect(await screen.findByText('通知設定')).toBeInTheDocument()
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
  })
})

