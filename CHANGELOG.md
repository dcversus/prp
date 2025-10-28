# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup with TypeScript and Ink
- CLI entry point with Commander.js
- Basic project structure (src/, tests/, templates/)
- Configuration files (tsconfig.json, eslint, prettier)
- Essential documentation (README, LICENSE, CHANGELOG, CLAUDE)
- GitHub repository creation

### Changed
- None

### Deprecated
- None

### Removed
- None

### Fixed
- None

### Security
- None

## [0.1.0] - 2024-10-28

### Added
- **Interactive CLI** with beautiful Ink-based terminal UI
  - Wizard-style project setup flow
  - Step-by-step prompts for project metadata
  - Template selection with descriptions
  - License selection
- **Three Production-Ready Templates**:
  - TypeScript Library (based on EdgeCraft patterns with strict config)
  - React App with Vite (based on EdgeCraft patterns)
  - FastAPI Python service (based on dcmaidbot patterns)
- **Comprehensive Common File Generators**:
  - LICENSE (MIT, Apache-2.0, GPL-3.0, BSD-3-Clause, ISC, Unlicense)
  - README.md with project badges and sections
  - CONTRIBUTING.md with contribution guidelines
  - CODE_OF_CONDUCT.md (Contributor Covenant)
  - SECURITY.md with vulnerability reporting
  - CHANGELOG.md (Keep a Changelog format)
  - .gitignore (language-specific)
  - .editorconfig for consistent coding styles
- **Template Engine**:
  - Handlebars-based rendering
  - Custom helpers (uppercase, lowercase, kebabCase, snakeCase, pascalCase)
  - Type-safe template data
- **Modular Utility System**:
  - File generator with automatic directory creation
  - Git operations (init, add, commit)
  - Package manager detection (npm, yarn, pnpm)
  - Input validation for project names and emails
- **Command-Line Options**:
  - Full non-interactive mode support
  - All options configurable via CLI flags
  - Git initialization (optional, --no-git to skip)
  - Dependency installation (optional, --no-install to skip)
- **Developer Experience**:
  - TypeScript 5.6+ with strict mode enabled
  - Zero-warning build system
  - Hot reload in development mode
  - Comprehensive npm scripts
  - Clean ESM module architecture
- **Documentation**:
  - Comprehensive PRP specification (PRP-CLI.md)
  - Complete README with usage examples
  - CLAUDE.md for AI development guidelines

### Technical Details
- Built with TypeScript 5.6+ in strict mode
- Uses Ink 5.0+ for React-based terminal UI
- Commander.js for CLI argument parsing
- Handlebars 4.7+ for template rendering
- fs-extra for file operations
- execa for subprocess execution
- Full ESM module system

[Unreleased]: https://github.com/dcversus/prp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/dcversus/prp/releases/tag/v0.1.0
