# TUI Wizard System - Complete Guide

## Overview

The PRP TUI Wizard is a comprehensive, animated terminal-based project initialization system that follows the exact specifications from PRP-003. It provides a complete 6-step workflow for setting up PRP projects with autonomous agent configuration, template selection, and workspace generation.

## Features

### ✨ Core Features
- **6-Step Wizard Flow**: Complete project initialization workflow
- **Animated UI**: Day/night gradient backgrounds with breathing effects
- **Real-time Validation**: JSON parsing, field validation with visual feedback
- **Agent Configuration**: Comprehensive agent setup with nested settings
- **Template System**: Multiple project templates (TypeScript, React, NestJS, FastAPI, Wiki.js)
- **Progress Tracking**: Real-time generation progress with diff snapshots
- **Config Integration**: Full .prprc configuration generation
- **ASCII Art Intro**: 10-second animated logo evolution sequence

### 🎨 Design System
- **Responsive Layout**: Adapts to terminal size (100/160/240+ column breakpoints)
- **TrueColor Support**: 24-bit color gradients with 256-color fallback
- **Music Note Semantics**: ♪ (awaiting) → ♬ (validating) → ♫ (confirmed)
- **Accessibility**: WCAG 2.1 AA compliance with keyboard navigation
- **Performance**: <2s startup time, <50MB memory usage

## Quick Start

### Basic Usage

```bash
# Start the interactive wizard
npm run prp init --wizard

# Or using the CLI directly
prp init --wizard
```

### Programmatic Usage

```typescript
import { runInitWizard } from './src/tui/init-wizard.js';

try {
  const result = await runInitWizard();
  if (result.success) {
    console.log('Project created successfully!', result.state);
  } else {
    console.log('Wizard cancelled');
  }
} catch (error) {
  console.error('Wizard error:', error);
}
```

### React Component Usage

```typescript
import React from 'react';
import { render } from 'ink';
import { InitWizard, createTUIConfig } from './src/tui/components/wizard/index.js';

const config = createTUIConfig({
  theme: 'dark',
  animations: {
    enabled: true,
    intro: { duration: 8000 }
  }
});

render(
  <InitWizard
    config={config}
    onComplete={(state) => console.log('Complete!', state)}
    onCancel={() => console.log('Cancelled')}
  />
);
```

## Wizard Steps

### Step 0: Intro Sequence
- **Duration**: 10 seconds (configurable)
- **Animation**: Logo evolution ♪ → ♩ → ♬ → ♫
- **Features**: ASCII art, fade effects, brand presentation
- **Controls**: Enter to continue, Esc to exit

### Step 1: Project Configuration
- **Fields**: Project name, project prompt, folder path
- **Validation**: Real-time path generation, name validation
- **Features**: Multi-line prompt input, live folder preview
- **Controls**: Enter to submit, Tab navigation, ↑/↓ for multiline

### Step 2: Connections (LLM Providers)
- **Providers**: OpenAI, Anthropic, Custom
- **Auth Methods**: OAuth, API key
- **Features**: Paste support (Ctrl+V), custom provider configuration
- **Controls**: ←/→ to switch providers, Enter to continue

### Step 3: Agents Configuration
- **Default Agent**: robo-developer pre-configured
- **Fields**: ID, type, limit, CV, warning limit, provider, YOLO mode
- **Advanced Settings**: Sub-agents, max parallel, MCP, compact prediction
- **Controls**: A to add agent, R to remove, Tab to navigate fields

### Step 4: Integrations
- **Options**: GitHub, npm, or skip
- **Features**: OAuth/token authentication, custom URLs
- **Auto-creation**: Workflows, templates, issue templates
- **Controls**: ←/→ to switch options, Enter to continue

### Step 5: Template Selection
- **Templates**: TypeScript, React, NestJS, FastAPI, Wiki.js, None
- **File Selection**: Hierarchical file tree with checkboxes
- **Preview**: Default files preview, required file indicators
- **Controls**: ↑/↓ to navigate, → to expand, Space to toggle

### Step 6: Generation Progress
- **Steps**: Configuration validation → File creation → Documentation
- **Features**: Real-time progress, diff snapshots, CoT visualization
- **Events**: Live activity log with timestamps
- **Duration**: ~8 seconds for complete generation

## Component Architecture

### Core Components

#### WizardShell
```typescript
interface WizardShellProps {
  title: string;
  stepIndex: number;
  totalSteps: number;
  children: React.ReactNode;
  footerKeys?: string[];
  config?: TUIConfig;
  mode?: 'day' | 'night';
  onBack?: () => void;
  onCancel?: () => void;
}
```

Main container with gradient background, step header, and bottom input area.

#### Field Components
- **FieldText**: Single-line input with validation
- **FieldTextBlock**: Multi-line text area (6-10 lines when focused)
- **FieldSelectCarousel**: Horizontal selector with easing animations
- **FieldJSON**: JSON editor with real-time parsing and pulse animations
- **FieldToggle**: Boolean toggle with visual feedback
- **FileTreeChecks**: Hierarchical file tree with expand/collapse

#### Specialized Components
- **AgentEditor**: Comprehensive agent configuration form
- **GenerationProgress**: Real-time progress with diff and CoT snapshots
- **IntroSequence**: 10-second ASCII art animation system

### Configuration Integration

#### .prprc Generation
```typescript
const config = generatePRPConfig(wizardState, tuiConfig);
// Generates complete .prprc configuration with:
// - Agent configurations
// - Template-specific settings
// - Quality gates and validation
// - Development environment setup
```

#### Agent Configuration
```typescript
const agentsMD = generateAgentsMD(wizardState);
// Creates AGENTS.md with:
// - Agent descriptions and capabilities
// - Usage instructions
// - Signal system reference
```

#### Initial PRP
```typescript
const initialPRP = generateInitialPRP(wizardState);
// Generates first PRP documenting the bootstrap process
```

## Templates

### TypeScript CLI Template
```
project-name-cli/
├── src/
│   ├── index.ts
│   ├── cli.ts
│   └── commands/
├── tests/
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

### React App Template
```
project-name-app/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   └── components/
├── public/
├── tests/
├── package.json
├── vite.config.ts
└── README.md
```

### NestJS API Template
```
project-name-api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   └── modules/
├── test/
├── package.json
├── nest-cli.json
└── README.md
```

### FastAPI Template
```
project-name-api/
├── app/
│   ├── main.py
│   ├── api/
│   └── models/
├── tests/
├── requirements.txt
├── pyproject.toml
└── README.md
```

### Wiki.js Template
```
project-name-wiki/
├── config/
├── storage/
├── docker-compose.yml
├── package.json
└── README.md
```

## Agent Configuration

### Default Agent Types

#### System Analyst
- **Capabilities**: Analysis, requirements, planning, documentation
- **Default Limit**: 100usd10k#robo-system-analyst
- **Specialties**: PRP creation, scope definition, requirement clarification

#### Developer
- **Capabilities**: Coding, testing, debugging, refactoring
- **Default Limit**: 100usd10k#robo-developer
- **Specialties**: TypeScript, Node.js, React, testing frameworks

#### Quality Control
- **Capabilities**: Testing, code review, quality assurance, metrics
- **Default Limit**: 100usd10k#robo-aqa
- **Specialties**: Test automation, code quality, performance testing

#### UX/UI Designer
- **Capabilities**: Design, user experience, accessibility, prototyping
- **Default Limit**: 100usd10k#robo-ux-ui-designer
- **Specialties**: Interface design, user flows, accessibility compliance

#### DevOps/SRE
- **Capabilities**: Deployment, monitoring, infrastructure, security
- **Default Limit**: 100usd10k#robo-devops-sre
- **Specialties**: CI/CD, containerization, monitoring, security

### Agent Configuration Fields

```typescript
interface AgentConfig {
  id: string;                    // Unique identifier
  type: string;                  // Agent type
  limit: string;                 // Budget limit (e.g., "100usd10k#dev")
  cv: string;                    // Curriculum vitae description
  warning_limit?: string;        // Warning threshold
  provider?: string;             // LLM provider
  yolo?: boolean;                // YOLO mode
  instructions_path?: string;    // Instructions file path
  sub_agents?: boolean;          // Enable sub-agents
  max_parallel?: number;         // Max parallel tasks
  mcp?: string;                  // MCP configuration file
  compact_prediction?: {         // Compact prediction settings
    percent_threshold?: number;
    auto_adjust?: boolean;
    cap?: number;
  };
}
```

## Error Handling and Validation

### Field Validation
- **Real-time**: Validation on every keystroke (debounced 150ms)
- **Visual Feedback**: Green flash for success, red for errors
- **Error Messages**: Contextual error descriptions
- **Prevention**: Blocks progression with invalid data

### JSON Validation
```typescript
// Automatic JSON parsing with visual feedback
<FieldJSON
  label="Custom Configuration"
  text={jsonText}
  onChange={setJsonText}
  validate={(json) => {
    if (json.requiredField === undefined) {
      return "Required field 'requiredField' is missing";
    }
    return null; // Valid
  }}
/>
```

### Project Validation
- **Name Validation**: No special characters, minimum length
- **Path Validation**: Valid filesystem paths, permissions check
- **Provider Validation**: API key format, URL validation
- **Template Validation**: Required files, dependencies check

## Performance Optimization

### Memory Management
- **Component Cleanup**: Proper useEffect cleanup
- **Event Listeners**: Remove listeners on unmount
- **Large Data**: Virtualization for large lists
- **State Management**: Minimal state, efficient updates

### Animation Performance
- **Frame Rate**: 4-6 fps for status animations
- **Debouncing**: 150ms for validation, 2s for breathing
- **CSS Transforms**: Hardware-accelerated animations
- **Reduced Motion**: Respect prefers-reduced-motion

### Startup Performance
- **Lazy Loading**: Load components on demand
- **Code Splitting**: Separate bundles for large components
- **Caching**: Cache validation results
- **Preloading**: Preload critical assets

## Accessibility

### Keyboard Navigation
- **Tab Order**: Logical focus flow through fields
- **Shortcuts**: Mnemonic shortcuts for common actions
- **Arrow Keys**: Navigate carousels and lists
- **Enter/Space**: Activate controls

### Screen Reader Support
- **ARIA Labels**: Descriptive labels for all controls
- **Live Regions**: Dynamic content announcements
- **Focus Management**: Proper focus trapping
- **High Contrast**: WCAG AA color contrast ratios

### Visual Accessibility
- **Color Independence**: Information not conveyed by color alone
- **Text Scaling**: Respects system font size settings
- **Reduced Motion**: Disable animations when requested
- **Focus Indicators**: Clear, visible focus states

## Testing

### Component Testing
```typescript
import { render } from '@testing-library/react';
import { FieldText } from './FieldText.js';

test('validates required field', () => {
  const handleChange = jest.fn();
  const { getByDisplayValue } = render(
    <FieldText
      label="Test Field"
      value=""
      onChange={handleChange}
      validate={(value) => value ? null : 'Required'}
    />
  );

  // Test validation behavior
  expect(getByDisplayValue('')).toBeInTheDocument();
});
```

### Integration Testing
```typescript
test('complete wizard flow', async () => {
  const result = await runInitWizard();
  expect(result.success).toBe(true);
  expect(result.state.projectName).toBeTruthy();
});
```

### Performance Testing
```bash
# Run performance benchmarks
npm run test:performance

# Memory usage profiling
npm run test:memory

# Animation performance
npm run test:animations
```

## Troubleshooting

### Common Issues

#### Wizard Doesn't Start
```bash
# Check dependencies
npm list ink react

# Reinstall if needed
npm install ink@latest react@latest
```

#### Color/Animation Issues
```bash
# Check terminal capabilities
echo $COLORTERM
echo $TERM

# Force 256-color mode
export COLORTERM=256color
```

#### Performance Issues
```bash
# Check Node.js version
node --version  # Should be 18+

# Monitor memory usage
node --max-old-space-size=512 ./dist/cli.js init --wizard
```

### Debug Mode
```typescript
// Enable debug mode
const config = createTUIConfig({
  debug: {
    enabled: true,
    maxLogLines: 200,
    showFullJSON: true
  }
});
```

### Log Files
- **Wizard Logs**: `~/.prp/logs/wizard.log`
- **Error Reports**: `~/.prp/logs/errors.log`
- **Performance**: `~/.prp/logs/performance.log`

## Contributing

### Development Setup
```bash
# Clone repository
git clone https://github.com/dcversus/prp.git
cd prp

# Install dependencies
npm install

# Run development mode
npm run dev

# Run wizard in development
npm run wizard
```

### Component Development
```bash
# Create new component
npm run generate component --name=MyComponent

# Run component tests
npm run test:component -- MyComponent

# Build for production
npm run build
```

### Style Guidelines
- Follow TypeScript strict mode
- Use functional components with hooks
- Include JSDoc comments for all exports
- Write tests for all components
- Maintain accessibility standards

## License

This wizard system is part of the PRP project and follows the same licensing terms. See LICENSE.md for details.

## Support

- **Documentation**: [PRP Documentation](./README.md)
- **Issues**: [GitHub Issues](https://github.com/dcversus/prp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/dcversus/prp/discussions)
- **Community**: [Discord Server](https://discord.gg/prp)

---

*Last updated: 2025-11-07*