#!/usr/bin/env tsx

/**
 * Video-to-ASCII Dependencies Installer
 *
 * Checks and installs required tools for video processing:
 * - ffmpeg: For video frame extraction
 * - chafa: For high-quality ASCII conversion
 * - ImageMagick: For fallback image processing
 */

import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
import { createLayerLogger } from '../src/shared/logger';

const logger = createLayerLogger('tui');
const execFileAsync = promisify(execFile);

interface ToolInfo {
  name: string;
  command: string;
  versionArg: string;
  install: {
    macos: string[];
    linux: {
      ubuntu: string[];
      debian: string[];
      fedora: string[];
      arch: string[];
    };
    windows?: string[];
  };
}

const tools: ToolInfo[] = [
  {
    name: 'FFmpeg',
    command: 'ffmpeg',
    versionArg: '-version',
    install: {
      macos: ['brew', 'install', 'ffmpeg'],
      linux: {
        ubuntu: ['sudo', 'apt-get', 'install', 'ffmpeg'],
        debian: ['sudo', 'apt-get', 'install', 'ffmpeg'],
        fedora: ['sudo', 'dnf', 'install', 'ffmpeg'],
        arch: ['sudo', 'pacman', '-S', 'ffmpeg'],
      },
      windows: ['choco', 'install', 'ffmpeg'],
    },
  },
  {
    name: 'Chafa',
    command: 'chafa',
    versionArg: '--version',
    install: {
      macos: ['brew', 'install', 'chafa'],
      linux: {
        ubuntu: ['sudo', 'apt-get', 'install', 'chafa'],
        debian: ['sudo', 'apt-get', 'install', 'chafa'],
        fedora: ['sudo', 'dnf', 'install', 'chafa'],
        arch: ['sudo', 'pacman', '-S', 'chafa'],
      },
    },
  },
  {
    name: 'ImageMagick',
    command: 'convert',
    versionArg: '-version',
    install: {
      macos: ['brew', 'install', 'imagemagick'],
      linux: {
        ubuntu: ['sudo', 'apt-get', 'install', 'imagemagick'],
        debian: ['sudo', 'apt-get', 'install', 'imagemagick'],
        fedora: ['sudo', 'dnf', 'install', 'ImageMagick'],
        arch: ['sudo', 'pacman', '-S', 'imagemagick'],
      },
      windows: ['choco', 'install', 'imagemagick.app'],
    },
  },
];

async function checkTool(tool: ToolInfo): Promise<boolean> {
  try {
    await execFileAsync(tool.command, [tool.versionArg]);
    logger.info(`✅ ${tool.name} is installed`);
    return true;
  } catch (error) {
    logger.warn(`❌ ${tool.name} not found`);
    return false;
  }
}

async function installTool(tool: ToolInfo): Promise<void> {
  const os = platform();
  let installCommand: string[];

  if (os === 'darwin') {
    installCommand = tool.install.macos;
  } else if (os === 'linux') {
    // Try to detect Linux distribution
    try {
      const { stdout } = await execFileAsync('lsb_release', ['-si']);
      const distro = stdout.toLowerCase().trim();

      switch (distro) {
        case 'ubuntu':
          installCommand = tool.install.linux.ubuntu;
          break;
        case 'debian':
          installCommand = tool.install.linux.debian;
          break;
        case 'fedora':
          installCommand = tool.install.linux.fedora;
          break;
        case 'arch':
          installCommand = tool.install.linux.arch;
          break;
        default:
          logger.warn(`Unknown Linux distribution: ${distro}`);
          installCommand = tool.install.linux.ubuntu; // Default to Ubuntu
      }
    } catch {
      // If lsb_release is not available, try with Ubuntu as default
      installCommand = tool.install.linux.ubuntu;
    }
  } else if (os === 'win32' && tool.install.windows) {
    installCommand = tool.install.windows;
  } else {
    logger.error(`Unsupported platform: ${os}`);
    return;
  }

  logger.info(`Installing ${tool.name}...`);
  logger.info(`Running: ${installCommand.join(' ')}`);

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(installCommand[0], installCommand.slice(1), {
        stdio: 'inherit',
      });

      child.on('close', (code) => {
        if (code === 0) {
          logger.info(`✅ ${tool.name} installed successfully`);
          resolve();
        } else {
          reject(new Error(`${tool.name} installation failed with code ${code}`));
        }
      });

      child.on('error', reject);
    });
  } catch (error) {
    logger.error(`Failed to install ${tool.name}:`, error as Error);
    throw error;
  }
}

async function main(): Promise<void> {
  logger.info('Checking video-to-ASCII dependencies...');

  const missingTools: ToolInfo[] = [];

  // Check all tools
  for (const tool of tools) {
    const isInstalled = await checkTool(tool);
    if (!isInstalled) {
      missingTools.push(tool);
    }
  }

  if (missingTools.length === 0) {
    logger.info('🎉 All dependencies are installed!');
    return;
  }

  // Ask user if they want to install missing tools
  console.log('\nThe following tools are missing:');
  missingTools.forEach((tool) => console.log(`  - ${tool.name}`));

  console.log('\nInstall missing tools? (y/N)');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  let answer = '';
  for await (const chunk of process.stdin) {
    answer += chunk;
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'n') {
      break;
    }
  }

  process.stdin.setRawMode(false);
  process.stdin.pause();

  if (answer.toLowerCase() !== 'y') {
    logger.info('Installation cancelled.');
    return;
  }

  // Install missing tools
  for (const tool of missingTools) {
    try {
      await installTool(tool);
    } catch (error) {
      logger.error(`Failed to install ${tool.name}. Please install it manually.`);
      console.log(`\nManual installation instructions for ${tool.name}:`);

      const os = platform();
      if (os === 'darwin') {
        console.log(`  brew install ${tool.name.toLowerCase()}`);
      } else if (os === 'linux') {
        console.log(`  Ubuntu/Debian: sudo apt-get install ${tool.name.toLowerCase()}`);
        console.log(`  Fedora: sudo dnf install ${tool.name}`);
        console.log(`  Arch: sudo pacman -S ${tool.name}`);
      } else if (os === 'win32') {
        console.log(`  Windows: choco install ${tool.name.toLowerCase()}`);
      }
      console.log();
    }
  }

  // Verify installation
  console.log('\nVerifying installation...');
  let allInstalled = true;

  for (const tool of tools) {
    const isInstalled = await checkTool(tool);
    if (!isInstalled) {
      allInstalled = false;
    }
  }

  if (allInstalled) {
    logger.info('🎉 All dependencies are now installed!');
    console.log('\nYou can now use video-to-ASCII conversion in the TUI.');
  } else {
    logger.warn('Some tools could not be installed. Please install them manually.');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Installation failed:', error);
    process.exit(1);
  });
}