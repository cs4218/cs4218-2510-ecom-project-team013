/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  // 👇 add this block
  globals: {
    'ts-jest': {
      diagnostics: false,   // ignore TS type errors during tests
      isolatedModules: true // faster, looser transpile
    }
  },
  testMatch: ['<rootDir>/src/**/*.(test|spec).(ts|tsx)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
