/**
 * Slack Auth API Routes
 * 依存性注入パターンを使用したSlack OAuth認証API
 */

import { createSlackAuthHandlers } from '@/lib/factories/HandlerFactory'
import { getProductionContainer } from '@/lib/containers/ProductionContainer'

// プロダクション用の依存関係コンテナを使用してハンドラーを作成
const container = getProductionContainer()
const { GET } = createSlackAuthHandlers(container)

// Next.js API Route handlers
export { GET }
