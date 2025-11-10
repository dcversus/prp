/**
 * ♫ TUI App Component
 *
 * Main application component handling screen routing and global state
 * Enhanced with PRP-007 signal system integration for real-time updates
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useApp } from 'ink';
import {
  SignalEvent,
  EventBusIntegration
} from '../../types.js';
import {
  TUIConfig,
  TUIState,
  TerminalResizeEvent,
  IntroCompleteEvent,
  ScreenType,
  AgentCard,
  HistoryItem
} from '../../shared/types/TUIConfig.js';
import { EventBus } from '../../shared/events.js';
import { VideoIntro } from './VideoIntro.js';
import { OrchestratorScreen } from './screens/OrchestratorScreen.js';
import { InfoScreen } from './screens/InfoScreen.js';
import { PRPContextScreen } from './screens/PRPContextScreen.js';
import { AgentScreen } from './screens/AgentScreen.js';
import { TokenMetricsScreen } from './screens/TokenMetricsScreen.js';
import { DebugScreen } from './screens/DebugScreen.js';
import { Footer } from './Footer.js';
import { InputBar } from './InputBar.js';
import { getTerminalLayout } from '../config/TUIConfig.js';
import { createLayerLogger } from '../../shared/logger.js';
import { useSignalSubscription } from '../hooks/useSignalSubscription.js';

const logger = createLayerLogger('tui');


function getStatusForSignals(signals: Array<{ state?: string; code?: string }>): string {
  const activeSignals = signals.filter(s => s.state === 'active' || s.state === 'progress');
  const highPrioritySignals = signals.filter(s => s.code === '[FF]' || s.code === '[bb]' || s.code === '[ff]');

  if (highPrioritySignals.length > 0) {
    return 'RUNNING';
  }
  if (activeSignals.length > 0) {
    return 'SPAWNING';
  }
  return 'IDLE';
}

function getStatusIcon(status: string): string {
  switch (status.toUpperCase()) {
    case 'SPAWNING': return '♪';
    case 'RUNNING': return '♬';
    case 'IDLE': return '♫';
    case 'ERROR': return '♫';
    default: return '♫';
  }
}

function formatTimeLeft(activeTime?: number): string {
  if (!activeTime) {
    return 'T--:--';
  }
  const minutes = Math.floor(activeTime / 60);
  const seconds = Math.floor(activeTime % 60);
  return `T-${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatActiveTime(activeTime?: number): string {
  if (!activeTime) {
    return '00:00:00';
  }
  const hours = Math.floor(activeTime / 3600);
  const minutes = Math.floor((activeTime % 3600) / 60);
  const seconds = Math.floor(activeTime % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatTokenCount(tokens?: number): string {
  if (!tokens) {
    return '0';
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}

// Convert EventBus to EventBusIntegration interface
const eventBusToIntegration = (eventBus: EventBus): EventBusIntegration => ({
  subscribe: (eventType: string, handler: (event: SignalEvent) => void) => {
    return eventBus.subscribeToChannel(eventType, (event: unknown) => {
      // Convert EventBus event to SignalEvent format
      if (typeof event === 'object' && event !== null && 'type' in event) {
        const signalEvent = event as SignalEvent;
        handler(signalEvent);
      }
    });
  },
  unsubscribe: (subscriptionId: string) => {
    eventBus.unsubscribe(subscriptionId);
  },
  emit: (event: SignalEvent) => {
    eventBus.emit(event.type, event as unknown as Record<string, unknown>);
  },
  getRecentEvents: (count = 10) => {
    const events = (eventBus.getEventHistory?.())?.slice(-count) ?? [];
    return events.filter((event): event is SignalEvent =>
      typeof event === 'object' && event !== null && 'signal' in event
    );
  },
  getEventsByType: (type: string, count = 50) => {
    const events = (eventBus.getEventHistory?.())?.filter(event =>
      typeof event === 'object' && event !== null &&
      (event).type === type
    ).slice(-count) ?? [];
    return events.filter((event): event is SignalEvent =>
      typeof event === 'object' && event !== null && 'signal' in event
    );
  },
  clearHistory: () => {
    if (eventBus.clearEventHistory) {
      eventBus.clearEventHistory();
    }
  }
});

interface TUIAppProps {
  config: TUIConfig;
  eventBus: EventBus;
}

export function TUIApp({ config, eventBus }: TUIAppProps) {
  const { exit } = useApp();
  const [introComplete, setIntroComplete] = useState(false);

  // Refs for debouncing and race condition prevention
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(0);

  // Convert EventBus to integration interface
  const eventBusIntegration = useMemo(() => eventBusToIntegration(eventBus), [eventBus]);

  // Initialize signal subscription with global filter
  const signalSubscription = useSignalSubscription(eventBusIntegration, {
    types: ['agent', 'system', 'scanner', 'inspector', 'orchestrator']
  }, {
    historySize: 200,
    debounceDelay: 50,
    refreshInterval: 500
  });

  const [state, setState] = useState<TUIState>(() => ({
    currentScreen: 'info',
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

  // Debounced state update to prevent excessive re-renders
  const debouncedSetState = useCallback((updater: (prev: TUIState) => TUIState) => {
    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounce updates to 100ms for <100ms latency requirement
    updateTimeoutRef.current = setTimeout(() => {
      setState(updater);
      lastUpdateRef.current = Date.now();
    }, 100);
  }, []);

  // Calculate terminal layout
  const terminalLayout = useMemo(() => {
    return getTerminalLayout(config);
  }, [config]);

  // Update state with signals from the new signal system
  useEffect(() => {
    if (signalSubscription.signals.length === 0) {
      return;
    }

    try {
      setState(prev => {
        const newPRPs = new Map(prev.prps);
        const newAgents = new Map(prev.agents);

        // Process signal events and update TUI state
        signalSubscription.signals.forEach((signalEvent) => {
          if (signalEvent.prpId) {
            // Update PRP with signal
            const existingPRP = newPRPs.get(signalEvent.prpId);
            const signals = existingPRP?.signals ?? [];

            // Convert signal event to TUI signal format
            const tuiSignal = {
              code: signalEvent.signal,
              state: signalEvent.state === 'active' ? 'active' : 'resolved',
              role: signalEvent.source,
              latest: true
            };

            // Update signals array
            const updatedSignals = signals.filter(s => s.code !== tuiSignal.code);
            updatedSignals.push(tuiSignal);

            const updatedPRP = {
              name: signalEvent.prpId,
              status: getStatusForSignals(updatedSignals),
              role: tuiSignal.role,
              signals: updatedSignals.slice(-7), // Keep last 7 signals
              lastUpdate: signalEvent.timestamp
            };

            newPRPs.set(signalEvent.prpId, updatedPRP);
          }

          if (signalEvent.agentId) {
            // Update agent with signal data
            const existingAgent = newAgents.get(signalEvent.agentId);

            const tuiAgent: AgentCard = {
              id: signalEvent.agentId,
              statusIcon: getStatusIcon(signalEvent.state),
              status: signalEvent.state === 'active' ? 'RUNNING' : 'IDLE',
              prp: signalEvent.prpId ?? 'unknown-prp',
              role: signalEvent.source,
              task: signalEvent.title,
              timeLeft: formatTimeLeft(signalEvent.metadata?.duration),
              progress: signalEvent.state === 'active' ? 50 : 100,
              output: signalEvent.description ? [signalEvent.description] : existingAgent?.output ?? ['Processing...'],
              tokens: formatTokenCount(signalEvent.data?.tokensUsed as number),
              active: formatActiveTime(signalEvent.metadata?.duration),
              lastUpdate: signalEvent.timestamp
            };

            newAgents.set(signalEvent.agentId, tuiAgent);
          }
        });

        // Add signal events to history
        const historyItems: HistoryItem[] = signalSubscription.signals.slice(-10).map(signal => ({
          source: signal.type,
          timestamp: signal.timestamp.toISOString().replace('T', ' ').substring(0, 19),
          data: signal as unknown as Record<string, unknown>
        }));

        return {
          ...prev,
          prps: newPRPs,
          agents: newAgents,
          history: [...prev.history.slice(-50), ...historyItems]
        };
      });
    } catch (error) {
      logger.error('tui', 'Error processing signal events:', error);
    }
  }, [signalSubscription.signals, logger]);

  // Setup real-time EventBus integration
  useEffect(() => {
    const handleTerminalResize = (...args: unknown[]) => {
      const event = args[0] as TerminalResizeEvent;
      setState(prev => ({
        ...prev,
        terminalLayout: getTerminalLayout(config)
      }));
      logger.debug('resize', 'Terminal resized', event as unknown as Record<string, unknown>);
    };

    // Legacy signal event handling (kept for compatibility)
    const handleLegacySignalEvent = (event: { type?: string; data?: Record<string, unknown> }) => {
      try {
        if (event.type === 'signal' && event.data) {
          const signal = event.data;

          // Convert to new signal system format
          const signalEvent: SignalEvent = {
            id: `legacy-${Date.now()}`,
            type: 'system',
            signal: '[XX]',
            title: 'Legacy Signal',
            description: '',
            timestamp: new Date(),
            source: 'system',
            priority: 'medium',
            state: 'resolved',
            data: signal
          };

          // Emit as new signal format
          eventBusIntegration.emit(signalEvent);
        }
      } catch (error) {
        logger.error('tui', 'Error in handleLegacySignalEvent:', error);
      }
    };

    // Handle real-time agent events from orchestrator with error handling
    const handleAgentEvent = (event: { type?: string; data?: Record<string, unknown> }) => {
      try {
        if (event.type?.startsWith('agent_') && event.data) {
          debouncedSetState(prev => {
            const agentId = `agent-${Date.now()}`;

            // Convert agent event to TUI agent format
            const tuiAgent: AgentCard = {
              id: agentId,
              statusIcon: '♫',
              status: 'RUNNING',
              prp: 'unknown-prp',
              role: 'robo-developer',
              task: 'Processing...',
              timeLeft: 'T--:--',
              progress: 0,
              output: ['Initializing...'],
              tokens: '0',
              active: '00:00:00',
              lastUpdate: new Date()
            };

            const newAgents = new Map(prev.agents);
            newAgents.set(agentId, tuiAgent);

            return { ...prev, agents: newAgents };
          });
        }
      } catch (error) {
        logger.error('tui', 'Error in handleAgentEvent:', error);
      }
    };

    // Handle real-time scanner events with error handling
    const handleScannerEvent = (event: { type?: string; data?: Record<string, unknown> }) => {
      try {
        if (event.type?.startsWith('scanner_') && event.data) {
  
          const historyItem: HistoryItem = {
            source: 'scanner',
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            data: event.data
          };

          // Use immediate setState for history (no debouncing needed for real-time logs)
          setState(prev => ({
            ...prev,
            history: [...prev.history.slice(-50), historyItem]
          }));
        }
      } catch (error) {
        logger.error('tui', 'Error in handleScannerEvent:', error);
      }
    };

    // Handle real-time inspector events with error handling
    const handleInspectorEvent = (event: { type?: string; data?: Record<string, unknown> }) => {
      try {
        if (event.type?.startsWith('inspector_') && event.data) {

          const historyItem: HistoryItem = {
            source: 'inspector',
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            data: event.data
          };

          // Use immediate setState for history (no debouncing needed for real-time logs)
          setState(prev => ({
            ...prev,
            history: [...prev.history.slice(-50), historyItem]
          }));
        }
      } catch (error) {
        logger.error('tui', 'Error in handleInspectorEvent:', error);
      }
    };

    // Handle orchestrator events with error handling and debouncing
    const handleOrchestratorEvent = (event: { type?: string; data?: Record<string, unknown> }) => {
      try {
        if (event.type?.startsWith('orchestrator_') && event.data) {
          debouncedSetState(prev => ({
            ...prev,
            orchestrator: {
              status: 'RUNNING',
              prp: 'unknown-prp',
              signals: prev.orchestrator?.signals ?? [],
              latestSignalIndex: 0,
              cotLines: ['Processing...'],
              toolCall: '',
              lastUpdate: new Date()
            }
          }));
        }
      } catch (error) {
        logger.error('tui', 'Error in handleOrchestratorEvent:', error);
      }
    };

    const handleIntroComplete = (...args: unknown[]) => {
      const event = args[0] as IntroCompleteEvent;
      setIntroComplete(true);
      setState(prev => ({ ...prev, introPlaying: false }));
      logger.info('intro', 'Intro sequence completed', { success: event.success });
    };

    // Subscribe to real-time EventBus channels
    const unsubscribeSignal = eventBus.subscribeToChannel('signals', handleLegacySignalEvent);
    const unsubscribeAgent = eventBus.subscribeToChannel('agents', handleAgentEvent);
    const unsubscribeScanner = eventBus.subscribeToChannel('scanner', handleScannerEvent);
    const unsubscribeInspector = eventBus.subscribeToChannel('inspector', handleInspectorEvent);
    const unsubscribeOrchestrator = eventBus.subscribeToChannel('orchestrator', handleOrchestratorEvent);

    // Keep keyboard events
    eventBus.on('terminal.resize', handleTerminalResize);
    eventBus.on('intro.complete', handleIntroComplete);

    return () => {
      // Cleanup all subscriptions
      unsubscribeSignal();
      unsubscribeAgent();
      unsubscribeScanner();
      unsubscribeInspector();
      unsubscribeOrchestrator();
      eventBus.off('terminal.resize', handleTerminalResize);
      eventBus.off('intro.complete', handleIntroComplete);

      // Cleanup debounced updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [config, eventBus, debouncedSetState]);

  // Setup keyboard input handling - PRP spec: o|i|a|1..9
  useEffect(() => {
    const handleKeyPress = (data: Buffer) => {
      const key = data.toString();

      switch (key) {
        // PRP spec tab navigation: o|i|a|1..9
        case 'o':
        case 'O':
          setState(prev => ({ ...prev, currentScreen: 'orchestrator' }));
          break;

        case 'i':
        case 'I':
          setState(prev => ({ ...prev, currentScreen: 'info' }));
          break;

        case 'a':
        case 'A':
          setState(prev => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '1':
          setState(prev => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '2':
          setState(prev => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '3':
          setState(prev => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '4':
          setState(prev => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '5':
          setState(prev => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '6':
          setState(prev => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '7':
          setState(prev => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '8':
          setState(prev => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '9':
          setState(prev => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '\t': // Tab - cycle through main screens
          setState(prev => {
            const screens: ScreenType[] = ['orchestrator', 'info', 'prp-context', 'agent', 'token-metrics'];
            const currentScreen = prev.currentScreen;
            const currentIndex = screens.indexOf(currentScreen);
            const nextScreen = screens[(currentIndex + 1) % screens.length];
            return { ...prev, currentScreen: nextScreen as ScreenType };
          });
          break;

        case 'd': // D key
        case 'D':
          setState(prev => ({ ...prev, debugMode: !prev.debugMode }));
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

  // Initialize with system startup message
  useEffect(() => {
    if (introComplete) {
      // Add initial system startup message
      const startupHistory: HistoryItem = {
        source: 'system',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        data: { startup: true, prpCount: 0, readyToSpawn: true }
      };

      setState(prev => ({
        ...prev,
        history: [startupHistory],
        orchestrator: {
          status: 'IDLE',
          prp: 'none',
          signals: [],
          latestSignalIndex: 0,
          cotLines: ['System initialized, waiting for PRP data...'],
          toolCall: '',
          lastUpdate: new Date()
        }
      }));

      // Emit TUI ready event for other components
      eventBus.emit('tui.ready', {
        timestamp: new Date(),
        config: config
      });
    }
  }, [introComplete, config, eventBus]);

  // Render intro sequence if enabled and not complete
  if (config.animations.intro.enabled && !introComplete) {
    return <VideoIntro config={config} onComplete={(success) => setIntroComplete(success)} />;
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
      {currentScreen === 'info' && (
        <InfoScreen
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