#!/usr/bin/env node

/**
 * Run E2E Tests with Proper Configuration
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Running PRP E2E Tests...\n');

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.CI = 'true';

try {
  // Run the E2E tests with custom config
  console.log('Running: npx jest tests/e2e/init-journey.test.ts --config jest.config.e2e.js --verbose\n');

  const result = execSync(
    'npx jest tests/e2e/init-journey.test.ts --config jest.config.e2e.js --verbose',
    {
      stdio: 'inherit',
      cwd: path.dirname(__dirname),
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    }
  );

  console.log('\n✅ E2E Tests Completed Successfully!');
} catch (error) {
  console.error('\n❌ E2E Tests Failed');
  console.error('Exit code:', error.status);

  // Provide helpful debugging info
  console.log('\n🔧 Debugging Tips:');
  console.log('1. Ensure ink-testing-library is installed');
  console.log('2. Check that InitFlow component exports properly');
  console.log('3. Verify all dependencies are installed');

  process.exit(error.status || 1);
}