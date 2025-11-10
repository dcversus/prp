# PRP-006: Template System Enhancement

> I want to enhance the template system with interactive scaffolding, dependency management, and post-generation hooks. Focus on template customization, interactive scaffolding, dependency management, and post-generation hooks. WE need templates for typescript react   nestjs   fastapi   wikijs   default with basics for best setup or basic setup

## Template System Core Services
- `/src/shared/templates/templateEngine.ts` | Handlebars-based template engine with variable substitution and helper functions | [cq] Code quality verified, ready for use [cq]
- `/src/shared/services/scaffolding-service.ts` | Main scaffolding service orchestrating template processing, file copying, and governance file generation | [dp] Development progress - needs template validation integration [dp]
- `/src/shared/services/init-generation-service.ts` | Service for generating governance files (AGENTS.md, README.md, PRPs) with project-specific customization | [dp] Development progress - needs enhanced template variables [dp]
- `/src/generators/wikijs.ts` | Wiki.js-specific generator with Docker setup and documentation articles | [dp] Development progress - needs integration with scaffolding service [dp]

## Template Definitions
- `/templates/none/template.json` | Empty/minimal template configuration for basic project setup | [dp] Development progress - needs file selection logic [dp]
- `/templates/typescript/template.json` | TypeScript project template configuration with modern tooling | [dp] Development progress - needs dependency management [dp]
- `/templates/react/template.json` | React project template with Vite, TypeScript, and modern tooling | [dp] Development progress - needs dependency management [dp]
- `/templates/nestjs/template.json` | NestJS backend template with TypeScript and best practices | [dp] Development progress - needs dependency management [dp]
- `/templates/fastapi/template.json` | FastAPI Python project template with Docker setup | [bb] Blocker - template.json needs creation and configuration [bb]
- `/templates/wikijs/template.json` | Wiki.js project template with Docker and documentation setup | [dp] Development progress - needs post-generation hooks [dp]

## Template Files - TypeScript
- `/templates/typescript/src/index.ts` | TypeScript entry point template | [dp] Development progress - needs enhanced variable substitution [dp]
- `/templates/typescript/package.json` | TypeScript package configuration with modern dependencies | [dp] Development progress - needs dependency version management [dp]
- `/templates/typescript/tsconfig.json` | TypeScript compiler configuration template | [dp] Development progress - needs customization options [dp]
- `/templates/typescript/README.md` | TypeScript project documentation template | [dp] Development progress - needs dynamic content generation [dp]

## Template Files - React
- `/templates/react/src/main.tsx` | React application entry point with Vite setup | [dp] Development progress - needs component structure [dp]
- `/templates/react/src/App.tsx` | Main React component template | [dp] Development progress - needs enhanced styling options [dp]
- `/templates/react/src/index.css` | Global CSS styles template | [dp] Development progress - needs theming support [dp]
- `/templates/react/src/App.css` | App-specific CSS styles template | [dp] Development progress - needs component styling [dp]
- `/templates/react/index.html` | HTML template for React app | [dp] Development progress - needs meta tag customization [dp]
- `/templates/react/package.json` | React package with Vite dependencies | [dp] Development progress - needs dependency management [dp]
- `/templates/react/vite.config.ts` | Vite configuration for React | [dp] Development progress - needs build optimization [dp]
- `/templates/react/tsconfig.json` | TypeScript configuration for React | [dp] Development progress - needs path mapping [dp]
- `/templates/react/tsconfig.node.json` | Node.js TypeScript configuration | [dp] Development progress - needs build tool configuration [dp]

## Template Files - NestJS
- `/templates/nestjs/src/main.ts` | NestJS application bootstrap template | [dp] Development progress - needs environment configuration [dp]
- `/templates/nestjs/src/app.module.ts` | Root application module template | [dp] Development progress - needs module structure [dp]
- `/templates/nestjs/src/app.controller.ts` | Sample controller template | [dp] Development progress - needs REST API patterns [dp]
- `/templates/nestjs/src/app.service.ts` | Sample service template | [dp] Development progress - needs dependency injection patterns [dp]
- `/templates/nestjs/src/app.controller.spec.ts` | Controller unit test template | [dp] Development progress - needs testing patterns [dp]
- `/templates/nestjs/src/app.service.spec.ts` | Service unit test template | [dp] Development progress - needs testing patterns [dp]
- `/templates/nestjs/package.json` | NestJS package with dependencies | [dp] Development progress - needs dependency management [dp]
- `/templates/nestjs/nest-cli.json` | Nest CLI configuration | [dp] Development progress - needs project customization [dp]
- `/templates/nestjs/tsconfig.json` | TypeScript configuration for NestJS | [dp] Development progress - needs path mapping [dp]
- `/templates/nestjs/README.md` | NestJS project documentation | [dp] Development progress - needs setup instructions [dp]

## Template Files - FastAPI
- `/templates/fastapi/app/main.py` | FastAPI application entry point | [bb] Blocker - needs creation and API patterns [bb]
- `/templates/fastapi/app/__init__.py` | Python package initialization | [bb] Blocker - needs creation [bb]
- `/templates/fastapi/app/routers/users.py` | User router template | [bb] Blocker - needs creation and API design [bb]
- `/templates/fastapi/app/routers/items.py` | Items router template | [bb] Blocker - needs creation and API design [bb]
- `/templates/fastapi/app/routers/__init__.py` | Router package initialization | [bb] Blocker - needs creation [bb]
- `/templates/fastapi/requirements.txt` | Python dependencies list | [bb] Blocker - needs dependency management [bb]
- `/templates/fastapi/Dockerfile` | FastAPI Docker configuration | [bb] Blocker - needs multi-stage build [bb]
- `/templates/fastapi/docker-compose.yml` | Docker Compose setup for FastAPI | [bb] Blocker - needs service configuration [bb]
- `/templates/fastapi/README.md` | FastAPI project documentation | [bb] Blocker - needs creation [bb]

### Missing Implementations Identified by E2E Tests (2025-11-10)
- [ ] **FastAPI Template Implementation** | Complete FastAPI template with all required files missing from E2E validation | [bb]
- [ ] **Template variable substitution system** | Handlebars-based template engine with project-specific variables | [ip]
- [ ] **Interactive scaffolding workflow** | TUI integration for template selection and file customization | [ip]
- [ ] **Post-generation hooks framework** | Automated post-generation tasks (npm install, git init, etc.) | [ip]
- [ ] **Template validation system** | Pre-generation validation to ensure template completeness | [ip]
- [ ] **Dependency management integration** | Automatic package installation for all template types | [ip]
- [ ] **Template customization framework** | User-configurable template variables and file selection | [ip]
- [ ] **Cross-platform template support** | Ensure templates work on Windows, macOS, and Linux | [ip]
- [ ] **Template update system** | Template versioning and update mechanisms | [ip]
- [ ] **Template documentation system** | Auto-generated template documentation and usage guides | [ip]
- [ ] **Wiki.js template completion** | Docker setup and configuration files for Wiki.js template | [ip]
- [ ] **NestJS template enhancement** | Complete module structure and testing patterns | [ip]
- [ ] **React template optimization** | Vite configuration and modern React patterns | [ip]
- [ ] **TypeScript template refinement** | Modern TypeScript setup with strict configuration | [ip]

## Template Files - Wiki.js
- `/templates/wikijs/config.yml` | Wiki.js configuration file template | [dp] Development progress - needs database configuration [dp]
- `/templates/wikijs/docker-compose.yml` | Docker Compose setup with database | [dp] Development progress - needs production optimization [dp]
- `/templates/wikijs/package.json` | Wiki.js package configuration | [dp] Development progress - needs theme configuration [dp]
## DoR (Definition of Ready)
- [x] All template files identified and listed with current status
- [x] Core services (templateEngine, scaffolding, init-generation) implemented and functional
- [x] Template configurations created for all major project types
- [ ] FastAPI template.json created and configured with proper file definitions
- [ ] Interactive scaffolding workflow implemented in TUI
- [ ] Dependency management system integrated with templates
- [ ] Post-generation hooks framework designed and implemented
- [ ] Template validation system created for quality assurance
- [ ] All templates use consistent variable substitution patterns
- [ ] Documentation and usage examples created for each template type

## DoD (Definition of Done)
- [x] All template files tracked with proper signal formatting
- [x] No legacy progress sections remaining in PRP
- [x] Each file mentioned only once across all PRPs
- [x] Proper signal comments ([XX]) used for each file status
- [x] Template system core services are TypeScript compliant and tested
- [ ] All template configurations include proper file selection logic
- [ ] Interactive file selection works in TUI for all templates
- [ ] Dependency management automatically installs required packages
- [ ] Post-generation hooks execute successfully for all template types
- [ ] Template validation prevents broken or incomplete templates
- [ ] All template variables are properly substituted during generation
- [ ] Documentation covers template creation, customization, and usage
- [ ] Integration tests validate end-to-end template generation workflow
- [ ] Performance benchmarks meet CLI startup time requirements

## Pre-Release Checklist
- [ ] All FastAPI template files created and properly configured
- [ ] Template validation system prevents generation errors
- [ ] Interactive scaffolding provides clear user guidance
- [ ] Dependency management handles version conflicts gracefully
- [ ] Post-generation hooks support common setup tasks
- [ ] All template variables are documented with examples
- [ ] Template customization follows consistent patterns
- [ ] Error handling provides clear feedback to users
- [ ] Integration tests cover all template types and edge cases
- [ ] Documentation includes troubleshooting guide
- [ ] Performance impact of template system measured and optimized

## Post-Release Checklist
- [ ] All templates generate successfully in different environments
- [ ] Users can create projects with all supported template types
- [ ] Interactive scaffolding workflow tested by real users
- [ ] Dependency management handles complex project requirements
- [ ] Post-generation hooks execute reliably in production
- [ ] Template validation catches configuration errors before generation
- [ ] Community feedback collected and incorporated
- [ ] Template system performance monitored in production
- [ ] Documentation updated based on user experience
- [ ] New template creation process documented and streamlined

## Plan
- [x] Remove all legacy progress sections from PRP-006
- [x] Create comprehensive file list with proper signal formatting
- [x] Ensure each template file is mentioned only once
- [ ] Fix FastAPI template configuration and missing files
- [ ] Implement interactive template selection in TUI
- [ ] Create dependency management integration
- [ ] Design and implement post-generation hooks framework
- [ ] Build template validation system
- [ ] Standardize variable substitution across all templates
- [ ] Create comprehensive documentation and examples
- [ ] Implement integration tests for all template workflows
- [ ] Optimize performance and measure impact on CLI startup
- [ ] Collect user feedback and iterate on template system
- [ ] Create template customization guide for community contributors