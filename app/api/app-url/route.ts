import { NextRequest, NextResponse } from 'next/server'
import { getAppBaseUrl } from '@/lib/ngrok-url'

export async function GET(request: NextRequest) {
  const appUrl = getAppBaseUrl(request)
  return NextResponse.json({
    appUrl,
    timestamp: new Date().toISOString()
  })
}
