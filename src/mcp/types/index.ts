/**
 * MCP Server Type Definitions
 * Defines interfaces and types for the Model Context Protocol server
 */

export interface MCPRequest {
  id: string;
  method: string;
  params: Record<string, any>;
  timestamp: number;
  client: string;
}

export interface MCPResponse {
  id: string;
  result?: any;
  error?: MCPError;
  timestamp: number;
  server: string;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPClaim {
  sub: string; // Subject (client ID)
  iat: number; // Issued at
  exp: number; // Expiration
  aud: string; // Audience (server)
  scope: string[]; // Allowed actions
}

export interface MCPClient {
  id: string;
  name: string;
  version: string;
  connected: boolean;
  lastSeen: number;
  permissions: string[];
  socketId?: string;
}

export interface MCPMessage {
  id: string;
  type: 'request' | 'response' | 'notification' | 'error';
  method?: string;
  params?: Record<string, any>;
  result?: any;
  error?: MCPError;
  timestamp: number;
  clientId?: string;
}

export interface MCPOrchestratorMessage {
  type: 'orchestrator' | 'agent' | 'system' | 'status';
  payload: {
    action: string;
    data?: any;
    agent?: string;
    timestamp: number;
  };
  streaming?: boolean;
}

export interface MCPServerConfig {
  port: number;
  host: string;
  ssl: boolean;
  apiSecret: string;
  jwtExpiration: string;
  rateLimitWindow: number;
  rateLimitMax: number;
  corsOrigins: string[];
  enableStreaming: boolean;
  maxConnections: number;
}

export interface MCPStatus {
  server: {
    version: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    platform: string;
    nodeVersion: string;
  };
  agents: {
    total: number;
    active: number;
    details: MCPAgentStatus[];
  };
  prps: {
    total: number;
    active: number;
    lastUpdated: number;
  };
  connections: {
    active: number;
    total: number;
    clients: MCPClient[];
  };
}

export interface MCPAgentStatus {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'working' | 'error' | 'offline';
  lastActivity: number;
  currentTask?: string;
  performance: {
    tasksCompleted: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

export interface MCPRoute {
  method: string;
  path: string;
  handler: (req: MCPRequest, res: MCPResponse) => Promise<MCPResponse>;
  middleware?: string[];
  permissions: string[];
}

export interface MCPStats {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  agents: {
    active: number;
    total: number;
    tasksCompleted: number;
  };
  system: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
  };
}

export interface ConnectionInfo {
  clientId: string;
  connectedAt: number;
  lastActivity: number;
}

export interface StreamRequest {
  id: string;
  type: string;
  params?: Record<string, unknown>;
}

// Real integration interfaces for orchestrator and scanner
export interface IAgentManager {
  getAllStatuses(): Map<string, AgentStatus>;
  getActiveAgentCount(): number;
  getAgentById(id: string): AgentStatus | undefined;
}

export interface IScannerCore {
  scanAllFiles(): Promise<ScanResult[]>;
  getMetrics(): ScannerMetrics;
  getEventQueueSize(): number;
  getFileHashCacheSize(): number;
}

export interface AgentStatus {
  agentId: string;
  config?: {
    name?: string;
    role?: string;
  };
  isActive: boolean;
  lastPing?: Date;
  currentTask?: string;
  tasksCompleted?: number;
}

export interface ScanResult {
  path: string;
  signals?: SignalData[];
  size?: number;
  changeType?: string;
}

export interface SignalData {
  type: string;
  severity: string;
  content: string;
  timestamp: number;
}

export interface ScannerMetrics {
  scanMetrics?: {
    totalScans?: number;
    avgScanTime?: number;
    peakWorktrees?: number;
    errors?: number;
  };
  worktrees?: WorktreeMetrics[];
  signals?: SignalData[];
  tokenUsage?: Record<string, TokenUsage>;
}

export interface WorktreeMetrics {
  status: string;
  prpFiles?: string[];
  fileChanges?: FileChange[];
}

export interface FileChange {
  path: string;
  changeType: string;
  size?: number;
}

export interface TokenUsage {
  agentType?: string;
  totalTokens?: number;
}

// Mock implementations for development
export class MockAgentManager implements IAgentManager {
  getAllStatuses(): Map<string, AgentStatus> {
    return new Map();
  }

  getActiveAgentCount(): number {
    return 0;
  }

  getAgentById(id: string): AgentStatus | undefined {
    return undefined;
  }
}

export class MockScannerCore implements IScannerCore {
  async scanAllFiles(): Promise<ScanResult[]> {
    return [];
  }

  getMetrics(): ScannerMetrics {
    return {};
  }

  getEventQueueSize(): number {
    return 0;
  }

  getFileHashCacheSize(): number {
    return 0;
  }
}