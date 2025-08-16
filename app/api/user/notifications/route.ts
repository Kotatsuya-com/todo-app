/**
 * Notification Settings API Routes
 * 依存性注入パターンを使用した通知設定API
 */

import { createNotificationSettingsHandlers } from '@/lib/factories/HandlerFactory'
import { getProductionContainer } from '@/lib/containers/ProductionContainer'

// プロダクション用の依存関係コンテナを使用してハンドラーを作成
const container = getProductionContainer()
const { GET, POST } = createNotificationSettingsHandlers(container)

// Next.js API Route handlers
export { GET, POST }
