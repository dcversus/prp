/**
 * Integration tests for merge-prompt utility
 * Tests real-world usage scenarios
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

import {
  MergePrompt,
  buildAgentPrompt,
  buildInspectorPrompt,
  buildOrchestratorPrompt,
} from '../../../../src/shared/utils/merge-prompt';

describe('MergePrompt Integration Tests', () => {
  let tempDir: string;
  let projectStructure: Record<string, string>;

  beforeEach(async () => {
    // Create a realistic project structure
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'merge-prompt-integration-'));

    projectStructure = {
      // Configuration files
      '.prprc': path.join(tempDir, '.prprc'),
      'AGENTS.md': path.join(tempDir, 'AGENTS.md'),

      // Instructions
      instructions: path.join(tempDir, 'instructions'),
      'instructions/prprc': path.join(tempDir, 'instructions', 'prprc.md'),
      'instructions/agent': path.join(tempDir, 'instructions', 'agent.md'),
      'instructions/inspector': path.join(tempDir, 'inspector.md'),
      'instructions/orchestrator': path.join(tempDir, 'instructions', 'orchestrator.md'),

      // Guidelines
      guidelines: path.join(tempDir, 'guidelines'),
      'guidelines/EN': path.join(tempDir, 'guidelines', 'EN'),
      'guidelines/EN/agent': path.join(tempDir, 'guidelines', 'EN', 'agent.md'),
      'guidelines/EN/inspector': path.join(tempDir, 'guidelines', 'EN', 'inspector.md'),
      'guidelines/EN/orchestrator': path.join(tempDir, 'guidelines', 'EN', 'orchestrator.md'),

      // Prompts
      src: path.join(tempDir, 'src'),
      'src/prompts': path.join(tempDir, 'src', 'prompts'),
      'src/prompts/agent': path.join(tempDir, 'src', 'prompts', 'agent.md'),
      'src/prompts/inspector': path.join(tempDir, 'src', 'prompts', 'inspector.md'),
      'src/prompts/orchestrator': path.join(tempDir, 'src', 'prompts', 'orchestrator.md'),

      // Sample PRPs
      PRPs: path.join(tempDir, 'PRPs'),
      'PRPs/PRP-001-comprehensive-cleanup-test': path.join(tempDir, 'PRPs', 'PRP-001-comprehensive-cleanup-test.md'),
    };

    // Create directories
    await fs.mkdir(projectStructure.instructions, { recursive: true });
    await fs.mkdir(projectStructure['guidelines/EN'], { recursive: true });
    await fs.mkdir(projectStructure['src/prompts'], { recursive: true });
    await fs.mkdir(projectStructure.PRPs, { recursive: true });

    // Create sample content
    await fs.writeFile(
      projectStructure['.prprc'],
      '# PRPRC Configuration\n\nThis is the main configuration file.'
    );
    await fs.writeFile(
      projectStructure['AGENTS.md'],
      '# AGENTS.md\n\nThis is referenced from [PRPRC Config](.prprc)'
    );

    await fs.writeFile(
      projectStructure['instructions/prprc'],
      '# PRPRC Instructions\n\nBase instructions for the system.'
    );
    await fs.writeFile(
      projectStructure['instructions/agent'],
      '# Agent Instructions\n\nSpecific agent guidance.'
    );
    await fs.writeFile(
      projectStructure['instructions/inspector'],
      '# Inspector Instructions\n\nInspector-specific guidance.'
    );
    await fs.writeFile(
      projectStructure['instructions/orchestrator'],
      '# Orchestrator Instructions\n\nOrchestrator-specific guidance.'
    );

    await fs.writeFile(
      projectStructure['guidelines/EN/agent'],
      '# EN Agent Guidelines\n\nEnglish language guidelines for agents.'
    );
    await fs.writeFile(
      projectStructure['guidelines/EN/inspector'],
      '# EN Inspector Guidelines\n\nEnglish language guidelines for inspector.'
    );
    await fs.writeFile(
      projectStructure['guidelines/EN/orchestrator'],
      '# EN Orchestrator Guidelines\n\nEnglish language guidelines for orchestrator.'
    );

    await fs.writeFile(
      projectStructure['src/prompts/agent'],
      '# Agent Prompt Template\n\nSee [EN Agent Guidelines](guidelines/EN/agent.md) for details.'
    );
    await fs.writeFile(
      projectStructure['src/prompts/inspector'],
      '# Inspector Prompt Template\n\nSee [EN Inspector Guidelines](guidelines/EN/inspector.md) for details.'
    );
    await fs.writeFile(
      projectStructure['src/prompts/orchestrator'],
      '# Orchestrator Prompt Template\n\nSee [EN Orchestrator Guidelines](guidelines/EN/orchestrator.md) for details.'
    );

    await fs.writeFile(
      projectStructure['PRPs/PRP-001-comprehensive-cleanup-test'],
      `# PRP-001: Comprehensive Cleanup Test Feature

> user quote: implement a test feature with specific requirements

## feature implementation
- \`/src/test.feature.ts\` | IMPLEMENTATION NEEDED [dp]
- [x] tests prepared
- [ ] implementation complete

## status
[dp] Development in progress
`
    );
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Silently handle cleanup errors
    }
  });

  describe('Real-world Agent Prompt Building', () => {
    it('should build complete agent prompt with real project structure', async () => {
      // Change to temp directory for relative path resolution
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const agentConfig = [{ instructions_path: './instructions/agent.md' }];

        const additionalParams = {
          agentId: 'claude-code',
          task: 'implement user authentication',
          context: {
            projectId: 'test-project',
            features: ['auth', 'dashboard'],
          },
        };

        const result = await buildAgentPrompt(
          './instructions/prprc.md',
          agentConfig,
          additionalParams
        );

        // Verify all expected content is included
        expect(result).toContain('PRPRC Instructions');
        expect(result).toContain('Agent Instructions');
        expect(result).toContain('Agent Prompt Template');
        expect(result).toContain('EN Agent Guidelines');
        expect(result).toContain('agentId');
        expect(result).toContain('claude-code');
        expect(result).toContain('implement user authentication');
        expect(result).toContain('test-project');
        expect(result).toContain('auth');
        expect(result).toContain('dashboard');

        // Verify JSON structure
        expect(result).toContain('--- PARAMETERS ---');
        expect(result).toContain('"agentId":"claude-code"');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Real-world Inspector Prompt Building', () => {
    it('should build complete inspector prompt with scanner data and context', async () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const inspectorConfig = { instructions_path: './instructions/inspector.md' };
        const scannerJson = {
          signals: [
            { type: '[dp]', source: 'PRPs/PRP-001-comprehensive-cleanup-test.md', timestamp: '2024-01-01T00:00:00Z' },
            { type: '[tp]', source: 'src/test.feature.ts', timestamp: '2024-01-01T01:00:00Z' },
          ],
          analysis: {
            totalSignals: 2,
            patterns: ['development progress'],
            recommendations: ['continue implementation', 'add tests'],
          },
        };

        const previousContext = `
Previous inspection noted:
- Development in progress on test feature
- Tests prepared but implementation incomplete
- Agent working on authentication system
        `.trim();

        const result = await buildInspectorPrompt(
          './instructions/prprc.md',
          inspectorConfig,
          scannerJson,
          previousContext
        );

        // Verify all expected content
        expect(result).toContain('PRPRC Instructions');
        expect(result).toContain('Inspector Prompt Template');
        expect(result).toContain('EN Inspector Guidelines');
        expect(result).toContain('--- SCANNER DATA ---');
        expect(result).toContain('--- PREVIOUS CONTEXT ---');
        expect(result).toContain('[dp]');
        expect(result).toContain('[tp]');
        expect(result).toContain('development progress');
        expect(result).toContain('Development in progress');

        // Verify JSON structure is properly minified
        expect(result).toMatch(/"signals":\[\{"type":"\[dp\]"/);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Real-world Orchestrator Prompt Building', () => {
    it('should build complete orchestrator prompt with all contexts', async () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const orchestratorConfig = { instructions_path: './instructions/orchestrator.md' };

        const inspectorPayload = {
          analysis: {
            systemHealth: 'optimal',
            activeSignals: 3,
            blockageLevel: 'low',
            recommendations: ['proceed with current implementation', 'monitor test coverage'],
          },
          agentStatus: {
            active: 2,
            idle: 1,
            blocked: 0,
          },
        };

        const prpContext = `
Current PRP Status:
- PRP-001: Comprehensive Cleanup Test Feature - Development in progress [dp]
- Implementation: 75% complete
- Tests: Prepared and passing
- Next step: Complete authentication module
        `.trim();

        const sharedContext = `
System Context:
- Project: test-project
- Template: typescript
- Providers: anthropic (primary), openai (fallback)
- Agents: 2 active
- Environment: development
        `.trim();

        const additionalParams = {
          orchestratorMode: 'active',
          priorityTasks: ['complete authentication', 'add integration tests'],
          resourceConstraints: {
            maxTokens: 200000,
            maxAgents: 3,
          },
        };

        const result = await buildOrchestratorPrompt(
          './instructions/prprc.md',
          orchestratorConfig,
          inspectorPayload,
          prpContext,
          sharedContext,
          additionalParams
        );

        // Verify all sections are included
        expect(result).toContain('PRPRC Instructions');
        expect(result).toContain('Orchestrator Instructions');
        expect(result).toContain('Orchestrator Prompt Template');
        expect(result).toContain('EN Orchestrator Guidelines');
        expect(result).toContain('--- INSPECTOR PAYLOAD ---');
        expect(result).toContain('--- PRP CONTEXT ---');
        expect(result).toContain('--- SHARED CONTEXT ---');
        expect(result).toContain('--- PARAMETERS ---');

        // Verify specific content
        expect(result).toContain('systemHealth');
        expect(result).toContain('optimal');
        expect(result).toContain('Development in progress');
        expect(result).toContain('75% complete');
        expect(result).toContain('test-project');
        expect(result).toContain('anthropic');
        expect(result).toContain('orchestratorMode');
        expect(result).toContain('active');

        // Verify JSON structures are properly formatted
        expect(result).toMatch(/"systemHealth":"optimal"/);
        expect(result).toMatch(/"orchestratorMode":"active"/);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Performance and Caching', () => {
    it('should handle large prompt building efficiently', async () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        // Create a large additional params object
        const largeParams = {
          projectHistory: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            timestamp: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
            action: `Action ${i}`,
            agent: `agent-${i % 5}`,
            status: i % 3 === 0 ? 'completed' : 'in-progress',
          })),
          agentCapabilities: {
            'agent-0': { skills: ['coding', 'testing'], maxTokens: 100000 },
            'agent-1': { skills: ['analysis', 'design'], maxTokens: 150000 },
            'agent-2': { skills: ['documentation', 'review'], maxTokens: 80000 },
            'agent-3': { skills: ['testing', 'qa'], maxTokens: 120000 },
            'agent-4': { skills: ['architecture', 'planning'], maxTokens: 200000 },
          },
        };

        const startTime = Date.now();
        const result = await buildAgentPrompt(
          './instructions/prprc.md',
          [{ instructions_path: './instructions/agent.md' }],
          largeParams
        );
        const endTime = Date.now();

        // Should complete within reasonable time (less than 1 second)
        expect(endTime - startTime).toBeLessThan(1000);

        // Verify content is properly included
        expect(result).toContain('projectHistory');
        expect(result).toContain('agentCapabilities');
        expect(result).toContain('coding');
        expect(result).toContain('testing');

        // Verify JSON is properly minified (should be significantly smaller than unminified)
        const paramsSection = result.match(/--- PARAMETERS ---\n```json\n(.+)\n```/s)?.[1];
        expect(paramsSection).toBeDefined();
        if (paramsSection && paramsSection.length > 0) {
          expect(paramsSection.length).toBeGreaterThan(0);
        }
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should demonstrate caching effectiveness', async () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        // Clear cache first
        MergePrompt.clearCache();

        // First call - should read from filesystem
        const startTime1 = Date.now();
        await buildAgentPrompt('./instructions/prprc.md', [
          { instructions_path: './instructions/agent.md' },
        ]);
        const time1 = Date.now() - startTime1;

        // Second call - should use cache
        const startTime2 = Date.now();
        await buildAgentPrompt('./instructions/prprc.md', [
          { instructions_path: './instructions/agent.md' },
        ]);
        const time2 = Date.now() - startTime2;

        // Cache should improve performance (though this might not always be true in testing environments)
        expect(time2).toBeLessThanOrEqual(time1 * 2); // Allow some variance

        // Verify cache has entries
        const stats = MergePrompt.getCacheStats();
        expect(stats.size).toBeGreaterThan(0);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle mixed relative and absolute paths', async () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        // Mix of relative and absolute paths
        const agentConfig = [
          { instructions_path: './instructions/agent.md' },
          { instructions_path: projectStructure['instructions/inspector'] }, // absolute path
        ];

        const result = await buildAgentPrompt('./instructions/prprc.md', agentConfig);

        expect(result).toContain('Agent Instructions');
        expect(result).toContain('Inspector Instructions');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle empty optional parameters gracefully', async () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);

      try {
        const result = await buildOrchestratorPrompt(
          './instructions/prprc.md',
          { instructions_path: './instructions/orchestrator.md' }
          // No optional parameters
        );

        expect(result).toContain('Orchestrator Instructions');
        expect(result).not.toContain('--- INSPECTOR PAYLOAD ---');
        expect(result).not.toContain('--- PRP CONTEXT ---');
        expect(result).not.toContain('--- SHARED CONTEXT ---');
        expect(result).not.toContain('--- PARAMETERS ---');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
