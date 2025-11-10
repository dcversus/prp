/**
 * Unit Tests for InitGenerationService
 */

import { InitGenerationService, GenerationRequest } from '../../../../src/shared/services/init-generation-service';
import { promises as fs } from 'fs';
import * as path from 'path';

// Mock the logger
jest.mock('../../../../src/shared/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

// Mock PathResolver
jest.mock('../../../../src/shared/path-resolver', () => ({
  PathResolver: {
    getPackageRoot: jest.fn().mockReturnValue('/mock/package/root')
  }
}));

describe('InitGenerationService', () => {
  let service: InitGenerationService;

  beforeEach(() => {
    service = new InitGenerationService();
  });

  describe('generateGovernanceFiles', () => {
    it('should generate governance files for a basic project', async () => {
      const request: GenerationRequest = {
        projectName: 'test-project',
        projectDescription: 'A test project',
        author: 'Test Author',
        projectPath: '/tmp/test-project',
        template: 'typescript',
        prompt: 'Create a TypeScript project'
      };

      // Mock file system operations
      const mockReadFile = jest.spyOn(fs, 'readFile').mockResolvedValue('# AGENTS.md Mock Content');
      const mockWriteFile = jest.spyOn(fs, 'writeFile').mockResolvedValue();

      const result = await service.generateGovernanceFiles(request);

      expect(result).toBeDefined();
      expect(result.agentsMd).toBeDefined();
      expect(typeof result.agentsMd).toBe('string');
      expect(result.agentsMd).toContain('test-project');

      mockReadFile.mockRestore();
      mockWriteFile.mockRestore();
    });

    it('should handle project with minimal information', async () => {
      const request: GenerationRequest = {
        projectName: 'minimal-project',
        projectPath: '/tmp/minimal-project'
      };

      // Mock file system operations
      const mockReadFile = jest.spyOn(fs, 'readFile').mockResolvedValue('# AGENTS.md Mock Content');
      const mockWriteFile = jest.spyOn(fs, 'writeFile').mockResolvedValue();

      const result = await service.generateGovernanceFiles(request);

      expect(result).toBeDefined();
      expect(result.agentsMd).toBeDefined();
      expect(result.agentsMd).toContain('minimal-project');

      mockReadFile.mockRestore();
      mockWriteFile.mockRestore();
    });

    it('should generate different content for different templates', async () => {
      const request1: GenerationRequest = {
        projectName: 'react-project',
        projectPath: '/tmp/react-project',
        template: 'react'
      };

      const request2: GenerationRequest = {
        projectName: 'fastapi-project',
        projectPath: '/tmp/fastapi-project',
        template: 'fastapi'
      };

      // Mock file system operations
      const mockReadFile = jest.spyOn(fs, 'readFile').mockResolvedValue('# AGENTS.md Mock Content');
      const mockWriteFile = jest.spyOn(fs, 'writeFile').mockResolvedValue();

      const result1 = await service.generateGovernanceFiles(request1);
      const result2 = await service.generateGovernanceFiles(request2);

      expect(result1.agentsMd).toContain('react-project');
      expect(result2.agentsMd).toContain('fastapi-project');
      // The content should be different due to template differences
      expect(result1.agentsMd).not.toBe(result2.agentsMd);

      mockReadFile.mockRestore();
      mockWriteFile.mockRestore();
    });

    it('should include project-specific information in AGENTS.md', async () => {
      const request: GenerationRequest = {
        projectName: 'custom-project',
        projectDescription: 'A custom project with specific requirements',
        author: 'Custom Author',
        projectPath: '/tmp/custom-project',
        prompt: 'Create a project with custom configuration and advanced features'
      };

      // Mock file system operations
      const mockReadFile = jest.spyOn(fs, 'readFile').mockResolvedValue('# AGENTS.md Mock Content');
      const mockWriteFile = jest.spyOn(fs, 'writeFile').mockResolvedValue();

      const result = await service.generateGovernanceFiles(request);

      expect(result.agentsMd).toContain('custom-project');
      expect(result.agentsMd).toContain('Custom Author');
      expect(result.agentsMd).toContain('A custom project with specific requirements');

      mockReadFile.mockRestore();
      mockWriteFile.mockRestore();
    });

    it('should handle errors gracefully when AGENTS.md template is missing', async () => {
      const request: GenerationRequest = {
        projectName: 'error-project',
        projectPath: '/tmp/error-project'
      };

      // Mock file system to throw an error
      const mockReadFile = jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('File not found'));
      const mockWriteFile = jest.spyOn(fs, 'writeFile').mockResolvedValue();

      // The service should still generate some content even if template is missing
      const result = await service.generateGovernanceFiles(request);

      expect(result).toBeDefined();
      expect(result.agentsMd).toBeDefined();
      // Should contain fallback content
      expect(typeof result.agentsMd).toBe('string');

      mockReadFile.mockRestore();
      mockWriteFile.mockRestore();
    });
  });

  describe('generateAgentsMd', () => {
    it('should generate personalized AGENTS.md content', async () => {
      // Mock file system operations
      const mockReadFile = jest.spyOn(fs, 'readFile').mockResolvedValue('# AGENTS.md Mock Template\n\n## Default Content');
      const mockWriteFile = jest.spyOn(fs, 'writeFile').mockResolvedValue();

      const result = await service.generateAgentsMd(
        'test-project',
        'Test Description',
        'Test Author',
        'typescript'
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('test-project');
      expect(result).toContain('Test Description');
      expect(result).toContain('Test Author');

      mockReadFile.mockRestore();
      mockWriteFile.mockRestore();
    });

    it('should handle missing optional parameters', async () => {
      // Mock file system operations
      const mockReadFile = jest.spyOn(fs, 'readFile').mockResolvedValue('# AGENTS.md Mock Template');
      const mockWriteFile = jest.spyOn(fs, 'writeFile').mockResolvedValue();

      const result = await service.generateAgentsMd('simple-project');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('simple-project');

      mockReadFile.mockRestore();
      mockWriteFile.mockRestore();
    });
  });

  describe('generateReadmeMd', () => {
    it('should generate README.md content', async () => {
      // Mock file system operations
      const mockWriteFile = jest.spyOn(fs, 'writeFile').mockResolvedValue();

      const result = await service.generateReadmeMd(
        'test-project',
        'Test Description',
        'Test Author',
        'typescript'
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('test-project');
      expect(result).toContain('Test Description');

      mockWriteFile.mockRestore();
    });

    it('should handle missing optional parameters', async () => {
      // Mock file system operations
      const mockWriteFile = jest.spyOn(fs, 'writeFile').mockResolvedValue();

      const result = await service.generateReadmeMd('simple-project');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('simple-project');

      mockWriteFile.mockRestore();
    });
  });

  describe('generateInitialPrp', () => {
    it('should generate initial PRP content', async () => {
      // Mock file system operations
      const mockWriteFile = jest.spyOn(fs, 'writeFile').mockResolvedValue();

      const result = await service.generateInitialPrp(
        'test-project',
        'Test Description',
        'Test Author',
        'typescript',
        'Create a TypeScript project with testing setup'
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('test-project');

      mockWriteFile.mockRestore();
    });

    it('should handle missing optional parameters', async () => {
      // Mock file system operations
      const mockWriteFile = jest.spyOn(fs, 'writeFile').mockResolvedValue();

      const result = await service.generateInitialPrp('simple-project');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('simple-project');

      mockWriteFile.mockRestore();
    });
  });
});