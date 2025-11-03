/**
 * ♫ TUI Command
 *
 * CLI command to launch the Terminal User Interface
 */

import { Command } from 'commander';
import { launchTUI } from '../tui/index.js';
import { createLayerLogger } from '../shared/logger.js';

const logger = createLayerLogger('tui');

interface TUIOptions {
  theme?: string;
  debug?: boolean;
  noIntro?: boolean;
  noAnimations?: boolean;
  verbose?: boolean;
}

/**
 * Create TUI command
 */
export function createTUICommand(): Command {
  const tuiCmd = new Command('tui')
    .alias('ui')
    .description('Launch Terminal User Interface')
    .option('-t, --theme <theme>', 'Color theme (dark|light)', 'dark')
    .option('-d, --debug', 'Enable debug mode', false)
    .option('--no-intro', 'Skip intro sequence', false)
    .option('--no-animations', 'Disable animations', false)
    .option('-v, --verbose', 'Verbose logging', false)
    .action(async (options: TUIOptions) => {
      try {
        logger.info('launch', 'Launching TUI with options', options);

        // Build TUI configuration
        const tuiConfig = {
          theme: options.theme as 'dark' | 'light',
          animations: {
            enabled: !options.noAnimations,
            intro: {
              enabled: !options.noIntro,
              duration: 10000,
              fps: 12
            },
            status: {
              enabled: !options.noAnimations,
              fps: 4
            },
            signals: {
              enabled: !options.noAnimations,
              waveSpeed: 50,
              blinkSpeed: 1000
            }
          },
          debug: {
            enabled: options.debug || options.verbose,
            maxLogLines: options.verbose ? 200 : 100,
            showFullJSON: options.debug
          }
        };

        // Launch TUI
        await launchTUI(tuiConfig as any);

      } catch (error) {
        logger.error('launch', 'Failed to launch TUI', error instanceof Error ? error : new Error(String(error)));
        console.error('❌ Failed to launch TUI:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return tuiCmd;
}