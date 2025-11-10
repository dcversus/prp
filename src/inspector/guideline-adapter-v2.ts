/**
 * ♫ Guidelines Adapter V2 for @dcversus/prp Inspector
 *
 * Dynamic guideline loading and processing system for the Critic inspector.
 * Supports inspector.md, inspector.py schemas, and orchestration integration.
 */

import { EventEmitter } from 'events';
import { Signal } from '../shared/types';
import { ProcessingContext } from './types';
import { createLayerLogger, FileUtils, HashUtils } from '../shared';

const logger = createLayerLogger('inspector');

/**
 * Guideline file structure
 */
export interface GuidelineFile {
  inspectorMd: string;           // inspector.md content
  inspectorPy: string;           // inspector.py schema
  scannerPy?: string;            // Optional scanner.py adapter
  orchestratorMd?: string;       // Optional orchestrator.md instructions
  metadata: GuidelineMetadata;
}

/**
 * Guideline metadata
 */
export interface GuidelineMetadata {
  signalType: string;            // Signal type this guideline handles
  version: string;               // Version of the guideline
  author: string;                // Author of the guideline
  createdAt: Date;               // Creation timestamp
  lastModified: Date;            // Last modification timestamp
  tags: string[];                // Tags for categorization
  dependencies: string[];        // Dependencies on other guidelines
  requiredTools: string[];       // Required tools for processing
  tokenLimits: {                 // Token limits for this guideline
    inspector: number;
    orchestrator: number;
  };
  validationSchema?: string;     // JSON schema for validation
}

/**
 * Processed guideline with compiled prompts
 */
export interface ProcessedGuideline {
  signalType: string;
  basePrompt: string;             // Compiled base prompt
  inspectorPrompt: string;        // Compiled inspector prompt
  orchestratorPrompt?: string;    // Compiled orchestrator prompt
  validationSchema?: any;         // Parsed validation schema
  metadata: GuidelineMetadata;
  compiledAt: Date;              // When the guideline was compiled
  cacheKey: string;              // Cache key for the compiled guideline
}

/**
 * Guideline loading result
 */
export interface GuidelineLoadingResult {
  signalType: string;
  success: boolean;
  guideline?: ProcessedGuideline;
  error?: string;
  loadingTime: number;
  fromCache: boolean;
}

/**
 * Guideline validation result
 */
export interface GuidelineValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  signalType: string;
  validatedAt: Date;
}

/**
 * Cache entry for compiled guidelines
 */
export interface CacheEntry {
  guideline: ProcessedGuideline;
  accessedAt: Date;
  accessCount: number;
  expiresAt: Date;
}

/**
 * Guidelines Adapter V2 - Enhanced dynamic loading system
 */
export class GuidelinesAdapterV2 extends EventEmitter {
  private guidelinesPath: string;
  private cache: Map<string, CacheEntry> = new Map();
  private loadingInProgress: Map<string, Promise<ProcessedGuideline>> = new Map();
  private validationCache: Map<string, GuidelineValidationResult> = new Map();
  private defaultTTL = 3600000; // 1 hour in milliseconds

  constructor(guidelinesPath?: string) {
    super();
    this.guidelinesPath = guidelinesPath || './src/guidelines';

    logger.info('GuidelinesAdapterV2', 'Guidelines Adapter V2 initialized', {
      guidelinesPath: this.guidelinesPath,
      cacheEnabled: true,
      defaultTTL: this.defaultTTL
    });
  }

  /**
   * Get guideline for signal type
   */
  async getGuidelineForSignal(signal: Signal, _context?: ProcessingContext): Promise<ProcessedGuideline | null> {
    const startTime = Date.now();
    const signalType = signal.type;

    try {
      logger.debug('GuidelinesAdapterV2', `Loading guideline for signal ${signalType}`, {
        signalId: signal.id,
        signalType
      });

      // Check cache first
      const cached = this.getCachedGuideline(signalType);
      if (cached) {
        logger.debug('GuidelinesAdapterV2', `Using cached guideline for ${signalType}`);
        this.emit('guideline:loaded', {
          signalType,
          fromCache: true,
          loadingTime: Date.now() - startTime
        });
        return cached;
      }

      // Check if already loading
      const loadingPromise = this.loadingInProgress.get(signalType);
      if (loadingPromise) {
        logger.debug('GuidelinesAdapterV2', `Waiting for ongoing load of ${signalType}`);
        const guideline = await loadingPromise;
        this.emit('guideline:loaded', {
          signalType,
          fromCache: false,
          loadingTime: Date.now() - startTime
        });
        return guideline;
      }

      // Load guideline from disk
      const loadPromise = this.loadGuidelineFromDisk(signalType);
      this.loadingInProgress.set(signalType, loadPromise);

      try {
        const guideline = await loadPromise;

        // Validate guideline
        const validation = await this.validateGuideline(guideline);
        if (!validation.isValid) {
          logger.error('GuidelinesAdapterV2', `Guideline validation failed for ${signalType}`, new Error(`Validation errors: ${validation.errors.join(', ')}`));
          throw new Error(`Guideline validation failed: ${validation.errors.join(', ')}`);
        }

        // Cache the guideline
        this.cacheGuideline(guideline);

        // Remove from loading in progress
        this.loadingInProgress.delete(signalType);

        this.emit('guideline:loaded', {
          signalType,
          fromCache: false,
          loadingTime: Date.now() - startTime
        });

        return guideline;

      } catch (error) {
        this.loadingInProgress.delete(signalType);
        throw error;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('GuidelinesAdapterV2', `Failed to load guideline for ${signalType}`, error instanceof Error ? error : new Error(errorMessage));

      this.emit('guideline:error', {
        signalType,
        error: errorMessage,
        loadingTime: Date.now() - startTime
      });

      return null;
    }
  }

  /**
   * Load guideline from disk
   */
  private async loadGuidelineFromDisk(signalType: string): Promise<ProcessedGuideline> {
    const guidelinePath = `${this.guidelinesPath}/${signalType}`;

    logger.debug('GuidelinesAdapterV2', `Loading guideline files from ${guidelinePath}`);

    try {
      // Load required files
      const [inspectorMd, inspectorPy] = await Promise.all([
        this.loadGuidelineFile(`${guidelinePath}/inspector.md`),
        this.loadGuidelineFile(`${guidelinePath}/inspector.py`)
      ]);

      // Load optional files
      const [scannerPy, orchestratorMd] = await Promise.all([
        this.loadGuidelineFile(`${guidelinePath}/scanner.py`).catch(() => null),
        this.loadGuidelineFile(`${guidelinePath}/orchestrator.md`).catch(() => null)
      ]);

      // Parse metadata from files
      const metadata = await this.parseGuidelineMetadata(signalType, inspectorMd, inspectorPy);

      // Compile prompts
      const basePrompt = await this.compileBasePrompt(inspectorMd, metadata);
      const inspectorPrompt = await this.compileInspectorPrompt(inspectorMd, inspectorPy, metadata);
      const orchestratorPrompt = orchestratorMd
        ? await this.compileOrchestratorPrompt(orchestratorMd, metadata)
        : undefined;

      // Parse validation schema if present
      const validationSchema = metadata.validationSchema
        ? await this.parseValidationSchema(metadata.validationSchema)
        : undefined;

      const guideline: ProcessedGuideline = {
        signalType,
        basePrompt,
        inspectorPrompt,
        orchestratorPrompt,
        validationSchema,
        metadata,
        compiledAt: new Date(),
        cacheKey: await HashUtils.hashString(signalType + metadata.version)
      };

      logger.debug('GuidelinesAdapterV2', `Guideline loaded successfully for ${signalType}`, {
        version: metadata.version,
        author: metadata.author,
        hasInspectorMd: !!inspectorMd,
        hasInspectorPy: !!inspectorPy,
        hasScannerPy: !!scannerPy,
        hasOrchestratorMd: !!orchestratorMd
      });

      return guideline;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('GuidelinesAdapterV2', `Failed to load guideline files for ${signalType}`, error instanceof Error ? error : new Error(errorMessage));
      throw new Error(`Failed to load guideline for ${signalType}: ${errorMessage}`);
    }
  }

  /**
   * Load guideline file
   */
  private async loadGuidelineFile(filePath: string): Promise<string> {
    try {
      const exists = await FileUtils.pathExists(filePath);
      if (!exists) {
        throw new Error(`File not found: ${filePath}`);
      }
      return await FileUtils.readTextFile(filePath);
    } catch (error) {
      throw new Error(`Failed to load file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse metadata from guideline files
   */
  private async parseGuidelineMetadata(
    signalType: string,
    inspectorMd: string,
    inspectorPy: string
  ): Promise<GuidelineMetadata> {
    // Extract metadata from inspector.md frontmatter or comments
    const mdMetadata = this.extractMarkdownMetadata(inspectorMd);

    // Extract metadata from inspector.py comments
    const pyMetadata = this.extractPythonMetadata(inspectorPy);

    // Merge metadata with defaults
    const metadata: GuidelineMetadata = {
      signalType,
      version: mdMetadata.version || pyMetadata.version || '1.0.0',
      author: mdMetadata.author || pyMetadata.author || 'system',
      createdAt: mdMetadata.createdAt ? new Date(mdMetadata.createdAt) : new Date(),
      lastModified: mdMetadata.lastModified ? new Date(mdMetadata.lastModified) : new Date(),
      tags: [...(mdMetadata.tags || []), ...(pyMetadata.tags || [])],
      dependencies: [...(mdMetadata.dependencies || []), ...(pyMetadata.dependencies || [])],
      requiredTools: [...(mdMetadata.requiredTools || []), ...(pyMetadata.requiredTools || [])],
      tokenLimits: {
        inspector: mdMetadata.tokenLimits?.inspector || pyMetadata.tokenLimits?.inspector || 35000,
        orchestrator: mdMetadata.tokenLimits?.orchestrator || pyMetadata.tokenLimits?.orchestrator || 25000
      },
      validationSchema: mdMetadata.validationSchema || pyMetadata.validationSchema
    };

    return metadata;
  }

  /**
   * Extract metadata from markdown frontmatter
   */
  private extractMarkdownMetadata(content: string): Record<string, any> {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontmatterRegex);

    if (match) {
      try {
        return JSON.parse(match[1] ?? '{}');
      } catch {
        return {};
      }
    }

    return {};
  }

  /**
   * Extract metadata from Python comments
   */
  private extractPythonMetadata(content: string): Record<string, any> {
    const metadata: Record<string, any> = {};

    // Extract metadata from comment blocks like # @key: value
    const commentRegex = /#\s*@\s*([^:]+):\s*(.+)$/gm;
    let match;

    while ((match = commentRegex.exec(content)) !== null) {
      const [, key, value] = match;
      const trimmedKey = key?.trim() ?? '';
      const trimmedValue = value?.trim() ?? '';

      // Try to parse as JSON, fallback to string
      try {
        metadata[trimmedKey] = JSON.parse(trimmedValue);
      } catch {
        metadata[trimmedKey] = trimmedValue;
      }
    }

    return metadata;
  }

  /**
   * Compile base prompt
   */
  private async compileBasePrompt(inspectorMd: string, metadata: GuidelineMetadata): Promise<string> {
    // Remove frontmatter from markdown
    const content = inspectorMd.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');

    // Add base instruction header
    const basePrompt = [
      `# INSPECTOR GUIDELINE: ${metadata.signalType.toUpperCase()}`,
      '',
      `**Version:** ${metadata.version}`,
      `**Author:** ${metadata.author}`,
      `**Last Modified:** ${metadata.lastModified.toISOString()}`,
      `**Tags:** ${metadata.tags.join(', ')}`,
      '',
      '## ROLE',
      'You are an expert Inspector analyzing signals for the PRP workflow system.',
      '',
      '## INSTRUCTIONS',
      content,
      '',
      '## REQUIREMENTS',
      '1. Provide accurate classification with confidence scoring',
      '2. Generate specific, actionable recommendations',
      '3. Consider context and dependencies',
      '4. Maintain consistency with similar signals',
      '',
      '## TOKEN LIMITS',
      `- Inspector: ${metadata.tokenLimits.inspector} tokens`,
      `- Orchestrator: ${metadata.tokenLimits.orchestrator} tokens`,
      '',
      '## OUTPUT FORMAT',
      'Respond with structured JSON following the provided schema.'
    ].join('\n');

    return basePrompt;
  }

  /**
   * Compile inspector prompt with schema integration
   */
  private async compileInspectorPrompt(
    inspectorMd: string,
    inspectorPy: string,
    metadata: GuidelineMetadata
  ): Promise<string> {
    // Extract schema from Python file
    const schema = this.extractPythonSchema(inspectorPy);

    // Build prompt with schema
    const prompt = [
      '# INSPECTOR ANALYSIS PROMPT',
      '',
      '## TASK',
      `Analyze ${metadata.signalType} signals and provide comprehensive classification and recommendations.`,
      '',
      '## ANALYSIS GUIDELINES',
      inspectorMd.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, ''),
      '',
      '## RESPONSE SCHEMA',
      'You must respond with valid JSON that matches this schema:',
      '',
      '```json',
      JSON.stringify(schema, null, 2),
      '```',
      '',
      '## VALIDATION RULES',
      '1. All required fields must be present',
      '2. Confidence scores must be between 0-100',
      '3. Priority levels must be valid',
      '4. Agent roles must be from the approved list',
      '5. Timestamps must be valid ISO dates',
      '',
      '## ANALYSIS FOCUS',
      '1. **Classification Accuracy**: Provide precise categorization',
      '2. **Risk Assessment**: Evaluate potential risks and impacts',
      '3. **Actionability**: Generate specific, actionable recommendations',
      '4. **Context Awareness**: Consider broader project context',
      '5. **Dependencies**: Identify and account for dependencies',
      '',
      '## QUALITY STANDARDS',
      '- Provide evidence-based reasoning',
      '- Include confidence levels for all assessments',
      '- Suggest concrete next steps',
      '- Flag any uncertainties or ambiguities'
    ].join('\n');

    return prompt;
  }

  /**
   * Compile orchestrator prompt
   */
  private async compileOrchestratorPrompt(
    orchestratorMd: string,
    metadata: GuidelineMetadata
  ): Promise<string> {
    const prompt = [
      '# ORCHESTRATOR INSTRUCTIONS',
      '',
      `**Signal Type:** ${metadata.signalType}`,
      `**Version:** ${metadata.version}`,
      '',
      '## TASK',
      'Coordinate and orchestrate responses to analyzed signals.',
      '',
      '## INSTRUCTIONS',
      orchestratorMd.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, ''),
      '',
      '## COORDINATION REQUIREMENTS',
      '1. Review inspector analysis and recommendations',
      '2. Assign appropriate agents based on classification',
      '3. Coordinate parallel execution when possible',
      '4. Monitor progress and handle escalations',
      '5. Ensure quality standards are met',
      '',
      '## AGENT COORDINATION',
      '- **robo-developer**: Implementation tasks',
      '- **robo-quality-control**: Testing and validation',
      '- **robo-devops-sre**: Deployment and infrastructure',
      '- **robo-ux-ui-designer**: Design and user experience',
      '- **robo-system-analyst**: Analysis and requirements',
      '',
      '## WORKFLOW INTEGRATION',
      '1. Validate signal classification',
      '2. Plan execution approach',
      '3. Dispatch to appropriate agents',
      '4. Monitor execution progress',
      '5. Validate completion criteria',
      '6. Update system state'
    ].join('\n');

    return prompt;
  }

  /**
   * Extract schema from Python file
   */
  private extractPythonSchema(pythonContent: string): any {
    // Look for schema definition in Python
    const schemaRegex = /schema\s*=\s*({[\s\S]*?})\s*$/m;
    const match = pythonContent.match(schemaRegex);

    if (match) {
      try {
        // Simple Python dict to JSON conversion
        const pythonDict = match[1];
        const jsonSchema = pythonDict
          ?.replace(/'/g, '"')
          ?.replace(/(\w+):/g, '"$1":')
          ?.replace(/True/g, 'true')
          ?.replace(/False/g, 'false')
          ?.replace(/None/g, 'null') ?? '{}';

        return JSON.parse(jsonSchema);
      } catch (error) {
        logger.warn('GuidelinesAdapterV2', 'Failed to parse schema from Python file', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Return default schema if parsing fails
    return {
      type: 'object',
      properties: {
        classification: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            subcategory: { type: 'string' },
            priority: { type: 'number' },
            agentRole: { type: 'string' },
            confidence: { type: 'number' }
          },
          required: ['category', 'priority', 'agentRole', 'confidence']
        },
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              priority: { type: 'string' },
              description: { type: 'string' },
              estimatedTime: { type: 'number' }
            },
            required: ['type', 'description', 'estimatedTime']
          }
        }
      },
      required: ['classification', 'recommendations']
    };
  }

  /**
   * Parse validation schema
   */
  private async parseValidationSchema(schemaString: string): Promise<any> {
    try {
      return JSON.parse(schemaString);
    } catch (error) {
      logger.warn('GuidelinesAdapterV2', 'Failed to parse validation schema', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Validate guideline
   */
  private async validateGuideline(guideline: ProcessedGuideline): Promise<GuidelineValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!guideline.signalType) {
      errors.push('Missing signal type');
    }
    if (!guideline.basePrompt) {
      errors.push('Missing base prompt');
    }
    if (!guideline.inspectorPrompt) {
      errors.push('Missing inspector prompt');
    }
    if (!guideline.metadata) {
      errors.push('Missing metadata');
    }

    // Validate metadata
    if (guideline.metadata) {
      if (!guideline.metadata.version) {
        warnings.push('Missing version in metadata');
      }
      if (!guideline.metadata.author) {
        warnings.push('Missing author in metadata');
      }
      if (!guideline.metadata.tokenLimits) {
        warnings.push('Missing token limits in metadata');
      }

      if (guideline.metadata.tokenLimits) {
        if (guideline.metadata.tokenLimits.inspector > 40000) {
          warnings.push('Inspector token limit exceeds 40K recommended maximum');
        }
      }
    }

    // Validate prompt lengths
    const inspectorTokens = this.estimateTokens(guideline.inspectorPrompt);
    if (inspectorTokens > 50000) {
      warnings.push(`Inspector prompt is very long: ~${inspectorTokens} tokens`);
    }

    // Validate schema if present
    if (guideline.validationSchema) {
      try {
        JSON.stringify(guideline.validationSchema);
      } catch {
        errors.push('Invalid validation schema JSON');
      }
    }

    const result: GuidelineValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      signalType: guideline.signalType,
      validatedAt: new Date()
    };

    // Cache validation result
    this.validationCache.set(guideline.signalType, result);

    return result;
  }

  /**
   * Get cached guideline
   */
  private getCachedGuideline(signalType: string): ProcessedGuideline | null {
    const cached = this.cache.get(signalType);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt.getTime()) {
      this.cache.delete(signalType);
      logger.debug('GuidelinesAdapterV2', `Cache expired for ${signalType}`);
      return null;
    }

    // Update access stats
    cached.accessedAt = new Date();
    cached.accessCount++;

    logger.debug('GuidelinesAdapterV2', `Cache hit for ${signalType}`, {
      accessCount: cached.accessCount,
      age: Date.now() - cached.accessedAt.getTime()
    });

    return cached.guideline;
  }

  /**
   * Cache guideline
   */
  private cacheGuideline(guideline: ProcessedGuideline): void {
    const cacheEntry: CacheEntry = {
      guideline,
      accessedAt: new Date(),
      accessCount: 1,
      expiresAt: new Date(Date.now() + this.defaultTTL)
    };

    this.cache.set(guideline.signalType, cacheEntry);

    logger.debug('GuidelinesAdapterV2', `Guideline cached for ${guideline.signalType}`, {
      cacheKey: guideline.cacheKey,
      expiresAt: cacheEntry.expiresAt
    });
  }

  /**
   * Estimate token count
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~1 token per 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.validationCache.clear();
    logger.info('GuidelinesAdapterV2', 'Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): {
    size: number;
    hitRate: number;
    totalAccesses: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
    } {
    if (this.cache.size === 0) {
      return {
        size: 0,
        hitRate: 0,
        totalAccesses: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }

    const entries = Array.from(this.cache.values());
    const totalAccesses = entries.reduce((sum, entry) => sum + entry.accessCount, 0);

    let oldestEntry = entries[0]?.accessedAt ?? new Date();
    let newestEntry = entries[0]?.accessedAt ?? new Date();

    for (const entry of entries) {
      if (entry.accessedAt < oldestEntry) {
        oldestEntry = entry.accessedAt;
      }
      if (entry.accessedAt > newestEntry) {
        newestEntry = entry.accessedAt;
      }
    }

    return {
      size: this.cache.size,
      hitRate: totalAccesses > 0 ? (totalAccesses - this.cache.size) / totalAccesses : 0,
      totalAccesses,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Get validation result for signal type
   */
  getValidationResult(signalType: string): GuidelineValidationResult | null {
    return this.validationCache.get(signalType) || null;
  }

  /**
   * List all available signal types
   */
  async listAvailableSignalTypes(): Promise<string[]> {
    // This would scan the guidelines directory for signal types
    // For now, return common signal types
    return [
      'dp', 'tg', 'bf', 'bb', 'cq', 'cp', 'tr', 'tg', 'cf', 'pc',
      'rg', 'cd', 'rv', 'iv', 'ra', 'mg', 'rl', 'ps', 'ic', 'pm'
    ];
  }

  /**
   * Preload guidelines for signal types
   */
  async preloadGuidelines(signalTypes: string[]): Promise<{
    successful: string[];
    failed: string[];
  }> {
    const successful: string[] = [];
    const failed: string[] = [];

    logger.info('GuidelinesAdapterV2', `Preloading ${signalTypes.length} guidelines`);

    const promises = signalTypes.map(async (signalType) => {
      try {
        // Create a mock signal for loading
        const mockSignal: Signal = {
          id: HashUtils.generateId(),
          type: signalType,
          source: 'system',
          priority: 5,
          timestamp: new Date(),
          data: {},
          resolved: false,
          relatedSignals: [],
          metadata: {}
        };

        const guideline = await this.getGuidelineForSignal(mockSignal);
        if (guideline) {
          successful.push(signalType);
        } else {
          failed.push(signalType);
        }
      } catch (_error) {
        failed.push(signalType);
      }
    });

    await Promise.all(promises);

    logger.info('GuidelinesAdapterV2', 'Preloading completed', {
      successful: successful.length,
      failed: failed.length
    });

    return { successful, failed };
  }

  /**
   * Get guideline count
   */
  getGuidelineCount(): number {
    return this.cache.size;
  }

  /**
   * Set TTL for cache entries
   */
  setCacheTTL(ttl: number): void {
    this.defaultTTL = ttl;
    logger.info('GuidelinesAdapterV2', `Cache TTL set to ${ttl}ms`);
  }
}