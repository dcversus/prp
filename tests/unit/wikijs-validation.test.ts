/**
 * Wiki.js Content Validation Tests
 * Tests frontmatter schema, content quality, and link validation
 */

import { readFileSync, existsSync } from 'fs-extra';
import { join } from 'path';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { execSync } from 'child_process';

describe('Wiki.js Content Validation', () => {
  const testProjectPath = join(process.cwd(), 'tmp', 'wikijs-validation-test');
  const testProjectName = 'wikijs-validation-test';

  beforeAll(() => {
    // Clean up any existing test project
    if (existsSync(testProjectPath)) {
      execSync(`rm -rf ${testProjectPath}`, { stdio: 'inherit' });
    }

    // Ensure tmp directory exists
    const tmpDir = join(process.cwd(), 'tmp');
    if (!existsSync(tmpDir)) {
      execSync(`mkdir -p ${tmpDir}`, { stdio: 'inherit' });
    }

    // Generate test project using CLI
    execSync(
      `npx tsx ${join(process.cwd(), 'src/cli.ts')} init ${testProjectName} --template wikijs --no-interactive --yes --no-git --no-install`,
      {
        stdio: 'inherit',
        cwd: join(process.cwd(), 'tmp')
      }
    );
  });

  afterAll(() => {
    // Clean up test project
    if (existsSync(testProjectPath)) {
      execSync(`rm -rf ${testProjectPath}`, { stdio: 'inherit' });
    }
  });

  // Helper function to extract frontmatter from markdown content
  function extractFrontmatter(content: string): Record<string, any> {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      throw new Error('No frontmatter found');
    }

    const frontmatter = frontmatterMatch[1];
    const result: Record<string, any> = {};

    frontmatter.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value: any = line.substring(colonIndex + 1).trim();

        // Parse different value types
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (value.startsWith('[') && value.endsWith(']')) {
          // Parse array
          value = value.slice(1, -1).split(',').map((item: string) => item.trim().replace(/['"]/g, ''));
        } else if (value.startsWith('"') && value.endsWith('"')) {
          // Remove quotes from string values
          value = value.slice(1, -1);
        }

        result[key] = value;
      }
    });

    return result;
  }

  // Helper function to count words in content (excluding frontmatter)
  function countWords(content: string): number {
    const mainContent = content.replace(/^---\n[\s\S]*?\n---\n/, '');
    return mainContent.split(/\s+/).filter(word => word.length > 0).length;
  }

  // Helper function to extract headings
  function extractHeadings(content: string): string[] {
    const headings = content.match(/^#{1,6}\s+.+$/gm) ?? [];
    return headings;
  }

  describe('Frontmatter Schema Validation', () => {
    it('should validate article frontmatter schema', () => {
      const articles = [
        '00-welcome.md',
        '01-what-is-prp.md',
        '10-prp-overview.md',
        '11-signal-system.md',
        '31-writing-articles.md'
      ];

      articles.forEach(article => {
        const content = readFileSync(join(testProjectPath, 'docs', article), 'utf-8');
        const frontmatter = extractFrontmatter(content);

        // Required fields
        expect(frontmatter).toHaveProperty('title');
        expect(frontmatter).toHaveProperty('description');
        expect(frontmatter).toHaveProperty('published');
        expect(frontmatter).toHaveProperty('date');
        expect(frontmatter).toHaveProperty('tags');
        expect(frontmatter).toHaveProperty('editor');

        // Field type validation
        expect(typeof frontmatter.title).toBe('string');
        expect(typeof frontmatter.description).toBe('string');
        expect(typeof frontmatter.published).toBe('boolean');
        expect(frontmatter.published).toBe(true);
        expect(typeof frontmatter.date).toBe('string');
        expect(Array.isArray(frontmatter.tags)).toBe(true);
        expect(typeof frontmatter.editor).toBe('string');
        expect(frontmatter.editor).toBe('markdown');

        // Date format validation (ISO 8601)
        expect(frontmatter.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);

        // Tags array validation
        expect(frontmatter.tags.length).toBeGreaterThan(0);
        frontmatter.tags.forEach((tag: string) => {
          expect(typeof tag).toBe('string');
          expect(tag.length).toBeGreaterThan(0);
        });
      });
    });

    it('should validate tag consistency', () => {
      const content = readFileSync(join(testProjectPath, 'docs', '00-welcome.md'), 'utf-8');
      const frontmatter = extractFrontmatter(content);

      expect(frontmatter.tags).toContain('welcome');
      expect(frontmatter.tags).toContain('getting-started');
    });
  });

  describe('Content Quality Validation', () => {
    it('should validate minimum word count for core articles', () => {
      const coreArticles = [
        { file: '00-welcome.md', minWords: 200 },
        { file: '01-what-is-prp.md', minWords: 500 },
        { file: '10-prp-overview.md', minWords: 300 },
        { file: '11-signal-system.md', minWords: 400 },
        { file: '31-writing-articles.md', minWords: 600 }
      ];

      coreArticles.forEach(({ file, minWords }) => {
        const content = readFileSync(join(testProjectPath, 'docs', file), 'utf-8');
        const wordCount = countWords(content);

        expect(wordCount).toBeGreaterThanOrEqual(minWords);
      });
    });

    it('should validate heading structure', () => {
      const content = readFileSync(join(testProjectPath, 'docs', '01-what-is-prp.md'), 'utf-8');
      const headings = extractHeadings(content);

      // Should have H1 title
      expect(headings.some(h => h.startsWith('# '))).toBe(true);

      // Should have H2 sections
      expect(headings.some(h => h.startsWith('## '))).toBe(true);

      // Should not skip heading levels (e.g., H1 to H3 without H2)
      const levels = headings.map(h => h.match(/^(#+)/)?.[1].length).filter(Boolean);
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
      }
    });

    it('should validate fact-checking sections', () => {
      const articles = [
        '00-welcome.md',
        '01-what-is-prp.md',
        '10-prp-overview.md',
        '11-signal-system.md'
      ];

      articles.forEach(article => {
        const content = readFileSync(join(testProjectPath, 'docs', article), 'utf-8');

        // Should have fact-checking section or source information
        expect(content).toMatch(/## Fact Check|\*\*Source:\*\*/);

        // Source should be a GitHub URL if present
        if (content.includes('Source:')) {
          expect(content).toMatch(/Source:.*https:\/\/github\.com\/dcversus\/prp\/blob\/main\//);
        }
      });
    });

    it('should not contain placeholder text', () => {
      const articles = [
        '00-welcome.md',
        '01-what-is-prp.md',
        '10-prp-overview.md',
        '11-signal-system.md'
      ];

      const placeholderPatterns = [
        /\[Content continues\.\.\.\]/,
        /TODO:/,
        /PLACEHOLDER:/,
        /XXX/,
        /Coming soon/,
        /Under construction/
      ];

      articles.forEach(article => {
        const content = readFileSync(join(testProjectPath, 'docs', article), 'utf-8');

        placeholderPatterns.forEach(pattern => {
          expect(content).not.toMatch(pattern);
        });
      });
    });
  });

  describe('Link Validation', () => {
    it('should validate internal links', () => {
      const welcomeContent = readFileSync(join(testProjectPath, 'docs', '00-welcome.md'), 'utf-8');

      // Extract all markdown links
      const linkPattern = /\]\(([^)]+)\)/g;
      const links = Array.from(welcomeContent.matchAll(linkPattern), match => match[1]);

      // Should have internal links to other articles
      const internalLinks = links.filter(link => link.endsWith('.md'));
      expect(internalLinks.length).toBeGreaterThan(0);

      // Verify linked files exist
      internalLinks.forEach(link => {
        const filePath = join(testProjectPath, 'docs', link);
        expect(existsSync(filePath)).toBe(true);
      });
    });

    it('should validate external link formats', () => {
      const content = readFileSync(join(testProjectPath, 'docs', '01-what-is-prp.md'), 'utf-8');

      // Extract external links
      const externalLinkPattern = /\]\((https?:\/\/[^)]+)\)/g;
      const externalLinks = Array.from(content.matchAll(externalLinkPattern), match => match[1]);

      externalLinks.forEach(link => {
        // Should be valid URLs
        expect(link).toMatch(/^https?:\/\//);
        expect(link).not.toContain(' ');
        expect(link.length).toBeGreaterThan(10);
      });
    });

    it('should validate anchor links', () => {
      const content = readFileSync(join(testProjectPath, 'docs', '10-prp-overview.md'), 'utf-8');

      // Extract anchor links
      const anchorLinkPattern = /\]\((#[^)]+)\)/g;
      const anchorLinks = Array.from(content.matchAll(anchorLinkPattern), match => match[1]);

      anchorLinks.forEach(anchor => {
        // Note: This is a basic check - in a real implementation, you'd want more sophisticated anchor matching
        expect(anchor.length).toBeGreaterThan(1);
        expect(anchor).toMatch(/^#[a-z0-9-]+$/);
      });
    });
  });

  describe('Markdown Syntax Validation', () => {
    it('should validate proper markdown formatting', () => {
      const content = readFileSync(join(testProjectPath, 'docs', '00-welcome.md'), 'utf-8');

      // Should have proper list formatting
      if (content.includes('- ')) {
        expect(content).toMatch(/^- .+$/m);
      }

      // Should have proper code block formatting if present
      if (content.includes('```')) {
        expect(content).toMatch(/```[\w]*\n[\s\S]*?```/);
      }

      // Should not have malformed emphasis
      expect(content).not.toMatch(/\*\s*\*/); // ** with space in between
      expect(content).not.toMatch(/_\s*_/); // __ with space in between
    });

    it('should validate table formatting if present', () => {
      const content = readFileSync(join(testProjectPath, 'docs', '11-signal-system.md'), 'utf-8');

      if (content.includes('|')) {
        // Should have proper table header separator
        expect(content).toMatch(/\|[\s-|]+\|/);

        // Should have consistent column counts
        const lines = content.split('\n').filter(line => line.includes('|'));
        if (lines.length > 0) {
          const columnCounts = lines.map(line => (line.match(/\|/g) ?? []).length + 1);
          const firstColumnCount = columnCounts[0];

          columnCounts.forEach(count => {
            expect(count).toBe(firstColumnCount);
          });
        }
      }
    });
  });

  describe('Code Example Validation', () => {
    it('should validate code block syntax', () => {
      const content = readFileSync(join(testProjectPath, 'docs', '21-prp-cli-usage.md'), 'utf-8');

      // Extract code blocks
      const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
      const codeBlocks = Array.from(content.matchAll(codeBlockPattern));

      codeBlocks.forEach(([, language, code]) => {
        // Language should be specified for better rendering
        expect(language).toBeTruthy();
        expect(typeof language).toBe('string');

        // Code should not be empty
        expect(code.trim().length).toBeGreaterThan(0);

        // Common validation for shell/bash commands
        if (['bash', 'shell', 'sh'].includes(language)) {
          expect(code).not.toContain('rm -rf /'); // Safety check
        }
      });
    });
  });

  describe('Image Validation', () => {
    it('should validate image alt text', () => {
      const articles = ['00-welcome.md', '01-what-is-prp.md'];

      articles.forEach(article => {
        const content = readFileSync(join(testProjectPath, 'docs', article), 'utf-8');

        // Extract images
        const imagePattern = /!\[([^\]]*)\]\([^)]+\)/g;
        const images = Array.from(content.matchAll(imagePattern));

        images.forEach(([, altText]) => {
          // All images should have alt text
          expect(altText.trim().length).toBeGreaterThan(0);
        });
      });
    });
  });
});