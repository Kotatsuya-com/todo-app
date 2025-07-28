// フロントエンド専用ログライブラリ
// ブラウザ環境でのみ動作し、環境に応じてログレベルを制御

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none'

interface LogContext {
  [key: string]: any
}

class ClientLogger {
  private level: LogLevel
  private context: LogContext

  constructor(context: LogContext = {}) {
    // 環境変数からログレベルを取得
    // 開発環境: debug（全レベル）、本番環境: warn（WARN・ERROR のみ）
    this.level = (process.env.NEXT_PUBLIC_CLIENT_LOG_LEVEL as LogLevel) ||
                 (process.env.NODE_ENV === 'production' ? 'warn' : 'debug')
    this.context = context
  }

  // コンテキスト付きロガーを作成
  child(additionalContext: LogContext): ClientLogger {
    return new ClientLogger({ ...this.context, ...additionalContext })
  }

  private shouldLog(level: LogLevel): boolean {
    if (typeof window === 'undefined') {return false} // SSR環境では出力しない

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'none']
    const currentLevelIndex = levels.indexOf(this.level)
    const targetLevelIndex = levels.indexOf(level)

    return targetLevelIndex >= currentLevelIndex
  }

  private formatMessage(level: LogLevel, message: string, data?: LogContext): any[] {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
    const prefix = `[${timestamp}] ${level.toUpperCase()}`
    const fullContext = { ...this.context, ...data }

    if (Object.keys(fullContext).length > 0) {
      return [prefix, message, fullContext]
    } else {
      return [prefix, message]
    }
  }

  debug(messageOrData: string | LogContext, _message?: string): void {
    if (!this.shouldLog('debug')) {return}

    if (typeof messageOrData === 'string') {
      // eslint-disable-next-line no-console
      console.log(...this.formatMessage('debug', messageOrData))
    } else {
      // eslint-disable-next-line no-console
      console.log(...this.formatMessage('debug', _message!, messageOrData))
    }
  }

  info(messageOrData: string | LogContext, _message?: string): void {
    if (!this.shouldLog('info')) {return}

    if (typeof messageOrData === 'string') {
      // eslint-disable-next-line no-console
      console.info(...this.formatMessage('info', messageOrData))
    } else {
      // eslint-disable-next-line no-console
      console.info(...this.formatMessage('info', _message!, messageOrData))
    }
  }

  warn(messageOrData: string | LogContext, _message?: string): void {
    if (!this.shouldLog('warn')) {return}

    if (typeof messageOrData === 'string') {
      // eslint-disable-next-line no-console
      console.warn(...this.formatMessage('warn', messageOrData))
    } else {
      // eslint-disable-next-line no-console
      console.warn(...this.formatMessage('warn', _message!, messageOrData))
    }
  }

  error(messageOrData: string | LogContext, _message?: string): void {
    if (!this.shouldLog('error')) {return}

    if (typeof messageOrData === 'string') {
      // eslint-disable-next-line no-console
      console.error(...this.formatMessage('error', messageOrData))
    } else {
      // eslint-disable-next-line no-console
      console.error(...this.formatMessage('error', _message!, messageOrData))
    }
  }
}

// デフォルトロガー
export const clientLogger = new ClientLogger()

// 機能別ロガー
export const uiLogger = new ClientLogger({ module: 'ui' })
export const authLogger = new ClientLogger({ module: 'auth' })
export const apiLogger = new ClientLogger({ module: 'api' })
export const slackLogger = new ClientLogger({ module: 'slack' })

// コンテキスト付きロガーを作成するヘルパー
export const createClientLogger = (context: LogContext) => new ClientLogger(context)

// 型定義
export type { LogContext }
export default clientLogger
