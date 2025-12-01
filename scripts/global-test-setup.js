/**
 * Global Test Setup Script
 *
 * Runs before all test suites to:
 * - Set up test environment
 * - Clean up any leftovers from previous runs
 * - Prepare test databases and services
 * - Set up monitoring and logging
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function globalSetup() {
  console.log('🌍 Starting global test setup...');

  // Create test results directory
  const testResultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }

  // Clean up any leftover test directories
  const tempDir = require('os').tmpdir();
  try {
    const { readdirSync, rmSync } = require('fs');
    const tempFiles = readdirSync(tempDir).filter(file => file.startsWith('prp-test-'));

    for (const tempFile of tempFiles) {
      const tempPath = path.join(tempDir, tempFile);
      try {
        rmSync(tempPath, { recursive: true, force: true });
        console.log(`🧹 Cleaned up leftover test directory: ${tempPath}`);
      } catch (error) {
        console.warn(`⚠️ Failed to clean up ${tempPath}:`, error.message);
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to clean up temp directories:', error.message);
  }

  // Ensure CLI is built
  try {
    console.log('🔨 Ensuring CLI is built...');
    execSync('npm run build', { stdio: 'pipe' });
    console.log('✅ CLI build completed');
  } catch (error) {
    console.warn('⚠️ CLI build failed, tests may use existing build:', error.message);
  }

  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  process.env.PRP_TEST_MODE = 'true';
  process.env.FORCE_COLOR = '0'; // Disable colors for test output

  // Set up performance monitoring
  if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
    process.env.PRP_PERFORMANCE_MONITORING = 'true';
  }

  // Create test database if needed (for integration tests)
  if (process.env.SETUP_TEST_DB === 'true') {
    console.log('🗄️ Setting up test database...');
    // Add database setup logic here if needed
  }

  // Log system information
  console.log('💻 System Information:');
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Architecture: ${process.arch}`);
  console.log(`   Node.js version: ${process.version}`);
  console.log(`   CPU cores: ${require('os').cpus().length}`);
  console.log(`   Total memory: ${Math.round(require('os').totalmem() / 1024 / 1024)}MB`);

  console.log('✅ Global test setup completed');
}

module.exports = globalSetup;