import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Request cookieを設定
            req.cookies.set({
              name,
              value,
              ...options,
            })
            // Response cookieを設定
            response = NextResponse.next({
              request: {
                headers: req.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            // Request cookieを削除
            req.cookies.set({
              name,
              value: '',
              ...options,
            })
            // Response cookieを削除
            response = NextResponse.next({
              request: {
                headers: req.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // セッションのリフレッシュ - getUser()でセキュアな認証チェック
    const { data: { user }, error } = await supabase.auth.getUser()

    // 保護されたルートのチェック
    const protectedPaths = ['/compare', '/report']
    const isProtectedPath = protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))

    if (isProtectedPath && !user && !error) {
      // 未認証の場合はホームページにリダイレクト
      return NextResponse.redirect(new URL('/', req.url))
    }

  } catch (error) {
    // cookieエラーなどの場合は通常通り処理を続行
    console.warn('Middleware auth check failed:', error)
  }

  return response
}

// Middlewareが実行されるパスを指定
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}