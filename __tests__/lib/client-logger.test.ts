/**
 * @jest-environment jsdom
 */
import { ClientLogger } from '@/lib/client-logger'

describe('ClientLogger', () => {
  let originalWindow: any
  let originalConsole: any

  beforeEach(() => {
    // Store original references
    originalWindow = global.window
    originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    }

    // Mock console methods
    console.log = jest.fn()
    console.info = jest.fn()
    console.warn = jest.fn()
    console.error = jest.fn()

    // Mock Date for consistent timestamps
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-15T10:30:45.123Z'))
  })

  afterEach(() => {
    // Restore original console
    Object.assign(console, originalConsole)
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  describe('constructor and level detection', () => {
    it('should use debug level in development by default', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      delete process.env.NEXT_PUBLIC_CLIENT_LOG_LEVEL

      const logger = new (require('@/lib/client-logger').default.constructor)()
      
      // Test by calling debug method - should log in development
      logger.debug('test message')
      expect(console.log).toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })

    it('should use warn level in production by default', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      delete process.env.NEXT_PUBLIC_CLIENT_LOG_LEVEL

      const logger = new (require('@/lib/client-logger').default.constructor)()
      
      // Test by calling debug method - should not log in production
      logger.debug('test message')
      expect(console.log).not.toHaveBeenCalled()

      // Test by calling warn method - should log in production
      logger.warn('test warning')
      expect(console.warn).toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })

    it('should respect NEXT_PUBLIC_CLIENT_LOG_LEVEL environment variable', () => {
      const originalLevel = process.env.NEXT_PUBLIC_CLIENT_LOG_LEVEL
      process.env.NEXT_PUBLIC_CLIENT_LOG_LEVEL = 'error'

      const logger = new (require('@/lib/client-logger').default.constructor)()
      
      // Only error should log with error level
      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      expect(console.log).not.toHaveBeenCalled()
      expect(console.info).not.toHaveBeenCalled()
      expect(console.warn).not.toHaveBeenCalled()

      logger.error('error message')
      expect(console.error).toHaveBeenCalled()

      process.env.NEXT_PUBLIC_CLIENT_LOG_LEVEL = originalLevel
    })
  })

  describe('SSR detection', () => {
    it('should not log when window is undefined (SSR)', () => {
      // Simulate SSR environment
      delete (global as any).window

      const logger = new (require('@/lib/client-logger').default.constructor)()
      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      expect(console.log).not.toHaveBeenCalled()
      expect(console.info).not.toHaveBeenCalled()
      expect(console.warn).not.toHaveBeenCalled()
      expect(console.error).not.toHaveBeenCalled()

      // Restore window
      global.window = originalWindow
    })

    it('should log when window is available (browser)', () => {
      // Ensure window is available
      global.window = { ...originalWindow }
      
      const logger = new (require('@/lib/client-logger').default.constructor)()
      logger.debug('debug message')

      expect(console.log).toHaveBeenCalled()
    })
  })

  describe('log level filtering', () => {
    let logger: any

    beforeEach(() => {
      // Create logger with debug level for testing
      process.env.NEXT_PUBLIC_CLIENT_LOG_LEVEL = 'debug'
      logger = new (require('@/lib/client-logger').default.constructor)()
    })

    it('should log all levels when set to debug', () => {
      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      expect(console.log).toHaveBeenCalledWith('[10:30:45] DEBUG', 'debug message')
      expect(console.info).toHaveBeenCalledWith('[10:30:45] INFO', 'info message')
      expect(console.warn).toHaveBeenCalledWith('[10:30:45] WARN', 'warn message')
      expect(console.error).toHaveBeenCalledWith('[10:30:45] ERROR', 'error message')
    })

    it('should filter logs when set to info level', () => {
      process.env.NEXT_PUBLIC_CLIENT_LOG_LEVEL = 'info'
      logger = new (require('@/lib/client-logger').default.constructor)()

      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      expect(console.log).not.toHaveBeenCalled()
      expect(console.info).toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalled()
      expect(console.error).toHaveBeenCalled()
    })

    it('should filter logs when set to warn level', () => {
      process.env.NEXT_PUBLIC_CLIENT_LOG_LEVEL = 'warn'
      logger = new (require('@/lib/client-logger').default.constructor)()

      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      expect(console.log).not.toHaveBeenCalled()
      expect(console.info).not.toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalled()
      expect(console.error).toHaveBeenCalled()
    })

    it('should only log errors when set to error level', () => {
      process.env.NEXT_PUBLIC_CLIENT_LOG_LEVEL = 'error'
      logger = new (require('@/lib/client-logger').default.constructor)()

      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      expect(console.log).not.toHaveBeenCalled()
      expect(console.info).not.toHaveBeenCalled()
      expect(console.warn).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalled()
    })

    it('should not log anything when set to none level', () => {
      process.env.NEXT_PUBLIC_CLIENT_LOG_LEVEL = 'none'
      logger = new (require('@/lib/client-logger').default.constructor)()

      logger.debug('debug message')
      logger.info('info message')
      logger.warn('warn message')
      logger.error('error message')

      expect(console.log).not.toHaveBeenCalled()
      expect(console.info).not.toHaveBeenCalled()
      expect(console.warn).not.toHaveBeenCalled()
      expect(console.error).not.toHaveBeenCalled()
    })
  })

  describe('context handling', () => {
    let logger: any

    beforeEach(() => {
      process.env.NEXT_PUBLIC_CLIENT_LOG_LEVEL = 'debug'
      logger = new (require('@/lib/client-logger').default.constructor)({ module: 'test' })
    })

    it('should include context in log messages', () => {
      logger.debug('test message')
      
      expect(console.log).toHaveBeenCalledWith(
        '[10:30:45] DEBUG', 
        'test message', 
        { module: 'test' }
      )
    })

    it('should support string-only log calls', () => {
      logger.info('simple message')
      
      expect(console.info).toHaveBeenCalledWith(
        '[10:30:45] INFO', 
        'simple message', 
        { module: 'test' }
      )
    })

    it('should support context + message log calls', () => {
      logger.warn({ userId: 123 }, 'user action')
      
      expect(console.warn).toHaveBeenCalledWith(
        '[10:30:45] WARN', 
        'user action', 
        { module: 'test', userId: 123 }
      )
    })

    it('should merge additional context with base context', () => {
      logger.error({ error: 'something went wrong' }, 'error occurred')
      
      expect(console.error).toHaveBeenCalledWith(
        '[10:30:45] ERROR', 
        'error occurred', 
        { module: 'test', error: 'something went wrong' }
      )
    })
  })

  describe('child logger', () => {
    let logger: any

    beforeEach(() => {
      process.env.NEXT_PUBLIC_CLIENT_LOG_LEVEL = 'debug'
      logger = new (require('@/lib/client-logger').default.constructor)({ module: 'parent' })
    })

    it('should create child logger with merged context', () => {
      const childLogger = logger.child({ component: 'button' })
      childLogger.debug('child message')
      
      expect(console.log).toHaveBeenCalledWith(
        '[10:30:45] DEBUG', 
        'child message', 
        { module: 'parent', component: 'button' }
      )
    })

    it('should allow child context to override parent context', () => {
      const childLogger = logger.child({ module: 'child' })
      childLogger.info('override message')
      
      expect(console.info).toHaveBeenCalledWith(
        '[10:30:45] INFO', 
        'override message', 
        { module: 'child' }
      )
    })
  })

  describe('message formatting', () => {
    let logger: any

    beforeEach(() => {
      process.env.NEXT_PUBLIC_CLIENT_LOG_LEVEL = 'debug'
      logger = new (require('@/lib/client-logger').default.constructor)()
    })

    it('should format timestamp correctly', () => {
      logger.debug('test message')
      
      const call = (console.log as jest.Mock).mock.calls[0]
      expect(call[0]).toBe('[10:30:45] DEBUG')
    })

    it('should handle empty context correctly', () => {
      const emptyLogger = new (require('@/lib/client-logger').default.constructor)()
      emptyLogger.debug('message without context')
      
      expect(console.log).toHaveBeenCalledWith(
        '[10:30:45] DEBUG', 
        'message without context'
      )
    })

    it('should properly format all log levels', () => {
      logger.debug('debug')
      logger.info('info')
      logger.warn('warn')
      logger.error('error')
      
      expect((console.log as jest.Mock).mock.calls[0][0]).toBe('[10:30:45] DEBUG')
      expect((console.info as jest.Mock).mock.calls[0][0]).toBe('[10:30:45] INFO')
      expect((console.warn as jest.Mock).mock.calls[0][0]).toBe('[10:30:45] WARN')
      expect((console.error as jest.Mock).mock.calls[0][0]).toBe('[10:30:45] ERROR')
    })
  })
})