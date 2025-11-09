/**
 * ♫ Signal Detector for @dcversus/prp Scanner
 *
 * Advanced signal detection and classification system with pattern matching
 * and custom signal support.
 */

import { Signal } from '../shared/types';
import { SignalDetector, SignalPattern } from './types';
import { createLayerLogger, HashUtils } from '../shared';

const logger = createLayerLogger('scanner');

/**
 * ♫ Signal Detector Implementation
 */
export class SignalDetectorImpl implements SignalDetector {
  patterns: SignalPattern[];
  customPatterns: SignalPattern[];
  enabledCategories: Set<string>;
  cache: Map<string, Signal[]>;
  maxCacheSize: number;

  constructor() {
    this.patterns = this.getDefaultPatterns();
    this.customPatterns = [];
    this.enabledCategories = new Set([
      'system', 'development', 'analysis', 'incident', 'coordination',
      'testing', 'release', 'post-release', 'design', 'devops'
    ]);
    this.cache = new Map();
    this.maxCacheSize = 10000;
  }

  /**
   * Get default signal patterns - All 75+ signals from AGENTS.md
   */
  private getDefaultPatterns(): SignalPattern[] {
    return [
      // === CRITICAL PRIORITY SIGNALS (9-10) ===

      // System Fatal Error
      {
        id: 'FF',
        name: 'System Fatal Error',
        pattern: /\[FF\]/gi,
        category: 'system',
        priority: 10,
        description: 'Critical system corruption/unrecoverable errors',
        enabled: true,
        custom: false
      },

      // Blocker - Technical dependency blocking progress
      {
        id: 'bb',
        name: 'Blocker',
        pattern: /\[bb\]/gi,
        category: 'development',
        priority: 9,
        description: 'Technical dependency, configuration, or external requirement blocks progress',
        enabled: true,
        custom: false
      },

      // Goal Not Achievable
      {
        id: 'ff',
        name: 'Goal Not Achievable',
        pattern: /\[ff\]/gi,
        category: 'analysis',
        priority: 9,
        description: 'Analysis shows PRP goals cannot be achieved with current constraints/technology',
        enabled: true,
        custom: false
      },

      // Jesus Christ - Critical incident resolved
      {
        id: 'JC',
        name: 'Jesus Christ (Incident Resolved)',
        pattern: /\[JC\]/gi,
        category: 'incident',
        priority: 9,
        description: 'Critical production incident successfully resolved and service restored',
        enabled: true,
        custom: false
      },

      // === HIGH PRIORITY SIGNALS (7-8) ===

      // Feedback Request
      {
        id: 'af',
        name: 'Feedback Request',
        pattern: /\[af\]/gi,
        category: 'coordination',
        priority: 8,
        description: 'Decision needed on design approach, implementation strategy, or requirement interpretation',
        enabled: true,
        custom: false
      },

      // Not Obvious - Implementation complexity discovered
      {
        id: 'no',
        name: 'Not Obvious',
        pattern: /\[no\]/gi,
        category: 'development',
        priority: 8,
        description: 'Implementation complexity, technical uncertainty, or unknown dependencies discovered',
        enabled: true,
        custom: false
      },

      // Incident - Production issue detected
      {
        id: 'ic',
        name: 'Incident',
        pattern: /\[ic\]/gi,
        category: 'incident',
        priority: 8,
        description: 'Production issue, error, or unexpected behavior detected',
        enabled: true,
        custom: false
      },

      // Escalation Required
      {
        id: 'er',
        name: 'Escalation Required',
        pattern: /\[er\]/gi,
        category: 'coordination',
        priority: 8,
        description: 'Issues require escalation to senior teams or external vendors',
        enabled: true,
        custom: false
      },

      // Orchestrator Attention
      {
        id: 'oa',
        name: 'Orchestrator Attention',
        pattern: /\[oa\]/gi,
        category: 'coordination',
        priority: 8,
        description: 'Need coordination of parallel work, resource allocation, or workflow orchestration',
        enabled: true,
        custom: false
      },

      // === MEDIUM-HIGH PRIORITY SIGNALS (5-6) ===

      // Tests Red - Test failures
      {
        id: 'tr',
        name: 'Tests Red',
        pattern: /\[tr\]/gi,
        category: 'testing',
        priority: 6,
        description: 'Test suite fails with failing tests identified',
        enabled: true,
        custom: false
      },

      // CI Failed - Build failures
      {
        id: 'cf',
        name: 'CI Failed',
        pattern: /\[cf\]/gi,
        category: 'testing',
        priority: 6,
        description: 'Continuous integration pipeline fails with errors',
        enabled: true,
        custom: false
      },

      // Research Request
      {
        id: 'rr',
        name: 'Research Request',
        pattern: /\[rr\]/gi,
        category: 'analysis',
        priority: 6,
        description: 'Unknown dependencies, technology gaps, or market research needed to proceed',
        enabled: true,
        custom: false
      },

      // Admin Attention
      {
        id: 'aa',
        name: 'Admin Attention',
        pattern: /\[aa\]/gi,
        category: 'coordination',
        priority: 6,
        description: 'Report generation required, system status needed, or administrative oversight requested',
        enabled: true,
        custom: false
      },

      // File Ownership Conflict
      {
        id: 'fo',
        name: 'File Ownership Conflict',
        pattern: /\[fo\]/gi,
        category: 'coordination',
        priority: 6,
        description: 'File ownership or modification conflicts arise between agents',
        enabled: true,
        custom: false
      },

      // Design Issue Identified
      {
        id: 'di',
        name: 'Design Issue Identified',
        pattern: /\[di\]/gi,
        category: 'design',
        priority: 6,
        description: 'UX problems, accessibility issues, or design inconsistencies are found',
        enabled: true,
        custom: false
      },

      // === MEDIUM PRIORITY SIGNALS (3-4) ===

      // Goal Clarification
      {
        id: 'gg',
        name: 'Goal Clarification',
        pattern: /\[gg\]/gi,
        category: 'analysis',
        priority: 4,
        description: 'PRP requirements are ambiguous, conflicting, or insufficient for implementation',
        enabled: true,
        custom: false
      },

      // Validation Required
      {
        id: 'vr',
        name: 'Validation Required',
        pattern: /\[vr\]/gi,
        category: 'analysis',
        priority: 4,
        description: 'PRP needs external validation, stakeholder approval, or compliance review',
        enabled: true,
        custom: false
      },

      // Verification Plan
      {
        id: 'vp',
        name: 'Verification Plan',
        pattern: /\[vp\]/gi,
        category: 'analysis',
        priority: 4,
        description: 'Complex requirements need verification approach or multi-stage validation strategy',
        enabled: true,
        custom: false
      },

      // Implementation Plan
      {
        id: 'ip',
        name: 'Implementation Plan',
        pattern: /\[ip\]/gi,
        category: 'analysis',
        priority: 4,
        description: 'Requirements analysis complete, ready to break down into implementable tasks',
        enabled: true,
        custom: false
      },

      // Experiment Required
      {
        id: 'er',
        name: 'Experiment Required',
        pattern: /\[er\]/gi,
        category: 'analysis',
        priority: 4,
        description: 'Technical uncertainty requires proof-of-concept or experimental validation',
        enabled: true,
        custom: false
      },

      // Tests Prepared
      {
        id: 'tp',
        name: 'Tests Prepared',
        pattern: /\[tp\]/gi,
        category: 'development',
        priority: 4,
        description: 'TDD test cases written before implementation, ready for coding phase',
        enabled: true,
        custom: false
      },

      // Bug Fixed
      {
        id: 'bf',
        name: 'Bug Fixed',
        pattern: /\[bf\]/gi,
        category: 'development',
        priority: 4,
        description: 'Bug or issue has been identified, resolved, and tested',
        enabled: true,
        custom: false
      },

      // Code Quality
      {
        id: 'cq',
        name: 'Code Quality',
        pattern: /\[cq\]/gi,
        category: 'testing',
        priority: 4,
        description: 'Code passes linting, formatting, and quality gate checks',
        enabled: true,
        custom: false
      },

      // Review Progress
      {
        id: 'rg',
        name: 'Review Progress',
        pattern: /\[rg\]/gi,
        category: 'release',
        priority: 4,
        description: 'Code review in progress with feedback being addressed',
        enabled: true,
        custom: false
      },

      // Cleanup Done
      {
        id: 'cd',
        name: 'Cleanup Done',
        pattern: /\[cd\]/gi,
        category: 'development',
        priority: 4,
        description: 'Code cleanup, temporary file removal, and final polishing completed',
        enabled: true,
        custom: false
      },

      // Post-release Status
      {
        id: 'ps',
        name: 'Post-release Status',
        pattern: /\[ps\]/gi,
        category: 'post-release',
        priority: 4,
        description: 'Post-release monitoring and status check completed',
        enabled: true,
        custom: false
      },

      // Admin Preview Ready
      {
        id: 'ap',
        name: 'Admin Preview Ready',
        pattern: /\[ap\]/gi,
        category: 'coordination',
        priority: 4,
        description: 'Comprehensive report, analysis, or review ready for admin preview',
        enabled: true,
        custom: false
      },

      // Design Review Requested
      {
        id: 'dr',
        name: 'Design Review Requested',
        pattern: /\[dr\]/gi,
        category: 'design',
        priority: 4,
        description: 'Design proposals need feedback or approval',
        enabled: true,
        custom: false
      },

      // Performance Testing Design
      {
        id: 'pt',
        name: 'Performance Testing Design',
        pattern: /\[pt\]/gi,
        category: 'coordination',
        priority: 4,
        description: 'Design changes requiring performance validation',
        enabled: true,
        custom: false
      },

      // === MEDIUM-LOW PRIORITY SIGNALS (2-3) ===

      // Done Assessment
      {
        id: 'da',
        name: 'Done Assessment',
        pattern: /\[da\]/gi,
        category: 'development',
        priority: 3,
        description: 'Task or milestone completed, ready for Definition of Done validation',
        enabled: true,
        custom: false
      },

      // Ready for Preparation
      {
        id: 'rp',
        name: 'Ready for Preparation',
        pattern: /\[rp\]/gi,
        category: 'analysis',
        priority: 3,
        description: 'PRP analysis complete, requirements clear, ready to move to planning phase',
        enabled: true,
        custom: false
      },

      // Development Progress
      {
        id: 'dp',
        name: 'Development Progress',
        pattern: /\[dp\]/gi,
        category: 'development',
        priority: 3,
        description: 'Significant implementation milestone completed or increment ready',
        enabled: true,
        custom: false
      },

      // Blocker Resolved
      {
        id: 'br',
        name: 'Blocker Resolved',
        pattern: /\[br\]/gi,
        category: 'development',
        priority: 3,
        description: 'Previously documented blocker has been successfully resolved',
        enabled: true,
        custom: false
      },

      // Research Complete
      {
        id: 'rc',
        name: 'Research Complete',
        pattern: /\[rc\]/gi,
        category: 'analysis',
        priority: 3,
        description: 'Commissioned research investigation completed with findings',
        enabled: true,
        custom: false
      },

      // Tests Written
      {
        id: 'tw',
        name: 'Tests Written',
        pattern: /\[tw\]/gi,
        category: 'development',
        priority: 3,
        description: 'Unit tests, integration tests, or E2E tests implemented for feature',
        enabled: true,
        custom: false
      },

      // CI Passed
      {
        id: 'cp',
        name: 'CI Passed',
        pattern: /\[cp\]/gi,
        category: 'testing',
        priority: 3,
        description: 'Continuous integration pipeline completes successfully',
        enabled: true,
        custom: false
      },

      // Tests Green
      {
        id: 'tg',
        name: 'Tests Green',
        pattern: /\[tg\]/gi,
        category: 'testing',
        priority: 3,
        description: 'All tests passing with full coverage achieved',
        enabled: true,
        custom: false
      },

      // Pre-release Complete
      {
        id: 'pc',
        name: 'Pre-release Complete',
        pattern: /\[pc\]/gi,
        category: 'release',
        priority: 3,
        description: 'All pre-release checks completed including documentation and verification',
        enabled: true,
        custom: false
      },

      // Review Passed
      {
        id: 'rv',
        name: 'Review Passed',
        pattern: /\[rv\]/gi,
        category: 'release',
        priority: 3,
        description: 'Code review completed successfully with all feedback addressed',
        enabled: true,
        custom: false
      },

      // Implementation Verified
      {
        id: 'iv',
        name: 'Implementation Verified',
        pattern: /\[iv\]/gi,
        category: 'release',
        priority: 3,
        description: 'Manual visual testing completed against published package or deployment',
        enabled: true,
        custom: false
      },

      // Release Approved
      {
        id: 'ra',
        name: 'Release Approved',
        pattern: /\[ra\]/gi,
        category: 'release',
        priority: 3,
        description: 'All prerequisites met, stakeholder approval received, ready for release',
        enabled: true,
        custom: false
      },

      // Merged
      {
        id: 'mg',
        name: 'Merged',
        pattern: /\[mg\]/gi,
        category: 'release',
        priority: 3,
        description: 'Code successfully merged to target branch with integration complete',
        enabled: true,
        custom: false
      },

      // Released
      {
        id: 'rl',
        name: 'Released',
        pattern: /\[rl\]/gi,
        category: 'release',
        priority: 3,
        description: 'Deployment completed successfully with release published',
        enabled: true,
        custom: false
      },

      // Post-mortem
      {
        id: 'pm',
        name: 'Post-mortem',
        pattern: /\[pm\]/gi,
        category: 'post-release',
        priority: 3,
        description: 'Incident analysis complete with lessons learned documented',
        enabled: true,
        custom: false
      },

      // Cleanup Complete
      {
        id: 'cc',
        name: 'Cleanup Complete',
        pattern: /\[cc\]/gi,
        category: 'development',
        priority: 3,
        description: 'All cleanup tasks completed before final commit',
        enabled: true,
        custom: false
      },

      // Design Update
      {
        id: 'du',
        name: 'Design Update',
        pattern: /\[du\]/gi,
        category: 'design',
        priority: 3,
        description: 'Design changes, new components, or visual updates are created',
        enabled: true,
        custom: false
      },

      // Design System Updated
      {
        id: 'ds',
        name: 'Design System Updated',
        pattern: /\[ds\]/gi,
        category: 'design',
        priority: 3,
        description: 'Design system components, tokens, or guidelines are modified',
        enabled: true,
        custom: false
      },

      // Design Handoff Ready
      {
        id: 'dh',
        name: 'Design Handoff Ready',
        pattern: /\[dh\]/gi,
        category: 'design',
        priority: 3,
        description: 'Design assets and specifications are ready for development',
        enabled: true,
        custom: false
      },

      // Design Assets Delivered
      {
        id: 'da',
        name: 'Design Assets Delivered',
        pattern: /\[da\]/gi,
        category: 'design',
        priority: 3,
        description: 'Final design assets are exported and available',
        enabled: true,
        custom: false
      },

      // Design Change Implemented
      {
        id: 'dc',
        name: 'Design Change Implemented',
        pattern: /\[dc\]/gi,
        category: 'design',
        priority: 3,
        description: 'Design modifications are reflected in the live application',
        enabled: true,
        custom: false
      },

      // Design Feedback Received
      {
        id: 'df',
        name: 'Design Feedback Received',
        pattern: /\[df\]/gi,
        category: 'design',
        priority: 3,
        description: 'User feedback, stakeholder input, or testing results are available',
        enabled: true,
        custom: false
      },

      // Design Testing Complete
      {
        id: 'dt',
        name: 'Design Testing Complete',
        pattern: /\[dt\]/gi,
        category: 'design',
        priority: 3,
        description: 'User testing, A/B tests, or usability studies are finished',
        enabled: true,
        custom: false
      },

      // Design Prototype Ready
      {
        id: 'dp',
        name: 'Design Prototype Ready',
        pattern: /\[dp\]/gi,
        category: 'design',
        priority: 3,
        description: 'Interactive prototypes or mockups are available for review',
        enabled: true,
        custom: false
      },

      // Infrastructure Deployed
      {
        id: 'id',
        name: 'Infrastructure Deployed',
        pattern: /\[id\]/gi,
        category: 'devops',
        priority: 3,
        description: 'Infrastructure changes are deployed and verified',
        enabled: true,
        custom: false
      },

      // CI/CD Pipeline Updated
      {
        id: 'cd',
        name: 'CI/CD Pipeline Updated',
        pattern: /\[cd\]/gi,
        category: 'devops',
        priority: 3,
        description: 'Build, test, or deployment pipelines are modified',
        enabled: true,
        custom: false
      },

      // Monitoring Online
      {
        id: 'mo',
        name: 'Monitoring Online',
        pattern: /\[mo\]/gi,
        category: 'devops',
        priority: 3,
        description: 'Monitoring systems are configured and operational',
        enabled: true,
        custom: false
      },

      // Incident Resolved
      {
        id: 'ir',
        name: 'Incident Resolved',
        pattern: /\[ir\]/gi,
        category: 'devops',
        priority: 3,
        description: 'Production incidents are fixed and services restored',
        enabled: true,
        custom: false
      },

      // System Optimized
      {
        id: 'so',
        name: 'System Optimized',
        pattern: /\[so\]/gi,
        category: 'devops',
        priority: 3,
        description: 'Performance improvements or cost optimizations are implemented',
        enabled: true,
        custom: false
      },

      // Security Check Complete
      {
        id: 'sc',
        name: 'Security Check Complete',
        pattern: /\[sc\]/gi,
        category: 'devops',
        priority: 3,
        description: 'Security scans, vulnerability assessments, or compliance checks are done',
        enabled: true,
        custom: false
      },

      // Performance Baseline Set
      {
        id: 'pb',
        name: 'Performance Baseline Set',
        pattern: /\[pb\]/gi,
        category: 'devops',
        priority: 3,
        description: 'Performance benchmarks and baselines are established',
        enabled: true,
        custom: false
      },

      // Disaster Recovery Tested
      {
        id: 'dr',
        name: 'Disaster Recovery Tested',
        pattern: /\[dr\]/gi,
        category: 'devops',
        priority: 3,
        description: 'Disaster recovery procedures are validated through testing',
        enabled: true,
        custom: false
      },

      // Capacity Updated
      {
        id: 'cu',
        name: 'Capacity Updated',
        pattern: /\[cu\]/gi,
        category: 'devops',
        priority: 3,
        description: 'System capacity is scaled or resource allocation is modified',
        enabled: true,
        custom: false
      },

      // Automation Configured
      {
        id: 'ac',
        name: 'Automation Configured',
        pattern: /\[ac\]/gi,
        category: 'devops',
        priority: 3,
        description: 'New automation workflows or scripts are implemented',
        enabled: true,
        custom: false
      },

      // SLO/SLI Updated
      {
        id: 'sl',
        name: 'SLO/SLI Updated',
        pattern: /\[sl\]/gi,
        category: 'devops',
        priority: 3,
        description: 'Service Level Objectives or Indicators are modified',
        enabled: true,
        custom: false
      },

      // Error Budget Status
      {
        id: 'eb',
        name: 'Error Budget Status',
        pattern: /\[eb\]/gi,
        category: 'devops',
        priority: 3,
        description: 'Error budget consumption is tracked or thresholds are reached',
        enabled: true,
        custom: false
      },

      // Incident Prevention
      {
        id: 'ip',
        name: 'Incident Prevention',
        pattern: /\[ip\]/gi,
        category: 'devops',
        priority: 3,
        description: 'Proactive measures are taken to prevent potential incidents',
        enabled: true,
        custom: false
      },

      // Reliability Check Complete
      {
        id: 'rc',
        name: 'Reliability Check Complete',
        pattern: /\[rc\]/gi,
        category: 'devops',
        priority: 3,
        description: 'System reliability assessments or health checks are performed',
        enabled: true,
        custom: false
      },

      // Recovery Time Measured
      {
        id: 'rt',
        name: 'Recovery Time Measured',
        pattern: /\[rt\]/gi,
        category: 'devops',
        priority: 3,
        description: 'Recovery time objectives are measured or tested',
        enabled: true,
        custom: false
      },

      // Alert Optimized
      {
        id: 'ao',
        name: 'Alert Optimized',
        pattern: /\[ao\]/gi,
        category: 'devops',
        priority: 3,
        description: 'Alert rules, thresholds, or notification systems are improved',
        enabled: true,
        custom: false
      },

      // Post-mortem Started
      {
        id: 'ps',
        name: 'Post-mortem Started',
        pattern: /\[ps\]/gi,
        category: 'devops',
        priority: 3,
        description: 'Incident post-mortem analysis begins',
        enabled: true,
        custom: false
      },

      // Troubleshooting Session
      {
        id: 'ts',
        name: 'Troubleshooting Session',
        pattern: /\[ts\]/gi,
        category: 'devops',
        priority: 3,
        description: 'Active troubleshooting of system issues is in progress',
        enabled: true,
        custom: false
      },

      // Parallel Coordination Needed
      {
        id: 'pc',
        name: 'Parallel Coordination Needed',
        pattern: /\[pc\]/gi,
        category: 'coordination',
        priority: 3,
        description: 'Multiple agents need to synchronize work or resolve dependencies',
        enabled: true,
        custom: false
      },

      // Component Coordination
      {
        id: 'cc',
        name: 'Component Coordination',
        pattern: /\[cc\]/gi,
        category: 'coordination',
        priority: 3,
        description: 'UI components need coordinated design and development',
        enabled: true,
        custom: false
      },

      // Asset Sync Required
      {
        id: 'as',
        name: 'Asset Sync Required',
        pattern: /\[as\]/gi,
        category: 'coordination',
        priority: 3,
        description: 'Design assets need deployment or CDN updates',
        enabled: true,
        custom: false
      },

      // Parallel Environment Ready
      {
        id: 'pe',
        name: 'Parallel Environment Ready',
        pattern: /\[pe\]/gi,
        category: 'coordination',
        priority: 3,
        description: 'Staging or testing environments are ready for parallel work',
        enabled: true,
        custom: false
      },

      // Feature Flag Service Updated
      {
        id: 'fs',
        name: 'Feature Flag Service Updated',
        pattern: /\[fs\]/gi,
        category: 'coordination',
        priority: 3,
        description: 'Feature flags need configuration for parallel development',
        enabled: true,
        custom: false
      },

      // Database Schema Sync
      {
        id: 'ds',
        name: 'Database Schema Sync',
        pattern: /\[ds\]/gi,
        category: 'coordination',
        priority: 3,
        description: 'Database changes require coordinated deployment',
        enabled: true,
        custom: false
      },

      // Rollback Prepared
      {
        id: 'rb',
        name: 'Rollback Prepared',
        pattern: /\[rb\]/gi,
        category: 'coordination',
        priority: 3,
        description: 'Rollback procedures need preparation for parallel deployments',
        enabled: true,
        custom: false
      },

      // === LOW PRIORITY SIGNALS (1-2) ===

      // Informational and completion signals would go here
      // Note: Some signals like [pr], [PR], [HF], [TF], [TC], [TI] are internal system signals
      // and are handled separately by the system monitoring components

    ];
  }

  /**
   * Detect signals in text content with enhanced performance
   */
  async detectSignals(content: string, source?: string): Promise<Signal[]> {
    const startTime = Date.now();
    const hashString = await HashUtils.hashString(content);
    const cacheKey = hashString.substring(0, 16);

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    }

    const signals: Signal[] = [];
    const allPatterns = [...this.patterns, ...this.customPatterns];

    // Enhanced pattern matching with performance optimization
    const contentLines = content.split('\n');

    for (const pattern of allPatterns) {
      if (!pattern.enabled || !this.enabledCategories.has(pattern.category)) {
        continue;
      }

      // Reset regex lastIndex for global patterns
      if (pattern.pattern.global) {
        pattern.pattern.lastIndex = 0;
      }

      let match;
      while ((match = pattern.pattern.exec(content)) !== null) {
        const signalMatch = match[0]; // Full match including brackets
        if (!signalMatch || typeof signalMatch !== 'string') continue; // Safety check
        const signalCode = signalMatch.substring(1, 3); // Extract code from [Xx] format
        const position = this.getSignalPosition(content, match.index);

        signals.push({
          id: HashUtils.generateId(),
          type: signalCode,
          priority: pattern.priority,
          source: source ?? 'scanner',
          timestamp: new Date(),
          data: {
            rawSignal: signalMatch,
            patternName: pattern.name,
            category: pattern.category,
            description: pattern.description,
            line: position.line,
            column: position.column,
            context: this.extractContext(contentLines, position.line, position.column)
          },
          metadata: {
            agent: 'signal-detector',
            guideline: pattern.id,
            detectionTime: Date.now() - startTime
          }
        });
      }
    }

    // Remove duplicates based on signal code and position
    const uniqueSignals = this.removeDuplicateSignals(signals);

    // Cache result
    this.cache.set(cacheKey, uniqueSignals);
    this.trimCacheIfNeeded();

    // Log performance metrics
    const processingTime = Date.now() - startTime;
    if (processingTime > 100) {
      logger.warn('SignalDetector', `Slow signal detection: ${processingTime}ms for ${uniqueSignals.length} signals`);
    }

    return uniqueSignals;
  }

  /**
   * Get signal position in content (line and column)
   */
  private getSignalPosition(content: string, index: number): { line: number; column: number } {
    const beforeIndex = content.substring(0, index);
    const lines = beforeIndex.split('\n');
    const line = lines.length - 1;
    const column = lines[lines.length - 1]?.length ?? 0;
    return { line, column };
  }

  /**
   * Extract context around signal for better understanding
   */
  private extractContext(lines: string[], lineIndex: number, column: number, contextRadius: number = 50): string {
    const line = lines[lineIndex] ?? '';
    const start = Math.max(0, column - contextRadius);
    const end = Math.min(line.length, column + contextRadius);
    return line.substring(start, end).trim();
  }

  /**
   * Remove duplicate signals based on type and priority
   */
  private removeDuplicateSignals(signals: Signal[]): Signal[] {
    const seen = new Map<string, Signal>();

    for (const signal of signals) {
      const key = signal.type;
      const existingSignal = seen.get(key);
      if (!seen.has(key) || (existingSignal && existingSignal.priority < signal.priority)) {
        seen.set(key, signal);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Trim cache if it exceeds max size
   */
  private trimCacheIfNeeded(): void {
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      const toRemove = entries.slice(0, Math.floor(this.maxCacheSize * 0.2));
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Add a custom signal pattern
   */
  addCustomPattern(pattern: Omit<SignalPattern, 'id' | 'custom'>): string {
    const customPattern: SignalPattern = {
      ...pattern,
      id: HashUtils.generateId(),
      custom: true
    };

    this.customPatterns.push(customPattern);

    logger.info('SignalDetector', `Added custom pattern: ${customPattern.name}`, { patternId: customPattern.id, category: customPattern.category });

    return customPattern.id;
  }

  /**
   * Remove a custom signal pattern
   */
  removeCustomPattern(patternId: string): boolean {
    const index = this.customPatterns.findIndex(p => p.id === patternId);
    if (index >= 0) {
      const removed = this.customPatterns.splice(index, 1)[0];
      logger.info('SignalDetector', `Removed custom pattern: ${removed?.name ?? 'unknown'}`, { patternId });
      return true;
    }
    return false;
  }

  /**
   * Enable/disable a signal category
   */
  setCategoryEnabled(category: string, enabled: boolean): void {
    if (enabled) {
      this.enabledCategories.add(category);
    } else {
      this.enabledCategories.delete(category);
    }

    logger.info('SignalDetector', `${enabled ? 'Enabled' : 'Disabled'} category: ${category}`);
  }

  /**
   * Enable/disable a specific pattern
   */
  setPatternEnabled(patternId: string, enabled: boolean): void {
    const allPatterns = [...this.patterns, ...this.customPatterns];
    const pattern = allPatterns.find(p => p.id === patternId);

    if (pattern) {
      pattern.enabled = enabled;
      logger.info('SignalDetector', `${enabled ? 'Enabled' : 'Disabled'} pattern: ${pattern.name}`, { patternId });
    }
  }

  /**
   * Get all patterns (default and custom)
   */
  getAllPatterns(): SignalPattern[] {
    return [...this.patterns, ...this.customPatterns];
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: string): SignalPattern[] {
    return this.getAllPatterns().filter(p => p.category === category);
  }

  /**
   * Get enabled patterns
   */
  getEnabledPatterns(): SignalPattern[] {
    return this.getAllPatterns().filter(p =>
      p.enabled && this.enabledCategories.has(p.category)
    );
  }

  /**
   * Get available categories
   */
  getCategories(): string[] {
    const categories = new Set(this.getAllPatterns().map(p => p.category));
    return Array.from(categories);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('SignalDetector', 'Signal detection cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number; // Would need to implement hit tracking
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0 // Placeholder - would need hit tracking implementation
    };
  }

  /**
   * Validate a pattern
   */
  static validatePattern(pattern: Omit<SignalPattern, 'id' | 'custom'>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!pattern.name || pattern.name.trim().length === 0) {
      errors.push('Pattern name is required');
    }

    if (!pattern.category || pattern.category.trim().length === 0) {
      errors.push('Pattern category is required');
    }

    if (!(pattern.pattern instanceof RegExp)) {
      errors.push('Pattern must be a valid RegExp');
    }

    if (pattern.priority < 1 || pattern.priority > 10) {
      errors.push('Priority must be between 1 and 10');
    }

    if (!pattern.description || pattern.description.trim().length === 0) {
      errors.push('Pattern description is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a pattern from a simple signal string
   */
  static createPatternFromSignal(
    signal: string,
    name: string,
    category: string,
    priority: number,
    description: string
  ): Omit<SignalPattern, 'id' | 'custom'> {
    // Ensure signal is in correct format [Xx]
    const formattedSignal = signal.startsWith('[') ? signal : `[${signal}]`;

    // Create regex pattern that matches the signal case-insensitively
    const regexPattern = new RegExp(formattedSignal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

    return {
      name,
      pattern: regexPattern,
      category,
      priority: Math.max(1, Math.min(10, priority)),
      description,
      enabled: true
    };
  }

  /**
   * Test a pattern against sample text
   */
  testPattern(pattern: SignalPattern, sampleText: string): {
    matches: string[];
    count: number;
    signals: Signal[];
  } {
    const matches = sampleText.match(pattern.pattern) ?? [];
    const signals: Signal[] = [];

    for (const match of matches) {
      if (!match || typeof match !== 'string') continue; // Safety check
      const signalCode = match.substring(1, 3);
      signals.push({
        id: HashUtils.generateId(),
        type: signalCode,
        priority: pattern.priority,
        source: 'test',
        timestamp: new Date(),
        data: {
          rawSignal: match,
          patternName: pattern.name,
          category: pattern.category,
          description: pattern.description
        },
        metadata: {
          agent: 'signal-detector-test',
          guideline: pattern.id
        }
      });
    }

    return {
      matches,
      count: matches.length,
      signals
    };
  }
}