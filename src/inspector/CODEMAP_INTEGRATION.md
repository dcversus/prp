# Codemap Integration for Inspector

This document describes how the codemap system has been integrated into the inspector workflow to provide enhanced signal analysis with code structure context.

## Overview

The codemap integration allows the inspector to analyze signals with deep understanding of codebase structure, including:

- File relationships and dependencies
- Function and class structures
- Signal detection within code elements
- Issue identification and quality metrics
- Relevant file analysis for signal context

## Integration Points

### 1. InspectorCore Integration

The `InspectorCore` class has been enhanced with codemap support:

```typescript
import { InspectorCore } from './inspector-core';
import { CodemapData } from '../scanner/types';

// Create inspector with codemap enabled
const inspector = new InspectorCore({
  // ... other config
  codemapEnabled: true,
  maxWorkers: 4,
  workerTimeout: 30000,
});

// Update codemap data
await inspector.updateCodemap(codemapData);

// Query codemap for specific analysis
const result = await inspector.queryCodemap({
  files: ['src/**/*.ts'],
  includeSignals: true,
  includeIssues: true,
  maxResults: 50,
});

// Get codemap status
const status = inspector.getCodemapStatus();
```

### 2. Enhanced Inspector Integration

The `EnhancedInspector` class provides advanced codemap analysis:

```typescript
import { EnhancedInspector } from './enhanced-inspector';

const enhancedInspector = new EnhancedInspector({
  // ... other config
  codemap: {
    enabled: true,
    maxFilesForAnalysis: 100,
    tokenOptimized: true,
    includeSignals: true,
    includeIssues: true,
    complexityThreshold: 10,
  },
  features: {
    // ... other features
    enableCodemapAnalysis: true,
  },
});

// Start inspector (codemap will be initialized if enabled)
await enhancedInspector.start();

// Update codemap data
await enhancedInspector.updateCodemap(codemapData);

// Analyze signal with codemap context
const response = await enhancedInspector.analyzeSignal(signal);
```

## Key Features

### 1. Automatic Context Enrichment

When processing signals, the inspector automatically includes:

- **Relevant Files**: Files mentioned in or related to the signal
- **Code Structure**: Functions, classes, and their relationships
- **Signal Context**: Pre-detected signals in relevant code elements
- **Issue Analysis**: Quality issues in relevant files

### 2. LLM Prompt Enhancement

Codemap data is automatically included in LLM prompts:

```typescript
// Enhanced scanner data includes codemap information
const scannerJson = {
  signal: { /* signal data */ },
  context: { /* context data */ },
  codemap: {
    available: true,
    summaryId: 'codemap-123',
    fileCount: 150,
    functionCount: 1200,
    classCount: 85,
    signalCount: 45,
    issueCount: 12,
    relevantFiles: [
      {
        path: 'src/inspector/enhanced-inspector.ts',
        relevance: 0.95,
        signals: ['[dp]', '[tp]'],
        issueCount: 2,
        highSeverityIssues: 0,
      }
    ],
    tokenOptimized: true,
  },
};
```

### 3. Signal Processing Enhancement

The inspector automatically:

1. **Extracts file paths** from signal data
2. **Finds relevant files** based on path matching and directory proximity
3. **Identifies code elements** mentioned in signals
4. **Calculates relevance scores** for each file
5. **Includes quality metrics** and signal information

### 4. Performance Optimization

- **Token Optimization**: Codemap data is compressed for LLM efficiency
- **Caching**: Frequently accessed codemap data is cached
- **Selective Analysis**: Only relevant files are included in signal analysis
- **Configurable Limits**: Maximum files and complexity thresholds prevent token blowouts

## Configuration Options

### InspectorCore Config

```typescript
interface ExtendedInspectorConfig extends InspectorConfig {
  codemapEnabled?: boolean; // Enable/disable codemap integration
  maxWorkers: number;
  workerTimeout: number;
}
```

### Enhanced Inspector Config

```typescript
interface EnhancedInspectorConfig {
  // ... other config
  codemap: {
    enabled: boolean;              // Enable codemap analysis
    maxFilesForAnalysis: number;   // Maximum files to analyze
    tokenOptimized: boolean;       // Use token-efficient representation
    includeSignals: boolean;       // Include signal detection
    includeIssues: boolean;        // Include quality issues
    complexityThreshold?: number;  // Minimum complexity for inclusion
  };
}
```

## Query Options

```typescript
interface InspectorQueryOptions {
  files?: string[];                    // File path patterns
  functions?: string[];                // Function name patterns
  classes?: string[];                  // Class name patterns
  patterns?: string[];                 // General search patterns
  complexityThreshold?: number;        // Minimum complexity
  issueSeverity?: 'low' | 'medium' | 'high' | 'critical';
  languages?: string[];                // Language filters
  includeSignals?: boolean;            // Include signal detection
  includeIssues?: boolean;             // Include quality issues
  maxResults?: number;                 // Result limit
  tokenOptimized?: boolean;            // Use compact representation
}
```

## Usage Examples

### Basic Signal Analysis

```typescript
// 1. Create inspector with codemap support
const inspector = new EnhancedInspector({
  inspector: { model: 'gpt-4', temperature: 0.1 },
  llm: { provider: 'openai', tokenLimits: { input: 8000, output: 2000 } },
  context: { maxContextSize: 5000, compressionThreshold: 0.8 },
  parallel: { maxWorkers: 2, timeoutMs: 30000 },
  codemap: {
    enabled: true,
    maxFilesForAnalysis: 50,
    tokenOptimized: true,
    includeSignals: true,
    includeIssues: true,
  },
  features: {
    enableCodemapAnalysis: true,
    enableParallelProcessing: true,
    enableSemanticSummarization: true,
    enableIntelligentCompression: true,
    enableHistoricalAnalysis: false,
    enablePredictiveProcessing: false,
  },
});

// 2. Start the inspector
await inspector.start();

// 3. Update codemap data (this would come from the scanner)
await inspector.updateCodemap(codemapData);

// 4. Analyze signal with enhanced context
const signal: Signal = {
  id: 'signal-123',
  type: 'file_change',
  source: 'scanner',
  timestamp: new Date(),
  data: {
    filePath: 'src/components/UserComponent.tsx',
    changeType: 'modified',
    signals: ['[dp] Development progress on user component'],
  },
  priority: 5,
  resolved: false,
  relatedSignals: [],
  metadata: {},
};

const response = await inspector.analyzeSignal(signal);

// 5. Response includes codemap-enhanced analysis
console.log('Analysis with codemap context:', response);
console.log('Relevant files found:', response.result.context.content.relevantFiles);
```

### Advanced Codemap Queries

```typescript
// Query for high-complexity files with signals
const complexFiles = await inspector.queryCodemap({
  complexityThreshold: 15,
  includeSignals: true,
  includeIssues: true,
  maxResults: 20,
});

// Query for specific patterns
const patternMatches = await inspector.queryCodemap({
  patterns: ['UserService', 'Database', 'Auth'],
  includeSignals: true,
  tokenOptimized: true,
});

// Query for critical issues
const criticalIssues = await inspector.queryCodemap({
  issueSeverity: 'critical',
  includeIssues: true,
  maxResults: 10,
});
```

## Event Emission

The enhanced inspector emits codemap-related events:

```typescript
inspector.on('codemap:updated', (data) => {
  console.log('Codemap updated:', data.summaryId, data.metrics);
});

inspector.on('codemap:cleared', () => {
  console.log('Codemap data cleared');
});
```

## Status Monitoring

Monitor codemap integration status:

```typescript
const status = inspector.getStatus();

console.log('Codemap Status:', status.codemapStatus);
// Output:
// {
//   available: true,
//   summaryId: 'codemap-123',
//   fileCount: 150,
//   functionCount: 1200,
//   classCount: 85,
//   signalCount: 45,
//   issueCount: 12,
//   lastUpdated: new Date(),
//   config: {
//     enabled: true,
//     tokenOptimized: true,
//     maxFilesForAnalysis: 50,
//     includeSignals: true,
//     includeIssues: true,
//   },
// }
```

## Performance Considerations

1. **Token Usage**: Codemap data increases token usage for LLM calls
2. **Caching**: Codemap results are cached to reduce processing overhead
3. **Limits**: Configure `maxFilesForAnalysis` to manage token costs
4. **Optimization**: Enable `tokenOptimized` for compact representations

## Error Handling

The codemap integration includes comprehensive error handling:

- Graceful degradation when codemap is unavailable
- Automatic fallback to basic signal analysis
- Detailed error logging and reporting
- Cache cleanup on errors

## Migration Guide

### From Basic Inspector

To migrate existing inspector usage to include codemap support:

1. **Update Configuration**: Add codemap configuration to inspector config
2. **Enable Feature**: Set `enableCodemapAnalysis: true` in features
3. **Update Codemap**: Call `updateCodemap()` when codemap data is available
4. **Handle Events**: Listen for `codemap:updated` events for coordination

### Example Migration

```typescript
// Before
const inspector = new EnhancedInspector(config);
await inspector.start();
const response = await inspector.analyzeSignal(signal);

// After
const inspector = new EnhancedInspector({
  ...config,
  codemap: {
    enabled: true,
    maxFilesForAnalysis: 50,
    tokenOptimized: true,
    includeSignals: true,
    includeIssues: true,
  },
  features: {
    ...config.features,
    enableCodemapAnalysis: true,
  },
});

await inspector.start();
await inspector.updateCodemap(codemapData); // Add this line
const response = await inspector.analyzeSignal(signal); // Now enhanced with codemap
```

## Conclusion

The codemap integration provides powerful code structure awareness to the inspector, enabling more accurate signal classification, better context understanding, and enhanced agent coordination. The integration is designed to be:

- **Seamless**: Works with existing inspector workflows
- **Configurable**: Extensive configuration options
- **Performant**: Optimized for token usage and processing speed
- **Robust**: Comprehensive error handling and fallback mechanisms