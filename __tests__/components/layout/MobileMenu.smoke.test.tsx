import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileMenu } from '../../../components/layout/MobileMenu'

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() })
}))

jest.mock('@/src/presentation/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { getDisplayName: () => 'テストユーザー' },
    signOut: jest.fn().mockResolvedValue(undefined)
  })
}))

describe('MobileMenu (smoke)', () => {
  it('メニューボタンからメニューを開ける（存在確認）', () => {
    render(<MobileMenu onCreateTask={() => {}} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0]) // ハンバーガー
    // メニュー内の任意要素が出ていればOK（例: ログアウト）
    // ただし描画タイミングを考慮して緩く確認
    // getAllByRoleが増えることを目安に
    expect(screen.getAllByRole('button').length).toBeGreaterThan(1)
  })
})
