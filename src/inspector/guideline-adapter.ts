/**
 * ♫ Guideline Adapter for @dcversus/prp Inspector
 *
 * Adapts guidelines for signal processing with dynamic loading and caching.
 */

import { readFileSync } from 'fs';
import { join, resolve } from 'path';

// For now, use a relative path approach
const __dirname = resolve('.');
import { GuidelineConfig, Signal } from '../shared/types';
import { createLayerLogger, HashUtils } from '../shared';

const logger = createLayerLogger('inspector');

// Extended interface for internal guideline management
interface ExtendedGuidelineConfig extends GuidelineConfig {
  signalPatterns?: Array<{
    code: string;
    description: string;
  }>;
  priority?: number;
  content?: string;
  lastModified?: Date;
}

interface CacheEntry {
  guideline: string;
  timestamp: number;
}

/**
 * Guideline Adapter - Loads and adapts guidelines for signal processing
 */
export class GuidelineAdapter {
  private guidelines: Map<string, ExtendedGuidelineConfig> = new Map();
  private guidelineCache: Map<string, CacheEntry> = new Map();
  private guidelinesPath: string;
  private lastScanTime: Date = new Date(0);
  private cacheEnabled: boolean;
  private maxCacheSize: number;

  constructor(guidelinesPath?: string) {
    this.guidelinesPath = guidelinesPath || resolve(__dirname, '../guidelines');
    this.cacheEnabled = true;
    this.maxCacheSize = 1000;
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
      const cacheKey = await HashUtils.hashString(`${signal.type}-${signal.data?.['rawSignal'] || ''}`);
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
    return this.guidelines.get(id) || null;
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
      const fileName = filePath.split('/').pop()?.replace('.md', '') || '';

      // Parse guideline metadata from content
      const metadata = this.parseGuidelineMetadata(content, fileName);

      const guideline: ExtendedGuidelineConfig = {
        id: (metadata['id'] as string) || HashUtils.generateId(),
        name: (metadata['name'] as string) || this.formatGuidelineName(fileName),
        enabled: (metadata['enabled'] as boolean) !== false,
        protocol: {
          id: `protocol-${(metadata['id'] as string) || HashUtils.generateId()}`,
          description: (metadata['description'] as string) || '',
          steps: [],
          decisionPoints: [],
          successCriteria: [],
          fallbackActions: []
        },
        requirements: [], // Parse proper GuidelineRequirement objects from metadata if needed
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
    value = value.trim();

    // Handle booleans
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Handle numbers
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

    // Handle arrays
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    // Handle quoted strings
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    return value;
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
      g.signalPatterns?.some(p => p.code === signal.type) || false
    );

    if (matches.length === 0) {
      // Try pattern matching on signal data
      matches = enabledGuidelines.filter(g =>
        g.signalPatterns?.some(p =>
          (signal.data?.['rawSignal'] as string)?.includes(p.code) ||
          (signal.data?.['patternName'] as string)?.toLowerCase().includes(p.description.toLowerCase())
        ) || false
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
        (current.priority || 5) > (best.priority || 5) ? current : best
      );
    }

    return null;
  }

  /**
   * Get signal category for fallback matching
   */
  private getSignalCategory(signal: Signal): string {
    const signalType = signal.type.toLowerCase();

    if (['oa', 'os', 'op', 'or'].includes(signalType)) return 'orchestrator';
    if (['ap', 'av', 'af', 'as'].includes(signalType)) return 'admin';
    if (['od', 'oc', 'or', 'oe', 'oa'].includes(signalType)) return 'orchestrator-action';
    if (['ad', 'ae', 'as', 'aa'].includes(signalType)) return 'admin-action';
    if (['tt', 'te', 'ti', 'ta', 'td'].includes(signalType)) return 'testing';
    if (['qb', 'qp', 'pc'].includes(signalType)) return 'quality';

    return 'general';
  }

  /**
   * Adapt guideline for specific signal with enhanced context and LLM optimization
   */
  private async adaptGuidelineForSignal(guideline: ExtendedGuidelineConfig, signal: Signal): Promise<string> {
    let adaptedContent = guideline.content || '';

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
      if (signal.data['rawSignal']) {
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
    if (signal.data?.['patternName']) {
      subcategory = signal.data['patternName'] as string;
    } else {
      subcategory = signalType;
    }

    // Determine urgency based on priority
    if (signal.priority >= 9) urgency = 'critical';
    else if (signal.priority >= 7) urgency = 'high';
    else if (signal.priority >= 5) urgency = 'medium';
    else urgency = 'low';

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
    const priority = signal.priority || 5;

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

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

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
}