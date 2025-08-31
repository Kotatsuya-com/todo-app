import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { NotificationSettings } from '../../../components/settings/NotificationSettings'

describe('NotificationSettings interactions', () => {
  const originalFetch = global.fetch
  const originalNotification = (global as any).Notification

  beforeEach(() => {
    let enable = true
    global.fetch = jest.fn((url: any, init?: any) => {
      if (!init) {
        return Promise.resolve({ ok: true, json: async () => ({ enable_webhook_notifications: enable }) }) as any
      }
      if (init?.method === 'POST') {
        const body = JSON.parse(init.body as string)
        enable = body.enable_webhook_notifications
        return Promise.resolve({ ok: true, json: async () => ({}) }) as any
      }
      return Promise.resolve({ ok: true, json: async () => ({}) }) as any
    }) as any

    ;(global as any).Notification = function (title: string) {
      // コンストラクタ呼び出しを許可する簡易モック
      return { title }
    } as any
    ;(global as any).Notification.permission = 'default'
    ;(global as any).Notification.requestPermission = jest.fn().mockResolvedValue('granted')
  })

  afterEach(() => {
    global.fetch = originalFetch as any
    ;(global as any).Notification = originalNotification
  })

  it('Webhook通知のON/OFF切替でPOSTが呼ばれる', async () => {
    render(<NotificationSettings />)
    const btn = await screen.findByRole('button', { name: /ON|OFF|更新中/ })
    fireEvent.click(btn)
    await waitFor(() => {
      const postCalled = (global.fetch as any).mock.calls.some((c: any[]) => c[1]?.method === 'POST')
      expect(postCalled).toBe(true)
    })
  })

  it('ブラウザ通知の許可ボタンを押すとrequestPermissionが呼ばれる', async () => {
    render(<NotificationSettings />)
    const allowBtn = await screen.findByRole('button', { name: '通知を許可' })
    fireEvent.click(allowBtn)
    await waitFor(() => {
      expect((global as any).Notification.requestPermission).toHaveBeenCalled()
    })
  })
})

