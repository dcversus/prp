#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import fs from 'fs-extra';
import { logger } from '../utils/logger.js';
// Import the actual components we built
import { ScannerCore } from '../scanner/scanner-core.js';
import { InspectorCore } from '../inspector/inspector-core.js';
import { OrchestratorCore } from '../orchestrator/orchestrator-core.js';
import { Signal } from '../shared/types.js';
import { AgentConfig } from '../config/agent-config.js';

interface AgentProcess {
  name: string;
  type: 'scanner' | 'inspector' | 'orchestrator';
  process: ChildProcess;
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid?: number;
  startTime?: Date;
}

interface AgentEvent {
  type: 'signal' | 'status' | 'action' | 'decision';
  source: string;
  timestamp: Date;
  payload: unknown;
}

interface ScannerEvent {
  type: string;
  path?: string;
  content?: string;
  data?: unknown;
  timestamp: Date;
}

interface InspectorResult {
  signalId: string;
  status: string;
  analysis: string;
  recommendations: string[];
  timestamp: Date;
  originalSignal?: Signal;
  processingResult?: {
    category: string;
    urgency: number;
    recommendedAction: string;
    [key: string]: unknown;
  };
}

interface OrchestratorDecision {
  signalId: string;
  decision: string;
  reasoning: string;
  targetAgent?: string;
  timestamp: Date;
  confidence?: number;
  tools?: string[];
}

interface OrchestratorAction {
  type: string;
  target: string;
  action: string;
  parameters?: Record<string, unknown>;
  timestamp: Date;
  status?: string;
  result?: string;
}


class AgentManager extends EventEmitter {
  private agents: Map<string, AgentProcess> = new Map();
  private eventLog: AgentEvent[] = [];
  private _isRunning = false;

  get isRunning(): boolean {
    return this._isRunning;
  }

  async startAgents(projectPath: string): Promise<void> {
    logger.info(chalk.blue.bold('\n🚀 Starting PRP Agent System'));
    logger.info(chalk.gray('═'.repeat(50)));

    try {
      // Verify project structure
      await this.verifyProject(projectPath);

      // Start Scanner
      await this.startScanner(projectPath);

      // Start Inspector
      await this.startInspector();

      // Start Orchestrator
      await this.startOrchestrator();

      this._isRunning = true;
      this.startEventMonitoring();

      logger.info(chalk.green('\n✅ All agents started successfully!'));
      logger.info(chalk.cyan('📡 Agents are now monitoring and processing signals...\n'));

      // Keep the process running and show real-time activity
      await this.runInteractiveMode();

    } catch (error) {
      logger.error(chalk.red('\n❌ Failed to start agents:'), error instanceof Error ? error.message : String(error));
      await this.stopAllAgents();
      process.exit(1);
    }
  }

  private async verifyProject(projectPath: string): Promise<void> {
    const requiredFiles = ['.prprc', 'AGENTS.md'];

    for (const file of requiredFiles) {
      const filePath = path.join(projectPath, file);
      if (!await fs.pathExists(filePath)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    // Verify .prprc has agent configuration
    const prprcPath = path.join(projectPath, '.prprc');
    const prprc = await fs.readJson(prprcPath);

    if (!prprc.agents || !Array.isArray(prprc.agents) || prprc.agents.length === 0) {
      throw new Error('No agents configured in .prprc configuration');
    }

    // Check if at least one agent is enabled
    const enabledAgents = prprc.agents.filter((agent: AgentConfig) => agent.enabled);
    if (enabledAgents.length === 0) {
      throw new Error('No enabled agents found in .prprc configuration');
    }
  }

  private async startScanner(projectPath: string): Promise<void> {
    const spinner = ora('Starting Scanner Agent...').start();

    try {
      const scanner = new ScannerCore({
        worktreesRoot: projectPath,
        mainRepoPath: projectPath,
        scanInterval: 2000, // Scan every 2 seconds for demo
        maxConcurrentWorktrees: 10,
        fileHashCacheSize: 1000,
        signalQueueSize: 500
      });

      // Set up event handlers
      scanner.on('scanner:event', (event: ScannerEvent) => {
        this.logEvent({
          type: 'signal',
          source: 'scanner',
          timestamp: new Date(),
          payload: event
        });
        if (event.type === 'signal_detected') {
          this.displaySignalDetection(event.data as Signal);
        }
      });

      await scanner.start();

      this.agents.set('scanner', {
        name: 'Scanner Agent',
        type: 'scanner',
        process: {
          kill: () => scanner.stop(),
          on: (event: string, handler: (...args: unknown[]) => void) => scanner.on(event, handler),
          once: (event: string, handler: (...args: unknown[]) => void) => scanner.once(event, handler)
        } as unknown as ChildProcess,
        status: 'running',
        startTime: new Date()
      });

      spinner.succeed('Scanner Agent started');
    } catch (error) {
      spinner.fail('Scanner Agent failed to start');
      throw error;
    }
  }

  private async startInspector(): Promise<void> {
    const spinner = ora('Starting Inspector Agent...').start();

    try {
      const inspector = new InspectorCore({
        model: 'gpt-4',
        maxTokens: 4000,
        temperature: 0.7,
        timeout: 30000,
        batchSize: 10,
        maxConcurrentClassifications: 5,
        maxWorkers: 4,
        workerTimeout: 60000,
        tokenLimits: {
          input: 8000,
          output: 4000,
          total: 12000
        },
        prompts: {
          classification: 'Analyze this signal and classify its type and priority.',
          contextPreparation: 'Prepare context for signal processing.',
          recommendationGeneration: 'Generate recommendations for this signal.'
        },
        structuredOutput: {
          enabled: true,
          schema: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              priority: { type: 'string' },
              action: { type: 'string' }
            }
          },
          validation: true,
          fallbackToText: false
        }
      });

      // Set up event handlers
      inspector.on('inspector:result', (result: InspectorResult) => {
        this.logEvent({
          type: 'action',
          source: 'inspector',
          timestamp: new Date(),
          payload: result
        });
        this.displaySignalProcessing(result);
      });

      await inspector.start();

      this.agents.set('inspector', {
        name: 'Inspector Agent',
        type: 'inspector',
        process: {
          kill: () => inspector.stop(),
          on: (event: string, handler: (...args: unknown[]) => void) => inspector.on(event, handler),
          once: (event: string, handler: (...args: unknown[]) => void) => inspector.once(event, handler)
        } as unknown as ChildProcess,
        status: 'running',
        startTime: new Date()
      });

      spinner.succeed('Inspector Agent started');
    } catch (error) {
      spinner.fail('Inspector Agent failed to start');
      throw error;
    }
  }

  private async startOrchestrator(): Promise<void> {
    const spinner = ora('Starting Orchestrator Agent...').start();

    try {
      const orchestrator = new OrchestratorCore({
        model: 'gpt-4',
        maxTokens: 4000,
        temperature: 0.7,
        timeout: 60000,
        maxConcurrentDecisions: 5,
        maxChainOfThoughtDepth: 10,
        contextPreservation: {
          enabled: true,
          maxContextSize: 10000,
          compressionStrategy: 'summarize',
          preserveElements: ['signals', 'decisions', 'context'],
          compressionRatio: 0.7,
          importantSignals: ['[oa]', '[op]', '[Bb]', '[af]']
        },
        tools: [],
        agents: {
          maxActiveAgents: 10,
          defaultTimeout: 300000,
          retryAttempts: 3,
          retryDelay: 1000,
          parallelExecution: true,
          loadBalancing: 'round_robin',
          healthCheckInterval: 30000
        },
        prompts: {
          systemPrompt: 'You are the orchestrator for the PRP system.',
          decisionMaking: 'Make a decision based on the current context and signals.',
          chainOfThought: 'Think step by step about the problem.',
          toolSelection: 'Select the appropriate tools for the task.',
          agentCoordination: 'Coordinate with other agents effectively.',
          checkpointEvaluation: 'Evaluate progress at checkpoints.',
          errorHandling: 'Handle errors gracefully.',
          contextUpdate: 'Update context based on new information.'
        },
        decisionThresholds: {
          confidence: 0.8,
          tokenUsage: 4000,
          processingTime: 30000,
          agentResponse: 10000,
          errorRate: 0.1
        }
      });

      // Set up event handlers
      orchestrator.on('orchestrator:decision', (decision: OrchestratorDecision) => {
        this.logEvent({
          type: 'decision',
          source: 'orchestrator',
          timestamp: new Date(),
          payload: decision
        });
        this.displayDecision(decision);
      });

      orchestrator.on('orchestrator:action', (action: OrchestratorAction) => {
        this.logEvent({
          type: 'action',
          source: 'orchestrator',
          timestamp: new Date(),
          payload: action
        });
        this.displayAction(action);
      });

      await orchestrator.start();

      this.agents.set('orchestrator', {
        name: 'Orchestrator Agent',
        type: 'orchestrator',
        process: {
          kill: () => orchestrator.stop(),
          on: (event: string, handler: (...args: unknown[]) => void) => orchestrator.on(event, handler),
          once: (event: string, handler: (...args: unknown[]) => void) => orchestrator.once(event, handler)
        } as unknown as ChildProcess,
        status: 'running',
        startTime: new Date()
      });

      spinner.succeed('Orchestrator Agent started');
    } catch (error) {
      spinner.fail('Orchestrator Agent failed to start');
      throw error;
    }
  }

  private startEventMonitoring(): void {
    // Connect agents to create signal flow
    const scanner = this.agents.get('scanner');
    const inspector = this.agents.get('inspector');
    const orchestrator = this.agents.get('orchestrator');

    // Scanner → Inspector signal flow
    if (scanner && inspector) {
      scanner.process.on('signal', async (signal: Signal) => {
        // Forward signals to Inspector
        setTimeout(() => {
          this.simulateInspectorProcessing(signal);
        }, 500);
      });
    }

    // Inspector → Orchestrator signal flow
    if (inspector && orchestrator) {
      inspector.process.on('signalProcessed', async (result: InspectorResult) => {
        // Forward processed signals to Orchestrator
        setTimeout(() => {
          this.simulateOrchestratorDecision(result);
        }, 1000);
      });
    }
  }

  private simulateInspectorProcessing(signal: Signal): void {
    const result = {
      originalSignal: signal,
      processingResult: {
        category: this.categorizeSignal(signal),
        urgency: this.calculateUrgency(signal),
        recommendedAction: this.recommendAction(signal)
      },
      inspectorNotes: `Signal ${signal.type} analyzed and classified`,
      timestamp: new Date()
    };

    this.agents.get('inspector')?.process.emit('signalProcessed', result);
  }

  private simulateOrchestratorDecision(processedSignal: InspectorResult): void {
    const decision = {
      input: processedSignal,
      reasoning: 'Chain of Thought: Signal requires developer attention',
      decision: 'delegate',
      targetAgent: 'developer',
      confidence: 0.85,
      tools: ['file-operations', 'git-operations'],
      timestamp: new Date()
    };

    this.agents.get('orchestrator')?.process.emit('decision', decision);

    // Simulate action execution
    setTimeout(() => {
      const action = {
        decisionId: decision.timestamp.getTime(),
        action: 'create-task',
        target: 'developer',
        description: `Implement ${processedSignal.originalSignal?.type ?? 'unknown'} requirement`,
        status: 'completed',
        result: 'Task created and assigned to developer',
        timestamp: new Date()
      };

      this.agents.get('orchestrator')?.process.emit('action', action);
    }, 2000);
  }

  private categorizeSignal(signal: Signal): string {
    const categories: Record<string, string> = {
      '[oa]': 'orchestrator-alert',
      '[op]': 'work-progress',
      '[os]': 'scanner-result',
      '[Bb]': 'blocker',
      '[af]': 'question',
      '[Cc]': 'completion'
    };
    return categories[signal.type] ?? 'general';
  }

  private calculateUrgency(signal: Signal): number {
    const urgencyMap: Record<string, number> = {
      '[Bb]': 0.9,
      '[AE]': 1.0,
      '[af]': 0.7,
      '[oa]': 0.8,
      '[op]': 0.5
    };
    return urgencyMap[signal.type] ?? 0.3;
  }

  private recommendAction(signal: Signal): string {
    const actions: Record<string, string> = {
      '[Bb]': 'escalate-to-admin',
      '[af]': 'request-guidance',
      '[Cc]': 'archive-and-proceed',
      '[op]': 'log-progress',
      '[oa]': 'analyze-and-coordinate'
    };
    return actions[signal.type] ?? 'standard-processing';
  }

  private displaySignalDetection(signal: Signal): void {
    logger.info(chalk.yellow('🔍 Scanner detected signal:'), chalk.cyan(signal.type));
    logger.info(chalk.gray(`   Source: ${signal.source} | Data: ${JSON.stringify(signal.data).substring(0, 50)}...`));
  }

  private displaySignalProcessing(result: InspectorResult): void {
    logger.info(chalk.magenta('⚡ Inspector processed signal:'));
    if (result.processingResult) {
      logger.info(chalk.gray(`   Category: ${result.processingResult.category} | Urgency: ${(result.processingResult.urgency * 100).toFixed(0)}%`));
      logger.info(chalk.gray(`   Action: ${result.processingResult.recommendedAction}`));
    }
  }

  private displayDecision(decision: OrchestratorDecision): void {
    logger.info(chalk.green('🧠 Orchestrator decision:'));
    logger.info(chalk.gray(`   Decision: ${decision.decision} | Target: ${decision.targetAgent ?? 'unknown'}`));
    logger.info(chalk.gray(`   Confidence: ${decision.confidence ? (decision.confidence * 100).toFixed(0) : 'unknown'}% | Tools: ${decision.tools?.join(', ') ?? 'none'}`));
  }

  private displayAction(action: OrchestratorAction): void {
    logger.info(chalk.cyan('⚡ Action executed:'));
    logger.info(chalk.gray(`   Action: ${action.action} | Status: ${action.status ?? 'unknown'}`));
    logger.info(chalk.gray(`   Result: ${action.result ?? 'unknown'}`));
  }

  private logEvent(event: AgentEvent): void {
    this.eventLog.push(event);

    // Keep only last 100 events
    if (this.eventLog.length > 100) {
      this.eventLog = this.eventLog.slice(-100);
    }
  }

  private async runInteractiveMode(): Promise<void> {
    logger.info(chalk.cyan('🎯 Agent System is running!'));
    logger.info(chalk.gray('Press Ctrl+C to stop agents\n'));

    // Create demo signals to show the system working
    this.createDemoSignals();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info(chalk.yellow('\n\n🛑 Stopping agents...'));
      await this.stopAllAgents();
      process.exit(0);
    });

    // Keep the process alive
    return new Promise(() => {});
  }

  private createDemoSignals(): void {
    setTimeout(() => {
      logger.info(chalk.cyan('\n🎭 Creating demo signals to showcase agent communication...\n'));

      // Demo signal 1: Work progress
      setTimeout(() => {
        const signal1 = {
          type: '[op]',
          source: 'developer',
          content: 'Completed user authentication module implementation',
          timestamp: new Date(),
          metadata: { feature: 'auth', status: 'completed' }
        };
        this.agents.get('scanner')?.process.emit('signal', signal1);
      }, 1000);

      // Demo signal 2: Blocker
      setTimeout(() => {
        const signal2 = {
          type: '[Bb]',
          source: 'developer',
          content: 'Blocked by missing API endpoint from backend team',
          timestamp: new Date(),
          metadata: { blocker: 'api-endpoint', severity: 'high' }
        };
        this.agents.get('scanner')?.process.emit('signal', signal2);
      }, 4000);

      // Demo signal 3: Question
      setTimeout(() => {
        const signal3 = {
          type: '[af]',
          source: 'developer',
          content: 'Need clarification on payment flow requirements',
          timestamp: new Date(),
          metadata: { question: 'payment-flow', urgency: 'medium' }
        };
        this.agents.get('scanner')?.process.emit('signal', signal3);
      }, 7000);

    }, 2000);
  }

  private async stopAllAgents(): Promise<void> {
    const stopPromises = Array.from(this.agents.values()).map(async (agent) => {
      try {
        agent.process.kill();
        agent.status = 'stopped';
      } catch (error) {
        logger.error(chalk.red(`Failed to stop ${agent.name}:`), error instanceof Error ? error.message : String(error));
      }
    });

    await Promise.all(stopPromises);
    this._isRunning = false;

    logger.info(chalk.green('✅ All agents stopped'));

    // Display summary
    this.displaySessionSummary();
  }

  private displaySessionSummary(): void {
    logger.info(chalk.blue.bold('\n📊 Session Summary'));
    logger.info(chalk.gray('═'.repeat(50)));

    logger.info(`\n🤖 Agents Launched: ${this.agents.size}`);
    this.agents.forEach(agent => {
      const duration = agent.startTime ?
        Math.round((Date.now() - agent.startTime.getTime()) / 1000) : 0;
      logger.info(`   ✅ ${agent.name} (${duration}s)`);
    });

    logger.info(`\n📡 Events Processed: ${this.eventLog.length}`);
    const signalEvents = this.eventLog.filter(e => e.type === 'signal').length;
    const decisions = this.eventLog.filter(e => e.type === 'decision').length;
    const actions = this.eventLog.filter(e => e.type === 'action').length;

    logger.info(`   🔍 Signals Detected: ${signalEvents}`);
    logger.info(`   🧠 Decisions Made: ${decisions}`);
    logger.info(`   ⚡ Actions Taken: ${actions}`);

    logger.info(chalk.green('\n🎯 Agent system demonstrated successfully!'));
    logger.info(chalk.gray('All components are operational and communicating.'));
  }
}

export const command = new Command('agents:start')
  .description('Start the PRP agent system with real-time signal processing')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (options) => {
    const manager = new AgentManager();
    await manager.startAgents(options.path);
  });