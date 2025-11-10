/**
 * ♫ TUI Init Flow Types
 *
 * Comprehensive type definitions for the 6-step initialization wizard
 * following PRP-003 specifications.
 */
import type { TUIConfig } from '../../../shared/types/TUIConfig.js';
export interface InitState {
  // Current step (0-6)
  step: number;
  isComplete: boolean;

  // Step 1: Project
  projectName: string;
  projectPrompt: string;
  projectPath: string;

  // Step 2: Connections
  provider: 'openai' | 'anthropic' | 'glm' | 'custom';
  authType: 'oauth' | 'api-key';
  apiKey?: string;
  glmApiKey?: string;
  customConfig?: {
    type: 'openai' | 'anthropic' | 'glm';
    baseUrl: string;
    apiToken: string;
    customArgs: string;
  };

  // Step 3: Agents
  agents: AgentConfig[];
  currentAgentIndex: number;

  // Step 4: Integrations
  integrations: {
    github?: {
      auth: 'oauth' | 'token';
      apiUrl?: string;
      token?: string;
    };
    npm?: {
      auth: 'oauth' | 'token';
      registry: string;
      token?: string;
    };
  };

  // Step 5: Template
  template: 'typescript' | 'react' | 'nestjs' | 'fastapi' | 'wikijs' | 'none';
  templateConfig: {
    files: string[];
    configureFiles: boolean;
  };
  configureFiles: boolean;
  selectedFiles: Set<string>;
  generatePromptQuote: boolean;

  // Step 6: MCP Configuration
  mcpConfig: {
    enabled: boolean;
    servers: string[]; // context7, chrome-mcp, etc.
    configPath: string;
  };

  // Agent file linking
  agentFileLink: {
    enabled: boolean;
    sourceFile: string; // agents.md or custom
    targetFile: string; // claude.md or custom
  };

  // Validation state
  validation: {
    [key: string]: {
      isValid: boolean;
      message?: string;
    };
  };

  // Navigation state
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface AgentConfig {
  id: string;
  type: 'system-analyst' | 'developer' | 'quality-control' | 'ux-ui-designer' | 'devops-sre' | 'claude' | 'codex' | 'gemini' | 'amp' | 'other';
  limit: string; // Format: "100usd10k#agent-name"
  cv: string;
  warning_limit?: string; // Format: "2k#role-name"
  provider?: 'openai' | 'anthropic' | 'custom';
  yolo?: boolean;
  sub_agents?: boolean;
  max_parallel?: number;
  mcp?: string; // Path to mcp config, empty string to disable
  instructions_path?: string; // Path to instructions file
  compact_prediction: {
    percent_threshold?: number;
    auto_adjust?: boolean;
    cap?: number;
  };
}

export interface InitShellProps {
  stepIndex: number;
  totalSteps: number;
  title: string;
  icon: '♪' | '♬' | '♫' | '⚠';
  children: React.ReactNode;
  footerKeys: string[];
  onBack?: () => void;
  onForward?: () => void;
  onCancel?: () => void;
}

export interface StepHeaderProps {
  icon: '♪' | '♬' | '♫' | '⚠';
  title: string;
  subtitle?: string;
}

// Field component props
export interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  notice?: string;
  tip?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  focused?: boolean;
}

export interface FieldTextProps extends FieldProps {
  type?: 'text';
  config?: TUIConfig;
  autoFocus?: boolean;
}

export interface FieldTextBlockProps extends FieldProps {
  rows?: number;
  maxLength?: number;
  minHeight?: number;
  maxHeight?: number;
  config?: TUIConfig;
}

export interface FieldSecretProps extends FieldProps {
  reveal?: boolean;
  onRevealChange?: (reveal: boolean) => void;
}

export interface FieldSelectCarouselProps {
  label: string;
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  focused?: boolean;
  config?: TUIConfig;
  disabled?: boolean;
  notice?: string;
}

export interface FieldToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  focused?: boolean;
  config?: TUIConfig;
  disabled?: boolean;
  onValue?: string;
  offValue?: string;
}

export interface FieldJSONProps {
  label: string;
  text: string;
  onChange: (text: string) => void;
  placeholder?: string;
  focused?: boolean;
  config?: TUIConfig;
  disabled?: boolean;
  error?: string;
}

// Template configuration
export interface TemplateFile {
  id: string;
  path: string;
  name: string;
  description: string;
  required: boolean;
  checked: boolean;
  children?: TemplateFile[];
}

export interface FileTreeChecksProps {
  nodes: TemplateFile[];
  onToggle: (path: string) => void;
  focused?: boolean;
}

// Agent editor
export interface AgentEditorProps {
  agent: AgentConfig;
  agentIndex: number;
  onUpdate: (agent: AgentConfig) => void;
  onRemove: () => void;
  config?: TUIConfig;
  disabled?: boolean;
  showAdvanced?: boolean;
}

// Generation progress
export interface GenerationEvent {
  type: 'copy' | 'generate' | 'diff' | 'complete' | 'info' | 'error';
  timestamp: Date | number;
  path?: string;
  content?: string;
  diff?: {
    old: string;
    new: string;
  };
  progress?: {
    current: number;
    total: number;
  };
  message?: string;
  id?: string;
}

export interface GenerationProgressProps {
  isActive: boolean;
  events: GenerationEvent[];
  onCancel?: () => void;
  config?: TUIConfig;
}

export interface GenerationStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
  message?: string;
  duration?: number;
}

// Animation types
export interface AnimationFrame {
  content: string;
  duration: number;
}

export interface AnimationState {
  isAnimating: boolean;
  currentFrame: number;
  frames: AnimationFrame[];
}

// Input handling
export interface InputHandler {
  input: string;
  key: {
    escape?: boolean;
    return?: boolean;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    tab?: boolean;
    delete?: boolean;
    backspace?: boolean;
    upArrow?: boolean;
    downArrow?: boolean;
    leftArrow?: boolean;
    rightArrow?: boolean;
  };
}

// Keyboard shortcuts
export const KEYS = {
  ENTER: 'return',
  ESCAPE: 'escape',
  TAB: 'tab',
  ARROW_UP: 'upArrow',
  ARROW_DOWN: 'downArrow',
  ARROW_LEFT: 'leftArrow',
  ARROW_RIGHT: 'rightArrow',
  BACKSPACE: 'backspace',
  DELETE: 'delete',
  CTRL_C: 'ctrl+c',
  CTRL_V: 'ctrl+v'
} as const;

// Validation rules
export interface ValidationRule {
  validate: (value: string) => boolean;
  message: string;
}

export const validationRules = {
  projectName: [
    {
      validate: (value: string) => /^[a-z0-9-]+$/.test(value),
      message: 'Must contain only lowercase letters, numbers, and hyphens'
    },
    {
      validate: (value: string) => value.length >= 3,
      message: 'Must be at least 3 characters long'
    }
  ],
  url: [
    {
      validate: (value: string) => value === '' || /^https?:\/\//.test(value),
      message: 'Must be a valid URL or empty'
    }
  ],
  json: [
    {
      validate: (value: string) => {
        if (value === '') {
          return true;
        }
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Must be valid JSON'
    }
  ]
};

// Default values
export const DEFAULT_STATE: InitState = {
  step: 0,
  isComplete: false,
  projectName: '',
  projectPrompt: '',
  projectPath: '',
  provider: 'openai',
  authType: 'oauth',
  agents: [],
  currentAgentIndex: 0,
  integrations: {},
  template: 'typescript',
  templateConfig: {
    files: [],
    configureFiles: false
  },
  configureFiles: false,
  selectedFiles: new Set(),
  generatePromptQuote: true,
  mcpConfig: {
    enabled: false,
    servers: ['context7', 'chrome-mcp'],
    configPath: '.mcp.json'
  },
  agentFileLink: {
    enabled: true,
    sourceFile: 'agents.md',
    targetFile: 'claude.md'
  },
  validation: {},
  canGoBack: false,
  canGoForward: false
};