module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    'isows': '<rootDir>/__tests__/mocks/isows.js'
  },
  testMatch: [
    '**/__tests__/lib/**/*.test.(ts|tsx|js|jsx)',
    '**/__tests__/lib/**/*.spec.(ts|tsx|js|jsx)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/fixtures/',
    '/__tests__/helpers/',
    '/__tests__/mocks/',
    '/__tests__/utils/',
    '\\.fixture\\.(ts|js)$',
    '\\.helper\\.(ts|js)$'
  ],
  collectCoverageFrom: [
    'lib/**/*.{js,ts,tsx}',
    '!lib/**/*.d.ts',
    '!lib/**/index.ts'
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(isows|@supabase|@supabase/.*|ws)/)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  clearMocks: true,
  restoreMocks: true
}
