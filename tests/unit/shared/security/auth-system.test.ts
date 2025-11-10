/**
 * Unit Tests for AuthSystem
 */

import { AuthSystem } from '../../../../src/shared/security/auth-system';
import { AuthSystemConfig } from '../../../../src/shared/security/auth-system';
import { SecurityMonitor } from '../../../../src/shared/security/security-monitor';

// Mock SecurityMonitor
jest.mock('../../../../src/shared/security/security-monitor', () => ({
  SecurityMonitor: {
    getInstance: jest.fn().mockReturnValue({
      logSecurityEvent: jest.fn(),
      clearEvents: jest.fn(),
      getEvents: jest.fn().mockReturnValue([]),
      generateReport: jest.fn().mockReturnValue({ summary: 'Mock report', events: [] })
    })
  }
}));

// Mock CredentialManager
jest.mock('../../../../src/shared/security/credential-manager', () => ({
  CredentialManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    storeCredential: jest.fn().mockResolvedValue(undefined),
    getCredential: jest.fn().mockResolvedValue(null),
    updateCredential: jest.fn().mockResolvedValue(undefined),
    deleteCredential: jest.fn().mockResolvedValue(undefined),
    listCredentials: jest.fn().mockResolvedValue([]),
    searchCredentials: jest.fn().mockResolvedValue([]),
    validateCredential: jest.fn().mockResolvedValue(true),
    rotateCredential: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('AuthSystem', () => {
  let authSystem: AuthSystem;
  let testConfig: AuthSystemConfig;

  beforeEach(() => {
    testConfig = {
      jwtSecret: 'test-secret-key-for-jwt-signing',
      jwtExpiresIn: '1h',
      refreshTokenExpiresIn: '7d',
      sessionTimeout: 3600000,
      maxSessionsPerUser: 5,
      enableMFA: false,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: false,
        preventReuse: 5,
        maxAge: 7776000
      },
      rateLimiting: {
        loginAttempts: 5,
        loginWindowMs: 900000,
        mfaAttempts: 3,
        mfaWindowMs: 300000
      }
    };

    // Reset singleton for testing
    (AuthSystem as any).instance = undefined;
    authSystem = AuthSystem.getInstance(testConfig);
  });

  describe('User Registration', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123',
        roles: ['user']
      };

      const result = await authSystem.registerUser(userData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.username).toBe(userData.username);
      expect(result.user?.email).toBe(userData.email);
      expect(result.user?.passwordHash).not.toBe(userData.password); // Should be hashed
      expect(result.user?.roles).toEqual(userData.roles);
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'TestPass123'
      };

      const result = await authSystem.registerUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak'
      };

      const result = await authSystem.registerUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be at least');
    });

    it('should reject duplicate usernames', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123'
      };

      // Register first user
      await authSystem.registerUser(userData);

      // Try to register second user with same username
      const result = await authSystem.registerUser({
        ...userData,
        email: 'different@example.com'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('User already exists');
    });
  });

  describe('User Authentication', () => {
    beforeEach(async () => {
      // Setup test user
      await authSystem.registerUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123',
        roles: ['user']
      });
    });

    it('should authenticate user with valid credentials', async () => {
      const result = await authSystem.authenticateUser({
        username: 'testuser',
        password: 'TestPass123'
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.session).toBeDefined();
    });

    it('should reject authentication with invalid password', async () => {
      const result = await authSystem.authenticateUser({
        username: 'testuser',
        password: 'WrongPassword'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });

    it('should reject authentication for non-existent user', async () => {
      const result = await authSystem.authenticateUser({
        username: 'nonexistent',
        password: 'TestPass123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });
  });

  describe('Token Validation', () => {
    let validToken: string;

    beforeEach(async () => {
      // Setup and authenticate test user
      await authSystem.registerUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123',
        roles: ['user']
      });

      const authResult = await authSystem.authenticateUser({
        username: 'testuser',
        password: 'TestPass123'
      });

      validToken = authResult.token!;
    });

    it('should validate a valid token', () => {
      const authRequest = authSystem.validateToken(validToken);

      expect(authRequest.user).toBeDefined();
      expect(authRequest.user?.username).toBe('testuser');
      expect(authRequest.session).toBeDefined();
      expect(authRequest.permissions).toBeDefined();
    });

    it('should reject an invalid token', () => {
      const authRequest = authSystem.validateToken('invalid-token');

      expect(authRequest.user).toBeUndefined();
      expect(authRequest.session).toBeUndefined();
    });
  });

  describe('Authorization', () => {
    let authRequest: any;

    beforeEach(async () => {
      // Setup and authenticate test user
      await authSystem.registerUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123',
        roles: ['user']
      });

      const authResult = await authSystem.authenticateUser({
        username: 'testuser',
        password: 'TestPass123'
      });

      authRequest = authSystem.validateToken(authResult.token!);
    });

    it('should grant access to user with required permission', () => {
      // User with 'user' role should have 'prp.read' permission
      const hasPermission = authSystem.hasPermission(authRequest, 'prp.read');
      expect(hasPermission).toBe(true);
    });

    it('should deny access to user without required permission', () => {
      const hasPermission = authSystem.hasPermission(authRequest, 'prp.admin');
      expect(hasPermission).toBe(false);
    });

    it('should identify user with specific role', () => {
      const hasRole = authSystem.hasRole(authRequest, ['user']);
      expect(hasRole).toBe(true);
    });

    it('should identify user without specific role', () => {
      const hasRole = authSystem.hasRole(authRequest, ['admin']);
      expect(hasRole).toBe(false);
    });
  });

  describe('Session Management', () => {
    let validToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      await authSystem.registerUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123',
        roles: ['user']
      });

      const authResult = await authSystem.authenticateUser({
        username: 'testuser',
        password: 'TestPass123'
      });

      validToken = authResult.token!;
      refreshToken = authResult.refreshToken!;
    });

    it('should refresh tokens successfully', async () => {
      const result = await authSystem.refreshToken(refreshToken);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.token).not.toBe(validToken); // New token should be different
    });

    it('should logout user successfully', async () => {
      const logoutSuccess = await authSystem.logout(validToken);
      expect(logoutSuccess).toBe(true);

      // Token should no longer be valid
      const authRequest = authSystem.validateToken(validToken);
      expect(authRequest.user).toBeUndefined();
    });
  });

  describe('API Key Management', () => {
    let userId: string;

    beforeEach(async () => {
      const userResult = await authSystem.registerUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123',
        roles: ['user']
      });
      userId = userResult.user!.id;
    });

    it('should create API key for user', async () => {
      const apiKey = await authSystem.createAPIKey(userId, 'test-key');
      expect(apiKey).toBeDefined();
      expect(typeof apiKey).toBe('string');
      expect(apiKey!.length).toBeGreaterThan(0);
    });

    it('should validate API key', async () => {
      const apiKey = await authSystem.createAPIKey(userId, 'test-key');
      const user = authSystem.validateAPIKey(apiKey!);

      expect(user).toBeDefined();
      expect(user?.id).toBe(userId);
      expect(user?.username).toBe('testuser');
    });

    it('should reject invalid API key', async () => {
      const user = authSystem.validateAPIKey('invalid-api-key');
      expect(user).toBeNull();
    });
  });
});