# Agent-Scanner Bridge and Signal Attribution System

## Overview

This system provides comprehensive signal detection and agent attribution capabilities, connecting the scanner's signal detection with specific agent activities. It implements a multi-layered approach to accurately attribute signals to the correct agents using various strategies and machine learning techniques.

## Architecture

### Core Components

1. **AgentActivityTracker** - Tracks agent activities and provides correlation data
2. **AgentScannerBridge** - Bridges scanner signal detection with agent activities
3. **SignalAttributionEngine** - Advanced attribution engine with multiple strategies
4. **EnhancedUnifiedSignalDetector** - Enhanced signal detector with agent tracking
5. **AgentSignalRegistry** - Registry for agent-signal relationships and lifecycle management
6. **SignalAttributionIntegration** - Integration and verification system

### Data Flow

```
Scanner Signal Detection
         ↓
Enhanced Signal Detector (with agent patterns)
         ↓
Agent-Scanner Bridge (correlation and session tracking)
         ↓
Signal Attribution Engine (multi-strategy attribution)
         ↓
Agent Signal Registry (relationship tracking and learning)
         ↓
Attribution Result (with confidence and evidence)
```

## Key Features

### Signal Attribution Strategies

1. **Temporal Correlation** - Attributes signals based on timing proximity to agent activities
2. **Contextual Matching** - Matches signals to agents based on file paths and PRP context
3. **Pattern Matching** - Uses learned agent-signal patterns for attribution
4. **Signature Detection** - Identifies agent signatures within signal content
5. **ML Model** - Machine learning model for advanced attribution (when available)

### Agent Tracking

- **Session Management** - Tracks agent sessions and activity over time
- **Activity Correlation** - Correlates signals with recent agent activities
- **Pattern Learning** - Learns agent-signal patterns for improved attribution
- **Lifecycle Tracking** - Tracks complete signal lifecycle from detection to resolution

### Performance Optimization

- **Caching** - Multi-level caching for signal patterns and attribution results
- **Batch Processing** - Efficient batch processing of multiple signals
- **Parallel Processing** - Parallel attribution for high-throughput scenarios
- **Debouncing** - Prevents duplicate signal processing

## Usage Examples

### Basic Signal Detection with Attribution

```typescript
import {
  createAttributionSystem,
  EnhancedUnifiedSignalDetector,
  AgentScannerBridge,
  SignalAttributionEngine,
  AgentSignalRegistry
} from './agents/attribution-index';

// Create attribution system
const attributionSystem = createAttributionSystem({
  bridgeConfig: {
    enableRealTimeCorrelation: true,
    correlationTimeWindow: 30000
  },
  engineConfig: {
    enableMLAttribution: true,
    strategies: ['temporal', 'contextual', 'pattern_match', 'signature']
  }
});

// Detect signals with agent attribution
const signalDetector = new EnhancedUnifiedSignalDetector({
  enableAgentAttribution: true,
  attributionConfidenceThreshold: 0.6,
  agentSignatureLearning: true
});

const result = await signalDetector.detectSignals(content, {
  filePath: '/src/components/example.tsx',
  prpContext: 'prp-001-signal-system',
  source: { component: 'git', method: 'commit' }
});

console.log(`Detected ${result.signals.length} signals`);
console.log(`Attributed ${result.agentAttribution.attributedSignals.length} signals to agents`);
```

### Agent Activity Tracking

```typescript
import { AgentScannerBridge } from './agents/agent-scanner-bridge';

const bridge = new AgentScannerBridge(activityTracker, signalRegistry);

// Track agent activity
await bridge.trackAgentActivity(
  'robo-developer-001',
  AgentActivityType.FILE_MODIFIED,
  'Updated component implementation',
  { filePath: '/src/components/example.tsx' }
);

// Get agent session
const session = bridge.getAgentSession('robo-developer-001');
console.log(`Agent session: ${session?.sessionId}, active: ${session?.isActive}`);
```

### Advanced Signal Attribution

```typescript
import { SignalAttributionEngine } from './agents/signal-attribution-engine';

const engine = new SignalAttributionEngine(activityTracker, signalRegistry, {
  enableMLAttribution: true,
  enableEnsembleAttribution: true,
  strategies: [
    { name: 'temporal', weight: 0.2, enabled: true },
    { name: 'contextual', weight: 0.3, enabled: true },
    { name: 'pattern_match', weight: 0.25, enabled: true },
    { name: 'signature', weight: 0.15, enabled: true },
    { name: 'ml_model', weight: 0.1, enabled: true }
  ]
});

// Attribute signal to agent with comprehensive analysis
const attribution = await engine.attributeSignal(signal, {
  timestamp: new Date(),
  content: signalContent,
  filePath: '/src/example.ts',
  prpContext: 'prp-001',
  relatedFiles: fileChanges,
  relatedPRPs: prpFiles
});

console.log(`Signal attributed to: ${attribution.attributedAgent?.agentId}`);
console.log(`Confidence: ${attribution.attributedAgent?.confidence}`);
console.log(`Ensemble confidence: ${attribution.ensembleConfidence}`);
```

### Signal Registry and Pattern Learning

```typescript
import { AgentSignalRegistry } from './agents/agent-signal-registry';

const registry = new AgentSignalRegistry({
  enableLearning: true,
  learningRate: 0.1,
  enablePersistence: true,
  retentionPeriod: 7 * 24 * 60 * 60 * 1000 // 7 days
});

// Register agent
await registry.registerAgent(agent);

// Learn signal patterns
await registry.learnSignalPatterns(agent.id, [
  { signalCode: '[dp]', context: 'development progress', frequency: 5 },
  { signalCode: '[bf]', context: 'bug fix', frequency: 3 }
]);

// Get learned patterns
const patterns = await registry.getSignalPatterns(agent.id);
console.log(`Learned ${patterns.length} patterns for agent`);
```

## Configuration

### Bridge Configuration

```typescript
const bridgeConfig: AgentScannerBridgeConfig = {
  enableRealTimeCorrelation: true,
  correlationTimeWindow: 30000, // 30 seconds
  minConfidenceThreshold: 0.6,
  maxCorrelationCache: 10000,
  enableActivityChaining: true,
  attributionStrategies: ['temporal', 'contextual', 'pattern_match', 'signature'],
  sessionTracking: {
    enabled: true,
    sessionTimeout: 300000, // 5 minutes
    maxSessionsPerAgent: 5
  }
};
```

### Attribution Engine Configuration

```typescript
const engineConfig: SignalAttributionEngineConfig = {
  enableMLAttribution: true,
  enableEnsembleAttribution: true,
  strategies: [
    {
      name: 'temporal',
      enabled: true,
      weight: 0.2,
      confidenceThreshold: 0.6,
      parameters: { timeWindow: 30000 }
    },
    {
      name: 'contextual',
      enabled: true,
      weight: 0.3,
      confidenceThreshold: 0.7,
      parameters: { filePathWeight: 0.8 }
    },
    {
      name: 'pattern_match',
      enabled: true,
      weight: 0.25,
      confidenceThreshold: 0.8,
      parameters: { minPatternFrequency: 3 }
    },
    {
      name: 'signature',
      enabled: true,
      weight: 0.15,
      confidenceThreshold: 0.9,
      parameters: { strictMatching: true }
    },
    {
      name: 'ml_model',
      enabled: true,
      weight: 0.1,
      confidenceThreshold: 0.7,
      parameters: { featureNormalization: true }
    }
  ],
  ensemble: {
    votingMethod: 'confidence_weighted',
    minimumAgreement: 0.6,
    conflictResolution: 'highest_confidence'
  },
  learning: {
    enableOnlineLearning: true,
    learningRate: 0.01,
    feedbackIntegration: true,
    modelRetrainingThreshold: 50
  }
};
```

### Enhanced Signal Detector Configuration

```typescript
const detectorConfig: EnhancedSignalDetectorConfig = {
  enableCache: true,
  cacheSize: 10000,
  cacheTTL: 60000, // 1 minute
  enableBatchProcessing: true,
  batchSize: 50,
  debounceTime: 100,
  enableAgentAttribution: true,
  attributionConfidenceThreshold: 0.6,
  maxAttributionTime: 5000, // 5 seconds
  agentSignatureLearning: true,
  enableAdvancedPatternMatching: true,
  contextAwareMatching: true,
  temporalPatternAnalysis: true,
  contentAnalysisDepth: 'advanced',
  enableParallelProcessing: true,
  maxConcurrentDetections: 4,
  priorityQueueEnabled: true,
  performanceMonitoring: true
};
```

## Verification and Testing

### System Verification

```typescript
import { SignalAttributionIntegration } from './agents/signal-attribution-integration';

const integration = new SignalAttributionIntegration(
  activityTracker,
  signalRegistry,
  bridgeConfig,
  engineConfig,
  detectorConfig
);

// Run comprehensive system verification
const verification = await integration.runSystemVerification();

console.log(`Overall health: ${verification.health.overallHealth}`);
console.log(`Tests passed: ${verification.results.filter(r => r.passed).length}/${verification.results.length}`);

// Run specific test case
const testResult = await integration.runTestCase('basic-attribution');
console.log(`Test result: ${testResult.passed ? 'PASSED' : 'FAILED'}`);
```

### Health Monitoring

```typescript
// Get system health
const health = await integration.getSystemHealth();

console.log('Component health:');
Object.entries(health.components).forEach(([component, status]) => {
  console.log(`  ${component}: ${status}`);
});

console.log('System metrics:');
console.log(`  Attribution accuracy: ${health.metrics.attributionAccuracy}`);
console.log(`  Average processing time: ${health.metrics.averageProcessingTime}ms`);
console.log(`  Error rate: ${health.metrics.errorRate}`);
```

## Performance Metrics

The system provides comprehensive performance monitoring:

- **Attribution Success Rate**: Percentage of signals successfully attributed to agents
- **Confidence Distribution**: Distribution of attribution confidence levels
- **Processing Time**: Average time for signal detection and attribution
- **Cache Performance**: Hit rates for signal and attribution caches
- **Pattern Learning**: Effectiveness of learned agent-signal patterns
- **Error Rate**: System error rates and failure points

## Best Practices

### 1. Signal Detection

- Use contextual information (file paths, PRP context) to improve attribution accuracy
- Enable caching for frequently processed content
- Configure appropriate correlation time windows based on your workflow

### 2. Agent Attribution

- Start with basic strategies (temporal, contextual) before enabling ML attribution
- Regularly provide feedback on attribution accuracy to improve learning
- Monitor confidence levels and adjust thresholds as needed

### 3. Performance Optimization

- Enable batch processing for high-volume scenarios
- Use parallel processing when available
- Monitor cache hit rates and adjust cache sizes accordingly

### 4. Pattern Learning

- Enable learning only after sufficient data has been collected
- Regularly review learned patterns for accuracy
- Configure appropriate decay factors for pattern forgetting

## Troubleshooting

### Common Issues

1. **Low Attribution Accuracy**
   - Check correlation time window settings
   - Verify agent activity tracking is working
   - Review learned signal patterns

2. **High Processing Time**
   - Enable caching and reduce correlation window
   - Optimize batch processing settings
   - Consider disabling advanced strategies

3. **Memory Usage**
   - Reduce cache sizes
   - Enable automatic cleanup
   - Monitor retention periods

### Debug Logging

Enable debug logging to troubleshoot issues:

```typescript
import { createLayerLogger } from '../shared';

const logger = createLayerLogger('signal-attribution');
logger.setLevel('debug');
```

## Integration with Existing Systems

### Scanner Integration

```typescript
// In scanner signal detection
const attributionResult = await attributionEngine.attributeSignal(detectedSignal, {
  timestamp: detectionTime,
  content: signalContent,
  filePath: changedFile,
  prpContext: prpName,
  relatedFiles: relatedChanges
});

// Use attribution for enhanced signal processing
if (attributionResult.attributedAgent) {
  // Route signal to specific agent
  await sendSignalToAgent(attributionResult.attributedAgent.agentId, signal);
}
```

### Agent Integration

```typescript
// In agent activity monitoring
await activityTracker.trackActivity({
  agentId: agent.id,
  activityType: AgentActivityType.SIGNAL_GENERATED,
  description: 'Generated progress signal',
  relatedSignals: [signalId],
  signalConfidence: AttributionConfidence.HIGH,
  metadata: { signalCode: '[dp]', context: currentTask }
});
```

## Future Enhancements

1. **Advanced ML Models** - Integration with more sophisticated attribution models
2. **Real-time Learning** - Continuous model updates based on feedback
3. **Cross-System Integration** - Integration with external development tools
4. **Visual Analytics** - Dashboard for attribution analytics and monitoring
5. **API Interface** - REST API for external system integration

## Contributing

When contributing to the signal attribution system:

1. Follow the existing code patterns and TypeScript conventions
2. Add comprehensive tests for new attribution strategies
3. Update documentation for new features
4. Ensure backward compatibility when possible
5. Test performance impact of changes

## License

This system is part of the @dcversus/prp project and follows the same license terms.