/**
 * Express Types for MCP
 * Extends Express Request interface with auth properties
 */

import { Request } from 'express';
import { MCPClaim, MCPClient } from './index';

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

export {};