/**
 * Emoji Settings API Routes
 * 依存性注入パターンを使用した絵文字設定API
 */

import { createEmojiSettingsHandlers } from '@/lib/factories/HandlerFactory'
import { getProductionContainer } from '@/lib/containers/ProductionContainer'

// プロダクション用の依存関係コンテナを使用してハンドラーを作成
const container = getProductionContainer()
const { GET, PUT, POST } = createEmojiSettingsHandlers(container)

// Next.js API Route handlers
export { GET, PUT, POST }
