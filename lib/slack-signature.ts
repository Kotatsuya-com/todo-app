import type { NextRequest } from 'next/server'
import crypto from 'crypto'
import { webhookLogger } from '@/lib/logger'

/**
 * Slack署名検証
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export async function verifySlackSignature(
  request: NextRequest,
  body: string
): Promise<boolean> {
  const signature = request.headers.get('x-slack-signature')
  const timestamp = request.headers.get('x-slack-request-timestamp')

  // Slack App全体で共通のSigning Secretを使用
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET

  webhookLogger.debug({
    hasSignature: !!signature,
    hasTimestamp: !!timestamp,
    hasSigningSecret: !!slackSigningSecret
  }, 'Verifying Slack signature')

  if (!signature || !timestamp || !slackSigningSecret) {
    webhookLogger.error('Missing required headers or signing secret')
    return false
  }

  // タイムスタンプの検証（5分以内）
  const currentTime = Math.floor(Date.now() / 1000)
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    webhookLogger.error('Request timestamp too old')
    return false
  }

  // 署名の検証
  const sigBasestring = `v0:${timestamp}:${body}`
  const expectedSignature = `v0=${crypto
    .createHmac('sha256', slackSigningSecret)
    .update(sigBasestring)
    .digest('hex')}`

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )

  webhookLogger.debug({
    isValid,
    receivedSignature: signature.substring(0, 20) + '...',
    expectedSignature: expectedSignature.substring(0, 20) + '...'
  }, 'Signature verification result')

  return isValid
}
