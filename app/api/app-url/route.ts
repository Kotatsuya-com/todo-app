import { NextResponse } from 'next/server'
import { getAppBaseUrl } from '@/lib/ngrok-url'

export async function GET() {
  const appUrl = getAppBaseUrl()
  return NextResponse.json({
    appUrl,
    timestamp: new Date().toISOString()
  })
}
