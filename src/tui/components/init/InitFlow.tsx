/**
 * ♫ InitFlow - Complete PRP Project Initialization Flow
 *
 * Comprehensive 6-step flow implementing PRP-003 specifications:
 * 1. Intro (ASCII art animation)
 * 2. Project Configuration
 * 3. Connections (LLM providers)
 * 4. Agents Configuration
 * 5. Integrations
 * 6. Template Selection
 * 7. Generation Progress
 */

import React, { useState, useCallback, useRef } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

// Import init components
import InitShell from './InitShell.js';
import FieldText from './FieldText.js';
import FieldTextBlock from './FieldTextBlock.js';
import FieldSelectCarousel from './FieldSelectCarousel.js';
import FieldSecret from './FieldSecret.js';
import FieldToggle from './FieldToggle.js';
import FieldJSON from './FieldJSON.js';
// import FileTreeChecks, { TreeNode } from './FileTreeChecks.js'; // Unused import
import AgentEditor from './AgentEditor.js';
import GenerationProgress from './GenerationProgress.js';

// Import types and config
import type { TUIConfig } from '../../../shared/types/TUIConfig.js';
import { createTUIConfig } from '../../config/TUIConfig.js';
import type { AgentConfig, TemplateFile, GenerationStep } from './types.js';

// Init state interface
export interface InitState {
  step: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  projectName: string;
  projectPrompt: string;
  projectPath: string;
  provider: 'openai' | 'anthropic' | 'custom';
  authType: 'oauth' | 'api-key';
  apiKey?: string;
  customProvider?: {
    type: 'openai' | 'anthropic';
    baseUrl: string;
    apiToken: string;
    customArgs: string;
  };
  agents: AgentConfig[];
  integrations: {
    github?: {
      auth: 'oauth' | 'token';
      url?: string;
      token?: string;
    };
    npm?: {
      auth: 'oauth' | 'token';
      registry?: string;
      token?: string;
    };
  };
  template: 'typescript' | 'react' | 'nestjs' | 'fastapi' | 'wikijs' | 'none';
  configureFiles: boolean;
  selectedFiles: Set<string>;
  generatePromptQuote?: boolean;
}

// Action history interface
interface Action {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

// Generation progress interfaces
export interface InitFlowProps {
  config?: TUIConfig;
  onComplete?: (state: InitState) => void;
  onCancel?: () => void;
  initialState?: Partial<InitState>;
}

export const InitFlow = ({
  config: externalConfig,
  onComplete,
  onCancel,
  initialState = {}
}: InitFlowProps) => {
  const { exit } = useApp();
  const [config] = useState(() => externalConfig || createTUIConfig());
  const inputHandlerRef = useRef<((input: string, key: any) => void) | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  // const [musicState, // setMusicState] = useState<MusicNoteState>('awaiting'); // Unused variable

  // Initialize init state
  const [state, setState] = useState<InitState>({
    step: 0,
    projectName: '',
    projectPrompt: '',
    projectPath: '',
    provider: 'anthropic',
    authType: 'oauth',
    agents: [{
      id: 'robo-developer',
      type: 'developer',
      limit: '100usd10k#dev',
      cv: 'Full-stack developer with expertise in TypeScript, Node.js, and React',
      warning_limit: '2k#robo-quality-control',
      provider: 'anthropic',
      yolo: false,
      instructions_path: 'AGENTS.md',
      sub_agents: true,
      max_parallel: 5,
      mcp: '.mcp.json',
      compact_prediction: {
        percent_threshold: 0.82,
        auto_adjust: true,
        cap: 24000
      }
    }],
    integrations: {},
    template: 'typescript',
    configureFiles: false,
    selectedFiles: new Set(['src/', 'README.md', '.gitignore', 'package.json']),
    generatePromptQuote: true,
    ...initialState
  });

  // Generation state
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    { name: 'Validating configuration...', status: 'pending' },
    { name: 'Creating project structure...', status: 'pending' },
    { name: 'Generating package.json...', status: 'pending' },
    { name: 'Setting up TypeScript...', status: 'pending' },
    { name: 'Creating source files...', status: 'pending' },
    { name: 'Writing documentation...', status: 'pending' },
    { name: 'Initializing git...', status: 'pending' },
    { name: 'Installing dependencies...', status: 'pending' },
    { name: 'Creating first PRP...', status: 'pending' },
    { name: 'Finalizing workspace...', status: 'pending' }
  ]);

  // Action logger
  const addAction = useCallback((action: Omit<Action, 'id' | 'timestamp'>) => {
    const newAction: Action = {
      ...action,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setActions(prev => [...prev, newAction]);
  }, []);

  // Step navigation
  const handleNext = useCallback(() => {
    if (state.step < 6) {
      setState(prev => ({ ...prev, step: (prev.step + 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6 }));
      // setMusicState('awaiting');
    }
  }, [state.step]);

  const handleBack = useCallback(() => {
    if (state.step > 0) {
      setState(prev => ({ ...prev, step: (prev.step - 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6 }));
      // setMusicState('awaiting');
    } else {
      onCancel?.();
      exit();
    }
  }, [state.step, onCancel, exit]);

  // Step completion handlers
  const handleStepComplete = useCallback(() => {
    // setMusicState('confirmed');
    setTimeout(() => {
      handleNext();
    }, 500);
  }, [handleNext]);

  // Handle keyboard input
  inputHandlerRef.current = (input, key) => {
    // Handle Ctrl+C or Ctrl+D
    if (key.ctrl && (input === 'c' || input === 'd')) {
      exit();
      return;
    }

    // Handle q for quit
    if (input === 'q') {
      exit();
      return;
    }

    // Handle escape
    if (key.escape) {
      handleBack();
      return;
    }

    // Handle Ctrl+R for restart/refresh
    if (key.ctrl && input === 'r') {
      setState(prev => ({ ...prev, step: 0 }));
      return;
    }

    // Handle Enter on intro and generation steps
    // Other steps handle their own input through form components
    if (key.return) {
      if (state.step === 0) {
        // Intro step - advance to next
        handleStepComplete();
      } else if (state.step === 6) {
        // Generation step - exit
        exit();
      }
      return;
    }

    // Handle arrow keys for field navigation
    if (state.step === 1 && key.upArrow || key.downArrow) {
      // Arrow keys on project step for field switching
      // The FieldText components handle their own focus
      return;
    }

    // Handle tab for navigation between fields
    if (key.tab) {
      // Tab navigation between form fields is handled by components
      
    }
  };

  // Apply input handler with cleanup on unmount
  useInput(() => {}, { isActive: true }); // Empty input handler for now

  // Template files tree
  const getTemplateFiles = useCallback((): TemplateFile[] => {
    const baseFiles: TemplateFile[] = [
      {
        id: 'src',
        path: 'src/',
        name: 'src/',
        description: 'Source code directory',
        required: true,
        checked: true,
        children: [
          { id: 'src/index', path: 'src/index.ts', name: 'index.ts', description: 'Entry point', required: true, checked: true },
          { id: 'src/app', path: 'src/app.ts', name: 'app.ts', description: 'Main application', required: true, checked: true },
          { id: 'src/cli', path: 'src/cli.ts', name: 'cli.ts', description: 'CLI interface', required: true, checked: true }
        ]
      },
      {
        id: 'docs',
        path: 'docs/',
        name: 'docs/',
        description: 'Documentation directory',
        required: true,
        checked: true,
        children: [
          { id: 'docs/readme', path: 'docs/README.md', name: 'README.md', description: 'Documentation', required: true, checked: true },
          { id: 'docs/api', path: 'docs/api/', name: 'api/', description: 'API docs', required: false, checked: false, children: [] }
        ]
      },
      { id: 'package', path: 'package.json', name: 'package.json', description: 'Package configuration', required: true, checked: true },
      { id: 'gitignore', path: '.gitignore', name: '.gitignore', description: 'Git ignore file', required: true, checked: true },
      { id: 'license', path: 'LICENSE', name: 'LICENSE', description: 'License file', required: false, checked: false },
      { id: 'contributing', path: 'CONTRIBUTING.md', name: 'CONTRIBUTING.md', description: 'Contributing guidelines', required: false, checked: false }
    ];

    if (state.template !== 'none') {
      baseFiles.push({
        id: 'agents',
        path: 'AGENTS.md',
        name: 'AGENTS.md',
        description: 'Agent configuration and role definitions',
        required: true,
        checked: true
      });

      baseFiles.push({
        id: 'prprc',
        path: '.prprc',
        name: '.prprc',
        description: 'Project configuration',
        required: true,
        checked: true
      });

      baseFiles.push({
        id: 'mcp',
        path: '.mcp.json',
        name: '.mcp.json',
        description: 'Model Context Protocol configuration',
        required: false,
        checked: true
      });

      baseFiles.push({
        id: 'github',
        path: '.github/',
        name: '.github/',
        description: 'GitHub configuration',
        required: false,
        checked: true,
        children: [
          {
            id: 'github-workflows',
            path: '.github/workflows/',
            name: 'workflows/',
            description: 'GitHub workflows',
            required: false,
            checked: true,
            children: [
              { id: 'github-ci', path: '.github/workflows/ci.yml', name: 'ci.yml', description: 'CI workflow', required: false, checked: true },
              { id: 'github-review', path: '.github/workflows/claude-code-review.yml', name: 'claude-code-review.yml', description: 'Code review workflow', required: false, checked: true }
            ]
          }
        ]
      });
    }

    return baseFiles;
  }, [state.template]);

  // File selection handler
  const handleFileToggle = useCallback((nodeId: string, checked: boolean) => {
    setState(prev => {
      const newSelectedFiles = new Set(prev.selectedFiles);
      if (checked) {
        newSelectedFiles.add(nodeId);
      } else {
        newSelectedFiles.delete(nodeId);
      }
      return { ...prev, selectedFiles: newSelectedFiles };
    });
  }, []);

  // Agent management
  const handleAddAgent = useCallback(() => {
    const newAgent: AgentConfig = {
      id: `agent-${state.agents.length + 1}`,
      type: 'developer',
      limit: '100usd10k#dev',
      cv: 'Specialized agent with specific expertise',
      provider: state.provider,
      yolo: false,
      instructions_path: 'AGENTS.md',
      sub_agents: false,
      max_parallel: 3,
      mcp: '.mcp.json',
      compact_prediction: {
        percent_threshold: 80,
        auto_adjust: true,
        cap: 100
      }
    };

    setState(prev => ({
      ...prev,
      agents: [...prev.agents, newAgent]
    }));

    addAction({
      type: 'info',
      message: `Added agent: ${newAgent.id}`
    });
  }, [state.agents.length, state.provider, addAction]);

  const handleUpdateAgent = useCallback((index: number, agent: AgentConfig) => {
    setState(prev => {
      const newAgents = [...prev.agents];
      newAgents[index] = agent;
      return { ...prev, agents: newAgents };
    });
  }, []);

  const handleRemoveAgent = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      agents: prev.agents.filter((_, i) => i !== index)
    }));

    addAction({
      type: 'warning',
      message: `Removed agent at position ${index + 1}`
    });
  }, [addAction]);

  // Project generation
  const handleGenerate = useCallback(async () => {
    setState(prev => ({ ...prev, step: 6 }));
    // setMusicState('validating');

    // Simulate generation process
    for (let i = 0; i < generationSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));

      setGenerationSteps(prev => {
        const newSteps = [...prev];
        newSteps[i] = {
          ...newSteps[i],
          name: newSteps[i]?.name || 'Processing...',
          status: 'running' as const,
          progress: 0
        };
        return newSteps;
      });

      // Simulate progress
      for (let j = 0; j <= 100; j += 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setGenerationSteps(prev => {
          const newSteps = [...prev];
          newSteps[i] = {
            name: newSteps[i]?.name || 'Processing...',
            status: newSteps[i]?.status || 'running',
            progress: j
          } as GenerationStep;
          return newSteps;
        });
      }

      setGenerationSteps(prev => {
        const newSteps = [...prev];
        newSteps[i] = {
          ...newSteps[i],
          name: newSteps[i]?.name || 'Processing...',
          status: 'completed' as const,
          progress: 100,
          duration: 800 + Math.random() * 400
        };
        return newSteps;
      });

      addAction({
        type: 'success',
        message: `Completed: ${generationSteps[i]?.name || 'Unknown step'}`
      });
    }

    // // setMusicState('confirmed'); // Music state disabled
    setTimeout(() => {
      onComplete?.(state);
      exit();
    }, 2000);
  }, [generationSteps, state, onComplete, exit, addAction]);

  // Render current step
  const renderStep = () => {
    switch (state.step) {
      case 0: // Intro
        return <IntroStep onNext={handleStepComplete} />;

      case 1: // Project Configuration
        return (
          <ProjectStep
            state={state}
            setState={setState}
            onBack={handleBack}
            onNext={handleStepComplete}
            config={config}
            addAction={addAction}
          />
        );

      case 2: // Connections
        return (
          <ConnectionsStep
            state={state}
            setState={setState}
            onBack={handleBack}
            onNext={handleStepComplete}
            config={config}
            addAction={addAction}
          />
        );

      case 3: // Agents
        return (
          <AgentsStep
            state={state}
            setState={setState}
            onBack={handleBack}
            onNext={handleStepComplete}
            config={config}
            onAddAgent={handleAddAgent}
            onUpdateAgent={handleUpdateAgent}
            onRemoveAgent={handleRemoveAgent}
            addAction={addAction}
          />
        );

      case 4: // Integrations
        return (
          <IntegrationsStep
            state={state}
            setState={setState}
            onBack={handleBack}
            onNext={handleStepComplete}
            config={config}
            addAction={addAction}
          />
        );

      case 5: // Template
        return (
          <TemplateStep
            state={state}
            setState={setState}
            onBack={handleBack}
            onGenerate={handleGenerate}
            config={config}
            getTemplateFiles={getTemplateFiles}
            onFileToggle={handleFileToggle}
            addAction={addAction}
          />
        );

      case 6: // Generation Progress
        return (
          <GenerationStep
            state={state}
            config={config}
            steps={generationSteps}
            events={actions}
          />
        );

      default:
        return null;
    }
  };

  // Step components (implemented as separate components for clarity)
  const IntroStep = ({ onNext }: { onNext: () => void }) => (
    <InitShell
      title="@dcversus/prp"
      stepIndex={0}
      totalSteps={6}
      icon="♫"
      footerKeys={['Enter', 'Esc']}
    >
      <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
        <Box marginBottom={3}>
          <Text color={config.colors.accent_orange} bold>
            ♫ @dcversus/prp
          </Text>
        </Box>

        <Box marginBottom={2}>
          <Text color={config.colors.muted} italic>
            "Tools should vanish; flow should remain."
          </Text>
          <Text color={config.colors.muted}>
            — workshop note
          </Text>
        </Box>

        <Box marginBottom={3} flexDirection="column" alignItems="center">
          <Text>This flow will provision your workspace and first PRP.</Text>
          <Text>One input at a time. Minimal. Reversible.</Text>
        </Box>

        <Box marginTop={3}>
          <Text color={config.colors.muted} dimColor>
            Press Enter to begin • Press Esc to exit
          </Text>
        </Box>
      </Box>
    </InitShell>
  );

  const ProjectStep = ({ state, setState, onBack, config }: any) => (
    <InitShell
      title="Project"
      stepIndex={1}
      totalSteps={6}
      icon="♫"
      footerKeys={['Enter', 'Esc', '↑/↓ move', '␣ toggle multiline']}
      onBack={onBack}
    >
      <Box flexDirection="column" flexGrow={1}>
        <FieldText
          label="Project name"
          value={state.projectName}
          onChange={(value) => setState({
            ...state,
            projectName: value,
            projectPath: value ? value.toLowerCase().replace(/[^a-z0-9]/g, '-') : ''
          })}
          notice="taken from package.json"
          config={config}
          autoFocus={true}
        />

        <FieldTextBlock
          label="Prompt"
          value={state.projectPrompt}
          onChange={(value) => setState({ ...state, projectPrompt: value })}
          rows={8}
          minHeight={4}
          maxHeight={12}
          tip="From this description we scaffold the MVP. Continue detailing in PRPs/…"
          config={config}
          multiline={true}
          placeholder="Build an autonomous orchestration CLI that monitors PRPs, spawns agents, and enforces signal-driven workflow with TDD and Claude Code reviews."
        />

        <Box flexDirection="column" marginTop={1}>
          <Box flexDirection="row" alignItems="center" marginBottom={1}>
            <Text color={config.colors.muted}>Folder:</Text>
            <Box marginLeft={1}>
              <Text color={config.colors.accent_orange}>
                {process.cwd()}/{state.projectPath || 'project-name'}
              </Text>
            </Box>
          </Box>
          <Text color={config.colors.muted}>
            Updates live as you edit Project name. Default: ./project-name
          </Text>
        </Box>
      </Box>
    </InitShell>
  );

  const ConnectionsStep = ({ state, setState, onBack, config }: any) => (
    <InitShell
      title="Connections"
      stepIndex={2}
      totalSteps={6}
      icon="♬"
      footerKeys={['Enter', 'Esc', '←/→ switch provider', '⌥v paste secret', 'D see raw JSON']}
      onBack={onBack}
    >
      <FieldSelectCarousel
        label="Provider"
        items={['OpenAI', 'Anthropic', 'Custom']}
        selectedIndex={['OpenAI', 'Anthropic', 'Custom'].indexOf(
          state.provider === 'openai' ? 'OpenAI' :
            state.provider === 'anthropic' ? 'Anthropic' : 'Custom'
        )}
        onChange={(index) => {
          const providers = ['openai', 'anthropic', 'custom'];
          setState({ ...state, provider: providers[index] as 'openai' | 'anthropic' | 'custom' });
        }}
        config={config}
      />

      <FieldSelectCarousel
        label="Auth"
        items={['OAuth (default)', 'API key']}
        selectedIndex={state.authType === 'oauth' ? 0 : 1}
        onChange={(index) => setState({ ...state, authType: index === 0 ? 'oauth' : 'api-key' })}
        config={config}
      />

      {state.authType === 'api-key' && (
        <FieldSecret
          label="API key"
          value={state.apiKey || ''}
          onChange={(value) => setState({ ...state, apiKey: value })}
          placeholder="sk-********************************"
        />
      )}

      {state.provider === 'custom' && (
        <>
          <FieldSelectCarousel
            label="Type"
            items={['OpenAI', 'Anthropic']}
            selectedIndex={state.customProvider?.type === 'anthropic' ? 1 : 0}
            onChange={(index) => setState({
              ...state,
              customProvider: {
                ...state.customProvider,
                type: index === 1 ? 'anthropic' : 'openai',
                baseUrl: state.customProvider?.baseUrl || 'https://llm.company.local/v1',
                apiToken: state.customProvider?.apiToken || '',
                customArgs: state.customProvider?.customArgs || '{"timeout": 45000, "seed": 7}'
              }
            })}
            config={config}
          />

          <FieldText
            label="Base URL"
            value={state.customProvider?.baseUrl || ''}
            onChange={(value) => setState({
              ...state,
              customProvider: { ...state.customProvider, baseUrl: value }
            })}
            placeholder="https://llm.company.local/v1"
            config={config}
          />

          <FieldSecret
            label="API token"
            value={state.customProvider?.apiToken || ''}
            onChange={(value) => setState({
              ...state,
              customProvider: { ...state.customProvider, apiToken: value }
            })}
            placeholder="***************"
          />

          <FieldJSON
            label="Custom args (JSON)"
            text={state.customProvider?.customArgs || '{}'}
            onChange={(value) => setState({
              ...state,
              customProvider: { ...state.customProvider, customArgs: value }
            })}
            config={config}
            placeholder='{"timeout": 45000, "seed": 7}'
          />
        </>
      )}

      <Box flexDirection="column" marginTop={1}>
        <Text color={config.colors.muted} dimColor>
          This LLM is used for orchestrator + inspector.
        </Text>
      </Box>
    </InitShell>
  );

  const AgentsStep = ({ state, onBack, config, onUpdateAgent, onRemoveAgent }: any) => (
    <InitShell
      title="Agents"
      stepIndex={3}
      totalSteps={6}
      icon="⚠"
      footerKeys={['Enter', 'Esc', '←/→ switch type', 'A add agent', 'R remove agent']}
      onBack={onBack}
    >
      <FieldSelectCarousel
        label="Type"
        items={['Claude', 'Codex', 'Gemini', 'AMP', 'Other']}
        selectedIndex={0}
        onChange={() => {}} // Implementation would update agent type
        config={config}
      />

      <Box flexDirection="column" marginTop={1}>
        <Text color={config.colors.muted} dimColor>
          Anthropic provider auto-selected; change under "provider".
        </Text>
      </Box>

      <FieldSelectCarousel
        label="Add another after this?"
        items={['Continue', 'Add more…']}
        selectedIndex={0}
        onChange={() => {}} // Implementation would add more agents
        config={config}
      />

      {/* Render existing agents */}
      {state.agents.map((agent: AgentConfig, index: number) => (
        <AgentEditor
          key={index}
          agent={agent}
          agentIndex={index}
          onUpdate={(updatedAgent) => onUpdateAgent(index, updatedAgent)}
          onRemove={() => onRemoveAgent(index)}
          config={config}
          showAdvanced={true}
        />
      ))}
    </InitShell>
  );

  const IntegrationsStep = ({ onBack, config }: any) => (
    <InitShell
      title="Connections (repos/registry)"
      stepIndex={4}
      totalSteps={6}
      icon="♪"
      footerKeys={['Enter', 'Esc', '←/→ switch']}
      onBack={onBack}
    >
      <FieldSelectCarousel
        label="Choose"
        items={['GitHub', 'npm', 'skip']}
        selectedIndex={0}
        onChange={() => {}} // Implementation would handle integration selection
        config={config}
      />

      <Box flexDirection="column" marginTop={2}>
        <Text color={config.colors.muted} dimColor>
          If GitHub:
          Auth          [OAuth]   API URL / Token
          Will create workflows and templates.
        </Text>

        <Box marginTop={1}>
          <Text color={config.colors.muted}>
            If npm:
            Auth          [OAuth]   Token
            Registry      https://registry.npmjs.org
          </Text>
        </Box>
      </Box>
    </InitShell>
  );

  const TemplateStep = ({ state, setState, onBack, config }: any) => (
    <InitShell
      title="Template"
      stepIndex={5}
      totalSteps={6}
      icon="♫"
      footerKeys={['Enter', 'Esc', '↑/↓ move', '→ open subtree', '␣ toggle']}
      onBack={onBack}
    >
      <FieldSelectCarousel
        label="Preset"
        items={['typescript', 'react', 'nestjs', 'fastapi', 'wikijs', 'none']}
        selectedIndex={['typescript', 'react', 'nestjs', 'fastapi', 'wikijs', 'none'].indexOf(state.template)}
        onChange={(index) => {
          const templates = ['typescript', 'react', 'nestjs', 'fastapi', 'wikijs', 'none'] as const;
          setState({ ...state, template: templates[index] });
        }}
        config={config}
      />

      <FieldSelectCarousel
        label=""
        items={['Continue with defaults', 'Configure files ↓']}
        selectedIndex={0}
        onChange={() => {}} // Implementation would toggle file configuration
        config={config}
      />

      {/* Default files preview */}
      <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor={config.colors.gray} padding={1}>
        <Box marginBottom={1}>
          <Text color={config.colors.accent_orange} bold>
            Default template files will be created:
          </Text>
        </Box>

        <Text color={config.colors.ok}>✓</Text>
        <Text color={config.colors.base_fg}> AGENTS.md</Text>

        <Text color={config.colors.ok}>✓</Text>
        <Text color={config.colors.base_fg}> .prprc</Text>

        <Text color={config.colors.ok}>✓</Text>
        <Text color={config.colors.base_fg}> .mcp.json</Text>

        <Text color={config.colors.ok}>✓</Text>
        <Text color={config.colors.base_fg}> CLAUDE.md (symlink to AGENTS.md)</Text>

        <Box marginTop={1}>
          <Text color={config.colors.muted}>
            AGENTS.md and .prprc are mandatory.
          </Text>
        </Box>
      </Box>

      {/* Generate prompt quote option */}
      <FieldToggle
        label={`Generate selected files for "${state.projectPrompt || 'Build an autonomous orchestration CLI…'}"`}
        value={state.generatePromptQuote || false}
        onChange={(value) => setState({ ...state, generatePromptQuote: value })}
        config={config}
      />
    </InitShell>
  );

  const GenerationStep = ({ config, steps, events }: any) => (
    <InitShell
      title={steps.every((s: GenerationStep) => s.status === 'completed') ? 'Generation Complete' : 'Generating...'}
      stepIndex={6}
      totalSteps={6}
      icon={steps.every((s: GenerationStep) => s.status === 'completed') ? '♫' : '⚠'}
      footerKeys={['Enter', 'Esc']}
    >
      <GenerationProgress
        isActive={true}
        events={events}
        config={config}
      />
    </InitShell>
  );

  return renderStep();
};

export default InitFlow;