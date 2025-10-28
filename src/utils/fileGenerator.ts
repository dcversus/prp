/**
 * File generation utilities
 */

import { promises as fs } from 'fs';
import path from 'path';
import { FileToGenerate } from '../types.js';

export class FileGenerator {
  /**
   * Generate files to target directory
   */
  async generateFiles(files: FileToGenerate[], targetPath: string): Promise<void> {
    for (const file of files) {
      const filePath = path.join(targetPath, file.path);
      const dir = path.dirname(filePath);

      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(filePath, file.content, 'utf-8');

      // Set executable if needed
      if (file.executable) {
        await fs.chmod(filePath, 0o755);
      }
    }
  }

  /**
   * Check if directory exists and is empty
   */
  async isDirectoryEmpty(dirPath: string): Promise<boolean> {
    try {
      const files = await fs.readdir(dirPath);
      return files.length === 0;
    } catch {
      return true; // Directory doesn't exist, so it's "empty"
    }
  }

  /**
   * Create directory if it doesn't exist
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export const fileGenerator = new FileGenerator();
