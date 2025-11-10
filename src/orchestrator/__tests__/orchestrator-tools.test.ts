/**
 * ♫ Orchestrator Tools Tests for @dcversus/prp
 *
 * Test suite for orchestrator tools including GitHub, MCP,
 * and research tools integration.
 */

import { GitHubTools } from '../tools/github-tools';
import { MCPTools } from '../tools/mcp-tools';
import { ResearchTools } from '../tools/research-tools';
import { Tool, ToolResult } from '../types';
import * as fs from 'fs/promises';

// Mock fetch for GitHub API
global.fetch = jest.fn();

describe('Orchestrator Tools', () => {
  describe('GitHubTools', () => {
    let githubTools: GitHubTools;

    beforeEach(() => {
      githubTools = new GitHubTools('test-token');
      (global.fetch as jest.Mock).mockClear();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('getRepositoryInfo', () => {
      it('should fetch repository information successfully', async () => {
        const mockResponse = {
          id: 12345,
          name: 'test-repo',
          full_name: 'test-owner/test-repo',
          description: 'Test repository',
          private: false,
          owner: {
            login: 'test-owner'
          },
          stargazers_count: 42,
          forks_count: 10
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        });

        const tool = githubTools.getRepositoryInfo();
        const result = await tool.execute({ owner: 'test-owner', repo: 'test-repo' });

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.github.com/repos/test-owner/test-repo',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'token test-token'
            })
          })
        );
      });

      it('should handle API errors gracefully', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          text: async () => 'Repository not found'
        });

        const tool = githubTools.getRepositoryInfo();
        const result = await tool.execute({ owner: 'test-owner', repo: 'nonexistent' });

        expect(result.success).toBe(false);
        expect(result.error).toContain('404 Not Found');
      });
    });

    describe('listPullRequests', () => {
      it('should list pull requests with filters', async () => {
        const mockResponse = [
          {
            id: 1,
            number: 123,
            title: 'Add new feature',
            state: 'open',
            user: { login: 'contributor' },
            head: { ref: 'feature-branch' },
            base: { ref: 'main' }
          },
          {
            id: 2,
            number: 124,
            title: 'Fix bug',
            state: 'closed',
            user: { login: 'contributor' },
            head: { ref: 'bugfix-branch' },
            base: { ref: 'main' }
          }
        ];

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        });

        const tool = githubTools.listPullRequests();
        const result = await tool.execute({
          owner: 'test-owner',
          repo: 'test-repo',
          state: 'open',
          limit: 10
        });

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/repos/test-owner/test-repo/pulls?'),
          expect.any(Object)
        );
      });
    });

    describe('createPullRequest', () => {
      it('should create a new pull request', async () => {
        const mockResponse = {
          id: 456,
          number: 125,
          title: 'New feature PR',
          state: 'open',
          user: { login: 'author' },
          head: { ref: 'feature-branch' },
          base: { ref: 'main' }
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        });

        const tool = githubTools.createPullRequest();
        const result = await tool.execute({
          owner: 'test-owner',
          repo: 'test-repo',
          title: 'New feature PR',
          body: 'This PR adds a new feature',
          head: 'feature-branch',
          base: 'main'
        });

        expect(result.success).toBe(true);
        expect(result.data.title).toBe('New feature PR');
        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.github.com/repos/test-owner/test-repo/pulls',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('New feature PR')
          })
        );
      });
    });

    describe('getWorkflowRuns', () => {
      it('should fetch workflow runs', async () => {
        const mockResponse = {
          total_count: 2,
          workflow_runs: [
            {
              id: 789,
              name: 'CI Pipeline',
              status: 'completed',
              conclusion: 'success',
              head_branch: 'main'
            },
            {
              id: 790,
              name: 'Deploy Pipeline',
              status: 'in_progress',
              conclusion: null,
              head_branch: 'develop'
            }
          ]
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        });

        const tool = githubTools.getWorkflowRuns();
        const result = await tool.execute({
          owner: 'test-owner',
          repo: 'test-repo'
        });

        expect(result.success).toBe(true);
        expect(result.data.workflow_runs).toHaveLength(2);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/repos/test-owner/test-repo/actions/runs?'),
          expect.any(Object)
        );
      });
    });
  });

  describe('MCPTools', () => {
    let mcpTools: MCPTools;
    const testConfigPath = '/tmp/test-mcp.json';

    beforeEach(async () => {
      mcpTools = new MCPTools(testConfigPath);
      // Ensure clean state
      try {
        await fs.unlink(testConfigPath);
      } catch {
        // File doesn't exist, which is fine
      }
    });

    afterEach(async () => {
      // Cleanup test file
      try {
        await fs.unlink(testConfigPath);
      } catch {
        // File doesn't exist
      }
    });

    describe('loadConfig', () => {
      it('should load configuration from file', async () => {
        const testConfig = {
          version: '1.0.0',
          servers: {
            'test-server': {
              name: 'Test Server',
              command: 'node',
              args: ['server.js'],
              enabled: true
            }
          },
          global: {
            timeout: 30000,
            retries: 3
          }
        };

        await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));

        const config = await mcpTools.loadConfig();
        expect(config.version).toBe('1.0.0');
        expect(config.servers['test-server']).toBeDefined();
        expect(config.global.timeout).toBe(30000);
      });

      it('should return default config when file does not exist', async () => {
        const config = await mcpTools.loadConfig();
        expect(config.version).toBe('1.0.0');
        expect(Object.keys(config.servers)).toHaveLength(0);
      });
    });

    describe('listMCPServers', () => {
      beforeEach(async () => {
        const testConfig = {
          version: '1.0.0',
          servers: {
            'server1': {
              name: 'Server 1',
              command: 'node',
              enabled: true
            },
            'server2': {
              name: 'Server 2',
              command: 'python',
              enabled: false
            }
          }
        };
        await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
      });

      it('should list all MCP servers', async () => {
        const tool = mcpTools.listMCPServers();
        const result = await tool.execute({});

        expect(result.success).toBe(true);
        expect(result.data.servers).toHaveLength(2);
        expect(result.data.total).toBe(2);
      });

      it('should list only enabled servers when requested', async () => {
        const tool = mcpTools.listMCPServers();
        const result = await tool.execute({ enabled_only: true });

        expect(result.success).toBe(true);
        expect(result.data.servers).toHaveLength(1);
        expect(result.data.servers[0].name).toBe('Server 1');
      });
    });

    describe('addMCPServer', () => {
      it('should add new MCP server configuration', async () => {
        const tool = mcpTools.addMCPServer();
        const result = await tool.execute({
          name: 'new-server',
          command: 'docker',
          args: ['run', 'container'],
          timeout: 60000,
          enabled: true
        });

        expect(result.success).toBe(true);
        expect(result.data.message).toContain('added successfully');

        // Verify server was added
        const config = await mcpTools.loadConfig();
        expect(config.servers['new-server']).toBeDefined();
        expect(config.servers['new-server'].command).toBe('docker');
      });
    });

    describe('removeMCPServer', () => {
      beforeEach(async () => {
        const testConfig = {
          version: '1.0.0',
          servers: {
            'temp-server': {
              name: 'Temp Server',
              command: 'node',
              enabled: true
            }
          }
        };
        await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
      });

      it('should remove existing MCP server', async () => {
        const tool = mcpTools.removeMCPServer();
        const result = await tool.execute({ name: 'temp-server' });

        expect(result.success).toBe(true);
        expect(result.data.message).toContain('removed successfully');

        // Verify server was removed
        const config = await mcpTools.loadConfig();
        expect(config.servers['temp-server']).toBeUndefined();
      });

      it('should handle non-existent server gracefully', async () => {
        const tool = mcpTools.removeMCPServer();
        const result = await tool.execute({ name: 'non-existent' });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found');
      });
    });

    describe('testMCPServer', () => {
      beforeEach(async () => {
        const testConfig = {
          version: '1.0.0',
          servers: {
            'test-server': {
              name: 'Test Server',
              command: 'node',
              enabled: true
            },
            'disabled-server': {
              name: 'Disabled Server',
              command: 'python',
              enabled: false
            }
          }
        };
        await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
      });

      it('should test enabled server connection', async () => {
        const tool = mcpTools.testMCPServer();
        const result = await tool.execute({ name: 'test-server' });

        expect(result.success).toBe(true);
        expect(result.data.result.status).toBe('connected');
        expect(result.data.result.name).toBe('test-server');
      });

      it('should handle disabled server', async () => {
        const tool = mcpTools.testMCPServer();
        const result = await tool.execute({ name: 'disabled-server' });

        expect(result.success).toBe(false);
        expect(result.error).toContain('disabled');
      });
    });
  });

  describe('ResearchTools', () => {
    let researchTools: ResearchTools;

    beforeEach(() => {
      researchTools = new ResearchTools();
    });

    describe('webSearch', () => {
      it('should perform web search and return results', async () => {
        const tool = researchTools.webSearch();
        const result = await tool.execute({
          query: 'TypeScript best practices',
          num_results: 5,
          language: 'en'
        });

        expect(result.success).toBe(true);
        expect(result.data.query).toBe('TypeScript best practices');
        expect(result.data.results).toHaveLength(5);
        expect(result.data.results[0]).toHaveProperty('title');
        expect(result.data.results[0]).toHaveProperty('url');
        expect(result.data.results[0]).toHaveProperty('snippet');
        expect(result.data.results[0]).toHaveProperty('relevanceScore');
      });

      it('should use cached results for repeated queries', async () => {
        const tool = researchTools.webSearch();
        const query = 'React hooks tutorial';

        // First search
        const result1 = await tool.execute({ query, num_results: 3 });
        expect(result1.success).toBe(true);
        expect(result1.data.cached).toBe(false);

        // Second search with same parameters
        const result2 = await tool.execute({ query, num_results: 3 });
        expect(result2.success).toBe(true);
        expect(result2.data.cached).toBe(true);
      });
    });

    describe('analyzeDocumentation', () => {
      it('should fetch and analyze documentation', async () => {
        const tool = researchTools.analyzeDocumentation();
        const result = await tool.execute({
          url: 'https://example.com/docs',
          extract_code: true,
          extract_tables: true
        });

        expect(result.success).toBe(true);
        expect(result.data.url).toBe('https://example.com/docs');
        expect(result.data.sections).toBeInstanceOf(Array);
        expect(result.data.sections.length).toBeGreaterThan(0);

        const section = result.data.sections[0];
        expect(section).toHaveProperty('title');
        expect(section).toHaveProperty('content');
        expect(section).toHaveProperty('sectionType');
        expect(section).toHaveProperty('relevanceScore');
      });

      it('should use cached documentation analysis', async () => {
        const tool = researchTools.analyzeDocumentation();
        const url = 'https://example.com/api-docs';

        // First analysis
        const result1 = await tool.execute({ url });
        expect(result1.success).toBe(true);
        expect(result1.data.cached).toBe(false);

        // Second analysis of same URL
        const result2 = await tool.execute({ url });
        expect(result2.success).toBe(true);
        expect(result2.data.cached).toBe(true);
      });
    });

    describe('researchMarketTrends', () => {
      it('should research market trends for a topic', async () => {
        const tool = researchTools.researchMarketTrends();
        const result = await tool.execute({
          topic: 'cloud computing',
          timeframe: 'recent',
          include_competitors: true,
          region: 'global'
        });

        expect(result.success).toBe(true);
        expect(result.data.topic).toBe('cloud computing');
        expect(result.data.trends).toBeInstanceOf(Array);
        expect(result.data.competitors).toBeInstanceOf(Array);
        expect(result.data.market_size).toBeDefined();
        expect(result.data.insights).toBeInstanceOf(Array);

        const trend = result.data.trends[0];
        expect(trend).toHaveProperty('name');
        expect(trend).toHaveProperty('description');
        expect(trend).toHaveProperty('growth_rate');
        expect(trend).toHaveProperty('confidence');
      });
    });

    describe('analyzeCompetitors', () => {
      it('should analyze competitor products and strategies', async () => {
        const tool = researchTools.analyzeCompetitors();
        const result = await tool.execute({
          product: 'project management software',
          competitors: ['Asana', 'Trello', 'Monday.com'],
          analysis_depth: 'comprehensive'
        });

        expect(result.success).toBe(true);
        expect(result.data.product).toBe('project management software');
        expect(result.data.competitors).toHaveLength(3);
        expect(result.data.market_analysis).toBeDefined();
        expect(result.data.recommendations).toBeInstanceOf(Array);

        const competitor = result.data.competitors[0];
        expect(competitor).toHaveProperty('name');
        expect(competitor).toHaveProperty('strengths');
        expect(competitor).toHaveProperty('weaknesses');
        expect(competitor).toHaveProperty('market_position');
      });
    });

    describe('researchBestPractices', () => {
      it('should research industry best practices', async () => {
        const tool = researchTools.researchBestPractices();
        const result = await tool.execute({
          domain: 'software development',
          practice_type: 'process',
          experience_level: 'intermediate'
        });

        expect(result.success).toBe(true);
        expect(result.data.domain).toBe('software development');
        expect(result.data.practice_type).toBe('process');
        expect(result.data.experience_level).toBe('intermediate');
        expect(result.data.practices).toBeInstanceOf(Array);
        expect(result.data.common_mistakes).toBeInstanceOf(Array);
        expect(result.data.success_metrics).toBeInstanceOf(Array);
        expect(result.data.resources).toBeInstanceOf(Array);

        const practice = result.data.practices[0];
        expect(practice).toHaveProperty('name');
        expect(practice).toHaveProperty('description');
        expect(practice).toHaveProperty('benefits');
        expect(practice).toHaveProperty('implementation');
        expect(practice).toHaveProperty('difficulty');
      });
    });

    describe('synthesizeResearch', () => {
      it('should synthesize multiple research sources', async () => {
        const sources = [
          {
            type: 'search',
            content: { query: 'AI best practices', results: [] }
          },
          {
            type: 'trends',
            content: { topic: 'AI adoption', trends: [] }
          },
          {
            type: 'competitors',
            content: { product: 'AI tools', competitors: [] }
          }
        ];

        const tool = researchTools.synthesizeResearch();
        const result = await tool.execute({
          sources,
          focus_area: 'AI implementation strategy',
          synthesis_type: 'strategic'
        });

        expect(result.success).toBe(true);
        expect(result.data.focus_area).toBe('AI implementation strategy');
        expect(result.data.synthesis_type).toBe('strategic');
        expect(result.data.sources_analyzed).toBe(3);
        expect(result.data.key_findings).toBeInstanceOf(Array);
        expect(result.data.patterns).toBeInstanceOf(Array);
        expect(result.data.recommendations).toBeInstanceOf(Array);
        expect(result.data.confidence_score).toBeGreaterThan(0);
      });
    });

    describe('clearResearchCache', () => {
      beforeEach(async () => {
        // Populate cache with some data
        await researchTools.webSearch().execute({ query: 'test query' });
        await researchTools.analyzeDocumentation().execute({ url: 'https://example.com' });
      });

      it('should clear all research cache', async () => {
        const tool = researchTools.clearResearchCache();
        const result = await tool.execute({ cache_type: 'all' });

        expect(result.success).toBe(true);
        expect(result.data.message).toContain('cache cleared successfully');
        expect(result.data.cacheType).toBe('all');
      });

      it('should clear specific cache type', async () => {
        const tool = researchTools.clearResearchCache();
        const result = await tool.execute({ cache_type: 'search' });

        expect(result.success).toBe(true);
        expect(result.data.message).toContain('search cache cleared');
      });
    });
  });

  describe('Tool Integration', () => {
    it('should provide all tools from each toolset', () => {
      const githubTools = new GitHubTools();
      const mcpTools = new MCPTools('/tmp/test.json');
      const researchTools = new ResearchTools();

      const githubToolList = githubTools.getAllTools();
      const mcpToolList = mcpTools.getAllTools();
      const researchToolList = researchTools.getAllTools();

      expect(githubToolList.length).toBeGreaterThan(0);
      expect(mcpToolList.length).toBeGreaterThan(0);
      expect(researchToolList.length).toBeGreaterThan(0);

      // Verify each tool has required properties
      [githubToolList, mcpToolList, researchToolList].flat().forEach(tool => {
        expect(tool).toHaveProperty('id');
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('category');
        expect(tool).toHaveProperty('enabled');
        expect(tool).toHaveProperty('parameters');
        expect(tool).toHaveProperty('execute');
      });
    });
  });
});