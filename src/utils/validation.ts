/**
 * Input validation utilities
 */

export class ValidationUtils {
  /**
   * Validate project name
   */
  validateProjectName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Project name is required' };
    }

    if (!/^[a-z0-9-_]+$/i.test(name)) {
      return {
        valid: false,
        error: 'Project name can only contain letters, numbers, hyphens, and underscores',
      };
    }

    if (name.startsWith('-') || name.startsWith('_')) {
      return {
        valid: false,
        error: 'Project name cannot start with a hyphen or underscore',
      };
    }

    return { valid: true };
  }

  /**
   * Validate email address
   */
  validateEmail(email: string): { valid: boolean; error?: string } {
    if (!email || email.trim().length === 0) {
      return { valid: false, error: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  /**
   * Sanitize project name for file system
   */
  sanitizeProjectName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }
}

export const validationUtils = new ValidationUtils();
