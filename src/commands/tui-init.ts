/**
 * ♫ TUI Init - TUI-based Project Initialization
 *
 * Provides TUI-based project initialization following PRP-003 specifications
 * with CI JSON output support and sequential init→orchestrator workflow
 */

import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import * as path from 'path';
import { Logger, setLoggerTUIMode } from '../shared/logger.js';
import { ScaffoldingService } from '../shared/services/scaffolding-service.js';
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
  tui?: boolean;
  quick?: boolean;
  screen?: 'intro' | 'project' | 'connections' | 'agents' | 'integrations' | 'template';
  config?: string;
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
      projectName: options.projectName ?? '',
      projectPrompt: options.prompt ?? options.description ?? '',
      template: mapTemplateOption(options.template),
      projectPath: options.projectName
        ? options.projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')
        : ''
    };

    // Create scaffolding service
    const scaffoldingService = new ScaffoldingService();

    // Import InitFlow and ThemeProvider dynamically to handle JSX properly
    const { InitFlow } = await import('../tui/components/init/InitFlow.js');
    const { ThemeProvider } = await import('../tui/config/theme-provider.js');

    // Render TUI init flow with proper theme wrapping
    const { waitUntilExit } = render(
      React.createElement(ThemeProvider, {
        mode: 'day' as const,
        autoDetect: true,
        children: React.createElement(InitFlow, {
          config: config,
          initialState: initialState,
          onComplete: (state: InitState) => {
            // Generate project using ScaffoldingService
            generateProject(scaffoldingService, state)
              .then(async (result) => {
                // Restore normal logging before starting orchestrator
                setLoggerTUIMode(false);

                // Start orchestrator in new project directory if not in CI mode
                if (result.success && result.project) {
                  await startOrchestrator(result.project.path);
                }

                // Exit the TUI
                process.exit(0);
              })
              .catch((error) => {
                // Restore normal logging on error
                setLoggerTUIMode(false);
                logger.error(
                  'shared',
                  'TUIInit',
                  `Failed to complete initialization: ${error instanceof Error ? error.message : String(error)}`,
                  error instanceof Error ? error : new Error(String(error))
                );
                process.exit(1);
              });
          },
          onCancel: () => {
            // Restore normal logging before exit
            setLoggerTUIMode(false);
            process.exit(0);
          }
        })
      }),
      {
        // Ensure console output doesn't interfere with Ink
        patchConsole: true,
        // Allow custom Ctrl+C handling
        exitOnCtrlC: false
      }
    );

    await waitUntilExit();

    // Restore normal logging just in case
    setLoggerTUIMode(false);
    // Should never reach here due to process.exit() above
    return { success: false, error: 'TUI terminated unexpectedly' };
  } catch (error) {
    // Restore normal logging on error
    setLoggerTUIMode(false);
    logger.error(
      'shared',
      'TUIInit',
      `TUI init failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : new Error(String(error))
    );
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
      projectPrompt: options.prompt ?? options.description ?? `Project ${options.projectName}`,
      template: mapTemplateOption(options.template),
      projectPath: path.resolve(
        process.cwd(),
        options.projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')
      ),
      provider: 'openai',
      authType: 'api-key',
      agents: [
        {
          id: 'robo-developer',
          type: 'claude',
          limit: '100usd10k#dev',
          cv: 'Full-stack developer with expertise in TypeScript, Node.js, and React',
          provider: 'anthropic',
          compact_prediction: {
            percent_threshold: 0.82,
            auto_adjust: true,
            cap: 10000
          }
        }
      ],
      integrations: {},
      configureFiles: false,
      selectedFiles: new Set(['src/', 'README.md', '.gitignore', 'package.json']),
      generatePromptQuote: true
    };

    // Generate project
    const result = await generateProject(scaffoldingService, state);

    // Output JSON result for CI
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');

    return result;
  } catch (error) {
    const errorResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
    process.stdout.write(JSON.stringify(errorResult, null, 2) + '\n');
    return errorResult;
  }
}

/**
 * Map template option string to InitState template type
 */
function mapTemplateOption(
  template?: string
): 'typescript' | 'react' | 'nestjs' | 'fastapi' | 'wikijs' | 'none' {
  if (!template) {
    return 'typescript';
  }

  const templateMap: Record<
    string,
    'typescript' | 'react' | 'nestjs' | 'fastapi' | 'wikijs' | 'none'
  > = {
    ts: 'typescript',
    typescript: 'typescript',
    react: 'react',
    nest: 'nestjs',
    nestjs: 'nestjs',
    fastapi: 'fastapi',
    python: 'fastapi',
    wikijs: 'wikijs',
    wiki: 'wikijs',
    none: 'none',
    minimal: 'none',
    basic: 'none'
  };

  return templateMap[template.toLowerCase()] ?? 'typescript';
}

/**
 * Generate real project from init state
 */
async function generateProject(
  scaffoldingService: ScaffoldingService,
  state: InitState
): Promise<CIOutput> {
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
        AUTH_TYPE: state.authType
      }
    };

    // Scaffold the project using the real ScaffoldingService
    await scaffoldingService.scaffold(scaffoldOptions);

    const projectPath = state.projectPath || state.projectName;

    logger.info(
      'shared',
      'TUIInit',
      `✅ Project "${state.projectName}" generated successfully at ${projectPath}`
    );

    return {
      success: true,
      project: {
        name: state.projectName,
        path: projectPath,
        template: state.template,
        description: state.projectPrompt
      }
    };
  } catch (error) {
    logger.error(
      'shared',
      'TUIInit',
      'Project generation failed',
      error instanceof Error ? error : new Error(String(error))
    );
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
    logger.error(
      'shared',
      'TUIInit',
      'Failed to start orchestrator',
      error instanceof Error ? error : new Error(String(error))
    );
    // Don't throw - just log error since project was created successfully
  }
}

/**
 * Create TUI init command for CLI
 */
export function createTUIInitCommand(): Command {
  const tuiInitCmd = new Command('init')
    .description('Initialize a new PRP project using TUI interface')
    .argument('[projectName]', 'project name (optional)')
    // TUI-specific options
    .option('--tui', 'Force TUI mode (enabled by default)')
    .option('--quick', 'Quick init mode with defaults')
    .option(
      '--screen <screen>',
      'Start at specific screen (intro|project|connections|agents|integrations|template)',
      'intro'
    )
    .option('--config <path>', 'Path to configuration file')
    // Project options
    .option('--prompt <string>', 'Project base prompt from what project start auto build')
    .option('--project-name <string>', 'Project name (alternative to positional argument)')
    .option('--template <template>', 'project template (react, nestjs, wikijs, typescript, none)')
    .option('--description <description>', 'project description')
    .option('--force', 'Force initialization even in non-empty directories')
    // Global flags
    .option('--ci', 'Run in CI mode with JSON output')
    .option('--debug', 'Enable debug logging')
    .action(async (projectName: string | undefined, options: TUIInitOptions, command: Command) => {
      // Check if help is being requested - if so, let Commander handle it
      const args = process.argv.slice(2);
      if (args.includes('--help') || args.includes('-h')) {
        return; // Let Commander's built-in help handler take over
      }

      // Merge global options from parent command
      const globalOptions = command.parent?.opts() ?? {};
      const mergedOptions = { ...globalOptions, ...options, projectName };

      await handleTUIInitCommand(mergedOptions);
    });

  return tuiInitCmd;
}

/**
 * Handle TUI init command execution
 */
async function handleTUIInitCommand(options: TUIInitOptions): Promise<void> {
  try {
    // Set debug logging if debug flag is provided
    if (options.debug) {
      process.env.DEBUG = 'true';
      process.env.VERBOSE_MODE = 'true';
    }

    logger.info('shared', 'TUIInitCommand', 'Starting TUI init command', { options });

    // Validate screen option
    const validScreens = ['intro', 'project', 'connections', 'agents', 'integrations', 'template'];
    if (options.screen && !validScreens.includes(options.screen)) {
      throw new Error(
        `Invalid screen: ${options.screen}. Valid options: ${validScreens.join(', ')}`
      );
    }

    // Run TUI init with enhanced options
    const result = await runTUIInit({
      ...options,
      // Force TUI mode unless CI mode is explicitly requested
      tui: options.tui ?? !options.ci,
      // Pass screen-specific options to the TUI
      screen: options.screen ?? 'intro',
      quick: options.quick ?? false
    });

    // Exit with appropriate code
    if (!result.success) {
      logger.error('shared', 'TUIInitCommand', `TUI init failed: ${result.error}`);
      process.exit(1);
    }

    logger.info('shared', 'TUIInitCommand', 'TUI init completed successfully');
  } catch (error) {
    logger.error(
      'shared',
      'TUIInitCommand',
      `TUI init command failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : new Error(String(error))
    );
    process.exit(1);
  }
}

export default runTUIInit;
