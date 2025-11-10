/**
 * ♫ HTTP Tools for @dcversus/prp
 *
 * Generic HTTP request tools for web APIs, web search, and external integrations
 * Can be used by orchestrator, agents, and other components.
 */

import { Tool, ToolResult } from './types.js';
import { createLayerLogger } from '../logger.js';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

const logger = createLayerLogger('http-tools');

// Type definitions for HTTP tools
export interface HttpRequestParams {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  followRedirects?: boolean;
}

export interface WebSearchParams {
  query: string;
  engine?: 'duckduckgo' | 'brave' | 'startpage';
  limit?: number;
  safeSearch?: boolean;
}

export interface GitHubApiParams {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  token?: string;
  body?: string;
  owner?: string;
  repo?: string;
}

export interface UrlValidationParams {
  url: string;
  method?: 'HEAD' | 'GET';
  timeout?: number;
}

export interface HttpResponse {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string>;
  data: string;
  dataSize: number;
  url: string;
  method: string;
  responseTime: number;
  jsonData?: unknown;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  engine: string;
}

export interface GitHubApiResponse {
  endpoint: string;
  method: string;
  data: unknown;
  status: number;
  rateLimit: {
    remaining?: string;
    limit?: string;
    reset?: string;
    used?: string;
  };
  responseTime: number;
}

export interface UrlValidationResult {
  url: string;
  valid: boolean;
  accessible: boolean;
  statusCode?: number;
  statusText?: string;
  contentType?: string;
  contentLength?: string;
  responseTime: number;
  finalUrl?: string;
  error?: string;
}

// Node.js HTTP interfaces
export interface HTTPResponse {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string>;
  on(event: string, listener: (...args: unknown[]) => void): void;
}

/**
 * HTTP Request Tool
 */
export const httpRequestTool: Tool = {
  id: 'http_request',
  name: 'http_request',
  description: 'Make HTTP requests to external APIs and web services',
  category: 'network',
  enabled: true,
  parameters: {
    url: {
      type: 'string',
      description: 'URL to make request to',
      required: true
    },
    method: {
      type: 'string',
      description: 'HTTP method (GET, POST, PUT, DELETE, PATCH)',
      required: false,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    },
    headers: {
      type: 'object',
      description: 'HTTP headers to include',
      required: false
    },
    body: {
      type: 'string',
      description: 'Request body (JSON string)',
      required: false
    },
    timeout: {
      type: 'number',
      description: 'Request timeout in milliseconds',
      required: false
    },
    followRedirects: {
      type: 'boolean',
      description: 'Follow HTTP redirects',
      required: false
    }
  },
  execute: async (params: unknown) => {
    const typedParams = params as HttpRequestParams;
    // https, http, URL already imported

    return new Promise((resolve, reject) => {
      try {
        const url = new URL(typedParams.url);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
          hostname: url.hostname,
          port: url.port ? parseInt(url.port, 10) : (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method: typedParams.method ?? 'GET',
          headers: {
            'User-Agent': getCliUserAgent(),
            'Accept': 'application/json, text/plain, */*',
            ...typedParams.headers
          },
          timeout: typedParams.timeout ?? 30000
        };

        // Set up the request
        const req = client.request(options, (res: http.IncomingMessage) => {
          let data = '';

          res.on('data', (chunk: unknown) => {
            data += (chunk as Buffer).toString();
          });

          res.on('end', () => {
            const result: ToolResult = {
              success: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
              data: {
                statusCode: res.statusCode ?? 0,
                statusMessage: res.statusMessage,
                headers: res.headers,
                data: data,
                dataSize: data.length,
                url: typedParams.url,
                method: typedParams.method ?? 'GET',
                responseTime: Date.now()
              },
              executionTime: 0
            };

            // Try to parse JSON responses
            try {
              const contentType = res.headers['content-type'] ?? '';
              if (contentType.includes('application/json')) {
                (result.data as HttpResponse).jsonData = JSON.parse(data);
              }
            } catch {
              // Keep as raw data if JSON parsing fails
            }

            logger.info('http_request', `HTTP ${typedParams.method ?? 'GET'} ${typedParams.url} → ${res.statusCode}`);
            resolve(result);
          });
        });

        req.on('error', (error: Error) => {
          logger.error('http_request', 'HTTP request failed', error);
          reject(error);
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`HTTP request timeout: ${typedParams.timeout ?? 30000}ms`));
        });

        // Send request body if provided
        if (typedParams.body && (typedParams.method === 'POST' || typedParams.method === 'PUT' || typedParams.method === 'PATCH')) {
          req.write(typedParams.body);
        }

        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }
};

/**
 * Web Search Tool
 */
export const webSearchTool: Tool = {
  id: 'web_search',
  name: 'web_search',
  description: 'Search the web for information using multiple search engines',
  category: 'network',
  enabled: true,
  parameters: {
    query: {
      type: 'string',
      description: 'Search query',
      required: true
    },
    engine: {
      type: 'string',
      description: 'Search engine to use',
      required: false,
      enum: ['duckduckgo', 'brave', 'startpage']
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results',
      required: false
    },
    safeSearch: {
      type: 'boolean',
      description: 'Enable safe search filtering',
      required: false
    }
  },
  execute: async (params: unknown) => {
    const typedParams = params as WebSearchParams;
    // Use DuckDuckGo instant answer API for web search
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(typedParams.query)}`;

    try {
      const response = await httpRequestTool.execute({
        url: searchUrl,
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      if (!response.success) {
        throw new Error(`Search failed with status ${(response.data as HttpResponse).statusCode}`);
      }

      // Parse HTML results (simplified parsing)
      const html = (response.data as HttpResponse).data;
      const results: SearchResult[] = [];

      // Extract search results using regex
      const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
      let match;

      let count = 0;
      while ((match = resultRegex.exec(html)) && count < (typedParams.limit ?? 10)) {
        const url = match[1];
        const title = match[2]?.replace(/<[^>]*>/g, '').trim() ?? '';

        if (url && title && !url.startsWith('/')) {
          results.push({
            title,
            url,
            snippet: 'Search result from DuckDuckGo',
            engine: typedParams.engine ?? 'duckduckgo'
          });
          count++;
        }
      }

      logger.info('web_search', `Web search for "${typedParams.query}" → ${results.length} results`);

      return {
        success: true,
        data: {
          query: typedParams.query,
          engine: typedParams.engine ?? 'duckduckgo',
          results,
          totalResults: results.length,
          responseTime: Date.now()
        },
        executionTime: 0
      };

    } catch (error) {
      logger.error('web_search', 'Web search failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
};

/**
 * GitHub API Tool
 */
export const githubApiTool: Tool = {
  id: 'github_api',
  name: 'github_api',
  description: 'Interact with GitHub API for repositories, PRs, issues, and more',
  category: 'network',
  enabled: true,
  parameters: {
    endpoint: {
      type: 'string',
      description: 'GitHub API endpoint (e.g., /user/repos, /repos/owner/repo/pulls)',
      required: true
    },
    method: {
      type: 'string',
      description: 'HTTP method',
      required: false,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    },
    token: {
      type: 'string',
      description: 'GitHub personal access token (optional, can use GITHUB_TOKEN env var)',
      required: false
    },
    body: {
      type: 'string',
      description: 'Request body (JSON string)',
      required: false
    },
    owner: {
      type: 'string',
      description: 'Repository owner (if needed for endpoint)',
      required: false
    },
    repo: {
      type: 'string',
      description: 'Repository name (if needed for endpoint)',
      required: false
    }
  },
  execute: async (params: unknown) => {
    const typedParams = params as GitHubApiParams;
    const baseUrl = 'https://api.github.com';
    let url = baseUrl + typedParams.endpoint;

    // Replace placeholders in endpoint
    if (typedParams.owner) {
      url = url.replace('{owner}', typedParams.owner);
    }
    if (typedParams.repo) {
      url = url.replace('{repo}', typedParams.repo);
    }

    const token = typedParams.token ?? process.env.GITHUB_TOKEN;

    if (!token && typedParams.method !== 'GET') {
      throw new Error('GitHub token required for non-GET requests');
    }

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': getCliUserAgent(),
      'X-GitHub-Api-Version': '2022-11-28'
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    try {
      const response = await httpRequestTool.execute({
        url,
        method: typedParams.method ?? 'GET',
        headers,
        body: typedParams.body,
        timeout: 30000
      });

      const responseData = response.data as HttpResponse;
      logger.info('github_api', `GitHub API ${typedParams.method ?? 'GET'} ${typedParams.endpoint} → ${responseData.statusCode}`);

      return {
        success: response.success,
        data: {
          endpoint: typedParams.endpoint,
          method: typedParams.method ?? 'GET',
          data: responseData.jsonData ?? responseData.data,
          status: responseData.statusCode,
          rateLimit: {
            remaining: responseData.headers['x-ratelimit-remaining'],
            limit: responseData.headers['x-ratelimit-limit'],
            reset: responseData.headers['x-ratelimit-reset'],
            used: responseData.headers['x-ratelimit-used']
          },
          responseTime: Date.now()
        },
        executionTime: 0
      };

    } catch (error) {
      logger.error('github_api', 'GitHub API request failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
};

/**
 * URL Validation Tool
 */
export const urlValidationTool: Tool = {
  id: 'validate_url',
  name: 'validate_url',
  description: 'Validate URLs and check if they are accessible',
  category: 'network',
  enabled: true,
  parameters: {
    url: {
      type: 'string',
      description: 'URL to validate',
      required: true
    },
    method: {
      type: 'string',
      description: 'HTTP method to use for validation',
      required: false,
      enum: ['HEAD', 'GET']
    },
    timeout: {
      type: 'number',
      description: 'Timeout in milliseconds',
      required: false
    }
  },
  execute: async (params: unknown) => {
    const typedParams = params as UrlValidationParams;
    // URL already imported

    try {
      new URL(typedParams.url); // Validate URL format

      const response = await httpRequestTool.execute({
        url: typedParams.url,
        method: typedParams.method ?? 'HEAD',
        timeout: typedParams.timeout ?? 10000
      });

      const responseData = response.data as HttpResponse;
      const validation: UrlValidationResult = {
        url: typedParams.url,
        valid: true,
        accessible: response.success,
        statusCode: responseData.statusCode,
        statusText: responseData.statusMessage,
        contentType: responseData.headers['content-type'],
        contentLength: responseData.headers['content-length'],
        responseTime: Date.now(),
        finalUrl: responseData.headers['location'] ?? typedParams.url // Handle redirects
      };

      logger.info('validate_url', `URL validation: ${typedParams.url} → ${responseData.statusCode}`);

      return {
        success: true,
        data: validation,
        executionTime: 0
      };

    } catch (error) {
      logger.error('validate_url', 'URL validation failed', error instanceof Error ? error : new Error(String(error)));

      return {
        success: false,
        data: {
          url: typedParams.url,
          valid: false,
          accessible: false,
          error: error instanceof Error ? error.message : String(error),
          responseTime: Date.now()
        },
        executionTime: 0
      };
    }
  }
};

// Export all HTTP tools
export const httpTools = [
  httpRequestTool,
  webSearchTool,
  githubApiTool,
  urlValidationTool
];