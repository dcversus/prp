# PRP Security Module Integration Guide

This guide provides comprehensive instructions for integrating the enhanced security modules into the PRP CLI system.

## 📋 Overview

The security module consists of three main components:

1. **InputValidator** - Comprehensive input validation and sanitization
2. **CredentialManager** - Secure credential storage and management
3. **Security Tests** - Automated security testing framework

## 🔧 Integration Steps

### 1. Input Validator Integration

#### Basic Usage

```typescript
import { InputValidator } from '../security/input-validator';

// Validate user input
const userInput = process.argv[2] || '';
const result = InputValidator.validateInput(userInput);

if (!result.isValid) {
  console.error('Invalid input:', result.error);
  process.exit(1);
}

// Use sanitized input
const safeInput = result.sanitized;
```

#### Path Validation

```typescript
// Validate file paths to prevent traversal attacks
const filePath = req.body.filePath;
const pathResult = InputValidator.validatePath(filePath, ['src/', 'config/']);

if (!pathResult.isValid) {
  throw new SecurityError('Invalid file path');
}
```

#### URL Validation

```typescript
// Validate URLs to prevent SSRF attacks
const url = req.body.apiUrl;
const urlResult = InputValidator.validateURL(url, ['http', 'https']);

if (!urlResult.isValid) {
  throw new SecurityError('Invalid or dangerous URL');
}
```

#### Configuration for Different Contexts

```typescript
// Strict validation for CI environments
const strictConfig = {
  maxInputLength: 1000,
  enableRateLimit: true,
  enableContentScanning: true,
  sanitizeHTML: true
};

// Relaxed validation for development
const devConfig = {
  maxInputLength: 50000,
  enableRateLimit: false,
  enableContentScanning: false,
  sanitizeHTML: false
};

const result = InputValidator.validateInput(input, strictConfig);
```

### 2. Credential Manager Integration

#### Initialization

```typescript
import { CredentialManager } from '../security/credential-manager';

// Initialize with default configuration
const credentialManager = new CredentialManager({
  storagePath: '~/.prp/credentials.enc',
  enableAutoRotation: true,
  rotationDays: 90,
  enableAccessLogging: true
});

// Initialize the manager
await credentialManager.initialize();
```

#### Storing Credentials

```typescript
// Store a new credential
const credentialId = await credentialManager.storeCredential({
  name: 'GitHub Token',
  value: 'ghp_xxxxxxxxxxxxxxxxxxxx',
  type: 'token',
  description: 'GitHub personal access token',
  tags: ['github', 'api'],
  expiresAt: new Date('2024-12-31')
});
```

#### Retrieving Credentials

```typescript
// Retrieve a credential by ID
const credential = await credentialManager.getCredential(credentialId);
if (credential) {
  console.log('Retrieved:', credential.name);
  console.log('Type:', credential.type);
  // Use credential.value (only when needed)
}
```

#### Listing Credentials

```typescript
// List all credentials (metadata only, no values)
const credentials = await credentialManager.listCredentials();
credentials.forEach(cred => {
  console.log(`${cred.name} (${cred.type}) - Created: ${cred.createdAt}`);
});
```

#### Searching Credentials

```typescript
// Search for specific credentials
const apiCredentials = await credentialManager.searchCredentials({
  type: 'api_key',
  tags: ['production']
});
```

### 3. Integration with CLI Commands

#### Update CLI Command Handlers

```typescript
// Example: Update init command
import { InputValidator } from '../security/input-validator';
import { CredentialManager } from '../security/credential-manager';

export async function handleInitCommand(options: InitOptions) {
  // Validate project name
  const nameResult = InputValidator.validateInput(options.name || '');
  if (!nameResult.isValid) {
    throw new Error(`Invalid project name: ${nameResult.error}`);
  }

  // Validate template
  if (options.template) {
    const templateResult = InputValidator.validateInput(options.template, {
      maxInputLength: 50,
      allowedChars: /^[a-z0-9-]+$/
    });
    if (!templateResult.isValid) {
      throw new Error(`Invalid template: ${templateResult.error}`);
    }
  }

  // Securely handle API token if provided
  if (options.githubToken) {
    const credentialManager = new CredentialManager();
    await credentialManager.initialize();

    await credentialManager.storeCredential({
      name: 'GitHub CLI Token',
      value: options.githubToken,
      type: 'token',
      tags: ['github', 'cli']
    });
  }

  // Continue with init logic...
}
```

#### Update Configuration Manager

```typescript
// Enhanced configuration loading with security validation
import { InputValidator } from '../security/input-validator';

export class ConfigurationManager {
  async loadConfig(configPath?: string): Promise<PRPConfig> {
    const configData = await this.readConfigFile(configPath);

    // Validate configuration object
    const validationResult = InputValidator.validateJSON(JSON.stringify(configData));
    if (!validationResult.isValid) {
      throw new Error(`Invalid configuration: ${validationResult.error}`);
    }

    // Validate specific fields
    if (configData.project?.name) {
      const nameResult = InputValidator.validateInput(configData.project.name);
      if (!nameResult.isValid) {
        throw new Error(`Invalid project name: ${nameResult.error}`);
      }
      configData.project.name = nameResult.sanitized;
    }

    return configData;
  }
}
```

### 4. Middleware Integration

#### Express.js Middleware

```typescript
// Security middleware for web interfaces
import { InputValidator } from '../security/input-validator';

export function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  // Validate query parameters
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      const result = InputValidator.validateInput(value);
      if (!result.isValid) {
        return res.status(400).json({ error: `Invalid ${key}: ${result.error}` });
      }
      req.query[key] = result.sanitized;
    }
  }

  // Validate request body for JSON endpoints
  if (req.is('json') && req.body) {
    const validationResult = InputValidator.validateJSON(JSON.stringify(req.body));
    if (!validationResult.isValid) {
      return res.status(400).json({ error: `Invalid request body: ${validationResult.error}` });
    }
  }

  next();
}
```

### 5. Environment Variable Security

#### Secure Environment Variables

```typescript
// Secure environment variable handling
import { InputValidator } from '../security/input-validator';

export function getSecureEnvVar(name: string, required = true): string {
  const value = process.env[name];

  if (!value && required) {
    throw new Error(`Required environment variable ${name} is not set`);
  }

  if (value) {
    const result = InputValidator.validateInput(value);
    if (!result.isValid) {
      throw new Error(`Invalid environment variable ${name}: ${result.error}`);
    }
    return result.sanitized;
  }

  return '';
}

// Usage in application
const githubToken = getSecureEnvVar('GITHUB_TOKEN');
const apiUrl = getSecureEnvVar('API_URL');
```

## 🧪 Testing Integration

### Add Security Tests to Existing Test Suites

```typescript
// Example: Enhance existing CLI tests
describe('CLI Security Tests', () => {
  test('should validate project names', () => {
    const maliciousNames = [
      '../../../etc/passwd',
      '<script>alert("xss")</script>',
      'rm -rf /; echo "clean"'
    ];

    maliciousNames.forEach(name => {
      const result = InputValidator.validateInput(name);
      expect(result.isValid).toBe(false);
    });
  });

  test('should handle secure credential operations', async () => {
    const credentialManager = new CredentialManager({
      storagePath: '/tmp/test-credentials.enc'
    });

    await credentialManager.initialize();

    const id = await credentialManager.storeCredential({
      name: 'Test Token',
      value: 'test-secret-value',
      type: 'token'
    });

    const retrieved = await credentialManager.getCredential(id);
    expect(retrieved).toBeTruthy();
    expect(retrieved!.value).toBe('test-secret-value');
  });
});
```

### Security Test Configuration

```typescript
// jest.config.js - Add security test configuration
module.exports = {
  // ... existing config
  setupFilesAfterEnv: ['<rootDir>/src/security/__tests__/setup.ts'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/security/**/*.test.ts'
  ],
  collectCoverageFrom: [
    'src/security/**/*.ts',
    '!src/security/**/*.test.ts'
  ]
};
```

## 📦 Package.json Updates

Add security-related dependencies:

```json
{
  "dependencies": {
    "crypto": "^1.0.1"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "jest": "^29.0.0"
  },
  "scripts": {
    "test:security": "jest src/security/__tests__",
    "audit:security": "npm audit && npm audit fix",
    "lint:security": "eslint src --ext .ts --rule 'security/*: error'"
  }
}
```

## 🔒 Security Best Practices for Development

### 1. Code Review Checklist

- [ ] All user inputs are validated using InputValidator
- [ ] File paths are validated against traversal attacks
- [ ] URLs are validated against SSRF attacks
- [ ] Credentials are stored using CredentialManager
- [ ] Error messages don't leak sensitive information
- [ ] Logging doesn't include sensitive data
- [ ] Environment variables are validated

### 2. Development Guidelines

```typescript
// Do: Use secure validation
const result = InputValidator.validateInput(userInput);
if (!result.isValid) {
  throw new SecurityError(result.error);
}
const safeInput = result.sanitized;

// Don't: Use user input directly
const dangerous = eval(userInput); // NEVER DO THIS

// Do: Use secure credential storage
await credentialManager.storeCredential({
  name: 'API Key',
  value: apiKey,
  type: 'api_key'
});

// Don't: Store credentials in plain text
fs.writeFileSync('secrets.txt', apiKey); // NEVER DO THIS
```

### 3. Security Headers for Web Interfaces

```typescript
// Add security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## 🚨 Error Handling

### Secure Error Responses

```typescript
// Don't leak sensitive information in errors
export class SecurityError extends Error {
  constructor(message: string, public details?: string) {
    super(message);
    this.name = 'SecurityError';
  }

  toJSON() {
    // Only expose safe information
    return {
      name: this.name,
      message: this.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Usage
try {
  const result = InputValidator.validateInput(maliciousInput);
  if (!result.isValid) {
    throw new SecurityError('Invalid input provided');
  }
} catch (error) {
  // Log full error for debugging
  logger.error('Security validation failed', error);

  // Return safe error to user
  res.status(400).json({
    error: 'Invalid request data',
    requestId: req.id
  });
}
```

## 📊 Monitoring and Logging

### Security Event Logging

```typescript
// Security event logger
export class SecurityLogger {
  static logValidationFailure(input: string, reason: string, context: any) {
    logger.warn('Security validation failed', {
      input: this.maskSensitiveData(input),
      reason,
      context: this.sanitizeContext(context),
      timestamp: new Date().toISOString(),
      severity: 'warning'
    });
  }

  static logCredentialAccess(credentialId: string, userId: string, success: boolean) {
    logger.info('Credential access attempt', {
      credentialId: this.maskId(credentialId),
      userId,
      success,
      timestamp: new Date().toISOString()
    });
  }

  private static maskSensitiveData(data: string): string {
    return data.length > 10 ?
      data.substring(0, 3) + '***' + data.substring(data.length - 3) :
      '***';
  }

  private static maskId(id: string): string {
    return id.substring(0, 8) + '***';
  }
}
```

## 🔄 Migration Guide

### Migrating Existing Code

1. **Replace Basic Validation**:
   ```typescript
   // Before
   if (!name || name.length > 50) {
     throw new Error('Invalid name');
   }

   // After
   const result = InputValidator.validateInput(name, { maxInputLength: 50 });
   if (!result.isValid) {
     throw new Error(`Invalid name: ${result.error}`);
   }
   ```

2. **Replace Plain Text Credential Storage**:
   ```typescript
   // Before
   fs.writeFileSync('.env', `API_KEY=${apiKey}`);

   // After
   await credentialManager.storeCredential({
     name: 'API Key',
     value: apiKey,
     type: 'api_key'
   });
   ```

3. **Add Input Validation to All Endpoints**:
   ```typescript
   // Add to all user input handling
   const result = InputValidator.validateInput(req.body.data);
   if (!result.isValid) {
     return res.status(400).json({ error: result.error });
   }
   ```

## 📞 Support

For questions about security module integration:

1. Check this documentation first
2. Review the test files for usage examples
3. Create an issue in the repository
4. Contact the security team for sensitive matters

---

**Last Updated**: 2025-11-05
**Version**: 1.0.0
**Maintainer**: Robo-Developer (Security Specialist)