/**
 * ♫ TUI App Component
 *
 * Main application component handling screen routing and global state
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useApp } from 'ink';
import { TUIConfig, TUIState, TerminalResizeEvent, SignalUpdateEvent, AgentUpdateEvent, HistoryUpdateEvent, IntroCompleteEvent, ScreenType, AgentCard, PRPItem, HistoryItem } from '../types/TUIConfig.js';
import { EventBus } from '../../shared/events.js';
import { VideoIntro } from './VideoIntro.js';
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

// Helper functions for real-time data conversion
function getRoleForSignal(signal: any): string {
  const category = signal.category;
  const roleMap: Record<string, string> = {
    'system': 'robo-system-analyst',
    'development': 'robo-developer',
    'analysis': 'robo-system-analyst',
    'incident': 'robo-devops-sre',
    'coordination': 'orchestrator',
    'testing': 'robo-aqa',
    'release': 'robo-devops-sre',
    'design': 'robo-ux-ui-designer'
  };
  return roleMap[category] || 'robo-developer';
}

function getStatusForSignals(signals: any[]): string {
  const activeSignals = signals.filter(s => s.state === 'active' || s.state === 'progress');
  const highPrioritySignals = signals.filter(s => s.code === '[FF]' || s.code === '[bb]' || s.code === '[ff]');

  if (highPrioritySignals.length > 0) return 'RUNNING';
  if (activeSignals.length > 0) return 'SPAWNING';
  return 'IDLE';
}

function getStatusIcon(status: string): string {
  switch (status?.toUpperCase()) {
    case 'SPAWNING': return '♪';
    case 'RUNNING': return '♬';
    case 'IDLE': return '♫';
    case 'ERROR': return '♫';
    default: return '♫';
  }
}

function formatTimeLeft(activeTime?: number): string {
  if (!activeTime) return 'T--:--';
  const minutes = Math.floor(activeTime / 60);
  const seconds = Math.floor(activeTime % 60);
  return `T-${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatActiveTime(activeTime?: number): string {
  if (!activeTime) return '00:00:00';
  const hours = Math.floor(activeTime / 3600);
  const minutes = Math.floor((activeTime % 3600) / 60);
  const seconds = Math.floor(activeTime % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatTokenCount(tokens?: number): string {
  if (!tokens) return '0';
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
  return tokens.toString();
}

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

  // Debounced state update to prevent excessive re-renders
  const debouncedSetState = useCallback((updater: (prev: TUIState) => TUIState) => {
    const now = Date.now();

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

    // Handle real-time signal events from scanner with error handling
    const handleSignalEvent = (event: any) => {
      try {
        if (event?.type === 'signal' && event?.data) {
          const signal = event.data;

          // Validate signal data
          if (!signal || typeof signal !== 'object') {
            logger.warn('tui', 'Invalid signal data received', event);
            return;
          }

          debouncedSetState(prev => {
            // Extract PRP name from signal source or create default
            const prpName = signal.source?.prpName || 'unknown-prp';

            // Convert signal to TUI signal format
            const tuiSignal = {
              code: `[${signal.id || 'XX'}]`,
              state: signal.priority >= 8 ? 'active' : 'resolved',
              role: getRoleForSignal(signal),
              latest: true
            };

            const existingPRP = prev.prps.get(prpName);
            const signals = existingPRP?.signals || [];

            // Update or add signal with race condition prevention
            const updatedSignals = signals.filter(s => s.code !== tuiSignal.code);
            updatedSignals.push(tuiSignal);

            const updatedPRP = {
              name: prpName,
              status: getStatusForSignals(updatedSignals),
              role: tuiSignal.role || 'robo-developer',
              signals: updatedSignals.slice(-7), // Keep last 7 signals
              lastUpdate: new Date()
            };

            const newPRPs = new Map(prev.prps);
            newPRPs.set(prpName, updatedPRP);

            return { ...prev, prps: newPRPs };
          });
        }
      } catch (error) {
        logger.error('tui', 'Error in handleSignalEvent:', error);
      }
    };

    // Handle real-time agent events from orchestrator with error handling
    const handleAgentEvent = (event: any) => {
      try {
        if (event?.type?.startsWith('agent_') && event?.data) {
          const agentData = event.data;

          // Validate agent data
          if (!agentData || typeof agentData !== 'object') {
            logger.warn('tui', 'Invalid agent data received', event);
            return;
          }

          debouncedSetState(prev => {
            const agentId = agentData.agentId || `agent-${Date.now()}`;
            const existingAgent = prev.agents.get(agentId);

            // Race condition prevention: only update if newer
            const eventTime = new Date(agentData.lastUpdate || Date.now());
            const existingTime = existingAgent?.lastUpdate;

            if (existingTime && eventTime <= existingTime) {
              return prev; // Skip outdated event
            }

            // Convert agent event to TUI agent format
            const tuiAgent: AgentCard = {
              id: agentId,
              statusIcon: getStatusIcon(agentData.status),
              status: agentData.status?.toUpperCase() || 'RUNNING',
              prp: agentData.prpName || 'unknown-prp',
              role: agentData.role || 'robo-developer',
              task: agentData.task || agentData.description || 'Processing...',
              timeLeft: agentData.timeLeft || formatTimeLeft(agentData.activeTime),
              progress: agentData.progress || 0,
              output: agentData.output ?
                [agentData.output].slice(-3) : // Keep only last 3 output lines
                existingAgent?.output || ['Initializing...'],
              tokens: formatTokenCount(agentData.tokensUsed),
              active: formatActiveTime(agentData.activeTime),
              lastUpdate: eventTime
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
    const handleScannerEvent = (event: any) => {
      try {
        if (event?.type?.startsWith('scanner_') && event?.data) {
          // Validate scanner event data
          if (!event.data || typeof event.data !== 'object') {
            logger.warn('tui', 'Invalid scanner event data received', event);
            return;
          }

          const historyItem: HistoryItem = {
            source: 'scanner',
            timestamp: new Date().toISOString().replace('T', ' ').substr(0, 19),
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
    const handleInspectorEvent = (event: any) => {
      try {
        if (event?.type?.startsWith('inspector_') && event?.data) {
          // Validate inspector event data
          if (!event.data || typeof event.data !== 'object') {
            logger.warn('tui', 'Invalid inspector event data received', event);
            return;
          }

          const historyItem: HistoryItem = {
            source: 'inspector',
            timestamp: new Date().toISOString().replace('T', ' ').substr(0, 19),
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
    const handleOrchestratorEvent = (event: any) => {
      try {
        if (event?.type?.startsWith('orchestrator_') && event?.data) {
          // Validate orchestrator event data
          if (!event.data || typeof event.data !== 'object') {
            logger.warn('tui', 'Invalid orchestrator event data received', event);
            return;
          }

          debouncedSetState(prev => ({
            ...prev,
            orchestrator: {
              status: event.data.status || 'RUNNING',
              prp: event.data.currentPRP || 'unknown-prp',
              signals: prev.orchestrator?.signals || [],
              latestSignalIndex: 0,
              cotLines: event.data.cotLines || ['Processing...'],
              toolCall: event.data.currentTool || '',
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
    const unsubscribeSignal = eventBus.subscribeToChannel('signals', handleSignalEvent);
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

  // Setup keyboard input handling
  useEffect(() => {
    const handleKeyPress = (data: Buffer) => {
      const key = data.toString();

      switch (key) {
        case '\t': // Tab
          setState(prev => {
            const screens: ScreenType[] = ['orchestrator', 'prp-context', 'agent', 'token-metrics'];
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

  // Initialize with system startup message
  useEffect(() => {
    if (introComplete) {
      // Add initial system startup message
      const startupHistory: HistoryItem = {
        source: 'system',
        timestamp: new Date().toISOString().replace('T', ' ').substr(0, 19),
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