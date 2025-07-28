/**
 * @jest-environment node
 */

// pinoをモック
jest.mock('pino', () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(() => mockLogger),
  }
  const mockPino = jest.fn(() => mockLogger)
  mockPino.stdTimeFunctions = {
    isoTime: jest.fn()
  }
  return mockPino
})

import { createLogger, apiLogger } from '@/lib/logger'
import pino from 'pino'

describe('logger basic test', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create logger with context', () => {
    const logger = createLogger({ module: 'test' })
    
    // loggerが作成されることを確認
    expect(logger).toBeDefined()
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
  })

  it('should use predefined apiLogger', () => {
    expect(apiLogger).toBeDefined()
    expect(typeof apiLogger.debug).toBe('function')
  })

  it('should work with basic logging methods', () => {
    const logger = createLogger({ test: 'value' })
    
    // 基本的なログメソッドがエラーなく実行されることを確認
    expect(() => {
      logger.info('test message')
      logger.debug({ data: 'test' }, 'debug message')
      logger.warn('warning message')
      logger.error('error message')
    }).not.toThrow()
  })
})