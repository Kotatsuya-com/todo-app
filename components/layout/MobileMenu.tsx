'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Plus, ClipboardList, BarChart3, Scale } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTodoStore } from '@/store/todoStore'

interface MobileMenuProps {
  onCreateTask: () => void
}

export function MobileMenu({ onCreateTask }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useTodoStore()

  const tabs = [
    { name: 'ダッシュボード', href: '/', icon: ClipboardList },
    { name: '優先度比較', href: '/compare', icon: Scale },
    { name: 'レポート', href: '/report', icon: BarChart3 },
  ]

  const handleCreateTask = () => {
    onCreateTask()
    setIsOpen(false)
  }

  const handleNavClick = () => {
    setIsOpen(false)
  }

  if (!user) return null

  return (
    <>
      {/* ハンバーガーメニューボタン */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* オーバーレイ */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* サイドメニュー */}
      <div className={`
        fixed top-0 right-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out md:hidden
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">メニュー</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* メニュー項目 */}
        <div className="p-4 space-y-2">
          {/* 新規タスク作成ボタン */}
          <Button
            onClick={handleCreateTask}
            className="w-full flex items-center justify-center space-x-2 mb-4"
          >
            <Plus className="w-4 h-4" />
            <span>新規タスク</span>
          </Button>

          {/* ナビゲーションリンク */}
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = pathname === tab.href
            
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={handleNavClick}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium
                  transition-colors duration-200 w-full
                  ${isActive 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}