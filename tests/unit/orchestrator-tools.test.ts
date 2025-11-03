/**
 * Unit Tests for Orchestrator Tools
 */

import { httpRequestTool, webSearchTool, githubApiTool, urlValidationTool } from '../../src/orchestrator/tools/http-tools';
import { spawnAgentTool, getAgentStatusTool, killAgentTool, sendMessageToAgentTool } from '../../src/orchestrator/tools/agent-tools';
import {
  getTokenUsageTool,
  setTokenLimitsTool,
  getTokenProjectionsTool,
  getTokenEfficiencyTool,
  configureTokenAlertsTool
} from '../../src/orchestrator/tools/token-tracking-tools';

// Mock Node.js modules
jest.mock('https');
jest.mock('http');
jest.mock('child_process');
jest.mock('fs');
jest.mock('url');

describe('HTTP Tools', () => {
  describe('httpRequestTool', () => {
    test('should make successful GET request', async () => {
      const mockResponse = {
        statusCode: 200,
        statusMessage: 'OK',
        headers: { 'content-type': 'application/json' },
        data: '{"message": "success"}'
      };

      // Mock https module
      const mockHttps = {
        request: jest.fn().mockImplementation((options, callback) => {
          const mockRes = {
            on: jest.fn().mockImplementation((event, handler) => {
              if (event === 'data') {
                handler(mockResponse.data);
              } else if (event === 'end') {
                handler();
              }
            }),
            headers: mockResponse.headers,
            statusCode: mockResponse.statusCode,
            statusMessage: mockResponse.statusMessage
          };
          callback(mockRes);

          return {
            on: jest.fn(),
            write: jest.fn(),
            end: jest.fn(),
            destroy: jest.fn()
          };
        })
      };

      jest.doMock('https', () => mockHttps);
      const https = require('https');

      const result = await httpRequestTool.execute({
        url: 'https://api.example.com/test',
        method: 'GET'
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toBe('{"message": "success"}');
      expect(result.jsonData).toEqual({ message: 'success' });
    });

    test('should handle POST request with body', async () => {
      const mockResponse = {
        statusCode: 201,
        statusMessage: 'Created',
        headers: { 'content-type': 'application/json' },
        data: '{"id": 123}'
      };

      const mockHttps = {
        request: jest.fn().mockImplementation((options, callback) => {
          const mockRes = {
            on: jest.fn().mockImplementation((event, handler) => {
              if (event === 'data') {
                handler(mockResponse.data);
              } else if (event === 'end') {
                handler();
              }
            }),
            headers: mockResponse.headers,
            statusCode: mockResponse.statusCode,
            statusMessage: mockResponse.statusMessage
          };
          callback(mockRes);

          return {
            on: jest.fn(),
            write: jest.fn(),
            end: jest.fn(),
            destroy: jest.fn()
          };
        })
      };

      jest.doMock('https', () => mockHttps);
      const https = require('https');

      const result = await httpRequestTool.execute({
        url: 'https://api.example.com/items',
        method: 'POST',
        body: '{"name": "test item"}',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(201);
      expect(result.jsonData).toEqual({ id: 123 });
    });

    test('should handle request errors', async () => {
      const mockHttps = {
        request: jest.fn().mockImplementation((options, callback) => {
          const mockReq = {
            on: jest.fn().mockImplementation((event, handler) => {
              if (event === 'error') {
                handler(new Error('Connection failed'));
              }
            }),
            write: jest.fn(),
            end: jest.fn(),
            destroy: jest.fn()
          };
          callback(mockReq);
          return mockReq;
        })
      };

      jest.doMock('https', () => mockHttps);
      const https = require('https');

      await expect(httpRequestTool.execute({
        url: 'https://invalid.example.com',
        method: 'GET'
      })).rejects.toThrow('Connection failed');
    });
  });

  describe('webSearchTool', () => {
    test('should perform web search and return results', async () => {
      // Mock the httpRequestTool
      const mockSearchResponse = {
        success: true,
        status: 200,
        data: `
          <html>
            <body>
              <a class="result__a" href="https://example.com/page1">Example Page 1</a>
              <a class="result__a" href="https://example.com/page2">Example Page 2</a>
              <a class="result__a" href="https://example.com/page3">Example Page 3</a>
            </body>
          </html>
        `
      };

      jest.spyOn(httpRequestTool, 'execute').mockResolvedValue(mockSearchResponse);

      const result = await webSearchTool.execute({
        query: 'test search query',
        engine: 'duckduckgo',
        limit: 5
      });

      expect(result.success).toBe(true);
      expect(result.query).toBe('test search query');
      expect(result.engine).toBe('duckduckgo');
      expect(result.results).toHaveLength(3);
      expect(result.results[0]).toMatchObject({
        title: 'Example Page 1',
        url: 'https://example.com/page1',
        engine: 'duckduckgo'
      });
    });

    test('should handle search with different engines', async () => {
      const mockSearchResponse = {
        success: true,
        data: '<html><body></body></html>'
      };

      jest.spyOn(httpRequestTool, 'execute').mockResolvedValue(mockSearchResponse);

      const result = await webSearchTool.execute({
        query: 'test',
        engine: 'brave',
        limit: 10
      });

      expect(result.engine).toBe('brave');
      expect(result.results).toEqual([]);
    });
  });

  describe('githubApiTool', () => {
    beforeEach(() => {
      // Clear environment variables
      delete process.env.GITHUB_TOKEN;
    });

    test('should make successful GitHub API request', async () => {
      const mockResponse = {
        success: true,
        status: 200,
        jsonData: {
          id: 12345,
          name: 'test-repo',
          full_name: 'user/test-repo'
        },
        headers: {
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-limit': '5000',
          'x-ratelimit-reset': '1634567890',
          'x-ratelimit-used': '1'
        }
      };

      jest.spyOn(httpRequestTool, 'execute').mockResolvedValue(mockResponse);

      const result = await githubApiTool.execute({
        endpoint: '/repos/user/test-repo',
        token: 'ghp_testtoken',
        method: 'GET'
      });

      expect(result.success).toBe(true);
      expect(result.endpoint).toBe('/repos/user/test-repo');
      expect(result.data).toEqual({
        id: 12345,
        name: 'test-repo',
        full_name: 'user/test-repo'
      });
      expect(result.rateLimit).toEqual({
        remaining: '4999',
        limit: '5000',
        reset: '1634567890',
        used: '1'
      });
    });

    test('should use environment token when available', async () => {
      process.env.GITHUB_TOKEN = 'env_test_token';

      const mockResponse = {
        success: true,
        status: 200,
        jsonData: { login: 'testuser' }
      };

      jest.spyOn(httpRequestTool, 'execute').mockResolvedValue(mockResponse);

      const result = await githubApiTool.execute({
        endpoint: '/user',
        method: 'GET'
      });

      // Should not require token parameter when env var is set
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ login: 'testuser' });
    });

    test('should require token for non-GET requests', async () => {
      await expect(githubApiTool.execute({
        endpoint: '/repos/user/new-repo',
        method: 'POST',
        body: '{"name": "new-repo"}'
      })).rejects.toThrow('GitHub token required for non-GET requests');
    });
  });

  describe('urlValidationTool', () => {
    test('should validate accessible URL', async () => {
      const mockResponse = {
        success: true,
        status: 200,
        headers: {
          'content-type': 'text/html',
          'content-length': '1024'
        }
      };

      jest.spyOn(httpRequestTool, 'execute').mockResolvedValue(mockResponse);

      const result = await urlValidationTool.execute({
        url: 'https://example.com',
        method: 'HEAD',
        timeout: 5000
      });

      expect(result.valid).toBe(true);
      expect(result.accessible).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.contentType).toBe('text/html');
      expect(result.contentLength).toBe('1024');
    });

    test('should handle invalid URL gracefully', async () => {
      const { URL } = require('url');

      await expect(urlValidationTool.execute({
        url: 'invalid-url',
        method: 'HEAD'
      })).rejects.toThrow();
    });

    test('should handle inaccessible URL', async () => {
      const mockResponse = {
        success: false,
        status: 404
      };

      jest.spyOn(httpRequestTool, 'execute').mockResolvedValue(mockResponse);

      const result = await urlValidationTool.execute({
        url: 'https://example.com/notfound',
        method: 'HEAD'
      });

      expect(result.valid).toBe(true);
      expect(result.accessible).toBe(false);
      expect(result.statusCode).toBe(404);
    });
  });
});

describe('Agent Tools', () => {
  describe('spawnAgentTool', () => {
    test('should spawn agent with valid configuration', async () => {
      const mockSpawn = jest.fn().mockReturnValue({
        pid: 12345,
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn().mockImplementation((event, handler) => {
          if (event === 'spawn') {
            handler();
          }
        })
      });

      jest.doMock('child_process', () => ({ spawn: mockSpawn }));
      const { spawn } = require('child_process');

      const mockFs = {
        existsSync: jest.fn().mockReturnValue(false),
        mkdirSync: jest.fn(),
        writeFileSync: jest.fn()
      };

      jest.doMock('fs', () => mockFs);
      const fs = require('fs');

      const result = await spawnAgentTool.execute({
        agentType: 'claude-code',
        role: 'robo-developer',
        task: 'Implement user authentication',
        config: {
          apiKey: 'test-api-key',
          maxTokens: 4096
        }
      });

      expect(result.success).toBe(true);
      expect(result.agentType).toBe('claude-code');
      expect(result.role).toBe('robo-developer');
      expect(result.pid).toBe(12345);
      expect(result.status).toBe('spawned');
      expect(result.agentId).toMatch(/^agent_\d+_[a-z0-9]+$/);

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.stringContaining('claude'),
        expect.any(Array),
        expect.objectContaining({
          cwd: expect.stringContaining('worktrees'),
          env: expect.objectContaining({
            AGENT_ID: expect.any(String),
            AGENT_TYPE: 'claude-code',
            AGENT_ROLE: 'robo-developer',
            WORKTREE: expect.any(String)
          })
        })
      );
    });

    test('should reject invalid agent types', async () => {
      await expect(spawnAgentTool.execute({
        agentType: 'invalid-agent' as any,
        role: 'robo-developer'
      })).rejects.toThrow();
    });
  });

  describe('getAgentStatusTool', () => {
    test('should return agent statuses', async () => {
      // Mock getRunningAgents function
      const mockAgents = [
        {
          id: 'agent_1',
          type: 'claude-code',
          status: 'active',
          lastActivity: new Date().toISOString()
        },
        {
          id: 'agent_2',
          type: 'claude-code-glm',
          status: 'idle',
          lastActivity: new Date().toISOString()
        }
      ];

      // This would normally query actual running agents
      const result = await getAgentStatusTool.execute({
        includeMetrics: true
      });

      expect(result.success).toBe(true);
      expect(result.totalAgents).toBeGreaterThanOrEqual(0);
      expect(result.agents).toBeInstanceOf(Array);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('killAgentTool', () => {
    test('should kill agent gracefully', async () => {
      const mockProcess = {
        killed: false,
        send: jest.fn(),
        once: jest.fn().mockImplementation((event, handler) => {
          if (event === 'exit') {
            setTimeout(handler, 100);
          }
        }),
        kill: jest.fn().mockImplementation((signal) => {
          mockProcess.killed = true;
        })
      };

      // Mock getAgentById to return our mock process
      const mockAgent = {
        id: 'agent_1',
        process: mockProcess
      };

      const result = await killAgentTool.execute({
        agentId: 'agent_1',
        graceful: true,
        timeout: 5000
      });

      expect(result.success).toBe(true);
      expect(result.agentId).toBe('agent_1');
      expect(result.killed).toBe(true);
      expect(result.method).toBe('graceful');
      expect(mockProcess.send).toHaveBeenCalledWith({ command: 'shutdown' });
    });

    test('should force kill if graceful fails', async () => {
      const mockProcess = {
        killed: false,
        send: jest.fn().mockImplementation(() => {
          throw new Error('Graceful shutdown failed');
        }),
        kill: jest.fn(),
        once: jest.fn()
      };

      const mockAgent = {
        id: 'agent_1',
        process: mockProcess
      };

      const result = await killAgentTool.execute({
        agentId: 'agent_1',
        graceful: true,
        timeout: 1000
      });

      expect(result.success).toBe(true);
      expect(result.method).toBe('force');
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });
  });

  describe('sendMessageToAgentTool', () => {
    test('should send message to active agent', async () => {
      const mockProcess = {
        killed: false,
        send: jest.fn()
      };

      const mockAgent = {
        id: 'agent_1',
        process: mockProcess
      };

      const result = await sendMessageToAgentTool.execute({
        agentId: 'agent_1',
        message: 'Please fix the authentication bug',
        messageType: 'instruction',
        priority: 'high'
      });

      expect(result.success).toBe(true);
      expect(result.agentId).toBe('agent_1');
      expect(result.messageType).toBe('instruction');
      expect(result.priority).toBe('high');
      expect(mockProcess.send).toHaveBeenCalledWith({
        type: 'instruction',
        content: 'Please fix the authentication bug',
        priority: 'high',
        timestamp: expect.any(String),
        from: 'orchestrator'
      });
    });

    test('should reject message to non-existent agent', async () => {
      await expect(sendMessageToAgentTool.execute({
        agentId: 'non-existent-agent',
        message: 'Test message'
      })).rejects.toThrow('Agent non-existent-agent not found');
    });
  });
});

describe('Token Tracking Tools', () => {
  describe('getTokenUsageTool', () => {
    test('should return token usage statistics', async () => {
      const result = await getTokenUsageTool.execute({
        period: 'daily',
        includeProjections: true
      });

      expect(result.success).toBe(true);
      expect(result.period).toBe('daily');
      expect(result.system).toBeDefined();
      expect(result.agents).toBeInstanceOf(Array);
      expect(result.costEstimate).toBeDefined();
      expect(result.projections).toBeDefined();
    });

    test('should filter by specific agent ID', async () => {
      const result = await getTokenUsageTool.execute({
        agentId: 'agent_1',
        period: 'weekly'
      });

      expect(result.success).toBe(true);
      expect(result.agents?.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('setTokenLimitsTool', () => {
    test('should set token limits for agent', async () => {
      const result = await setTokenLimitsTool.execute({
        agentType: 'claude-code',
        dailyLimit: 1000000,
        weeklyLimit: 5000000,
        monthlyLimit: 20000000,
        warningThreshold: 80,
        actionThreshold: 95
      });

      expect(result.success).toBe(true);
      expect(result.limits.agentType).toBe('claude-code');
      expect(result.limits.daily).toBe(1000000);
      expect(result.limits.weekly).toBe(5000000);
      expect(result.limits.monthly).toBe(20000000);
      expect(result.limits.warningThreshold).toBe(80);
      expect(result.limits.actionThreshold).toBe(95);
    });

    test('should set default limits when no agent specified', async () => {
      const result = await setTokenLimitsTool.execute({
        dailyLimit: 500000,
        warningThreshold: 75
      });

      expect(result.success).toBe(true);
      expect(result.limits.agentId).toBeUndefined();
      expect(result.limits.daily).toBe(500000);
      expect(result.limits.warningThreshold).toBe(75);
    });
  });

  describe('getTokenProjectionsTool', () => {
    test('should generate token usage projections', async () => {
      const result = await getTokenProjectionsTool.execute({
        timeframe: 'weekly',
        includeCostEstimates: true
      });

      expect(result.success).toBe(true);
      expect(result.timeframe).toBe('weekly');
      expect(result.projections).toBeDefined();
      expect(result.methodology).toBeDefined();
    });

    test('should project for different timeframes', async () => {
      const timeframes = ['daily', 'weekly', 'monthly', 'quarterly'];

      for (const timeframe of timeframes) {
        const result = await getTokenProjectionsTool.execute({ timeframe });
        expect(result.success).toBe(true);
        expect(result.timeframe).toBe(timeframe);
      }
    });
  });

  describe('getTokenEfficiencyTool', () => {
    test('should analyze token efficiency', async () => {
      const result = await getTokenEfficiencyTool.execute({
        period: 'weekly',
        includeRecommendations: true
      });

      expect(result.success).toBe(true);
      expect(result.period).toBe('weekly');
      expect(result.overallEfficiency).toBeDefined();
      expect(result.agentBreakdown).toBeInstanceOf(Array);
      expect(result.systemRecommendations).toBeInstanceOf(Array);
    });

    test('should provide efficiency recommendations', async () => {
      const result = await getTokenEfficiencyTool.execute({
        includeRecommendations: true
      });

      expect(result.systemRecommendations).toBeDefined();
      expect(result.systemRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('configureTokenAlertsTool', () => {
    test('should configure token alerts', async () => {
      const result = await configureTokenAlertsTool.execute({
        alertType: 'warning',
        threshold: 80,
        notificationMethod: 'signal',
        recipients: ['admin@example.com'],
        enabled: true
      });

      expect(result.success).toBe(true);
      expect(result.alertConfig.alertType).toBe('warning');
      expect(result.alertConfig.threshold).toBe(80);
      expect(result.alertConfig.notificationMethod).toBe('signal');
      expect(result.alertConfig.recipients).toEqual(['admin@example.com']);
      expect(result.alertConfig.enabled).toBe(true);
    });

    test('should configure different alert types', async () => {
      const alertTypes = ['warning', 'critical', 'daily_report', 'weekly_report'];

      for (const alertType of alertTypes) {
        const result = await configureTokenAlertsTool.execute({
          alertType,
          threshold: 90,
          notificationMethod: 'nudge'
        });

        expect(result.success).toBe(true);
        expect(result.alertConfig.alertType).toBe(alertType);
      }
    });
  });
});