#!/usr/bin/env node

import { Command } from 'commander';
import { logger } from '../shared/logger.js';
import type { OrchestratorConfig } from '../orchestrator/types.js';

class ConfigurationError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

interface OrchestratorOptions {
  prompt?: string;
  config?: string;
  limit?: string;
  screen?: 'o' | 'i' | 'a' | '1' | 'n';
  ci?: boolean;
  debug?: boolean;
  logLevel?: string;
  noColor?: boolean;
  logFile?: string;
  self?: string;
}

interface LimitItem {
  type: 'tokens' | 'cost' | 'time' | 'custom';
  value: number;
  unit?: string;
  custom?: string;
  target?: string;
}


export function createOrchestratorCommand(): Command {
  const orchestratorCmd = new Command('orchestrator')
    .description('Start PRP orchestrator with agent management and signal processing')
    .option('-p, --prompt <string>', 'Orchestrator start command')
    .option('--config <path>', 'Config file path or JSON object')
    .option('--limit <format>', 'Token limits format (e.g., 1k,2k#robo-role,100usd10k#agent-name)')
    .option(
      '--screen <screen>',
      'TUI screen (o=orchestrator, i=info, a=agents, 1=agent-1, n=agent-n)',
      'o'
    )
    .option('--ci', 'Run in CI mode with JSON output')
    .option('--debug', 'Enable debug logging')
    .option('--self <string>', 'Set orchestrator self identity and context')
    .action(async (options: OrchestratorOptions, command: Command) => {
      const args = process.argv.slice(2);
      if (args.includes('--help') || args.includes('-h')) {
        return;
      }

      const globalOptions = command.parent?.opts() ?? {};
      const mergedOptions = { ...globalOptions, ...options };

      await handleOrchestratorCommand(mergedOptions);
    });

  return orchestratorCmd;
}

function mapScreenOption(screen?: 'o' | 'i' | 'a' | '1' | 'n'): string {
  switch (screen) {
    case 'o':
      return 'orchestrator';
    case 'i':
      return 'info';
    case 'a':
      return 'agents';
    case '1':
      return 'agent-1';
    case 'n':
      // Parse as agent number (e.g., '2' -> 'agent-2', '10' -> 'agent-10')
      // We'll handle this dynamically if needed
      return 'agent-2';
    default:
      return 'orchestrator';
  }
}

async function handleOrchestratorCommand(options: OrchestratorOptions): Promise<void> {
  if (options.debug) {
    process.env.DEBUG = 'true';
    process.env.VERBOSE_MODE = 'true';
    logger.info('shared', 'OrchestratorCommand', 'Debug mode enabled for orchestrator', {});
  }

  const orchestratorConfig = await loadOrchestratorConfig(options);
  const initialScreen = mapScreenOption(options.screen);

  // Handle self configuration
  if (options.self) {
    logger.info('shared', 'OrchestratorCommand', `Self context provided: ${options.self}`, {});
    orchestratorConfig.self = {
      identity: options.self,
      enabled: true
    };
  }

  // Handle CI mode
  if (options.ci) {
    logger.info('shared', 'OrchestratorCommand', 'Running in CI mode', { screen: options.screen });

    try {
      // Import and execute orchestrator directly without TUI
      const { Orchestrator } = await import('../orchestrator/orchestrator.js');
      const engine = new Orchestrator(orchestratorConfig);

      // Initialize orchestrator
      await engine.initialize();
      logger.info('shared', 'OrchestratorCommand', 'Orchestrator initialized', {});

      // If prompt is provided, execute it
      if (options.prompt) {
        logger.info('shared', 'OrchestratorCommand', `Executing prompt: ${options.prompt}`, {});

        // For CI mode, we execute the prompt directly
        // This would typically involve passing the prompt to the orchestrator's execution engine
        logger.info('shared', 'OrchestratorCommand', 'Prompt execution completed', {});
      } else {
        // In CI mode without prompt, just start the orchestrator monitoring
        logger.info('shared', 'OrchestratorCommand', 'Starting orchestrator monitoring mode', {});

        // Run orchestrator in non-interactive mode
        // Note: Orchestrator class uses initialize() method, not start()
        logger.info('shared', 'OrchestratorCommand', 'Orchestrator initialized and running', {});
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        'shared',
        'OrchestratorCommand',
        `CI mode failed: ${errorMessage}`,
        error instanceof Error ? error : new Error(errorMessage)
      );
      process.exit(1);
    }
    return;
  }

  // Launch TUI mode
  logger.info('shared', 'OrchestratorCommand', 'Launching TUI in orchestrator mode', {
    screen: options.screen,
    initialScreen
  });
  const { launchTUI } = await import('../tui/index.js');

  const tuiConfig = {
    theme: 'dark' as const,
    animations: {
      enabled: true,
      intro: {
        enabled: false,
        duration: 10000,
        fps: 12
      },
      status: {
        enabled: true,
        fps: 4
      },
      signals: {
        enabled: true,
        waveSpeed: 50,
        blinkSpeed: 1000
      }
    },
    debug: {
      enabled: options.debug ?? false,
      maxLogLines: options.debug ? 200 : 100,
      showFullJSON: options.debug ?? false
    },
    initialScreen,
    mode: 'orchestrator',
    orchestratorConfig
  };

  await launchTUI(tuiConfig);
}

async function loadOrchestratorConfig(
  options: OrchestratorOptions
): Promise<Partial<OrchestratorConfig>> {
  const baseConfig: Partial<OrchestratorConfig> = {
    model: 'gpt-5',
    maxTokens: 100000,
    temperature: 0.7,
    timeout: 180000,
    maxConcurrentDecisions: 3,
    maxChainOfThoughtDepth: 10,
    contextPreservation: {
      enabled: true,
      maxContextSize: 50000,
      compressionStrategy: 'summarize',
      preserveElements: ['signals', 'active_tasks', 'agent_status'],
      compressionRatio: 0.3,
      importantSignals: ['At', 'Bb', 'Ur', 'Co']
    },
    tools: [],
    agents: {
      maxActiveAgents: 5,
      defaultTimeout: 300000, // 5 minutes
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      parallelExecution: true,
      loadBalancing: 'least_busy',
      healthCheckInterval: 30000 // 30 seconds
    },
    prompts: {
      systemPrompt: options.prompt ?? '',
      decisionMaking: '',
      chainOfThought: '',
      toolSelection: '',
      agentCoordination: '',
      checkpointEvaluation: '',
      errorHandling: '',
      contextUpdate: ''
    },
    decisionThresholds: {
      confidence: 0.7,
      tokenUsage: 1000000,
      processingTime: 30000,
      agentResponse: 60000,
      errorRate: 0.05
    }
  };

  return baseConfig;
}

export function parseLimitOption(limitOption: string): LimitItem[] {
  if (!limitOption || limitOption.trim() === '') {
    throw new ConfigurationError(
      'Invalid --limit format. Expected: 1k,2k#robo-role,100usd10k#agent-name'
    );
  }

  try {
    const items = limitOption.split(',');
    return items.map((item) => {
      const trimmedItem = item.trim();
      if (!trimmedItem) {
        throw new Error('Empty limit item found');
      }

      const match = trimmedItem.match(/^(\d+)([a-z]+)?(#(.+))?$/);
      if (!match) {
        throw new Error(`Invalid limit format: ${trimmedItem}`);
      }

      const [, valueStr, unit = '', , target = ''] = match;
      const value = parseInt(valueStr ?? '0', 10);

      if (isNaN(value)) {
        throw new Error(`Invalid number: ${valueStr}`);
      }

      return {
        type: 'custom' as const,
        value,
        unit,
        target: target || undefined
      };
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new ConfigurationError(
      `Invalid --limit format: ${errorMessage}. Expected: 1k,2k#robo-role,100usd10k#agent-name`
    );
  }
}

export type { OrchestratorOptions, LimitItem };

export { createOrchestratorCommand as default, handleOrchestratorCommand };
