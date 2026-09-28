module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@clias/shared-types$': '<rootDir>/../../../packages/shared-types/src/index.ts',
    '^@clias/config$': '<rootDir>/../../../packages/config/src/index.ts',
  },
};
