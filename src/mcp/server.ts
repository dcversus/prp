/**
 * MCP Server Implementation
 * WebSocket-based server for remote orchestration
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { MCPAuth } from './auth';
import {
  MCPServerConfig,
  MCPStatus,
  MCPOrchestratorMessage,
  IAgentManager,
  IScannerCore,
  MockAgentManager,
  MockScannerCore,
  ConnectionInfo,
  StreamRequest,
  MCPAgentStatus,
  AgentStatus
} from './types';
import { statusRouter } from './routes/status';
import { messageRouter } from './routes/message';
import { agentsRouter } from './routes/agents';
import { prpsRouter } from './routes/prps';
import { metricsRouter, trackMetrics } from './routes/metrics';
import { PathResolver } from '../shared/path-resolver';

export class MCPServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private io: SocketIOServer;
  private auth: MCPAuth;
  private config: MCPServerConfig;
  private startTime: number;
  private connections: Map<string, ConnectionInfo> = new Map();
  private agentManager: IAgentManager;
  private scanner: IScannerCore;
  private projectRoot: string;

  constructor(config: MCPServerConfig) {
    this.config = config;

    // Enforce SSL requirement in production
    if (!config.ssl && process.env['NODE_ENV'] === 'production') {
      throw new Error('SSL is required for MCP server in production. Please provide SSL certificates or use reverse proxy.');
    }

    this.app = express();

    // Force HTTPS in production
    if (config.ssl) {
      this.setupSSLRedirect();
    }

    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      maxHttpBufferSize: 1e8 // 100 MB
    });

    this.auth = new MCPAuth(config.apiSecret, config.jwtExpiration);
    this.startTime = Date.now();
    this.projectRoot = PathResolver.getPackageRoot();

    // Initialize agent manager and scanner with fallbacks
    try {
      const AgentManager = require('../orchestrator/agent-manager').AgentManager;
      this.agentManager = new AgentManager({
        model: 'gpt-4',
        maxTokens: 4000,
        temperature: 0.7,
        timeout: 30000,
        maxConcurrentDecisions: 1,
        maxChainOfThoughtDepth: 5,
        contextPreservation: {
          enabled: true,
          maxContextSize: 10000,
          compressionStrategy: 'truncate',
          preserveElements: [],
          compressionRatio: 0.8,
          importantSignals: []
        },
        tools: [],
        agents: {
          maxActiveAgents: 10,
          defaultTimeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000,
          parallelExecution: true,
          loadBalancing: 'least_busy',
          healthCheckInterval: 5000
        },
        prompts: {
          systemPrompt: 'You are an orchestrator agent.',
          decisionMaking: 'Make optimal decisions.',
          chainOfThought: 'Think step by step.',
          toolSelection: 'Select appropriate tools.',
          agentCoordination: 'Coordinate agents effectively.',
          checkpointEvaluation: 'Evaluate checkpoints.',
          errorHandling: 'Handle errors gracefully.',
          contextUpdate: 'Update context as needed.'
        },
        decisionThresholds: {
          confidence: 0.8,
          tokenUsage: 10000,
          processingTime: 30000,
          agentResponse: 10000,
          errorRate: 0.1
        }
      });
    } catch (error) {
      console.warn('AgentManager not available, using fallback:', error);
      this.agentManager = new MockAgentManager();
    }

    try {
      const ScannerCore = require('../scanner/ScannerCore').ScannerCore;
      this.scanner = new ScannerCore({
        watchPaths: [this.projectRoot],
        filePatterns: ['*.md', '*.ts', '*.tsx', '*.js', '*.jsx'],
        ignorePatterns: ['node_modules/**', '.git/**']
      });
    } catch (error) {
      console.warn('ScannerCore not available, using fallback:', error);
      this.scanner = new MockScannerCore();
    }

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupGracefulShutdown();
  }

  private setupSSLRedirect(): void {
    // Force HTTPS redirect middleware
    this.app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`);
      } else {
        next();
      }
    });
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", 'ws:', 'wss:']
        }
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: this.config.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: this.config.rateLimitWindow * 60 * 1000, // Convert minutes to milliseconds
      max: this.config.rateLimitMax,
      message: {
        error: {
          code: -3,
          message: 'Too many requests from this IP, please try again later.'
        }
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/mcp', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, _res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint (basic health for Docker)
    this.app.get('/health', trackMetrics, (_req, res) => {
      res.json({
        status: 'healthy',
        timestamp: Date.now(),
        uptime: Date.now() - this.startTime,
        version: process.env['npm_package_version'] || '0.0.0'
      });
    });

    // Metrics and probe endpoints (no auth for Prometheus/Kubernetes)
    this.app.use('/metrics', (req, res, next) => {
      (req as any).mcpServer = this;
      next();
    }, metricsRouter);

    // MCP API routes with authentication
    this.app.use('/mcp/status', statusRouter(this.auth));
    this.app.use('/mcp/message', this.auth.getAuthMiddleware(['write']), messageRouter(this.auth, this.io));
    this.app.use('/mcp/agents', this.auth.getAuthMiddleware(['read']), agentsRouter(this.auth));
    this.app.use('/mcp/prps', this.auth.getAuthMiddleware(['read']), prpsRouter(this.auth));

    // 404 handler
    this.app.use('/mcp/*', (_req, res) => {
      res.status(404).json({
        error: {
          code: -4,
          message: 'MCP endpoint not found'
        }
      });
    });

    // Global error handler
    this.app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('MCP Server Error:', err);

      if (!res.headersSent) {
        res.status(500).json({
          error: {
            code: -5,
            message: 'Internal server error',
            data: process.env['NODE_ENV'] === 'development' ? err.message : undefined
          }
        });
      }
    });
  }

  private setupWebSocket(): void {
    // WebSocket authentication
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const claims = this.auth.verifyToken(token);
        if (!claims) {
          return next(new Error('Invalid or expired token'));
        }

        // Register socket connection
        if (!claims.sub) {
          return next(new Error('Invalid claims: missing subject'));
        }
        const client = this.auth.getClient(claims.sub);
        if (!client) {
          return next(new Error('Client not registered'));
        }

        this.auth.updateClient(client.id, {
          connected: true,
          ...(socket.id && { socketId: socket.id })
        });

        socket.data.clientId = claims.sub;
        socket.data.claims = claims;

        console.log(`WebSocket client connected: ${client.name} (${socket.id})`);
        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      const clientId = socket.data.clientId;

      // Add to active connections
      this.connections.set(socket.id, {
        clientId,
        connectedAt: Date.now(),
        lastActivity: Date.now()
      });

      // Handle orchestrator messages
      socket.on('orchestrator-message', async (data: MCPOrchestratorMessage) => {
        try {
          await this.handleOrchestratorMessage(socket, data);
        } catch (error) {
          console.error('Error handling orchestrator message:', error);
          socket.emit('error', {
            code: -6,
            message: 'Failed to process orchestrator message'
          });
        }
      });

      // Handle ping for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
        this.connections.get(socket.id)!.lastActivity = Date.now();
      });

      // Handle streaming requests
      socket.on('stream-request', async (data: StreamRequest) => {
        try {
          await this.handleStreamRequest(socket, data);
        } catch (error) {
          console.error('Error handling stream request:', error);
          socket.emit('stream-error', {
            id: data.id,
            error: {
              code: -7,
              message: 'Stream processing failed'
            }
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`WebSocket client disconnected: ${socket.id} (${reason})`);

        // Update client status
        if (clientId) {
          this.auth.updateClient(clientId, {
            connected: false,
            socketId: undefined
          });
        }

        // Remove from active connections
        this.connections.delete(socket.id);
      });

      // Send welcome message
      socket.emit('connected', {
        server: 'PRP MCP Server',
        version: process.env['npm_package_version'] || '0.0.0',
        timestamp: Date.now(),
        clientId
      });
    });

    // Periodic cleanup of inactive connections
    setInterval(() => {
      this.cleanupConnections();
      this.auth.cleanupInactiveClients();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private async handleOrchestratorMessage(socket: any, message: MCPOrchestratorMessage): Promise<void> {
    console.log(`Received orchestrator message from ${socket.id}:`, message.type);

    // Broadcast to other connected clients if needed
    if (message.payload.action === 'broadcast') {
      socket.broadcast.emit('orchestrator-broadcast', message);
    }

    // Handle specific message types
    switch (message.type) {
      case 'orchestrator':
        // Forward to orchestrator system
        await this.forwardToOrchestrator(message);
        break;

      case 'agent':
        // Forward to specific agent
        await this.forwardToAgent(message.payload.agent, message);
        break;

      case 'system':
        // Handle system-level commands
        await this.handleSystemCommand(message);
        break;

      case 'status': {
        // Return status information
        const status = await this.getStatus();
        socket.emit('status-response', status);
        break;
      }
    }

    // Acknowledge receipt
    socket.emit('message-acknowledged', {
      id: message.payload?.timestamp || Date.now(),
      timestamp: Date.now()
    });
  }

  private async handleStreamRequest(socket: any, request: StreamRequest): Promise<void> {
    const { id, type, params } = request;

    try {
      // Start stream
      socket.emit('stream-start', { id, type });

      if (type === 'orchestrator-stream') {
        // Stream orchestrator output
        await this.streamOrchestratorOutput(socket, id, params);
      } else if (type === 'agent-stream') {
        // Stream agent output
        await this.streamAgentOutput(socket, id, params);
      } else if (type === 'status-stream') {
        // Stream status updates
        await this.streamStatusUpdates(socket, id, params);
      }

      // End stream
      socket.emit('stream-end', { id, timestamp: Date.now() });
    } catch (error) {
      socket.emit('stream-error', {
        id,
        error: {
          code: -7,
          message: error instanceof Error ? error.message : 'Stream processing failed'
        }
      });
    }
  }

  private async forwardToOrchestrator(message: MCPOrchestratorMessage): Promise<void> {
    // This would integrate with the actual orchestrator system
    console.log('Forwarding to orchestrator:', message);

    // Broadcast to all connected clients
    this.io.emit('orchestrator-update', message);
  }

  private async forwardToAgent(agentId: string, message: MCPOrchestratorMessage): Promise<void> {
    // This would integrate with the agent system
    console.log(`Forwarding to agent ${agentId}:`, message);

    // Send to specific clients that are listening for this agent
    this.io.emit(`agent-${agentId}-update`, message);
  }

  private async handleSystemCommand(message: MCPOrchestratorMessage): Promise<void> {
    // Handle system-level commands
    console.log('Handling system command:', message.payload.action);

    switch (message.payload.action) {
      case 'shutdown':
        console.log('Graceful shutdown initiated via MCP');
        await this.gracefulShutdown();
        break;

      case 'restart':
        console.log('Restart requested via MCP');
        // Handle restart logic
        break;

      default:
        console.log('Unknown system command:', message.payload.action);
    }
  }

  private async streamOrchestratorOutput(socket: any, streamId: string, params: Record<string, unknown>): Promise<void> {
    // Simulate streaming orchestrator output
    const duration = params.duration || 10000; // 10 seconds default
    const interval = 1000; // 1 second intervals
    const endTime = Date.now() + duration;

    while (Date.now() < endTime) {
      await new Promise(resolve => setTimeout(resolve, interval));

      socket.emit('stream-data', {
        id: streamId,
        type: 'orchestrator-output',
        data: {
          timestamp: Date.now(),
          message: `Orchestrator update at ${new Date().toISOString()}`,
          status: 'running'
        }
      });
    }
  }

  private async streamAgentOutput(socket: any, streamId: string, params: Record<string, unknown>): Promise<void> {
    // Simulate streaming agent output
    const agentId = params.agentId || 'unknown';
    const duration = params.duration || 5000; // 5 seconds default
    const interval = 500; // 0.5 second intervals
    const endTime = Date.now() + duration;

    while (Date.now() < endTime) {
      await new Promise(resolve => setTimeout(resolve, interval));

      socket.emit('stream-data', {
        id: streamId,
        type: 'agent-output',
        data: {
          agentId,
          timestamp: Date.now(),
          status: 'working',
          progress: Math.floor(Math.random() * 100)
        }
      });
    }
  }

  private async streamStatusUpdates(socket: any, streamId: string, params: Record<string, unknown>): Promise<void> {
    // Stream status updates
    const duration = params.duration || 15000; // 15 seconds default
    const interval = 2000; // 2 second intervals
    const endTime = Date.now() + duration;

    while (Date.now() < endTime) {
      await new Promise(resolve => setTimeout(resolve, interval));

      const status = await this.getStatus();
      socket.emit('stream-data', {
        id: streamId,
        type: 'status-update',
        data: status
      });
    }
  }

  private async getStatus(): Promise<MCPStatus> {
    const memoryUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime;
    const activeClients = this.auth.getActiveClients();
    const totalClients = Array.from(this.auth['clients'].values());

    // Get real agent data
    const agentStatus = await this.getAgentStatus();

    // Get real PRP data
    const prpStatus = await this.getPRPStatus();

    return {
      server: {
        version: process.env['npm_package_version'] || '0.0.0',
        uptime,
        memory: memoryUsage,
        platform: process.platform,
        nodeVersion: process.version
      },
      agents: agentStatus,
      prps: prpStatus,
      connections: {
        active: this.connections.size,
        total: totalClients.length,
        clients: activeClients
      }
    };
  }

  private async getAgentStatus(): Promise<{ total: number; active: number; details: MCPAgentStatus[] }> {
    try {
      if (!this.agentManager) {
        return {
          total: 0,
          active: 0,
          details: []
        };
      }

      // Get available agents from agent manager (using available methods)
      const agentStatuses = this.agentManager.getAllStatuses ? this.agentManager.getAllStatuses() : new Map();
      const activeAgentsCount = this.agentManager.getActiveAgentCount ? this.agentManager.getActiveAgentCount() : 0;

      const agentDetails = Array.from(agentStatuses.values()).map((status: AgentStatus): MCPAgentStatus => ({
        id: status.agentId,
        name: status.config?.name || 'Unknown Agent',
        type: status.config?.role || 'agent',
        status: (status.isActive ? 'working' : 'idle') as 'working' | 'idle' | 'error' | 'offline',
        lastActivity: status.lastPing?.getTime() || Date.now(),
        currentTask: status.currentTask || undefined,
        performance: {
          tasksCompleted: status.tasksCompleted || 0,
          averageResponseTime: Math.random() * 1000, // Placeholder
          errorRate: Math.random() * 0.1 // Placeholder
        }
      }));

      return {
        total: agentDetails.length,
        active: activeAgentsCount,
        details: agentDetails
      };
    } catch (error) {
      console.error('Error getting agent status:', error);
      return {
        total: 0,
        active: 0,
        details: []
      };
    }
  }

  private async getPRPStatus(): Promise<{ total: number; active: number; lastUpdated: number }> {
    try {
      if (!this.scanner) {
        // Fallback: simple directory scan
        const fs = require('fs').promises;
        const path = require('path');

        try {
          const prpsDir = path.join(this.projectRoot, 'PRPs');
          const files = await fs.readdir(prpsDir);
          const prpFiles = files.filter((file: string) => file.endsWith('.md') && file.startsWith('PRP-'));

          return {
            total: prpFiles.length,
            active: Math.floor(prpFiles.length * 0.6), // Estimate active count
            lastUpdated: Date.now()
          };
        } catch (dirError) {
          return {
            total: 0,
            active: 0,
            lastUpdated: Date.now()
          };
        }
      }

      // Scan for PRPs in the project (simplified approach)
      const scanResults = await this.scanner.scanAllFiles();
      const prpFiles = scanResults.filter((result: any) =>
        result.path.includes('PRPs/') && result.path.endsWith('.md')
      );

      const prps = prpFiles.map((result: any) => ({
        file: result.path,
        active: result.signals && result.signals.length > 0
      }));

      return {
        total: prps.length,
        active: prps.filter((prp: any) => prp.active).length,
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Error getting PRP status:', error);
      return {
        total: 0,
        active: 0,
        lastUpdated: Date.now()
      };
    }
  }

  private cleanupConnections(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    const socketIds = Array.from(this.connections.keys());
    for (const socketId of socketIds) {
      const connection = this.connections.get(socketId);
      if (connection && now - connection.lastActivity > maxAge) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
        this.connections.delete(socketId);
      }
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, starting graceful shutdown...`);

      // Stop accepting new connections
      this.server.close(() => {
        console.log('HTTP server closed');
      });

      // Close all WebSocket connections
      this.io.close(() => {
        console.log('WebSocket server closed');
      });

      // Cleanup resources
      setTimeout(() => {
        console.log('Graceful shutdown completed');
        process.exit(0);
      }, 5000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  private async gracefulShutdown(): Promise<void> {
    console.log('Initiating graceful shutdown from MCP command...');

    // Notify all connected clients
    this.io.emit('server-shutdown', {
      message: 'Server is shutting down',
      timestamp: Date.now()
    });

    // Wait a moment for clients to receive the message
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Close server
    this.server.close(() => {
      console.log('Server shutdown complete');
      process.exit(0);
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`🚀 MCP Server started on ${this.config.host}:${this.config.port}`);
        console.log(`🔒 SSL: ${this.config.ssl ? 'enabled' : 'disabled'}`);
        console.log(`📊 Max connections: ${this.config.maxConnections}`);
        console.log(`⏱️ JWT expiration: ${this.config.jwtExpiration}`);
        console.log(`🌐 CORS origins: ${this.config.corsOrigins.join(', ')}`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('MCP Server stopped');
        resolve();
      });
    });
  }

  public getServerStatus(): MCPStatus {
    return {
      server: {
        version: process.env['npm_package_version'] || '0.0.0',
        uptime: Date.now() - this.startTime,
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version
      },
      agents: {
        total: 0,
        active: 0,
        details: []
      },
      prps: {
        total: 0,
        active: 0,
        lastUpdated: Date.now()
      },
      connections: {
        active: this.connections.size,
        total: Array.from(this.auth['clients'].values()).length,
        clients: this.auth.getActiveClients()
      }
    };
  }
}