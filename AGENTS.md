# AGENTS.md - AI Agent Guidelines for PRP

This document provides specific instructions for AI coding assistants (Claude, GPT-4, Copilot, etc.) working on the PRP project. These guidelines supplement the CLAUDE.md development guide with **mandatory policies** that must be followed.

**Created by**: Vasilisa Versus
**Project Goal**: Bootstrap context-driven development workflow based on Product Requirement Prompts (PRPs) and orchestrate execution with LOOP MODE.

---

## 🔄 PRP WORKFLOW (MANDATORY)

**Every agent session MUST follow this workflow:**

### PRP File Organization Rules

**⚠️ CRITICAL: PRPs folder structure MUST be FLAT - NO subdirectories allowed.**

**Naming Convention**:
- Format: `PRP-XXX-what-will-change.md`
- **XXX**: Sequential number (001, 002, 003, etc.)
- **what-will-change**: 2-4 words describing the outcome when PRP is complete
- Use kebab-case (lowercase with hyphens)

**Examples**:
- ✅ `PRP-001-bootstrap-cli-created.md` - CLI tool will be created
- ✅ `PRP-002-landing-page-deployed.md` - Landing page will be deployed
- ✅ `PRP-007-signal-system-implemented.md` - Signal system will be implemented
- ✅ `PRP-015-auth-module-integrated.md` - Auth module will be integrated
- ❌ `PRP-002-Landing-Page.md` - Not outcome-focused, uses PascalCase
- ❌ `PRPs/research/analysis.md` - Subdirectory not allowed
- ❌ `PRP-003.md` - Missing descriptive name

**Rationale**:
- **Flat structure** = Easy to find, no navigation complexity
- **Outcome-focused names** = Clear value proposition at a glance
- **Sequential numbers** = Chronological order, easy reference
- **Short names** = Quick to scan, fits in terminal width

### Step 1: Find Related PRP
**BEFORE doing ANY work**, agent must:
1. Check if a PRP exists for the current task
2. Search `PRPs/` directory for relevant PRPs
3. Read PRP titles and summaries

**If NO PRP exists**:
- Ask: **"Do we really need a new PRP?"**
- Show TUI (Terminal UI) with options:
  ```
  Select PRP or create new:
  [ ] PRP-001: CLI Implementation
  [ ] PRP-002: Landing Page
  [ ] PRP-003: Telegram Integration
  ...
  [ ] ✨ Create NEW PRP
  ```
- This is **FORCED** when running via CLI without `--file` argument

### Step 2: Create New PRP (if needed)
When user selects "Create NEW PRP" or uses `--new` flag:

**CLI must gather**:
1. **Description**: What is this PRP about?
2. **Goal**: What do we want to achieve?
3. **Final State**: What should be the result?
4. **Definition of Done (DoD)**: How do we know it's complete?
5. **Value**: Why is this important?
6. **Details**: Any additional context?

**Then produce new PRP** with:
- Standard PRP format (see PRP-CLI.md template)
- Initial **SIGNAL COMMENT** from creator:
  ```markdown
  ## Progress Log

  | Role | Date | Comment | Signal |
  |------|------|---------|--------|
  | User (via claude-sonnet-4-5) | 2025-10-28 | User requested new PRP. Initial assessment: This PRP addresses [topic]. Complexity estimate: Medium-High. Value: HIGH - this will enable [benefit]. Concerns: [any concerns]. | 🔴 ATTENTION |
  ```

### Step 3: Enter PRP LOOP MODE
Once PRP is identified/created, agent enters **LOOP MODE**:

```
┌─────────────────────────────────────┐
│       PRP LOOP MODE ACTIVE          │
└─────────────────────────────────────┘

1. READ PRP → Extract current status and signals
2. CHECK git status → Any uncommitted changes?
3. REACT to strongest signal
4. EXECUTE work
5. UPDATE PRP with progress
6. LEAVE SIGNAL comment
7. COMMIT if changes made
8. REPEAT until DoD met or checkpoint reached
```

### Step 4: Read Signals
**Before each action**, read all signals in PRP progress log:
- Identify **strongest signal** (highest priority/intensity)
- Understand signal meaning (see Signal Reference below)
- React accordingly

### Step 5: Execute Work
- Work on task according to PRP requirements
- Follow Definition of Ready (DoR)
- Aim for Definition of Done (DoD)

### Step 6: Update PRP and Leave Signal
**After each work session** or when reaching checkpoint:
1. Add entry to Progress Log table
2. Describe what was done
3. Add emotional/status signal
4. Commit changes if files modified

**Example Progress Entry**:
```markdown
| Developer (claude-sonnet-4-5) | 2025-10-28 14:32 | Implemented authentication module. Added JWT middleware, created login/register endpoints, wrote 15 tests (all passing). Deployment tested on staging. Ready for review. | ✅ CONFIDENT |
```

### Step 7: Commit and Continue
If files changed:
```bash
git add .
git commit -m "feat(auth): implement JWT authentication module

- Add JWT middleware
- Create login/register endpoints
- Write 15 tests (all passing)
- Update PRP-003 progress log

Signal: CONFIDENT"
```

Then either:
- Continue LOOP if more work needed
- Create PR if DoD reached
- Exit LOOP if checkpoint/context limit reached

---

## 📡 SIGNAL SYSTEM

**Signals** are emotional/status indicators that help agents understand work state and prioritize actions.

### What is a Signal?
- **Self-extractable** from tone of voice in comments
- **Dominant emotion or status** of the work
- **Actionable** - tells next agent how to react
- **Personality-aware** - agents can have unique voices

### Signal Format
Signals appear in Progress Log table:

```markdown
| Role | Date | Comment | Signal |
|------|------|---------|--------|
| system-analyst | 2025-10-28 | Comment text | 🎉 ENCANTADO!!! |
```

### Signal Reference Table

| Signal | Emoji | Strength | Meaning | Action Required |
|--------|-------|----------|---------|-----------------|
| **ATTENTION** | 🔴 | 10 | New PRP created, needs review | Review PRP, assess complexity, begin planning |
| **BLOCKED** | 🚫 | 9 | Cannot proceed, external dependency | Identify blocker, escalate, work on different task |
| **URGENT** | 🚨 | 9 | Time-sensitive, needs immediate action | Prioritize above all other work |
| **TIRED** | 😫 | 6 | Work incomplete, needs inventory | Review what's done, create task list, checkpoint |
| **CONFUSED** | 🤔 | 7 | Unclear requirements, need clarification | Ask questions, update PRP with ambiguities |
| **EXCITED** | 🎉 | 8 | Breakthrough, new possibilities discovered | Document discoveries, create new PRPs if needed |
| **ENCANTADO** | ✨ | 8 | Amazing discovery, spawned new PRPs | Read all spawned PRPs, execute strongest signal |
| **CONFIDENT** | ✅ | 3 | Work complete, tests passing, ready | Review code, create PR, move to next task |
| **VALIDATED** | 🎯 | 2 | Work reviewed and approved | Merge PR, close PRP, celebrate |
| **FRUSTRATED** | 😤 | 7 | Technical difficulties, need help | Document issue, seek help, consider alternatives |
| **OPTIMISTIC** | 🌟 | 5 | Good progress, on track | Continue work, maintain momentum |
| **CAUTIOUS** | ⚠️ | 6 | Concerns about approach, needs discussion | Document concerns, discuss with team |
| **RESEARCHING** | 🔍 | 5 | Deep dive in progress | Continue research, document findings |
| **COMPLETED** | 🏁 | 1 | DoD met, PRP done | Final review, close PRP, archive |

### Signal Strength Priority
When multiple signals present, react to:
1. **Highest strength** (9-10) first
2. **Most recent** if equal strength
3. **Blocking** signals before non-blocking

### Agent Personalities (Optional)
Agents can have unique personalities reflected in signals:

**System Analyst** (Portuguese flair):
- Occasionally uses Portuguese words
- Example: "encantado" (delighted), "incrível" (incredible), "perfeito" (perfect)
- Emotional, enthusiastic about discoveries

**Developer** (Pragmatic):
- Direct, honest about challenges
- Example: "shit work, exhausted", "finally working", "tests green"
- Focus on completion and quality

**Tester** (Skeptical):
- Critical, thorough
- Example: "found 10 bugs", "edge case missed", "coverage too low"
- Focus on quality and completeness

### Signal Reaction Patterns - COMPREHENSIVE ALGORITHMS

**⚠️ CRITICAL: When encountering ANY signal, agent MUST follow these exact algorithms.**

Each signal defines:
- **WHO** should react (which role/agent)
- **WHAT** to do (specific actions)
- **HOW** to do it (step-by-step algorithm)
- **WHO LIKES** this signal (which roles appreciate seeing it)
- **WHO HATES** this signal (which roles dislike seeing it)

---

#### 🔴 ATTENTION (Strength 10) - DEFAULT SIGNAL FOR USER COMMUNICATION

**MEANING**: New PRP created OR need to ask user a question OR need user clarification

**WHO SHOULD REACT**: ANY agent, but MUST use NUDGE system if needs user input

**WHO LIKES**: System Analyst (loves new work), Project Manager (wants clarity)
**WHO HATES**: Developer (interrupts flow), Tester (can't test incomplete specs)

**WHAT TO DO**:
1. **IF** PRP is new → Review and begin planning
2. **IF** need user clarification → **USE NUDGE SYSTEM** (see below)
3. **IF** unclear requirements → Document questions, then NUDGE

**HOW TO DO IT - Algorithm**:
```
IF signal_reason == "new_prp":
    1. Read entire PRP thoroughly (title, description, goal, DoR, DoD)
    2. Assess complexity (1-10 scale)
    3. Assess value (LOW/MEDIUM/HIGH)
    4. Check DoR - is it ready to start?
       - IF DoR not met → Leave BLOCKED signal with missing items
       - IF DoR met → Leave RESEARCHING signal and begin
    5. Create initial plan/architecture
    6. Update progress log with assessment

ELSE IF signal_reason == "need_user_input":
    1. **TRIGGER NUDGE SYSTEM** (MANDATORY)
    2. Format question clearly with context
    3. Call nudge API with:
       - Question text
       - Related PRP link
       - Urgency level
       - Expected response format
    4. Wait for user response (async)
    5. When response received:
       - Add user response to PRP Progress Log
       - Role: "user (via telegram)"
       - Extract user's intent
       - Continue work based on answer
       - Leave appropriate signal
    6. **NEVER** guess or assume - always ask if uncertain

ELSE IF signal_reason == "incident":
    1. **IMMEDIATE NUDGE** (highest priority)
    2. Include:
       - What broke
       - Impact assessment
       - Immediate actions taken
       - Options for user to decide
    3. Wait for user decision
    4. Execute based on user choice
```

**EXAMPLE**:
```markdown
| developer | 2025-10-28 | I'm implementing the auth system but unclear if we should use JWT or sessions. This affects architecture significantly. Need user decision before continuing. | 🔴 ATTENTION |
```
**→ System triggers NUDGE to user via Telegram**
**→ User responds: "Use JWT, it's more scalable"**
**→ System adds response to PRP and continues**

---

#### 🚫 BLOCKED (Strength 9)

**MEANING**: Cannot proceed due to external dependency or missing requirement

**WHO SHOULD REACT**: ANY agent encountering blocker, Project Manager to escalate

**WHO LIKES**: Project Manager (visibility into blockers), System Analyst (can find alternatives)
**WHO HATES**: Developer (hates being blocked), Tester (can't test blocked work)

**WHAT TO DO**: Identify blocker, document it, escalate if external, find workaround

**HOW TO DO IT - Algorithm**:
```
1. STOP current work immediately
2. Identify exact blocker:
   - External API not ready?
   - Missing credentials/access?
   - Dependency not available?
   - User decision needed?
   - Technical limitation?
3. Document blocker in PRP:
   ### BLOCKER
   - **Type**: [API/Credentials/Dependency/Decision/Technical]
   - **Description**: [Detailed explanation]
   - **Impact**: [What can't be done]
   - **Owner**: [Who can unblock]
   - **ETA**: [When might be resolved]
4. IF blocker is external dependency:
   - **TRIGGER NUDGE** to user
   - Explain blocker and impact
   - Ask for help/escalation
5. IF blocker has workaround:
   - Document workaround
   - Implement temporary solution
   - Leave CAUTIOUS signal
6. IF no workaround:
   - Leave BLOCKED signal with full details
   - Switch to different PRP
   - Check back later
7. When blocker resolved:
   - Update PRP with resolution
   - Leave OPTIMISTIC signal
   - Continue work
```

**EXAMPLE**:
```markdown
| developer | 2025-10-28 | BLOCKED on PRP-005. Need API credentials for Stripe integration but don't have access. Can't test payment flow without them. Implemented mock for now but need real credentials to complete. | 🚫 BLOCKED |
```
**→ System triggers NUDGE asking user to provide Stripe credentials**

#### TIRED (😫, Strength 6)
```
Action:
1. Stop current work
2. Review what was accomplished
3. Create inventory/checklist of remaining work
4. Update PRP with detailed status
5. Checkpoint: commit all work in progress
6. Leave CHECKPOINT signal
```

#### ENCANTADO (✨, Strength 8)
```
Action:
1. Read comment to find spawned PRPs
2. Navigate to each new PRP
3. Read each PRP's signals
4. Identify strongest signal across all PRPs
5. Execute work on PRP with strongest signal
6. Return to original PRP when done
```

#### CONFIDENT (✅, Strength 3)
```
Action:
1. Review completed work
2. Run all tests and validation
3. Update CHANGELOG.md
4. Create PR with descriptive title/body
5. Request review
6. Mark PRP section as complete
```

### Signal Examples in Practice

**Example 1: System Analyst discovers new PRPs**

```markdown
| system-analyst (claude-sonnet-4-5) | 2025-10-28 15:45 | Que incrível! During research, I discovered we need 3 separate PRPs: PRP-008 (API Architecture), PRP-009 (Database Schema), PRP-010 (Caching Strategy). Each one is complex enough to warrant full PRP. Created all three with initial analysis. Please review! | ✨ ENCANTADO!!! |
```

**Next agent reaction**:
1. Find PRP-008, PRP-009, PRP-010
2. Read each one
3. Check signals in each
4. PRP-008 has ATTENTION (10), PRP-009 has ATTENTION (10), PRP-010 has ATTENTION (10)
5. All equal, so pick PRP-008 (first one)
6. Begin work on PRP-008

**Example 2: Developer exhausted**

```markdown
| developer (claude-sonnet-4-5) | 2025-10-28 18:30 | Implemented 60% of authentication system. JWT middleware done, register endpoint done, login endpoint half-done. Ran into complex edge cases with refresh tokens. Tests: 8 passing, 3 failing. Need to inventory what's left and take a break. Shit work, honestly exhausted. | 😫 TIRED |
```

**Next agent reaction**:
1. Read PRP to understand context
2. Run `git status` - see uncommitted changes
3. Create inventory in PRP:
   ```markdown
   ### Remaining Work (from TIRED checkpoint)
   - [ ] Complete login endpoint (refresh token edge cases)
   - [ ] Fix 3 failing tests
   - [ ] Add token expiration logic
   - [ ] Write integration tests
   - [ ] Update documentation
   ```
4. Commit work-in-progress: `git commit -m "WIP: auth system 60% complete"`
5. Leave CHECKPOINT signal
6. Can continue work or switch tasks

**Example 3: Work Complete**

```markdown
| developer (claude-sonnet-4-5) | 2025-10-28 20:15 | Authentication system DONE! All endpoints implemented, 25 tests passing (100% coverage), documentation updated, CHANGELOG.md updated. Deployed to staging and tested manually. Everything works perfectly. Ready for PR! | ✅ CONFIDENT |
```

**Next agent reaction**:
1. Verify tests: `npm test` ✅
2. Verify build: `npm run build` ✅
3. Verify CHANGELOG.md updated ✅
4. Create PR:
   ```bash
   git checkout -b feat/authentication
   git push origin feat/authentication
   gh pr create --title "feat: implement JWT authentication system" \
     --body "$(cat PRPs/PRP-003.md | grep -A 50 'Definition of Done')"
   ```
5. Update PRP with PR link
6. Leave VALIDATED signal (after review)

---

## 🔄 LOOP MODE Detailed Flow

### Loop Initialization

```bash
$ prp loop

🔍 Searching for PRPs in PRPs/...
Found 6 PRPs:
  1. PRP-001: CLI Implementation [COMPLETED]
  2. PRP-002: Landing Page [ATTENTION]
  3. PRP-003: Telegram Integration [CONFIDENT]
  4. PRP-004: Remote Orchestrator [RESEARCHING]
  5. PRP-005: Templates [BLOCKED]
  6. PRP-006: Orchestrator [ATTENTION]

Select PRP to work on (or 'n' for new):
> 2

📋 Loading PRP-002: Landing Page...

🔴 Strongest Signal: ATTENTION (Strength: 10)
📝 Last Comment: "User requested landing page. High value, medium complexity."

Entering LOOP MODE for PRP-002...
```

### Loop Iteration

```
┌─────────── LOOP ITERATION 1 ──────────┐
│ PRP: PRP-002 Landing Page              │
│ Status: DoR Met ✅                     │
│ Strongest Signal: ATTENTION            │
└────────────────────────────────────────┘

🤖 Agent Action:
1. ✅ Read PRP-002 - Understood requirements
2. ✅ Check git status - Clean working tree
3. ✅ React to ATTENTION - Begin planning
4. 🔨 Execute: Create technical design
   - Next.js 14 + Tailwind
   - Component structure
   - API routes
5. ✅ Update PRP-002 progress log
6. ✅ Leave signal: OPTIMISTIC
7. ✅ Commit changes

📝 New Progress Entry:
| developer (claude-sonnet-4-5) | 2025-10-28 21:00 | Created technical design for landing page. Chose Next.js 14 with App Router, Tailwind CSS, and shadcn/ui. Designed component structure (Hero, Features, Demo, FAQ). Planning looks solid, ready to start implementation. | 🌟 OPTIMISTIC |

Continue LOOP? [Y/n]:
```

### Loop Checkpoint

After significant work or context limit:

```
┌─────────── LOOP CHECKPOINT ──────────┐
│ PRP: PRP-002 Landing Page             │
│ Progress: 40% complete                │
│ Context: 150K tokens used             │
└───────────────────────────────────────┘

⚠️  Reaching context limit. Creating checkpoint...

✅ Committed changes
✅ Updated PRP progress log
✅ Pushed to remote

📝 Checkpoint Entry:
| developer (claude-sonnet-4-5) | 2025-10-28 22:30 | Checkpoint: 40% complete. Hero section done, Features section in progress. Components are clean and responsive. Tests: 12 passing. Will continue with Demo section next session. | 🏁 CHECKPOINT |

LOOP MODE paused. Resume with: prp loop --resume PRP-002
```

---

## 🚨 MANDATORY POLICIES (NON-NEGOTIABLE)

### 0. PRP Workflow Policy (NEW)

**⚠️ CRITICAL: ALWAYS follow PRP workflow before starting work.**

This is **MANDATORY** for all agents:
- ✅ Find or create PRP BEFORE doing work
- ✅ Read signals in PRP progress log
- ✅ React to strongest signal
- ✅ Update PRP after each work session
- ✅ Leave signal describing status
- ✅ Use LOOP MODE for sustained work

**Violation**: Starting work without PRP is NOT ALLOWED.

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

## 📞 NUDGE SYSTEM - User Communication Protocol

**⚠️ CRITICAL: Use NUDGE system ANY time you need user input. NEVER guess or assume.**

### What is NUDGE?

**NUDGE** is the asynchronous communication system between AI agents and human users via Telegram. It enables agents to ask questions, report incidents, and get clarification without blocking work.

### When to Use NUDGE

**MANDATORY scenarios**:
1. **ATTENTION signal** with unclear requirements
2. **BLOCKED signal** with external dependency
3. **Incidents** (production issues, security concerns)
4. **Major architectural decisions**
5. **Budget/timeline concerns**
6. **ANY uncertainty** that blocks progress

**Treat user as a manager**:
- User hasn't dived deep into implementation
- User wants brief summaries with clear options
- User appreciates being kept in the loop
- User values agent's expertise and recommendations

### NUDGE System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRP Orchestrator (CI)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Agent encounters ATTENTION/BLOCKED signal               │ │
│  │ ↓                                                        │ │
│  │ Triggers NUDGE system                                   │ │
│  │ ↓                                                        │ │
│  │ POST https://dcmaid.theedgestory.org/nudge              │ │
│  │ Headers:                                                 │ │
│  │   Authorization: Bearer <NUDGE_SECRET>                   │ │
│  │   Content-Type: application/json                         │ │
│  │ Body:                                                    │ │
│  │ {                                                        │ │
│  │   "message": "Question from agent...",                   │ │
│  │   "prp_link": "https://github.com/dcversus/prp/...",     │ │
│  │   "urgency": "high",                                     │ │
│  │   "agent_role": "developer",                             │ │
│  │   "callback_url": "https://api.github.com/repos/..."     │ │
│  │ }                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                dcmaidbot (/nudge endpoint)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 1. Validate NUDGE_SECRET                                 │ │
│  │ 2. Run internal LLM with orchestrator instructions      │ │
│  │ 3. Format message for Telegram (markdown)               │ │
│  │ 4. Include PRP link, agent context, options             │ │
│  │ 5. Send to admin Telegram users (from config)           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Admin receives Telegram message                 │
│  ╔════════════════════════════════════════════════════════╗ │
│  ║ 🔴 ATTENTION from developer                             ║ │
│  ║                                                          ║ │
│  ║ **PRP**: PRP-005 Authentication System                  ║ │
│  ║ [View PRP](https://github.com/dcversus/prp/...)         ║ │
│  ║                                                          ║ │
│  ║ **Question**: Should we use JWT or session-based auth?  ║ │
│  ║                                                          ║ │
│  ║ **Context**: JWT is stateless (scalable) but requires  ║ │
│  ║ client-side token storage. Sessions are simpler but     ║ │
│  ║ require server-side state management.                   ║ │
│  ║                                                          ║ │
│  ║ **Agent Recommendation**: JWT for scalability           ║ │
│  ║                                                          ║ │
│  ║ Reply to this message to respond...                     ║ │
│  ╚════════════════════════════════════════════════════════╝ │
│                                                              │
│  Admin types: "Agreed, use JWT. Also add refresh tokens."   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│          dcmaidbot captures response & validates             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 1. Validate admin is in dcmaidbot config                 │ │
│  │ 2. Extract response text                                 │ │
│  │ 3. Trigger GitHub Action via repository_dispatch        │ │
│  │    POST https://api.github.com/repos/dcversus/prp/       │ │
│  │         dispatches                                       │ │
│  │    Headers:                                              │ │
│  │      Authorization: Bearer <GITHUB_TOKEN>                │ │
│  │      Accept: application/vnd.github+json                 │ │
│  │    Body:                                                 │ │
│  │    {                                                     │ │
│  │      "event_type": "nudge_response",                     │ │
│  │      "client_payload": {                                 │ │
│  │        "prp": "PRP-005",                                  │ │
│  │        "user_handle": "dcversus",                        │ │
│  │        "response": "Agreed, use JWT. Add refresh tokens",│ │
│  │        "nudge_secret": "<SECRET>",                       │ │
│  │        "timestamp": "2025-10-28T10:00:00Z"               │ │
│  │      }                                                    │ │
│  │    }                                                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│         GitHub Actions (CI) receives dispatch                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Workflow: .github/workflows/nudge-response.yml           │ │
│  │                                                          │ │
│  │ on:                                                      │ │
│  │   repository_dispatch:                                   │ │
│  │     types: [nudge_response]                              │ │
│  │                                                          │ │
│  │ jobs:                                                    │ │
│  │   process-response:                                      │ │
│  │     runs-on: ubuntu-latest                               │ │
│  │     steps:                                               │ │
│  │       - Validate NUDGE_SECRET matches                    │ │
│  │       - Extract PRP, user response                       │ │
│  │       - Run Claude with instructions:                    │ │
│  │         * Read PRP-005                                   │ │
│  │         * Add user response to Progress Log              │ │
│  │         * Role: "user (via telegram @dcversus)"          │ │
│  │         * Extract intent                                 │ │
│  │         * Continue work based on response                │ │
│  │         * Leave appropriate signal (OPTIMISTIC)          │ │
│  │       - Commit updated PRP                               │ │
│  │       - Restart LOOP MODE                                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### NUDGE Security

**Secret Management**:
1. User obtains `NUDGE_SECRET` from dcmaidbot Telegram bot
   - Command: `/getsecret` in Telegram
   - Bot responds with unique secret for user
2. User adds `NUDGE_SECRET` to GitHub repository secrets:
   - Go to: https://github.com/dcversus/prp/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NUDGE_SECRET`
   - Value: [secret from bot]
   - Click "Add secret"
3. CI uses secret for both:
   - Outgoing nudge requests (to dcmaidbot)
   - Validating incoming responses (from dcmaidbot)

**Validation Flow**:
```
Agent → [NUDGE_SECRET] → dcmaidbot
dcmaidbot → [NUDGE_SECRET] → GitHub CI
GitHub CI validates secret matches → Process response
```

**Admin Validation**:
- Only admins configured in dcmaidbot can respond
- dcmaidbot checks Telegram user ID against admin list
- Non-admin responses are rejected

### NUDGE Message Format

**Good NUDGE message**:
```markdown
**Role**: developer
**PRP**: PRP-005 Authentication System
[View PRP](https://github.com/dcversus/prp/blob/main/PRPs/PRP-005-auth-implemented.md)

**Question**: Should we use JWT or session-based auth?

**Context**:
- JWT: Stateless, scalable, requires client storage
- Sessions: Simple, server-side state, less scalable

**My recommendation**: JWT (better for API-first architecture)

**Options**:
1. JWT with refresh tokens (recommended)
2. Session-based with Redis
3. Hybrid approach

What do you prefer?
```

**Bad NUDGE message**:
```
Should we use JWT?
```

### Post-NUDGE Workflow

**After user responds**:
1. ✅ CI validates NUDGE_SECRET
2. ✅ Agent adds response to PRP Progress Log:
```markdown
| user (via telegram @dcversus) | 2025-10-28 | Agreed, use JWT. Also add refresh token functionality for better UX. | 🎯 DECISION |
```
3. ✅ Agent extracts intent: "Use JWT + refresh tokens"
4. ✅ Agent continues work with user decision
5. ✅ Agent leaves new signal: OPTIMISTIC

**Restart LOOP MODE**:
- Agent now has clear direction
- Blocked → Unblocked
- ATTENTION resolved
- Work continues

---

## 🧪 POST-RELEASE QA WORKFLOW

**⚠️ MANDATORY: After EVERY release, QA must validate ALL features.**

### Overview

After publishing a new version (e.g., v0.2.0):
1. **Automated E2E tests** run on CI
2. **QA agent** reviews test results
3. **QA agent** manually verifies DoD from all completed PRPs
4. **QA agent** leaves comment in each PRP with findings and signal
5. **IF bugs found**: Create new PRP, work in new branch
6. **IF all good**: Leave VALIDATED signal, celebrate

### Automated E2E Test Suite

**Location**: `tests/e2e/*.test.ts`

**Tests must cover**:
1. **Installation test**
   - Install from npm: `npm install -g @dcversus/prp@latest`
   - Verify version: `prp --version`
   - Verify help: `prp --help`
2. **Upgrade test**
   - Install old version: `npm install -g @dcversus/prp@0.1.1`
   - Upgrade: `npm update -g @dcversus/prp`
   - Verify new version installed
3. **Bootstrap test** (for each feature)
   - Run in `/tmp` directory: `cd /tmp/test-prp-$(date +%s)`
   - Bootstrap project: `prp --name test-app --template react --no-interactive`
   - Verify files created: `test -f package.json && test -f README.md`
   - Install dependencies: `npm install`
   - Run tests: `npm test`
   - Run build: `npm run build`
4. **Feature-specific tests** (one per completed PRP)
   - Read DoD from PRP
   - Create test case for each DoD item
   - Verify feature works as specified

**Example E2E test**:
```typescript
// tests/e2e/install-upgrade.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

describe('E2E: Installation and Upgrade', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = path.join(os.tmpdir(), `prp-e2e-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should install latest version from npm', async () => {
    const { stdout } = await execAsync('npm install -g @dcversus/prp@latest');
    expect(stdout).toContain('@dcversus/prp');
  }, 60000);

  it('should show correct version', async () => {
    const { stdout } = await execAsync('prp --version');
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should bootstrap React project', async () => {
    const projectDir = path.join(testDir, 'test-react-app');
    const cmd = `prp --name test-react-app --template react --license MIT --no-interactive`;

    await execAsync(cmd, { cwd: testDir });

    // Verify files created
    const files = await fs.readdir(projectDir);
    expect(files).toContain('package.json');
    expect(files).toContain('README.md');
    expect(files).toContain('tsconfig.json');
  }, 120000);
});
```

### Manual QA Checklist

**QA agent MUST**:
1. **Review all completed PRPs** since last release
2. **For each PRP**:
   - Read DoD (Definition of Done)
   - Manually verify each DoD item
   - Test the actual feature
   - Document results
3. **Leave comment in PRP** with findings:

**Good QA comment template**:
```markdown
| qa-agent (claude-sonnet-4-5) | 2025-10-28 | Post-release QA for v0.2.0 completed.

**DoD Verification**:
- [x] Signal system documented ✅
- [x] 14 signals defined ✅
- [x] AGENTS.md updated ✅
- [x] README.md updated ✅
- [x] All tests passing (9/9) ✅

**Manual Testing**:
- Tested signal workflow: ✅ Works as expected
- Tested LOOP MODE docs: ✅ Clear and actionable
- Tested flat PRP structure: ✅ All PRPs follow convention

**Findings**:
- No bugs found
- Documentation is comprehensive
- Ready for production use

| ✅ VALIDATED |
```

**If bugs found**:
```markdown
| qa-agent | 2025-10-28 | Post-release QA found issues.

**DoD Verification**:
- [x] Feature implemented ✅
- [ ] Edge case handling ❌ (Bug found)
- [ ] Documentation complete ❌ (Missing examples)

**Bugs Found**:
1. **Bug**: Signal system crashes when reading malformed PRP
   - **Steps**: Open PRP with missing Progress Log table
   - **Expected**: Graceful error
   - **Actual**: Crashes with undefined error
   - **Severity**: HIGH

2. **Bug**: NUDGE system documentation incomplete
   - **Issue**: Missing setup instructions
   - **Severity**: MEDIUM

**Next Steps**:
- Create PRP-009 for bug fixes
- Create branch: `fix/v0.2.1-bugs`
- Address bugs
- Re-release as v0.2.1

| 🚨 URGENT |
```

### QA Workflow Algorithm

```
1. Release published (v0.2.0)
   ↓
2. CI automatically runs E2E tests
   - tests/e2e/*.test.ts
   - Report: tests/e2e/report.html
   ↓
3. QA agent reviews test results
   IF tests fail:
     - Leave URGENT signal in related PRP
     - Create new PRP for fixes
     - STOP release (pull back if possible)
   IF tests pass:
     - Continue to manual QA
   ↓
4. QA agent gets list of completed PRPs since last release
   - Query: git log v0.1.1..v0.2.0 --grep="closes PRP-"
   - List: [PRP-002, PRP-007]
   ↓
5. FOR EACH completed PRP:
   a. Read PRP file
   b. Read DoD section
   c. FOR EACH DoD item:
      - Test feature manually
      - Document result (✅ or ❌)
   d. IF all DoD items ✅:
      - Leave VALIDATED signal
      - Move to next PRP
   e. IF any DoD item ❌:
      - Document bug details
      - Leave URGENT signal
      - Add to bug list
   ↓
6. IF bug list NOT empty:
   a. Create new PRP-XXX for bug fixes
   b. Create branch: fix/vX.Y.Z-bugs
   c. Update CHANGELOG.md with patch notes
   d. Work on fixes in new branch
   e. Create PR for fixes
   f. Release patch version (v0.2.1)
   g. Repeat QA workflow
   ↓
7. IF bug list empty:
   a. Leave VALIDATED in all PRPs
   b. Update main PRP with release link
   c. Celebrate 🎉
   d. Signal: COMPLETED
```

### CI Integration

**Workflow**: `.github/workflows/post-release-qa.yml`
```yaml
name: Post-Release QA

on:
  release:
    types: [published]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run E2E tests
        run: |
          npm ci
          npm run test:e2e

      - name: Upload test report
        uses: actions/upload-artifact@v4
        with:
          name: e2e-report
          path: tests/e2e/report.html

  manual-qa:
    needs: e2e-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Trigger manual QA checklist
        run: |
          echo "📋 Manual QA required"
          echo "Review all PRPs since last release"
          echo "Follow QA workflow in AGENTS.md"
          # TODO: Trigger NUDGE to QA team
```

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
