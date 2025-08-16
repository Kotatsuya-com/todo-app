/**
 * Slack Integration Disconnect API Routes
 * 依存性注入パターンを使用したSlack統合切断API
 */

import { createDisconnectHandlers } from '@/lib/factories/HandlerFactory'
import { getProductionContainer } from '@/lib/containers/ProductionContainer'

// プロダクション用の依存関係コンテナを使用してハンドラーを作成
const container = getProductionContainer()
const { DELETE } = createDisconnectHandlers(container)

// Next.js API Route handlers
export { DELETE }
