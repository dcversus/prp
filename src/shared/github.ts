/**
 * ♫ GitHub Integration for @dcversus/prp
 *
 * Tools for fetching PR data, CI status, comments, and metadata
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { createLayerLogger, configManager } from '../shared';

const logger = createLayerLogger('shared');

export interface GitHubConfig {
  token?: string;
  apiUrl: string;
  defaultOwner: string;
  defaultRepo: string;
}

// GitHub API response types
interface GitHubLabel {
  name: string;
  color: string;
}

interface GitHubUser {
  login: string;
  type: 'User' | 'Bot';
  id: number;
}

type GitHubAssignee = GitHubUser;

type GitHubReviewer = GitHubUser;

interface GitHubPR {
  id: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  user: GitHubUser;
  base: { ref: string; sha?: string };
  head: { ref: string; sha?: string };
  created_at: string;
  updated_at: string;
  mergeable?: boolean;
  mergeable_state?: 'clean' | 'unstable' | 'dirty' | 'blocked';
  additions: number;
  deletions: number;
  changed_files: number;
  labels: GitHubLabel[];
  assignees: GitHubAssignee[];
  requested_reviewers?: GitHubReviewer[];
  milestone?: { title: string };
  draft: boolean;
  rebaseable?: boolean;
  maintainer_can_modify?: boolean;
  locked: boolean;
  active_lock_reason?: string;
}

interface GitHubStatus {
  context: string;
  state: 'pending' | 'success' | 'failure' | 'error';
  target_url?: string;
  description: string;
  created_at: string;
}

interface GitHubStatusResponse {
  state: 'pending' | 'success' | 'failure' | 'error';
  statuses: GitHubStatus[];
}

interface GitHubComment {
  id: number;
  user: GitHubUser;
  body: string;
  created_at: string;
  updated_at: string;
  in_reply_to_id?: number;
  pull_request_review_id?: number;
}

interface GitHubReview {
  id: number;
  user: GitHubUser;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
  body?: string;
  submitted_at: string;
  commit_id: string;
}

interface GitHubFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed';
  additions: number;
  deletions: number;
  patch: string;
  previous_filename?: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  files?: GitHubFile[];
}

interface GitHubRepo {
  name: string;
  default_branch: string;
  private: boolean;
}

interface GitHubSearchItem {
  id: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  labels: GitHubLabel[];
  assignees?: GitHubAssignee[];
}

interface GitHubSearchResponse {
  items: GitHubSearchItem[];
}

export interface PullRequestInfo {
  id: number;
  title: string;
  description: string;
  state: 'open' | 'closed' | 'merged';
  author: {
    login: string;
    type: 'User' | 'Bot';
  };
  baseBranch: string;
  headBranch: string;
  createdAt: Date;
  updatedAt: Date;
  mergeable?: boolean;
  mergeableState?: 'clean' | 'unstable' | 'dirty' | 'blocked';
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: string[];
  assignees: string[];
  requestedReviewers: string[];
  milestone?: string;
}

export interface CIStatus {
  status: 'pending' | 'success' | 'failure' | 'error';
  contexts: CIContext[];
}

export interface CIContext {
  context: string;
  state: 'pending' | 'success' | 'failure' | 'error';
  targetUrl?: string;
  description: string;
  createdAt: Date;
}

export interface PRComment {
  id: number;
  author: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  isResolved?: boolean;
  replyToId?: number;
  isDraft?: boolean;
  type: 'issue_comment' | 'review_comment' | 'pull_request_review';
}

export interface PRReview {
  id: number;
  author: string;
  state: 'approved' | 'changes_requested' | 'commented' | 'dismissed';
  body: string;
  createdAt: Date;
  commitId: string;
}

export interface PRFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed';
  additions: number;
  deletions: number;
  patch: string;
  previousFilename?: string;
}

export interface PRAnalysis {
  pr: PullRequestInfo;
  ci: CIStatus;
  comments: PRComment[];
  reviews: PRReview[];
  files: PRFile[];
  commits: CommitInfo[];
  metadata: PRMetadata;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
}

export interface PRMetadata {
  isDraft: boolean;
  isRebaseable: boolean;
  maintainerCanModify: boolean;
  locked: boolean;
  activeLockReason?: string;
  repository: {
    name: string;
    defaultBranch: string;
    isPrivate: boolean;
  };
}

/**
 * ♫ GitHub Client - API interface for GitHub operations
 */
export class GitHubClient {
  private client: AxiosInstance;
  private config: GitHubConfig;

  constructor(config?: Partial<GitHubConfig>) {
    const prpConfig = configManager.get();

    this.config = {
      apiUrl: 'https://api.github.com',
      defaultOwner: 'dcversus',
      defaultRepo: 'prp',
      ...config
    };

    // Get token from config or environment
    const token = config?.token ||
      prpConfig.agents.find(a => a.type.includes('github'))?.configuration?.['token'] as string ||
      process['env']['GITHUB_TOKEN'];

    if (!token) {
      logger.warn('GitHubClient', 'No GitHub token found, API rate limits will apply');
    }

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        ...(token && { 'Authorization': 'token ' + token })
      },
      timeout: 30000
    });

    // Setup request interceptors for logging
    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      logger.debug('GitHubClient', 'Request', {
        method: config.method?.toUpperCase(),
        url: config.url
      });
      return config;
    });

    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.debug('GitHubClient', 'Response', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error: AxiosError) => {
        logger.error('GitHubClient', 'API error', error instanceof Error ? error : new Error(String(error)), {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          data: error.response?.data
        });
        throw error;
      }
    );
  }

  /**
   * Get comprehensive PR analysis
   */
  async analyzePR(prNumberOrUrl: string | number): Promise<PRAnalysis> {
    const prNumber = typeof prNumberOrUrl === 'string'
      ? this.extractPRNumber(prNumberOrUrl)
      : prNumberOrUrl;

    logger.info('GitHubClient', 'Analyzing PR #' + prNumber, { prNumber });

    const [pr, ci, comments, reviews, files, commits] = await Promise.all([
      this.getPR(prNumber),
      this.getCIStatus(prNumber),
      this.getComments(prNumber),
      this.getReviews(prNumber),
      this.getFiles(prNumber),
      this.getCommits(prNumber)
    ]);

    const metadata = await this.getPRMetadata(prNumber);

    return {
      pr,
      ci,
      comments,
      reviews,
      files,
      commits,
      metadata
    };
  }

  /**
   * Get pull request basic information
   */
  async getPR(prNumber: number): Promise<PullRequestInfo> {
    const response = await this.client.get<GitHubPR>('/repos/' + this.config.defaultOwner + '/' + this.config.defaultRepo + '/pulls/' + prNumber);

    const data = response.data;
    return {
      id: data.id,
      title: data.title,
      description: data.body || '',
      state: data.state as 'open' | 'closed' | 'merged',
      author: {
        login: data.user.login,
        type: data.user.type
      },
      baseBranch: data.base.ref,
      headBranch: data.head.ref,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      mergeable: data.mergeable,
      mergeableState: data.mergeable_state,
      additions: data.additions,
      deletions: data.deletions,
      changedFiles: data.changed_files,
      labels: data.labels.map((label: GitHubLabel) => label.name),
      assignees: data.assignees.map((assignee: GitHubAssignee) => assignee.login),
      requestedReviewers: data.requested_reviewers?.map((reviewer: GitHubReviewer) => reviewer.login) || [],
      milestone: data.milestone?.title
    };
  }

  /**
   * Get CI/CD status for PR
   */
  async getCIStatus(prNumber: number): Promise<CIStatus> {
    // First get the head commit
    const prResponse = await this.client.get<GitHubPR>('/repos/' + this.config.defaultOwner + '/' + this.config.defaultRepo + '/pulls/' + prNumber);
    const headSha = prResponse.data.head.sha || prResponse.data.head.ref;

    // Get combined status
    const statusResponse = await this.client.get<GitHubStatusResponse>('/repos/' + this.config.defaultOwner + '/' + this.config.defaultRepo + '/commits/' + headSha + '/status');

    const data = statusResponse.data;
    return {
      status: data.state,
      contexts: data.statuses.map((status: GitHubStatus) => ({
        context: status.context,
        state: status.state,
        targetUrl: status.target_url,
        description: status.description,
        createdAt: new Date(status.created_at)
      }))
    };
  }

  /**
   * Get all comments on PR
   */
  async getComments(prNumber: number): Promise<PRComment[]> {
    const response = await this.client.get<GitHubComment[]>('/repos/' + this.config.defaultOwner + '/' + this.config.defaultRepo + '/pulls/' + prNumber + '/comments');

    return response.data.map((comment: GitHubComment) => ({
      id: comment.id,
      author: comment.user.login,
      body: comment.body,
      createdAt: new Date(comment.created_at),
      updatedAt: new Date(comment.updated_at),
      isResolved: false, // GitHub doesn't provide this in the API
      replyToId: comment.in_reply_to_id,
      isDraft: false,
      type: comment.pull_request_review_id ? 'review_comment' : 'issue_comment'
    }));
  }

  /**
   * Get reviews on PR
   */
  async getReviews(prNumber: number): Promise<PRReview[]> {
    const response = await this.client.get<GitHubReview[]>('/repos/' + this.config.defaultOwner + '/' + this.config.defaultRepo + '/pulls/' + prNumber + '/reviews');

    return response.data.map((review: GitHubReview) => ({
      id: review.id,
      author: review.user.login,
      state: review.state.toLowerCase() as 'approved' | 'changes_requested' | 'commented' | 'dismissed',
      body: review.body || '',
      createdAt: new Date(review.submitted_at),
      commitId: review.commit_id
    }));
  }

  /**
   * Get files changed in PR
   */
  async getFiles(prNumber: number): Promise<PRFile[]> {
    const response = await this.client.get<GitHubFile[]>('/repos/' + this.config.defaultOwner + '/' + this.config.defaultRepo + '/pulls/' + prNumber + '/files');

    return response.data.map((file: GitHubFile) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch,
      previousFilename: file.previous_filename
    }));
  }

  /**
   * Get commits in PR
   */
  async getCommits(prNumber: number): Promise<CommitInfo[]> {
    const response = await this.client.get<GitHubCommit[]>('/repos/' + this.config.defaultOwner + '/' + this.config.defaultRepo + '/pulls/' + prNumber + '/commits');

    return response.data.map((commit: GitHubCommit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: new Date(commit.commit.author.date),
      files: commit.files?.map((f: GitHubFile) => f.filename) || []
    }));
  }

  /**
   * Get PR metadata
   */
  async getPRMetadata(prNumber: number): Promise<PRMetadata> {
    const [prResponse, repoResponse] = await Promise.all([
      this.client.get<GitHubPR>('/repos/' + this.config.defaultOwner + '/' + this.config.defaultRepo + '/pulls/' + prNumber),
      this.client.get<GitHubRepo>('/repos/' + this.config.defaultOwner + '/' + this.config.defaultRepo)
    ]);

    const prData = prResponse.data;
    const repoData = repoResponse.data;

    return {
      isDraft: prData.draft || false,
      isRebaseable: prData.rebaseable || false,
      maintainerCanModify: prData.maintainer_can_modify || false,
      locked: prData.locked || false,
      activeLockReason: prData.active_lock_reason,
      repository: {
        name: repoData.name,
        defaultBranch: repoData.default_branch,
        isPrivate: repoData.private
      }
    };
  }

  /**
   * Extract PR number from URL or string
   */
  private extractPRNumber(input: string): number {
    // Handle GitHub URLs
    const urlMatch = input.match(/github\.com\/.*\/.*\/pull\/(\d+)/);
    if (urlMatch?.[1]) {
      return parseInt(urlMatch[1], 10);
    }

    // Handle #123 format
    const hashMatch = input.match(/#(\d+)/);
    if (hashMatch?.[1]) {
      return parseInt(hashMatch[1], 10);
    }

    // Handle plain number
    const numMatch = input.match(/(\d+)/);
    if (numMatch?.[1]) {
      return parseInt(numMatch[1], 10);
    }

    throw new Error('Could not extract PR number from: ' + input);
  }

  /**
   * Post a comment on PR
   */
  async postComment(prNumber: number, body: string): Promise<PRComment> {
    const response = await this.client.post(
      '/repos/' + this.config.defaultOwner + '/' + this.config.defaultRepo + '/issues/' + prNumber + '/comments',
      { body }
    );

    const comment = response.data;
    return {
      id: comment.id,
      author: comment.user.login,
      body: comment.body,
      createdAt: new Date(comment.created_at),
      updatedAt: new Date(comment.updated_at),
      isResolved: false,
      isDraft: false,
      type: 'issue_comment'
    };
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: number, body: string): Promise<PRComment> {
    const response = await this.client.patch(
      '/repos/' + this.config.defaultOwner + '/' + this.config.defaultRepo + '/issues/comments/' + commentId,
      { body }
    );

    const comment = response.data;
    return {
      id: comment.id,
      author: comment.user.login,
      body: comment.body,
      createdAt: new Date(comment.created_at),
      updatedAt: new Date(comment.updated_at),
      isResolved: false,
      isDraft: false,
      type: 'issue_comment'
    };
  }

  /**
   * Create a review on PR
   */
  async createReview(prNumber: number, review: {
    body: string;
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' | 'PENDING';
    comments?: Array<{
      path: string;
      line: number;
      body: string;
    }>;
  }): Promise<PRReview> {
    const response = await this.client.post(
      '/repos/' + this.config.defaultOwner + '/' + this.config.defaultRepo + '/pulls/' + prNumber + '/reviews',
      review
    );

    const data = response.data;
    return {
      id: data.id,
      author: data.user.login,
      state: data.state.toLowerCase(),
      body: data.body || '',
      createdAt: new Date(data.submitted_at),
      commitId: data.commit_id
    };
  }

  /**
   * Get repository information
   */
  async getRepository(): Promise<unknown> {
    const response = await this.client.get('/repos/' + this.config.defaultOwner + '/' + this.config.defaultRepo);
    return response.data;
  }

  /**
   * Search for PRs
   */
  async searchPRs(query: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<PullRequestInfo[]> {
    const q = 'repo:' + this.config.defaultOwner + '/' + this.config.defaultRepo + ' ' + query + ' is:pr is:' + state;
    const response = await this.client.get<GitHubSearchResponse>('/search/issues', { params: { q } });

    return response.data.items.map((item: GitHubSearchItem) => ({
      id: item.id,
      title: item.title,
      description: item.body || '',
      state: item.state as 'open' | 'closed' | 'merged',
      author: {
        login: item.user.login,
        type: item.user.type
      },
      baseBranch: '', // Not available in search results
      headBranch: '', // Not available in search results
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      labels: item.labels.map((label: GitHubLabel) => label.name),
      assignees: item.assignees?.map((assignee: GitHubAssignee) => assignee.login) || [],
      requestedReviewers: []
    }));
  }
}

// Global GitHub client instance
let gitHubClient: GitHubClient | null = null;

/**
 * Get GitHub client instance
 */
export function getGitHubClient(config?: Partial<GitHubConfig>): GitHubClient {
  if (!gitHubClient) {
    gitHubClient = new GitHubClient(config);
  }
  return gitHubClient;
}

/**
 * Reset GitHub client instance
 */
export function resetGitHubClient(): void {
  gitHubClient = null;
}

export default GitHubClient;