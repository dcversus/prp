/**
 * Enhanced Input Validation and Sanitization Security Module
 *
 * Provides comprehensive input validation, sanitization, and security
 * features for the PRP CLI system based on OWASP and Node.js security best practices.
 */

import * as crypto from 'crypto';

export interface ValidationResult {
  isValid: boolean;
  sanitized?: string;
  error?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  warnings?: string[];
}

export interface SecurityConfig {
  maxInputLength: number;
  allowedChars: RegExp;
  blockedPatterns: RegExp[];
  enableRateLimit: boolean;
  enableContentScanning: boolean;
  sanitizeHTML: boolean;
}

export class InputValidator {
  private static readonly DEFAULT_CONFIG: SecurityConfig = {
    maxInputLength: 10000,
    allowedChars: /^[a-zA-Z0-9\s\-_.,!?@#%&()[\]{}:;"'/\\|`~\n\r\t]+$/,
    blockedPatterns: [
      // Script injection patterns
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      // Command injection patterns
      /\$\([^)]*\)/g,
      /`[^`]*`/g,
      /\|[^|]*\|/g,
      /&&[^&]*$/g,
      /;[^;]*$/g,
      // Path traversal patterns
      /\.\.[/\\]/g,
      // SQL injection patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      // NoSQL injection patterns
      /\{\s*\$[^}]*\}/g,
      // XSS patterns
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi,
      /<link\b[^>]*>/gi,
      /<meta\b[^>]*>/gi
    ],
    enableRateLimit: true,
    enableContentScanning: true,
    sanitizeHTML: true
  };

  private static rateLimitMap = new Map<string, { count: number; lastReset: number }>();
  private static readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private static readonly RATE_LIMIT_MAX_REQUESTS = 100;

  /**
   * Validate and sanitize user input
   */
  static validateInput(input: string, config: Partial<SecurityConfig> = {}): ValidationResult {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    try {
      // Basic null/undefined checks
      if (input == null) {
        return {
          isValid: false,
          error: 'Input cannot be null or undefined',
          riskLevel: 'high'
        };
      }

      // Convert to string if needed
      const stringInput = String(input);

      // Length validation
      if (stringInput.length > finalConfig.maxInputLength) {
        return {
          isValid: false,
          error: `Input exceeds maximum length of ${finalConfig.maxInputLength} characters`,
          riskLevel: 'medium'
        };
      }

      // Rate limiting check
      if (finalConfig.enableRateLimit && !this.checkRateLimit('general')) {
        return {
          isValid: false,
          error: 'Rate limit exceeded. Please try again later.',
          riskLevel: 'medium'
        };
      }

      const warnings: string[] = [];
      let sanitizedInput = stringInput;

      // Check for blocked patterns
      for (const pattern of finalConfig.blockedPatterns) {
        if (pattern.test(sanitizedInput)) {
          const matches = sanitizedInput.match(pattern);
          if (matches) {
            return {
              isValid: false,
              error: `Potentially dangerous content detected: ${pattern.source}`,
              riskLevel: 'critical'
            };
          }
        }
      }

      // Character validation
      if (!finalConfig.allowedChars.test(sanitizedInput)) {
        const invalidChars = sanitizedInput.match(/[^a-zA-Z0-9\s\-_.,!?@#%&()[\]{}:;"'/\\|`~\n\r\t]/g);
        if (invalidChars) {
          warnings.push(`Contains potentially problematic characters: ${invalidChars.join(', ')}`);
        }

        // Remove invalid characters
        sanitizedInput = sanitizedInput.replace(/[^a-zA-Z0-9\s\-_.,!?@#%&()[\]{}:;"'/\\|`~\n\r\t]/g, '');
      }

      // HTML sanitization if enabled
      if (finalConfig.sanitizeHTML) {
        sanitizedInput = this.sanitizeHTML(sanitizedInput);
      }

      // Content scanning for sensitive information
      if (finalConfig.enableContentScanning) {
        const contentWarnings = this.scanForSensitiveContent(sanitizedInput);
        warnings.push(...contentWarnings);
      }

      return {
        isValid: true,
        sanitized: sanitizedInput,
        warnings: warnings.length > 0 ? warnings : undefined,
        riskLevel: this.calculateRiskLevel(sanitizedInput, warnings)
      };

    } catch (error) {
      return {
        isValid: false,
        error: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
        riskLevel: 'high'
      };
    }
  }

  /**
   * Validate file path to prevent path traversal attacks
   */
  static validatePath(filePath: string, allowedBasePaths: string[] = []): ValidationResult {
    try {
      // Normalize path
      const normalizedPath = filePath.replace(/\\/g, '/');

      // Check for path traversal attempts
      if (normalizedPath.includes('../') || normalizedPath.includes('..\\')) {
        return {
          isValid: false,
          error: 'Path traversal detected',
          riskLevel: 'critical'
        };
      }

      // Check for absolute paths (might be dangerous)
      if (normalizedPath.startsWith('/')) {
        return {
          isValid: false,
          error: 'Absolute paths are not allowed',
          riskLevel: 'high'
        };
      }

      // Check if path is within allowed base paths
      if (allowedBasePaths.length > 0) {
        const isAllowed = allowedBasePaths.some(basePath =>
          normalizedPath.startsWith(basePath.replace(/\\/g, '/'))
        );

        if (!isAllowed) {
          return {
            isValid: false,
            error: 'Path is outside allowed directories',
            riskLevel: 'high'
          };
        }
      }

      // Additional validation for dangerous file extensions
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.scr', '.vbs', '.js', '.jar'];
      const extension = normalizedPath.split('.').pop()?.toLowerCase();

      if (extension && dangerousExtensions.includes(`.${extension}`)) {
        return {
          isValid: false,
          error: `Dangerous file extension detected: .${extension}`,
          riskLevel: 'high'
        };
      }

      return {
        isValid: true,
        sanitized: normalizedPath,
        riskLevel: 'low'
      };

    } catch (error) {
      return {
        isValid: false,
        error: `Path validation error: ${error instanceof Error ? error.message : String(error)}`,
        riskLevel: 'high'
      };
    }
  }

  /**
   * Validate URL to prevent SSRF attacks
   */
  static validateURL(url: string, allowedSchemes: string[] = ['http', 'https']): ValidationResult {
    try {
      const parsedURL = new URL(url);

      // Check scheme
      if (!allowedSchemes.includes(parsedURL.protocol.replace(':', ''))) {
        return {
          isValid: false,
          error: `URL scheme not allowed: ${parsedURL.protocol}`,
          riskLevel: 'high'
        };
      }

      // Prevent localhost and private IP access (SSRF protection)
      const hostname = parsedURL.hostname.toLowerCase();
      const dangerousHosts = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        'localhost.localdomain',
        'ip6-localhost',
        'ip6-loopback'
      ];

      if (dangerousHosts.includes(hostname)) {
        return {
          isValid: false,
          error: 'Access to localhost is not allowed',
          riskLevel: 'high'
        };
      }

      // Check for private IP ranges
      if (this.isPrivateIP(hostname)) {
        return {
          isValid: false,
          error: 'Access to private IP ranges is not allowed',
          riskLevel: 'high'
        };
      }

      return {
        isValid: true,
        sanitized: url,
        riskLevel: 'low'
      };

    } catch (error) {
      return {
        isValid: false,
        error: `URL validation error: ${error instanceof Error ? error.message : String(error)}`,
        riskLevel: 'high'
      };
    }
  }

  /**
   * Validate JSON input for injection attacks
   */
  static validateJSON(jsonString: string): ValidationResult {
    try {
      const parsed = JSON.parse(jsonString);

      // Recursively validate the parsed object
      const validationResult = this.validateObject(parsed);

      if (validationResult.isValid) {
        return {
          isValid: true,
          sanitized: JSON.stringify(parsed),
          riskLevel: 'low'
        };
      } else {
        return validationResult;
      }

    } catch (error) {
      return {
        isValid: false,
        error: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
        riskLevel: 'medium'
      };
    }
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  /**
   * Hash sensitive data securely
   */
  static hashSensitiveData(data: string, salt?: string): string {
    const actualSalt = salt ?? crypto.randomBytes(16).toString('hex');
    return crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha512').toString('hex');
  }

  /**
   * Sanitize HTML content
   */
  private static sanitizeHTML(input: string): string {
    return input
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove event handlers
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      // Remove javascript: protocol
      .replace(/javascript\s*:/gi, '')
      // Remove dangerous tags
      .replace(/<\/?(iframe|object|embed|link|meta|script|style)\b[^>]*>/gi, '');
  }

  /**
   * Scan for sensitive information
   */
  private static scanForSensitiveContent(input: string): string[] {
    const warnings: string[] = [];

    // Check for potential API keys
    const apiKeyPatterns = [
      /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?\w{20,}['"]?/gi,
      /(?:token|auth)\s*[:=]\s*['"]?\w{20,}['"]?/gi,
      /(?:password|pwd|secret)\s*[:=]\s*['"]?\w{8,}['"]?/gi
    ];

    for (const pattern of apiKeyPatterns) {
      if (pattern.test(input)) {
        warnings.push('Potential API key or credential detected');
        break;
      }
    }

    // Check for email addresses (might be PII)
    if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(input)) {
      warnings.push('Email address detected');
    }

    // Check for phone numbers
    if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(input)) {
      warnings.push('Potential phone number detected');
    }

    // Check for credit card patterns
    if (/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/.test(input)) {
      warnings.push('Potential credit card number detected');
    }

    return warnings;
  }

  /**
   * Calculate risk level based on content and warnings
   */
  private static calculateRiskLevel(input: string, warnings: string[]): 'low' | 'medium' | 'high' | 'critical' {
    // Security analysis: consider input characteristics for risk assessment
    let riskScore = warnings.length;

    // Add risk based on input length (very long inputs can be suspicious)
    if (input.length > 10000) {
      riskScore += 2;
    } else if (input.length > 5000) {
      riskScore += 1;
    }

    // Add risk based on character patterns
    if (/[<>"'&]/.test(input)) {
      riskScore += 1;
    } // Potential XSS/HTML injection
    // Check for control characters using character code ranges
    for (let i = 0; i < input.length; i++) {
      const code = input.charCodeAt(i);
      if ((code >= 0x00 && code <= 0x08) || code === 0x0B || code === 0x0C ||
          (code >= 0x0E && code <= 0x1F) || code === 0x7F) {
        riskScore += 2;
        break;
      }
    }

    if (riskScore <= 1) {
      return 'low';
    }
    if (riskScore <= 3) {
      return 'medium';
    }
    if (riskScore <= 5) {
      return 'high';
    }
    return 'critical';
  }

  /**
   * Check if IP address is in private range
   */
  private static isPrivateIP(hostname: string): boolean {
    // IPv4 private ranges
    const ipv4PrivateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./, // Link-local
      /^224\./     // Multicast
    ];

    // IPv6 private ranges
    const ipv6PrivateRanges = [
      /^fc00:/i,    // Unique local
      /^fe80:/i,    // Link-local
      /^ff00:/i    // Multicast
    ];

    return [...ipv4PrivateRanges, ...ipv6PrivateRanges].some(range =>
      range.test(hostname)
    );
  }

  /**
   * Recursively validate object properties
   */
  private static validateObject(obj: unknown, depth: number = 0): ValidationResult {
    if (depth > 10) { // Prevent object recursion attacks
      return {
        isValid: false,
        error: 'Object nesting too deep',
        riskLevel: 'high'
      };
    }

    if (obj == null) {
      return { isValid: true, riskLevel: 'low' };
    }

    if (typeof obj === 'string') {
      return this.validateInput(obj);
    }

    if (typeof obj === 'object') {
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const result = this.validateObject(item, depth + 1);
          if (!result.isValid) {
            return result;
          }
        }
      } else {
        for (const [key, value] of Object.entries(obj)) {
          // Validate key names
          const keyResult = this.validateInput(key);
          if (!keyResult.isValid) {
            return keyResult;
          }

          // Validate values
          const valueResult = this.validateObject(value, depth + 1);
          if (!valueResult.isValid) {
            return valueResult;
          }
        }
      }
    }

    return { isValid: true, riskLevel: 'low' };
  }

  /**
   * Simple rate limiting implementation
   */
  private static checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const key = identifier;

    if (!this.rateLimitMap.has(key)) {
      this.rateLimitMap.set(key, { count: 1, lastReset: now });
      return true;
    }

    const limit = this.rateLimitMap.get(key);
    if (!limit) {
      throw new Error('Rate limit map entry not found');
    }

    // Reset if window expired
    if (now - limit.lastReset > this.RATE_LIMIT_WINDOW) {
      limit.count = 1;
      limit.lastReset = now;
      return true;
    }

    // Check limit
    if (limit.count >= this.RATE_LIMIT_MAX_REQUESTS) {
      return false;
    }

    limit.count++;
    return true;
  }
}

export default InputValidator;