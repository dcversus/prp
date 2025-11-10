/**
 * Unit Tests for InputValidator
 */

import { InputValidator } from '../../../../src/shared/security/input-validator';

describe('InputValidator', () => {
  describe('validateInput', () => {
    it('should accept valid string input', () => {
      const result = InputValidator.validateInput('Hello, World!');

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Hello, World!');
      expect(result.error).toBeUndefined();
    });

    it('should accept valid numeric input as string', () => {
      const result = InputValidator.validateInput('12345');

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('12345');
    });

    it('should reject input with script tags', () => {
      const result = InputValidator.validateInput('<script>alert("xss")</script>');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('HTML tags');
    });

    it('should reject input with javascript protocol', () => {
      const result = InputValidator.validateInput('javascript:alert("xss")');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('JavaScript protocol');
    });

    it('should reject input that is too long', () => {
      const longInput = 'a'.repeat(10001);
      const result = InputValidator.validateInput(longInput);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should handle empty string input', () => {
      const result = InputValidator.validateInput('');

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('');
    });

    it('should trim whitespace from input', () => {
      const result = InputValidator.validateInput('  Hello, World!  ');

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Hello, World!');
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        const result = InputValidator.validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe(email.toLowerCase().trim());
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user@.com',
        'user@example.',
        'user space@example.com'
      ];

      invalidEmails.forEach(email => {
        const result = InputValidator.validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid email');
      });
    });

    it('should normalize email case and trim', () => {
      const result = InputValidator.validateEmail('  Test@EXAMPLE.COM  ');

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('test@example.com');
    });
  });

  describe('validatePassword', () => {
    it('should accept strong passwords', () => {
      const strongPasswords = [
        'Password123!',
        'MySecurePass2023',
        'ComplexP@ssw0rd',
        'VeryStrongPassword123'
      ];

      strongPasswords.forEach(password => {
        const result = InputValidator.validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject passwords that are too short', () => {
      const result = InputValidator.validatePassword('short');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 8 characters');
    });

    it('should reject passwords without uppercase letters', () => {
      const result = InputValidator.validatePassword('lowercase123!');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('uppercase letters');
    });

    it('should reject passwords without lowercase letters', () => {
      const result = InputValidator.validatePassword('UPPERCASE123!');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('lowercase letters');
    });

    it('should reject passwords without numbers', () => {
      const result = InputValidator.validatePassword('NoNumbers!');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('numbers');
    });

    it('should reject passwords without special characters', () => {
      const result = InputValidator.validatePassword('NoSpecialChars123');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('special characters');
    });
  });

  describe('validateProjectName', () => {
    it('should accept valid project names', () => {
      const validNames = [
        'my-project',
        'project-name-123',
        'test_project',
        'simpleproject',
        'myproject123'
      ];

      validNames.forEach(name => {
        const result = InputValidator.validateProjectName(name);
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe(name.toLowerCase().trim());
      });
    });

    it('should reject project names that are too short', () => {
      const result = InputValidator.validateProjectName('ab');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 3 characters');
    });

    it('should reject project names that are too long', () => {
      const longName = 'a'.repeat(51);
      const result = InputValidator.validateProjectName(longName);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('no more than 50 characters');
    });

    it('should reject project names with invalid characters', () => {
      const invalidNames = [
        'my project',
        'project@name',
        'project/name',
        'project.name',
        'project*name'
      ];

      invalidNames.forEach(name => {
        const result = InputValidator.validateProjectName(name);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('alphanumeric characters, hyphens, and underscores');
      });
    });

    it('should reject project names starting with invalid characters', () => {
      const invalidStartNames = [
        '-project',
        '_project',
        '1project',
        '123project'
      ];

      invalidStartNames.forEach(name => {
        const result = InputValidator.validateProjectName(name);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('must start with a letter');
      });
    });
  });

  describe('validateUrl', () => {
    it('should accept valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://api.example.com/v1',
        'https://sub.domain.co.uk/path'
      ];

      validUrls.forEach(url => {
        const result = InputValidator.validateUrl(url);
        expect(result.isValid).toBe(true);
        expect(result.sanitized).toBe(url.trim());
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'javascript:alert("xss")',
        'http://',
        'https://',
        '//example.com'
      ];

      invalidUrls.forEach(url => {
        const result = InputValidator.validateUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid URL');
      });
    });

    it('should reject URLs without HTTPS', () => {
      const result = InputValidator.validateUrl('http://example.com');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('HTTPS');
    });
  });

  describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
      const html = '<p>This is <strong>safe</strong> HTML</p>';
      const result = InputValidator.sanitizeHtml(html);

      expect(result).toBe('<p>This is <strong>safe</strong> HTML</p>');
    });

    it('should remove script tags', () => {
      const html = '<p>Safe content</p><script>alert("xss")</script>';
      const result = InputValidator.sanitizeHtml(html);

      expect(result).toBe('<p>Safe content</p>');
    });

    it('should remove dangerous attributes', () => {
      const html = '<div onclick="alert(\'xss\')">Content</div>';
      const result = InputValidator.sanitizeHtml(html);

      expect(result).toBe('<div>Content</div>');
    });

    it('should handle empty HTML', () => {
      const result = InputValidator.sanitizeHtml('');

      expect(result).toBe('');
    });
  });

  describe('validateToken', () => {
    it('should accept valid JWT-like tokens', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      expect(() => InputValidator.validateToken(validToken)).not.toThrow();
    });

    it('should reject tokens that are too short', () => {
      const shortToken = 'short.token';

      expect(() => InputValidator.validateToken(shortToken)).toThrow('Token format is invalid');
    });

    it('should reject empty tokens', () => {
      expect(() => InputValidator.validateToken('')).toThrow('Token format is invalid');
    });
  });
});