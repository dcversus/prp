/**
 * ♫ TUI App Component
 *
 * Main application component handling screen routing and global state
 * Enhanced with [PRP-000-agents05.md](../../../PRPs/PRP-000-agents05.md) signal system integration for real-time updates
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useApp, Box } from 'ink';
import { useTerminalDimensionsWithColumns } from '../hooks/useTerminalDimensions';

import {
  SignalTypeEnum,
  SignalCodeEnum,
  SignalSourceEnum,
  SignalPriorityEnum,
} from '../../types';
import { getTerminalLayout } from '../config/TUIConfig';
import { createLayerLogger } from '../../shared/logger';
import { useSignalSubscription } from '../hooks/useSignalSubscription';
import {
  KeyboardNavigation,
  type NavigationMode,
  createDefaultNavigationConfig
} from '../utils/keyboard-navigation';
import { responsiveLayout } from '../config/ResponsiveLayout';

import { MultiScreenRenderer } from './MultiScreenRenderer';
import { VideoIntro } from './VideoIntro';
import { OrchestratorScreen } from './screens/OrchestratorScreen';
import { InfoScreen } from './screens/InfoScreen';
import { PRPContextScreen } from './screens/PRPContextScreen';
import { AgentScreen } from './screens/AgentScreen';
import { TokenMetricsScreen } from './screens/TokenMetricsScreen';
import { DebugScreen } from './screens/DebugScreen';
import { Footer } from './Footer';
import { InputBar } from './InputBar';
import { TUIErrorBoundary } from './TUIErrorBoundary';
import { SignalOrchestrationDisplay, MusicStatusBar } from './MusicComponents';

import type {
  SignalEvent,
  EventBusIntegration,
} from '../../types';
import type {
  TUIConfig,
  TUIState,
  TerminalResizeEvent,
  IntroCompleteEvent,
  ScreenType,
  AgentCard,
  HistoryItem,
  LayoutMode,
} from '../../shared/types/TUIConfig';
import type { EventBus } from '../../shared/events';

const logger = createLayerLogger('tui');

const getStatusForSignals = (signals: Array<{ state?: string; code?: string }>): string => {
  const activeSignals = signals.filter((s) => s.state === 'active' || s.state === 'progress');
  const highPrioritySignals = signals.filter(
    (s) => s.code === '[FF]' || s.code === '[bb]' || s.code === '[ff]',
  );

  if (highPrioritySignals.length > 0) {
    return 'RUNNING';
  }
  if (activeSignals.length > 0) {
    return 'SPAWNING';
  }
  return 'IDLE';
};

const getStatusIcon = (status: string): '♪' | '♩' | '♬' | '♫' => {
  switch (status.toUpperCase()) {
    case 'SPAWNING':
      return '♪';
    case 'RUNNING':
      return '♬';
    case 'IDLE':
      return '♫';
    case 'ERROR':
      return '♫';
    default:
      return '♫';
  }
};

const formatTimeLeft = (activeTime?: number): string => {
  if (activeTime === undefined || activeTime === null || activeTime < 0) {
    return 'T--:--';
  }
  const minutes = Math.floor(activeTime / 60);
  const seconds = Math.floor(activeTime % 60);
  return `T-${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatActiveTime = (activeTime?: number): string => {
  if (activeTime === undefined || activeTime === null || activeTime < 0) {
    return '00:00:00';
  }
  const hours = Math.floor(activeTime / 3600);
  const minutes = Math.floor((activeTime % 3600) / 60);
  const seconds = Math.floor(activeTime % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatTokenCount = (tokens?: number): string => {
  if (tokens === undefined || tokens === null || tokens < 0) {
    return '0';
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
};

// Convert EventBus to EventBusIntegration interface
const eventBusToIntegration = (eventBus: EventBus): EventBusIntegration => ({
  subscribe: (_eventType: string, handler: (_signalEvent: SignalEvent) => void) => {
    eventBus.subscribeToChannel(_eventType, (receivedEvent: unknown) => {
      // Convert EventBus event to SignalEvent format
      if (typeof receivedEvent === 'object' && receivedEvent !== null && 'type' in receivedEvent) {
        const signalEvent = receivedEvent as SignalEvent;
        handler(signalEvent);
      }
    });
    return `subscription-${Date.now()}`; // Return a string ID instead of function
  },
  unsubscribe: (subscriptionId: string) => {
    // For now, just log - EventBus doesn't have unsubscribe method
    logger.debug('tui', 'event-bus', { message: `Unsubscribing from: ${subscriptionId}` });
  },
  emit: (event: SignalEvent) => {
    eventBus.emit(event.type, event as unknown as Record<string, unknown>);
  },
  getRecentEvents: () => {
    // For now, return empty array - EventBus doesn't have getEventHistory method
    return [];
  },
  getEventsByType: () => {
    // For now, return empty array - EventBus doesn't have getEventHistory method
    return [];
  },
  clearHistory: () => {
    // For now, just log - EventBus doesn't have clearEventHistory method
    logger.debug('tui', 'event-bus', { message: 'Clearing event history' });
  },
});

interface TUIAppProps {
  config: TUIConfig;
  eventBus: EventBus;
};

export const TUIApp = ({ config, eventBus }: TUIAppProps): React.ReactElement => {
  const { exit } = useApp();
  const [introComplete, setIntroComplete] = useState(false);

  // Refs for debouncing and race condition prevention
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastUpdateRef = useRef<number>(0);

  // Convert EventBus to integration interface - stable reference
  const eventBusIntegration = useMemo(() => eventBusToIntegration(eventBus), [eventBus]);

  // Initialize signal subscription with global filter
  const signalSubscription = useSignalSubscription(
    eventBusIntegration,
    {
      types: [
        SignalTypeEnum.AGENT,
        SignalTypeEnum.SYSTEM,
        SignalTypeEnum.SCANNER,
        SignalTypeEnum.INSPECTOR,
        SignalTypeEnum.ORCHESTRATOR,
      ],
    },
    {
      historySize: 200 as 100,
      debounceDelay: 50 as 100,
      refreshInterval: 500 as 1000,
    },
  );

  const [state, setState] = useState<TUIState>(() => ({
    currentScreen: 'info',
    navigationMode: 'global',
    multiScreenMode: false,
    debugMode: false,
    introPlaying: config.animations.intro.enabled,
    agents: new Map(),
    prps: new Map(),
    history: [],
    orchestrator: null,
    input: {
      value: '',
      isSubmitting: false,
    },
    terminalLayout: getTerminalLayout(config),
  }));

  // Track terminal dimensions for responsive layout using Ink's hook
  const { columns: terminalColumns, rows: terminalRows } = useTerminalDimensionsWithColumns();

  // Debounced state update to prevent excessive re-renders
  const debouncedSetState = useCallback((updater: () => TUIState) => {
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

  // Track last processed signal count to prevent unnecessary updates
  const lastSignalCountRef = useRef(0);
  const lastSignalIdsRef = useRef<Set<string>>(new Set());

  // Update state with signals from the new signal system
  useEffect(() => {
    const currentSignals = signalSubscription.signals;
    const currentCount = currentSignals.length;

    // Only process if we have new signals
    if (currentCount === 0 || currentCount === lastSignalCountRef.current) {
      return;
    }

    // Create a Set of current signal IDs for efficient comparison
    const currentSignalIds = new Set(currentSignals.map((s) => s.id));
    const previousSignalIds = lastSignalIdsRef.current;

    // Check if we actually have new signals (not just re-ordering)
    const hasNewSignals = currentSignals.some((signal) => !previousSignalIds.has(signal.id));

    if (!hasNewSignals) {
      return;
    }

    try {
      setState((prev) => {
        const newPRPs = new Map(prev.prps);
        const newAgents = new Map(prev.agents);

        // Process signal events and update TUI state
        currentSignals.forEach((signalEvent) => {
          if (signalEvent.prpId && signalEvent.prpId.length > 0) {
            // Update PRP with signal
            const existingPRP = newPRPs.get(signalEvent.prpId);
            const signals = existingPRP?.signals ?? [];

            // Convert signal event to TUI signal format
            const tuiSignal = {
              code: signalEvent.signal,
              state: signalEvent.state === 'active' ? 'active' : 'resolved',
              role: signalEvent.source as 'robo-developer', // Temporary hardcoded role
              latest: true,
            };

            // Update signals array
            const updatedSignals = signals.filter((s) => String(s.code) !== String(tuiSignal.code));
            updatedSignals.push(tuiSignal);

            const updatedPRP = {
              name: signalEvent.prpId,
              status: getStatusForSignals(updatedSignals) as 'SPAWNING' | 'RUNNING' | 'IDLE' | 'ERROR', // Type conversion for AgentStatus compatibility
              role: tuiSignal.role,
              signals: updatedSignals.slice(-7), // Keep last 7 signals
              lastUpdate: signalEvent.timestamp,
            };

            newPRPs.set(signalEvent.prpId, updatedPRP);
          }

          if (signalEvent.agentId && signalEvent.agentId.length > 0) {
            // Update agent with signal data
            const existingAgent = newAgents.get(signalEvent.agentId);

            const tuiAgent: AgentCard = {
              id: signalEvent.agentId,
              statusIcon: getStatusIcon(signalEvent.state),
              status: (signalEvent.state === 'active' ? 'RUNNING' : 'IDLE') as 'SPAWNING' | 'RUNNING' | 'IDLE' | 'ERROR', // Type conversion for AgentStatus compatibility
              prp: signalEvent.prpId ?? 'unknown-prp',
              role: signalEvent.source as 'robo-developer', // Type conversion for Role compatibility
              task: signalEvent.title,
              timeLeft: formatTimeLeft(signalEvent.metadata?.duration),
              progress: signalEvent.state === 'active' ? 50 : 100,
              output: signalEvent.description
                ? [signalEvent.description]
                : (existingAgent?.output ?? ['Processing...']),
              tokens: formatTokenCount(signalEvent.data?.tokensUsed as number),
              active: formatActiveTime(signalEvent.metadata?.duration),
              lastUpdate: signalEvent.timestamp,
            };

            newAgents.set(signalEvent.agentId, tuiAgent);
          }
        });

        // Add signal events to history
        const historyItems: HistoryItem[] = currentSignals.slice(-10).map((signal) => ({
          source: signal.type as 'system' | 'scanner' | 'inspector' | 'orchestrator', // Type conversion for HistoryItem source compatibility
          timestamp: signal.timestamp.toISOString().replace('T', ' ').substring(0, 19),
          data: signal as unknown as Record<string, unknown>,
        }));

        return {
          ...prev,
          prps: newPRPs,
          agents: newAgents,
          history: [...prev.history.slice(-50), ...historyItems],
        };
      });

      // Update refs for next comparison
      lastSignalCountRef.current = currentCount;
      lastSignalIdsRef.current = currentSignalIds;
    } catch (error) {
      logger.error('tui', 'Error processing signal events:', error);
    }
  }, [signalSubscription.signals]); // Include full signals array

  // Update multi-screen mode based on terminal dimensions
  useEffect(() => {
    if (terminalColumns && terminalRows) {
      const canUseMultiScreen = multiScreenLayout.canUseMultiScreen(terminalColumns, terminalRows);
      setState((prev) => ({
        ...prev,
        multiScreenMode: canUseMultiScreen,
        terminalLayout: {
          ...prev.terminalLayout,
          columns: terminalColumns,
          rows: terminalRows,
          layoutMode: responsiveLayout.getBreakpoint(terminalColumns, terminalRows).name as LayoutMode,
          availableWidth: terminalColumns,
          availableHeight: terminalRows,
        },
      }));
    }
  }, [terminalColumns, terminalRows]);

  // Setup real-time EventBus integration
  useEffect(() => {
    const handleTerminalResize = (...args: unknown[]) => {
      const event = args[0] as TerminalResizeEvent;
      setState((prev) => ({
        ...prev,
        terminalLayout: getTerminalLayout(config),
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
            type: SignalTypeEnum.SYSTEM,
            signal: SignalCodeEnum.DONE_ASSESSMENT, // Use a valid enum value instead of '[XX]'
            title: 'Legacy Signal',
            description: '',
            timestamp: new Date(),
            source: SignalSourceEnum.SYSTEM,
            priority: SignalPriorityEnum.MEDIUM,
            state: 'resolved',
            data: signal,
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
        if (event.type && event.type.startsWith('agent_') && event.data) {
          debouncedSetState((prev) => {
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
              lastUpdate: new Date(),
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
        if (event.type && event.type.startsWith('scanner_') && event.data) {
          const historyItem: HistoryItem = {
            source: 'scanner',
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            data: event.data,
          };

          // Use immediate setState for history (no debouncing needed for real-time logs)
          setState((prev) => ({
            ...prev,
            history: [...prev.history.slice(-50), historyItem],
          }));
        }
      } catch (error) {
        logger.error('tui', 'Error in handleScannerEvent:', error);
      }
    };

    // Handle real-time inspector events with error handling
    const handleInspectorEvent = (event: { type?: string; data?: Record<string, unknown> }) => {
      try {
        if (event.type && event.type.startsWith('inspector_') && event.data) {
          const historyItem: HistoryItem = {
            source: 'inspector',
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            data: event.data,
          };

          // Use immediate setState for history (no debouncing needed for real-time logs)
          setState((prev) => ({
            ...prev,
            history: [...prev.history.slice(-50), historyItem],
          }));
        }
      } catch (error) {
        logger.error('tui', 'Error in handleInspectorEvent:', error);
      }
    };

    // Handle orchestrator events with error handling and debouncing
    const handleOrchestratorEvent = (event: { type?: string; data?: Record<string, unknown> }) => {
      try {
        if (event.type && event.type.startsWith('orchestrator_') && event.data) {
          debouncedSetState((prev) => ({
            ...prev,
            orchestrator: {
              status: 'RUNNING',
              prp: 'unknown-prp',
              signals: prev.orchestrator?.signals ?? [],
              latestSignalIndex: 0,
              cotLines: ['Processing...'],
              toolCall: '',
              lastUpdate: new Date(),
            },
          }));
        }
      } catch (error) {
        logger.error('tui', 'Error in handleOrchestratorEvent:', error);
      }
    };

    const handleIntroComplete = (...args: unknown[]) => {
      const event = args[0] as IntroCompleteEvent;
      setIntroComplete(true);
      setState((prev) => ({ ...prev, introPlaying: false }));
      logger.info('intro', 'Intro sequence completed', { success: event.success });
    };

    // Subscribe to real-time EventBus channels
    const unsubscribeSignal = eventBus.subscribeToChannel('signals', handleLegacySignalEvent);
    const unsubscribeAgent = eventBus.subscribeToChannel('agents', handleAgentEvent);
    const unsubscribeScanner = eventBus.subscribeToChannel('scanner', handleScannerEvent);
    const unsubscribeInspector = eventBus.subscribeToChannel('inspector', handleInspectorEvent);
    const unsubscribeOrchestrator = eventBus.subscribeToChannel(
      'orchestrator',
      handleOrchestratorEvent,
    );

    // Keep keyboard events
    eventBus.on('terminal.resize', handleTerminalResize);
    eventBus.on('intro.complete', handleIntroComplete);

    return () => {
      // Cleanup all subscriptions - call the unsubscribe functions if they exist
      if (typeof unsubscribeSignal === 'function') {
        unsubscribeSignal();
      }
      if (typeof unsubscribeAgent === 'function') {
        unsubscribeAgent();
      }
      if (typeof unsubscribeScanner === 'function') {
        unsubscribeScanner();
      }
      if (typeof unsubscribeInspector === 'function') {
        unsubscribeInspector();
      }
      if (typeof unsubscribeOrchestrator === 'function') {
        unsubscribeOrchestrator();
      }
      eventBus.off('terminal.resize', handleTerminalResize);
      eventBus.off('intro.complete', handleIntroComplete);

      // Cleanup debounced updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [config, eventBus, eventBusIntegration, debouncedSetState]); // Include all dependencies used in useEffect

  // Setup keyboard input handling - PRP spec: o|i|a|1..9
  useEffect(() => {
    const handleKeyPress = (data: Buffer) => {
      const key = data.toString();

      switch (key) {
        // PRP spec tab navigation: o|i|a|1..9
        case 'o':
        case 'O':
          setState((prev) => ({ ...prev, currentScreen: 'orchestrator' }));
          break;

        case 'i':
        case 'I':
          setState((prev) => ({ ...prev, currentScreen: 'info' }));
          break;

        case 'a':
        case 'A':
          setState((prev) => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '1':
          setState((prev) => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '2':
          setState((prev) => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '3':
          setState((prev) => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '4':
          setState((prev) => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '5':
          setState((prev) => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '6':
          setState((prev) => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '7':
          setState((prev) => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '8':
          setState((prev) => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '9':
          setState((prev) => ({ ...prev, currentScreen: 'agent' }));
          break;

        case '\t': // Tab - cycle through main screens
          setState((prev) => {
            const screens: ScreenType[] = [
              'orchestrator',
              'info',
              'prp-context',
              'agent',
              'token-metrics',
            ];
            const {currentScreen} = prev;
            const currentIndex = screens.indexOf(currentScreen);
            const nextScreen = screens[(currentIndex + 1) % screens.length];
            return { ...prev, currentScreen: nextScreen as ScreenType };
          });
          break;

        case 'd': // D key
        case 'D':
          setState((prev) => ({ ...prev, debugMode: !prev.debugMode }));
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
            setState((prev) => ({
              ...prev,
              input: { ...prev.input, value: '', isSubmitting: false },
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
    setState((prev) => ({
      ...prev,
      input: { ...prev.input, value },
    }));
  }, []);

  // Initialize with system startup message
  useEffect(() => {
    if (introComplete) {
      // Add initial system startup message
      const startupHistory: HistoryItem = {
        source: 'system',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        data: { startup: true, prpCount: 0, readyToSpawn: true },
      };

      setState((prev) => ({
        ...prev,
        history: [startupHistory],
        orchestrator: {
          status: 'IDLE',
          prp: 'none',
          signals: [],
          latestSignalIndex: 0,
          cotLines: ['System initialized, waiting for PRP data...'],
          toolCall: '',
          lastUpdate: new Date(),
        },
      }));

      // Emit TUI ready event for other components
      eventBus.emit('tui.ready', {
        timestamp: new Date(),
        config: config,
      });
    }
  }, [introComplete, config, eventBus]); // Include eventBus dependency

  // Render intro sequence if enabled and not complete
  if (config.animations.intro.enabled && !introComplete) {
    return (
      <TUIErrorBoundary debugMode={state.debugMode}>
        <VideoIntro config={config} onComplete={(success) => setIntroComplete(success)} />
      </TUIErrorBoundary>
    );
  }

  // Render main TUI with error boundary - matching PRP layout structure
  const currentScreen = state.debugMode ? 'debug' : state.currentScreen;

  // Multi-screen mode for wide displays
  if (state.multiScreenMode && terminalColumns && terminalRows) {
    const screens = new Map([
      ['orchestrator', OrchestratorScreen],
      ['info', InfoScreen],
      ['prp-context', PRPContextScreen],
      ['agent', AgentScreen],
      ['token-metrics', TokenMetricsScreen],
      ['debug', DebugScreen],
    ]);

    const screenProps = {
      orchestrator: { state, config, terminalLayout },
      info: { state, config, terminalLayout },
      'prp-context': { state, config, terminalLayout },
      agent: { state, config, terminalLayout },
      'token-metrics': {
        isActive: true,
        onNavigate: (screen: ScreenType) =>
          setState((prev) => ({ ...prev, currentScreen: screen })),
      },
      debug: { state, config, terminalLayout },
    };

    return (
      <TUIErrorBoundary debugMode={state.debugMode}>
        <MultiScreenRenderer
          config={config}
          screens={screens}
          screenProps={screenProps}
          showNavigation={true}
          onScreenFocus={(screenId) => {
            setState((prev) => ({
              ...prev,
              currentScreen: screenId as ScreenType
            }));
          }}
        />

        {/* Fixed bottom section for input */}
        <Box flexDirection="column">
          <InputBar
            value={state.input.value}
            onChange={handleInputChange}
            config={config}
            terminalLayout={terminalLayout}
          />
        </Box>
      </TUIErrorBoundary>
    );
  }

  // Single-screen mode
  return (
    <TUIErrorBoundary debugMode={state.debugMode}>
      <Box flexDirection="column" height="100%">
        {/* Main content area - takes all available space except fixed bottom */}
        <Box flexGrow={1} flexDirection="column">
          {currentScreen === 'orchestrator' && (
            <OrchestratorScreen state={state} config={config} terminalLayout={terminalLayout} />
          )}
          {currentScreen === 'info' && (
            <InfoScreen state={state} config={config} terminalLayout={terminalLayout} />
          )}
          {currentScreen === 'prp-context' && (
            <PRPContextScreen state={state} config={config} terminalLayout={terminalLayout} />
          )}
          {currentScreen === 'agent' && (
            <AgentScreen state={state} config={config} terminalLayout={terminalLayout} />
          )}
          {currentScreen === 'token-metrics' && (
            <TokenMetricsScreen
              isActive={true}
              onNavigate={(screen) =>
                setState((prev) => ({ ...prev, currentScreen: screen as ScreenType }))
              }
            />
          )}
          {currentScreen === 'debug' && (
            <DebugScreen state={state} config={config} terminalLayout={terminalLayout} />
          )}
        </Box>

        {/* Fixed bottom section matching PRP design */}
        <Box flexDirection="column">
          {/* Music status bar for enhanced monitoring */}
          {config.animations?.music?.enabled && (
            <Box flexDirection="row" justifyContent="center" width={terminalLayout.columns}>
              <MusicStatusBar
                activeSignals={Array.from(signalSubscription.signals).map(s => s.signal)}
                currentMelody="SYSTEM_READY"
                bpm={120}
              />
            </Box>
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
        </Box>
      </Box>
    </TUIErrorBoundary>
  );
};
