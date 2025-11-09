# test-ci-project



A modern TypeScript project with type safety, linting, and testing capabilities.

## 🚀 Features

- ✅ **TypeScript** - Full type safety and modern JavaScript features
- ✅ **ESLint** - Code quality and consistency
- ✅ **Prettier** - Code formatting
- ✅ **Jest** - Unit testing framework
- ✅ **Pre-commit hooks** - Automated code quality checks
- ✅ **Modern Node.js** - Built with Node.js 18+

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher

## 🛠️ Installation

```bash
# Clone the repository
git clone <repository-url>
cd test-ci-project

# Install dependencies
npm install

# Build the project
npm run build

# Start the application
npm start
```

## 📜 Available Scripts

### Development

```bash
# Start in development mode with hot reload
npm run dev

# Start in development mode with file watching
npm run dev:watch

# Type checking without emitting files
npm run typecheck
```

### Building

```bash
# Build the project
npm run build

# Clean build artifacts
npm run clean
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Format code with Prettier
npm run format
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🏗️ Project Structure

```
test-ci-project/
├── src/
│   └── index.ts          # Main application entry point
├── dist/                 # Compiled output (auto-generated)
├── coverage/             # Test coverage reports (auto-generated)
├── package.json          # Project configuration
├── tsconfig.json         # TypeScript configuration
├── README.md            # This file
└── .gitignore           # Git ignore file
```

## 🔧 Configuration

### TypeScript Configuration

The `tsconfig.json` file contains the TypeScript compiler configuration:

- **Target**: ES2022
- **Module**: ESNext with Node.js resolution
- **Strict Mode**: Enabled with all strict type checking options
- **Output**: CommonJS files in the `dist/` directory
- **Source Maps**: Generated for debugging
- **Path Aliases**: Configured for cleaner imports (`@/`)

### ESLint Configuration

ESLint is configured with:

- TypeScript parser
- Prettier integration
- Strict type checking rules
- Modern JavaScript best practices

### Testing Configuration

Jest is configured with:

- TypeScript support via ts-jest
- Node.js test environment
- Coverage reporting
- Watch mode for development

## 🧪 Development Workflow

### Adding New Features

1. Create your TypeScript files in the `src/` directory
2. Follow the established code patterns
3. Add tests for new functionality
4. Run type checking: `npm run typecheck`
5. Run linting: `npm run lint`
6. Run tests: `npm test`

### Code Quality Checks

Before committing your changes:

```bash
# Run all quality checks
npm run typecheck
npm run lint
npm test
```

### Building for Production

```bash
# Clean previous builds
npm run clean

# Build the project
npm run build

# Start the production version
npm start
```

## 📦 Publishing

```bash
# Run pre-publish checks and build
npm run prepublishOnly

# Publish to npm (if configured)
npm publish
```

## 🐛 Troubleshooting

### Common Issues

1. **TypeScript compilation errors**
   - Run `npm run typecheck` to see detailed error messages
   - Ensure all imports are correctly typed

2. **ESLint errors**
   - Run `npm run lint:fix` to automatically fix most issues
   - Check the `.eslintrc.json` for rule configurations

3. **Test failures**
   - Run `npm run test:watch` to debug in real-time
   - Check the coverage report with `npm run test:coverage`

### Getting Help

- Check the [TypeScript documentation](https://www.typescriptlang.org/docs/)
- Review the [ESLint rules](https://eslint.org/docs/rules/)
- See [Jest documentation](https://jestjs.io/docs/getting-started)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Run quality checks: `npm run typecheck && npm run lint && npm test`
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Submit a pull request

## 📄 License

This project is private and confidential.

## 👥 Author

****

---

**Version**: 1.0.0
**Created**: {{CURRENT_DATE}}
**Node.js**: >=18.0.0
**TypeScript**: ^5.3.0