/**
 * TUI Debug Screen Test
 *
 * Test file to demonstrate debug screen functionality
 */

import { EventBus } from '../shared/events';
import { TuiDebugScreen } from './debug-screen';
import { createDebugConfig } from './debug-config';

async function testDebugScreen(): Promise<void> {
  console.log('🧪 Testing TUI Debug Screen');

  // Create event bus and debug screen
  const eventBus = new EventBus();
  const debugConfig = createDebugConfig({
    maxEvents: 50,
    refreshInterval: 500
  });

  const debugScreen = new TuiDebugScreen(debugConfig, eventBus);

  // Set up event listeners
  debugScreen.on('debug.activated', () => {
    console.log('✅ Debug screen activated');
  });

  debugScreen.on('debug.event', (event) => {
    console.log(`📝 Event received: ${event.source} - ${event.type}`);
  });

  debugScreen.on('debug.refresh', () => {
    console.log('🔄 Debug screen refreshed');
  });

  // Activate debug screen
  debugScreen.activate();

  // Simulate system events
  console.log('🎭 Simulating system events...');

  // System startup event
  debugScreen.addEvent({
    id: 'system-startup',
    timestamp: new Date(),
    source: 'system',
    priority: 'medium',
    type: 'startup',
    data: {
      startup: true,
      prpCount: 7,
      readyToSpawn: true
    },
    raw: 'system · { startup: true, prpCount: 7, readyToSpawn: true }'
  });

  // Scanner event
  setTimeout(() => {
    debugScreen.addEvent({
      id: 'scanner-detection',
      timestamp: new Date(),
      source: 'scanner',
      priority: 'low',
      type: 'detection',
      data: {
        detected: ['fs-change', 'new-branch', 'secrets-ref'],
        count: 3
      },
      raw: 'scanner · { detected: ["fs-change","new-branch","secrets-ref"], count: 3 }'
    });
  }, 1000);

  // Inspector event
  setTimeout(() => {
    debugScreen.addEvent({
      id: 'inspection-result',
      timestamp: new Date(),
      source: 'inspector',
      priority: 'high',
      type: 'inspection',
      data: {
        impact: 'high',
        risk: 8,
        files: ['PRPs/agents-v05.md', 'PRPs/tui-implementation.md'],
        why: 'cross-links missing'
      },
      raw: 'inspector · { impact: "high", risk: 8, files: ["PRPs/agents-v05.md","PRPs/…"], why: "cross-links missing" }'
    });
  }, 2000);

  // Orchestrator event
  setTimeout(() => {
    debugScreen.addEvent({
      id: 'orchestrator-spawn',
      timestamp: new Date(),
      source: 'orchestrator',
      priority: 'high',
      type: 'agent_spawn',
      data: {
        agentId: 'robo-aqa-001',
        prp: 'prp-agents-v05',
        role: 'robo-aqa',
        task: 'audit PRP links',
        budget: { tokens: 50000, time: 3600 }
      },
      raw: 'orchestrator · Spawning agent robo-aqa-001 for prp-agents-v05'
    });
  }, 3000);

  // Agent event
  setTimeout(() => {
    debugScreen.addEvent({
      id: 'agent-progress',
      timestamp: new Date(),
      source: 'agent',
      priority: 'medium',
      type: 'progress',
      data: {
        agentId: 'robo-aqa-001',
        status: 'running',
        progress: 35,
        tokens: '18.2k',
        activeTime: '00:01:43',
        currentTask: 'integrating cross-links'
      },
      raw: 'agent · robo-aqa-001: integrating cross-links… (35% complete)'
    });
  }, 4000);

  // Error event
  setTimeout(() => {
    debugScreen.addEvent({
      id: 'error-occurred',
      timestamp: new Date(),
      source: 'system',
      priority: 'critical',
      type: 'error',
      data: {
        error: 'Compilation failed',
        details: 'TypeScript errors detected',
        count: 673
      },
      raw: 'system · CRITICAL: Compilation failed - 673 TypeScript errors detected'
    });
  }, 5000);

  // Display debug content after all events
  setTimeout(() => {
    console.log('\n📊 Debug Screen Content:');
    console.log('═'.repeat(80));
    const content = debugScreen.getDebugContent();
    console.log(content.join('\n'));
    console.log('═'.repeat(80));

    // Test controls
    console.log('\n🎮 Testing debug controls...');

    setTimeout(() => {
      console.log('🔧 Toggling full JSON mode...');
      debugScreen.config.showFullJson = !debugScreen.config.showFullJson;
    }, 1000);

    setTimeout(() => {
      console.log('⏸️ Pausing updates...');
      debugScreen.togglePause();
    }, 2000);

    setTimeout(() => {
      console.log('▶️ Resuming updates...');
      debugScreen.togglePause();
    }, 3000);

    setTimeout(() => {
      console.log('💾 Exporting events...');
      debugScreen.exportEvents();
    }, 4000);

    setTimeout(() => {
      console.log('🗑️ Clearing events...');
      debugScreen.clearEvents();
    }, 5000);

    setTimeout(() => {
      console.log('\n✅ Debug screen test completed!');
      debugScreen.deactivate();
      process.exit(0);
    }, 6000);

  }, 6000);
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDebugScreen().catch(console.error);
}

export { testDebugScreen };