# PRP Init

**Project initialization wizard and template system**

---

## 📋 Previous: [PRP CLI →](./prp-cli.md) | Next: [PRP Orchestrator →](./prp-orchestrator.md)

---

## Overview

`prp init` sets up new PRP projects with templates, configuration, and initial PRPs. The wizard guides you through project setup with an interactive TUI interface.

## Usage

### Basic Initialization
```bash
# Start interactive wizard
prp init my-project

# Skip wizard with template
prp init my-project --template typescript

# TUI wizard mode
prp init my-project --wizard
```

### Wizard Steps

#### Step 1: Project Configuration
- Project name
- Project description
- Folder path
- Initial requirements

#### Step 2: LLM Provider Setup
- Choose provider (OpenAI, Anthropic, Custom)
- Configure API keys
- Set up authentication

#### Step 3: Agent Configuration
- Select default agents
- Configure resource limits
- Set agent roles

#### Step 4: Integrations
- GitHub repository setup
- npm registry configuration
- CI/CD pipeline options

#### Step 5: Template Selection
- Choose project template
- Select files to include
- Customize configuration

#### Step 6: Generation Progress
- Real-time file creation
- Configuration validation
- Documentation generation

## Templates

### Available Templates

#### TypeScript CLI
```
project-cli/
├── src/
│   ├── index.ts
│   ├── cli.ts
│   └── commands/
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

#### React App
```
project-app/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   └── components/
├── public/
├── tests/
├── package.json
└── vite.config.ts
```

#### NestJS API
```
project-api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   └── modules/
├── test/
├── package.json
└── nest-cli.json
```

#### FastAPI (Python)
```
project-api/
├── app/
│   ├── main.py
│   ├── api/
│   └── models/
├── tests/
├── requirements.txt
└── pyproject.toml
```

#### Wiki.js
```
project-wiki/
├── config/
├── storage/
├── docker-compose.yml
├── package.json
└── README.md
```

#### None (Empty Project)
```
project/
├── .prprc
├── PRPs/
└── README.md
```

## Generated Files

### Core Configuration
- `.prprc` - Main configuration file
- `AGENTS.md` - Agent documentation
- `PRPs/PRP-001-bootstrap-cli-created.md` - Initial PRP

### Development Setup
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.gitignore` - Git ignore rules

### CI/CD
- `.github/workflows/ci.yml` - Continuous integration
- `.github/workflows/release.yml` - Release automation

### Documentation
- `README.md` - Project documentation
- `CHANGELOG.md` - Version history
- `CONTRIBUTING.md` - Contribution guidelines

## Configuration Options

### Project Settings
```json
{
  "project": {
    "name": "my-project",
    "description": "Project description",
    "version": "1.0.0",
    "author": "Your Name",
    "license": "MIT"
  }
}
```

### Agent Configuration
```json
{
  "agents": [
    {
      "id": "robo-developer",
      "type": "developer",
      "limit": "100usd10k#robo-developer",
      "provider": "openai",
      "model": "gpt-4"
    }
  ]
}
```

### Template Settings
```json
{
  "template": {
    "name": "typescript",
    "version": "1.0.0",
    "files": ["src/**/*", "tests/**/*"],
    "exclude": ["node_modules", "dist"]
  }
}
```

## Best Practices

1. **Choose the Right Template**: Start with the closest match to your needs
2. **Configure Agents**: Set appropriate resource limits for each agent
3. **Setup CI/CD**: Enable automated testing and deployment
4. **Document Everything**: Keep PRPs updated with project progress
5. **Version Control**: Commit everything to Git from the start

## Examples

### Create a TypeScript CLI Project
```bash
prp init my-cli --template typescript
cd my-cli
prp orchestrator
```

### Create a React App with Custom Configuration
```bash
prp init my-app --template react
cd my-app
prp config set agent.limit "200usd20k#robo-developer"
prp orchestrator
```

### Create Project with Custom Agents
```bash
prp init my-project --template none
cd my-project
prp config set agents[0].id robo-system-analyst
prp config set agents[0].limit "100usd10k#robo-system-analyst"
prp orchestrator
```

---

**Previous**: [PRP CLI →](./prp-cli.md) | **Next**: [PRP Orchestrator →](./prp-orchestrator.md)