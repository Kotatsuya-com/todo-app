/**
 * App URL Detection API Routes
 * 依存性注入パターンを使用したアプリURL検出API
 */

import { createAppUrlDetectionHandlers } from '@/lib/factories/HandlerFactory'
import { getProductionContainer } from '@/lib/containers/ProductionContainer'

// プロダクション用の依存関係コンテナを使用してハンドラーを作成
const container = getProductionContainer()
const { GET } = createAppUrlDetectionHandlers(container)

// Next.js API Route handlers
export { GET }
