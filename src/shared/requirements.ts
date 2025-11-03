/**
 * ♫ Guideline Requirement Builders for @dcversus/prp
 *
 * Utility functions for creating properly typed guideline requirements.
 */

import type { GuidelineRequirement } from './types';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as https from 'https';

/**
 * Create a feature requirement with proper typing
 */
export function createFeatureRequirement(
  name: string,
  description: string,
  required: boolean = true,
  errorMessage?: string,
  check?: () => Promise<boolean>
): GuidelineRequirement {
  return {
    type: 'feature',
    name,
    description,
    required,
    check: check || (async () => true), // Default to always true if no check provided
    errorMessage: errorMessage || `Feature "${name}" is not available`
  };
}

/**
 * Create a service requirement with proper typing
 */
export function createServiceRequirement(
  name: string,
  description: string,
  required: boolean = true,
  errorMessage?: string,
  check?: () => Promise<boolean>
): GuidelineRequirement {
  return {
    type: 'service',
    name,
    description,
    required,
    check: check || (async () => true), // Default to always true if no check provided
    errorMessage: errorMessage || `Service "${name}" is not available`
  };
}

/**
 * Create an authentication requirement with proper typing
 */
export function createAuthRequirement(
  name: string,
  description: string,
  required: boolean = true,
  errorMessage?: string,
  check?: () => Promise<boolean>
): GuidelineRequirement {
  return {
    type: 'auth',
    name,
    description,
    required,
    check: check || (async () => true), // Default to always true if no check provided
    errorMessage: errorMessage || `Authentication requirement "${name}" is not met`
  };
}

/**
 * Create a configuration requirement with proper typing
 */
export function createConfigRequirement(
  name: string,
  description: string,
  required: boolean = true,
  errorMessage?: string,
  check?: () => Promise<boolean>
): GuidelineRequirement {
  return {
    type: 'config',
    name,
    description,
    required,
    check: check || (async () => true), // Default to always true if no check provided
    errorMessage: errorMessage || `Configuration requirement "${name}" is not met`
  };
}

/**
 * Create a requirement from a command check
 */
export function createCommandCheckRequirement(
  type: 'feature' | 'service' | 'auth' | 'config',
  name: string,
  description: string,
  checkCommand: string,
  required: boolean = true,
  errorMessage?: string
): GuidelineRequirement {
  const errorMessageToUse = errorMessage || `${type} "${name}" check failed: ${checkCommand}`;

  return {
    type,
    name,
    description,
    required,
    check: async () => {
      try {
        execSync(checkCommand, { stdio: 'pipe' });
        return true;
      } catch (error) {
        return false;
      }
    },
    errorMessage: errorMessageToUse
  };
}

/**
 * Common requirement builders for typical use cases
 */
export const COMMON_REQUIREMENTS = {
  /**
   * Research tools requirement
   */
  researchTools: () => createServiceRequirement(
    'research_tools',
    'Research tools and data sources must be available',
    true,
    'Research tools not available'
  ),

  /**
   * Data analysis requirement
   */
  dataAnalysis: () => createServiceRequirement(
    'data_analysis',
    'Data analysis capabilities must be operational',
    true,
    'Data analysis tools not available'
  ),

  /**
   * Git requirement
   */
  git: () => createCommandCheckRequirement(
    'feature',
    'git',
    'Git version control must be available',
    'git --version'
  ),

  /**
   * Node.js requirement
   */
  nodejs: () => createCommandCheckRequirement(
    'feature',
    'nodejs',
    'Node.js runtime must be available',
    'node --version'
  ),

  /**
   * File system access requirement
   */
  fileSystem: () => createFeatureRequirement(
    'file_system',
    'File system read/write access must be available',
    true,
    'File system access not available',
    async () => {
      try {
        const tmpDir = join(process.cwd(), '.tmp-check');
        await fs.mkdir(tmpDir, { recursive: true });
        await fs.writeFile(join(tmpDir, 'test'), 'test');
        await fs.unlink(join(tmpDir, 'test'));
        await fs.rmdir(tmpDir);
        return true;
      } catch (error) {
        return false;
      }
    }
  ),

  /**
   * Network access requirement
   */
  networkAccess: () => createFeatureRequirement(
    'network_access',
    'Network access must be available for external operations',
    false,
    'Network access not available',
    async () => {
      try {
        return new Promise((resolve) => {
          const req = https.request('https://www.google.com', (res: { statusCode?: number }) => {
            resolve(res.statusCode === 200);
          });
          req.on('error', () => resolve(false));
          req.setTimeout(5000, () => {
            req.destroy();
            resolve(false);
          });
          req.end();
        });
      } catch (error) {
        return false;
      }
    }
  ),

  /**
   * Authentication configured requirement
   */
  authConfigured: () => createAuthRequirement(
    'authentication',
    'Authentication must be configured for agent access',
    true,
    'Authentication not configured',
    async () => {
      try {
        const configPath = join(process.cwd(), '.prprc');
        try {
          await fs.access(configPath);
          return true;
        } catch {
          return false;
        }
      } catch (error) {
        return false;
      }
    }
  )
} as const;

/**
 * Create a list of requirements from a template definition
 */
export function createRequirementsFromTemplate(
  templates: Array<{
    type: 'feature' | 'service' | 'auth' | 'config';
    name: string;
    description: string;
    required: boolean;
    checkCommand?: string;
    errorMessage?: string;
  }>
): GuidelineRequirement[] {
  return templates.map(template => {
    if (template.checkCommand) {
      return createCommandCheckRequirement(
        template.type,
        template.name,
        template.description,
        template.checkCommand,
        template.required,
        template.errorMessage
      );
    } else {
      const creator = template.type === 'feature' ? createFeatureRequirement :
                      template.type === 'service' ? createServiceRequirement :
                      template.type === 'auth' ? createAuthRequirement :
                      createConfigRequirement;

      return creator(
        template.name,
        template.description,
        template.required,
        template.errorMessage
      );
    }
  });
}