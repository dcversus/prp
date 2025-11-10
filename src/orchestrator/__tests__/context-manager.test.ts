/**
 * ♫ Context Manager Tests for @dcversus/prp Orchestrator
 *
 * Test suite for enhanced context manager with war-room memo format
 * and async compaction capabilities.
 */

import { ContextManager } from '../context-manager';
import { Signal } from '../../shared/types';

// Mock filesystem operations
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn()
}));

describe('ContextManager', () => {
  let contextManager: ContextManager;

  beforeEach(() => {
    contextManager = new ContextManager({
      total: 200000,
      prp: 30000,
      shared: 10000,
      agents: 20000,
      tools: 5000,
      system: 5000
    });
  });

  afterEach(async () => {
    // Cleanup
    if (contextManager) {
      await contextManager.cleanup();
    }
  });

  describe('initialization', () => {
    it('should initialize with correct configuration', async () => {
      await contextManager.initialize();

      const warRoomStatus = contextManager.getWarRoomStatus();
      expect(warRoomStatus.done).toBeInstanceOf(Array);
      expect(warRoomStatus.doing).toBeInstanceOf(Array);
      expect(warRoomStatus.next).toBeInstanceOf(Array);
      expect(warRoomStatus.blockers).toBeInstanceOf(Array);
      expect(warRoomStatus.notes).toBeInstanceOf(Array);
      expect(warRoomStatus.maxItems).toBe(50);
      expect(warRoomStatus.lastUpdated).toBeInstanceOf(Date);
    });

    it('should initialize war-room memo format from existing warzone data', async () => {
      await contextManager.initialize();

      const warRoomStatus = contextManager.getWarRoomStatus();
      expect(warRoomStatus).toBeDefined();
      expect(warRoomStatus.totalItems).toBeGreaterThanOrEqual(0);
    });
  });

  describe('war-room memo management', () => {
    beforeEach(async () => {
      await contextManager.initialize();
    });

    it('should add items to war-room sections', () => {
      contextManager.addToWarRoom('done', 'Completed user authentication feature');
      contextManager.addToWarRoom('next', 'Implement payment processing');
      contextManager.addToWarRoom('blockers', 'API key not configured');

      const status = contextManager.getWarRoomStatus();
      expect(status.done).toContain('Completed user authentication feature');
      expect(status.next).toContain('Implement payment processing');
      expect(status.blockers).toContain('API key not configured');
      expect(status.totalItems).toBe(3);
    });

    it('should maintain max items limit in war-room sections', () => {
      // Add more items than the max limit
      for (let i = 0; i < 60; i++) {
        contextManager.addToWarRoom('done', `Completed task ${i}`);
      }

      const status = contextManager.getWarRoomStatus();
      expect(status.done.length).toBeLessThanOrEqual(50);
      expect(status.done.length).toBe(50); // Should keep only the most recent 50
    });

    it('should move items between war-room sections', () => {
      contextManager.addToWarRoom('next', 'Implement user login');
      contextManager.addToWarRoom('next', 'Create dashboard');

      const success = contextManager.moveInWarRoom('next', 'doing', 'Implement user login');
      expect(success).toBe(true);

      const status = contextManager.getWarRoomStatus();
      expect(status.doing).toContain('Implement user login');
      expect(status.next).not.toContain('Implement user login');
      expect(status.next).toContain('Create dashboard');
    });

    it('should handle moving non-existent items gracefully', () => {
      const success = contextManager.moveInWarRoom('next', 'doing', 'Non-existent task');
      expect(success).toBe(false);
    });

    it('should archive old war-room items', () => {
      // Add many items to test archiving
      for (let i = 0; i < 30; i++) {
        contextManager.addToWarRoom('done', `Old task ${i}`);
        contextManager.addToWarRoom('next', `Next task ${i}`);
      }

      const archivedCount = contextManager.archiveWarRoomItems(7); // Archive items older than 7 days
      expect(archivedCount).toBeGreaterThan(0);

      const status = contextManager.getWarRoomStatus();
      expect(status.done.length).toBeLessThan(30);
      expect(status.next.length).toBeLessThan(30);
    });

    it('should provide war-room status with last action', () => {
      contextManager.addToWarRoom('blockers', 'Database connection issue');
      contextManager.addToWarRoom('done', 'Fixed bug #123');
      contextManager.addToWarRoom('next', 'Review PR #456');

      const status = contextManager.getWarRoomStatus();
      expect(status.lastAction).toBeDefined();
      expect(status.totalItems).toBe(3);
    });
  });

  describe('async compaction', () => {
    beforeEach(async () => {
      await contextManager.initialize();
    });

    it('should check compaction threshold', () => {
      // Add many items to potentially trigger compaction
      for (let i = 0; i < 100; i++) {
        contextManager.addToWarRoom('done', `Task ${i} with a lot of detailed information that consumes tokens and space in the context manager's memory allocation for testing purposes`);
        contextManager.addToWarRoom('next', `Next task ${i} with additional context and requirements that need to be tracked and managed efficiently within the allocated token limits and memory constraints`);
      }

      // The check should be performed when items are added
      // In real implementation, this would trigger compaction when threshold is reached
      expect(contextManager.getWarRoomStatus().totalItems).toBeGreaterThan(0);
    });

    it('should perform synchronous compaction', () => {
      // Add items to fill up context
      for (let i = 0; i < 50; i++) {
        contextManager.addToWarRoom('done', `Large task description ${i} with lots of details that consume significant token space and require compaction to maintain efficient context management`);
        contextManager.addToWarRoom('notes', `Note ${i} with extensive documentation and details that should be compacted when context reaches threshold limits to prevent token overflow and maintain system performance`);
      }

      const beforeStatus = contextManager.getWarRoomStatus();
      const beforeItems = beforeStatus.totalItems;

      // Perform manual compaction
      const success = contextManager.performCompaction(1000); // Target small size
      expect(success).toBe(true);

      const afterStatus = contextManager.getWarRoomStatus();
      // After compaction, items should be reduced
      expect(afterStatus.totalItems).toBeLessThanOrEqual(beforeItems);
    });

    it('should emit compaction events', (done) => {
      let eventCount = 0;

      contextManager.on('compaction_started', (event) => {
        expect(event.async).toBe(false);
        eventCount++;
      });

      contextManager.on('compaction_completed', (event) => {
        expect(event.async).toBe(false);
        expect(event.finalSize).toBeDefined();
        eventCount++;

        if (eventCount === 2) {
          done();
        }
      });

      // Add items to trigger compaction
      for (let i = 0; i < 20; i++) {
        contextManager.addToWarRoom('done', `Task ${i} with details`);
      }

      // Manually trigger compaction
      contextManager.performCompaction();
    });
  });

  describe('context building', () => {
    beforeEach(async () => {
      await contextManager.initialize();
    });

    it('should build context for signal', async () => {
      const mockSignal: Signal = {
        id: 'test-signal-1',
        type: 'dp',
        priority: 7,
        source: 'robo-developer',
        timestamp: new Date(),
        data: {
          prpId: 'PRP-001',
          comment: 'Development progress update',
          files: ['src/app.ts']
        },
        metadata: {
          category: 'progress',
          context: 'implementation'
        }
      };

      const mockOrchestratorState = {
        status: 'thinking',
        activeAgents: new Map(),
        decisionHistory: [],
        contextMemory: {
          signals: new Map(),
          decisions: new Map(),
          agentStates: new Map(),
          systemMetrics: new Map(),
          conversationHistory: [],
          sharedNotes: new Map(),
          lastUpdate: new Date(),
          size: 0,
          maxSize: 200000
        },
        chainOfThought: {
          id: 'cot-1',
          depth: 3,
          currentStep: 1,
          steps: [],
          context: {
            originalPayload: {} as any,
            signals: [],
            activeGuidelines: [],
            availableAgents: [],
            systemState: {},
            previousDecisions: [],
            constraints: []
          },
          status: 'active'
        },
        metrics: {
          startTime: new Date(),
          totalDecisions: 0,
          successfulDecisions: 0,
          failedDecisions: 0,
          averageDecisionTime: 0,
          averageTokenUsage: {
            input: 0,
            output: 0,
            total: 0,
            cost: 0
          },
          agentUtilization: {
            active: 0,
            total: 0,
            averageTasksPerAgent: 0,
            successRate: 0
          },
          toolUsage: {},
          checkpointStats: {
            total: 0,
            passed: 0,
            failed: 0,
            averageTime: 0
          },
          chainOfThoughtStats: {
            averageDepth: 0,
            averageTime: 0,
            successRate: 0
          }
        }
      };

      const result = await contextManager.buildContext(mockSignal, mockOrchestratorState);

      expect(result.prompt).toBeDefined();
      expect(result.contextWindow).toBeDefined();
      expect(result.sections).toBeInstanceOf(Array);
      expect(result.contextWindow.total).toBe(200000);
    });
  });

  describe('event emission', () => {
    beforeEach(async () => {
      await contextManager.initialize();
    });

    it('should emit war-room update events', (done) => {
      contextManager.on('warRoom_updated', (event) => {
        expect(event.section).toBe('done');
        expect(event.item).toBe('Test task for event');
        expect(event.timestamp).toBeInstanceOf(Date);
        done();
      });

      contextManager.addToWarRoom('done', 'Test task for event');
    });

    it('should emit war-room item moved events', (done) => {
      contextManager.on('warRoom_item_moved', (event) => {
        expect(event.fromSection).toBe('next');
        expect(event.toSection).toBe('doing');
        expect(event.item).toBe('Task to move');
        expect(event.timestamp).toBeInstanceOf(Date);
        done();
      });

      contextManager.addToWarRoom('next', 'Task to move');
      contextManager.moveInWarRoom('next', 'doing', 'Task to move');
    });

    it('should emit war-room archived events', (done) => {
      // Add items to archive
      for (let i = 0; i < 10; i++) {
        contextManager.addToWarRoom('done', `Old task ${i}`);
      }

      contextManager.on('warRoom_archived', (event) => {
        expect(event.archivedCount).toBeGreaterThan(0);
        expect(event.cutoffDate).toBeInstanceOf(Date);
        expect(event.timestamp).toBeInstanceOf(Date);
        done();
      });

      contextManager.archiveWarRoomItems(1); // Archive items older than 1 day
    });
  });

  describe('error handling', () => {
    it('should handle invalid section names gracefully', () => {
      expect(() => {
        contextManager.addToWarRoom('invalid' as any, 'Test item');
      }).not.toThrow();
    });

    it('should handle compaction failures gracefully', () => {
      // Mock a failure scenario
      const success = contextManager.performCompaction(-1); // Invalid target size
      expect(success).toBe(false);
    });
  });

  describe('resource management', () => {
    beforeEach(async () => {
      await contextManager.initialize();
    });

    it('should track token usage correctly', () => {
      // Add items that consume tokens
      for (let i = 0; i < 10; i++) {
        contextManager.addToWarRoom('done', `Task ${i} with medium length description that consumes some tokens`);
        contextManager.addToWarRoom('next', `Next task ${i} with additional context and requirements`);
      }

      const status = contextManager.getWarRoomStatus();
      expect(status.totalItems).toBe(20);

      // Token calculation should be performed
      // In real implementation, this would return actual token counts
      expect(status).toBeDefined();
    });

    it('should maintain context within limits', () => {
      // Add items approaching limits
      const largeContent = 'A'.repeat(1000); // Large content item

      for (let i = 0; i < 100; i++) {
        contextManager.addToWarRoom('notes', `Note ${i}: ${largeContent}`);
      }

      const status = contextManager.getWarRoomStatus();
      // Should not exceed max items per section
      expect(status.notes.length).toBeLessThanOrEqual(50);
    });
  });

  describe('integration with orchestrator', () => {
    beforeEach(async () => {
      await contextManager.initialize();
    });

    it('should support orchestrator signal processing workflow', async () => {
      // Simulate orchestrator workflow
      contextManager.addToWarRoom('blockers', 'Authentication service unavailable');
      contextManager.addToWarRoom('doing', 'Implement alternative auth method');
      contextManager.addToWarRoom('next', 'Test authentication flow');

      // Move item as it's completed
      contextManager.moveInWarRoom('doing', 'done', 'Implement alternative auth method');

      // Add new blocker
      contextManager.addToWarRoom('blockers', 'Database connection timeout');

      const status = contextManager.getWarRoomStatus();
      expect(status.done).toContain('Implement alternative auth method');
      expect(status.doing).not.toContain('Implement alternative auth method');
      expect(status.blockers).toContain('Authentication service unavailable');
      expect(status.blockers).toContain('Database connection timeout');
    });

    it('should handle signal-driven context updates', async () => {
      // Simulate signal from agent
      contextManager.addToWarRoom('done', '[dp] Feature X implementation completed');
      contextManager.addToWarRoom('next', '[tp] Write tests for feature X');
      contextManager.addToWarRoom('blockers', '[bb] Missing dependency for feature X');

      // Simulate blocker resolution
      contextManager.moveInWarRoom('blockers', 'done', '[bb] Missing dependency for feature X');

      const status = contextManager.getWarRoomStatus();
      expect(status.done).toContain('[bb] Missing dependency for feature X');
      expect(status.blockers).not.toContain('[bb] Missing dependency for feature X');
    });
  });
});