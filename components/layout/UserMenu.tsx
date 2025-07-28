'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useTodoStore } from '@/store/todoStore'
import { authLogger } from '@/lib/client-logger'

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { user, signOut } = useTodoStore()

  // クリック外でメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)
    setIsOpen(false)
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      authLogger.error({ error }, 'Logout error')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleSettingsClick = () => {
    setIsOpen(false)
    router.push('/settings')
  }

  if (!user) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ユーザーメニュートリガー */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        disabled={isLoggingOut}
      >
        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
          <User className="w-4 h-4" />
        </div>
        <span className="hidden md:block text-sm font-medium">
          {user.display_name || 'ユーザー'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {/* ユーザー情報 */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {user.display_name || 'ユーザー'}
                </p>
                <p className="text-xs text-gray-500">
                  {user.id?.slice(0, 8)}...
                </p>
              </div>
            </div>
          </div>

          {/* メニュー項目 */}
          <div className="py-1">
            {/* 設定 */}
            <button
              onClick={handleSettingsClick}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>設定</span>
            </button>

            {/* ログアウト */}
            <button
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>{isLoggingOut ? 'ログアウト中...' : 'ログアウト'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
