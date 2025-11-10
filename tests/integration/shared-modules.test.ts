/**
 * Integration Tests for Shared Modules
 */

describe('Shared Modules Integration', () => {
  describe('Security Modules', () => {
    it('should import InputValidator successfully', () => {
      const { InputValidator } = require('../../src/shared/security/input-validator');

      expect(InputValidator).toBeDefined();
      expect(typeof InputValidator.validateInput).toBe('function');
      expect(typeof InputValidator.validateEmail).toBe('function');
      expect(typeof InputValidator.validatePassword).toBe('function');
    });

    it('should validate basic input with InputValidator', () => {
      const { InputValidator } = require('../../src/shared/security/input-validator');

      const result = InputValidator.validateInput('test input');

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('test input');
      expect(result.error).toBeUndefined();
    });

    it('should reject malicious input with InputValidator', () => {
      const { InputValidator } = require('../../src/shared/security/input-validator');

      const result = InputValidator.validateInput('<script>alert("xss")</script>');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Service Modules', () => {
    it('should import InitGenerationService successfully', () => {
      const { InitGenerationService } = require('../../src/shared/services/init-generation-service');

      expect(InitGenerationService).toBeDefined();
      expect(typeof InitGenerationService).toBe('function');
    });

    it('should create InitGenerationService instance', () => {
      const { InitGenerationService } = require('../../src/shared/services/init-generation-service');

      const service = new InitGenerationService();

      expect(service).toBeDefined();
      expect(typeof service.generateGovernanceFiles).toBe('function');
    });

    it('should import ScaffoldingService successfully', () => {
      const { ScaffoldingService } = require('../../src/shared/services/scaffolding-service');

      expect(ScaffoldingService).toBeDefined();
      expect(typeof ScaffoldingService).toBe('function');
    });

    it('should create ScaffoldingService instance', () => {
      const { ScaffoldingService } = require('../../src/shared/services/scaffolding-service');

      const service = new ScaffoldingService();

      expect(service).toBeDefined();
      expect(typeof service.scaffoldProject).toBe('function');
    });
  });

  describe('Schema Files', () => {
    it('should have prp-config schema file accessible', () => {
      const fs = require('fs');
      const path = require('path');

      const schemaPath = path.join(__dirname, '../../src/shared/schemas/prp-config.schema.json');

      expect(fs.existsSync(schemaPath)).toBe(true);

      const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

      expect(schemaContent).toBeDefined();
      expect(schemaContent.title).toBe('PRP Configuration Schema');
      expect(schemaContent.type).toBe('object');
    });
  });

  describe('Module Import Paths', () => {
    it('should handle relative imports correctly', () => {
      // Test that relative imports work correctly within the shared directory
      try {
        const { PathResolver } = require('../../src/shared/path-resolver');
        expect(PathResolver).toBeDefined();
      } catch (error) {
        fail('PathResolver import failed: ' + error.message);
      }
    });

    it('should handle logger imports correctly', () => {
      try {
        const { Logger } = require('../../src/shared/logger');
        expect(Logger).toBeDefined();
        expect(typeof Logger).toBe('function');
      } catch (error) {
        fail('Logger import failed: ' + error.message);
      }
    });
  });
});