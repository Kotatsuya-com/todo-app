/**
 * Slack Connections API Routes
 * 依存性注入パターンを使用したSlack接続管理API
 */

import { createSlackConnectionsHandlers } from '@/lib/factories/HandlerFactory'
import { getProductionContainer } from '@/lib/containers/ProductionContainer'

// プロダクション用の依存関係コンテナを使用してハンドラーを作成
const container = getProductionContainer()
const { GET, DELETE } = createSlackConnectionsHandlers(container)

// Next.js API Route handlers
export { GET, DELETE }
