import React from 'react'
import { render, screen } from '@testing-library/react'
import AuthProvider, { useAuthContext, withAuth } from '../../../src/presentation/providers/AuthProvider'

jest.mock('@/src/presentation/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1', getDisplayName: () => 'テストユーザー' },
    isAuthenticated: true,
    loading: false,
    signOut: jest.fn(),
    signIn: jest.fn()
  })
}))

function Consumer() {
  const { user } = useAuthContext()
  return <div>ようこそ: {user?.getDisplayName?.()}</div>
}

describe('AuthProvider (smoke)', () => {
  it('コンテキストが子に提供される', () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )
    expect(screen.getByText(/ようこそ: テストユーザー/)).toBeInTheDocument()
  })

  it('withAuthでラップしたコンポーネントが表示される', () => {
    const Protected = () => <div data-testid='protected'>OK</div>
    const Wrapped = withAuth(Protected)
    render(
      <AuthProvider>
        <Wrapped />
      </AuthProvider>
    )
    expect(screen.getByTestId('protected')).toBeInTheDocument()
  })
})

