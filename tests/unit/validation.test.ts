import { validationUtils } from '../../src/utils/validation';

describe('Validation Utils', () => {
  describe('validateProjectName', () => {
    it('should accept valid project names', () => {
      expect(validationUtils.validateProjectName('my-project').valid).toBe(true);
      expect(validationUtils.validateProjectName('my_project').valid).toBe(true);
      expect(validationUtils.validateProjectName('myproject').valid).toBe(true);
      expect(validationUtils.validateProjectName('my-project-123').valid).toBe(true);
    });

    it('should reject invalid project names', () => {
      expect(validationUtils.validateProjectName('').valid).toBe(false);
      expect(validationUtils.validateProjectName('My Project').valid).toBe(false);
      expect(validationUtils.validateProjectName('my@project').valid).toBe(false);
    });

    it('should reject project names starting with hyphen or underscore', () => {
      const result1 = validationUtils.validateProjectName('-myproject');
      const result2 = validationUtils.validateProjectName('_myproject');
      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
      expect(result1.error).toBeTruthy();
      expect(result2.error).toBeTruthy();
    });

    it('should provide error messages for invalid names', () => {
      const result = validationUtils.validateProjectName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Project name is required');
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(validationUtils.validateEmail('test@example.com').valid).toBe(true);
      expect(validationUtils.validateEmail('user.name@example.com').valid).toBe(true);
      expect(validationUtils.validateEmail('user+tag@example.co.uk').valid).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validationUtils.validateEmail('invalid').valid).toBe(false);
      expect(validationUtils.validateEmail('invalid@').valid).toBe(false);
      expect(validationUtils.validateEmail('@example.com').valid).toBe(false);
      expect(validationUtils.validateEmail('').valid).toBe(false);
    });

    it('should provide error messages for invalid emails', () => {
      const result = validationUtils.validateEmail('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Email is required');
    });
  });

  describe('sanitizeProjectName', () => {
    it('should sanitize project names', () => {
      expect(validationUtils.sanitizeProjectName('My Project!')).toBe('my-project-');
      expect(validationUtils.sanitizeProjectName('Test@123')).toBe('test-123');
      expect(validationUtils.sanitizeProjectName('UPPERCASE')).toBe('uppercase');
    });

    it('should handle special characters', () => {
      expect(validationUtils.sanitizeProjectName('test & test')).toBe('test---test');
      expect(validationUtils.sanitizeProjectName('test.project')).toBe('test-project');
    });
  });
});
