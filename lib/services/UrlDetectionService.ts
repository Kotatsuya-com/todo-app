/**
 * UrlDetection Service Layer
 * URL検出とアプリベースURL生成のビジネスロジックとOrchestrationを担当
 */

import fs from 'fs'
import path from 'path'
import { apiLogger } from '@/lib/logger'
import {
  UrlDetectionEntity,
  UrlDetectionOptions,
  UrlDetectionResult
} from '@/lib/entities/UrlDetection'

export interface UrlDetectionServiceResult<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface AppUrlResponse {
  appUrl: string
  timestamp: string
  metadata?: {
    environment: string
    protocol: string
    hostname: string
    port?: string
    isStandardPort: boolean
  }
}

export interface NgrokFileInfo {
  envRuntimeExists: boolean
  ngrokUrlFileExists: boolean
  ngrokUrl: string | null
}

export class UrlDetectionService {
  private readonly logger = apiLogger.child({ service: 'UrlDetectionService' })

  /**
   * アプリベースURLを検出してレスポンス形式で返す
   */
  async detectAppUrl(
    requestUrl: string,
    nextUrl?: { protocol?: string; hostname?: string; port?: string }
  ): Promise<UrlDetectionServiceResult<AppUrlResponse>> {
    const methodLogger = this.logger.child({ method: 'detectAppUrl' })

    try {
      // 1. 環境情報を取得
      const ngrokInfo = await this.getNgrokFileInfo()
      const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL || null

      methodLogger.debug({
        hasNgrokUrl: !!ngrokInfo.ngrokUrl,
        hasPublicAppUrl: !!publicAppUrl,
        environment: this.detectEnvironmentFromUrl(requestUrl)
      }, 'Environment detection completed')

      // 2. ドメインエンティティでURL検出処理
      const entity = nextUrl
        ? UrlDetectionEntity.fromNextRequest(requestUrl, nextUrl, {
          ngrokUrl: ngrokInfo.ngrokUrl,
          publicAppUrl
        })
        : UrlDetectionEntity.fromRequestUrl(requestUrl, {
          ngrokUrl: ngrokInfo.ngrokUrl,
          publicAppUrl
        })

      const validation = entity.validateRequest()
      if (!validation.valid) {
        methodLogger.warn({ errors: validation.errors }, 'URL detection validation failed')
        return {
          success: false,
          error: validation.errors.join(', '),
          statusCode: 400
        }
      }

      // 3. URL検出の実行
      const result = entity.createResult()
      const response = this.createAppUrlResponse(result)

      methodLogger.info({
        appUrl: result.appUrl,
        environment: result.environment,
        hostname: result.hostname
      }, 'App URL detected successfully')

      return {
        success: true,
        data: response
      }

    } catch (error: any) {
      methodLogger.error({
        error: error.message,
        stack: error.stack,
        requestUrl
      }, 'URL detection service error')

      return {
        success: false,
        error: 'Failed to detect app URL',
        statusCode: 500
      }
    }
  }

  /**
   * ngrokファイル情報を取得
   */
  async getNgrokFileInfo(): Promise<NgrokFileInfo> {
    const methodLogger = this.logger.child({ method: 'getNgrokFileInfo' })

    try {
      const envRuntimePath = path.join(process.cwd(), '.env.runtime')
      const ngrokUrlPath = path.join(process.cwd(), '.ngrok-url')

      const envRuntimeExists = fs.existsSync(envRuntimePath)
      const ngrokUrlFileExists = fs.existsSync(ngrokUrlPath)

      let ngrokUrl: string | null = null

      // .env.runtimeファイルからAPP_URLを読み取り
      if (envRuntimeExists) {
        try {
          const envContent = fs.readFileSync(envRuntimePath, 'utf8')
          const appUrlMatch = envContent.match(/APP_URL=(.+)/)

          if (appUrlMatch && appUrlMatch[1]) {
            ngrokUrl = appUrlMatch[1].trim()
            methodLogger.debug({ source: '.env.runtime', ngrokUrl }, 'Ngrok URL found in .env.runtime')
          }
        } catch (error) {
          methodLogger.warn({ error }, 'Failed to read .env.runtime file')
        }
      }

      // フォールバック: .ngrok-urlファイルから読み取り
      if (!ngrokUrl && ngrokUrlFileExists) {
        try {
          ngrokUrl = fs.readFileSync(ngrokUrlPath, 'utf8').trim()
          methodLogger.debug({ source: '.ngrok-url', ngrokUrl }, 'Ngrok URL found in .ngrok-url')
        } catch (error) {
          methodLogger.warn({ error }, 'Failed to read .ngrok-url file')
        }
      }

      return {
        envRuntimeExists,
        ngrokUrlFileExists,
        ngrokUrl
      }

    } catch (error: any) {
      methodLogger.error({ error }, 'Failed to get ngrok file info')
      return {
        envRuntimeExists: false,
        ngrokUrlFileExists: false,
        ngrokUrl: null
      }
    }
  }

  /**
   * URLから環境を簡易検出
   */
  private detectEnvironmentFromUrl(requestUrl: string): string {
    try {
      const url = new URL(requestUrl)

      if (url.hostname.includes('ngrok.io')) {return 'ngrok'}
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {return 'localhost'}
      if (url.hostname.includes('.vercel.app')) {return 'vercel'}

      return 'production'
    } catch {
      return 'unknown'
    }
  }

  /**
   * レスポンスオブジェクトの作成
   */
  private createAppUrlResponse(result: UrlDetectionResult): AppUrlResponse {
    return {
      appUrl: result.appUrl,
      timestamp: new Date().toISOString(),
      metadata: {
        environment: result.environment,
        protocol: result.protocol,
        hostname: result.hostname,
        port: result.port,
        isStandardPort: result.isStandardPort
      }
    }
  }

  /**
   * 簡易版アプリURL検出（メタデータなし）
   */
  async detectAppUrlSimple(
    requestUrl: string,
    nextUrl?: { protocol?: string; hostname?: string; port?: string }
  ): Promise<UrlDetectionServiceResult<{ appUrl: string; timestamp: string }>> {
    const result = await this.detectAppUrl(requestUrl, nextUrl)

    if (!result.success) {
      return result
    }

    return {
      success: true,
      data: {
        appUrl: result.data!.appUrl,
        timestamp: result.data!.timestamp
      }
    }
  }

  /**
   * URL正規化サービス
   */
  async normalizeUrl(
    rawUrl: string,
    options?: UrlDetectionOptions
  ): Promise<UrlDetectionServiceResult<{ normalizedUrl: string }>> {
    const methodLogger = this.logger.child({ method: 'normalizeUrl' })

    try {
      const entity = UrlDetectionEntity.fromRequestUrl(rawUrl, options)
      const validation = entity.validateRequest()

      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', '),
          statusCode: 400
        }
      }

      const normalizedUrl = entity.normalizeAppUrl(rawUrl)

      methodLogger.debug({
        originalUrl: rawUrl,
        normalizedUrl
      }, 'URL normalized successfully')

      return {
        success: true,
        data: { normalizedUrl }
      }

    } catch (error: any) {
      methodLogger.error({ error, rawUrl }, 'URL normalization failed')
      return {
        success: false,
        error: 'Failed to normalize URL',
        statusCode: 500
      }
    }
  }

  /**
   * サービスのヘルスチェック
   */
  async healthCheck(): Promise<UrlDetectionServiceResult<{
    status: string
    ngrokStatus: string
    environmentInfo: any
  }>> {
    try {
      const ngrokInfo = await this.getNgrokFileInfo()
      const testUrl = 'http://localhost:3000/test'

      // 基本的なURL検出テスト
      const testResult = await this.detectAppUrlSimple(testUrl)

      return {
        success: true,
        data: {
          status: testResult.success ? 'healthy' : 'degraded',
          ngrokStatus: ngrokInfo.ngrokUrl ? 'available' : 'unavailable',
          environmentInfo: {
            hasEnvRuntime: ngrokInfo.envRuntimeExists,
            hasNgrokFile: ngrokInfo.ngrokUrlFileExists,
            hasPublicAppUrl: !!process.env.NEXT_PUBLIC_APP_URL
          }
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: 'Service unavailable',
        statusCode: 503
      }
    }
  }
}
