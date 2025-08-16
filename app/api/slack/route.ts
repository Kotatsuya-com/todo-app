/**
 * Slack Message Retrieval API Routes
 * 依存性注入パターンを使用したSlackメッセージ取得API
 */

import { createSlackMessageHandlers } from '@/lib/factories/HandlerFactory'
import { getProductionContainer } from '@/lib/containers/ProductionContainer'

// プロダクション用の依存関係コンテナを使用してハンドラーを作成
const container = getProductionContainer()
const { POST } = createSlackMessageHandlers(container)

// Next.js API Route handlers
export { POST }
