/**
 * ♫ System Tools for @dcversus/prp Orchestrator
 *
 * System administration tools including bash commands, file operations,
 * and process management.
 */

import { Tool } from '../types';
import { createLayerLogger } from '../../shared';
import { exec } from 'child_process';
import { promisify } from 'util';

const logger = createLayerLogger('orchestrator');
const execAsync = promisify(exec);

export interface BashCommandParams {
  command: string;
  workingDirectory?: string;
  timeout?: number;
  env?: Record<string, string>;
  shell?: string;
}

export interface ProcessInfo {
  pid: number;
  command: string;
  args: string[];
  cpu?: number;
  memory?: number;
  status: 'running' | 'stopped' | 'zombie';
}

/**
 * Bash Command Tool
 */
export const bashCommandTool: Tool = {
  id: 'bash_command',
  name: 'bash_command',
  description: 'Execute bash commands and shell scripts',
  category: 'system',
  enabled: true,
  parameters: {
    command: {
      type: 'string',
      description: 'Bash command to execute',
      required: true
    },
    workingDirectory: {
      type: 'string',
      description: 'Working directory for command execution',
      required: false
    },
    timeout: {
      type: 'number',
      description: 'Command timeout in milliseconds',
      required: false
    },
    env: {
      type: 'object',
      description: 'Environment variables for command',
      required: false
    },
    shell: {
      type: 'string',
      description: 'Shell to use for execution',
      required: false
    }
  },
  execute: async (params: unknown) => {
    const typedParams = params as BashCommandParams;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const timeout = typedParams.timeout ?? 30000;

      const options = {
        cwd: typedParams.workingDirectory,
        env: { ...process.env, ...typedParams.env },
        shell: typedParams.shell ?? '/bin/bash',
        timeout: timeout
      };

      logger.info('bash_command', `Executing: ${typedParams.command}`, {
        cwd: options.cwd,
        timeout
      });

      const child = exec(typedParams.command, options, (error, stdout, stderr) => {
        const executionTime = Date.now() - startTime;

        if (error) {
          logger.error('bash_command', `Command failed: ${typedParams.command}`, error);

          resolve({
            success: false,
            data: {
              command: typedParams.command,
              exitCode: error.code,
              signal: error.signal,
              stdout: stdout,
              stderr: stderr,
              executionTime,
              error: error.message
            },
            executionTime
          });
        } else {
          logger.info('bash_command', `Command completed: ${typedParams.command}`, {
            exitCode: 0,
            executionTime
          });

          resolve({
            success: true,
            data: {
              command: typedParams.command,
              exitCode: 0,
              stdout: stdout,
              stderr: stderr,
              executionTime
            },
            executionTime
          });
        }
      });

      // Handle timeout
      if (timeout) {
        setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`Command timeout after ${timeout}ms: ${typedParams.command}`));
        }, timeout);
      }
    });
  }
};

/**
 * Process List Tool
 */
export const processListTool: Tool = {
  id: 'process_list',
  name: 'process_list',
  description: 'List running processes with filtering options',
  category: 'system',
  enabled: true,
  parameters: {
    filter: {
      type: 'string',
      description: 'Filter processes by name or command',
      required: false
    },
    includeAll: {
      type: 'boolean',
      description: 'Include all user processes (not just current user)',
      required: false
    },
    sortBy: {
      type: 'string',
      description: 'Sort processes by field',
      required: false,
      enum: ['pid', 'cpu', 'memory', 'command']
    }
  },
  execute: async (params: unknown) => {
    const typedParams = params as {
      filter?: string;
      includeAll?: boolean;
      sortBy?: string;
    };

    try {
      // Build ps command based on parameters
      let psCommand = 'ps aux';
      if (!typedParams.includeAll) {
        psCommand = `ps -u ${process.env.USER} -o pid,ppid,cmd,%cpu,%mem,stat`;
      }

      const { stdout } = await execAsync(psCommand);

      const lines = stdout.split('\n').slice(1); // Skip header
      const processes: ProcessInfo[] = [];

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        // Parse ps output (simplified parsing)
        const parts = line.trim().split(/\s+/);
        if (parts.length < 4) {
          continue;
        }

        const pid = parseInt(parts[0], 10);
        const command = parts.slice(10).join(' ') || '';

        // Apply filter if specified
        if (typedParams.filter && !command.toLowerCase().includes(typedParams.filter.toLowerCase())) {
          continue;
        }

        processes.push({
          pid,
          command,
          args: command.split(/\s+/),
          cpu: parseFloat(parts[2] || '0') || 0,
          memory: parseFloat(parts[3] || '0') || 0,
          status: 'running' // Simplified status
        });
      }

      // Sort processes
      const sortBy = typedParams.sortBy ?? 'pid';
      processes.sort((a, b) => {
        switch (sortBy) {
          case 'cpu':
            return (b.cpu ?? 0) - (a.cpu ?? 0);
          case 'memory':
            return (b.memory ?? 0) - (a.memory ?? 0);
          case 'command':
            return a.command.localeCompare(b.command);
          default:
            return a.pid - b.pid;
        }
      });

      logger.info('process_list', `Listed ${processes.length} processes`, {
        filter: typedParams.filter,
        sortBy
      });

      return {
        success: true,
        data: {
          processes,
          count: processes.length,
          filter: typedParams.filter,
          sortBy
        },
        executionTime: 0
      };

    } catch (error) {
      logger.error('process_list', 'Failed to list processes', error instanceof Error ? error : new Error(String(error)));

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: 0
      };
    }
  }
};

/**
 * File System Tool
 */
export const fileSystemTool: Tool = {
  id: 'file_system',
  name: 'file_system',
  description: 'File system operations: list, read, write, remove files and directories',
  category: 'system',
  enabled: true,
  parameters: {
    operation: {
      type: 'string',
      description: 'File system operation',
      required: true,
      enum: ['list', 'read', 'write', 'remove', 'mkdir', 'exists']
    },
    path: {
      type: 'string',
      description: 'File or directory path',
      required: true
    },
    content: {
      type: 'string',
      description: 'Content for write operations',
      required: false
    },
    recursive: {
      type: 'boolean',
      description: 'Recursive operation for directories',
      required: false
    }
  },
  execute: async (params: unknown) => {
    const typedParams = params as {
      operation: string;
      path: string;
      content?: string;
      recursive?: boolean;
    };

    try {
      const fs = await import('fs/promises');

      switch (typedParams.operation) {
        case 'list': {
          const entries = await fs.readdir(typedParams.path, { withFileTypes: true });
          const items = entries.map(entry => ({
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: 0, // Would need stat call for actual size
            modified: new Date()
          }));

          return {
            success: true,
            data: {
              path: typedParams.path,
              items,
              count: items.length
            },
            executionTime: 0
          };
        }

        case 'read': {
          const content = await fs.readFile(typedParams.path, 'utf8');
          return {
            success: true,
            data: {
              path: typedParams.path,
              content,
              size: content.length
            },
            executionTime: 0
          };
        }

        case 'write': {
          await fs.writeFile(typedParams.path, typedParams.content ?? '', 'utf8');
          return {
            success: true,
            data: {
              path: typedParams.path,
              size: (typedParams.content ?? '').length,
              operation: 'written'
            },
            executionTime: 0
          };
        }

        case 'remove': {
          if (typedParams.recursive) {
            await fs.rm(typedParams.path, { recursive: true, force: true });
          } else {
            await fs.unlink(typedParams.path);
          }
          return {
            success: true,
            data: {
              path: typedParams.path,
              operation: 'removed',
              recursive: typedParams.recursive
            },
            executionTime: 0
          };
        }

        case 'mkdir': {
          await fs.mkdir(typedParams.path, { recursive: true });
          return {
            success: true,
            data: {
              path: typedParams.path,
              operation: 'created'
            },
            executionTime: 0
          };
        }

        case 'exists': {
          try {
            await fs.access(typedParams.path);
            return {
              success: true,
              data: {
                path: typedParams.path,
                exists: true
              },
              executionTime: 0
            };
          } catch {
            return {
              success: true,
              data: {
                path: typedParams.path,
                exists: false
              },
              executionTime: 0
            };
          }
        }

        default:
          throw new Error(`Unknown operation: ${typedParams.operation}`);
      }

    } catch (error) {
      logger.error('file_system', `File system operation failed: ${typedParams.operation}`, error instanceof Error ? error : new Error(String(error)));

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: 0
      };
    }
  }
};

/**
 * System Information Tool
 */
export const systemInfoTool: Tool = {
  id: 'system_info',
  name: 'system_info',
  description: 'Get system information including OS, memory, disk, and network status',
  category: 'system',
  enabled: true,
  parameters: {
    category: {
      type: 'string',
      description: 'Information category to retrieve',
      required: false,
      enum: ['all', 'os', 'memory', 'disk', 'network', 'processes']
    }
  },
  execute: async (params: unknown) => {
    const typedParams = params as { category?: string };
    const category = typedParams.category ?? 'all';

    try {
      const systemInfo: any = {};

      if (category === 'all' || category === 'os') {
        const { stdout: osInfo } = await execAsync('uname -a');
        systemInfo.os = {
          platform: process.platform,
          arch: process.arch,
          version: osInfo.trim(),
          nodeVersion: process.version,
          uptime: process.uptime()
        };
      }

      if (category === 'all' || category === 'memory') {
        const { stdout: memInfo } = await execAsync('free -h 2>/dev/null || echo "Memory info not available"');
        systemInfo.memory = {
          total: memInfo.includes('Mem:') ? memInfo.split('\n')[1]?.split(/\s+/)[1] : 'N/A',
          used: memInfo.includes('Mem:') ? memInfo.split('\n')[1]?.split(/\s+/)[2] : 'N/A',
          free: memInfo.includes('Mem:') ? memInfo.split('\n')[1]?.split(/\s+/)[3] : 'N/A',
          processMemory: process.memoryUsage()
        };
      }

      if (category === 'all' || category === 'disk') {
        const { stdout: diskInfo } = await execAsync('df -h . 2>/dev/null || echo "Disk info not available"');
        const diskLines = diskInfo.split('\n');
        if (diskLines.length > 1) {
          const diskData = diskLines[1]?.split(/\s+/);
          systemInfo.disk = {
            filesystem: diskData?.[0],
            size: diskData?.[1],
            used: diskData?.[2],
            available: diskData?.[3],
            usage: diskData?.[4],
            mountPoint: diskData?.[5]
          };
        }
      }

      if (category === 'all' || category === 'network') {
        systemInfo.network = {
          hostname: require('os').hostname(),
          interfaces: require('os').networkInterfaces()
        };
      }

      if (category === 'all' || category === 'processes') {
        const { stdout: processCount } = await execAsync('ps -e | wc -l');
        systemInfo.processes = {
          total: parseInt(processCount.trim(), 10) - 1, // Subtract header
          currentPid: process.pid
        };
      }

      logger.info('system_info', `Retrieved system information for category: ${category}`);

      return {
        success: true,
        data: systemInfo,
        executionTime: 0
      };

    } catch (error) {
      logger.error('system_info', 'Failed to get system information', error instanceof Error ? error : new Error(String(error)));

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: 0
      };
    }
  }
};

// Export all system tools
export const systemTools = [
  bashCommandTool,
  processListTool,
  fileSystemTool,
  systemInfoTool
];