/**
 * Title Generation API Routes
 * 依存性注入パターンを使用したタイトル生成API
 */

import { createTitleGenerationHandlers } from '@/lib/factories/HandlerFactory'
import { getProductionContainer } from '@/lib/containers/ProductionContainer'

// プロダクション用の依存関係コンテナを使用してハンドラーを作成
const container = getProductionContainer()
const { POST } = createTitleGenerationHandlers(container)

// Next.js API Route handlers
export { POST }
