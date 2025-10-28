/**
 * TypeScript Library template generator
 * Based on EdgeCraft patterns
 */

import { GeneratorContext, FileToGenerate, TemplateData } from '../types.js';

export async function generateTypeScriptLib(context: GeneratorContext): Promise<FileToGenerate[]> {
  const { options } = context;
  const files: FileToGenerate[] = [];

  const data: TemplateData = {
    projectName: options.name,
    description: options.description,
    author: options.author,
    email: options.email,
    telegram: options.telegram,
    license: options.license,
    year: new Date().getFullYear(),
    template: options.template,
    hasCodeOfConduct: options.includeCodeOfConduct,
    hasContributing: options.includeContributing,
    hasCLA: options.includeCLA,
    hasSecurityPolicy: options.includeSecurityPolicy,
    hasIssueTemplates: options.includeIssueTemplates,
    hasPRTemplate: options.includePRTemplate,
    hasGitHubActions: options.includeGitHubActions,
    hasEditorConfig: options.includeEditorConfig,
    hasESLint: options.includeESLint,
    hasPrettier: options.includePrettier,
    hasDocker: options.includeDocker,
  };

  // package.json
  files.push({
    path: 'package.json',
    content: generatePackageJson(data),
  });

  // tsconfig.json (based on EdgeCraft's strict config)
  files.push({
    path: 'tsconfig.json',
    content: generateTsConfig(),
  });

  // Source files
  files.push({
    path: 'src/index.ts',
    content: generateIndexTs(data),
  });

  files.push({
    path: 'src/types.ts',
    content: generateTypesTs(),
  });

  // Test setup
  files.push({
    path: 'tests/index.test.ts',
    content: generateIndexTest(data),
  });

  files.push({
    path: 'jest.config.js',
    content: generateJestConfig(),
  });

  // ESLint config
  if (options.includeESLint) {
    files.push({
      path: '.eslintrc.json',
      content: generateEslintConfig(),
    });
  }

  // Prettier config
  if (options.includePrettier) {
    files.push({
      path: '.prettierrc.json',
      content: generatePrettierConfig(),
    });
  }

  return files;
}

function generatePackageJson(data: TemplateData): string {
  return `{
  "name": "${data.projectName}",
  "version": "0.1.0",
  "description": "${data.description}",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src tests --ext .ts",
    "lint:fix": "eslint src tests --ext .ts --fix",
    "format": "prettier --write \\"src/**/*.ts\\" \\"tests/**/*.ts\\"",
    "format:check": "prettier --check \\"src/**/*.ts\\" \\"tests/**/*.ts\\"",
    "typecheck": "tsc --noEmit",
    "validate": "npm run typecheck && npm run lint && npm run test",
    "prepublishOnly": "npm run validate && npm run build"
  },
  "keywords": [],
  "author": "${data.author} <${data.email}>",
  "license": "${data.license}",
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.50.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "jest": "^29.7.0",
    "prettier": "^3.0.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
`;
}

function generateTsConfig(): string {
  return `{
  "compilerOptions": {
    // Language and Environment
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "ESNext",
    "moduleResolution": "bundler",

    // Strict Type Checking (ALL enabled)
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    // Additional Checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,

    // Module Resolution
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,

    // Path Aliases
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },

    // Emit
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "skipLibCheck": true
  },

  "include": [
    "src/**/*.ts"
  ],

  "exclude": [
    "node_modules",
    "dist",
    "coverage",
    "**/*.spec.ts",
    "**/*.test.ts"
  ]
}
`;
}

function generateIndexTs(data: TemplateData): string {
  return `/**
 * ${data.projectName}
 * ${data.description}
 */

export * from './types.js';

/**
 * Example function
 */
export function hello(name: string): string {
  return \`Hello, \${name}!\`;
}
`;
}

function generateTypesTs(): string {
  return `/**
 * Type definitions
 */

export interface Example {
  id: string;
  name: string;
}
`;
}

function generateIndexTest(data: TemplateData): string {
  return `import { hello } from '../src/index';

describe('${data.projectName}', () => {
  describe('hello', () => {
    it('should return greeting message', () => {
      const result = hello('World');
      expect(result).toBe('Hello, World!');
    });

    it('should handle different names', () => {
      expect(hello('Alice')).toBe('Hello, Alice!');
      expect(hello('Bob')).toBe('Hello, Bob!');
    });
  });
});
`;
}

function generateJestConfig(): string {
  return `/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\\\.{1,2}/.*)\\\\.js$': '$1',
  },
  transform: {
    '^.+\\\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: [
    '**/tests/**/*.test.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
`;
}

function generateEslintConfig(): string {
  return `{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "plugins": ["@typescript-eslint", "prettier"],
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "rules": {
    "prettier/prettier": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "error"
  }
}
`;
}

function generatePrettierConfig(): string {
  return `{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
`;
}
