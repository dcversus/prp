/**
 * MCP Server Authentication
 * JWT-based authentication for MCP server
 */
import crypto from 'crypto';

import jwt from 'jsonwebtoken';


import { logger } from '../logger';

import type { MCPClaim, MCPClient } from '../../mcp/types';
import type { Request, Response, NextFunction } from 'express';
// Extend Express Request interface to include auth info
declare global {
  namespace Express {
    interface Request {
      auth?: {
        claims: MCPClaim;
        client: MCPClient;
      };
    }
  }
}
export class MCPAuth {
  private readonly apiSecret: string;
  private readonly jwtExpiration: string;
  private readonly clients = new Map<string, MCPClient>();
  constructor(apiSecret: string, jwtExpiration = '1h') {
    this.apiSecret = apiSecret;
    this.jwtExpiration = jwtExpiration;
    if (!apiSecret) {
      throw new Error('API_SECRET environment variable is required for MCP server');
    }
  }
  /**
   * Generate JWT token for authenticated client
   */
  generateToken(clientId: string, scope: string[] = ['read', 'write']): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: MCPClaim = {
      sub: clientId,
      iat: now,
      exp: now + this.parseExpiration(this.jwtExpiration),
      aud: 'mcp-server',
      scope,
    };
    return jwt.sign(payload, this.apiSecret, {
      algorithm: 'HS256',
      issuer: 'prp-mcp',
      audience: 'mcp-server',
    });
  }
  /**
   * Verify JWT token and return claims
   */
  verifyToken(token: string): MCPClaim | null {
    try {
      const decoded = jwt.verify(token, this.apiSecret, {
        algorithms: ['HS256'],
        issuer: 'prp-mcp',
        audience: 'mcp-server',
      }) as MCPClaim;
      return decoded;
    } catch (error) {
      logger.warn(
        'shared',
        'JWT verification failed:',
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }
  /**
   * Register a new client
   */
  registerClient(clientInfo: Partial<MCPClient>): MCPClient {
    const client: MCPClient = {
      id: clientInfo.id ?? crypto.randomUUID(),
      name: clientInfo.name ?? 'Unknown Client',
      version: clientInfo.version ?? '1.0.0',
      connected: true,
      lastSeen: Date.now(),
      permissions: clientInfo.permissions ?? ['read'],
      socketId: clientInfo.socketId,
    };
    this.clients.set(client.id, client);
    return client;
  }
  /**
   * Get client by ID
   */
  getClient(clientId: string): MCPClient | undefined {
    return this.clients.get(clientId);
  }
  /**
   * Update client status
   */
  updateClient(clientId: string, updates: Partial<MCPClient>): void {
    const client = this.clients.get(clientId);
    if (client) {
      Object.assign(client, updates, { lastSeen: Date.now() });
      this.clients.set(clientId, client);
    }
  }
  /**
   * Remove client
   */
  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }
  /**
   * Check if client has required permissions
   */
  hasPermission(claims: MCPClaim, requiredPermission: string): boolean {
    return claims.scope.includes(requiredPermission) || claims.scope.includes('admin');
  }
  /**
   * Get all active clients
   */
  getActiveClients(): MCPClient[] {
    return Array.from(this.clients.values()).filter((client) => client.connected);
  }

  getAllClients(): MCPClient[] {
    return Array.from(this.clients.values());
  }
  /**
   * Clean up inactive clients
   */
  cleanupInactiveClients(maxAge: number = 30 * 60 * 1000): void {
    // 30 minutes
    const now = Date.now();
    for (const [id, client] of this.clients.entries()) {
      if (now - client.lastSeen > maxAge) {
        this.clients.delete(id);
      }
    }
  }
  /**
   * Parse expiration string to seconds
   */
  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiration format: ${expiration}`);
    }
    const [, value, unit] = match;
    if (!unit) {
      throw new Error(`Invalid expiration format: ${expiration}`);
    }
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 60 * 60 * 24,
    };
    const multiplier = multipliers[unit];
    if (!multiplier) {
      throw new Error(`Invalid expiration unit: ${unit}`);
    }
    return parseInt(value || '0', 10) * multiplier;
  }
  /**
   * Generate API key for client registration
   */
  generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  /**
   * Validate API key format
   */
  validateApiKey(apiKey: string): boolean {
    return /^[a-f0-9]{64}$/.test(apiKey);
  }
  /**
   * Get authentication middleware
   */
  getAuthMiddleware(
    requiredPermissions: string[] = [],
  ): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({
          error: {
            code: -1,
            message: 'Missing or invalid authorization header',
          },
        });
        return;
      }
      const token = authHeader.substring(7);
      const claims = this.verifyToken(token);
      if (!claims) {
        res.status(401).json({
          error: {
            code: -1,
            message: 'Invalid or expired token',
          },
        });
        return;
      }
      // Check if client exists and is active
      const client = this.getClient(claims.sub);
      if (!client?.connected) {
        res.status(401).json({
          error: {
            code: -1,
            message: 'Client not found or inactive',
          },
        });
        return;
      }
      // Check permissions
      for (const permission of requiredPermissions) {
        if (!this.hasPermission(claims, permission)) {
          res.status(403).json({
            error: {
              code: -2,
              message: `Insufficient permissions. Required: ${permission}`,
            },
          });
          return;
        }
      }
      // Add auth info to request
      req.auth = {
        claims,
        client,
      };
      // Update last seen
      this.updateClient(client.id, { lastSeen: Date.now() });
      next();
    };
  }
}
