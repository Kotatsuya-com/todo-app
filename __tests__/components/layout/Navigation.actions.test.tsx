import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Navigation } from '../../../components/layout/Navigation'

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn() })
}))

jest.mock('next/image', () => {
  function NextImageMock(props: any) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  }
  NextImageMock.displayName = 'NextImageMock'
  return NextImageMock
})

jest.mock('@/src/presentation/hooks/useAuth', () => ({
  useAuth: () => ({ user: { getDisplayName: () => 'U' } })
}))

// CreateTodoModalを軽量モック
jest.mock('../../../components/todo/CreateTodoModal', () => ({
  CreateTodoModal: (props: any) => props.isOpen ? <div>ModalOpen</div> : null
}))

describe('Navigation actions', () => {
  it('新規タスクボタンでモーダルが開く', () => {
    render(<Navigation />)
    const newBtn = screen.getAllByText('新規タスク')[0]
    fireEvent.click(newBtn)
    expect(screen.getByText('ModalOpen')).toBeInTheDocument()
  })
})
