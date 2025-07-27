import { createBrowserClient, type CookieOptions } from '@supabase/ssr'

// ブラウザ用クライアント（クライアントサイドのみ）
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (typeof document !== 'undefined') {
            const cookieValue = document.cookie
              .split('; ')
              .find(row => row.startsWith(`${name}=`))
              ?.split('=')[1]
            return cookieValue
          }
          return undefined
        },
        set(name: string, value: string, options: CookieOptions) {
          if (typeof document !== 'undefined') {
            let cookieString = `${name}=${value}`

            // ngrok環境では適切なドメイン設定を行う
            const isNgrok = window.location.hostname.includes('ngrok')

            if (options.path) { cookieString += `; path=${options.path}` }
            if (options.domain && !isNgrok) { cookieString += `; domain=${options.domain}` }
            if (options.maxAge) { cookieString += `; max-age=${options.maxAge}` }
            if (options.httpOnly) { cookieString += '; httponly' }
            if (options.secure) { cookieString += '; secure' }
            if (options.sameSite) { cookieString += `; samesite=${options.sameSite}` }

            // ngrok環境では特別な設定
            if (isNgrok) {
              cookieString += '; secure; samesite=none'
            }

            document.cookie = cookieString
          }
        },
        remove(name: string, options: CookieOptions) {
          if (typeof document !== 'undefined') {
            let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`

            if (options.path) { cookieString += `; path=${options.path}` }
            if (options.domain) { cookieString += `; domain=${options.domain}` }

            document.cookie = cookieString
          }
        }
      }
    }
  )
}
