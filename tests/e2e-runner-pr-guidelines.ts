#!/usr/bin/env node

/**
 * E2E Test Runner: Pull Request Guidelines
 *
 * Runs the comprehensive E2E test for Pull Request guidelines execution
 */

import { runTests } from './test-runner';

async function main() {
  console.log('🚀 Starting Pull Request Guidelines E2E Tests...\n');

  try {
    await runTests('pull-request-guidelines.test.ts');

    console.log('\n✅ All Pull Request Guidelines E2E tests passed!');
    console.log('\n📊 Test Summary:');
    console.log('  - PR signal → Guidelines trigger ✅');
    console.log('  - GitHub API integration ✅');
    console.log('  - Inspector analysis ✅');
    console.log('  - Structural classification ✅');
    console.log('  - Orchestrator decision ✅');
    console.log('  - GitHub actions execution ✅');
    console.log('  - Storage persistence ✅');
    console.log('  - Error handling ✅');
    console.log('  - Signal escalation ✅');
    console.log('  - Execution order ✅');

  } catch (error) {
    console.error('\n❌ E2E tests failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}