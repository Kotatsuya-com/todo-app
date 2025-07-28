import pino from 'pino'

// ログレベルの環境変数を取得（デフォルトは開発環境でdebug、本番でinfo）
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

// Pinoロガーの設定
const logger = pino({
  level: logLevel,
  // 開発環境では見やすい形式、本番環境では構造化JSON
  // worker threadの問題を避けるため、開発環境でもJSONフォーマットを使用
  transport: undefined,
  // 本番環境では構造化ログ用の基本設定
  formatters: {
    level: (label) => ({ level: label })
  },
  // タイムスタンプフォーマット
  timestamp: pino.stdTimeFunctions.isoTime,
  // 基本メタデータ
  base: {
    env: process.env.NODE_ENV,
    service: 'todo-app'
  }
})

// コンテキスト付きロガーを作成するヘルパー関数
export const createLogger = (context: Record<string, any> = {}) => {
  return logger.child(context)
}

// 特定の機能エリア用のロガーを作成
export const slackLogger = createLogger({ module: 'slack' })
export const webhookLogger = createLogger({ module: 'webhook' })
export const authLogger = createLogger({ module: 'auth' })
export const apiLogger = createLogger({ module: 'api' })

// デフォルトエクスポート
export default logger

// 型定義
export type Logger = typeof logger
