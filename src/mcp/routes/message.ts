/**
 * MCP Message Routes
 * Endpoints for sending messages to orchestrator and agents
 */

import { Router, Request, Response } from 'express';
import { MCPAuth } from '../auth';
import { MCPOrchestratorMessage } from '../types';
import { Server as SocketIOServer } from 'socket.io';

export function messageRouter(auth: MCPAuth, io: SocketIOServer): Router {
  const router = Router();

  // Send message to orchestrator
  router.post('/orchestrator', async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, action, data, agent, streaming = false } = req.body;

      if (!type || !action) {
        return res.status(400).json({
          error: {
            code: -10,
            message: 'Missing required fields: type and action'
          }
        });
      }

      const message: MCPOrchestratorMessage = {
        type,
        payload: {
          action,
          data,
          agent,
          timestamp: Date.now()
        },
        streaming
      };

      // Process the message based on type
      let result: any;

      switch (type) {
        case 'orchestrator':
          result = await handleOrchestratorMessage(message, io);
          break;
        case 'agent':
          if (!agent) {
            return res.status(400).json({
              error: {
                code: -10,
                message: 'Agent ID required for agent messages'
              }
            });
          }
          result = await handleAgentMessage(agent, message, io);
          break;
        case 'system':
          result = await handleSystemMessage(message, io);
          break;
        default:
          return res.status(400).json({
            error: {
              code: -10,
              message: `Unknown message type: ${type}`
            }
          });
      }

      // Broadcast message if not private
      if (!req.body.private) {
        io.emit('orchestrator-message', message);
      }

      res.json({
        id: req.headers['x-request-id'] || `msg-${Date.now()}`,
        result: {
          message: 'Message processed successfully',
          messageId: `msg-${Date.now()}`,
          type,
          action,
          result,
          timestamp: Date.now()
        },
        timestamp: Date.now(),
        server: 'prp-mcp'
      });
    } catch (error) {
      console.error('Message endpoint error:', error);
      res.status(500).json({
        error: {
          code: -7,
          message: 'Failed to process message',
          data: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
        }
      });
    }
  });

  // Send broadcast message to all clients
  router.post('/broadcast', async (req: Request, res: Response): Promise<void> => {
    try {
      const { message, level = 'info', target = 'all' } = req.body;

      if (!message) {
        return res.status(400).json({
          error: {
            code: -10,
            message: 'Message content is required'
          }
        });
      }

      const broadcast = {
        type: 'broadcast',
        payload: {
          message,
          level,
          target,
          timestamp: Date.now(),
          sender: req.auth?.client.name || 'unknown'
        }
      };

      // Broadcast to all connected clients
      io.emit('broadcast', broadcast);

      res.json({
        id: req.headers['x-request-id'] || `broadcast-${Date.now()}`,
        result: {
          message: 'Broadcast sent successfully',
          broadcastId: `broadcast-${Date.now()}`,
          recipients: auth.getActiveClients().length,
          timestamp: Date.now()
        },
        timestamp: Date.now(),
        server: 'prp-mcp'
      });
    } catch (error) {
      console.error('Broadcast endpoint error:', error);
      res.status(500).json({
        error: {
          code: -7,
          message: 'Failed to send broadcast'
        }
      });
    }
  });

  // Get message history (limited)
  router.get('/history', async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query['limit'] as string, 10) || 50;
      const offset = parseInt(req.query['offset'] as string, 10) || 0;

      // This would integrate with actual message storage
      const history = {
        messages: [],
        total: 0,
        limit,
        offset,
        timestamp: Date.now()
      };

      res.json({
        id: req.headers['x-request-id'] || `history-${Date.now()}`,
        result: history,
        timestamp: Date.now(),
        server: 'prp-mcp'
      });
    } catch (error) {
      console.error('Message history endpoint error:', error);
      res.status(500).json({
        error: {
          code: -7,
          message: 'Failed to get message history'
        }
      });
    }
  });

  return router;
}

async function handleOrchestratorMessage(message: MCPOrchestratorMessage, _io: SocketIOServer): Promise<any> {
  console.log('Handling orchestrator message:', message);

  // This would integrate with the actual orchestrator system
  // For now, simulate processing

  switch (message.payload.action) {
    case 'start':
      return { status: 'started', message: 'Orchestrator started' };
    case 'stop':
      return { status: 'stopped', message: 'Orchestrator stopped' };
    case 'status':
      return { status: 'running', uptime: process.uptime() };
    case 'config':
      return { status: 'configured', config: message.payload.data };
    default:
      return { status: 'unknown_action', message: `Unknown action: ${message.payload.action}` };
  }
}

async function handleAgentMessage(agentId: string, message: MCPOrchestratorMessage, io: SocketIOServer): Promise<any> {
  console.log(`Handling message for agent ${agentId}:`, message);

  // This would integrate with the actual agent system
  // Send message to specific agent listeners
  io.emit(`agent-${agentId}-message`, message);

  switch (message.payload.action) {
    case 'start':
      return { status: 'started', agentId, message: 'Agent started' };
    case 'stop':
      return { status: 'stopped', agentId, message: 'Agent stopped' };
    case 'status':
      return { status: 'idle', agentId, uptime: Math.random() * 3600 };
    case 'task':
      return { status: 'task_assigned', agentId, taskId: `task-${Date.now()}` };
    default:
      return { status: 'unknown_action', agentId, message: `Unknown action: ${message.payload.action}` };
  }
}

async function handleSystemMessage(message: MCPOrchestratorMessage, _io: SocketIOServer): Promise<any> {
  console.log('Handling system message:', message);

  switch (message.payload.action) {
    case 'health':
      return {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: Date.now()
      };
    case 'metrics':
      return {
        status: 'metrics_collected',
        metrics: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          timestamp: Date.now()
        }
      };
    case 'restart':
      // Graceful restart would be handled here
      return { status: 'restart_initiated', message: 'System restart initiated' };
    case 'shutdown':
      // Graceful shutdown would be handled here
      return { status: 'shutdown_initiated', message: 'System shutdown initiated' };
    default:
      return { status: 'unknown_action', message: `Unknown action: ${message.payload.action}` };
  }
}