import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MobileMenu } from '../../../components/layout/MobileMenu'

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() })
}))

const signOut = jest.fn().mockResolvedValue(undefined)

jest.mock('@/src/presentation/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { getDisplayName: () => 'テストユーザー' },
    signOut
  })
}))

describe('MobileMenu actions', () => {
  it('ログアウトボタン押下でsignOutが呼ばれる', async () => {
    render(<MobileMenu onCreateTask={() => {}} />)
    // メニューを開く
    const openBtn = screen.getAllByRole('button')[0]
    fireEvent.click(openBtn)
    // ログアウトボタン
    const logout = await screen.findByRole('button', { name: 'ログアウト' })
    fireEvent.click(logout)
    await waitFor(() => expect(signOut).toHaveBeenCalled())
  })
})
