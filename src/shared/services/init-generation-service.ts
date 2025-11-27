/**
 * Init Generation Service for PRP Initialization
 *
 * Generates governance files (AGENTS.md, README.md, etc.) based on project-specific prompts
 * Uses AGENTS.md from PRP root as source template and generates user-specific sections
 * Handles PRP root-relative file path copying and variable substitution
 */
import { promises as fs } from 'fs';
import * as path from 'path';

import { Logger } from '../logger.js';
import { PathResolver } from '../path-resolver.js';

interface GenerationRequest {
  projectName: string;
  projectDescription?: string;
  author?: string;
  projectPath: string;
  template?: string;
  prompt?: string;
}
export type { GenerationRequest };
interface GeneratedContent {
  agentsMd: string;
  readmeMd?: string;
  initialPrp?: string;
}
export class InitGenerationService {
  private readonly logger = new Logger({});
  private readonly prpRootPath: string;
  constructor() {
    // Use PathResolver to get the correct package root where AGENTS.md is located
    this.prpRootPath = PathResolver.getPackageRoot();
  }
  /**
   * Generate governance files for a new project
   */
  async generateGovernanceFiles(request: GenerationRequest): Promise<GeneratedContent> {
    const { projectName, projectDescription, author, template, prompt } = request;
    this.logger.info(
      'shared',
      'InitGenerationService',
      `🔧 Generating governance files for project: ${projectName}`,
    );
    const content: GeneratedContent = {
      agentsMd: await this.generateAgentsMd(projectName, projectDescription, author, template),
      readmeMd: await this.generateReadmeMd(projectName, projectDescription),
      initialPrp: prompt ? await this.generateInitialPrp(prompt, projectName) : undefined,
    };
    return content;
  }
  /**
   * Generate AGENTS.md based on root AGENTS.md template with project-specific user section
   */
  private async generateAgentsMd(
    projectName: string,
    projectDescription?: string,
    author?: string,
    template?: string,
  ): Promise<string> {
    try {
      // Read the master AGENTS.md from PRP root
      const agentsTemplatePath = path.join(this.prpRootPath, 'AGENTS.md');
      const templateContent = await fs.readFile(agentsTemplatePath, 'utf8');
      // Extract system part (everything before USER SECTION)
      const systemPartMatch = templateContent.split(
        '> SYSTEM PART! NEVER EDIT THIS PART! USER SECTION BELOW!',
      );
      const systemPart =
        `${systemPartMatch[0] 
        }\n\n---\n> SYSTEM PART! NEVER EDIT THIS PART! USER SECTION BELOW!\n\n---\n\n`;
      // Generate project-specific user section
      const userSection = this.generateUserSection(
        projectName,
        projectDescription,
        author,
        template,
      );
      // Combine system and user sections
      return systemPart + userSection;
    } catch (error) {
      this.logger.error(
        'shared',
        'InitGenerationService',
        'Failed to generate AGENTS.md:',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw new Error(
        `Failed to generate AGENTS.md: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  /**
   * Generate user-specific section for AGENTS.md
   */
  private generateUserSection(
    projectName: string,
    projectDescription?: string,
    author?: string,
    template?: string,
  ): string {
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', '-');
    let projectTypeDetails = '';
    if (template) {
      switch (template) {
        case 'react':
          projectTypeDetails =
            '\n**Technology Stack**: React + TypeScript + Vite\n**Architecture**: Component-based frontend application';
          break;
        case 'nestjs':
          projectTypeDetails =
            '\n**Technology Stack**: NestJS + TypeScript\n**Architecture**: Node.js backend API with microservices pattern';
          break;
        case 'wikijs':
          projectTypeDetails =
            '\n**Technology Stack**: Wiki.js + Docker + PostgreSQL\n**Architecture**: Documentation platform with structured data management';
          break;
        case 'typescript':
          projectTypeDetails =
            '\n**Technology Stack**: TypeScript + Node.js\n**Architecture**: Type-safe library or command-line tool';
          break;
        default:
          projectTypeDetails =
            '\n**Technology Stack**: TBD\n**Architecture**: Project architecture to be defined';
      }
    }
    return `## 🎯 Project Overview
**Created by**: ${author || 'PRP Developer'}
**Project Name**: ${projectName}
**Created**: ${timestamp}
${projectDescription ? `**Description**: ${projectDescription}` : ''}
${projectTypeDetails}
---
## 👥 Development Team
### Project Lead
- **Name**: ${author || 'TBD'}
- **Role**: Project Development Lead
### Core Agents
- **robo-system-analyst**: Requirements analysis and system architecture
- **robo-developer**: Implementation and development tasks
- **robo-quality-control**: Testing and quality assurance
- **robo-ux-ui-designer**: User interface and experience design
- **robo-devops-sre**: Infrastructure and deployment management
---
## 🛠️ Development Workflow
This project follows the PRP (Product Requirement Prompts) methodology with signal-driven development:
### Key Workflows
1. **PRP Analysis**: Requirements are captured in Product Requirement Prompts
2. **Signal System**: Progress is tracked through structured signals in PRPs
3. **Agent Coordination**: Specialized agents handle different aspects of development
4. **Continuous Integration**: Automated quality checks and deployment
### Getting Started
1. \`npx prp\` - Start the orchestrator for agent coordination
2. Create PRPs in the \`PRPs/\` directory for new features
3. The system will auto-detect and process requirements
---
## 📊 Project Status
- **Current Status**: Project initialized
- **Next Milestone**: Set up development environment and initial PRP creation
- **Team Capacity**: Ready for parallel development with multiple agents
---
## 🔧 Configuration
The project configuration is managed through:
- **.prprc**: Main project configuration file
- **PRP Directory**: Contains all Product Requirement Prompts
- **Agent Guidelines**: This AGENTS.md file defines agent workflows
---
## 📋 Quick Reference
### Common Commands
- \`npx prp orchestrator\` - Start agent coordination
- \`npx prp init\` - Initialize new project or upgrade existing
- \`npx prp wizard\` - Interactive project setup
### Signal Examples
- \`[aa]\` - Admin attention needed for project decisions
- \`[gg]\` - Goal clarification and requirements analysis
- \`[dp]\` - Development progress updates
- \`[da]\` - Done assessment and quality gates
---
## 🚀 First Steps
1. **Review Configuration**: Check \`.prprc\` for project settings
2. **Create Initial PRP**: Start with a simple setup PRP in \`PRPs/\`
3. **Run Orchestrator**: Begin agent coordination with \`npx prp\`
---
*This AGENTS.md was generated on ${timestamp} and should be updated as the project evolves.*`;
  }
  /**
   * Generate README.md based on project information
   */
  private async generateReadmeMd(
    projectName: string,
    projectDescription?: string,
  ): Promise<string> {
    return `# ${projectName}
${projectDescription || 'A PRP-managed project driven by Product Requirement Prompts'}
## 🚀 Getting Started
This project uses the PRP (Product Requirement Prompts) methodology for development management and agent coordination.
### Prerequisites
- Node.js 18+ (recommended)
- npm or yarn package manager
### Installation
\`\`\`bash
# Clone or create your project
npx prp init ${projectName}
# Navigate to project directory
cd ${projectName}
# Install dependencies
npm install
\`\`\`
### Usage
\`\`\`bash
# Start the PRP orchestrator (auto-detects and coordinates agents)
npx prp
# Start orchestrator with specific configuration
npx prp orchestrator
# Interactive wizard for setup and configuration
npx prp wizard
\`\`\`
## 📁 Project Structure
\`\`\`
${projectName}/
├── PRPs/                    # Product Requirement Prompts
├── .prprc                   # Project configuration
├── .prp/                    # PRP cache and logs
├── AGENTS.md                 # Agent guidelines (this file)
├── README.md                 # Project documentation (this file)
└── src/                     # Source code (generated by template)
\`\`\`
## 🤖 How It Works
### Product Requirement Prompts (PRPs)
PRPs are structured documents that define project requirements, acceptance criteria, and implementation plans. Each PRP follows a standardized format with:
- **Description**: Clear problem statement and requirements
- **Definition of Ready**: Checklist before implementation starts
- **Definition of Done**: Clear acceptance criteria
- **Plan**: Step-by-step implementation approach
- **Progress Tracking**: Signal-based progress updates
### Signal System
The project uses a sophisticated signal system for communication:
- **[aa]** - Admin attention needed
- **[gg]** - Goal clarification required
- **[rp]** - Ready for preparation phase
- **[dp]** - Development progress update
- **[da]** - Done assessment and validation
### Agent Coordination
The orchestrator automatically:
- Detects new and updated PRPs
- Spawns appropriate specialized agents
- Manages parallel work streams
- Ensures quality gates are met
- Coordinates agent handoffs
## 🎯 Key Features
- **Agent-Driven Development**: Specialized AI agents handle different aspects
- **Signal-Based Communication**: Structured progress tracking
- **Template-Based Scaffolding**: Quick project initialization
- **Automated Quality Assurance**: Continuous integration and testing
- **Real-Time Monitoring**: Token usage and agent activity tracking
## 🔧 Configuration
The project is configured through the \`.prprc\` file:
\`\`\`json
{
  "version": "1.0.0",
  "name": "${projectName}",
  "agents": ["robo-developer", "robo-quality-control"],
  "limits": {
    "maxConcurrentAgents": 5,
    "tokenAlertThreshold": 0.8
  },
  "features": {
    "tokenMonitoring": true,
    "signalDetection": true,
    "realTimeUpdates": true
  }
}
\`\`\`
## 📚 Resources
- [PRP Documentation](./PRPs/)
- [Agent Guidelines](./AGENTS.md)
- [CLI Reference](./docs/CLI_REFERENCE.md)
- [TUI Guide](./docs/TUI_GUIDE.md)
## 🤝 Contributing
Contributions are managed through the PRP system. To contribute:
1. Create a PRP describing your proposed changes
2. The system will automatically analyze and schedule implementation
3. Follow the agent-guided development process
4. All changes go through automated quality gates
---
*Generated by PRP Init Generation Service on ${new Date().toISOString()}*`;
  }
  /**
   * Generate initial PRP from user prompt
   */
  private async generateInitialPrp(prompt: string, projectName: string): Promise<string> {
    const prpNumber = await this.getNextPrpNumber();
    const prpTitle = this.extractTitleFromPrompt(prompt) || 'Initial Project Setup';
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', '-');
    return `# ${prpNumber}: ${prpTitle}
> ${prompt}
## progress
[aa] PRP created from user prompt: ${prpTitle} | robo-system-analyst | ${timestamp}
## description
${prompt}
## dor
- [ ] Review and refine requirements from user prompt
- [ [] Create detailed implementation plan with acceptance criteria
- [ ] Set up development environment and tooling
- [ ] Define project architecture and dependencies
- [ ] Research technical feasibility and identify risks
## dod
- [ ] Requirements clarified and approved by stakeholder
- [ ] Implementation plan created with clear milestones
- [] Development environment properly configured
- [ ] Initial code structure established following PRP standards
- [ ] Quality gates and automated testing configured
- [ ] Documentation updated with project overview
## plan
- [ ] Analyze user prompt requirements and extract key features
- [ ] Create detailed breakdown of implementation tasks
- [ ] Set up project structure based on template requirements
- [ | Implement core functionality with TDD approach
- [ ] Configure automated testing and CI/CD pipeline
- [ | Document implementation and user guides
- [ ] Validate implementation against original requirements
## research materials
### Prompt Analysis
**Original Prompt**: ${prompt}
**Generated Date**: ${timestamp}
**Project**: ${projectName}
**Template Analysis**: Requirements will be mapped to specific implementation patterns
### Technical Considerations
- Architecture patterns to be evaluated based on requirements
- Technology stack selection aligned with project goals
- Integration requirements with existing systems if applicable
### Next Steps
- Review and refinement of requirements with stakeholders
- Technical feasibility assessment and prototyping if needed
- Resource allocation and timeline estimation
- Risk assessment and mitigation strategies
`;
  }
  /**
   * Get next PRP number by scanning existing PRPs
   */
  private async getNextPrpNumber(): Promise<string> {
    try {
      // Use the package root instead of templates path for PRPs directory
      const packageRoot = path.dirname(this.prpRootPath);
      const prpsDir = path.join(packageRoot, 'PRPs');
      await fs.mkdir(prpsDir, { recursive: true });
      const files = await fs.readdir(prpsDir);
      const prpFiles = files.filter((file) => file.startsWith('PRP-') && file.endsWith('.md'));
      if (prpFiles.length === 0) {
        return 'PRP-001';
      }
      const numbers = prpFiles.map((file) => {
        const match = file.match(/PRP-(\d+)/);
        return match ? parseInt(match[1] || '0', 10) : 0;
      });
      const nextNumber = Math.max(...numbers) + 1;
      return `PRP-${String(nextNumber).padStart(3, '0')}`;
    } catch (error) {
      this.logger.warn(
        'shared',
        'InitGenerationService',
        'Failed to scan existing PRPs, starting with PRP-001:',
        { error: error instanceof Error ? error.message : String(error) },
      );
      return 'PRP-001';
    }
  }
  /**
   * Extract title from prompt
   */
  private extractTitleFromPrompt(prompt: string): string | null {
    const sentences = prompt.split(/[.!?]+/);
    if (sentences.length > 0 && sentences[0]) {
      const firstSentence = sentences[0].trim();
      if (firstSentence.length < 100) {
        return firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
      }
    }
    const keyPhrases = [
      'Create a',
      'Build a',
      'Develop a',
      'Set up a',
      'Implement a',
      'Design a',
      'Create an',
      'Build an',
      'Develop an',
      'Set up an',
    ];
    for (const phrase of keyPhrases) {
      if (prompt.includes(phrase)) {
        const start = prompt.indexOf(phrase);
        const end = prompt.indexOf('.', start);
        if (end > start && end > -1) {
          const title = prompt.substring(start, end).trim();
          return title.charAt(0).toUpperCase() + title.slice(1);
        }
      }
    }
    return null;
  }
}
