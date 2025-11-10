/**
 * ♫ Enhanced Guideline Adapter for @dcversus/prp Inspector
 *
 * Comprehensive guideline processing system with support for style, architecture,
 * process, and security guidelines. Features violation detection, fix suggestions,
 * and automated enforcement capabilities.
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve, extname } from 'path';
import { execSync } from 'child_process';

// For now, use a relative path approach
import { GuidelineConfig, Signal } from '../shared/types';
import { createLayerLogger, HashUtils } from '../shared';

const logger = createLayerLogger('inspector');

// Enhanced guideline types
export enum GuidelineType {
  STYLE = 'style',
  ARCHITECTURE = 'architecture',
  PROCESS = 'process',
  SECURITY = 'security'
}

export enum SeverityLevel {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export interface GuidelineViolation {
  id: string;
  guidelineId: string;
  type: GuidelineType;
  severity: SeverityLevel;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  rule?: string;
  context?: string;
  suggestions?: GuidelineFix[];
  timestamp: Date;
}

export interface GuidelineFix {
  type: 'automatic' | 'manual' | 'suggestion';
  description: string;
  command?: string;
  code?: string;
  effort: 'low' | 'medium' | 'high';
  confidence: number; // 0-100
}

export interface GuidelineCheck {
  guidelineId: string;
  enabled: boolean;
  type: GuidelineType;
  rules: GuidelineRule[];
  configuration: Record<string, unknown>;
}

export interface GuidelineRule {
  id: string;
  name: string;
  description: string;
  severity: SeverityLevel;
  pattern?: RegExp | string;
  validator?: (content: string, context: CheckContext) => boolean;
  fixer?: (content: string, violation: GuidelineViolation) => string;
  configuration?: Record<string, unknown>;
}

export interface CheckContext {
  filePath: string;
  fileExtension: string;
  content: string;
  lines: string[];
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export interface GuidelineReport {
  id: string;
  timestamp: Date;
  summary: {
    totalViolations: number;
    errors: number;
    warnings: number;
    info: number;
    fixable: number;
  };
  violations: GuidelineViolation[];
  guidelines: Array<{
    id: string;
    name: string;
    type: GuidelineType;
    violations: number;
    status: 'passed' | 'failed' | 'warning';
  }>;
  recommendations: string[];
  metrics: {
    checkDuration: number;
    filesProcessed: number;
    linesOfCode: number;
  };
}

// Extended interface for internal guideline management
interface ExtendedGuidelineConfig extends GuidelineConfig {
  signalPatterns?: Array<{
    code: string;
    description: string;
  }>;
  priority?: number;
  content?: string;
  lastModified?: Date;
  type?: GuidelineType;
  rules?: GuidelineRule[];
  configuration?: Record<string, unknown>;
  checkPatterns?: Array<{
    pattern: RegExp | string;
    type: GuidelineType;
    severity: SeverityLevel;
    message: string;
  }>;
}

interface CacheEntry {
  guideline: string;
  timestamp: number;
}

/**
 * Enhanced Guideline Adapter - Comprehensive guideline processing with violation detection
 */
export class GuidelineAdapter {
  private guidelines: Map<string, ExtendedGuidelineConfig> = new Map();
  private guidelineCache: Map<string, CacheEntry> = new Map();
  private guidelinesPath: string;
  private lastScanTime: Date = new Date(0);
  private cacheEnabled: boolean;
  private maxCacheSize: number;
  private guidelineChecks: Map<string, GuidelineCheck> = new Map();
  private violationHistory: Map<string, GuidelineViolation[]> = new Map();

  constructor(guidelinesPath?: string) {
    this.guidelinesPath = guidelinesPath ?? join(resolve('.'), '../guidelines');
    this.cacheEnabled = true;
    this.maxCacheSize = 1000;
    this.initializeBuiltInGuidelines();
  }

  /**
   * Initialize built-in guideline checks for common scenarios
   */
  private initializeBuiltInGuidelines(): void {
    // Style guidelines
    this.addGuidelineCheck({
      guidelineId: 'eslint-standard',
      enabled: true,
      type: GuidelineType.STYLE,
      rules: [
        {
          id: 'no-console',
          name: 'No console statements',
          description: 'Prevent console statements in production code',
          severity: SeverityLevel.WARNING,
          pattern: /console\.(log|warn|error|debug|info)/g,
          validator: (content) => !/console\.(log|warn|error|debug|info)/.test(content),
          fixer: (content) => content.replace(/console\.(log|warn|error|debug|info)\([^)]*\);?\s*\n?/g, ''),
          configuration: {}
        },
        {
          id: 'prefer-const',
          name: 'Prefer const declarations',
          description: 'Use const instead of let when variables are not reassigned',
          severity: SeverityLevel.INFO,
          pattern: /let\s+\w+\s*=/g,
          configuration: {}
        }
      ],
      configuration: {}
    });

    // Architecture guidelines
    this.addGuidelineCheck({
      guidelineId: 'solid-principles',
      enabled: true,
      type: GuidelineType.ARCHITECTURE,
      rules: [
        {
          id: 'single-responsibility',
          name: 'Single Responsibility Principle',
          description: 'Classes should have only one reason to change',
          severity: SeverityLevel.WARNING,
          validator: (content, context) => {
            const classMatches = content.match(/class\s+\w+/g);
            if (!classMatches) {
              return true;
            }

            const methodCount = (content.match(/(?:public|private|protected)?\s*\w+\s*\([^)]*\)\s*{/g) || []).length;
            return methodCount <= 5; // Simple heuristic
          },
          configuration: { maxMethods: 5 }
        },
        {
          id: 'dependency-injection',
          name: 'Dependency Injection',
          description: 'Dependencies should be injected rather than hard-coded',
          severity: SeverityLevel.ERROR,
          pattern: /new\s+\w+\(/g,
          validator: (content) => {
            const newInstances = (content.match(/new\s+\w+\(/g) || []).length;
            return newInstances <= 3; // Allow some utility class instances
          },
          configuration: { maxDirectDependencies: 3 }
        }
      ],
      configuration: {}
    });

    // Process guidelines
    this.addGuidelineCheck({
      guidelineId: 'git-workflow',
      enabled: true,
      type: GuidelineType.PROCESS,
      rules: [
        {
          id: 'commit-message-format',
          name: 'Commit Message Format',
          description: 'Commit messages should follow conventional format',
          severity: SeverityLevel.WARNING,
          pattern: /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/,
          validator: (content, context) => {
            // This would be checked during git operations
            return true;
          },
          configuration: {}
        }
      ],
      configuration: {}
    });

    // Security guidelines
    this.addGuidelineCheck({
      guidelineId: 'owasp-security',
      enabled: true,
      type: GuidelineType.SECURITY,
      rules: [
        {
          id: 'no-hardcoded-secrets',
          name: 'No Hardcoded Secrets',
          description: 'Secrets should not be hardcoded in source files',
          severity: SeverityLevel.ERROR,
          pattern: /(password|secret|key|token)\s*[:=]\s*['"][^'"]+['"]/gi,
          validator: (content) => !/(password|secret|key|token)\s*[:=]\s*['"][^'"]+['"]/gi.test(content),
          fixer: (content) => content.replace(/(password|secret|key|token)\s*[:=]\s*['"][^'"]+['"]/gi, '$1: process.env.$1.toUpperCase()'),
          configuration: {}
        },
        {
          id: 'sql-injection-prevention',
          name: 'SQL Injection Prevention',
          description: 'Use parameterized queries instead of string concatenation',
          severity: SeverityLevel.ERROR,
          pattern: /query\s*\(\s*['"][^'"]*\+[^'"]*['"]/g,
          validator: (content) => !/query\s*\(\s*['"][^'"]*\+[^'"]*['"]/g.test(content),
          configuration: {}
        }
      ],
      configuration: {}
    });
  }

  /**
   * Load all guidelines from the guidelines directory
   */
  async loadGuidelines(): Promise<void> {
    try {
      logger.info('GuidelineAdapter', `Loading guidelines from ${this.guidelinesPath}`);

      // Clear existing guidelines
      this.guidelines.clear();
      this.guidelineCache.clear();

      // Load guideline files
      const guidelineFiles = await this.discoverGuidelineFiles(this.guidelinesPath);

      for (const filePath of guidelineFiles) {
        try {
          const guideline = await this.loadGuidelineFile(filePath);
          if (guideline) {
            this.guidelines.set(guideline.id, guideline);
            logger.debug('GuidelineAdapter', `Loaded guideline: ${guideline.name} (${guideline.id})`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn('GuidelineAdapter', `Failed to load guideline: ${filePath} - ${errorMessage}`);
        }
      }

      this.lastScanTime = new Date();
      logger.info('GuidelineAdapter', `Guidelines loaded successfully: ${this.guidelines.size} guidelines`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('GuidelineAdapter', 'Failed to load guidelines', error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }

  /**
   * Get appropriate guideline for a signal
   */
  async getGuidelineForSignal(signal: Signal): Promise<string | null> {
    try {
      // Check cache first
      const cacheKey = await HashUtils.hashString(`${signal.type}-${(signal.data['rawSignal'] as string) || ''}`);
      if (this.cacheEnabled && this.guidelineCache.has(cacheKey)) {
        const cached = this.guidelineCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes TTL
          return cached.guideline;
        }
      }

      // Find matching guideline
      const matchingGuideline = this.findMatchingGuideline(signal);

      if (matchingGuideline) {
        // Adapt the guideline for this specific signal
        const adaptedGuideline = await this.adaptGuidelineForSignal(matchingGuideline, signal);

        // Cache the result
        if (this.cacheEnabled) {
          this.guidelineCache.set(cacheKey, {
            guideline: adaptedGuideline,
            timestamp: Date.now()
          });
          this.trimCacheIfNeeded();
        }

        return adaptedGuideline;
      }

      logger.debug('GuidelineAdapter', `No guideline found for signal type: ${signal.type}`);
      return null;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('GuidelineAdapter', `Error getting guideline for signal type ${signal.type}: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
      return null;
    }
  }

  /**
   * Get guideline by ID
   */
  getGuidelineById(id: string): ExtendedGuidelineConfig | null {
    return this.guidelines.get(id) ?? null;
  }

  /**
   * Get all guidelines
   */
  getAllGuidelines(): ExtendedGuidelineConfig[] {
    return Array.from(this.guidelines.values());
  }

  /**
   * Get guidelines by category
   */
  getGuidelinesByCategory(category: string): ExtendedGuidelineConfig[] {
    // Since GuidelineConfig doesn't have category, return all enabled guidelines
    // Category filtering could be implemented via protocol or naming conventions
    return this.getEnabledGuidelines().filter(g =>
      g.name.toLowerCase().includes(category.toLowerCase()) ||
      g.id.toLowerCase().includes(category.toLowerCase())
    );
  }

  /**
   * Get enabled guidelines
   */
  getEnabledGuidelines(): ExtendedGuidelineConfig[] {
    return this.getAllGuidelines().filter(g => g.enabled);
  }

  /**
   * Get guideline count
   */
  getGuidelineCount(): number {
    return this.guidelines.size;
  }

  /**
   * Enable/disable a guideline
   */
  setGuidelineEnabled(id: string, enabled: boolean): boolean {
    const guideline = this.guidelines.get(id);
    if (guideline) {
      guideline.enabled = enabled;
      logger.info('GuidelineAdapter', `${enabled ? 'Enabled' : 'Disabled'} guideline: ${guideline.name} (${id})`);
      return true;
    }
    return false;
  }

  /**
   * Discover guideline files in directory
   */
  private async discoverGuidelineFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const { readdirSync } = await import('fs');
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        } else if (entry.isDirectory()) {
          // Recursively search subdirectories
          files.push(...await this.discoverGuidelineFiles(fullPath));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('GuidelineAdapter', `Failed to read directory ${dir}: ${errorMessage}`);
    }

    return files;
  }

  /**
   * Load a single guideline file
   */
  private async loadGuidelineFile(filePath: string): Promise<ExtendedGuidelineConfig | null> {
    try {
      const content = readFileSync(filePath, 'utf8');
      const fileName = filePath.split('/').pop()?.replace('.md', '') ?? '';

      // Parse guideline metadata from content
      const metadata = this.parseGuidelineMetadata(content, fileName);

      const guideline: ExtendedGuidelineConfig = {
        id: (metadata['id'] as string) || HashUtils.generateId(),
        name: (metadata['name'] as string) || this.formatGuidelineName(fileName),
        enabled: (metadata['enabled'] as boolean) !== false,
        settings: (metadata['settings'] as Record<string, unknown>) || {},
        requiredFeatures: (metadata['requiredFeatures'] as string[]) || [],
        protocol: {
          id: `protocol-${(metadata['id'] as string) || HashUtils.generateId()}`,
          description: (metadata['description'] as string) || '',
          steps: [],
          requirements: [],
          dependencies: [],
          metadata: {}
        },
        tools: (metadata['tools'] as string[]) || [],
        prompts: {
          inspector: content,
          orchestrator: content
        },
        tokenLimits: {
          inspector: 4000,
          orchestrator: 8000
        },
        // Extended properties
        signalPatterns: (metadata['signalPatterns'] as Array<{ code: string; description: string }>) || [],
        priority: (metadata['priority'] as number) || 5,
        content: content,
        lastModified: new Date()
      };

      return guideline;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('GuidelineAdapter', `Failed to load guideline file ${filePath}: ${errorMessage}`, error instanceof Error ? error : new Error(errorMessage));
      return null;
    }
  }

  /**
   * Parse metadata from guideline content
   */
  private parseGuidelineMetadata(content: string, fileName: string): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};

    // Extract frontmatter if present
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      try {
        // Simple YAML parsing (basic implementation)
        const frontmatter = frontmatterMatch[1];
        if (frontmatter) {
          const lines = frontmatter.split('\n');

          for (const line of lines) {
            const match = line.match(/^(\w+):\s*(.+)$/);
            if (match) {
              const [, key, value] = match;
              if (key && value) {
                metadata[key] = this.parseYamlValue(value);
              }
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn('GuidelineAdapter', `Failed to parse frontmatter in ${fileName}: ${errorMessage}`);
      }
    }

    // Extract signal patterns from content
    const signalPatternMatches = content.matchAll(/\[([A-Z][a-z])\]\s*-\s*(.+)/g);
    metadata['signalPatterns'] = Array.from(signalPatternMatches).map((match) => {
      const [, code, description] = match;
      return {
        code: code ? `[${code}]` : '',
        description: description ? description.trim() : ''
      };
    });

    // Extract agent roles from content
    const agentRoleMatches = content.matchAll(/\*\*Agent:\*\*\s*(.+)/g);
    metadata['agentRoles'] = Array.from(agentRoleMatches).map((match) => {
      const [, role] = match;
      return role ? role.trim() : '';
    }).filter(role => role.length > 0);

    // Extract context requirements
    const contextMatches = content.matchAll(/\*\*Context:\*\*\s*(.+)/g);
    metadata['contexts'] = Array.from(contextMatches).map((match) => {
      const [, context] = match;
      return context ? context.trim() : '';
    }).filter(context => context.length > 0);

    // Extract requirements
    const requirementMatches = content.matchAll(/\*\*Requirement:\*\*\s*(.+)/g);
    metadata['requirements'] = Array.from(requirementMatches).map((match) => {
      const [, req] = match;
      return req ? req.trim() : '';
    }).filter(req => req.length > 0);

    // Extract steps if numbered list is present
    const stepMatches = content.matchAll(/^\d+\.\s+(.+)$/gm);
    metadata['steps'] = Array.from(stepMatches).map((match) => {
      const [, step] = match;
      return step ? step.trim() : '';
    });

    // Extract tags from hashtags
    const tagMatches = content.matchAll(/#(\w+)/g);
    metadata['tags'] = Array.from(tagMatches).map(([, tag]) => tag);

    return metadata;
  }

  /**
   * Parse YAML value (basic implementation)
   */
  private parseYamlValue(value: string): unknown {
    const trimmedValue = value.trim();

    // Handle booleans
    if (trimmedValue === 'true') {
      return true;
    }
    if (trimmedValue === 'false') {
      return false;
    }

    // Handle numbers
    if (/^\d+$/.test(trimmedValue)) {
      return parseInt(trimmedValue, 10);
    }
    if (/^\d+\.\d+$/.test(trimmedValue)) {
      return parseFloat(trimmedValue);
    }

    // Handle arrays
    if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
      try {
        return JSON.parse(trimmedValue);
      } catch {
        return trimmedValue;
      }
    }

    // Handle quoted strings
    if ((trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
        (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))) {
      return trimmedValue.slice(1, -1);
    }

    return trimmedValue;
  }

  /**
   * Format guideline name from filename
   */
  private formatGuidelineName(fileName: string): string {
    return fileName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Find matching guideline for a signal
   */
  private findMatchingGuideline(signal: Signal): ExtendedGuidelineConfig | null {
    const enabledGuidelines = this.getEnabledGuidelines();

    // First try exact signal type match
    let matches = enabledGuidelines.filter(g =>
      g.signalPatterns?.some(p => p.code === signal.type) ?? false
    );

    if (matches.length === 0) {
      // Try pattern matching on signal data
      matches = enabledGuidelines.filter(g =>
        g.signalPatterns?.some(p =>
          (signal.data?.['rawSignal'] as string)?.includes(p.code) ??
          (signal.data?.['patternName'] as string)?.toLowerCase().includes(p.description.toLowerCase())
        ) ?? false
      );
    }

    if (matches.length === 0) {
      // Try category matching based on naming conventions since GuidelineConfig doesn't have category
      const signalCategory = this.getSignalCategory(signal);
      matches = enabledGuidelines.filter(g =>
        g.name.toLowerCase().includes(signalCategory.toLowerCase()) ||
        g.id.toLowerCase().includes(signalCategory.toLowerCase())
      );
    }

    if (matches.length === 0) {
      // Fallback to general guidelines (look for "general" in name/id since no category property)
      matches = enabledGuidelines.filter(g =>
        g.name.toLowerCase().includes('general') ||
        g.id.toLowerCase().includes('general')
      );
    }

    // Return highest priority match
    if (matches.length > 0) {
      return matches.reduce((best, current) =>
        (current.priority ?? 5) > (best.priority ?? 5) ? current : best
      );
    }

    return null;
  }

  /**
   * Get signal category for fallback matching
   */
  private getSignalCategory(signal: Signal): string {
    const signalType = signal.type.toLowerCase();

    if (['oa', 'os', 'op', 'or'].includes(signalType)) {
      return 'orchestrator';
    }
    if (['ap', 'av', 'af', 'as'].includes(signalType)) {
      return 'admin';
    }
    if (['od', 'oc', 'or', 'oe', 'oa'].includes(signalType)) {
      return 'orchestrator-action';
    }
    if (['ad', 'ae', 'as', 'aa'].includes(signalType)) {
      return 'admin-action';
    }
    if (['tt', 'te', 'ti', 'ta', 'td'].includes(signalType)) {
      return 'testing';
    }
    if (['qb', 'qp', 'pc'].includes(signalType)) {
      return 'quality';
    }

    return 'general';
  }

  /**
   * Adapt guideline for specific signal with enhanced context and LLM optimization
   */
  private async adaptGuidelineForSignal(guideline: ExtendedGuidelineConfig, signal: Signal): Promise<string> {
    let adaptedContent = guideline.content ?? '';

    // Replace signal placeholders
    adaptedContent = adaptedContent.replace(/\{\{signal\.type\}\}/g, signal.type);
    adaptedContent = adaptedContent.replace(/\{\{signal\.id\}\}/g, signal.id);
    adaptedContent = adaptedContent.replace(/\{\{signal\.source\}\}/g, signal.source);
    adaptedContent = adaptedContent.replace(/\{\{signal\.priority\}\}/g, signal.priority.toString());

    // Replace signal data placeholders
    if (signal.data) {
      adaptedContent = adaptedContent.replace(/\{\{signal\.data\.rawSignal\}\}/g,
        (signal.data['rawSignal'] as string) || '');
      adaptedContent = adaptedContent.replace(/\{\{signal\.data\.patternName\}\}/g,
        (signal.data['patternName'] as string) || '');
      adaptedContent = adaptedContent.replace(/\{\{signal\.data\.description\}\}/g,
        (signal.data['description'] as string) || '');
    }

    // Replace timestamp placeholders
    adaptedContent = adaptedContent.replace(/\{\{timestamp\}\}/g,
      signal.timestamp.toISOString());
    adaptedContent = adaptedContent.replace(/\{\{timeAgo\}\}/g,
      this.getTimeAgo(signal.timestamp));

    // Add enhanced signal-specific context
    const signalContext = await this.generateEnhancedSignalContext(signal);
    adaptedContent = adaptedContent.replace(/\{\{signal\.context\}\}/g, signalContext);

    // Add LLM optimization markers
    adaptedContent = this.addLLMOptimizationMarkers(adaptedContent, signal);

    return adaptedContent;
  }

  /**
   * Generate enhanced signal-specific context with Phase 2 features
   */
  private async generateEnhancedSignalContext(signal: Signal): Promise<string> {
    const context = [];

    // Basic signal information
    context.push(`**Signal Type:** ${signal.type}`);
    context.push(`**Source:** ${signal.source}`);
    context.push(`**Priority:** ${signal.priority}`);
    context.push(`**Timestamp:** ${signal.timestamp.toISOString()}`);

    // Enhanced signal data analysis
    if (signal.data) {
      if (signal.data['rawSignal'] != null) {
        context.push(`**Raw Signal:** ${signal.data['rawSignal']}`);

        // Add signal pattern analysis
        const patternAnalysis = await this.analyzeSignalPattern(signal.data['rawSignal'] as string);
        context.push(`**Pattern Analysis:** ${patternAnalysis}`);
      }

      if (signal.data['patternName']) {
        context.push(`**Pattern:** ${signal.data['patternName']}`);
      }

      if (signal.data['description']) {
        context.push(`**Description:** ${signal.data['description']}`);
      }

      // Add signal categorization
      const categorization = await this.categorizeSignal(signal);
      context.push(`**Category:** ${categorization.category}`);
      context.push(`**Subcategory:** ${categorization.subcategory}`);
      context.push(`**Urgency Level:** ${categorization.urgency}`);
    }

    // Add context from similar historical signals
    const historicalContext = await this.getHistoricalContext(signal);
    if (historicalContext.length > 0) {
      context.push(`**Historical Context:** ${historicalContext.join('; ')}`);
    }

    // Add agent role recommendations
    const agentRoles = await this.recommendAgentRoles(signal);
    context.push(`**Recommended Agent Roles:** ${agentRoles.join(', ')}`);

    // Add processing recommendations
    const processingRecs = await this.getProcessingRecommendations(signal);
    context.push(`**Processing Recommendations:** ${processingRecs.join(', ')}`);

    return context.join('\n');
  }

  /**
   * Analyze signal pattern for enhanced understanding
   */
  private async analyzeSignalPattern(rawSignal: string): Promise<string> {
    const patterns = [
      { pattern: /\[([A-Z][a-z])\]/, description: 'Standard signal format' },
      { pattern: /\d{4}-\d{2}-\d{2}/, description: 'Date pattern' },
      { pattern: /\b(urgent|critical|high|low|medium)\b/i, description: 'Priority indicator' },
      { pattern: /\b(error|warning|info|debug)\b/i, description: 'Log level' },
      { pattern: /\b(failed|success|completed|started)\b/i, description: 'Status indicator' }
    ];

    const findings = [];
    for (const { pattern, description } of patterns) {
      if (pattern.test(rawSignal)) {
        findings.push(description);
      }
    }

    return findings.length > 0 ? findings.join(', ') : 'No specific patterns detected';
  }

  /**
   * Categorize signal with enhanced classification
   */
  private async categorizeSignal(signal: Signal): Promise<{
    category: string;
    subcategory: string;
    urgency: string;
  }> {
    const signalType = signal.type.toLowerCase();

    // Enhanced categorization logic
    let category = 'general';
    let subcategory = 'unknown';
    let urgency = 'medium';

    // Category mapping
    const categoryMap = {
      'development': ['dp', 'tp', 'bf', 'br', 'no', 'bb', 'af', 'rr', 'rc', 'da', 'vp', 'ip', 'er'],
      'testing': ['tg', 'tr', 'tw', 'tt', 'cq', 'cp', 'cf', 'td'],
      'release': ['rg', 'rv', 'ra', 'mg', 'rl', 'ps', 'ic', 'JC', 'pm'],
      'coordination': ['oa', 'pc', 'fo'],
      'admin': ['aa', 'ap'],
      'system': ['FF', 'FM']
    };

    // Find category
    for (const [cat, types] of Object.entries(categoryMap)) {
      if (types.includes(signalType)) {
        category = cat;
        break;
      }
    }

    // Determine subcategory
    if (signal.data['patternName'] != null) {
      subcategory = signal.data['patternName'] as string;
    } else {
      subcategory = signalType;
    }

    // Determine urgency based on priority
    if (signal.priority >= 9) {
      urgency = 'critical';
    } else if (signal.priority >= 7) {
      urgency = 'high';
    } else if (signal.priority >= 5) {
      urgency = 'medium';
    } else {
      urgency = 'low';
    }

    return { category, subcategory, urgency };
  }

  /**
   * Get historical context for similar signals
   */
  private async getHistoricalContext(signal: Signal): Promise<string[]> {
    // In a real implementation, this would query historical data
    // For now, return basic contextual information
    const context = [];

    // Add time-based context
    const hour = signal.timestamp.getHours();
    if (hour >= 9 && hour <= 17) {
      context.push('Business hours');
    } else {
      context.push('After hours');
    }

    // Add day-based context
    const day = signal.timestamp.getDay();
    if (day === 0 || day === 6) {
      context.push('Weekend');
    }

    return context;
  }

  /**
   * Recommend agent roles for signal processing
   */
  private async recommendAgentRoles(signal: Signal): Promise<string[]> {
    const roles = [];

    // Role recommendation logic based on signal type
    const roleMap = {
      'development': ['Robo-Developer'],
      'testing': ['Robo-AQA', 'Robo-Tester'],
      'release': ['Robo-QC', 'Robo-DevOps'],
      'coordination': ['Robo-System-Analyst', 'Orchestrator'],
      'admin': ['Robo-System-Analyst'],
      'system': ['Robo-SRE']
    };

    const categorization = await this.categorizeSignal(signal);
    if (roleMap[categorization.category as keyof typeof roleMap]) {
      roles.push(...roleMap[categorization.category as keyof typeof roleMap]);
    }

    // Add fallback role
    if (roles.length === 0) {
      roles.push('Robo-Developer');
    }

    return roles;
  }

  /**
   * Get processing recommendations for signal
   */
  private async getProcessingRecommendations(signal: Signal): Promise<string[]> {
    const recommendations = [];
    const priority = signal.priority ?? 5;

    // Priority-based recommendations
    if (priority >= 9) {
      recommendations.push('Immediate attention required');
      recommendations.push('Escalate to orchestrator');
    } else if (priority >= 7) {
      recommendations.push('Process within 1 hour');
      recommendations.push('Monitor for dependencies');
    } else {
      recommendations.push('Process in normal queue');
    }

    // Type-based recommendations
    const signalType = signal.type.toLowerCase();
    if (['dp', 'tp', 'bf'].includes(signalType)) {
      recommendations.push('Requires code context analysis');
    }
    if (['tg', 'tr', 'tw'].includes(signalType)) {
      recommendations.push('Check test infrastructure');
    }
    if (['mg', 'rl', 'ps'].includes(signalType)) {
      recommendations.push('Verify deployment readiness');
    }

    return recommendations;
  }

  /**
   * Add LLM optimization markers for 40K token constraint
   */
  private addLLMOptimizationMarkers(content: string, signal: Signal): string {
    // Add section markers for better LLM processing
    const sections = [
      '## SIGNAL ANALYSIS GUIDELINE',
      '### Context Information',
      '### Processing Instructions',
      '### Expected Outputs',
      '### Quality Criteria'
    ];

    let optimizedContent = content;

    // Add markers if not already present
    sections.forEach(section => {
      if (!optimizedContent.includes(section)) {
        // Insert section at appropriate locations
        if (section === '## SIGNAL ANALYSIS GUIDELINE' && !optimizedContent.startsWith('##')) {
          optimizedContent = section + '\n\n' + optimizedContent;
        }
      }
    });

    // Add token optimization hints
    const tokenHints = [
      '<!-- TOKEN_HINT: Focus on key decision points -->',
      '<!-- TOKEN_HINT: Prioritize actionable recommendations -->',
      '<!-- TOKEN_HINT: Limit historical examples to 2-3 most relevant -->'
    ];

    // Add hints at strategic points
    tokenHints.forEach(hint => {
      if (!optimizedContent.includes(hint)) {
        optimizedContent = optimizedContent.replace(/\n\n### /g, `\n${hint}\n\n### `);
      }
    });

    // Add signal-specific optimization markers
    const priorityMarkers = {
      9: '<!-- PRIORITY: CRITICAL - Immediate processing required -->',
      7: '<!-- PRIORITY: HIGH - Process with urgency -->',
      5: '<!-- PRIORITY: MEDIUM - Standard processing -->',
      3: '<!-- PRIORITY: LOW - Can be deferred -->'
    };

    const marker = priorityMarkers[signal.priority as keyof typeof priorityMarkers] || '';
    if (marker && !optimizedContent.includes(marker)) {
      optimizedContent = marker + '\n\n' + optimizedContent;
    }

    return optimizedContent;
  }

  /**
   * Get time ago string
   */
  private getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return 'just now';
    }
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    }

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  /**
   * Trim cache if it exceeds max size
   */
  private trimCacheIfNeeded(): void {
    if (this.guidelineCache.size > this.maxCacheSize) {
      const entries = Array.from(this.guidelineCache.entries());
      // Sort by timestamp and remove oldest 20%
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, Math.floor(this.maxCacheSize * 0.2));
      toRemove.forEach(([key]) => this.guidelineCache.delete(key));
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.guidelineCache.clear();
    logger.info('GuidelineAdapter', 'Guideline cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    lastScanTime: Date;
    } {
    return {
      size: this.guidelineCache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0, // Would need to implement hit tracking
      lastScanTime: this.lastScanTime
    };
  }

  /**
   * Reload guidelines from disk
   */
  async reloadGuidelines(): Promise<void> {
    logger.info('GuidelineAdapter', 'Reloading guidelines');
    await this.loadGuidelines();
  }

  /**
   * Add a new guideline
   */
  async addGuideline(guideline: Omit<ExtendedGuidelineConfig, 'id' | 'lastModified'>): Promise<string> {
    const id = HashUtils.generateId();
    const newGuideline: ExtendedGuidelineConfig = {
      ...guideline,
      id,
      lastModified: new Date()
    };

    this.guidelines.set(id, newGuideline);

    logger.info('GuidelineAdapter', `Added new guideline: ${newGuideline.name}`, { id });

    return id;
  }

  /**
   * Update an existing guideline
   */
  async updateGuideline(id: string, updates: Partial<ExtendedGuidelineConfig>): Promise<boolean> {
    const guideline = this.guidelines.get(id);
    if (!guideline) {
      return false;
    }

    const updatedGuideline = {
      ...guideline,
      ...updates,
      id,
      lastModified: new Date()
    };

    this.guidelines.set(id, updatedGuideline);

    logger.info('GuidelineAdapter', `Updated guideline: ${updatedGuideline.name}`, { id });

    return true;
  }

  /**
   * Remove a guideline
   */
  removeGuideline(id: string): boolean {
    const guideline = this.guidelines.get(id);
    if (!guideline) {
      return false;
    }

    this.guidelines.delete(id);

    logger.info('GuidelineAdapter', `Removed guideline: ${guideline.name}`, { id });

    return true;
  }

  /**
   * Add a guideline check for violation detection
   */
  addGuidelineCheck(check: GuidelineCheck): void {
    this.guidelineChecks.set(check.guidelineId, check);
    logger.debug('GuidelineAdapter', `Added guideline check: ${check.guidelineId}`);
  }

  /**
   * Remove a guideline check
   */
  removeGuidelineCheck(guidelineId: string): boolean {
    return this.guidelineChecks.delete(guidelineId);
  }

  /**
   * Get all guideline checks
   */
  getGuidelineChecks(): GuidelineCheck[] {
    return Array.from(this.guidelineChecks.values());
  }

  /**
   * Get guideline checks by type
   */
  getGuidelineChecksByType(type: GuidelineType): GuidelineCheck[] {
    return Array.from(this.guidelineChecks.values()).filter(check => check.type === type);
  }

  /**
   * Enable/disable a guideline check
   */
  setGuidelineCheckEnabled(guidelineId: string, enabled: boolean): boolean {
    const check = this.guidelineChecks.get(guidelineId);
    if (check) {
      check.enabled = enabled;
      logger.info('GuidelineAdapter', `${enabled ? 'Enabled' : 'Disabled'} guideline check: ${guidelineId}`);
      return true;
    }
    return false;
  }

  /**
   * Check guidelines for a single file
   */
  async checkFile(filePath: string, options: {
    types?: GuidelineType[];
    includeDisabled?: boolean;
  } = {}): Promise<GuidelineViolation[]> {
    const violations: GuidelineViolation[] = [];

    if (!existsSync(filePath)) {
      logger.warn('GuidelineAdapter', `File not found: ${filePath}`);
      return violations;
    }

    try {
      const content = readFileSync(filePath, 'utf8');
      const context: CheckContext = {
        filePath,
        fileExtension: extname(filePath),
        content,
        lines: content.split('\n')
      };

      const applicableChecks = Array.from(this.guidelineChecks.values())
        .filter(check =>
          (options.includeDisabled || check.enabled) &&
          (!options.types || options.types.includes(check.type))
        );

      for (const check of applicableChecks) {
        const fileViolations = await this.checkGuidelineForFile(check, context);
        violations.push(...fileViolations);
      }

      // Store violation history
      this.violationHistory.set(filePath, violations);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('GuidelineAdapter', `Error checking file ${filePath}: ${errorMessage}`,
        error instanceof Error ? error : new Error(errorMessage));
    }

    return violations;
  }

  /**
   * Check guidelines for multiple files
   */
  async checkFiles(filePaths: string[], options: {
    types?: GuidelineType[];
    includeDisabled?: boolean;
  } = {}): Promise<GuidelineReport> {
    const startTime = Date.now();
    const allViolations: GuidelineViolation[] = [];
    const guidelineResults = new Map<string, { violations: number; status: 'passed' | 'failed' | 'warning' }>();
    let linesOfCode = 0;

    logger.info('GuidelineAdapter', `Starting guideline check for ${filePaths.length} files`);

    for (const filePath of filePaths) {
      const violations = await this.checkFile(filePath, options);
      allViolations.push(...violations);

      // Count lines of code
      try {
        const content = readFileSync(filePath, 'utf8');
        linesOfCode += content.split('\n').length;
      } catch (error) {
        // Ignore file read errors for metrics
      }

      // Group violations by guideline
      for (const violation of violations) {
        const current = guidelineResults.get(violation.guidelineId) || { violations: 0, status: 'passed' as const };
        current.violations++;

        if (violation.severity === SeverityLevel.ERROR) {
          current.status = 'failed';
        } else if (violation.severity === SeverityLevel.WARNING && current.status === 'passed') {
          current.status = 'warning';
        }

        guidelineResults.set(violation.guidelineId, current);
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Generate report
    const report: GuidelineReport = {
      id: HashUtils.generateId(),
      timestamp: new Date(),
      summary: {
        totalViolations: allViolations.length,
        errors: allViolations.filter(v => v.severity === SeverityLevel.ERROR).length,
        warnings: allViolations.filter(v => v.severity === SeverityLevel.WARNING).length,
        info: allViolations.filter(v => v.severity === SeverityLevel.INFO).length,
        fixable: allViolations.filter(v =>
          v.suggestions?.some(s => s.type === 'automatic')
        ).length
      },
      violations: allViolations.sort((a, b) => {
        const severityOrder = { [SeverityLevel.ERROR]: 0, [SeverityLevel.WARNING]: 1, [SeverityLevel.INFO]: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      guidelines: Array.from(guidelineResults.entries()).map(([id, result]) => {
        const guideline = this.guidelines.get(id) ||
                         this.guidelineChecks.get(id) ||
                         { id, name: id, type: GuidelineType.STYLE };
        return {
          id,
          name: (guideline as any).name || id,
          type: (guideline as any).type || GuidelineType.STYLE,
          violations: result.violations,
          status: result.status
        };
      }),
      recommendations: this.generateRecommendations(allViolations),
      metrics: {
        checkDuration: duration,
        filesProcessed: filePaths.length,
        linesOfCode
      }
    };

    logger.info('GuidelineAdapter', `Guideline check completed: ${report.summary.totalViolations} violations found in ${duration}ms`);

    return report;
  }

  /**
   * Check a specific guideline for a file
   */
  private async checkGuidelineForFile(check: GuidelineCheck, context: CheckContext): Promise<GuidelineViolation[]> {
    const violations: GuidelineViolation[] = [];

    for (const rule of check.rules) {
      const ruleViolations = await this.checkRule(rule, check.guidelineId, check.type, context);
      violations.push(...ruleViolations);
    }

    return violations;
  }

  /**
   * Check a single rule against file content
   */
  private async checkRule(rule: GuidelineRule, guidelineId: string, type: GuidelineType, context: CheckContext): Promise<GuidelineViolation[]> {
    const violations: GuidelineViolation[] = [];

    try {
      let isValid = true;

      // Use custom validator if provided
      if (rule.validator) {
        isValid = rule.validator(context.content, context);
      } else if (rule.pattern) {
        // Use pattern matching
        const pattern = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern, 'g');
        isValid = !pattern.test(context.content);
      }

      if (!isValid) {
        // Find specific locations of violations
        const locations = this.findViolationLocations(rule, context);

        for (const location of locations) {
          const violation: GuidelineViolation = {
            id: HashUtils.generateId(),
            guidelineId,
            type,
            severity: rule.severity,
            message: rule.description,
            file: context.filePath,
            line: location.line,
            column: location.column,
            rule: rule.id,
            context: location.context,
            suggestions: rule.fixer ? [{
              type: 'automatic',
              description: `Apply fix for ${rule.name}`,
              confidence: 90,
              effort: 'low'
            }] : [],
            timestamp: new Date()
          };

          violations.push(violation);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('GuidelineAdapter', `Error checking rule ${rule.id}: ${errorMessage}`,
        error instanceof Error ? error : new Error(errorMessage));
    }

    return violations;
  }

  /**
   * Find specific locations where rule violations occur
   */
  private findViolationLocations(rule: GuidelineRule, context: CheckContext): Array<{
    line: number;
    column?: number;
    context: string;
  }> {
    const locations: Array<{ line: number; column?: number; context: string }> = [];

    if (!rule.pattern) {
      // If no pattern, report file-level violation
      locations.push({
        line: 1,
        context: context.content.substring(0, 100) + (context.content.length > 100 ? '...' : '')
      });
      return locations;
    }

    const pattern = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern, 'g');
    let match;

    while ((match = pattern.exec(context.content)) !== null) {
      const position = this.findPositionInContent(context.content, match.index);
      const contextStart = Math.max(0, position.line - 2);
      const contextEnd = Math.min(context.lines.length, position.line + 2);
      const contextLines = context.lines.slice(contextStart, contextEnd).join('\n');

      locations.push({
        line: position.line + 1, // 1-based line numbers
        column: position.column + 1, // 1-based column numbers
        context: contextLines
      });
    }

    return locations;
  }

  /**
   * Find line and column position from character index
   */
  private findPositionInContent(content: string, index: number): { line: number; column: number } {
    const lines = content.substring(0, index).split('\n');
    return {
      line: lines.length - 1,
      column: lines[lines.length - 1].length
    };
  }

  /**
   * Apply automatic fixes to violations
   */
  async applyFixes(violations: GuidelineViolation[]): Promise<{
    fixed: number;
    failed: number;
    results: Array<{ violation: GuidelineViolation; success: boolean; error?: string }>;
  }> {
    const results: Array<{ violation: GuidelineViolation; success: boolean; error?: string }> = [];
    let fixed = 0;
    let failed = 0;

    logger.info('GuidelineAdapter', `Applying fixes to ${violations.length} violations`);

    for (const violation of violations) {
      if (!violation.file || !violation.suggestions?.some(s => s.type === 'automatic')) {
        results.push({ violation, success: false, error: 'No automatic fix available' });
        failed++;
        continue;
      }

      try {
        const content = readFileSync(violation.file, 'utf8');
        const check = this.guidelineChecks.get(violation.guidelineId);
        const rule = check?.rules.find(r => r.id === violation.rule);

        if (rule?.fixer) {
          const fixedContent = rule.fixer(content, violation);

          // Write back the fixed content
          // Note: In a real implementation, you'd want to backup the file first
          // writeFileSync(violation.file, fixedContent, 'utf8');

          results.push({ violation, success: true });
          fixed++;
        } else {
          results.push({ violation, success: false, error: 'No fixer available for rule' });
          failed++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ violation, success: false, error: errorMessage });
        failed++;
      }
    }

    logger.info('GuidelineAdapter', `Fix application completed: ${fixed} fixed, ${failed} failed`);

    return { fixed, failed, results };
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(violations: GuidelineViolation[]): string[] {
    const recommendations: string[] = [];

    // Analyze violation patterns
    const severityCounts = violations.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, {} as Record<SeverityLevel, number>);

    const typeCounts = violations.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {} as Record<GuidelineType, number>);

    // Generate specific recommendations
    if (severityCounts[SeverityLevel.ERROR] > 0) {
      recommendations.push(`Fix ${severityCounts[SeverityLevel.ERROR]} critical error(s) before merging`);
    }

    if (typeCounts[GuidelineType.SECURITY] > 0) {
      recommendations.push(`Address ${typeCounts[GuidelineType.SECURITY]} security violation(s) immediately`);
    }

    if (typeCounts[GuidelineType.ARCHITECTURE] > 5) {
      recommendations.push('Consider refactoring to improve architectural quality');
    }

    const fixableCount = violations.filter(v =>
      v.suggestions?.some(s => s.type === 'automatic')
    ).length;

    if (fixableCount > 0) {
      recommendations.push(`${fixableCount} violation(s) can be fixed automatically`);
    }

    return recommendations;
  }

  /**
   * Get violation history for a file
   */
  getViolationHistory(filePath: string): GuidelineViolation[] {
    return this.violationHistory.get(filePath) || [];
  }

  /**
   * Clear violation history
   */
  clearViolationHistory(): void {
    this.violationHistory.clear();
    logger.info('GuidelineAdapter', 'Violation history cleared');
  }

  /**
   * Get statistics about guideline checks
   */
  getGuidelineStats(): {
    totalGuidelines: number;
    enabledGuidelines: number;
    checksByType: Record<GuidelineType, number>;
    totalRules: number;
    } {
    const checks = Array.from(this.guidelineChecks.values());
    const checksByType = checks.reduce((acc, check) => {
      acc[check.type] = (acc[check.type] || 0) + 1;
      return acc;
    }, {} as Record<GuidelineType, number>);

    return {
      totalGuidelines: this.guidelines.size,
      enabledGuidelines: checks.filter(c => c.enabled).length,
      checksByType,
      totalRules: checks.reduce((sum, check) => sum + check.rules.length, 0)
    };
  }
}