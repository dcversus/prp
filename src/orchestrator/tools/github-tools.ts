/**
 * ♫ GitHub Tools for @dcversus/prp Orchestrator
 *
 * GitHub API integration tools for PR operations, issue management,
 * workflow monitoring, and repository interactions.
 */

import { createLayerLogger } from '../../shared';

import type { Tool, ToolResult } from '../types';

const logger = createLayerLogger('orchestrator');

/**
 * GitHub API Tools
 */
export class GitHubTools {
  private readonly token: string;
  private readonly apiBase: string;

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN || '';
    this.apiBase = 'https://api.github.com';
  }

  /**
   * Get repository information
   */
  getRepositoryInfo(): Tool {
    return {
      id: 'github_get_repository_info',
      name: 'Get Repository Information',
      description: 'Get detailed information about a GitHub repository',
      category: 'github',
      enabled: true,
      parameters: {
        owner: {
          type: 'string',
          description: 'Repository owner username',
          required: true
        },
        repo: {
          type: 'string',
          description: 'Repository name',
          required: true
        }
      },
      execute: async (params: unknown): Promise<ToolResult> => {
        const typedParams = params as { owner: string; repo: string };
        try {
          const response = await this.githubRequest(`/repos/${typedParams.owner}/${typedParams.repo}`);

          return {
            success: true,
            data: response,
            executionTime: Date.now()
          };
        } catch (error) {
          logger.error('getRepositoryInfo', 'Failed to get repository info');
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            executionTime: Date.now()
          };
        }
      }
    };
  }

  /**
   * List pull requests
   */
  listPullRequests(): Tool {
    return {
      id: 'github_list_pull_requests',
      name: 'List Pull Requests',
      description: 'List pull requests with filtering options',
      category: 'github',
      enabled: true,
      parameters: {
        owner: {
          type: 'string',
          description: 'Repository owner username',
          required: true
        },
        repo: {
          type: 'string',
          description: 'Repository name',
          required: true
        },
        state: {
          type: 'string',
          description: 'PR state: open, closed, all',
          enum: ['open', 'closed', 'all'],
        },
        head: {
          type: 'string',
          description: 'Filter by head branch'
        },
        base: {
          type: 'string',
          description: 'Filter by base branch'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of PRs to return',
        }
      },
      execute: async (params: unknown): Promise<ToolResult> => {
        const typedParams = params as {
          owner: string;
          repo: string;
          state?: string;
          head?: string;
          base?: string;
          limit?: number;
        };
        try {
          const queryParams = new URLSearchParams();
          if (typedParams.state) {
            queryParams.append('state', typedParams.state);
          }
          if (typedParams.head) {
            queryParams.append('head', typedParams.head);
          }
          if (typedParams.base) {
            queryParams.append('base', typedParams.base);
          }
          queryParams.append('per_page', String(typedParams.limit || 20));

          const response = await this.githubRequest(`/repos/${typedParams.owner}/${typedParams.repo}/pulls?${queryParams}`);

          return {
            success: true,
            data: response,
            executionTime: Date.now()
          };
        } catch (error) {
          logger.error('listPullRequests', 'Failed to list pull requests');
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            executionTime: Date.now()
          };
        }
      }
    };
  }

  /**
   * Get pull request details
   */
  getPullRequestDetails(): Tool {
    return {
      id: 'github_get_pull_request_details',
      name: 'Get Pull Request Details',
      description: 'Get detailed information about a specific pull request',
      category: 'github',
      enabled: true,
      parameters: {
        owner: {
          type: 'string',
          description: 'Repository owner username',
          required: true
        },
        repo: {
          type: 'string',
          description: 'Repository name',
          required: true
        },
        pull_number: {
          type: 'number',
          description: 'Pull request number',
          required: true
        },
        include_files: {
          type: 'boolean',
          description: 'Include list of changed files',
        }
      },
      execute: async (params: unknown): Promise<ToolResult> => {
        try {
          const typedParams = params as {
            owner: string;
            repo: string;
            pull_number: number;
            include_files?: boolean;
          };
          const prResponse = await this.githubRequest(`/repos/${typedParams.owner}/${typedParams.repo}/pulls/${typedParams.pull_number}`);

          const result: any = prResponse;

          if (typedParams.include_files) {
            const filesResponse = await this.githubRequest(`/repos/${typedParams.owner}/${typedParams.repo}/pulls/${typedParams.pull_number}/files`);
            result.files = filesResponse;
          }

          return {
            success: true,
            data: result,
            executionTime: Date.now()
          };
        } catch (error) {
          logger.error('getPullRequestDetails', 'Failed to get PR details');
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            executionTime: Date.now()
          };
        }
      }
    };
  }

  /**
   * Create pull request
   */
  createPullRequest(): Tool {
    return {
      id: 'github_create_pull_request',
      name: 'Create Pull Request',
      description: 'Create a new pull request',
      category: 'github',
      enabled: true,
      parameters: {
        owner: {
          type: 'string',
          description: 'Repository owner username',
          required: true
        },
        repo: {
          type: 'string',
          description: 'Repository name',
          required: true
        },
        title: {
          type: 'string',
          description: 'PR title',
          required: true
        },
        body: {
          type: 'string',
          description: 'PR description/body'
        },
        head: {
          type: 'string',
          description: 'Head branch name',
          required: true
        },
        base: {
          type: 'string',
          description: 'Base branch name',
          required: true
        },
        draft: {
          type: 'boolean',
          description: 'Create as draft PR',
        }
      },
      execute: async (params: unknown): Promise<ToolResult> => {
        try {
          const typedParams = params as {
            owner: string;
            repo: string;
            title: string;
            body?: string;
            head: string;
            base: string;
            draft?: boolean;
          };

          const requestBody = {
            title: typedParams.title,
            body: typedParams.body || '',
            head: typedParams.head,
            base: typedParams.base,
            draft: typedParams.draft || false
          };

          const response = await this.githubRequest(`/repos/${typedParams.owner}/${typedParams.repo}/pulls`, {
            method: 'POST',
            body: JSON.stringify(requestBody)
          });

          return {
            success: true,
            data: response,
            executionTime: Date.now()
          };
        } catch (error) {
          logger.error('createPullRequest', 'Failed to create PR');
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            executionTime: Date.now()
          };
        }
      }
    };
  }

  /**
   * List issues
   */
  listIssues(): Tool {
    return {
      id: 'github_list_issues',
      name: 'List Issues',
      description: 'List repository issues with filtering options',
      category: 'github',
      enabled: true,
      parameters: {
        owner: {
          type: 'string',
          description: 'Repository owner username',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        state: {
          type: 'string',
          description: 'Issue state: open, closed, all',
        },
        labels: {
          type: 'string',
          description: 'Filter by labels (comma-separated)',
        },
        assignee: {
          type: 'string',
          description: 'Filter by assignee',
        },
        creator: {
          type: 'string',
          description: 'Filter by creator',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of issues to return',
        },
      },
      execute: async (params: unknown): Promise<ToolResult> => {
        try {
          const queryParams = new URLSearchParams();
          if (params.state) {
            queryParams.append('state', params.state);
          }
          if (params.labels) {
            queryParams.append('labels', params.labels);
          }
          if (params.assignee) {
            queryParams.append('assignee', params.assignee);
          }
          if (params.creator) {
            queryParams.append('creator', params.creator);
          }
          queryParams.append('per_page', String(params.limit || 20));

          const response = await this.githubRequest(`/repos/${params.owner}/${params.repo}/issues?${queryParams}`);

          return {
            success: true,
            data: response,
            executionTime: Date.now()
          };
        } catch (error) {
          logger.error('listIssues', 'Failed to list issues');
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            executionTime: Date.now()
          };
        }
      }
    };
  }

  /**
   * Get workflow runs
   */
  getWorkflowRuns(): Tool {
    return {
      id: 'github_get_workflow_runs',
      name: 'Get Workflow Runs',
      description: 'Get GitHub Actions workflow runs for a repository',
      category: 'github',
      enabled: true,
      parameters: {
        type: 'object',
        properties: {
          owner: {
            type: 'string',
            description: 'Repository owner username',
            required: true
          },
          repo: {
            type: 'string',
            description: 'Repository name',
            required: true
          },
          workflow_id: {
            type: 'string',
            description: 'Workflow ID or filename'
          },
          status: {
            type: 'string',
            description: 'Filter by status',
            enum: ['queued', 'in_progress', 'completed']
          },
          branch: {
            type: 'string',
            description: 'Filter by branch'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of runs to return',
          }
        },
        required: ['owner', 'repo']
      },
      execute: async (params: unknown): Promise<ToolResult> => {
        try {
          const queryParams = new URLSearchParams();
          if (params.workflow_id) {
            queryParams.append('workflow_id', params.workflow_id);
          }
          if (params.status) {
            queryParams.append('status', params.status);
          }
          if (params.branch) {
            queryParams.append('branch', params.branch);
          }
          queryParams.append('per_page', String(params.limit || 20));

          const response = await this.githubRequest(`/repos/${params.owner}/${params.repo}/actions/runs?${queryParams}`);

          return {
            success: true,
            data: response,
            executionTime: Date.now()
          };
        } catch (error) {
          logger.error('getWorkflowRuns', 'Failed to get workflow runs');
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            executionTime: Date.now()
          };
        }
      }
    };
  }

  /**
   * Get workflow run details
   */
  getWorkflowRunDetails(): Tool {
    return {
      id: 'github_get_workflow_run_details',
      name: 'Get Workflow Run Details',
      description: 'Get detailed information about a specific workflow run',
      category: 'github',
      enabled: true,
      parameters: {
        type: 'object',
        properties: {
          owner: {
            type: 'string',
            description: 'Repository owner username',
            required: true
          },
          repo: {
            type: 'string',
            description: 'Repository name',
            required: true
          },
          run_id: {
            type: 'number',
            description: 'Workflow run ID',
            required: true
          },
          include_jobs: {
            type: 'boolean',
            description: 'Include job details',
          }
        },
        required: ['owner', 'repo', 'run_id']
      },
      execute: async (params: unknown): Promise<ToolResult> => {
        try {
          const runResponse = await this.githubRequest(`/repos/${params.owner}/${params.repo}/actions/runs/${params.run_id}`);

          const result: any = runResponse;

          if (params.include_jobs) {
            const jobsResponse = await this.githubRequest(`/repos/${params.owner}/${params.repo}/actions/runs/${params.run_id}/jobs`);
            result.jobs = jobsResponse;
          }

          return {
            success: true,
            data: result,
            executionTime: Date.now()
          };
        } catch (error) {
          logger.error('getWorkflowRunDetails', 'Failed to get workflow run details');
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            executionTime: Date.now()
          };
        }
      }
    };
  }

  /**
   * Create or update file
   */
  createOrUpdateFile(): Tool {
    return {
      id: 'github_create_or_update_file',
      name: 'Create or Update File',
      description: 'Create or update a file in a repository',
      category: 'github',
      enabled: true,
      parameters: {
        type: 'object',
        properties: {
          owner: {
            type: 'string',
            description: 'Repository owner username',
            required: true
          },
          repo: {
            type: 'string',
            description: 'Repository name',
            required: true
          },
          path: {
            type: 'string',
            description: 'File path in repository',
            required: true
          },
          content: {
            type: 'string',
            description: 'File content (base64 encoded)',
            required: true
          },
          message: {
            type: 'string',
            description: 'Commit message',
            required: true
          },
          branch: {
            type: 'string',
            description: 'Branch name',
            required: true
          },
          sha: {
            type: 'string',
            description: 'SHA of file to update (required for updates)'
          }
        },
        required: ['owner', 'repo', 'path', 'content', 'message', 'branch']
      },
      execute: async (params: unknown): Promise<ToolResult> => {
        try {
          const requestBody = {
            message: params.message,
            content: params.content,
            branch: params.branch
          };

          if (params.sha) {
            (requestBody as any).sha = params.sha;
          }

          const response = await this.githubRequest(`/repos/${params.owner}/${params.repo}/contents/${params.path}`, {
            method: 'PUT',
            body: JSON.stringify(requestBody)
          });

          return {
            success: true,
            data: response,
            executionTime: Date.now()
          };
        } catch (error) {
          logger.error('createOrUpdateFile', 'Failed to create/update file');
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            executionTime: Date.now()
          };
        }
      }
    };
  }

  /**
   * Search repositories
   */
  searchRepositories(): Tool {
    return {
      id: 'github_search_repositories',
      name: 'Search Repositories',
      description: 'Search GitHub repositories',
      category: 'github',
      enabled: true,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
            required: true
          },
          sort: {
            type: 'string',
            description: 'Sort field',
            enum: ['stars', 'forks', 'updated'],
          },
          order: {
            type: 'string',
            description: 'Sort order',
            enum: ['asc', 'desc'],
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results',
          }
        },
        required: ['query']
      },
      execute: async (params: unknown): Promise<ToolResult> => {
        try {
          const queryParams = new URLSearchParams();
          queryParams.append('q', params.query);
          queryParams.append('sort', params.sort || 'updated');
          queryParams.append('order', params.order || 'desc');
          queryParams.append('per_page', String(params.limit || 20));

          const response = await this.githubRequest(`/search/repositories?${queryParams}`);

          return {
            success: true,
            data: response,
            executionTime: Date.now()
          };
        } catch (error) {
          logger.error('searchRepositories', 'Failed to search repositories');
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            executionTime: Date.now()
          };
        }
      }
    };
  }

  /**
   * Make GitHub API request
   */
  private async githubRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.apiBase}${endpoint}`;

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': '@dcversus/prp-orchestrator'
    };

    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get all available tools
   */
  getAllTools(): Tool[] {
    return [
      this.getRepositoryInfo(),
      this.listPullRequests(),
      this.getPullRequestDetails(),
      this.createPullRequest(),
      this.listIssues(),
      this.getWorkflowRuns(),
      this.getWorkflowRunDetails(),
      this.createOrUpdateFile(),
      this.searchRepositories()
    ];
  }
}