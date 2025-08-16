// Jest setup file for global test configuration

// Mock environment variables for consistent testing
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_CLIENT_LOG_LEVEL = 'debug'
process.env.LOG_LEVEL = 'debug'
process.env.OPENAI_API_KEY = 'test-api-key'

// Provide safe defaults for Supabase-related envs during tests
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role'

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
