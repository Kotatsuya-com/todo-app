/**
 * Slack Webhook API Routes
 * 依存性注入パターンを使用したWebhook管理API
 */

import { createWebhookHandlers } from '@/lib/factories/HandlerFactory'
import { getProductionContainer } from '@/lib/containers/ProductionContainer'

// プロダクション用の依存関係コンテナを使用してハンドラーを作成
const container = getProductionContainer()
const { GET, POST, DELETE } = createWebhookHandlers(container)

// Next.js API Route handlers
export { GET, POST, DELETE }
