/**
 * ♫ TUI Application Entry Point
 *
 * Terminal User Interface for @dcversus/prp with three-screen layout
 * implementing the full specification from PRPs/tui-implementation.md
 */

import React from 'react';
import { render } from 'ink';
import { TUIApp } from './components/TUIApp.js';
import { TUIConfig, createTUIConfig } from './config/TUIConfig.js';
import { EventBus } from '../shared/events.js';
import { createLayerLogger } from '../shared/logger.js';

const logger = createLayerLogger('tui');

/**
 * Main TUI application launcher
 */
export class TUIMain {
  private config: TUIConfig;
  private eventBus: EventBus;
  private cleanup: (() => void) | null = null;

  constructor(customConfig?: Partial<TUIConfig>) {
    this.eventBus = new EventBus();
    this.config = createTUIConfig(customConfig);

    logger.info('TUIMain', 'TUI initialized', {
      terminal: {
        columns: process.stdout.columns,
        rows: process.stdout.rows
      }
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

      // Render the TUI app
      const { waitUntilExit } = render(
        <TUIApp config={this.config} eventBus={this.eventBus} />
      );

      this.cleanup = () => {
        this.cleanupTerminal();
        logger.info('cleanup', 'TUI application cleaned up');
      };

      // Wait for the app to exit
      await waitUntilExit;

    } catch (error) {
      logger.error('start', 'Failed to start TUI', error instanceof Error ? error : new Error(String(error)));
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
    // Hide cursor
    process.stdout.write('\x1b[?25l');

    // Set up terminal resize handling
    process.stdout.on('resize', () => {
      this.eventBus.emit('terminal.resize', {
        columns: process.stdout.columns,
        rows: process.stdout.rows
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
    console.log('🎵 ♫ @dcversus/prp TUI stopped. Goodbye! 🎵');
  }
}

/**
 * Launch TUI from command line
 */
export async function launchTUI(customConfig?: Partial<TUIConfig>): Promise<void> {
  const tui = new TUIMain(customConfig);

  try {
    await tui.start();
  } catch (error) {
    logger.error('launchTUI', 'TUI launch failed', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}