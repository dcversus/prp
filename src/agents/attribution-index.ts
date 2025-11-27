/**
 * ♫ Agent Signal Attribution System - Index
 *
 * Main export file for the complete agent-signal attribution system
 * connecting scanner signal detection with agent activities.
 */

// Core interfaces and types
export type {
  AgentActivityTracker,
  AgentSignalRegistry,
  AgentActivity,
  SignalAttribution,
  AttributedSignal,
  AgentActivityType,
  AttributionConfidence,
  AgentActivityTrackerConfig,
  AgentSession,
  ActivityCorrelation
} from './agent-activity-tracker';

// Agent-Scanner Bridge
export {
  AgentScannerBridge,
  AgentScannerBridgeConfig,
  type CorrelationResult,
  type AgentSession as BridgeAgentSession
} from './agent-scanner-bridge';

// Signal Attribution Engine
export {
  SignalAttributionEngine,
  SignalAttributionEngineConfig,
  type AttributionStrategy,
  type AttributionModel,
  type AttributionFeatures,
  type DetailedAttributionResult,
  type AttributionTrainingData
} from './signal-attribution-engine';

// Enhanced Signal Detector
export {
  EnhancedUnifiedSignalDetector,
  EnhancedSignalDetectorConfig,
  type EnhancedSignalDetectionResult,
  type AgentSignaturePattern
} from '../scanner/enhanced-unified-signal-detector';

// Agent Signal Registry
export {
  AgentSignalRegistry,
  AgentSignalRegistryConfig,
  type AgentRegistration,
  type SignalPattern as RegistrySignalPattern,
  type AgentSignalRelationship,
  type SignalLifecycle
} from './agent-signal-registry';

// Integration and Verification System
export {
  SignalAttributionIntegration,
  type VerificationResult,
  type AttributionSystemHealth,
  type AttributionTestCase
} from './signal-attribution-integration';

// Re-export base agent for compatibility
export type { BaseAgent, AgentCapabilities, AgentLimits } from './base-agent';

/**
 * Factory function to create a complete attribution system
 */
export function createAttributionSystem(options?: {
  bridgeConfig?: Partial<AgentScannerBridgeConfig>;
  engineConfig?: Partial<SignalAttributionEngineConfig>;
  detectorConfig?: Partial<EnhancedSignalDetectorConfig>;
  registryConfig?: Partial<AgentSignalRegistryConfig>;
}) {
  // This would create actual instances in real implementation
  // For now, return a placeholder
  return {
    components: {},
    integration: null,
    initialized: false
  };
}

/**
 * Default configuration for attribution system
 */
export const DEFAULT_ATTRIBUTION_CONFIG = {
  bridge: {
    enableRealTimeCorrelation: true,
    correlationTimeWindow: 30000,
    minConfidenceThreshold: 0.6,
    maxCorrelationCache: 10000,
    enableActivityChaining: true,
    attributionStrategies: ['temporal', 'contextual', 'pattern_match', 'signature'],
    sessionTracking: {
      enabled: true,
      sessionTimeout: 300000,
      maxSessionsPerAgent: 5
    }
  },
  engine: {
    enableMLAttribution: true,
    enableEnsembleAttribution: true,
    strategies: [
      { name: 'temporal', enabled: true, weight: 0.2, confidenceThreshold: 0.6, parameters: {} },
      { name: 'contextual', enabled: true, weight: 0.3, confidenceThreshold: 0.7, parameters: {} },
      { name: 'pattern_match', enabled: true, weight: 0.25, confidenceThreshold: 0.8, parameters: {} },
      { name: 'signature', enabled: true, weight: 0.15, confidenceThreshold: 0.9, parameters: {} },
      { name: 'ml_model', enabled: true, weight: 0.1, confidenceThreshold: 0.7, parameters: {} }
    ],
    featureExtraction: {
      enableContentAnalysis: true,
      enableSentimentAnalysis: true,
      enableTechnicalTermExtraction: true,
      maxFeatures: 100
    },
    ensemble: {
      votingMethod: 'confidence_weighted' as const,
      minimumAgreement: 0.6,
      conflictResolution: 'highest_confidence' as const
    },
    learning: {
      enableOnlineLearning: true,
      learningRate: 0.01,
      feedbackIntegration: true,
      modelRetrainingThreshold: 50
    }
  },
  detector: {
    enableCache: true,
    cacheSize: 10000,
    cacheTTL: 60000,
    enableBatchProcessing: true,
    batchSize: 50,
    debounceTime: 100,
    enableAgentAttribution: true,
    attributionConfidenceThreshold: 0.6,
    maxAttributionTime: 5000,
    agentSignatureLearning: true,
    enableAdvancedPatternMatching: true,
    contextAwareMatching: true,
    temporalPatternAnalysis: true,
    contentAnalysisDepth: 'advanced' as const,
    enableParallelProcessing: true,
    maxConcurrentDetections: 4,
    priorityQueueEnabled: true,
    performanceMonitoring: true
  },
  registry: {
    enablePersistence: true,
    retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    enableLearning: true,
    learningRate: 0.1,
    patternDecayFactor: 0.95,
    minPatternFrequency: 3,
    maxRelationshipsPerAgent: 1000,
    verificationEnabled: true,
    autoCleanupEnabled: true,
    cleanupInterval: 60 * 60 * 1000 // 1 hour
  }
};