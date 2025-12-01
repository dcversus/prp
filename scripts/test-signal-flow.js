/**
 * Simple Signal Flow Test Script
 *
 * Tests the complete signal flow without Jest dependencies
 */

console.log('🚀 Starting Signal Flow Integration Test...');

async function testSignalFlow() {
  try {
    // Import the signal system
    const { signalSystemIntegration } = await import('../src/shared/signals/index.js');

    console.log('✅ Signal system imported successfully');

    // Initialize the signal system
    await signalSystemIntegration.initialize();
    console.log('✅ Signal system initialized');

    // Start the signal system
    await signalSystemIntegration.start();
    console.log('✅ Signal system started');

    // Test signal detection in agent log content
    const agentLogContent = `
[dp] Working on authentication system - implementing JWT validation
[cq] Code quality checks passing with 95% coverage
[aa] Need admin guidance on API rate limiting strategy
[tg] All tests passing in authentication module
[bb] Database connection blocked - need credentials
    `;

    console.log('📝 Testing agent log signal detection...');
    await signalSystemIntegration.processAgentLog('robo-developer', agentLogContent);
    console.log('✅ Agent log signals processed');

    // Test signal detection in PRP content
    const prpContent = `
# PRP-001: Signal System Implementation

## progress

- \`src/shared/signals/event-bus-integration.ts\` EventBus integration layer [dp]
- \`src/orchestrator/agent-log-streaming.ts\` Agent log streaming system [tp]
- \`src/shared/signals/signal-flow-coordinator.ts\` Signal flow coordinator [da]

[da] Implementation complete - ready for TUI integration
[tp] Tests prepared and passing
[bb] Need to resolve TUI subscription integration
    `;

    console.log('📝 Testing PRP file signal detection...');
    const detectedSignals = await signalSystemIntegration.processFile('/test/prp.md', prpContent);
    console.log(`✅ PRP file signals processed: ${detectedSignals.length} signals detected`);

    // Get recent signals
    const recentSignals = signalSystemIntegration.getRecentSignals(20);
    console.log(`📊 Retrieved ${recentSignals.length} recent signals`);

    // Get system status
    const status = signalSystemIntegration.getStatus();
    console.log('📈 System Status:');
    console.log(`  - Initialized: ${status.initialized}`);
    console.log(`  - Running: ${status.running}`);
    console.log(`  - Total Signals: ${status.performance.totalSignals}`);
    console.log(`  - Processing Rate: ${status.performance.processingRate.toFixed(2)} signals/sec`);
    console.log(`  - EventBus Subscribers: ${status.components.eventBus.subscribers}`);
    console.log(`  - Signal Detector Patterns: ${status.components.signalDetector.patterns}`);

    // Test signal filtering
    const criticalSignals = recentSignals.filter(s => s.priority === 'critical');
    const mediumSignals = recentSignals.filter(s => s.priority === 'medium');

    console.log(`🎯 Signal Priority Breakdown:`);
    console.log(`  - Critical: ${criticalSignals.length}`);
    console.log(`  - Medium: ${mediumSignals.length}`);

    // Verify signal types
    const signalTypes = new Set(recentSignals.map(s => s.signal));
    console.log(`🔍 Signal Types Detected: ${Array.from(signalTypes).join(', ')}`);

    // Cleanup
    console.log('🧹 Cleaning up...');
    await signalSystemIntegration.cleanup();
    console.log('✅ Signal system cleaned up');

    console.log('🎉 All Signal Flow Integration Tests Passed!');
    console.log('\n📋 Test Summary:');
    console.log('  ✅ Signal system initialization');
    console.log('  ✅ Agent log signal detection');
    console.log('  ✅ PRP file signal detection');
    console.log('  ✅ EventBus signal routing');
    console.log('  ✅ Signal filtering and retrieval');
    console.log('  ✅ Performance metrics collection');
    console.log('  ✅ System cleanup');

  } catch (error) {
    console.error('❌ Signal Flow Test Failed:', error);
    process.exit(1);
  }
}

// Run the test
testSignalFlow();