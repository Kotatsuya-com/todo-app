/**
 * Slack Events API Routes
 * 依存性注入パターンを使用したSlackイベント処理API
 */

import { createSlackEventsHandlers } from '@/lib/factories/HandlerFactory'
import { getProductionContainer } from '@/lib/containers/ProductionContainer'

interface RouteParams {
  params: {
    webhook_id: string
  }
}

// プロダクション用の依存関係コンテナを使用してハンドラーを作成
const container = getProductionContainer()
const handlers = createSlackEventsHandlers(container)

// Next.js API Route handlers
export async function GET(request: any, context: RouteParams) {
  return handlers.GET(request, context)
}

export async function POST(request: any, context: RouteParams) {
  return handlers.POST(request, context)
}
