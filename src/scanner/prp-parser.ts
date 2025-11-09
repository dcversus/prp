import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { createLayerLogger } from '../shared/logger.js';

const logger = createLayerLogger('scanner');

/**
 * PRP Parser - handles discovery and parsing of Product Requirement Prompts
 */
export interface PRPFile {
  path: string;
  name: string;
  content: string;
  lastModified: Date;
  size: number;
  metadata: PRPMetadata;
}

export interface PRPMetadata {
  title: string;
  status: 'planning' | 'active' | 'testing' | 'review' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedAgent?: string;
  signals: DetectedSignal[];
  requirements: Requirement[];
  acceptanceCriteria: AcceptanceCriterion[];
  lastUpdated: Date;
  estimatedTokens: number;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  assignedTo?: string;
  estimatedTokens: number;
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  status: 'pending' | 'passed' | 'failed';
  testEvidence?: string;
}

export interface DetectedSignal {
  pattern: string;
  type: string;
  content: string;
  line: number;
  column: number;
  context: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

/**
 * PRP Parser class
 */
export class PRPParser {
  private readonly PRP_PATTERNS = [
    /^PRPs\/.*\.md$/,
    /^PRP-.*\.md$/,
    /.*-prp-.*\.md$/,
    /.*prp.*\.md$/i
  ];

  private readonly SIGNAL_PATTERN = /^\[([A-Za-z]{2})\]\s*(.*)$/;

  /**
   * Discover PRP files in a directory
   */
  async discoverPRPFiles(rootDir: string): Promise<string[]> {
    const prpFiles: string[] = [];

    try {
      this.scanDirectory(rootDir, prpFiles);
    } catch (error) {
      logger.error('PRPParser', `Error scanning directory ${rootDir}`, error as Error);
    }

    return prpFiles;
  }

  /**
   * Parse a PRP file and extract metadata
   */
  async parsePRPFile(filePath: string): Promise<PRPFile | null> {
    try {
      if (!existsSync(filePath)) {
        return null;
      }

      const content = readFileSync(filePath, 'utf8');
      const stats = statSync(filePath);

      return {
        path: filePath,
        name: this.extractPRPName(filePath),
        content,
        lastModified: stats.mtime,
        size: stats.size,
        metadata: this.extractMetadata(content)
      };
    } catch (error) {
      logger.error('PRPParser', `Error parsing PRP file ${filePath}`, error as Error);
      return null;
    }
  }

  /**
   * Check if a file is a PRP file
   */
  isPRPFile(filePath: string): boolean {
    return this.PRP_PATTERNS.some(pattern => pattern.test(filePath));
  }

  /**
   * Extract signals from PRP content
   */
  extractSignals(content: string): DetectedSignal[] {
    const signals: DetectedSignal[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const match = line.match(this.SIGNAL_PATTERN);
      if (match) {
        const [, signalType, signalContent] = match;

        signals.push({
          pattern: match[0],
          type: signalType ?? '',
          content: (signalContent ?? '').trim(),
          line: index + 1,
          column: 0,
          context: this.getContext(lines, index),
          priority: this.determineSignalPriority(signalType ?? '')
        });
      }
    });

    return signals;
  }

  /**
   * Recursively scan directory for PRP files
   */
  private scanDirectory(dir: string, prpFiles: string[]): void {
    try {
      const items = readdirSync(dir);

      for (const item of items) {
        const fullPath = join(dir, item);
        const stats = statSync(fullPath);

        if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          this.scanDirectory(fullPath, prpFiles);
        } else if (stats.isFile() && this.isPRPFile(fullPath)) {
          prpFiles.push(fullPath);
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  /**
   * Extract PRP name from file path
   */
  private extractPRPName(filePath: string): string {
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];
    return (fileName ?? '').replace('.md', '');
  }

  /**
   * Extract metadata from PRP content
   */
  private extractMetadata(content: string): PRPMetadata {
    const lines = content.split('\n');
    const metadata: PRPMetadata = {
      title: this.extractTitle(lines),
      status: this.extractStatus(lines),
      priority: this.extractPriority(lines),
      signals: this.extractSignals(content),
      requirements: this.extractRequirements(lines),
      acceptanceCriteria: this.extractAcceptanceCriteria(lines),
      lastUpdated: new Date(),
      estimatedTokens: this.estimateTokens(content)
    };

    return metadata;
  }

  /**
   * Extract title from PRP content
   */
  private extractTitle(lines: string[]): string {
    for (const line of lines) {
      if (line.startsWith('# ')) {
        return line.substring(2).trim();
      }
    }
    return 'Untitled PRP';
  }

  /**
   * Extract status from PRP content
   */
  private extractStatus(lines: string[]): PRPMetadata['status'] {
    const content = lines.join(' ').toLowerCase();

    if (content.includes('status: planning') || content.includes('## planning')) {
      return 'planning';
    } else if (content.includes('status: active') || content.includes('## active')) {
      return 'active';
    } else if (content.includes('status: testing') || content.includes('## testing')) {
      return 'testing';
    } else if (content.includes('status: review') || content.includes('## review')) {
      return 'review';
    } else if (content.includes('status: completed') || content.includes('## completed')) {
      return 'completed';
    } else if (content.includes('status: blocked') || content.includes('## blocked')) {
      return 'blocked';
    }

    return 'planning';
  }

  /**
   * Extract priority from PRP content
   */
  private extractPriority(lines: string[]): PRPMetadata['priority'] {
    const content = lines.join(' ').toLowerCase();

    if (content.includes('priority: critical') || content.includes('## critical')) {
      return 'critical';
    } else if (content.includes('priority: high') || content.includes('## high')) {
      return 'high';
    } else if (content.includes('priority: medium') || content.includes('## medium')) {
      return 'medium';
    } else if (content.includes('priority: low') || content.includes('## low')) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Extract requirements from PRP content
   */
  private extractRequirements(lines: string[]): Requirement[] {
    const requirements: Requirement[] = [];
    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = (lines[i] ?? '').trim();

      if (line.startsWith('##')) {
        currentSection = line.toLowerCase();
        continue;
      }

      if (currentSection.includes('requirement') && (line.startsWith('-') || line.match(/^\d+\./))) {
        const reqMatch = line.match(/^[-\d.]+\s*(.+)$/);
        if (reqMatch) {
          requirements.push({
            id: `REQ-${requirements.length + 1}`,
            title: (reqMatch[1] ?? '').trim(),
            description: (reqMatch[1] ?? '').trim(),
            status: 'pending',
            estimatedTokens: Math.ceil((reqMatch[1] ?? '').length / 4)
          });
        }
      }
    }

    return requirements;
  }

  /**
   * Extract acceptance criteria from PRP content
   */
  private extractAcceptanceCriteria(lines: string[]): AcceptanceCriterion[] {
    const criteria: AcceptanceCriterion[] = [];
    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = (lines[i] ?? '').trim();

      if (line.startsWith('##')) {
        currentSection = line.toLowerCase();
        continue;
      }

      if (currentSection.includes('acceptance') && (line.startsWith('-') || line.match(/^\d+\./))) {
        criteria.push({
          id: `AC-${criteria.length + 1}`,
          description: line.replace(/^[-\d.]+\s*/, '').trim(),
          status: 'pending'
        });
      }
    }

    return criteria;
  }

  /**
   * Get context around a signal
   */
  private getContext(lines: string[], lineIndex: number, contextLines: number = 3): string {
    const start = Math.max(0, lineIndex - contextLines);
    const end = Math.min(lines.length, lineIndex + contextLines + 1);
    return lines.slice(start, end).join('\n');
  }

  /**
   * Determine signal priority based on type
   */
  private determineSignalPriority(signalType: string): DetectedSignal['priority'] {
    const criticalSignals = ['AE', 'AA', 'OE', 'OA'];
    const highSignals = ['Bb', 'OC', 'OD', 'AD'];
    const mediumSignals = ['af', 'ap', 'op', 'oa'];

    if (criticalSignals.includes(signalType)) return 'critical';
    if (highSignals.includes(signalType)) return 'high';
    if (mediumSignals.includes(signalType)) return 'medium';
    return 'low';
  }

  /**
   * Estimate token count for content
   */
  private estimateTokens(content: string): number {
    // Rough estimation: ~1 token per 4 characters
    return Math.ceil(content.length / 4);
  }
}