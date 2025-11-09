/**
 * ♫ TUI Init - TUI-based Project Initialization
 *
 * Provides TUI-based project initialization following PRP-003 specifications
 * with CI JSON output support and sequential init→orchestrator workflow
 */

import { render } from 'ink';
import React from 'react';
import * as path from 'path';
import { Logger, setLoggerTUIMode } from '../shared/logger.js';
import { ScaffoldingService } from '../services/scaffolding-service.js';
import { createTUIConfig } from '../tui/config/TUIConfig.js';
import type { InitState } from '../tui/components/init/InitFlow.js';

const logger = new Logger();

export interface TUIInitOptions {
  projectName?: string;
  template?: string;
  prompt?: string;
  description?: string;
  force?: boolean;
  ci?: boolean;
  debug?: boolean;
  existingProject?: boolean;
}

export interface CIOutput {
  success: boolean;
  project?: {
    name: string;
    path: string;
    template: string;
    description: string;
  };
  error?: string;
  message?: string;
}

/**
 * Run TUI-based project initialization with CI support
 */
export async function runTUIInit(options: TUIInitOptions = {}): Promise<CIOutput> {
  // Only log in CI mode, keep TUI clean
  if (options.ci) {
    logger.info('shared', 'TUIInit', 'Starting CI init', { options });
  }

  // CI mode: non-interactive JSON output
  if (options.ci) {
    return runCIInit(options);
  }

  // TUI mode: interactive terminal interface - NO CONSOLE LOGS!
  try {
    // Clear terminal for clean fullscreen experience
    process.stdout.write('\x1b[2J\x1b[H'); // Clear screen and move cursor to top-left

    // Enable TUI mode to disable console logging and avoid interfering with Ink
    setLoggerTUIMode(true);

    // Create TUI config
    const config = createTUIConfig();

    // Prepare initial state from options
    const initialState: Partial<InitState> = {
      projectName: options.projectName || '',
      projectPrompt: options.prompt || options.description || '',
      template: mapTemplateOption(options.template) || 'typescript',
      projectPath: options.projectName ? options.projectName.toLowerCase().replace(/[^a-z0-9]/g, '-') : '',
    };

    // Create scaffolding service
    const scaffoldingService = new ScaffoldingService();

    // Import InitFlow dynamically to handle JSX properly
    const { InitFlow } = await import('../tui/components/init/InitFlow.js');

    // Render TUI init flow with proper options
    const { waitUntilExit } = render(
      React.createElement(InitFlow, {
        config: config,
        initialState: initialState,
        onComplete: async (state: InitState) => {
          // Generate project using ScaffoldingService
          const result = await generateProject(scaffoldingService, state);

          // Restore normal logging before starting orchestrator
          setLoggerTUIMode(false);

          // Start orchestrator in new project directory if not in CI mode
          if (result.success && result.project) {
            await startOrchestrator(result.project.path);
          }

          // Exit the TUI
          process.exit(0);
        },
        onCancel: () => {
          // Restore normal logging before exit
          setLoggerTUIMode(false);
          process.exit(0);
        }
      }),
      {
        // Ensure console output doesn't interfere with Ink
        patchConsole: true,
        // Allow custom Ctrl+C handling
        exitOnCtrlC: false
      }
    );

    await waitUntilExit();

    // Should never reach here due to process.exit() above
    // Restore normal logging just in case
    setLoggerTUIMode(false);
    return { success: false, error: 'TUI terminated unexpectedly' };

  } catch (error) {
    // Restore normal logging on error
    setLoggerTUIMode(false);
    // Only log if not in CI mode to avoid JSON pollution
    if (!options.ci) {
      console.error('TUI init failed:', error instanceof Error ? error.message : String(error));
    }
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Run CI mode: non-interactive project generation with JSON output
 */
async function runCIInit(options: TUIInitOptions): Promise<CIOutput> {
  logger.info('shared', 'TUIInit', 'Running CI mode', { options });

  try {
    // Validate required options for CI mode
    if (!options.projectName) {
      return { success: false, error: 'Project name is required in CI mode' };
    }

    // Create scaffolding service
    const scaffoldingService = new ScaffoldingService();

    // Create init state from CI options
    const state: InitState = {
      step: 5, // Skip to generation
      projectName: options.projectName,
      projectPrompt: options.prompt || options.description || `Project ${options.projectName}`,
      template: mapTemplateOption(options.template) || 'typescript',
      projectPath: path.resolve(process.cwd(), options.projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')),
      provider: 'openai',
      authType: 'api-key',
      // Use defaults for other fields
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
      configureFiles: false,
      selectedFiles: new Set(['src/', 'README.md', '.gitignore', 'package.json']),
      generatePromptQuote: true,
    };

    // Generate project
    const result = await generateProject(scaffoldingService, state);

    // Output JSON result for CI
    console.log(JSON.stringify(result, null, 2));

    return result;

  } catch (error) {
    const errorResult = { success: false, error: error instanceof Error ? error.message : String(error) };
    console.log(JSON.stringify(errorResult, null, 2));
    return errorResult;
  }
}

/**
 * Map template option string to InitState template type
 */
function mapTemplateOption(template?: string): InitState['template'] {
  if (!template) return 'typescript';

  const templateMap: Record<string, InitState['template']> = {
    'ts': 'typescript',
    'typescript': 'typescript',
    'react': 'react',
    'nest': 'nestjs',
    'nestjs': 'nestjs',
    'fastapi': 'fastapi',
    'python': 'fastapi',
    'wikijs': 'wikijs',
    'wiki': 'wikijs',
    'none': 'none',
    'minimal': 'none',
    'basic': 'none'
  };

  return templateMap[template.toLowerCase()] || 'typescript';
}

/**
 * Generate real project from init state
 */
async function generateProject(scaffoldingService: ScaffoldingService, state: InitState): Promise<CIOutput> {
  logger.info('shared', 'TUIInit', 'Generating project from TUI state', {
    projectName: state.projectName,
    template: state.template,
    prompt: state.projectPrompt
  });

  try {
    // Prepare scaffolding options from init state
    const scaffoldOptions = {
      projectName: state.projectName,
      targetPath: state.projectPath || state.projectName,
      template: state.template,
      description: state.projectPrompt || `Project ${state.projectName}`,
      prompt: state.projectPrompt,
      author: '', // Could be extracted from wizard state
      email: '', // Could be extracted from wizard state
      gitInit: true,
      installDeps: false, // Let user decide
      force: true,
      upgrade: false,
      ci: false,
      default: false,
      variables: {
        PROJECT_NAME: state.projectName,
        PROJECT_DESCRIPTION: state.projectPrompt || '',
        TEMPLATE: state.template,
        PROVIDER: state.provider,
        AUTH_TYPE: state.authType,
      }
    };

    // Scaffold the project using the real ScaffoldingService
    await scaffoldingService.scaffold(scaffoldOptions);

    const projectPath = state.projectPath || state.projectName;

    logger.info('shared', 'TUIInit', `✅ Project "${state.projectName}" generated successfully at ${projectPath}`);

    return {
      success: true,
      project: {
        name: state.projectName,
        path: projectPath,
        template: state.template || 'typescript',
        description: state.projectPrompt || `Project ${state.projectName}`
      }
    };

  } catch (error) {
    logger.error('shared', 'TUIInit', 'Project generation failed', error instanceof Error ? error : new Error(String(error)));
    return {
      success: false,
      error: `Failed to generate project: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Start orchestrator in the specified project directory
 */
async function startOrchestrator(projectPath: string): Promise<void> {
  logger.info('shared', 'TUIInit', `Starting orchestrator in project directory: ${projectPath}`);

  try {
    // Change to project directory
    process.chdir(projectPath);

    // Import and run orchestrator command
    const { handleOrchestratorCommand } = await import('./orchestrator.js');
    await handleOrchestratorCommand({});

  } catch (error) {
    logger.error('shared', 'TUIInit', 'Failed to start orchestrator', error instanceof Error ? error : new Error(String(error)));
    // Don't throw - just log error since project was created successfully
  }
}

export default runTUIInit;