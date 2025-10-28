# CLAUDE.md - Development Guidelines for PRP

This document serves as the primary development guide for AI coding assistants (Claude, GPT-4, etc.) working on the PRP (Project Bootstrap CLI) project.

## Project Overview

**PRP** is an interactive CLI tool for bootstrapping new software projects with best practices, multiple framework support, and optional AI integration. It combines the strengths of tools like Yeoman and Cookiecutter with modern DX and AI capabilities.

### Core Philosophy

1. **Batteries Included** - Include sensible defaults and best practices out of the box
2. **Flexible** - Allow users to customize and toggle features
3. **Modern** - Use contemporary tools and approaches (TypeScript, Ink, AI)
4. **Quality** - Maintain high code quality with strict TypeScript, linting, and testing

## Technology Stack

- **Language**: TypeScript 5.6+ (strict mode)
- **Runtime**: Node.js 20+ LTS
- **CLI Framework**: Commander.js
- **TUI**: Ink (React for terminal)
- **Build Tool**: TypeScript Compiler (tsc)
- **Testing**: Jest with ts-jest
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Package Manager**: npm (primary), yarn/pnpm supported

## Project Structure

```
prp/
├── src/
│   ├── cli.ts              # CLI entry point (shebang, commander setup)
│   ├── index.ts            # Main module export
│   ├── types.ts            # Shared TypeScript types
│   ├── ui/                 # Ink React components
│   │   ├── App.tsx         # Main app component
│   │   └── components/     # Reusable UI components
│   ├── generators/         # Template generators
│   │   ├── index.ts        # Main generator orchestration
│   │   ├── common.ts       # Common files (LICENSE, README, etc.)
│   │   ├── fastapi.ts      # FastAPI template
│   │   ├── nestjs.ts       # NestJS template
│   │   ├── react.ts        # React template
│   │   └── typescript-lib.ts # TypeScript library template
│   ├── templates/          # Template files (Handlebars)
│   │   ├── common/         # Shared templates
│   │   ├── fastapi/        # FastAPI specific
│   │   ├── nestjs/         # NestJS specific
│   │   ├── react/          # React specific
│   │   └── typescript-lib/ # TypeScript lib specific
│   ├── ai/                 # AI integration
│   │   ├── index.ts        # AI orchestration
│   │   ├── openai.ts       # OpenAI integration
│   │   ├── anthropic.ts    # Anthropic Claude integration
│   │   └── google.ts       # Google Gemini integration
│   └── utils/              # Helper functions
│       ├── index.ts        # Utility exports
│       ├── fs.ts           # File system utilities
│       ├── git.ts          # Git operations
│       └── validation.ts   # Input validation
├── tests/                  # Test files (mirror src/ structure)
├── templates/              # Static template files
├── dist/                   # Compiled output (gitignored)
└── docs/                   # Additional documentation
```

## Development Workflow

### 1. Feature Development

When implementing a new feature:

1. Create a feature branch: `git checkout -b feature/feature-name`
2. Implement the feature with tests
3. Update CHANGELOG.md under `[Unreleased]` section
4. Run validation: `npm run validate`
5. Create a pull request

### 2. Code Quality Standards

- **TypeScript**: Use strict mode, no `any` types unless absolutely necessary
- **Linting**: All code must pass ESLint with no warnings
- **Formatting**: Use Prettier (automated via pre-commit hook)
- **Testing**: Aim for >80% code coverage
- **Documentation**: All public APIs must have JSDoc comments

### 3. Commit Messages

Follow Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(generators): add FastAPI template generator`
- `fix(ui): correct checkbox selection behavior`
- `docs(readme): update installation instructions`

### 4. Testing Strategy

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test generator output and file creation
- **E2E Tests**: Test full CLI workflows
- **Snapshot Tests**: For template output verification

Run tests:
```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

## Key Implementation Guidelines

### 1. CLI Implementation

The CLI should:
- Use Commander.js for argument parsing
- Support both interactive and non-interactive modes
- Validate inputs thoroughly
- Provide clear error messages
- Show progress indicators (using Ink spinners)

### 2. Template System

- Use Handlebars for templating
- Support conditional sections
- Allow variable substitution
- Keep templates modular and reusable
- Validate template output

### 3. AI Integration

AI features should be:
- **Optional** - Never block on AI failures
- **Transparent** - Clearly indicate AI-generated content
- **Safe** - Validate and sanitize AI output
- **Configurable** - Support multiple providers

### 4. File Generation

When generating files:
- Ensure parent directories exist
- Set correct file permissions (especially for executables)
- Use atomic writes when possible
- Log all file operations
- Handle errors gracefully

### 5. Error Handling

- Use TypeScript's type system to prevent errors
- Catch and handle all async errors
- Provide actionable error messages
- Log errors for debugging
- Exit with appropriate codes (0 = success, 1 = error)

## Code Style

### TypeScript

```typescript
// Good: Strict types, no any
export function generateProject(options: ProjectOptions): Promise<void> {
  // Implementation
}

// Bad: Using any
export function generateProject(options: any): Promise<any> {
  // Implementation
}
```

### React Components (Ink)

```typescript
// Good: Proper typing, functional components
import React from 'react';
import { Box, Text } from 'ink';

interface MyComponentProps {
  title: string;
  active: boolean;
}

const MyComponent: React.FC<MyComponentProps> = ({ title, active }) => (
  <Box>
    <Text color={active ? 'green' : 'gray'}>{title}</Text>
  </Box>
);

export default MyComponent;
```

### File Naming

- TypeScript files: `camelCase.ts` or `PascalCase.tsx` (for React components)
- Test files: `*.test.ts` or `*.test.tsx`
- Type files: `types.ts` or `*.types.ts`

## Documentation Requirements

### Code Documentation

All public functions, classes, and interfaces must have JSDoc comments:

```typescript
/**
 * Generates a new project based on provided options.
 *
 * @param options - Project configuration options
 * @param targetPath - Directory where project will be created
 * @returns Promise that resolves when generation is complete
 * @throws {Error} If target directory already exists
 *
 * @example
 * await generateProject({
 *   name: 'my-app',
 *   template: 'react',
 *   license: 'MIT'
 * }, './my-app');
 */
export async function generateProject(
  options: ProjectOptions,
  targetPath: string
): Promise<void> {
  // Implementation
}
```

### README Updates

When adding features:
- Update feature list
- Add usage examples
- Update command-line options table
- Add to supported templates if applicable

## CI/CD

### GitHub Actions Workflows

- **CI**: Run on every push and PR
  - Type checking
  - Linting
  - Testing
  - Build validation

- **Release**: Run on version tags
  - Build and publish to npm
  - Create GitHub release
  - Update changelog

### Pre-commit Hooks

Automatically run before commits:
- Prettier formatting
- ESLint linting
- TypeScript type checking

## Versioning

Follow Semantic Versioning:
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

Update version in:
1. `package.json`
2. `src/cli.ts` (version option)
3. `CHANGELOG.md`

## Release Process

1. Update version: `npm version [major|minor|patch]`
2. Update CHANGELOG.md (move Unreleased to new version)
3. Commit: `git commit -am "chore: release v<version>"`
4. Tag: `git tag v<version>`
5. Push: `git push && git push --tags`
6. Publish: `npm publish`

## Common Tasks

### Adding a New Template

1. Create template directory: `src/templates/<name>/`
2. Add template files with Handlebars placeholders
3. Create generator: `src/generators/<name>.ts`
4. Export from `src/generators/index.ts`
5. Add to `Template` type in `src/types.ts`
6. Update CLI template option in `src/cli.ts`
7. Add tests in `tests/generators/<name>.test.ts`
8. Update README.md with new template

### Adding AI Provider

1. Create provider file: `src/ai/<provider>.ts`
2. Implement provider interface
3. Export from `src/ai/index.ts`
4. Add to `AIProvider` type in `src/types.ts`
5. Add configuration documentation in README
6. Add tests

### Adding UI Component

1. Create component: `src/ui/components/<Name>.tsx`
2. Add TypeScript interface for props
3. Export from `src/ui/components/index.ts`
4. Write tests
5. Use in App.tsx or other components

## Troubleshooting

### Common Issues

1. **TypeScript errors**: Run `npm run typecheck` to see all errors
2. **Linting errors**: Run `npm run lint:fix` to auto-fix
3. **Test failures**: Run `npm run test:watch` for debugging
4. **Build issues**: Clean and rebuild: `rm -rf dist && npm run build`

### Debugging

- Use `console.log` for quick debugging (remove before commit)
- Use Node.js debugger: `node --inspect dist/cli.js`
- Use VS Code debugger with launch configuration

## Resources

### Official Documentation
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Ink](https://github.com/vadimdemedes/ink)
- [Commander.js](https://github.com/tj/commander.js)
- [Jest](https://jestjs.io/docs/getting-started)

### Reference Projects
- [EdgeCraft](../EdgeCraft) - TypeScript/React project structure
- [dcmaidbot](../dcmaidbot) - Documentation and workflow patterns

### Similar Tools
- [Yeoman](https://yeoman.io/)
- [Cookiecutter](https://github.com/cookiecutter/cookiecutter)
- [Plop](https://plopjs.com/)

## Mandatory Policies for AI Agents

**⚠️ CRITICAL**: All AI agents working on this project MUST read and follow **AGENTS.md**.

AGENTS.md contains **non-negotiable mandatory policies** including:
- **CHANGELOG.md update policy** (MANDATORY for every release)
- Version synchronization requirements
- Git commit message conventions
- Testing and validation requirements
- Release process checklist

**Before starting ANY work, read AGENTS.md first!**

## Contact

For questions or issues:
- GitHub Issues: https://github.com/dcversus/prp/issues
- GitHub Discussions: https://github.com/dcversus/prp/discussions

---

**Last Updated**: 2025-10-28
**Version**: 0.1.1
