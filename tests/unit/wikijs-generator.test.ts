/**
 * Unit Tests for Wiki.js Generator Functions
 * Tests individual generator functions and validation
 */

import { generateWikiJS } from '../../src/generators/wikijs.js';
import { GeneratorContext } from '../../src/types.js';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Wiki.js Generator Unit Tests', () => {
  let mockContext: GeneratorContext;

  beforeEach(() => {
    mockContext = {
      options: {
        name: 'test-wiki-project',
        description: 'Test Wiki.js Project',
        author: 'Test Author',
        email: 'test@example.com',
        telegram: '@testuser',
        license: 'MIT',
        template: 'wikijs',
        includeCodeOfConduct: true,
        includeContributing: true,
        includeCLA: false,
        includeSecurityPolicy: true,
        includeIssueTemplates: true,
        includePRTemplate: true,
        includeGitHubActions: true,
        includeEditorConfig: true,
        includeESLint: true,
        includePrettier: true,
        includeDocker: true,
      }
    };
  });

  describe('Template Generation', () => {
    it('should generate all required files', async () => {
      const files = await generateWikiJS(mockContext);

      // Should generate core configuration files
      const filePaths = files.map(f => f.path);
      expect(filePaths).toContain('config.yml');
      expect(filePaths).toContain('docker-compose.yml');
      expect(filePaths).toContain('.env.example');
      expect(filePaths).toContain('README.md');
      expect(filePaths).toContain('LICENSE');
      expect(filePaths).toContain('CONTRIBUTING.md');
      expect(filePaths).toContain('CODE_OF_CONDUCT.md');
      expect(filePaths).toContain('SECURITY.md');
      expect(filePaths).toContain('CHANGELOG.md');
      expect(filePaths).toContain('.gitignore');
    });

    it('should generate all 20 documentation articles', async () => {
      const files = await generateWikiJS(mockContext);
      const docsFiles = files.filter(f => f.path.startsWith('docs/'));

      expect(docsFiles).toHaveLength(20);

      const expectedArticles = [
        'docs/00-welcome.md',
        'docs/01-what-is-prp.md',
        'docs/02-github-registration.md',
        'docs/03-authentik-login.md',
        'docs/10-prp-overview.md',
        'docs/11-signal-system.md',
        'docs/12-context-driven-development.md',
        'docs/13-human-as-agent.md',
        'docs/20-prp-cli-installation.md',
        'docs/21-prp-cli-usage.md',
        'docs/22-prp-templates.md',
        'docs/30-how-to-contribute.md',
        'docs/31-writing-articles.md',
        'docs/32-article-fact-checking.md',
        'docs/40-wikijs-basics.md',
        'docs/41-wikijs-content-management.md',
        'docs/42-wikijs-best-practices.md',
        'docs/50-research-papers.md',
        'docs/51-external-resources.md',
        'docs/52-glossary.md'
      ];

      expectedArticles.forEach(article => {
        expect(docsFiles.some(f => f.path === article)).toBe(true);
      });
    });
  });

  describe('Docker Configuration', () => {
    it('should generate valid Docker Compose configuration', async () => {
      const files = await generateWikiJS(mockContext);
      const dockerComposeFile = files.find(f => f.path === 'docker-compose.yml');

      expect(dockerComposeFile).toBeDefined();

      const content = dockerComposeFile!.content;

      // Verify services
      expect(content).toContain('postgres:15-alpine');
      expect(content).toContain('redis:7-alpine');
      expect(content).toContain('ghcr.io/requarks/wiki:2');

      // Verify database configuration in environment
      expect(content).toContain('POSTGRES_DB: wikijs');
      expect(content).toContain('POSTGRES_USER: wikijs');
      expect(content).toContain('POSTGRES_PASSWORD: test-wiki-projectPass123');

      // Verify Wiki.js configuration
      expect(content).toContain('DB_TYPE: postgres');
      expect(content).toContain('DB_HOST: db');
      expect(content).toContain('DB_PORT: 5432');
      expect(content).toContain('DB_USER: wikijs');
      expect(content).toContain('DB_PASS: test-wiki-projectPass123');
      expect(content).toContain('DB_NAME: wikijs');

      // Verify port mapping
      expect(content).toContain('3000:3000');
    });

    it('should include volumes for data persistence', async () => {
      const files = await generateWikiJS(mockContext);
      const dockerComposeFile = files.find(f => f.path === 'docker-compose.yml');

      const content = dockerComposeFile!.content;
      expect(content).toContain('db-data:/var/lib/postgresql/data');
      expect(content).toContain('cache-data:/data');
    });
  });

  describe('Wiki.js Configuration', () => {
    it('should generate valid Wiki.js config', async () => {
      const files = await generateWikiJS(mockContext);
      const configFile = files.find(f => f.path === 'config.yml');

      expect(configFile).toBeDefined();

      const content = configFile!.content;

      // Verify basic configuration
      expect(content).toContain('title: test-wiki-project');
      expect(content).toContain('bind: 0.0.0.0');
      expect(content).toContain('port: 3000');

      // Verify database configuration
      expect(content).toContain('type: postgres');
      expect(content).toContain('host: db');
      expect(content).toContain('port: 5432');
      expect(content).toContain('db: wikijs');
      expect(content).toContain('user: wikijs');

      // Verify Redis configuration
      expect(content).toContain('host: redis');
      expect(content).toContain('port: 6379');
    });
  });

  describe('Article Frontmatter', () => {
    it('should generate valid frontmatter for all articles', async () => {
      const files = await generateWikiJS(mockContext);
      const articleFiles = files.filter(f => f.path.startsWith('docs/'));

      articleFiles.forEach(file => {
        const content = file.content;

        // Verify frontmatter structure
        expect(content).toMatch(/^---\n/);
        expect(content).toMatch(/\n---\n/);

        // Verify required fields
        expect(content).toContain('title:');
        expect(content).toContain('description:');
        expect(content).toContain('published: true');
        expect(content).toContain('date:');
        expect(content).toContain('tags:');
        expect(content).toContain('editor: markdown');
      });
    });

    it('should include proper tags in article frontmatter', async () => {
      const files = await generateWikiJS(mockContext);
      const welcomeFile = files.find(f => f.path === 'docs/00-welcome.md');

      expect(welcomeFile).toBeDefined();

      const content = welcomeFile!.content;
      expect(content).toContain('tags: [welcome, getting-started]');
    });
  });

  describe('Article Content Quality', () => {
    it('should generate substantial content for key articles', async () => {
      const files = await generateWikiJS(mockContext);
      const keyArticles = [
        'docs/00-welcome.md',
        'docs/01-what-is-prp.md',
        'docs/31-writing-articles.md',
        'docs/32-article-fact-checking.md'
      ];

      keyArticles.forEach(articlePath => {
        const file = files.find(f => f.path === articlePath);
        expect(file).toBeDefined();
        expect(file!.path).toBe(articlePath);

        const content = file!.content;
        const wordCount = content.split(/\s+/).length;

        // Should have meaningful content
        expect(wordCount).toBeGreaterThan(200);

        // Should include proper headings
        expect(content).toMatch(/^#{1,6}\s+/m);

        // Should not contain placeholder text
        expect(content).not.toContain('[Content continues...]');
        expect(content).not.toContain('TODO:');
        expect(content).not.toContain('PLACEHOLDER:');
      });
    });

    it('should include fact-checking sections in content articles', async () => {
      const files = await generateWikiJS(mockContext);

      // Check specific articles that should have fact-check sections
      const articlesWithFactChecks = [
        'docs/12-context-driven-development.md',
        'docs/31-writing-articles.md',
        'docs/32-article-fact-checking.md'
      ];

      articlesWithFactChecks.forEach(articlePath => {
        const file = files.find(f => f.path === articlePath);
        expect(file).toBeDefined();

        const content = file!.content;
        expect(content).toMatch(/## Fact Check|Fact Check:/);
        expect(content).toContain('**Source:**');
        expect(content).toContain('**Verified:**');
      });
    });

    it('should include internal links in navigation articles', async () => {
      const files = await generateWikiJS(mockContext);
      const welcomeFile = files.find(f => f.path === 'docs/00-welcome.md');

      expect(welcomeFile).toBeDefined();

      const content = welcomeFile!.content;

      // Verify internal navigation links
      expect(content).toContain('](01-what-is-prp.md)');
      expect(content).toContain('](02-github-registration.md)');
      expect(content).toContain('](03-authentik-login.md)');
      expect(content).toContain('](20-prp-cli-installation.md)');
      expect(content).toContain('](40-wikijs-basics.md)');
    });
  });

  describe('Template Customization', () => {
    it('should use project name in configurations', async () => {
      const files = await generateWikiJS(mockContext);

      const configFile = files.find(f => f.path === 'config.yml');
      const dockerFile = files.find(f => f.path === 'docker-compose.yml');

      expect(configFile!.content).toContain('title: test-wiki-project');
      expect(dockerFile!.content).toContain('POSTGRES_PASSWORD: test-wiki-projectPass123');
    });

    it('should include author information in README', async () => {
      const files = await generateWikiJS(mockContext);
      const readmeFile = files.find(f => f.path === 'README.md');

      expect(readmeFile).toBeDefined();

      const content = readmeFile!.content;
      expect(content).toContain('Test Author');
      expect(content).toContain('test@example.com');
    });
  });

  describe('Environment Configuration', () => {
    it('should generate proper environment template', async () => {
      const files = await generateWikiJS(mockContext);
      const envFile = files.find(f => f.path === '.env.example');

      expect(envFile).toBeDefined();

      const content = envFile!.content;

      // Verify required variables
      expect(content).toContain('DB_TYPE=postgres');
      expect(content).toContain('DB_HOST=db');
      expect(content).toContain('DB_PORT=5432');
      expect(content).toContain('DB_USER=wikijs');
      expect(content).toContain('DB_PASS=test-wiki-projectPass123');
      expect(content).toContain('DB_NAME=wikijs');

      // Verify Redis configuration
      expect(content).toContain('REDIS_HOST=redis');
      expect(content).toContain('REDIS_PORT=6379');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing options gracefully', async () => {
      const minimalContext = {
        options: {
          name: 'minimal-test',
          template: 'wikijs',
          includeCodeOfConduct: false,
          includeContributing: false,
          includeCLA: false,
          includeSecurityPolicy: false,
          includeIssueTemplates: false,
          includePRTemplate: false,
          includeGitHubActions: false,
          includeEditorConfig: false,
          includeESLint: false,
          includePrettier: false,
          includeDocker: false,
        }
      };

      const files = await generateWikiJS(minimalContext);

      // Should still generate core files
      const filePaths = files.map(f => f.path);
      expect(filePaths).toContain('config.yml');
      expect(filePaths).toContain('docker-compose.yml');
      expect(filePaths).toContain('README.md');

      // Should generate all articles regardless of options
      const articleFiles = files.filter(f => f.path.startsWith('docs/'));
      expect(articleFiles).toHaveLength(20);
    });
  });
});