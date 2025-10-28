# AGENTS.md - AI Agent Guidelines for PRP

This document provides specific instructions for AI coding assistants (Claude, GPT-4, Copilot, etc.) working on the PRP project. These guidelines supplement the CLAUDE.md development guide with **mandatory policies** that must be followed.

---

## 🚨 MANDATORY POLICIES (NON-NEGOTIABLE)

### 1. CHANGELOG.md Update Policy

**⚠️ CRITICAL: CHANGELOG.md must ALWAYS be updated with EVERY release.**

This is a **mandatory requirement** enforced by:
- All GitHub templates and workflows
- npm publishing guidelines
- Semantic versioning best practices
- Open source community standards

#### When to Update CHANGELOG.md

**ALWAYS update CHANGELOG.md when:**
- ✅ Creating a new release (major, minor, or patch)
- ✅ Publishing to npm
- ✅ Creating a git tag
- ✅ Completing a feature that will be released
- ✅ Fixing a bug that will be released

**Update IMMEDIATELY:**
- Before running `npm version [major|minor|patch]`
- Before running `npm publish`
- Before creating a git tag

#### CHANGELOG.md Format

Follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format strictly:

```markdown
## [Unreleased]

### Added
- New features go here during development

### Changed
- Changes to existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security patches

## [X.Y.Z] - YYYY-MM-DD

### Added
- Feature A
- Feature B

### Fixed
- Bug fix C

[Unreleased]: https://github.com/dcversus/prp/compare/vX.Y.Z...HEAD
[X.Y.Z]: https://github.com/dcversus/prp/compare/vX.Y.Z-1...vX.Y.Z
```

#### Release Process (MANDATORY STEPS)

**For EVERY release, follow these steps IN ORDER:**

1. **Update CHANGELOG.md**:
   ```bash
   # Move items from [Unreleased] to new version section
   # Add release date: ## [X.Y.Z] - YYYY-MM-DD
   # Update comparison links at bottom
   ```

2. **Update package.json version**:
   ```bash
   npm version [major|minor|patch]  # This creates a git tag
   ```

3. **Update version in src/cli.ts** (if it exists):
   ```typescript
   .version('X.Y.Z')
   ```

4. **Commit changes**:
   ```bash
   git add CHANGELOG.md package.json src/cli.ts
   git commit -m "chore: release vX.Y.Z"
   ```

5. **Tag the release**:
   ```bash
   git tag vX.Y.Z
   ```

6. **Push to GitHub**:
   ```bash
   git push origin main --tags
   ```

7. **Publish to npm**:
   ```bash
   npm publish
   ```

8. **Create GitHub Release**:
   - Go to GitHub releases
   - Create new release from tag
   - Copy CHANGELOG.md content for that version
   - Attach any binaries if applicable

#### Example: Preparing a Release

**Scenario**: You've fixed bugs and want to release v0.1.2

**Step 1 - Update CHANGELOG.md**:
```markdown
## [Unreleased]

### Added
- None

### Fixed
- None

## [0.1.2] - 2025-10-28

### Fixed
- Fixed template rendering issue with special characters
- Fixed CLI crash when invalid project name provided
- Fixed missing dependencies in generated package.json

[Unreleased]: https://github.com/dcversus/prp/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/dcversus/prp/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/dcversus/prp/compare/v0.1.0...v0.1.1
```

**Step 2 - Run npm version**:
```bash
npm version patch  # Bumps to 0.1.2 and creates git tag
```

**Step 3 - Push and Publish**:
```bash
git push origin main --tags
npm publish
```

**That's it!** The CHANGELOG.md is now properly maintained.

---

### 2. Version Synchronization Policy

**⚠️ MANDATORY: Keep versions synchronized across all files:**

- `package.json` (source of truth)
- `src/cli.ts` (if using Commander.js .version())
- `CHANGELOG.md` (release sections)
- `README.md` (installation instructions, if version is mentioned)

**Use `npm version` command to update package.json automatically** - it also creates git tags.

---

### 3. Git Commit Message Policy

**⚠️ MANDATORY: Follow [Conventional Commits](https://www.conventionalcommits.org/):**

Format: `<type>(<scope>): <subject>`

**Types:**
- `feat`: New feature (minor version bump)
- `fix`: Bug fix (patch version bump)
- `docs`: Documentation only
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring (no feature change)
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, config)
- `perf`: Performance improvements
- `ci`: CI/CD changes

**Examples:**
```bash
git commit -m "feat(generators): add Vue.js template generator"
git commit -m "fix(cli): correct validation for project names with hyphens"
git commit -m "docs(readme): update installation instructions"
git commit -m "chore: release v0.1.2"
```

**Breaking changes:**
```bash
git commit -m "feat(cli)!: change --template flag to --framework (BREAKING CHANGE)"
```

---

### 4. Testing Policy

**⚠️ MANDATORY before ANY release:**

```bash
# Run full validation suite
npm run validate

# Which includes:
npm run typecheck  # TypeScript must pass
npm run lint       # ESLint must pass with 0 warnings
npm run test       # All tests must pass
npm run build      # Build must succeed
```

**DO NOT release if any of these fail.**

---

### 5. Documentation Update Policy

**⚠️ MANDATORY when adding features:**

Update these files when applicable:
- `README.md` - User-facing documentation
- `CHANGELOG.md` - Release notes (ALWAYS)
- `CLAUDE.md` - Development guidelines (if architecture changes)
- `AGENTS.md` - This file (if AI workflow changes)
- JSDoc comments - All public APIs

---

## 🤖 AI Agent Workflow

### When Working on PRP

1. **Read CLAUDE.md first** - Understand the project philosophy
2. **Read this file (AGENTS.md)** - Follow mandatory policies
3. **Check recent commits** - Understand what's been done
4. **Update CHANGELOG.md** - Add to [Unreleased] section as you work
5. **Follow PRP methodology** - Use PRPs for large features
6. **Test thoroughly** - Run `npm run validate` before committing
7. **Commit with conventional format** - Follow commit message policy

### Creating a New Feature

```bash
# 1. Create feature branch
git checkout -b feature/new-template

# 2. Implement feature
# ... code changes ...

# 3. Update CHANGELOG.md under [Unreleased]
# Add to "### Added" section

# 4. Write tests
npm run test

# 5. Validate everything
npm run validate

# 6. Commit with conventional format
git commit -m "feat(generators): add Svelte template"

# 7. Push and create PR
git push origin feature/new-template
```

### Fixing a Bug

```bash
# 1. Create fix branch
git checkout -b fix/template-rendering-bug

# 2. Fix the bug
# ... code changes ...

# 3. Update CHANGELOG.md under [Unreleased]
# Add to "### Fixed" section

# 4. Add regression test
npm run test

# 5. Validate
npm run validate

# 6. Commit
git commit -m "fix(templateEngine): handle special characters in project names"

# 7. Push and create PR
git push origin fix/template-rendering-bug
```

### Preparing a Release

```bash
# 1. Ensure CHANGELOG.md is up to date
# Move [Unreleased] items to new version section

# 2. Decide version bump (major.minor.patch)
# - Major: Breaking changes
# - Minor: New features (backward compatible)
# - Patch: Bug fixes

# 3. Update package.json and create tag
npm version [major|minor|patch]

# 4. Update CHANGELOG.md links
# Update [Unreleased] and [X.Y.Z] comparison URLs

# 5. Commit CHANGELOG.md
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for vX.Y.Z"

# 6. Push to GitHub
git push origin main --tags

# 7. Publish to npm
npm publish

# 8. Create GitHub Release
# Use GitHub UI to create release from tag
# Copy CHANGELOG.md content for release notes
```

---

## 📋 Pre-Release Checklist

**Before EVERY release, verify:**

- [ ] CHANGELOG.md updated with all changes since last release
- [ ] CHANGELOG.md has correct version number and date
- [ ] CHANGELOG.md comparison links updated
- [ ] package.json version matches release version
- [ ] src/cli.ts version (if exists) matches release version
- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm run lint` passes with 0 warnings
- [ ] `npm run test` passes all tests
- [ ] `npm run build` succeeds without errors
- [ ] Generated projects from templates work correctly
- [ ] README.md reflects latest features (if changed)
- [ ] Git working directory is clean (no uncommitted changes)
- [ ] All commits follow conventional format
- [ ] Breaking changes are clearly documented (if any)

**Only proceed with release if ALL items are checked ✅**

---

## 🎯 Quality Standards

### Code Quality (Enforced)

- **TypeScript**: Strict mode, no `any` types (except documented exceptions)
- **ESLint**: 0 warnings, 0 errors
- **Prettier**: Auto-formatted (pre-commit hook)
- **Tests**: >70% coverage target
- **Documentation**: All public APIs have JSDoc

### Generated Project Quality

**CRITICAL**: Ensure generated projects:
- Build successfully (`npm run build` or equivalent)
- Pass linting (`npm run lint`)
- Include all necessary files (package.json, README, etc.)
- Have correct file permissions (especially executables)
- Follow framework best practices
- Include working examples

### Error Handling

- Always handle errors gracefully
- Provide actionable error messages
- Log errors for debugging
- Exit with appropriate codes (0 = success, 1 = error)
- Never leave users with cryptic errors

---

## 🔄 CI/CD Integration

### Automated Checks (GitHub Actions)

Every push and PR triggers:
1. TypeScript type checking
2. ESLint linting
3. Test suite execution
4. Build validation

**These must pass before merging to main.**

### Release Automation

When a tag is pushed (`v*.*.*`):
1. Build project
2. Run full test suite
3. Publish to npm (if on main branch)
4. Create GitHub Release
5. Update changelog links

**Ensure CHANGELOG.md is updated BEFORE pushing tag!**

---

## 🌟 Best Practices for AI Agents

### DO:
- ✅ Always read CLAUDE.md and AGENTS.md before starting work
- ✅ Update CHANGELOG.md as you work (under [Unreleased])
- ✅ Run `npm run validate` before committing
- ✅ Follow conventional commit format
- ✅ Write tests for new features
- ✅ Update documentation when adding features
- ✅ Ask questions if requirements are unclear
- ✅ Preserve existing code style and patterns
- ✅ Reference related files in commit messages

### DON'T:
- ❌ Skip updating CHANGELOG.md (EVER!)
- ❌ Commit without running validation
- ❌ Use `any` types without justification
- ❌ Ignore ESLint warnings
- ❌ Break existing tests without fixing them
- ❌ Change version numbers manually (use `npm version`)
- ❌ Push directly to main (use PRs)
- ❌ Publish without updating CHANGELOG.md
- ❌ Leave TODO comments without GitHub issues
- ❌ Introduce security vulnerabilities

---

## 📚 Key Resources

- **CLAUDE.md** - Main development guide
- **PRP-CLI.md** - Project specification (in PRPs/ directory)
- **Keep a Changelog** - https://keepachangelog.com/
- **Conventional Commits** - https://www.conventionalcommits.org/
- **Semantic Versioning** - https://semver.org/

---

## 🆘 Common Issues & Solutions

### Issue: Forgot to update CHANGELOG.md before release

**Solution:**
```bash
# 1. Update CHANGELOG.md now
# 2. Amend the release commit
git add CHANGELOG.md
git commit --amend --no-edit
# 3. Force push tag
git tag -f vX.Y.Z
git push origin main --tags --force-with-lease
```

### Issue: Version mismatch between files

**Solution:**
```bash
# 1. Use package.json as source of truth
# 2. Update all other files to match
# 3. Commit with "chore: sync version numbers"
```

### Issue: Tests failing on CI but passing locally

**Solution:**
```bash
# 1. Clear node_modules and reinstall
rm -rf node_modules
npm install
# 2. Run tests again
npm test
# 3. Check for platform-specific issues
# 4. Ensure test files are committed
```

### Issue: Publish failed due to validation errors

**Solution:**
```bash
# 1. Fix validation errors
npm run validate
# 2. Update patch version
npm version patch
# 3. Update CHANGELOG.md
# 4. Retry publish
npm publish
```

---

## 🎊 Remember

**The goal is to maintain a professional, reliable open-source project that developers trust.**

- CHANGELOG.md is not optional - it's MANDATORY
- Semantic versioning is not a suggestion - it's a CONTRACT
- Testing is not nice-to-have - it's REQUIRED
- Documentation is not extra - it's ESSENTIAL

**When in doubt, ask!** Better to clarify than to break things.

---

**Last Updated**: 2025-10-28
**Version**: 1.0.0
**Status**: 📋 Active Policy
