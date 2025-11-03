/**
 * ♫ TUI App Component
 *
 * Main application component handling screen routing and global state
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useApp } from 'ink';
import { TUIConfig, TUIState, TerminalResizeEvent, SignalUpdateEvent, AgentUpdateEvent, HistoryUpdateEvent, IntroCompleteEvent, ScreenType, AgentCard, PRPItem, HistoryItem } from '../types/TUIConfig.js';
import { EventBus } from '../../shared/events.js';
import { IntroSequence } from './IntroSequence.js';
import { OrchestratorScreen } from './screens/OrchestratorScreen.js';
import { PRPContextScreen } from './screens/PRPContextScreen.js';
import { AgentScreen } from './screens/AgentScreen.js';
import { TokenMetricsScreen } from './screens/TokenMetricsScreen.js';
import { DebugScreen } from './screens/DebugScreen.js';
import { Footer } from './Footer.js';
import { InputBar } from './InputBar.js';
import { getTerminalLayout } from '../config/TUIConfig.js';
import { createLayerLogger } from '../../shared/logger.js';

const logger = createLayerLogger('tui');

interface TUIAppProps {
  config: TUIConfig;
  eventBus: EventBus;
}

export function TUIApp({ config, eventBus }: TUIAppProps) {
  const { exit } = useApp();
  const [introComplete, setIntroComplete] = useState(false);
  const [state, setState] = useState<TUIState>(() => ({
    currentScreen: 'orchestrator',
    debugMode: false,
    introPlaying: config.animations.intro.enabled,
    agents: new Map(),
    prps: new Map(),
    history: [],
    orchestrator: null,
    input: {
      value: '',
      isSubmitting: false
    },
    terminalLayout: getTerminalLayout(config)
  }));

  // Calculate terminal layout
  const terminalLayout = useMemo(() => {
    return getTerminalLayout(config);
  }, [config, state.terminalLayout.columns, state.terminalLayout.rows]);

  // Setup event listeners
  useEffect(() => {
    const handleTerminalResize = (...args: unknown[]) => {
      const event = args[0] as TerminalResizeEvent;
      setState(prev => ({
        ...prev,
        terminalLayout: getTerminalLayout(config)
      }));
      logger.debug('resize', 'Terminal resized', event as unknown as Record<string, unknown>);
    };

    const handleSignalUpdate = (...args: unknown[]) => {
      const event = args[0] as SignalUpdateEvent;
      setState(prev => {
        const prp = prev.prps.get(event.prpName);
        if (!prp) return prev;

        const updatedSignals = [...prp.signals];
        const existingIndex = updatedSignals.findIndex(s => s.code === event.signal.code);

        if (existingIndex >= 0) {
          updatedSignals[existingIndex] = event.signal;
        } else {
          updatedSignals.push(event.signal);
        }

        const updatedPRP = { ...prp, signals: updatedSignals, lastUpdate: new Date() };
        const newPRPs = new Map(prev.prps);
        newPRPs.set(event.prpName, updatedPRP);

        return { ...prev, prps: newPRPs };
      });
    };

    const handleAgentUpdate = (...args: unknown[]) => {
      const event = args[0] as AgentUpdateEvent;
      setState(prev => {
        const existingAgent = prev.agents.get(event.agentId);
        const updatedAgent = { ...existingAgent, ...event.update, lastUpdate: new Date() } as AgentCard;
        const newAgents = new Map(prev.agents);
        newAgents.set(event.agentId, updatedAgent);

        return { ...prev, agents: newAgents };
      });
    };

    const handleHistoryUpdate = (...args: unknown[]) => {
      const event = args[0] as HistoryUpdateEvent;
      setState(prev => ({
        ...prev,
        history: [...prev.history.slice(-50), event.item] // Keep last 50 items
      }));
    };

    const handleIntroComplete = (...args: unknown[]) => {
      const event = args[0] as IntroCompleteEvent;
      setIntroComplete(true);
      setState(prev => ({ ...prev, introPlaying: false }));
      logger.info('intro', 'Intro sequence completed', { success: event.success });
    };

    // Subscribe to events
    eventBus.on('terminal.resize', handleTerminalResize);
    eventBus.on('signal.update', handleSignalUpdate);
    eventBus.on('agent.update', handleAgentUpdate);
    eventBus.on('history.update', handleHistoryUpdate);
    eventBus.on('intro.complete', handleIntroComplete);

    return () => {
      eventBus.off('terminal.resize', handleTerminalResize);
      eventBus.off('signal.update', handleSignalUpdate);
      eventBus.off('agent.update', handleAgentUpdate);
      eventBus.off('history.update', handleHistoryUpdate);
      eventBus.off('intro.complete', handleIntroComplete);
    };
  }, [config, eventBus]);

  // Setup keyboard input handling
  useEffect(() => {
    const handleKeyPress = (data: Buffer) => {
      const key = data.toString();

      switch (key) {
        case '\t': // Tab
          setState(prev => {
            const screens: ScreenType[] = ['orchestrator', 'prp-context', 'agent', 'token-metrics'];
            const currentIndex = screens.indexOf(prev.currentScreen);
            const nextScreen = screens[(currentIndex + 1) % screens.length];
            return { ...prev, currentScreen: nextScreen };
          });
          break;

        case 'd': // D key
        case 'D':
          setState(prev => ({ ...prev, debugMode: !prev.debugMode }));
          break;

        case '4': // 4 key - direct navigation to token metrics
          setState(prev => ({ ...prev, currentScreen: 'token-metrics' }));
          break;

        case 'q': // Q key
        case 'Q':
        case '\u0003': // Ctrl+C
          exit();
          break;

        case '\u0013': // Ctrl+S
          // Handle submit
          if (state.input.value.trim()) {
            eventBus.emit('input.submit', { value: state.input.value } as Record<string, unknown>);
            setState(prev => ({
              ...prev,
              input: { ...prev.input, value: '', isSubmitting: false }
            }));
          }
          break;
      }
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', handleKeyPress);

    return () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off('data', handleKeyPress);
    };
  }, [state.input.value, exit, eventBus]);

  // Handle input changes
  const handleInputChange = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      input: { ...prev.input, value }
    }));
  }, []);

  // Simulate some initial data for demonstration
  useEffect(() => {
    if (introComplete) {
      // Add some sample agents
      const sampleAgents: AgentCard[] = [
        {
          id: 'agent-1',
          statusIcon: '♬',
          status: 'RUNNING',
          prp: 'prp-agents-v05',
          role: 'robo-aqa',
          task: 'audit PRP links',
          timeLeft: 'T–00:09',
          progress: 35,
          output: ['integrating cross-links...', 'commit staged: 3 files'],
          tokens: '18.2k',
          active: '00:01:43',
          lastUpdate: new Date()
        },
        {
          id: 'agent-2',
          statusIcon: '♪',
          status: 'SPAWNING',
          prp: 'prp-landing',
          role: 'robo-developer',
          task: 'extract sections',
          timeLeft: 'T–00:25',
          progress: 12,
          output: ['npm run build: ok', 'parsing md toc...'],
          tokens: '4.3k',
          active: '00:00:28',
          lastUpdate: new Date()
        }
      ];

      const samplePRPs: PRPItem[] = [
        {
          name: 'prp-agents-v05',
          status: 'RUNNING',
          role: 'robo-aqa',
          signals: [
            { code: '[  ]', state: 'placeholder' },
            { code: '[aA]', state: 'active', role: 'robo-aqa' },
            { code: '[pr]', state: 'active', role: 'robo-developer' },
            { code: '[PR]', state: 'active', role: 'robo-aqa', latest: true },
            { code: '[FF]', state: 'progress' },
            { code: '[ob]', state: 'active', role: 'robo-developer' }
          ],
          lastUpdate: new Date()
        },
        {
          name: 'prp-landing',
          status: 'SPAWNING',
          role: 'robo-developer',
          signals: [
            { code: '[  ]', state: 'placeholder' },
            { code: '[  ]', state: 'placeholder' },
            { code: '[  ]', state: 'placeholder' },
            { code: '[FF]', state: 'progress' },
            { code: '[  ]', state: 'placeholder' },
            { code: '[  ]', state: 'placeholder' }
          ],
          lastUpdate: new Date()
        }
      ];

      const sampleHistory: HistoryItem[] = [
        {
          source: 'system',
          timestamp: '2025-11-02 13:22:01',
          data: { startup: true, prpCount: 7, readyToSpawn: true }
        },
        {
          source: 'scanner',
          timestamp: '2025-11-02 13:22:04',
          data: { detected: ['fs-change', 'new-branch', 'secrets-ref'], count: 3 }
        },
        {
          source: 'inspector',
          timestamp: '2025-11-02 13:22:08',
          data: { impact: 'high', risk: 8, files: ['PRPs/agents-v05.md', 'PRPs/…'], why: 'cross-links missing' }
        }
      ];

      setState(prev => ({
        ...prev,
        agents: new Map(sampleAgents.map(a => [a.id, a])),
        prps: new Map(samplePRPs.map(p => [p.name, p])),
        history: sampleHistory,
        orchestrator: {
          status: 'RUNNING',
          prp: 'prp-agents-v05',
          signals: samplePRPs[0].signals,
          latestSignalIndex: 3,
          cotLines: [
            '◇ Δ from scanner → pick role → budget',
            '⇢ diff.read → { "changed": 6, "hot": ["PRPs/agents-v05.md","…"] }',
            '✦ next: AQA first, then DEV'
          ],
          toolCall: 'diff.read → { "changed": 6, "hot": ["PRPs/agents-v05.md","…"] }',
          lastUpdate: new Date()
        }
      }));
    }
  }, [introComplete]);

  // Render intro sequence if enabled and not complete
  if (config.animations.intro.enabled && !introComplete) {
    return <IntroSequence config={config} onComplete={() => setIntroComplete(true)} />;
  }

  // Render main TUI
  const currentScreen = state.debugMode ? 'debug' : state.currentScreen;

  return (
    <>
      {currentScreen === 'orchestrator' && (
        <OrchestratorScreen
          state={state}
          config={config}
          terminalLayout={terminalLayout}
        />
      )}
      {currentScreen === 'prp-context' && (
        <PRPContextScreen
          state={state}
          config={config}
          terminalLayout={terminalLayout}
        />
      )}
      {currentScreen === 'agent' && (
        <AgentScreen
          state={state}
          config={config}
          terminalLayout={terminalLayout}
        />
      )}
      {currentScreen === 'token-metrics' && (
        <TokenMetricsScreen
          isActive={true}
          onNavigate={(screen) => setState(prev => ({ ...prev, currentScreen: screen as ScreenType }))}
        />
      )}
      {currentScreen === 'debug' && (
        <DebugScreen
          state={state}
          config={config}
          terminalLayout={terminalLayout}
        />
      )}

      <InputBar
        value={state.input.value}
        onChange={handleInputChange}
        config={config}
        terminalLayout={terminalLayout}
      />

      <Footer
        currentScreen={state.currentScreen}
        debugMode={state.debugMode}
        agentCount={state.agents.size}
        prpCount={state.prps.size}
        config={config}
        terminalLayout={terminalLayout}
      />
    </>
  );
}