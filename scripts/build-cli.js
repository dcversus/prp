#!/usr/bin/env node

/**
 * Universal CLI Build Script
 *
 * Features:
 * - Version checking and validation
 * - CHANGELOG.md verification
 * - Production build support with --prod flag
 * - Minification support
 * - Comprehensive error handling
 * - Build metadata generation
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
  packageJsonPath: join(__dirname, '../package.json'),
  changelogPath: join(__dirname, '../CHANGELOG.md'),
  distDir: join(__dirname, '../dist'),
  buildInfoPath: join(__dirname, '../dist/build-info.json'),
};

// Colors for terminal output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Color helpers (removed unused colorLog function)
// function colorLog(color, message) {
//   console.log(`${COLORS[color]}${message}${COLORS.reset}`);
// }

function colorError(message) {
  console.error(`${COLORS.red}❌ ${message}${COLORS.reset}`);
}

function colorSuccess(message) {
  console.log(`${COLORS.green}✅ ${message}${COLORS.reset}`);
}

function colorWarning(message) {
  console.log(`${COLORS.yellow}⚠️  ${message}${COLORS.reset}`);
}

function colorInfo(message) {
  console.log(`${COLORS.blue}ℹ️  ${message}${COLORS.reset}`);
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    prod: false,
    minify: false,
    skipVersionCheck: false,
    skipChangelogCheck: false,
    help: false,
  };

  for (const arg of args) {
    switch (arg) {
      case '--prod':
      case '-p':
        options.prod = true;
        options.minify = true;
        break;
      case '--minify':
      case '-m':
        options.minify = true;
        break;
      case '--skip-version-check':
        options.skipVersionCheck = true;
        break;
      case '--skip-changelog-check':
        options.skipChangelogCheck = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (arg.startsWith('-')) {
          colorError(`Unknown option: ${arg}`);
          options.help = true;
        }
    }
  }

  return options;
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
${COLORS.cyan}Universal CLI Build Script${COLORS.reset}

${COLORS.yellow}Usage:${COLORS.reset}
  node scripts/build-cli.js [options]

${COLORS.yellow}Options:${COLORS.reset}
  ${COLORS.cyan}-p, --prod${COLORS.reset}           Production build (enables minification and publishing checks)
  ${COLORS.cyan}-m, --minify${COLORS.reset}         Minify build artifacts
  ${COLORS.cyan}--skip-version-check${COLORS.reset}  Skip package.json version validation
  ${COLORS.cyan}--skip-changelog-check${COLORS.reset} Skip CHANGELOG.md validation
  ${COLORS.cyan}-h, --help${COLORS.reset}           Show this help message

${COLORS.yellow}Examples:${COLORS.reset}
  node scripts/build-cli.js                # Development build
  node scripts/build-cli.js --prod         # Production build with all checks
  node scripts/build-cli.js --minify       # Minified development build
  node scripts/build-cli.js --prod --skip-version-check  # Production build without version check
`);
}

/**
 * Get current version from package.json
 */
function getCurrentVersion() {
  try {
    const packageJson = JSON.parse(readFileSync(CONFIG.packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    throw new Error(`Failed to read package.json: ${error.message}`);
  }
}

/**
 * Check if version has been updated since last build
 */
async function checkVersionUpdated() {
  colorInfo('Checking version update status...');

  try {
    // Get current version
    const currentVersion = getCurrentVersion();
    colorInfo(`Current version: ${currentVersion}`);

    // Check if build-info.json exists and has previous version
    let previousVersion = null;
    if (existsSync(CONFIG.buildInfoPath)) {
      try {
        const buildInfo = JSON.parse(readFileSync(CONFIG.buildInfoPath, 'utf8'));
        previousVersion = buildInfo.version;
      } catch {
        colorWarning('Could not read previous build info, assuming new version');
      }
    }

    if (previousVersion) {
      if (previousVersion === currentVersion) {
        colorWarning(`Version ${currentVersion} has not changed since last build`);
        return false;
      } else {
        colorSuccess(`Version updated from ${previousVersion} to ${currentVersion}`);
        return true;
      }
    } else {
      colorInfo(`No previous build found, treating version ${currentVersion} as new`);
      return true;
    }
  } catch (error) {
    colorError(`Version check failed: ${error.message}`);
    throw error;
  }
}

/**
 * Validate CHANGELOG.md contains current version
 */
function validateChangelog() {
  colorInfo('Validating CHANGELOG.md...');

  try {
    if (!existsSync(CONFIG.changelogPath)) {
      throw new Error('CHANGELOG.md file not found');
    }

    const changelogContent = readFileSync(CONFIG.changelogPath, 'utf8');
    const currentVersion = getCurrentVersion();

    // Check if current version is mentioned in changelog
    const versionPattern = new RegExp(
      `##\\s*\\[${currentVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`,
      'i'
    );

    if (!versionPattern.test(changelogContent)) {
      throw new Error(
        `Version ${currentVersion} not found in CHANGELOG.md. Please add changelog entry for this version.`
      );
    }

    colorSuccess(`CHANGELOG.md contains entry for version ${currentVersion}`);
    return true;
  } catch (error) {
    colorError(`CHANGELOG.md validation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Run linting and type checking
 */
function runQualityChecks() {
  colorInfo('Running quality checks...');

  try {
    // Run type checking
    colorInfo('Running TypeScript type checking...');
    execSync('npm run typecheck', { stdio: 'inherit' });

    // Run linting
    colorInfo('Running ESLint...');
    execSync('npm run lint', { stdio: 'inherit' });

    colorSuccess('All quality checks passed');
  } catch (error) {
    colorError('Quality checks failed');
    throw error;
  }
}

/**
 * Build CLI with tsup
 */
function buildCLI(options = {}) {
  colorInfo('Building CLI with tsup...');

  try {
    const tsupCommand = options.minify ? 'npx tsup --minify' : 'npx tsup';

    execSync(tsupCommand, { stdio: 'inherit' });

    // Make CLI executable
    const cliPath = join(CONFIG.distDir, 'cli.js');
    if (existsSync(cliPath)) {
      execSync(`chmod +x "${cliPath}"`, { stdio: 'inherit' });
      colorSuccess('CLI built and made executable');
    } else {
      throw new Error('CLI build artifact not found');
    }
  } catch (error) {
    colorError(`CLI build failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate build metadata
 */
function generateBuildInfo(options = {}) {
  colorInfo('Generating build metadata...');

  try {
    const packageJson = JSON.parse(readFileSync(CONFIG.packageJsonPath, 'utf8'));

    const buildInfo = {
      version: packageJson.version,
      name: packageJson.name,
      description: packageJson.description,
      buildType: options.prod ? 'production' : 'development',
      minified: options.minify || false,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      buildCommand: process.argv.join(' '),
      files: {
        cli: './dist/cli.js',
        index: './dist/index.js',
        types: './dist/index.d.ts',
      },
    };

    writeFileSync(CONFIG.buildInfoPath, JSON.stringify(buildInfo, null, 2));
    colorSuccess(
      `Build metadata written to ${CONFIG.buildInfoPath.replace(CONFIG.distDir + '/', '')}`
    );

    return buildInfo;
  } catch (error) {
    colorError(`Failed to generate build metadata: ${error.message}`);
    throw error;
  }
}

/**
 * Display build summary
 */
function displayBuildSummary(buildInfo, options) {
  console.log(`\n${COLORS.cyan}🎉 Build completed successfully!${COLORS.reset}`);
  console.log(`${COLORS.yellow}═${'═'.repeat(50)}${COLORS.reset}`);
  console.log(`${COLORS.blue}Build Details:${COLORS.reset}`);
  console.log(`  Version: ${COLORS.green}${buildInfo.version}${COLORS.reset}`);
  console.log(`  Type: ${COLORS.green}${buildInfo.buildType}${COLORS.reset}`);
  console.log(`  Minified: ${COLORS.green}${buildInfo.minified}${COLORS.reset}`);
  console.log(`  Timestamp: ${COLORS.green}${buildInfo.timestamp}${COLORS.reset}`);
  console.log(`  Node: ${COLORS.green}${buildInfo.nodeVersion}${COLORS.reset}`);
  console.log(`${COLORS.yellow}═${'═'.repeat(50)}${COLORS.reset}`);

  if (options.prod) {
    console.log(`\n${COLORS.cyan}🚀 Production build ready!${COLORS.reset}`);
    console.log(`${COLORS.blue}Next steps:${COLORS.reset}`);
    console.log(`  • Run tests: ${COLORS.green}npm test${COLORS.reset}`);
    console.log(`  • Publish to npm: ${COLORS.green}npm publish${COLORS.reset}`);
  } else {
    console.log(`\n${COLORS.blue}📦 Development build ready!${COLORS.reset}`);
    console.log(`  • Test CLI: ${COLORS.green}node dist/cli.js --help${COLORS.reset}`);
  }
}

/**
 * Main build function
 */
async function build() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log(`${COLORS.cyan}🏗️  Universal CLI Build Script${COLORS.reset}`);
  console.log(`${COLORS.yellow}═${'═'.repeat(50)}${COLORS.reset}`);

  try {
    // Production build requires additional checks
    if (options.prod) {
      if (!options.skipVersionCheck) {
        const versionUpdated = await checkVersionUpdated();
        if (!versionUpdated) {
          colorWarning('Continuing with unchanged version...');
        }
      }

      if (!options.skipChangelogCheck) {
        validateChangelog();
      }

      // Run quality checks for production builds
      runQualityChecks();
    }

    // Build CLI
    buildCLI(options);

    // Generate build metadata
    const buildInfo = generateBuildInfo(options);

    // Display summary
    displayBuildSummary(buildInfo, options);
  } catch (error) {
    colorError(`Build failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  build();
}

export { buildCLI, checkVersionUpdated, validateChangelog, generateBuildInfo };
