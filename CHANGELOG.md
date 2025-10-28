# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **PRP Methodology & Signal System** - Revolutionary context-driven development workflow
  - **Signal System**: 14 emotional/state indicators (ATTENTION, BLOCKED, TIRED, ENCANTADO, etc.)
  - **Signal Strength**: Priority system (1-10 scale) for intelligent work prioritization
  - **Progress Log**: Standardized table format tracking role, datetime, comment, signal
  - **Agent Personalities**: System Analyst with Portuguese flair, pragmatic Developer, skeptical Tester
  - **Signal Reaction Patterns**: Detailed action steps for each signal type
  - **PRP LOOP MODE**: Continuous iteration guided by signals until DoD or checkpoint
  - **Mandatory PRP Workflow**: Find/create PRP before any work (Policy #0)
  - **TUI Selection**: Interactive PRP selection when multiple exist
  - **CLI Flags**: `--file` and `--new` for PRP management
- **CI/CD Infrastructure** - Complete GitHub Actions setup
  - Parallel CI jobs (lint, typecheck, test, security, build) for faster feedback
  - CHANGELOG.md check workflow (enforces mandatory updates on PRs)
  - Claude Code Review workflow (automated AI code review)
  - Quality gate job (requires all checks to pass)
- **Pre-commit Hooks** - Automated quality checks before commits
  - Husky for git hook management
  - lint-staged for incremental linting and formatting
  - TypeScript type checking on pre-commit
- **Testing Infrastructure**
  - Unit tests for validation utilities (9 tests passing)
  - Jest configuration fixed (`coverageThreshold` typo corrected)
  - Test directory structure (`tests/unit/`, `tests/integration/`)
- **GitHub Templates**
  - Pull Request template with DOD checklist and CHANGELOG reminder
  - Bug report issue template
  - Feature request issue template
  - Template request issue template
- **Development Tools**
  - `.editorconfig` for consistent code formatting across editors
  - Updated `lint-staged` configuration in package.json
- **Documentation**
  - AGENTS.md with comprehensive PRP workflow and signal system
  - AGENTS.md with mandatory CHANGELOG policy
  - README.md updated with PRP methodology as main project goal
  - PRP-007 specification document for signal system
  - CLAUDE.md updated with AGENTS.md reference

### Changed
- **CI Workflow** - Restructured from matrix to parallel jobs (EdgeCraft pattern)
  - Faster feedback (5 parallel jobs vs sequential matrix)
  - Separate security audit job
  - Build artifact retention (7 days)
- **Package.json** - Added husky and lint-staged as dev dependencies

### Fixed
- Jest configuration warning (`coverageThresholds` → `coverageThreshold`)

### Security
- None

## [0.1.1] - 2025-10-28

### Fixed
- **package.json bin path**: Corrected bin path to `dist/cli.js` for proper npm global installation
- **ESLint configuration**: Added Node.js globals (\_\_dirname, \_\_filename) to ESLint config to fix publishing errors
- **Jest configuration**: Added `--passWithNoTests` flag to allow npm publish without test files in initial release

### Changed
- Updated build process to ensure executable permissions on `dist/cli.js`

## [0.1.0] - 2025-10-28

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

[Unreleased]: https://github.com/dcversus/prp/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/dcversus/prp/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/dcversus/prp/releases/tag/v0.1.0
