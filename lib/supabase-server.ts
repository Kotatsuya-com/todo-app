import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

// サーバーサイド用クライアント（APIルート用）
export function createServerSupabaseClient(request?: NextRequest) {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // ngrok環境の場合は適切なcookie設定を行う
          const isNgrok = request?.nextUrl.hostname.includes('ngrok') || false
          const cookieOptions = {
            ...options,
            secure: isNgrok ? true : options.secure,
            sameSite: isNgrok ? 'none' as const : options.sameSite
          }

          try {
            cookieStore.set(name, value, cookieOptions)
          } catch {
            // fallback for read-only cookies
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          } catch {
            // fallback for read-only cookies
          }
        }
      }
    }
  )
}

// Service Role用クライアント（RLSバイパス、Webhook等で使用）
export function createServiceSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
