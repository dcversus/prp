/**
 * Simple validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate project name
 */
export function validateProjectName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return {
      isValid: false,
      error: 'Project name is required'
    };
  }

  if (name.length > 100) {
    return {
      isValid: false,
      error: 'Project name must be 100 characters or less'
    };
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(name)) {
    return {
      isValid: false,
      error: 'Project name contains invalid characters'
    };
  }

  return { isValid: true };
}