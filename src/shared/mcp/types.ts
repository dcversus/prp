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