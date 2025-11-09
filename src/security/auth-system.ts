/**
 * Authentication and Authorization System
 *
 * Provides comprehensive authentication, authorization, and session management
 * for the PRP system with support for multiple authentication methods.
 */

import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { EventEmitter } from 'events';
import { CredentialManager } from './credential-manager';
import { SecurityMonitor } from './security-monitor';

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  passwordHash?: string;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  apiKeys?: string[];
  metadata?: Record<string, unknown>;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  lastAccessed: Date;
}

export interface AuthRequest {
  user?: User;
  session?: AuthSession;
  token?: string;
  permissions?: string[];
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: AuthSession;
  token?: string;
  refreshToken?: string;
  error?: string;
  requiresMFA?: boolean;
  mfaChallenge?: string;
}

export interface Role {
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
}

export interface Permission {
  name: string;
  description: string;
  resource: string;
  action: string;
  isSystem: boolean;
}

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface AuthSystemConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  sessionTimeout: number;
  maxSessionsPerUser: number;
  enableMFA: boolean;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    preventReuse: number;
    maxAge: number;
  };
  rateLimiting: {
    loginAttempts: number;
    loginWindowMs: number;
    mfaAttempts: number;
    mfaWindowMs: number;
  };
}

export class AuthSystem extends EventEmitter {
  private static instance: AuthSystem;
  private users = new Map<string, User>();
  private sessions = new Map<string, AuthSession>();
  private roles = new Map<string, Role>();
  private permissions = new Map<string, Permission>();
  private config: AuthSystemConfig;
  private credentialManager: CredentialManager;
  private securityMonitor: SecurityMonitor;

  private constructor(config: AuthSystemConfig) {
    super();
    this.config = config;
    this.credentialManager = new CredentialManager();
    this.securityMonitor = SecurityMonitor.getInstance();
    this.initializeDefaultRolesAndPermissions();
  }

  static getInstance(config?: AuthSystemConfig): AuthSystem {
    if (!AuthSystem.instance) {
      if (!config) {
        throw new Error('AuthSystem requires configuration on first instantiation');
      }
      AuthSystem.instance = new AuthSystem(config);
    }
    return AuthSystem.instance;
  }

  /**
   * Initialize the authentication system
   */
  async initialize(): Promise<void> {
    try {
      await this.credentialManager.initialize();
      this.loadExistingUsers();
      this.startSessionCleanup();
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Register a new user
   */
  async registerUser(userData: {
    username: string;
    email: string;
    password: string;
    roles?: string[];
  }): Promise<AuthResult> {
    try {
      // Validate input
      const validationResult = this.validateUserInput(userData);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.error
        };
      }

      // Check if user already exists
      if (this.findUserByUsername(userData.username) || this.findUserByEmail(userData.email)) {
        return {
          success: false,
          error: 'User already exists'
        };
      }

      // Hash password
      const passwordHash = await this.hashPassword(userData.password);

      // Create user
      const user: User = {
        id: crypto.randomUUID(),
        username: userData.username,
        email: userData.email,
        roles: userData.roles || ['user'],
        permissions: [],
        isActive: true,
        createdAt: new Date(),
        passwordHash,
        apiKeys: []
      };

      // Assign permissions based on roles
      user.permissions = this.getPermissionsForRoles(user.roles);

      this.users.set(user.id, user);

      this.securityMonitor.logSecurityEvent({
        type: 'authentication_success',
        severity: 'low',
        source: 'auth_system',
        message: `New user registered: ${user.username}`,
        details: { userId: user.id, username: user.username, email: user.email }
      });

      return {
        success: true,
        user
      };
    } catch (error) {
      this.securityMonitor.logSecurityEvent({
        type: 'authentication_failure',
        severity: 'medium',
        source: 'auth_system',
        message: `User registration failed: ${userData.username}`,
        details: { error: error instanceof Error ? error.message : String(error) }
      });

      return {
        success: false,
        error: 'Registration failed'
      };
    }
  }

  /**
   * Authenticate a user
   */
  async authenticateUser(credentials: {
    username: string;
    password: string;
    mfaCode?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuthResult> {
    try {
      const user = this.findUserByUsername(credentials.username) || this.findUserByEmail(credentials.username);

      if (!user) {
        this.securityMonitor.logSecurityEvent({
          type: 'authentication_failure',
          severity: 'medium',
          source: 'auth_system',
          message: `Authentication failed: User not found`,
          details: { username: credentials.username, ipAddress: credentials.ipAddress }
        });

        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          error: 'Account is disabled'
        };
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(credentials.password, user.passwordHash!);
      if (!isPasswordValid) {
        this.securityMonitor.logSecurityEvent({
          type: 'authentication_failure',
          severity: 'high',
          source: 'auth_system',
          message: `Authentication failed: Invalid password`,
          details: { userId: user.id, username: user.username, ipAddress: credentials.ipAddress }
        });

        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Check MFA if enabled
      if (user.mfaEnabled && !credentials.mfaCode) {
        const mfaChallenge = this.generateMFASession(user.id);
        return {
          success: false,
          requiresMFA: true,
          mfaChallenge
        };
      }

      if (user.mfaEnabled && credentials.mfaCode) {
        const isMFAValid = this.verifyMFACode(user.mfaSecret!, credentials.mfaCode);
        if (!isMFAValid) {
          this.securityMonitor.logSecurityEvent({
            type: 'authentication_failure',
            severity: 'high',
            source: 'auth_system',
            message: `Authentication failed: Invalid MFA code`,
            details: { userId: user.id, username: user.username, ipAddress: credentials.ipAddress }
          });

          return {
            success: false,
            error: 'Invalid MFA code'
          };
        }
      }

      // Create session
      const session = await this.createSession(user, credentials.ipAddress, credentials.userAgent);

      // Update last login
      user.lastLogin = new Date();
      this.users.set(user.id, user);

      this.securityMonitor.logSecurityEvent({
        type: 'authentication_success',
        severity: 'low',
        source: 'auth_system',
        message: `User authenticated: ${user.username}`,
        details: { userId: user.id, username: user.username, sessionId: session.id }
      });

      return {
        success: true,
        user,
        session,
        token: session.token,
        refreshToken: session.refreshToken
      };
    } catch (error) {
      this.securityMonitor.logSecurityEvent({
        type: 'authentication_failure',
        severity: 'medium',
        source: 'auth_system',
        message: `Authentication error: ${credentials.username}`,
        details: { error: error instanceof Error ? error.message : String(error) }
      });

      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  /**
   * Validate a JWT token
   */
  validateToken(token: string, ipAddress?: string, userAgent?: string): AuthRequest {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret) as JWTPayload;
      const session = this.sessions.get(decoded.sessionId);

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        return { token };
      }

      const user = this.users.get(session.userId);
      if (!user?.isActive) {
        return { token };
      }

      // Update session last accessed
      session.lastAccessed = new Date();
      this.sessions.set(session.id, session);

      // Check for session hijacking
      if (this.isSessionHijacked(session, ipAddress, userAgent)) {
        this.securityMonitor.logSecurityEvent({
          type: 'credential_compromise',
          severity: 'high',
          source: 'auth_system',
          message: `Potential session hijacking detected for user ${user.username}`,
          details: {
            userId: user.id,
            sessionId: session.id,
            originalIP: session.ipAddress,
            currentIP: ipAddress,
            originalUA: session.userAgent,
            currentUA: userAgent
          }
        });

        // Invalidate session
        session.isActive = false;
        this.sessions.set(session.id, session);

        return { token };
      }

      return {
        user,
        session,
        token,
        permissions: user.permissions,
        ipAddress,
        userAgent
      };
    } catch (error) {
      return { token };
    }
  }

  /**
   * Check if a user has permission to perform an action
   */
  hasPermission(authRequest: AuthRequest, permission: string): boolean {
    if (!authRequest.user?.isActive) {
      return false;
    }

    return authRequest.user.permissions.includes(permission) ||
           authRequest.user.roles.includes('admin');
  }

  /**
   * Check if a user has any of the specified roles
   */
  hasRole(authRequest: AuthRequest, roles: string[]): boolean {
    if (!authRequest.user?.isActive) {
      return false;
    }

    return roles.some(role => authRequest.user!.roles.includes(role));
  }

  /**
   * Refresh an authentication token
   */
  async refreshToken(refreshToken: string, _ipAddress?: string, _userAgent?: string): Promise<AuthResult> {
    try {
      const decoded = jwt.verify(refreshToken, this.config.jwtSecret) as JWTPayload;
      const session = this.sessions.get(decoded.sessionId);

      if (!session || !session.isActive || session.refreshToken !== refreshToken) {
        return {
          success: false,
          error: 'Invalid refresh token'
        };
      }

      const user = this.users.get(session.userId);
      if (!user?.isActive) {
        return {
          success: false,
          error: 'User not found or inactive'
        };
      }

      // Generate new tokens
      const newToken = this.generateToken({ sessionId: session.id, userId: session.userId });
      const newRefreshToken = this.generateRefreshToken({ sessionId: session.id, userId: session.userId });

      // Update session
      session.token = newToken;
      session.refreshToken = newRefreshToken;
      session.lastAccessed = new Date();
      session.expiresAt = new Date(Date.now() + this.parseExpirationTime(this.config.jwtExpiresIn));
      this.sessions.set(session.id, session);

      return {
        success: true,
        user,
        session,
        token: newToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      return {
        success: false,
        error: 'Token refresh failed'
      };
    }
  }

  /**
   * Logout a user
   */
  async logout(token: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret) as JWTPayload;
      const session = this.sessions.get(decoded.sessionId);

      if (session) {
        session.isActive = false;
        this.sessions.set(session.id, session);

        this.securityMonitor.logSecurityEvent({
          type: 'authentication_success',
          severity: 'low',
          source: 'auth_system',
          message: `User logged out: ${session.userId}`,
          details: { sessionId: session.id, userId: session.userId }
        });
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create an API key for a user
   */
  async createAPIKey(userId: string, name: string, _permissions?: string[]): Promise<string | null> {
    const user = this.users.get(userId);
    if (!user?.isActive) {
      return null;
    }

    const apiKey = crypto.randomUUID();
    user.apiKeys = user.apiKeys || [];
    user.apiKeys.push(apiKey);

    this.users.set(userId, user);

    // Store API key metadata in credential manager
    await this.credentialManager.storeCredential({
      name: `api-key-${name}`,
      value: apiKey,
      type: 'api_key',
      description: `API key for ${user.username}`,
      tags: ['api-key', user.username]
    });

    return apiKey;
  }

  /**
   * Validate an API key
   */
  validateAPIKey(apiKey: string): User | null {
    for (const user of this.users.values()) {
      if (user.apiKeys?.includes(apiKey) && user.isActive) {
        return user;
      }
    }
    return null;
  }

  // Private methods

  private validateUserInput(userData: { username: string; email: string; password: string }): {
    isValid: boolean;
    error?: string;
  } {
    if (!userData.username || userData.username.length < 3) {
      return { isValid: false, error: 'Username must be at least 3 characters' };
    }

    if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      return { isValid: false, error: 'Invalid email address' };
    }

    const passwordValidation = this.validatePassword(userData.password);
    if (!passwordValidation.isValid) {
      return passwordValidation;
    }

    return { isValid: true };
  }

  private validatePassword(password: string): { isValid: boolean; error?: string } {
    const policy = this.config.passwordPolicy;

    if (password.length < policy.minLength) {
      return { isValid: false, error: `Password must be at least ${policy.minLength} characters` };
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      return { isValid: false, error: 'Password must contain uppercase letters' };
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      return { isValid: false, error: 'Password must contain lowercase letters' };
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      return { isValid: false, error: 'Password must contain numbers' };
    }

    if (policy.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { isValid: false, error: 'Password must contain special characters' };
    }

    return { isValid: true };
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const parts = hashedPassword.split(':');
    if (parts.length < 2) return false;
    const salt = parts[0];
    const hash = parts[1];
    if (!salt || !hash) return false;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  private findUserByUsername(username: string): User | undefined {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  private findUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  private generateMFASession(_userId: string): string {
    // Generate temporary MFA challenge
    return crypto.randomBytes(16).toString('hex');
  }

  private verifyMFACode(_secret: string, _code: string): boolean {
    // Simplified TOTP verification - in production, use a proper TOTP library
    return _code.length === 6 && /^\d+$/.test(_code);
  }

  private async createSession(user: User, ipAddress?: string, userAgent?: string): Promise<AuthSession> {
    const sessionId = crypto.randomUUID();
    const token = this.generateToken({ sessionId, userId: user.id });
    const refreshToken = this.generateRefreshToken({ sessionId, userId: user.id });

    const session: AuthSession = {
      id: sessionId,
      userId: user.id,
      token,
      refreshToken,
      expiresAt: new Date(Date.now() + this.parseExpirationTime(this.config.jwtExpiresIn)),
      createdAt: new Date(),
      ipAddress,
      userAgent,
      isActive: true,
      lastAccessed: new Date()
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  private generateToken(payload: { sessionId: string; userId: string }): string {
    return jwt.sign(payload, this.config.jwtSecret, { expiresIn: this.config.jwtExpiresIn } as jwt.SignOptions);
  }

  private generateRefreshToken(payload: { sessionId: string; userId: string }): string {
    return jwt.sign(payload, this.config.jwtSecret, { expiresIn: this.config.refreshTokenExpiresIn } as jwt.SignOptions);
  }

  private parseExpirationTime(expiresIn: string): number {
    // Parse expressions like '1h', '30m', '7d'
    const match = expiresIn.match(/^(\d+)([hmsd])$/);
    if (!match?.[1] || !match[2]) return 3600000; // Default 1 hour

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 3600000;
    }
  }

  private isSessionHijacked(session: AuthSession, currentIP?: string, currentUA?: string): boolean {
    // Simple session hijacking detection
    if (session.ipAddress && currentIP && session.ipAddress !== currentIP) {
      return true;
    }

    if (session.userAgent && currentUA && session.userAgent !== currentUA) {
      return true;
    }

    return false;
  }

  private getPermissionsForRoles(roles: string[]): string[] {
    const permissions = new Set<string>();

    roles.forEach(roleName => {
      const role = this.roles.get(roleName);
      if (role) {
        role.permissions.forEach(permission => permissions.add(permission));
      }
    });

    return Array.from(permissions);
  }

  private initializeDefaultRolesAndPermissions(): void {
    // Default permissions
    const defaultPermissions: Permission[] = [
      {
        name: 'prp.read',
        description: 'Read access to PRP data',
        resource: 'prp',
        action: 'read',
        isSystem: true
      },
      {
        name: 'prp.write',
        description: 'Write access to PRP data',
        resource: 'prp',
        action: 'write',
        isSystem: true
      },
      {
        name: 'prp.admin',
        description: 'Administrative access to PRP system',
        resource: 'prp',
        action: 'admin',
        isSystem: true
      },
      {
        name: 'user.manage',
        description: 'Manage user accounts',
        resource: 'user',
        action: 'manage',
        isSystem: true
      },
      {
        name: 'system.monitor',
        description: 'Access system monitoring and logs',
        resource: 'system',
        action: 'monitor',
        isSystem: true
      }
    ];

    defaultPermissions.forEach(permission => {
      this.permissions.set(permission.name, permission);
    });

    // Default roles
    const defaultRoles: Role[] = [
      {
        name: 'user',
        description: 'Standard user with basic access',
        permissions: ['prp.read'],
        isSystem: true,
        createdAt: new Date()
      },
      {
        name: 'developer',
        description: 'Developer with read/write access',
        permissions: ['prp.read', 'prp.write'],
        isSystem: true,
        createdAt: new Date()
      },
      {
        name: 'admin',
        description: 'System administrator with full access',
        permissions: ['prp.read', 'prp.write', 'prp.admin', 'user.manage', 'system.monitor'],
        isSystem: true,
        createdAt: new Date()
      }
    ];

    defaultRoles.forEach(role => {
      this.roles.set(role.name, role);
    });
  }

  private loadExistingUsers(): void {
    // Load users from storage or database
    // For now, start with empty user store
  }

  private startSessionCleanup(): void {
    setInterval(() => {
      const now = new Date();
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.expiresAt < now || !session.isActive) {
          this.sessions.delete(sessionId);
        }
      }
    }, 60000); // Clean up every minute
  }
}

export default AuthSystem;