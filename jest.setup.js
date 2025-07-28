// Jest setup file for global test configuration

// Mock environment variables for consistent testing
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_CLIENT_LOG_LEVEL = 'debug'
process.env.LOG_LEVEL = 'debug'
process.env.OPENAI_API_KEY = 'test-api-key'

// Mock window object for client-side tests (only in jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'location', {
    value: {
      origin: 'http://localhost:3000',
    },
    writable: true,
  })
}

// Mock fetch globally
global.fetch = jest.fn()

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  // Reset fetch mock
  if (global.fetch) {
    global.fetch.mockClear()
  }
})