/**
 * ♫ TUI Application Entry Point
 *
 * Terminal User Interface for @dcversus/prp with three-screen layout
 * implementing the full specification from PRPs/tui-implementation.md
 */

import { render } from 'ink';

import { EventBus } from '../shared/events';
import { createLayerLogger, setLoggerTUIMode } from '../shared/logger';

import { TUIApp } from './components/TUIApp';
import { TUIErrorBoundary } from './components/TUIErrorBoundary';
import { createTUIConfig } from './config/TUIConfig';

import type { TUIConfig} from './config/TUIConfig';

const logger = createLayerLogger('tui');

/**
 * Main TUI application launcher
 */
export class TUIMain {
  private readonly config: TUIConfig;
  private readonly eventBus: EventBus;
  private cleanup: (() => void) | null = null;

  constructor(customConfig?: Partial<TUIConfig>) {
    this.eventBus = new EventBus();
    this.config = createTUIConfig(customConfig);

    logger.info('TUIMain', 'TUI initialized', {
      terminal: {
        columns: process.stdout.columns,
        rows: process.stdout.rows,
      },
    });
  }

  /**
   * Start the TUI application
   */
  async start(): Promise<void> {
    try {
      logger.info('start', 'Starting TUI application');

      // Set up terminal
      this.setupTerminal();

      // Render the TUI app with top-level error boundary
      const { waitUntilExit } = render(
        <TUIErrorBoundary debugMode={this.config.debugMode || false}>
          <TUIApp config={this.config} eventBus={this.eventBus} />
        </TUIErrorBoundary>,
      );

      this.cleanup = () => {
        this.cleanupTerminal();
        logger.info('cleanup', 'TUI application cleaned up');
      };

      // Wait for the app to exit
      await waitUntilExit;
    } catch (error) {
      logger.error(
        'start',
        'Failed to start TUI',
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Stop the TUI application
   */
  stop(): void {
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
  }

  /**
   * Setup terminal for TUI
   */
  private setupTerminal(): void {
    // Clear screen completely and move cursor to top-left
    process.stdout.write('\x1b[2J\x1b[H');

    // Hide cursor
    process.stdout.write('\x1b[?25l');

    // Set up terminal resize handling
    process.stdout.on('resize', () => {
      this.eventBus.emit('terminal.resize', {
        columns: process.stdout.columns,
        rows: process.stdout.rows,
      } as Record<string, unknown>);
    });

    // Handle process signals
    process.on('SIGINT', () => {
      this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.stop();
      process.exit(0);
    });
  }

  /**
   * Cleanup terminal state
   */
  private cleanupTerminal(): void {
    // Show cursor
    process.stdout.write('\x1b[?25h');

    // Clear screen
    process.stdout.write('\x1b[2J\x1b[H');

    // Show goodbye message
    logger.info('cleanupTerminal', '🎵 ♫ @dcversus/prp TUI stopped. Goodbye! 🎵');
  }
}

/**
 * Launch TUI from command line
 */
export async function launchTUI(customConfig?: Partial<TUIConfig>): Promise<void> {
  // Set logger to TUI mode to disable console output and avoid interfering with Ink
  // This prevents ALL JSON logs from appearing in TUI mode
  setLoggerTUIMode(true);

  const tui = new TUIMain(customConfig);

  try {
    await tui.start();
  } catch (error) {
    // Only log error if not in TUI mode (to avoid JSON output)
    if (!(logger as any).config?.tuiMode) {
      logger.error(
        'launchTUI',
        'TUI launch failed',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
    process.exit(1);
  } finally {
    // Restore normal logging when TUI exits
    setLoggerTUIMode(false);
  }
}
