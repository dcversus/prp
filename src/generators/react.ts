/**
 * React App template generator (Vite + TypeScript)
 * Based on EdgeCraft patterns
 */

import { GeneratorContext, FileToGenerate, TemplateData } from '../types.js';

export async function generateReact(context: GeneratorContext): Promise<FileToGenerate[]> {
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

  // tsconfig.json
  files.push({
    path: 'tsconfig.json',
    content: generateTsConfig(),
  });

  // tsconfig.node.json
  files.push({
    path: 'tsconfig.node.json',
    content: generateTsConfigNode(),
  });

  // Vite config
  files.push({
    path: 'vite.config.ts',
    content: generateViteConfig(),
  });

  // HTML entry point
  files.push({
    path: 'index.html',
    content: generateIndexHtml(data),
  });

  // Source files
  files.push({
    path: 'src/main.tsx',
    content: generateMainTsx(),
  });

  files.push({
    path: 'src/App.tsx',
    content: generateAppTsx(data),
  });

  files.push({
    path: 'src/App.css',
    content: generateAppCss(),
  });

  files.push({
    path: 'src/index.css',
    content: generateIndexCss(),
  });

  // Test setup
  files.push({
    path: 'tests/App.test.tsx',
    content: generateAppTest(data),
  });

  files.push({
    path: 'jest.config.js',
    content: generateJestConfig(),
  });

  // Test setup
  files.push({
    path: 'tests/setup.ts',
    content: generateTestSetup(),
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

  // Public directory
  files.push({
    path: 'public/vite.svg',
    content: generateViteSvg(),
  });

  return files;
}

function generatePackageJson(data: TemplateData): string {
  return `{
  "name": "${data.projectName}",
  "version": "0.1.0",
  "description": "${data.description}",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext ts,tsx",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "format": "prettier --write \\"src/**/*.{ts,tsx,css}\\"",
    "typecheck": "tsc --noEmit",
    "validate": "npm run typecheck && npm run lint && npm run test"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/jest": "^29.5.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "eslint": "^8.50.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "prettier": "^3.0.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  },
  "author": "${data.author} <${data.email}>",
  "license": "${data.license}"
}
`;
}

function generateTsConfig(): string {
  return `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
`;
}

function generateTsConfigNode(): string {
  return `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
`;
}

function generateViteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
`;
}

function generateIndexHtml(data: TemplateData): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${data.projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function generateMainTsx(): string {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
}

function generateAppTsx(data: TemplateData): string {
  return `import React, { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <header className="App-header">
        <h1>${data.projectName}</h1>
        <p>${data.description}</p>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
        </div>
        <p className="read-the-docs">
          Click on the button to test the counter
        </p>
      </header>
    </div>
  );
}

export default App;
`;
}

function generateAppCss(): string {
  return `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
}

.card {
  padding: 2em;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #646cff;
}

button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

.read-the-docs {
  color: #888;
}
`;
}

function generateIndexCss(): string {
  return `:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}

a:hover {
  color: #535bf2;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}

#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}
`;
}

function generateAppTest(data: TemplateData): string {
  return `import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../src/App';

describe('App', () => {
  it('renders project name', () => {
    render(<App />);
    expect(screen.getByText('${data.projectName}')).toBeInTheDocument();
  });

  it('renders project description', () => {
    render(<App />);
    expect(screen.getByText('${data.description}')).toBeInTheDocument();
  });

  it('increments counter on button click', () => {
    render(<App />);
    const button = screen.getByRole('button', { name: /count is 0/i });
    fireEvent.click(button);
    expect(screen.getByText(/count is 1/i)).toBeInTheDocument();
  });
});
`;
}

function generateJestConfig(): string {
  return `/** @type {import('jest').Config} */
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '\\\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\\\.tsx?$': 'ts-jest',
  },
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
  ],
};
`;
}

function generateEslintConfig(): string {
  return `{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:react/jsx-runtime",
    "prettier"
  ],
  "plugins": ["@typescript-eslint", "react", "react-hooks", "react-refresh", "prettier"],
  "settings": {
    "react": {
      "version": "detect"
    }
  },
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "rules": {
    "prettier/prettier": "error",
    "react-refresh/only-export-components": ["warn", { "allowConstantExport": true }],
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
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
  "tabWidth": 2
}
`;
}

function generateTestSetup(): string {
  return `import '@testing-library/jest-dom';
`;
}

function generateViteSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFEA83"></stop><stop offset="8.333%" stop-color="#FFDD35"></stop><stop offset="100%" stop-color="#FFA800"></stop></linearGradient></defs><path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.838l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.759-4.114l16.646-57.705c.677-2.35-1.37-4.583-3.769-4.113Z"></path></svg>`;
}
