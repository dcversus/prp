/**
 * Security Integration Module
 *
 * Provides unified security interface for all PRP components integrating
 * input validation, authentication, authorization, and monitoring.
 */
import { InputValidator } from './input-validator';
import { CredentialManager } from './credential-manager';
import { SecurityMonitor } from './security-monitor';
import { AuthSystem } from './auth-system';

import type { SecurityConfig, ValidationResult } from './input-validator';

export interface SecurityIntegrationConfig {
  // Input validation configuration
  validation: Partial<SecurityConfig>;
  // Authentication system configuration
  auth: {
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
      preventReuse?: number;
      maxAge?: number;
    };
    rateLimiting: {
      loginAttempts: number;
      loginWindowMs: number;
      mfaAttempts: number;
      mfaWindowMs: number;
    };
  };
  // Security monitoring configuration
  monitoring: {
    enableRealTimeAlerting: boolean;
    alertRetentionDays: number;
    rateLimitThresholds: {
      authenticationFailures: number;
      requestRate: number;
      dataAccessAttempts?: number;
    };
    suspiciousPatterns: RegExp[];
    blacklistedIPs?: string[];
    whitelistedIPs?: string[];
    alertChannels?: {
      email?: {
        enabled: boolean;
        recipients: string[];
        smtpConfig?: Record<string, unknown>;
      };
      webhook?: {
        enabled: boolean;
        url: string;
        headers?: Record<string, string>;
      };
      slack?: {
        enabled: boolean;
        webhookUrl: string;
        channel: string;
      };
    };
  };
  // Credential management configuration
  credentials: {
    storagePath?: string;
    enableAutoRotation: boolean;
    rotationDays: number;
    enableAccessLogging: boolean;
  };
}
export interface SecureRequest {
  token?: string;
  apiKey?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}
export interface SecureResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  validationWarnings?: string[];
  securityHeaders?: Record<string, string>;
}
export interface SecurityContext {
  user?: {
    id?: string;
    username?: string;
    email?: string;
    roles?: string[];
    permissions?: string[];
    [key: string]: unknown;
  };
  session?: {
    id: string;
    createdAt: Date;
    expiresAt: Date;
    [key: string]: unknown;
  };
  permissions?: string[];
  isAuthenticated: boolean;
  isAuthorized: boolean;
  isSecure: boolean;
  requestId?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  validatedInputs: Map<string, ValidationResult>;
}
/**
 * Unified Security Integration Class
 *
 * This class provides a single entry point for all security functionality
 * across the PRP system, ensuring consistent security practices.
 */
export class SecurityIntegration {
  private static instance: SecurityIntegration;
  private readonly inputValidator: typeof InputValidator;
  private readonly credentialManager: CredentialManager;
  private readonly securityMonitor: SecurityMonitor;
  private readonly authSystem: AuthSystem;
  private readonly config: SecurityIntegrationConfig;
  private initialized = false;
  private constructor(config: SecurityIntegrationConfig) {
    this.config = config;
    this.inputValidator = InputValidator;
    this.credentialManager = new CredentialManager(config.credentials);
    this.securityMonitor = SecurityMonitor.getInstance({
      enableRealTimeAlerting: config.monitoring.enableRealTimeAlerting,
      alertRetentionDays: config.monitoring.alertRetentionDays,
      rateLimitThresholds: {
        authenticationFailures: config.monitoring.rateLimitThresholds.authenticationFailures,
        requestRate: config.monitoring.rateLimitThresholds.requestRate,
        dataAccessAttempts: config.monitoring.rateLimitThresholds.dataAccessAttempts ?? 10,
      },
      suspiciousPatterns: config.monitoring.suspiciousPatterns,
      blacklistedIPs: config.monitoring.blacklistedIPs ?? [],
      whitelistedIPs: config.monitoring.whitelistedIPs ?? [],
      alertChannels: config.monitoring.alertChannels ?? {
        email: { enabled: false, recipients: [] },
        webhook: { enabled: false, url: '' },
        slack: { enabled: false, webhookUrl: '', channel: '' },
      },
    });
    this.authSystem = AuthSystem.getInstance({
      jwtSecret: config.auth.jwtSecret,
      jwtExpiresIn: config.auth.jwtExpiresIn,
      refreshTokenExpiresIn: config.auth.refreshTokenExpiresIn,
      sessionTimeout: config.auth.sessionTimeout,
      maxSessionsPerUser: config.auth.maxSessionsPerUser,
      enableMFA: config.auth.enableMFA,
      passwordPolicy: {
        minLength: config.auth.passwordPolicy.minLength,
        requireUppercase: config.auth.passwordPolicy.requireUppercase,
        requireLowercase: config.auth.passwordPolicy.requireLowercase,
        requireNumbers: config.auth.passwordPolicy.requireNumbers,
        requireSymbols: config.auth.passwordPolicy.requireSymbols,
        preventReuse: config.auth.passwordPolicy.preventReuse ?? 5,
        maxAge: config.auth.passwordPolicy.maxAge ?? 90,
      },
      rateLimiting: config.auth.rateLimiting ?? {
        loginAttempts: 5,
        loginWindowMs: 900000, // 15 minutes
        mfaAttempts: 3,
        mfaWindowMs: 300000, // 5 minutes
      },
    });
  }
  static getInstance(config?: SecurityIntegrationConfig): SecurityIntegration {
    if (!SecurityIntegration.instance) {
      if (!config) {
        throw new Error('SecurityIntegration requires configuration on first instantiation');
      }
      SecurityIntegration.instance = new SecurityIntegration(config);
    }
    return SecurityIntegration.instance;
  }
  /**
   * Initialize the security integration
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await this.credentialManager.initialize();
    await this.authSystem.initialize();
    this.initialized = true;
    // Security integration initialized successfully
  }
  /**
   * Create a security context from a request
   */
  async createSecurityContext(request: SecureRequest): Promise<SecurityContext> {
    this.ensureInitialized();
    const context: SecurityContext = {
      isAuthenticated: false,
      isAuthorized: false,
      isSecure: false,
      riskLevel: 'low',
      validatedInputs: new Map(),
    };
    try {
      // Analyze security context first
      this.securityMonitor.analyzeSecurityContext({
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      });
      // Handle token-based authentication
      if (request.token) {
        const authRequest = this.authSystem.validateToken(
          request.token,
          request.ipAddress,
          request.userAgent,
        );
        if (authRequest.user) {
          context.user = authRequest.user as unknown as Record<string, unknown>;
          if (authRequest.session) {
            context.session = authRequest.session as unknown as {
              id: string;
              createdAt: Date;
              expiresAt: Date;
              [key: string]: unknown;
            };
          }
          context.permissions = authRequest.permissions ?? [];
          context.isAuthenticated = true;
          context.isAuthorized = true;
        }
      }
      // Handle API key authentication
      else if (request.apiKey) {
        const user = this.authSystem.validateAPIKey(request.apiKey);
        if (user) {
          context.user = user as unknown as Record<string, unknown>;
          context.permissions = user.permissions ?? [];
          context.isAuthenticated = true;
          context.isAuthorized = true;
        }
      }
      // Log authentication events
      if (context.isAuthenticated) {
        this.securityMonitor.logSecurityEvent({
          type: 'authentication_success',
          severity: 'low',
          source: 'security_integration',
          message: `User authenticated: ${context.user?.username || 'unknown'}`,
          details: {
            userId: context.user?.id,
            method: request.token ? 'token' : 'api_key',
            ipAddress: request.ipAddress,
          },
        });
      } else if (request.token || request.apiKey) {
        this.securityMonitor.logSecurityEvent({
          type: 'authentication_failure',
          severity: 'medium',
          source: 'security_integration',
          message: 'Authentication failed',
          details: {
            hasToken: !!request.token,
            hasApiKey: !!request.apiKey,
            ipAddress: request.ipAddress,
          },
        });
      }
    } catch (error) {
      this.securityMonitor.logSecurityEvent({
        type: 'authentication_failure',
        severity: 'medium',
        source: 'security_integration',
        message: `Authentication error: ${error instanceof Error ? error.message : String(error)}`,
        details: { error, ipAddress: request.ipAddress },
      });
    }
    return context;
  }
  /**
   * Validate and sanitize input data
   */
  validateInput(
    input: string | Record<string, unknown> | unknown[] | number | boolean,
    fieldName: string,
    customConfig?: Partial<SecurityConfig>,
  ): ValidationResult {
    this.ensureInitialized();
    const config = { ...this.config.validation, ...customConfig };
    const stringInput = typeof input === 'string' ? input : JSON.stringify(input);
    const result = this.inputValidator.validateInput(stringInput, config);
    // Store validation result in context for auditing
    // Note: In a real implementation, this would be stored per-request
    // Log security events for high-risk validations
    if (result.riskLevel === 'high' || result.riskLevel === 'critical') {
      this.securityMonitor.logSecurityEvent({
        type: 'injection_attempt',
        severity: result.riskLevel === 'critical' ? 'critical' : 'high',
        source: 'security_integration',
        message: `Suspicious input detected in field: ${fieldName}`,
        details: {
          fieldName,
          riskLevel: result.riskLevel,
          warnings: result.warnings,
          inputLength: stringInput.length,
        },
      });
    }
    return result;
  }
  /**
   * Validate file path for security
   */
  validatePath(filePath: string, allowedBasePaths: string[] = []): ValidationResult {
    this.ensureInitialized();
    const result = this.inputValidator.validatePath(filePath, allowedBasePaths);
    if (!result.isValid) {
      this.securityMonitor.logSecurityEvent({
        type: result.error?.includes('traversal')
          ? 'path_traversal_attempt'
          : 'suspicious_activity',
        severity: result.riskLevel === 'critical' ? 'critical' : 'high',
        source: 'security_integration',
        message: `Path validation failed: ${result.error}`,
        details: {
          filePath,
          allowedBasePaths,
          riskLevel: result.riskLevel,
        },
      });
    }
    return result;
  }
  /**
   * Validate URL for security (SSRF protection)
   */
  validateURL(url: string, allowedSchemes: string[] = ['http', 'https']): ValidationResult {
    this.ensureInitialized();
    const result = this.inputValidator.validateURL(url, allowedSchemes);
    if (!result.isValid) {
      this.securityMonitor.logSecurityEvent({
        type:
          result.error?.includes('localhost') || result.error?.includes('private')
            ? 'ssrf_attempt'
            : 'suspicious_activity',
        severity: 'high',
        source: 'security_integration',
        message: `URL validation failed: ${result.error}`,
        details: {
          url,
          allowedSchemes,
          riskLevel: result.riskLevel,
        },
      });
    }
    return result;
  }
  /**
   * Validate JSON input for security
   */
  validateJSON(jsonString: string): ValidationResult {
    this.ensureInitialized();
    const result = this.inputValidator.validateJSON(jsonString);
    if (!result.isValid) {
      this.securityMonitor.logSecurityEvent({
        type: 'injection_attempt',
        severity: result.riskLevel === 'critical' ? 'critical' : 'medium',
        source: 'security_integration',
        message: `JSON validation failed: ${result.error}`,
        details: {
          inputLength: jsonString.length,
          riskLevel: result.riskLevel,
        },
      });
    }
    return result;
  }
  /**
   * Check if a security context has the required permission
   */
  hasPermission(context: SecurityContext, permission: string): boolean {
    return Boolean(
      context.isAuthenticated &&
        context.permissions &&
        (context.permissions.includes(permission) ||
          (context.user?.roles as string[]).includes('admin')),
    );
  }
  /**
   * Check if a security context has any of the required roles
   */
  hasRole(context: SecurityContext, roles: string[]): boolean {
    if (!context.isAuthenticated || !context.user) {
      return false;
    }
    return roles.some((role) => (context.user?.roles as string[]).includes(role));
  }
  /**
   * Require authentication - throws if not authenticated
   */
  requireAuthentication(context: SecurityContext): void {
    if (!context.isAuthenticated) {
      this.securityMonitor.logSecurityEvent({
        type: 'authorization_violation',
        severity: 'medium',
        source: 'security_integration',
        message: 'Unauthorized access attempt - authentication required',
        details: { context: 'authentication_required' },
      });
      throw new Error('Authentication required');
    }
  }
  /**
   * Require specific permission - throws if not authorized
   */
  requirePermission(context: SecurityContext, permission: string): void {
    this.requireAuthentication(context);
    if (!this.hasPermission(context, permission)) {
      this.securityMonitor.logSecurityEvent({
        type: 'authorization_violation',
        severity: 'high',
        source: 'security_integration',
        message: `Unauthorized access attempt - permission required: ${permission}`,
        details: {
          userId: context.user?.id,
          permission,
          userPermissions: context.permissions,
        },
      });
      throw new Error(`Permission required: ${permission}`);
    }
  }
  /**
   * Require specific role - throws if not authorized
   */
  requireRole(context: SecurityContext, roles: string[]): void {
    this.requireAuthentication(context);
    if (!this.hasRole(context, roles)) {
      this.securityMonitor.logSecurityEvent({
        type: 'authorization_violation',
        severity: 'high',
        source: 'security_integration',
        message: `Unauthorized access attempt - role required: ${roles.join(' or ')}`,
        details: {
          userId: context.user?.id,
          requiredRoles: roles,
          userRoles: context.user?.roles,
        },
      });
      throw new Error(`Role required: ${roles.join(' or ')}`);
    }
  }
  /**
   * Create a secure response with appropriate headers
   */
  createSecureResponse(
    data: unknown,
    context: SecurityContext,
    additionalHeaders?: Record<string, string>,
  ): SecureResponse {
    // Use security context to determine appropriate headers
    const cspDirectives = this.buildCSPFromContext(context);
    const securityHeaders: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Content-Security-Policy': cspDirectives,
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Security-Context': context.requestId ?? 'unknown',
      ...additionalHeaders,
    };
    // Only add HSTS header if context is secure
    if (context.isSecure) {
      securityHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    }
    return {
      success: true,
      data,
      securityHeaders,
    };
  }
  /**
   * Build Content Security Policy based on security context
   */
  private buildCSPFromContext(context: SecurityContext): string {
    const directives = ["default-src 'self'"];
    // Add context-specific CSP directives
    if (context.permissions?.includes('external-scripts')) {
      directives.push("script-src 'self' 'unsafe-inline'");
    } else {
      directives.push("script-src 'self'");
    }
    if (context.permissions?.includes('api-access')) {
      directives.push("connect-src 'self' api:");
    }
    if (context.isSecure) {
      directives.push('upgrade-insecure-requests');
    }
    return directives.join('; ');
  }
  /**
   * Create a secure error response
   */
  createSecureErrorResponse(
    error: string,
    context: SecurityContext,
    statusCode = 400,
  ): SecureResponse {
    // Don't expose sensitive error details to unauthorized users
    const safeError = context.isAuthenticated ? error : 'Access denied';
    this.securityMonitor.logSecurityEvent({
      type: statusCode === 403 ? 'authorization_violation' : 'suspicious_activity',
      severity: 'medium',
      source: 'security_integration',
      message: `Security error response: ${safeError}`,
      details: {
        statusCode,
        isAuthenticated: context.isAuthenticated,
        userId: context.user?.id,
      },
    });
    return {
      success: false,
      error: safeError,
      securityHeaders: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    };
  }
  /**
   * Generate a secure random token
   */
  generateSecureToken(length = 32): string {
    return this.inputValidator.generateSecureToken(length);
  }
  /**
   * Hash sensitive data securely
   */
  hashSensitiveData(data: string, salt?: string): string {
    return this.inputValidator.hashSensitiveData(data, salt);
  }
  /**
   * Get security statistics
   */
  getSecurityStats(timeframeHours = 24) {
    this.ensureInitialized();
    return this.securityMonitor.getSecurityStats(timeframeHours);
  }
  /**
   * Generate security report
   */
  generateSecurityReport(timeframeHours = 24) {
    this.ensureInitialized();
    return this.securityMonitor.generateSecurityReport(timeframeHours);
  }
  /**
   * Export security events
   */
  exportSecurityEvents(format: 'json' | 'csv' = 'json', timeframeHours?: number) {
    this.ensureInitialized();
    return this.securityMonitor.exportSecurityEvents(format, timeframeHours);
  }
  /**
   * Get credential manager for direct access
   */
  getCredentialManager(): CredentialManager {
    this.ensureInitialized();
    return this.credentialManager;
  }
  /**
   * Get auth system for direct access
   */
  getAuthSystem(): AuthSystem {
    this.ensureInitialized();
    return this.authSystem;
  }
  /**
   * Get security monitor for direct access
   */
  getSecurityMonitor(): SecurityMonitor {
    this.ensureInitialized();
    return this.securityMonitor;
  }
  /**
   * Run security test for a control
   */
  async runSecurityTest(controlId: string): Promise<boolean> {
    try {
      // Mock implementation for security testing
      // In a real implementation, this would run actual security tests
      // For now, return a simple mock result based on controlId
      return controlId.includes('auth') || controlId.includes('secure');
    } catch (_error) {
      // Security test failed
      return false;
    }
  }
  /**
   * Shutdown security integration
   */
  async shutdown(): Promise<void> {
    if (this.initialized) {
      this.securityMonitor.shutdown();
      this.credentialManager.lock();
      this.initialized = false;
    }
  }
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SecurityIntegration not initialized. Call initialize() first.');
    }
  }
}
/**
 * Default security configuration
 */
export const defaultSecurityConfig: SecurityIntegrationConfig = {
  validation: {
    maxInputLength: 10000,
    enableRateLimit: true,
    enableContentScanning: true,
    sanitizeHTML: true,
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-production',
    jwtExpiresIn: '1h',
    refreshTokenExpiresIn: '7d',
    sessionTimeout: 3600000, // 1 hour
    maxSessionsPerUser: 5,
    enableMFA: false,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: false,
      preventReuse: 5,
      maxAge: 90,
    },
    rateLimiting: {
      loginAttempts: 5,
      loginWindowMs: 900000, // 15 minutes
      mfaAttempts: 3,
      mfaWindowMs: 300000, // 5 minutes
    },
  },
  monitoring: {
    enableRealTimeAlerting: true,
    alertRetentionDays: 30,
    rateLimitThresholds: {
      authenticationFailures: 5,
      requestRate: 100,
    },
    suspiciousPatterns: [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /\$\([^)]*\)/g,
      /`[^`]*`/g,
      /\.\.[/\\]/g,
      /(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)/gi,
      /\{\s*\$[^}]*\}/g,
    ],
  },
  credentials: {
    enableAutoRotation: true,
    rotationDays: 90,
    enableAccessLogging: true,
  },
};
export default SecurityIntegration;
