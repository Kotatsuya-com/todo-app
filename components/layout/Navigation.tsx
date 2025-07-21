'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus, ClipboardList, BarChart3, Scale, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CreateTodoModal } from '@/components/todo/CreateTodoModal'
import { MobileMenu } from './MobileMenu'
import { useState } from 'react'
import { useTodoStore } from '@/store/todoStore'

export function Navigation() {
  const pathname = usePathname()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { user } = useTodoStore()

  const tabs = [
    { name: 'ダッシュボード', href: '/', icon: ClipboardList },
    { name: '優先度比較', href: '/compare', icon: Scale },
    { name: 'レポート', href: '/report', icon: BarChart3 },
    { name: '設定', href: '/settings', icon: Settings },
  ]

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">TODO管理</h1>
              
              {/* デスクトップナビゲーション */}
              {user && (
                <div className="hidden md:flex space-x-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = pathname === tab.href
                    
                    return (
                      <Link
                        key={tab.href}
                        href={tab.href}
                        className={`
                          flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium
                          transition-colors duration-200
                          ${isActive 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.name}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* デスクトップ新規タスクボタン */}
              {user && (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="hidden md:flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>新規タスク</span>
                </Button>
              )}

              {/* モバイルメニュー */}
              <MobileMenu onCreateTask={() => setIsCreateModalOpen(true)} />
            </div>
          </div>
        </div>
      </nav>

      <CreateTodoModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  )
}