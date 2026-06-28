/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // Transpile-only (isolatedModules) : on n'exige pas le typage strict du code
  // moteur existant (non typé), on veut juste exécuter et tester sa LOGIQUE.
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { isolatedModules: true }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
};
