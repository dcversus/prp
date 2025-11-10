/**
 * ♫ Enhanced Context Manager for @dcversus/prp Orchestrator
 *
 * Manages modular prompt construction and context synchronization
 * across PRPs, agents, and shared memory with war-room memo format
 * and async compaction capabilities.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { Signal, PRPFile } from '../shared/types';
import { createLayerLogger } from '../shared';
import { EventEmitter } from 'events';

// Placeholder types for missing definitions
// Enhanced interfaces for war-room memo format and async compaction
interface WarRoomMemo {
  done: string[];        // Completed tasks/resolved issues
  doing: string[];       // Currently in progress
  next: string[];        // Next actions/priorities
  blockers: string[];    // Current blockers and issues
  notes: string[];       // General notes and observations
  lastUpdated: Date;
  maxItems: number;      // Maximum items per section
}

interface CompactionConfig {
  enabled: boolean;
  threshold: number;     // Percentage (0-1) when to trigger compaction
  targetSize: number;    // Target size after compaction
  preserveRecent: number; // Number of recent items to preserve
  preserveImportant: boolean; // Preserve high-priority items
  async: boolean;        // Perform compaction asynchronously
}

interface ContextSection {
  id: string;
  name: string;
  content: string;
  tokens: number;
  priority: number;
  lastAccessed: Date;
  accessCount: number;
  compressible: boolean;
  dependencies: string[];
}

interface SharedContext {
  signals: unknown[];
  notes: unknown[];
  agents: unknown[];
  metrics: unknown;
  warzone: {
    blockers: { description: string; priority: number }[];
    completed: { description: string; prp: string }[];
    next: { description: string; priority: number }[];
    notes: string[];
  };
  warRoom: WarRoomMemo;  // Enhanced war-room memo format
  agentStatuses: Map<string, unknown>;
  systemMetrics: {
    tokensUsed: number;
    tokensLimit: number;
    activeAgents: number;
    processingSignals: number;
    averageResponseTime: number;
    errorRate: number;
  };
  sections: Map<string, ContextSection>; // Modular context sections
  compaction: CompactionConfig;
}

interface ContextWindow {
  total: number;
  used: number;
  available: number;
  sections: {
    agents: number;
    shared: number;
    prp: number;
    tools: number;
    system: number;
  };
}

interface PromptSection {
  id: string;
  type: string;
  content: string;
  tokens: number;
  compressible: boolean;
}

const logger = createLayerLogger('orchestrator');

interface ContextLimits {
  prp: number;
  shared: number;
  agents: number;
  tools: number;
  system: number;
  total: number;
}

/**
 * Enhanced Context Manager - Handles prompt construction and context management
 * with war-room memo format and async compaction capabilities
 */
export class ContextManager extends EventEmitter {
  private contextLimits: ContextLimits;
  private sharedContext: SharedContext;
  private prpContexts: Map<string, ContextSection[]> = new Map();
  private agentContexts: Map<string, ContextSection[]> = new Map();
  private noteCache: Map<string, unknown> = new Map();
  private storagePath: string;
  private _maxCacheSize: number;
  private compactionInProgress = false;

  constructor(contextLimits: Partial<ContextLimits> = {}) {
    super();

    this.contextLimits = {
      prp: contextLimits.prp ?? 30000,
      shared: contextLimits.shared ?? 10000,
      agents: contextLimits.agents ?? 20000,
      tools: contextLimits.tools ?? 5000,
      system: contextLimits.system ?? 5000,
      total: contextLimits.total ?? 200000
    };

    // Initialize war-room memo format
    const warRoomMemo: WarRoomMemo = {
      done: [],
      doing: [],
      next: [],
      blockers: [],
      notes: [],
      lastUpdated: new Date(),
      maxItems: 50 // Maximum items per section
    };

    // Initialize compaction configuration
    const compactionConfig: CompactionConfig = {
      enabled: true,
      threshold: 0.85, // Trigger at 85% capacity
      targetSize: 0.7, // Compact to 70% of capacity
      preserveRecent: 10, // Preserve 10 most recent items
      preserveImportant: true,
      async: true
    };

    this.sharedContext = {
      signals: [],
      notes: [],
      agents: [],
      metrics: {},
      warzone: {
        blockers: [],
        completed: [],
        next: [],
        notes: []
      },
      warRoom: warRoomMemo, // Enhanced war-room memo format
      agentStatuses: new Map(),
      sections: new Map(), // Modular context sections
      compaction: compactionConfig,
      systemMetrics: {
        tokensUsed: 0,
        tokensLimit: this.contextLimits.total,
        activeAgents: 0,
        processingSignals: 0,
        averageResponseTime: 0,
        errorRate: 0
      }
    };

    this.storagePath = resolve(process.cwd(), '.prp', 'context');
    this._maxCacheSize = 1000;

    this.ensureStorageDirectory();
  }

  /**
   * Initialize the context manager
   */
  async initialize(): Promise<void> {
    logger.info('initialize', 'Initializing context manager');

    try {
      // Load persisted context
      await this.loadPersistedContext();

      // Load notes from filesystem
      await this.loadNotes();

      // Initialize war-room memo format
      this.initializeWarRoomMemo();

      logger.info('initialize', 'Context manager initialized successfully');
    } catch (error) {
      logger.error('initialize', 'Failed to initialize context manager',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * War-Room Memo Management Methods
   */

  /**
   * Initialize war-room memo format
   */
  private initializeWarRoomMemo(): void {
    // Sync existing warzone data to war-room memo format
    const warzone = this.sharedContext.warzone;
    const warRoom = this.sharedContext.warRoom;

    // Transfer blockers
    warRoom.blockers = warzone.blockers.map(b => b.description);

    // Transfer completed items
    warRoom.done = warzone.completed.map(c => `${c.description} (${c.prp})`);

    // Transfer next actions
    warRoom.next = warzone.next.map(n => n.description);

    // Transfer notes
    warRoom.notes = warzone.notes;

    warRoom.lastUpdated = new Date();

    logger.info('initializeWarRoomMemo', 'War-room memo format initialized', {
      blockers: warRoom.blockers.length,
      done: warRoom.done.length,
      next: warRoom.next.length,
      notes: warRoom.notes.length
    });
  }

  /**
   * Add item to war-room memo
   */
  addToWarRoom(section: keyof Omit<WarRoomMemo, 'lastUpdated' | 'maxItems'>, item: string): void {
    const warRoom = this.sharedContext.warRoom;

    // Add item to section
    warRoom[section].push(item);

    // Maintain max items limit
    if (warRoom[section].length > warRoom.maxItems) {
      warRoom[section] = warRoom[section].slice(-warRoom.maxItems);
    }

    warRoom.lastUpdated = new Date();

    // Check if compaction is needed
    this.checkCompactionNeeded();

    logger.debug('addToWarRoom', 'Item added to war-room memo', {
      section,
      itemCount: warRoom[section].length
    });

    this.emit('warRoom_updated', { section, item, timestamp: warRoom.lastUpdated });
  }

  /**
   * Get war-room memo status
   */
  getWarRoomStatus(): WarRoomMemo & {
    totalItems: number;
    lastAction: string;
    } {
    const warRoom = this.sharedContext.warRoom;
    const totalItems = warRoom.done.length + warRoom.doing.length +
                      warRoom.next.length + warRoom.blockers.length + warRoom.notes.length;

    return {
      ...warRoom,
      totalItems,
      lastAction: this.getLastWarRoomAction()
    };
  }

  /**
   * Move item between war-room sections
   */
  moveInWarRoom(fromSection: keyof Omit<WarRoomMemo, 'lastUpdated' | 'maxItems'>,
    toSection: keyof Omit<WarRoomMemo, 'lastUpdated' | 'maxItems'>,
    item: string): boolean {
    const warRoom = this.sharedContext.warRoom;
    const fromIndex = warRoom[fromSection].indexOf(item);

    if (fromIndex === -1) {
      logger.warn('moveInWarRoom', 'Item not found in source section', {
        fromSection,
        item
      });
      return false;
    }

    // Remove from source section
    warRoom[fromSection].splice(fromIndex, 1);

    // Add to target section
    warRoom[toSection].push(item);

    // Maintain max items limit
    if (warRoom[toSection].length > warRoom.maxItems) {
      warRoom[toSection] = warRoom[toSection].slice(-warRoom.maxItems);
    }

    warRoom.lastUpdated = new Date();

    logger.debug('moveInWarRoom', 'Item moved between sections', {
      fromSection,
      toSection,
      item
    });

    this.emit('warRoom_item_moved', {
      fromSection,
      toSection,
      item,
      timestamp: warRoom.lastUpdated
    });

    return true;
  }

  /**
   * Archive old war-room items
   */
  archiveWarRoomItems(olderThanDays: number = 7): number {
    const warRoom = this.sharedContext.warRoom;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let archivedCount = 0;

    // Archive old items from each section (keep recent items)
    ['done', 'doing', 'next', 'blockers', 'notes'].forEach(section => {
      const sectionKey = section as keyof Omit<WarRoomMemo, 'lastUpdated' | 'maxItems'>;
      const originalLength = warRoom[sectionKey].length;

      // Keep only recent items (simplified logic)
      const keepCount = Math.min(warRoom.maxItems / 2, 20);
      warRoom[sectionKey] = warRoom[sectionKey].slice(-keepCount);

      archivedCount += originalLength - warRoom[sectionKey].length;
    });

    warRoom.lastUpdated = new Date();

    logger.info('archiveWarRoomItems', 'War-room items archived', {
      archivedCount,
      cutoffDate
    });

    this.emit('warRoom_archived', {
      archivedCount,
      cutoffDate,
      timestamp: warRoom.lastUpdated
    });

    return archivedCount;
  }

  /**
   * Get last war-room action
   */
  private getLastWarRoomAction(): string {
    const warRoom = this.sharedContext.warRoom;
    const sections = ['done', 'doing', 'next', 'blockers', 'notes'];

    let latestSection = '';
    let latestCount = 0;

    sections.forEach(section => {
      const sectionKey = section as keyof Omit<WarRoomMemo, 'lastUpdated' | 'maxItems'>;
      const count = warRoom[sectionKey].length;
      if (count > latestCount) {
        latestCount = count;
        latestSection = section;
      }
    });

    return latestSection || 'none';
  }

  /**
   * Async Compaction Methods
   */

  /**
   * Check if compaction is needed
   */
  private checkCompactionNeeded(): void {
    if (!this.sharedContext.compaction.enabled || this.compactionInProgress) {
      return;
    }

    const totalTokens = this.calculateTotalTokens();
    const threshold = this.contextLimits.total * this.sharedContext.compaction.threshold;

    if (totalTokens >= threshold) {
      logger.info('checkCompactionNeeded', 'Compaction threshold reached', {
        totalTokens,
        threshold,
        percentage: (totalTokens / this.contextLimits.total) * 100
      });

      if (this.sharedContext.compaction.async) {
        // Perform async compaction
        setImmediate(() => this.performAsyncCompaction());
      } else {
        // Perform synchronous compaction
        this.performCompaction();
      }
    }
  }

  /**
   * Perform async compaction
   */
  private async performAsyncCompaction(): Promise<void> {
    if (this.compactionInProgress) {
      return;
    }

    this.compactionInProgress = true;

    try {
      logger.info('performAsyncCompaction', 'Starting async context compaction');
      this.emit('compaction_started', { async: true });

      const startTime = Date.now();

      // Compact war-room memo
      this.compactWarRoomMemo();

      // Compact context sections
      await this.compactContextSections();

      // Compact PRP contexts
      await this.compactPRPContexts();

      // Compact agent contexts
      await this.compactAgentContexts();

      const duration = Date.now() - startTime;
      const tokensAfter = this.calculateTotalTokens();

      logger.info('performAsyncCompaction', 'Async compaction completed', {
        duration,
        tokensAfter,
        reductionPercentage: ((this.contextLimits.total - tokensAfter) / this.contextLimits.total) * 100
      });

      this.emit('compaction_completed', {
        async: true,
        duration,
        tokensAfter,
        tokensBefore: this.contextLimits.total
      });

    } catch (error) {
      logger.error('performAsyncCompaction', 'Async compaction failed');
      this.emit('compaction_failed', {
        async: true,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      this.compactionInProgress = false;
    }
  }

  /**
   * Perform synchronous compaction
   */
  performCompaction(targetSize?: number): boolean {
    try {
      const target = targetSize || (this.contextLimits.total * this.sharedContext.compaction.targetSize);

      logger.info('performCompaction', 'Starting context compaction', {
        currentSize: this.calculateTotalTokens(),
        targetSize: target
      });

      this.emit('compaction_started', { async: false });

      // Compact war-room memo
      this.compactWarRoomMemo();

      // Compact context sections
      this.compactContextSectionsSync();

      const finalSize = this.calculateTotalTokens();

      logger.info('performCompaction', 'Compaction completed', {
        originalSize: this.contextLimits.total,
        finalSize,
        reduction: this.contextLimits.total - finalSize
      });

      this.emit('compaction_completed', {
        async: false,
        finalSize,
        originalSize: this.contextLimits.total
      });

      return true;

    } catch (error) {
      logger.error('performCompaction', 'Compaction failed');
      this.emit('compaction_failed', {
        async: false,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Compact war-room memo
   */
  private compactWarRoomMemo(): void {
    const warRoom = this.sharedContext.warRoom;
    const preserveRecent = this.sharedContext.compaction.preserveRecent;

    ['done', 'doing', 'next', 'blockers', 'notes'].forEach(section => {
      const sectionKey = section as keyof Omit<WarRoomMemo, 'lastUpdated' | 'maxItems'>;
      const originalLength = warRoom[sectionKey].length;

      // Keep only recent items
      warRoom[sectionKey] = warRoom[sectionKey].slice(-preserveRecent);

      logger.debug('compactWarRoomMemo', 'Section compacted', {
        section,
        originalLength,
        newLength: warRoom[sectionKey].length
      });
    });

    warRoom.lastUpdated = new Date();
  }

  /**
   * Compact context sections asynchronously
   */
  private async compactContextSections(): Promise<void> {
    const targetSize = this.contextLimits.total * this.sharedContext.compaction.targetSize;
    const preserveRecent = this.sharedContext.compaction.preserveRecent;

    for (const [sectionId, section] of this.sharedContext.sections) {
      if (section.compressible && section.lastAccessed < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        // Compress section content (simplified)
        const originalLength = section.content.length;
        section.content = section.content.slice(-Math.floor(targetSize / 10));
        section.lastAccessed = new Date();

        logger.debug('compactContextSections', 'Section compacted', {
          sectionId,
          originalLength,
          newLength: section.content.length
        });
      }
    }
  }

  /**
   * Compact context sections synchronously
   */
  private compactContextSectionsSync(): void {
    const targetSize = this.contextLimits.total * this.sharedContext.compaction.targetSize;

    for (const [sectionId, section] of this.sharedContext.sections) {
      if (section.compressible) {
        // Simple content truncation
        section.content = section.content.slice(-Math.floor(targetSize / this.sharedContext.sections.size));
        section.lastAccessed = new Date();
      }
    }
  }

  /**
   * Compact PRP contexts
   */
  private async compactPRPContexts(): Promise<void> {
    const preserveRecent = this.sharedContext.compaction.preserveRecent;

    for (const [prpId, sections] of this.prpContexts) {
      // Keep only recent sections
      if (sections.length > preserveRecent) {
        this.prpContexts.set(prpId, sections.slice(-preserveRecent));
      }
    }
  }

  /**
   * Compact agent contexts
   */
  private async compactAgentContexts(): Promise<void> {
    const preserveRecent = this.sharedContext.compaction.preserveRecent;

    for (const [agentId, sections] of this.agentContexts) {
      // Keep only recent sections
      if (sections.length > preserveRecent) {
        this.agentContexts.set(agentId, sections.slice(-preserveRecent));
      }
    }
  }

  /**
   * Calculate total tokens in context
   */
  private calculateTotalTokens(): number {
    let totalTokens = 0;

    // War-room memo tokens
    const warRoom = this.sharedContext.warRoom;
    totalTokens += JSON.stringify(warRoom).length / 4; // Rough estimate

    // Context sections tokens
    for (const section of this.sharedContext.sections.values()) {
      totalTokens += section.tokens;
    }

    // PRP context tokens
    for (const sections of this.prpContexts.values()) {
      totalTokens += sections.reduce((sum, section) => sum + section.tokens, 0);
    }

    // Agent context tokens
    for (const sections of this.agentContexts.values()) {
      totalTokens += sections.reduce((sum, section) => sum + section.tokens, 0);
    }

    return Math.floor(totalTokens);
  }

  /**
   * Build complete context for a signal
   */
  async buildContext(signal: Signal, orchestratorState: unknown): Promise<{
    prompt: string;
    contextWindow: ContextWindow;
    sections: PromptSection[];
  }> {
    logger.debug('buildContext', 'Building context for signal', {
      signalType: signal.type,
      signalId: signal.id
    });

    try {
      // Gather all context sections
      const sections = await this.gatherContextSections(signal, orchestratorState);

      // Calculate token requirements
      const tokenRequirements = this.calculateTokenRequirements(sections);

      // Optimize and compress if needed
      const optimizedSections = await this.optimizeSections(sections, tokenRequirements);

      // Build final prompt
      const prompt = this.buildPrompt(optimizedSections);

      // Create context window information
      const contextWindow = this.createContextWindow(optimizedSections);

      return {
        prompt,
        contextWindow,
        sections: optimizedSections.map(section => ({
          id: section.name,
          type: 'context',
          content: section.content,
          tokens: section.tokens,
          compressible: section.compressible
        }))
      };

    } catch (error) {
      logger.error('buildContext', 'Failed to build context');
      throw error;
    }
  }

  /**
   * Update shared context
   */
  async updateSharedContext(updates: Partial<SharedContext>): Promise<void> {
    Object.assign(this.sharedContext, updates);

    // Persist updates
    await this.persistSharedContext();

    logger.debug('updateSharedContext', 'Shared context updated');
  }

  /**
   * Update PRP context
   */
  async updatePRPContext(prp: PRPFile): Promise<void> {
    const sections = await this.createPRPSections(prp);
    this.prpContexts.set(prp.name, sections);

    // Persist PRP context
    await this.persistPRPContext(prp.name, sections);

    logger.debug('updatePRPContext', `PRP context updated: ${prp.name}`);
  }

  /**
   * Update agent context
   */
  async updateAgentContext(agentId: string, context: unknown): Promise<void> {
    const sections = await this.createAgentSections(agentId, context as { status?: string; capabilities?: unknown });
    this.agentContexts.set(agentId, sections);

    logger.debug('updateAgentContext', `Agent context updated: ${agentId}`);
  }

  /**
   * Get context summary
   */
  getContextSummary(): {
    sharedContext: unknown;
    prpContexts: number;
    agentContexts: number;
    notesCount: number;
    totalTokens: number;
    } {
    return {
      sharedContext: this.sharedContext,
      prpContexts: this.prpContexts.size,
      agentContexts: this.agentContexts.size,
      notesCount: this.noteCache.size,
      totalTokens: this.calculateTotalTokens()
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('cleanup', 'Cleaning up context manager');

    try {
      // Persist all contexts
      await this.persistAllContexts();

      // Clear caches
      this.prpContexts.clear();
      this.agentContexts.clear();
      this.noteCache.clear();

      logger.info('cleanup', 'Context manager cleaned up successfully');
    } catch (error) {
      logger.error('cleanup', 'Error during cleanup',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Gather all context sections for a signal
   */
  private async gatherContextSections(signal: Signal, orchestratorState: unknown): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    // System sections
    sections.push(...await this.createSystemSections());

    // Shared context sections
    sections.push(...await this.createSharedSections());

    // Agent context sections
    sections.push(...await this.createActiveAgentSections(orchestratorState as { activeAgents?: unknown[]; metrics?: { activeAgents?: number; } }));

    // PRP context sections
    sections.push(...await this.createRelevantPRPSections(signal));

    // Signal-specific sections
    sections.push(...await this.createSignalSections(signal));

    // Tool context sections
    sections.push(...await this.createToolSections());

    // Notes sections
    sections.push(...await this.createRelevantNotes(signal));

    // Sort by priority and required status
    sections.sort((a, b) => {
      if (a.required && !b.required) {
        return -1;
      }
      if (!a.required && b.required) {
        return 1;
      }
      return b.priority - a.priority;
    });

    return sections;
  }

  /**
   * Create system context sections
   */
  private async createSystemSections(): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    // System instructions
    sections.push({
      name: 'system_instructions',
      content: `You are the orchestrator for the PRP (Product Requirement Prompt) system.
Your role is to coordinate agents, make decisions, and drive projects to completion.
You have access to tools and can delegate tasks to specialized agents.
Always think step-by-step and explain your reasoning clearly.`,
      tokens: this.estimateTokens(`You are the orchestrator for the PRP (Product Requirement Prompt) system.
Your role is to coordinate agents, make decisions, and drive projects to completion.
You have access to tools and can delegate tasks to specialized agents.
Always think step-by-step and explain your reasoning clearly.`),
      priority: 10,
      required: true,
      compressible: false,
      lastUpdated: new Date()
    });

    // Current system state
    const systemState = this.formatSystemState();
    sections.push({
      name: 'system_state',
      content: systemState,
      tokens: this.estimateTokens(systemState),
      priority: 8,
      required: true,
      compressible: true,
      lastUpdated: new Date()
    });

    return sections;
  }

  /**
   * Create shared context sections
   */
  private async createSharedSections(): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    // Warzone context
    const warzone = this.formatWarzoneContext();
    sections.push({
      name: 'warzone',
      content: warzone,
      tokens: this.estimateTokens(warzone),
      priority: 9,
      required: true,
      compressible: true,
      lastUpdated: new Date()
    });

    return sections;
  }

  /**
   * Create active agent context sections
   */
  private async createActiveAgentSections(orchestratorState: { activeAgents?: unknown[], metrics?: { activeAgents?: number } }): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    if (orchestratorState.activeAgents && Array.isArray(orchestratorState.activeAgents) && orchestratorState.activeAgents.length > 0) {
      const agentStatuses = this.formatAgentStatuses(orchestratorState.activeAgents);
      sections.push({
        name: 'active_agents',
        content: agentStatuses,
        tokens: this.estimateTokens(agentStatuses),
        priority: 7,
        required: false,
        compressible: true,
        lastUpdated: new Date()
      });
    }

    return sections;
  }

  /**
   * Create relevant PRP context sections
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createRelevantPRPSections(_signal: Signal): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];
    // TODO: implement signal relevance logic

    // Find PRPs relevant to this signal
    const relevantPRPs = this.findRelevantPRPs();

    for (const prp of relevantPRPs) {
      const prpSections = this.prpContexts.get(prp.name) ?? await this.createPRPSections(prp);

      for (const section of prpSections) {
        if (this.isSectionRelevantToSignal()) {
          sections.push(section);
        }
      }
    }

    return sections;
  }

  /**
   * Create signal-specific context sections
   */
  private async createSignalSections(signal: Signal): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    // Signal details
    const signalDetails = this.formatSignalDetails(signal);
    sections.push({
      name: 'current_signal',
      content: signalDetails,
      tokens: this.estimateTokens(signalDetails),
      priority: 10,
      required: true,
      compressible: false,
      lastUpdated: new Date()
    });

    return sections;
  }

  /**
   * Create tool context sections
   */
  private async createToolSections(): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    // Available tools
    const toolsList = this.formatAvailableTools();
    sections.push({
      name: 'available_tools',
      content: toolsList,
      tokens: this.estimateTokens(toolsList),
      priority: 6,
      required: false,
      compressible: true,
      lastUpdated: new Date()
    });

    return sections;
  }

  /**
   * Create relevant notes sections
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createRelevantNotes(_signal: Signal): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];
    // TODO: implement signal relevance logic

    // Find notes relevant to this signal
    const relevantNotes = this.findRelevantNotes();

    for (const note of relevantNotes) {
      const noteObj = note as { id: string; content: string; lastModified: Date };
      sections.push({
        name: `note_${noteObj.id}`,
        content: noteObj.content,
        tokens: this.estimateTokens(noteObj.content),
        priority: 5,
        required: false,
        compressible: true,
        lastUpdated: noteObj.lastModified
      });
    }

    return sections;
  }

  /**
   * Calculate token requirements for sections
   */
  private calculateTokenRequirements(sections: ContextSection[]): {
    total: number;
    byCategory: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};
    let total = 0;

    for (const section of sections) {
      total += section.tokens;
      byCategory[section.name] = (byCategory[section.name] ?? 0) + section.tokens;
    }

    return { total, byCategory };
  }

  /**
   * Optimize sections to fit within token limits
   */
  private async optimizeSections(
    sections: ContextSection[],
    requirements: { total: number; byCategory: Record<string, number> }
  ): Promise<ContextSection[]> {
    const optimizedSections = [...sections];

    // If within limits, return as-is
    if (requirements.total <= this.contextLimits.total) {
      return optimizedSections;
    }

    // Sort sections by priority and compressibility
    optimizedSections.sort((a, b) => {
      // Required sections come first
      if (a.required && !b.required) {
        return -1;
      }
      if (!a.required && b.required) {
        return 1;
      }

      // Then by priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // Compressible sections can be reduced
      return a.compressible ? 1 : -1;
    });

    let currentTokens = 0;
    const finalSections: ContextSection[] = [];

    for (const section of optimizedSections) {
      const projectedTokens = currentTokens + section.tokens;

      if (projectedTokens <= this.contextLimits.total) {
        // Section fits as-is
        finalSections.push(section);
        currentTokens += section.tokens;
      } else if (section.compressible && section.required) {
        // Compress required section
        const compressed = await this.compressSection(section, this.contextLimits.total - currentTokens);
        finalSections.push(compressed);
        currentTokens += compressed.tokens;
      } else if (!section.required) {
        // Skip optional section
        continue;
      } else {
        // Required section doesn't fit and can't be compressed - truncate
        const truncated = await this.truncateSection(section, this.contextLimits.total - currentTokens);
        finalSections.push(truncated);
        currentTokens += truncated.tokens;
        break; // No more space
      }
    }

    return finalSections;
  }

  /**
   * Compress a section
   */
  private async compressSection(section: ContextSection, maxTokens: number): Promise<ContextSection> {
    // Simple compression strategy - summarize content
    const summary = await this.summarizeContent(section.content, maxTokens);

    return {
      ...section,
      content: summary,
      tokens: this.estimateTokens(summary),
      lastUpdated: new Date()
    };
  }

  /**
   * Truncate a section
   */
  private async truncateSection(section: ContextSection, maxTokens: number): Promise<ContextSection> {
    const estimatedCharsPerToken = 4;
    const maxChars = maxTokens * estimatedCharsPerToken;

    let truncated = section.content.substring(0, maxChars);
    if (truncated.length < section.content.length) {
      truncated += '\n... [Content truncated due to token limits]';
    }

    return {
      ...section,
      content: truncated,
      tokens: this.estimateTokens(truncated),
      lastUpdated: new Date()
    };
  }

  /**
   * Build final prompt from sections
   */
  private buildPrompt(sections: ContextSection[]): string {
    const promptParts: string[] = [];

    for (const section of sections) {
      if (section.content.trim()) {
        promptParts.push(`## ${section.name.toUpperCase()}\n${section.content}\n`);
      }
    }

    return promptParts.join('\n');
  }

  /**
   * Create context window information
   */
  private createContextWindow(sections: ContextSection[]): ContextWindow {
    const used = sections.reduce((sum, section) => sum + section.tokens, 0);
    const available = this.contextLimits.total - used;

    return {
      total: this.contextLimits.total,
      used,
      available,
      sections: {
        agents: sections.filter(s => s.name.startsWith('agent')).reduce((sum, s) => sum + s.tokens, 0),
        shared: sections.filter(s => s.name.startsWith('shared') || s.name.startsWith('warzone')).reduce((sum, s) => sum + s.tokens, 0),
        prp: sections.filter(s => s.name.startsWith('prp')).reduce((sum, s) => sum + s.tokens, 0),
        tools: sections.filter(s => s.name.startsWith('tool')).reduce((sum, s) => sum + s.tokens, 0),
        system: sections.filter(s => s.name.startsWith('system')).reduce((sum, s) => sum + s.tokens, 0)
      }
    };
  }

  // Helper methods for formatting different context types
  private formatSystemState(): string {
    const metrics = this.sharedContext.systemMetrics;
    return `System Metrics:
- Tokens Used: ${metrics.tokensUsed}/${metrics.tokensLimit}
- Active Agents: ${metrics.activeAgents}
- Processing Signals: ${metrics.processingSignals}
- Average Response Time: ${metrics.averageResponseTime}ms
- Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%`;
  }

  private formatWarzoneContext(): string {
    const warzone = this.sharedContext.warzone;

    let output = 'Warzone Context:\n';

    if (warzone.blockers.length > 0) {
      output += `Blockers (${warzone.blockers.length}):\n`;
      warzone.blockers.forEach((blocker) => {
        output += `- ${blocker.description} (Priority: ${blocker.priority})\n`;
      });
    }

    if (warzone.completed.length > 0) {
      output += `Completed (${warzone.completed.length}):\n`;
      warzone.completed.forEach((completed) => {
        output += `- ${completed.description} (${completed.prp})\n`;
      });
    }

    if (warzone.next.length > 0) {
      output += `Next Actions (${warzone.next.length}):\n`;
      warzone.next.forEach((next) => {
        output += `- ${next.description} (Priority: ${next.priority})\n`;
      });
    }

    return output;
  }

  private formatAgentStatuses(activeAgents: unknown[]): string {
    return `Active Agents (${activeAgents.length}):\n${activeAgents.map(agent => {
      const agentObj = agent as { name: string; status: string; currentTask?: string };
      return `- ${agentObj.name}: ${agentObj.status} (Task: ${agentObj.currentTask ?? 'None'})`;
    }).join('\n')}`;
  }

  private formatSignalDetails(signal: Signal): string {
    return `Current Signal:
- Type: ${signal.type}
- Priority: ${signal.priority}
- Source: ${signal.source}
- Timestamp: ${signal.timestamp.toISOString()}
- Data: ${JSON.stringify(signal.data, null, 2)}`;
  }

  private formatAvailableTools(): string {
    // This would return available tools from the tool registry
    return 'Available Tools: read_file, write_file, list_directory, execute_command, git_status, http_request';
  }

  // Filesystem and persistence methods
  private ensureStorageDirectory(): void {
    if (!existsSync(this.storagePath)) {
      mkdirSync(this.storagePath, { recursive: true });
    }
  }

  private async loadPersistedContext(): Promise<void> {
    try {
      const sharedContextFile = join(this.storagePath, 'shared-context.json');
      if (existsSync(sharedContextFile)) {
        const data = readFileSync(sharedContextFile, 'utf8');
        const persisted = JSON.parse(data);
        Object.assign(this.sharedContext, persisted);
      }
    } catch {
      logger.warn('loadPersistedContext', 'Failed to load persisted context');
    }
  }

  private async persistSharedContext(): Promise<void> {
    try {
      const sharedContextFile = join(this.storagePath, 'shared-context.json');
      writeFileSync(sharedContextFile, JSON.stringify(this.sharedContext, null, 2));
    } catch {
      logger.error('persistSharedContext', 'Failed to persist shared context');
    }
  }

  private async persistPRPContext(prpName: string, sections: ContextSection[]): Promise<void> {
    try {
      const prpContextFile = join(this.storagePath, `prp-${prpName}.json`);
      writeFileSync(prpContextFile, JSON.stringify(sections, null, 2));
    } catch (error) {
      logger.error('orchestrator', 'Failed to persist PRP context', error instanceof Error ? error : new Error(String(error)), {
        prpName
      });
    }
  }

  private async persistAllContexts(): Promise<void> {
    await this.persistSharedContext();

    for (const [prpName, sections] of Array.from(this.prpContexts.entries())) {
      await this.persistPRPContext(prpName, sections);
    }
  }

  // Note management
  private async loadNotes(): Promise<void> {
    // Load notes from filesystem
    // This would scan for .md files with signal patterns
  }

  private findRelevantNotes(): unknown[] {
    // Find notes matching signal patterns
    return [];
  }

  // PRP and agent section creation
  private async createPRPSections(prp: PRPFile): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    // PRP goal
    if (prp.goal) {
      sections.push({
        name: `prp_goal_${prp.name}`,
        content: `PRP Goal: ${prp.goal}`,
        tokens: this.estimateTokens(prp.goal),
        priority: 8,
        required: true,
        compressible: false,
        lastUpdated: prp.lastModified
      });
    }

    // Progress log (recent entries)
     
    if (prp.progressLog?.length > 0) {
      const recentProgress = prp.progressLog.slice(-5);
      const progressContent = recentProgress.map(entry =>
        `[${entry.timestamp.toISOString()}] ${entry.message}`
      ).join('\n');

      sections.push({
        name: `prp_progress_${prp.name}`,
        content: `Recent Progress:\n${progressContent}`,
        tokens: this.estimateTokens(progressContent),
        priority: 6,
        required: false,
        compressible: true,
        lastUpdated: prp.lastModified
      });
    }

    return sections;
  }

  private async createAgentSections(agentId: string, context: { status?: string; capabilities?: unknown }): Promise<ContextSection[]> {
    const sections: ContextSection[] = [];

    // Agent status and capabilities
    const statusContent = `Agent ${agentId} Status: ${context.status ?? 'Unknown'}
Capabilities: ${JSON.stringify(context.capabilities ?? {}, null, 2)}`;

    sections.push({
      name: `agent_status_${agentId}`,
      content: statusContent,
      tokens: this.estimateTokens(statusContent),
      priority: 5,
      required: false,
      compressible: true,
      lastUpdated: new Date()
    });

    return sections;
  }

  // Utility methods
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private async summarizeContent(content: string, maxTokens: number): Promise<string> {
    // Simple truncation-based summarization
    // In production, would use an LLM for proper summarization
    const estimatedCharsPerToken = 4;
    const maxChars = maxTokens * estimatedCharsPerToken;

    let summary = content.substring(0, maxChars);
    if (summary.length < content.length) {
      summary += '\n... [Content summarized]';
    }

    return summary;
  }

  private findRelevantPRPs(): PRPFile[] {
    // Logic to find PRPs relevant to this signal
    // For now, return empty array
    return [];
  }

  private isSectionRelevantToSignal(): boolean {
    // Logic to determine if a section is relevant to the signal
    // For now, return true for all sections
    return true;
  }

  private calculateTotalTokens(): number {
    let total = 0;

    // Shared context tokens
    total += this.estimateTokens(JSON.stringify(this.sharedContext));

    // PRP context tokens
    for (const sections of Array.from(this.prpContexts.values())) {
      total += sections.reduce((sum, section) => sum + section.tokens, 0);
    }

    // Agent context tokens
    for (const sections of Array.from(this.agentContexts.values())) {
      total += sections.reduce((sum, section) => sum + section.tokens, 0);
    }

    // Note tokens
    for (const note of Array.from(this.noteCache.values())) {
      total += this.estimateTokens(JSON.stringify(note));
    }

    return total;
  }

  /**
   * Get maximum cache size
   */
  getMaxCacheSize(): number {
    return this._maxCacheSize;
  }
}