/* eslint-disable @next/next/no-img-element */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { Navigation } from '../../../components/layout/Navigation'

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() })
}))

jest.mock('next/image', () => {
  function NextImageMock(props: any) {
    // jsdomでのNextImageエラー回避のため素のimgに置換
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />
  }
  NextImageMock.displayName = 'NextImageMock'
  return NextImageMock
})

jest.mock('@/src/presentation/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { getDisplayName: () => 'テストユーザー' }
  })
}))

describe('Navigation (smoke)', () => {
  it('ユーザー有りで主要要素が描画される', () => {
    render(<Navigation />)
    expect(screen.getAllByText('新規タスク').length).toBeGreaterThan(0)
    expect(screen.getAllByText('マトリクス').length).toBeGreaterThan(0)
  })
})
