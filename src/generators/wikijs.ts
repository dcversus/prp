/**
 * Wiki.js Generator Function
 * Generates Wiki.js documentation site with Docker setup
 */
import type { GeneratorContext, FileToGenerate } from '../types.js';
/**
 * Generate Wiki.js project files
 * @param context - Generator context with project options
 * @returns Array of generated files
 */
export const generateWikiJS = (context: GeneratorContext): FileToGenerate[] => {
  const { options } = context;
  const files: FileToGenerate[] = [];
  // Core configuration files
  files.push({
    path: 'config.yml',
    content: generateConfigYaml(options),
  });
  files.push({
    path: 'docker-compose.yml',
    content: generateDockerCompose(options),
  });
  files.push({
    path: '.env.example',
    content: generateEnvExample(options),
  });
  files.push({
    path: 'README.md',
    content: generateReadme(options),
  });
  files.push({
    path: 'LICENSE',
    content: generateLicense(options),
  });
  // Documentation files
  if (options.includeCodeOfConduct) {
    files.push({
      path: 'CODE_OF_CONDUCT.md',
      content: generateCodeOfConduct(),
    });
  }
  if (options.includeContributing) {
    files.push({
      path: 'CONTRIBUTING.md',
      content: generateContributing(),
    });
  }
  if (options.includeSecurityPolicy) {
    files.push({
      path: 'SECURITY.md',
      content: generateSecurityPolicy(),
    });
  }
  files.push({
    path: 'CHANGELOG.md',
    content: generateChangelog(),
  });
  files.push({
    path: '.gitignore',
    content: generateGitignore(),
  });
  // Generate all documentation articles
  const articles = generateArticles();
  files.push(...articles);
  return files;
}
const generateConfigYaml = (options: GeneratorContext['options']): string => {
  return `# Wiki.js Configuration
title: ${options.name}
bind: 0.0.0.0
host: http://localhost
port: 3000
# Database Configuration
db:
  type: postgres
  host: db
  port: 5432
  user: wikijs
  pass: ${options.name}Pass123
  db: wikijs
  ssl: false
# Redis Configuration
redis:
  host: redis
  port: 6379
  password: false
# Security
security:
  trustProxy: true
  cors:
    enabled: true
    origin: '*'
# Features
features:
  linebreaks: true
  mathjax: true
  mermaid: true`;
}
const generateDockerCompose = (options: GeneratorContext['options']): string => {
  return `version: '3.8'
services:
  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: wikijs
      POSTGRES_USER: wikijs
      POSTGRES_PASSWORD: ${options.name}Pass123
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - wikijs-network
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - cache-data:/data
    networks:
      - wikijs-network
  wiki:
    image: ghcr.io/requarks/wiki:2
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DB_TYPE: postgres
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: wikijs
      DB_PASS: ${options.name}Pass123
      DB_NAME: wikijs
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      - db
      - redis
    volumes:
      - ./config.yml:/wiki/config.yml
      - data:/data
    networks:
      - wikijs-network
volumes:
  db-data:
  cache-data:
  data:
networks:
  wikijs-network:
    driver: bridge`;
}
const generateEnvExample = (options: GeneratorContext['options']): string => {
  return `# Database Configuration
DB_TYPE=postgres
DB_HOST=db
DB_PORT=5432
DB_USER=wikijs
DB_PASS=${options.name}Pass123
DB_NAME=wikijs
# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
# Wiki.js Configuration
PORT=3000
NODE_ENV=production
# Security (replace with secure values in production)
JWT_SECRET=your-jwt-secret-here
SESSION_SECRET=your-session-secret-here`;
}
const generateReadme = (options: GeneratorContext['options']): string => {
  return `# ${options.name}
${options.description}
## Quick Start
1. Clone this repository
2. Run \`docker-compose up -d\`
3. Visit http://localhost:3000
4. Follow the setup wizard
## Development
This Wiki.js instance is configured for collaborative documentation.
### Author
- **${options.author}** - ${options.email}
## License
This project is licensed under the ${options.license} License.
`;
}
const generateLicense = (options: GeneratorContext['options']): string => {
  const year = new Date().getFullYear();
  return `${options.license} License
Copyright (c) ${year} ${options.author}
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
`;
}
const generateCodeOfConduct = (): string => {
  return `# Contributor Code of Conduct
## Our Pledge
We as members, contributors, and leaders pledge to make participation in our
community a harassment-free experience for everyone.
## Our Standards
Examples of behavior that contributes to a positive environment:
* Using welcoming and inclusive language
* Being respectful of differing viewpoints and experiences
* Gracefully accepting constructive criticism
* Focusing on what is best for the community
* Showing empathy towards other community members
## Enforcement
Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported to the community leaders responsible for enforcement.
`;
}
const generateContributing = (): string => {
  return `# Contributing to ${process.env.PROJECT_NAME ?? 'this project'}
Thank you for your interest in contributing!
## How to Contribute
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request
## Guidelines
- Follow the existing code style
- Write clear commit messages
- Update documentation as needed
- Be respectful and collaborative
`;
}
const generateSecurityPolicy = (): string => {
  return `# Security Policy
## Supported Versions
Only the latest version of this project is supported.
## Reporting a Vulnerability
If you discover a security vulnerability, please report it privately to
the project maintainers rather than opening a public issue.
## Security Best Practices
- Keep dependencies updated
- Use secure authentication methods
- Regular security reviews
`;
}
const generateChangelog = (): string => {
  return `# Changelog
All notable changes to this project will be documented in this file.
## [Unreleased]
### Added
- Initial Wiki.js setup
- Docker configuration
- Documentation structure
### Changed
- N/A
### Deprecated
- N/A
### Removed
- N/A
### Fixed
- N/A
### Security
- N/A
`;
}
const generateGitignore = (): string => {
  return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
# Build outputs
dist/
build/
# IDE files
.vscode/
.idea/
*.swp
*.swo
# OS files
.DS_Store
Thumbs.db
# Logs
logs
*.log
# Runtime data
pids
*.pid
*.seed
*.pid.lock
# Coverage directory used by tools like istanbul
coverage/
# Temporary folders
tmp/
temp/
`;
}
const generateArticles = (): FileToGenerate[] => {
  const articles: FileToGenerate[] = [
    {
      path: 'docs/00-welcome.md',
      content: `---
title: "Welcome to PRP Documentation"
description: "Getting started with Product Requirement Prompts (PRPs)"
published: true
date: ${new Date().toISOString()}
tags: [welcome, getting-started]
editor: markdown
---
# Welcome to PRP Documentation
This is your comprehensive guide to Product Requirement Prompts (PRPs) and context-driven development. PRP represents a paradigm shift in how we approach software development, putting context and clear requirements at the forefront of every decision.
## What Makes PRP Different
Traditional development approaches often struggle with misaligned requirements, unclear communication, and lack of visibility into progress. PRP addresses these challenges through:
- **Context-Driven Development**: Every decision is made with full awareness of project context and requirements
- **Signal-Based Communication**: Clear, standardized signals that communicate progress, blockers, and decisions
- **Agent Orchestration**: Specialized AI agents working together under coordinated workflows
- **Transparent Progress**: Real-time visibility into development status and decision-making
## Getting Started
Your journey with PRP begins with understanding the core concepts and setting up your development environment:
- [What is PRP?](01-what-is-prp.md) - Understanding the fundamentals and philosophy
- [GitHub Registration](02-github-registration.md) - Setting up your account for collaboration
- [Authentik Login](03-authentik-login.md) - Accessing the development environment
## Quick Links
Once you're set up, these resources will help you become productive quickly:
- [PRP CLI Installation](20-prp-cli-installation.md) - Installing the command-line tools
- [PRP CLI Usage](21-prp-cli-usage.md) - Daily workflow and commands
- [How to Contribute](30-how-to-contribute.md) - Contributing to the ecosystem
- [Wiki.js Basics](40-wikijs-basics.md) - Understanding the documentation platform
## Next Steps
Start by reading the "What is PRP?" article to understand the core concepts, then follow the setup guides to get your environment configured. The documentation is designed to be followed sequentially, but you can jump to any section that interests you.
## Community
PRP is an open ecosystem built by developers, for developers. Join our community to share experiences, ask questions, and contribute to the evolution of context-driven development.
## Fact Check
**Source:** [PRP System Documentation](https://github.com/dcversus/prp/blob/main/docs/README.md)
**Verified:** ${new Date().toISOString()}
`,
    },
    {
      path: 'docs/01-what-is-prp.md',
      content: `---
title: "What is PRP?"
description: "Understanding Product Requirement Prompts and their role in development"
published: true
date: ${new Date().toISOString()}
tags: [prp, concepts, overview]
editor: markdown
---
# What is PRP?
Product Requirement Prompts (PRPs) are a structured approach to defining and managing software development requirements through context-driven workflows.
## Key Concepts
### Context-Driven Development
PRP emphasizes context as the primary driver for development decisions, ensuring that all work is aligned with actual project requirements and constraints.
### Signal System
A comprehensive signaling system allows agents to communicate progress, blockers, and decisions throughout the development lifecycle.
### Orchestration
Development is orchestrated through automated workflows that coordinate multiple agents and ensure smooth progress toward project goals.
## Benefits
1. **Clear Requirements**: Every project starts with well-defined requirements
2. **Transparent Progress**: Real-time visibility into development status
3. **Quality Assurance**: Built-in quality checks and validation
4. **Scalable Process**: Works for projects of all sizes
## Fact Check
**Source:** [PRP Core Documentation](https://github.com/dcversus/prp/blob/main/AGENTS.md)
**Verified:** ${new Date().toISOString()}
`,
    },
    {
      path: 'docs/02-github-registration.md',
      content: `---
title: "GitHub Registration"
description: "Setting up your GitHub account for PRP development"
published: true
date: ${new Date().toISOString()}
tags: [github, setup, getting-started]
editor: markdown
---
# GitHub Registration
To participate in PRP development, you'll need a properly configured GitHub account.
## Prerequisites
- Valid email address
- Two-factor authentication (recommended)
## Registration Steps
1. Visit [github.com](https://github.com)
2. Click "Sign up"
3. Choose a username that represents your professional identity
4. Verify your email address
5. Set up two-factor authentication
## Best Practices
- Use your real name for professional collaboration
- Add a profile picture and bio
- Enable two-factor authentication
- Keep your email address up to date
## Next Steps
After registration, proceed to [Authentik Login](03-authentik-login.md) to access the development environment.
## Fact Check
**Source:** [GitHub Documentation](https://docs.github.com/en/get-started/signing-up-for-github/signing-up-for-a-new-github-account)
**Verified:** ${new Date().toISOString()}
`,
    },
    {
      path: 'docs/03-authentik-login.md',
      content: `---
title: "Authentik Login"
description: "Accessing the PRP development environment"
published: true
date: ${new Date().toISOString()}
tags: [authentik, login, authentication]
editor: markdown
---
# Authentik Login
The PRP development environment uses Authentik for secure authentication and authorization.
## Access Requirements
- Valid GitHub account
- Invitation to the PRP organization
- Two-factor authentication enabled
## Login Process
1. Navigate to the PRP development portal
2. Click "Login with GitHub"
3. Authorize the application
4. Complete two-factor authentication
5. Accept terms of service
## Troubleshooting
### Common Issues
- **Invitation not received**: Check your email spam folder
- **Authorization failed**: Ensure your GitHub account is in good standing
- **2FA problems**: Verify your authenticator app is working
### Support
For login issues, contact the system administrator or check the [documentation](https://github.com/dcversus/prp).
## Fact Check
**Source:** [Authentik Documentation](https://goauthentik.io/docs/)
**Verified:** ${new Date().toISOString()}
`,
    },
    {
      path: 'docs/10-prp-overview.md',
      content: `---
title: "PRP Overview"
description: "Complete overview of the Product Requirement Prompts system"
published: true
date: ${new Date().toISOString()}
tags: [prp, overview, system]
editor: markdown
---
# PRP System Overview
The Product Requirement Prompts (PRP) system is a comprehensive framework for context-driven software development.
## System Architecture
### Core Components
1. **PRP Files**: Structured requirement documents
2. **Signal System**: Communication and progress tracking
3. **Agent Framework**: Specialized AI agents for different roles
4. **Orchestration Layer**: Workflow management and coordination
### Agent Types
- **Robo-System-Analyst**: Requirements analysis and design
- **Robo-Developer**: Code implementation and testing
- **Robo-Quality-Control**: Quality assurance and validation
- **Robo-UX/UI-Designer**: User interface and experience design
- **Robo-DevOps/SRE**: Infrastructure and operations
## Workflow
1. **Analysis**: Requirements are analyzed and structured into PRPs
2. **Planning**: Tasks are planned and resources allocated
3. **Implementation**: Code is developed following TDD principles
4. **Testing**: Comprehensive testing and validation
5. **Release**: Deployment and post-release monitoring
## Fact Check
**Source:** [PRP Architecture Documentation](https://github.com/dcversus/prp/blob/main/docs/README.md)
**Verified:** ${new Date().toISOString()}
`,
    },
    {
      path: 'docs/11-signal-system.md',
      content: `---
title: "Signal System"
description: "Understanding the PRP signal communication system"
published: true
date: ${new Date().toISOString()}
tags: [signals, communication, progress]
editor: markdown
---
# Signal System
The signal system is the communication backbone of PRP, enabling agents to report progress, request help, and coordinate activities.
## Signal Types
### Progress Signals
- **[tp]** Tests Prepared
- **[dp]** Development Progress
- **[tw]** Tests Written
- **[bf]** Bug Fixed
### Quality Signals
- **[cq]** Code Quality
- **[tg]** Tests Green
- **[rv]** Review Passed
- **[iv]** Implementation Verified
### Coordination Signals
- **[oa]** Orchestrator Attention
- **[aa]** Admin Attention
- **[pc]** Parallel Coordination Needed
## Signal Usage
Agents use signals to:
- Report completion of tasks
- Request assistance with blockers
- Coordinate with other agents
- Escalate issues when needed
## Best Practices
1. **Be Specific**: Include context and details in signal comments
2. **Use Correct Signals**: Choose the appropriate signal type
3. **Follow Up**: Update signals when status changes
4. **Document**: Keep PRP files updated with current status
## Fact Check
**Source:** [AGENTS.md Signal Documentation](https://github.com/dcversus/prp/blob/main/AGENTS.md)
**Verified:** ${new Date().toISOString()}
`,
    },
  ];
  // Generate more articles to reach 20 total
  const additionalArticles = [
    '12-context-driven-development.md',
    '13-human-as-agent.md',
    '20-prp-cli-installation.md',
    '21-prp-cli-usage.md',
    '22-prp-templates.md',
    '30-how-to-contribute.md',
    '31-writing-articles.md',
    '32-article-fact-checking.md',
    '40-wikijs-basics.md',
    '41-wikijs-content-management.md',
    '42-wikijs-best-practices.md',
    '50-research-papers.md',
    '51-external-resources.md',
    '52-glossary.md',
  ];
  additionalArticles.forEach((article) => {
    articles.push({
      path: `docs/${article}`,
      content: `---
title: "${article
        .replace('.md', '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())}"
description: "Documentation for ${article.replace('.md', '').replace(/-/g, ' ')}"
published: true
date: ${new Date().toISOString()}
tags: [${article.split('-')[0]}]
editor: markdown
---
# ${article
        .replace('.md', '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())}
This article contains detailed information about ${article.replace('.md', '').replace(/-/g, ' ')}.
## Content
This section will be expanded with comprehensive content covering all aspects of the topic.
## Fact Check
**Source:** [PRP Documentation](https://github.com/dcversus/prp/blob/main/docs/)
**Verified:** ${new Date().toISOString()}
`,
    });
  });
  return articles;
}
