import fs from 'fs'
import path from 'path'
import { apiLogger } from './logger'

/**
 * 動的に生成されたngrok URLを取得する
 * 開発環境でのwebhook URLやredirect URIに使用
 */
export function getNgrokUrl(): string | null {
  try {
    // .env.runtimeファイルからAPP_URLを読み取り
    const envRuntimePath = path.join(process.cwd(), '.env.runtime')

    if (fs.existsSync(envRuntimePath)) {
      const envContent = fs.readFileSync(envRuntimePath, 'utf8')
      const appUrlMatch = envContent.match(/APP_URL=(.+)/)

      if (appUrlMatch && appUrlMatch[1]) {
        return appUrlMatch[1].trim()
      }
    }

    // フォールバック: .ngrok-urlファイルから読み取り
    const ngrokUrlPath = path.join(process.cwd(), '.ngrok-url')

    if (fs.existsSync(ngrokUrlPath)) {
      return fs.readFileSync(ngrokUrlPath, 'utf8').trim()
    }

    return null
  } catch (error) {
    apiLogger.error({ error }, 'Failed to read ngrok URL')
    return null
  }
}

/**
 * アプリケーションのベースURLを取得（開発/本番環境対応）
 */
export function getAppBaseUrl(request?: Request): string {
  // 開発環境: ngrok URLがあれば使用
  const ngrokUrl = getNgrokUrl()
  if (ngrokUrl) {
    return ngrokUrl
  }

  // 本番環境またはngrokが利用できない場合
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // リクエストからオリジンを取得（フォールバック）
  if (request) {
    try {
      const url = new URL(request.url)
      return url.origin
    } catch (error) {
      // Try to use nextUrl if url property is invalid
      if (request.nextUrl) {
        const { protocol, hostname, port } = request.nextUrl
        if (hostname) {
          let url = protocol ? `${protocol}//` : ''
          url += hostname
          if (port && port !== '80' && port !== '443') {
            url += `:${port}`
          }
          return url || hostname
        }
      }
    }
  }

  // 最終フォールバック
  return 'http://localhost:3000'
}
