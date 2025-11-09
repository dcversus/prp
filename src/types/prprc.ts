/**
 * ♫ PrpRc Configuration Types
 *
 * Configuration interface types aligned with PRP-001 specification.
 * Implements proper configuration hierarchy: defaults < .prprc < .prp/.prprc
 */

import type { AgentConfig } from '../config/agent-config.js';

/**
 * Core PrpRc interface specification from PRP-001
 */
export interface PrpRc {
  // System configuration
  telemetry?: boolean; // default true
  config_path?: string; // path for config with secrets or personal settings, default is .prp/.prprc
  limit: string; // our limit text format and alias to limit cli option
  instructions_path: string; // default AGENTS.md and alias to instructions_path cli option
  log_level?: 'error' | 'warn' | 'info' | 'debug' | 'verbose'; // alias to log_level cli option
  no_color?: string; // alias to no_color cli option
  log_file?: string; // alias to log_file cli option
  mcp_port?: number; // alias to mcp_port cli option
  debug?: boolean; // alias to debug cli option
  ci?: boolean; // alias to ci cli option

  // Project configuration - PRP-001:553-561, agents05.md:342-350
  project: {
    name: string; // From package.json-like
    description?: string; // From prompt
    template: 'none' | 'typescript' | 'react' | 'fastapi' | 'wikijs' | 'nestjs';
  };

  // AI provider configurations
  providers: Provider[];

  // External service connections
  connections: {
    github: {
      api_url: string;
      token: string; // SECRETS WE KEEPING ONLY IN .prp/.prprc
    };
    npm: {
      token: string; // only in .prp/.prprc
      registry: string;
    };
  };

  // Environment variables
  env: Record<string, string>;

  // Agent configurations (order preserved for priority)
  agents: Agent[];

  // Orchestrator configuration - PRP-007:801-821, PRP-007:194-205
  orchestrator: {
    limit: string; // our limit text format
    instructions_path: string; // default AGENTS.md
    provider: string | string[]; // 'provider-id' OR array for fallback chain
    cap: {
      total: number; // 200000
      base_prompt: number; // 20000
      guideline_prompt: number; // 20000
      agentsmd: number; // 10000
      notes_prompt: number; // 20000
      inspector_payload: number; // 40000
      prp: number; // 20000
      shared_context: number; // 10000
      prp_context: number; // 70000
    };
  };

  // Inspector configuration
  inspector: {
    cap: {
      total: number; // 1000000
      base_prompt: number; // 20000
      guideline_prompt: number; // 20000
      context: 'remainder';
    };
  };

  // Scanner configuration - PRP-007-signal-system-implemented.md:138-147, PRP-007:823-851
  scanner: {
    disabled_signals: string[]; // we stop watch them
    git_change_detection: {
      enabled: boolean; // default true
      watch_paths: string[];
      ignore_patterns: string[];
    };
    prp_change_detection: {
      enabled: boolean; // default true
      watch_paths: string[]; // Default: PRPs/*.md
      cache_versions: boolean;
    };
    file_system_events: {
      enabled: boolean;
      debounce_ms: number; // Default: 500
    };
  };
}

/**
 * AI Provider configuration
 */
export interface Provider {
  id: string;
  limit: string; // our limit text format
  type: 'openai' | 'anthropic' | 'glm';
  temperature: number;
  instructions_path: string; // default AGENTS.md
  base_url: string;
  seed: string;
  extra_args: Record<string, any>; // {"any": "arg", "what": "need add"}
  auth: {
    type: 'api_key' | 'oauth';
    value: string;
    encrypted?: boolean;
    scopes?: string[];
  }; // encrypted fields NOT STORED HERE!! they should go to .prp/.prprc
  config: Record<string, unknown>; // Individual provider configs, like openai top_p, top_k?, max_tokens, stop, by default we merging and overwrite configs value to sdk lib run of selected provider type defaults we have; so it's a union type for anthropic-sdk-typescript messages.create, openai responses.create and z-ai-sdk-typescript chat.create interfaces
}

/**
 * Agent configuration
 */
export interface Agent {
  id: string; // 'claude code' eg
  cv?: string; // short description with recomendations where agent good at and the rest, orchestrator with the list of agents will see this + some our internal description about token limits, caps, type specifc details
  limit: string; // our limit text format
  warning_limit: string; // our limit text format
  provider: string; // 'provider-id'
  type: 'claude' | 'codex' | 'custom'; // if claude, then CLAUDE.md will by symlinked to agent instructions_path
  yolo: boolean; // enable --yolo or --dangerously-skip-permissions or analog
  instructions_path: string; // default AGENTS.md
  permissions: string;
  sub_agents: boolean | string[]; // enabled to default or specified a array of path to role instruction
  sub_agent_paths: string[]; // paths to role instructions
  max_parallel: number; // Max parallel agents
  mcp: boolean | string; // enabled or path to mcp file config. default .mcp.json
  tools: Array<{
    name: string;
    description: string;
    parameters?: unknown;
  }>;
  compact_prediction: {
    percent_threshold: number; // Emit warning at % (default: 75)
    cap: number; // optional, can be calculated
    auto_adjust: boolean; // Auto-adjust based on history
  };
  env: Record<string, string>; // [ENV_NAME]: 'any value we set to this agent before start'
}

/**
 * Configuration merge result
 */
export interface ConfigMergeResult {
  merged: PrpRc;
  sources: {
    defaults: PrpRc;
    user?: PrpRc;
    secrets?: PrpRc;
  };
  metadata: {
    merged_at: string;
    config_paths: {
      user?: string;
      secrets?: string;
    };
  };
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
    value?: unknown;
  }>;
  warnings: Array<{
    path: string;
    message: string;
    suggestion?: string;
  }>;
}

/**
 * Default configuration values
 */
export const DEFAULT_PRPRC: Partial<PrpRc> = {
  telemetry: true,
  config_path: '.prp/.prprc',
  instructions_path: 'AGENTS.md',
  log_level: 'info',
  debug: false,
  ci: false,

  project: {
    name: 'prp-project',
    template: 'none'
  },

  providers: [],

  connections: {
    github: {
      api_url: 'https://api.github.com',
      token: ''
    },
    npm: {
      token: '',
      registry: 'https://registry.npmjs.org'
    }
  },

  env: {},

  agents: [],

  orchestrator: {
    limit: '200k',
    instructions_path: 'AGENTS.md',
    provider: 'anthropic',
    cap: {
      total: 200000,
      base_prompt: 20000,
      guideline_prompt: 20000,
      agentsmd: 10000,
      notes_prompt: 20000,
      inspector_payload: 40000,
      prp: 20000,
      shared_context: 10000,
      prp_context: 70000
    }
  },

  inspector: {
    cap: {
      total: 1000000,
      base_prompt: 20000,
      guideline_prompt: 20000,
      context: 'remainder'
    }
  },

  scanner: {
    disabled_signals: [],
    git_change_detection: {
      enabled: true,
      watch_paths: [],
      ignore_patterns: []
    },
    prp_change_detection: {
      enabled: true,
      watch_paths: ['PRPs/*.md'],
      cache_versions: false
    },
    file_system_events: {
      enabled: false,
      debounce_ms: 500
    }
  }
};

/**
 * Required fields for valid PrpRc configuration
 */
export const REQUIRED_PRPRC_FIELDS: Array<keyof PrpRc> = [
  'limit',
  'instructions_path',
  'project',
  'providers',
  'connections',
  'env',
  'agents',
  'orchestrator',
  'inspector',
  'scanner'
];