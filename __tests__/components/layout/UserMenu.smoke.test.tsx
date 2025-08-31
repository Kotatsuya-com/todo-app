import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { UserMenu } from '../../../components/layout/UserMenu'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}))

jest.mock('@/src/presentation/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { getDisplayName: () => 'テストユーザー', id: 'user-12345678' },
    signOut: jest.fn().mockResolvedValue(undefined)
  })
}))

describe('UserMenu (smoke)', () => {
  it('クリックでメニューを開ける（設定項目の存在を確認）', () => {
    render(<UserMenu />)
    const trigger = screen.getAllByRole('button')[0]
    fireEvent.click(trigger)
    expect(screen.getByText('設定')).toBeInTheDocument()
  })
})

