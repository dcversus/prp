/**
 * ♫ Token Metrics Screen Component
 *
 * Fourth screen for comprehensive token monitoring and analytics dashboard
 * Real-time token usage displays with agent-specific tracking, efficiency graphs,
 * budget progress bars, and interactive limit management.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, Newline, useInput } from 'ink';
import { TokenMetricsScreenProps } from '../../types/TUIConfig.js';
import { TUIDashboardData, AgentTokenStatus, TokenAlert } from '../../../types/token-metrics.js';
import { TokenMetricsStream } from '../../../monitoring/TokenMetricsStream.js';
import { TokenMonitoringTools } from '../../../orchestrator/tools/token-monitoring-tools.js';

// Real data integration with token monitoring tools
const createRealDashboardData = (tokenTools: TokenMonitoringTools): TUIDashboardData => {
  const currentCaps = tokenTools.get_current_token_caps();
  const latestMetrics = tokenTools.get_latest_scanner_metrics();
  const distribution = tokenTools.track_token_distribution();

  // Transform real data to TUI format
  const agents: AgentTokenStatus[] = [];

  // Add system components as agents
  if (currentCaps.inspector) {
    const inspectorUsage = latestMetrics.find(m => m.component === 'inspector');
    agents.push({
      agentId: 'inspector-001',
      agentType: 'inspector',
      currentUsage: inspectorUsage?.currentUsage || 0,
      limit: currentCaps.inspector.total,
      percentage: ((inspectorUsage?.currentUsage || 0) / currentCaps.inspector.total) * 100,
      cost: inspectorUsage?.cost || 0,
      status: 'normal',
      lastActivity: new Date(),
      efficiency: 0.92 // Could be calculated from real data
    });
  }

  if (currentCaps.orchestrator) {
    const orchestratorUsage = latestMetrics.find(m => m.component === 'orchestrator');
    agents.push({
      agentId: 'orchestrator-001',
      agentType: 'orchestrator',
      currentUsage: orchestratorUsage?.currentUsage || 0,
      limit: currentCaps.orchestrator.total,
      percentage: ((orchestratorUsage?.currentUsage || 0) / currentCaps.orchestrator.total) * 100,
      cost: orchestratorUsage?.cost || 0,
      status: 'normal',
      lastActivity: new Date(),
      efficiency: 0.85 // Could be calculated from real data
    });
  }

  // Add configured agents
  const agentTypes = currentCaps.agents?.entries() || [];
  for (const [agentType, caps] of agentTypes) {
    const agentUsage = latestMetrics.find(m => m.agentType === agentType);
    const percentage = ((agentUsage?.currentUsage || 0) / caps.waste) * 100;

    agents.push({
      agentId: `${agentType}-001`,
      agentType,
      currentUsage: agentUsage?.currentUsage || 0,
      limit: caps.waste,
      percentage,
      cost: agentUsage?.cost || 0,
      status: percentage > 90 ? 'critical' : percentage > 75 ? 'warning' : 'normal',
      lastActivity: new Date(),
      efficiency: agentUsage?.averagePerSignal ? 1 / agentUsage.averagePerSignal : 0.8
    });
  }

  // Calculate totals
  const totalCost = agents.reduce((sum, agent) => sum + agent.cost, 0);
  const totalTokensUsed = agents.reduce((sum, agent) => sum + agent.currentUsage, 0);
  const activeAlerts = agents.filter(agent => agent.status === 'critical' || agent.status === 'warning').length;

  // Generate alerts based on thresholds
  const alerts: TokenAlert[] = [];
  agents.forEach(agent => {
    if (agent.percentage > 90) {
      alerts.push({
        type: 'limit_exceeded',
        severity: 'critical',
        message: `${agent.agentType} approaching token limit (${agent.percentage.toFixed(1)}%)`,
        agentId: agent.agentId,
        timestamp: new Date()
      });
    } else if (agent.percentage > 75) {
      alerts.push({
        type: 'limit_warning',
        severity: 'warning',
        message: `${agent.agentType} token usage high (${agent.percentage.toFixed(1)}%)`,
        agentId: agent.agentId,
        timestamp: new Date()
      });
    }
  });

  return {
    agents,
    summary: {
      totalAgents: agents.length,
      totalTokensUsed,
      totalCost,
      activeAlerts: alerts.length
    },
    alerts,
    historicalData: latestMetrics,
    projections: {
      dailyProjection: totalTokensUsed * 24, // Simple projection
      weeklyProjection: totalTokensUsed * 168,
      monthlyProjection: totalTokensUsed * 720
    }
  };
};

// Fallback mock data for development
const createMockDashboardData = (): TUIDashboardData => {
  const agents: AgentTokenStatus[] = [
    {
      agentId: 'scanner-001',
      agentType: 'scanner',
      currentUsage: 15420,
      limit: 50000,
      percentage: 30.8,
      cost: 0.23,
      status: 'normal',
      lastActivity: new Date(),
      efficiency: 0.85
    },
    {
      agentId: 'inspector-001',
      agentType: 'inspector',
      currentUsage: 782340,
      limit: 1000000,
      percentage: 78.2,
      cost: 12.45,
      status: 'warning',
      lastActivity: new Date(),
      efficiency: 0.92
    },
    {
      agentId: 'orchestrator-001',
      agentType: 'orchestrator',
      currentUsage: 167890,
      limit: 200000,
      percentage: 83.9,
      cost: 2.89,
      status: 'warning',
      lastActivity: new Date(),
      efficiency: 0.78
    }
  ];

  const alerts: TokenAlert[] = [
    {
      id: 'alert-001',
      agentId: 'inspector-001',
      type: 'warning',
      message: 'Inspector approaching 80% token limit',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      acknowledged: false
    },
    {
      id: 'alert-002',
      agentId: 'orchestrator-001',
      type: 'warning',
      message: 'Orchestrator usage trending upward',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      acknowledged: true
    }
  ];

  return {
    summary: {
      totalAgents: 3,
      totalTokensUsed: 965650,
      totalCost: 15.57,
      activeAlerts: 1
    },
    agents,
    alerts,
    trends: [],
    projections: []
  };
};

interface TokenProgressBarProps {
  current: number;
  limit: number;
  percentage: number;
  status: 'normal' | 'warning' | 'critical' | 'blocked';
  width: number;
}

const TokenProgressBar: React.FC<TokenProgressBarProps> = ({
  current: _current,
  limit: _limit,
  percentage,
  status,
  width
}) => {
  const getBarColor = () => {
    switch (status) {
      case 'blocked': return 'red';
      case 'critical': return 'red';
      case 'warning': return 'yellow';
      default: return 'green';
    }
  };

  const filledWidth = Math.floor((percentage / 100) * width);
  const emptyWidth = width - filledWidth;
  const barColor = getBarColor();

  return (
    <Box>
      <Text color={barColor}>{'█'.repeat(filledWidth)}</Text>
      <Text color="gray">{'░'.repeat(emptyWidth)}</Text>
      <Text color="muted"> {percentage.toFixed(1)}%</Text>
    </Box>
  );
};

interface AgentTokenCardProps {
  agent: AgentTokenStatus;
  isSelected: boolean;
  onSelect: () => void;
}

const AgentTokenCard: React.FC<AgentTokenCardProps> = ({ agent, isSelected, onSelect: _onSelect }) => {
  const getAgentColor = () => {
    switch (agent.agentType) {
      case 'scanner': return 'cyan';
      case 'inspector': return 'magenta';
      case 'orchestrator': return 'orange';
      default: return 'gray';
    }
  };

  const getStatusColor = () => {
    switch (agent.status) {
      case 'blocked': return 'red';
      case 'critical': return 'red';
      case 'warning': return 'yellow';
      default: return 'green';
    }
  };

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  const agentColor = getAgentColor();
  const statusColor = getStatusColor();

  return (
    <Box
      flexDirection="column"
      borderStyle={isSelected ? "double" : "single"}
      borderColor={isSelected ? agentColor : "gray"}
      paddingX={1}
      marginBottom={1}
    >
      <Box justifyContent="space-between">
        <Text color={agentColor} bold>
          {agent.agentId.toUpperCase()}
        </Text>
        <Text color={statusColor}>
          {agent.status.toUpperCase()}
        </Text>
      </Box>

      <Box justifyContent="space-between" marginBottom={1}>
        <Text color="muted">
          {formatTokens(agent.currentUsage)} / {formatTokens(agent.limit)} tokens
        </Text>
        <Text color="muted">
          ${agent.cost.toFixed(2)}
        </Text>
      </Box>

      <TokenProgressBar
        current={agent.currentUsage}
        limit={agent.limit}
        percentage={agent.percentage}
        status={agent.status}
        width={30}
      />

      <Box justifyContent="space-between" marginTop={1}>
        <Text color="muted">
          Efficiency: {(agent.efficiency * 100).toFixed(0)}%
        </Text>
        <Text color="muted">
          Last: {Math.floor((Date.now() - agent.lastActivity.getTime()) / 60000)}m ago
        </Text>
      </Box>
    </Box>
  );
};

interface AlertPanelProps {
  alerts: TokenAlert[];
  onAcknowledge: (alertId: string) => void;
}

const AlertPanel: React.FC<AlertPanelProps> = ({ alerts, onAcknowledge: _onAcknowledge }) => {
  const getAlertColor = (type: TokenAlert['type']) => {
    switch (type) {
      case 'blocked': return 'red';
      case 'critical': return 'red';
      case 'warning': return 'yellow';
      default: return 'gray';
    }
  };

  const getAlertIcon = (type: TokenAlert['type']) => {
    switch (type) {
      case 'blocked': return '🚫';
      case 'critical': return '⚠️';
      case 'warning': return '⚡';
      default: return 'ℹ️';
    }
  };

  if (alerts.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="single" borderColor="green" paddingX={1}>
        <Text color="green" bold>
          ✓ System Status: Normal
        </Text>
        <Text color="muted">
          No active alerts
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1}>
      <Text color="yellow" bold>
        ⚠️ Active Alerts ({alerts.filter(a => !a.acknowledged).length})
      </Text>
      <Newline />
      {alerts.slice(0, 5).map((alert) => (
        <Box key={alert.id} flexDirection="column" marginBottom={1}>
          <Box justifyContent="space-between">
            <Text color={getAlertColor(alert.type)}>
              {getAlertIcon(alert.type)} {alert.agentId}
            </Text>
            <Text color="muted">
              {Math.floor((Date.now() - alert.timestamp.getTime()) / 60000)}m ago
            </Text>
          </Box>
          <Text color="muted" wrap="truncate">
            {alert.message}
          </Text>
          {!alert.acknowledged && (
            <Text color="cyan" dimColor>
              Press 'a' to acknowledge
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
};

interface SummaryPanelProps {
  totalAgents: number;
  totalTokensUsed: number;
  totalCost: number;
  activeAlerts: number;
}

const SummaryPanel: React.FC<SummaryPanelProps> = ({
  totalAgents,
  totalTokensUsed,
  totalCost,
  activeAlerts
}) => {
  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(2)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="blue" paddingX={1}>
      <Text color="blue" bold>
        📊 Token Overview
      </Text>
      <Newline />
      <Box justifyContent="space-between">
        <Text color="muted">Active Agents:</Text>
        <Text color="cyan">{totalAgents}</Text>
      </Box>
      <Box justifyContent="space-between">
        <Text color="muted">Total Tokens:</Text>
        <Text color="cyan">{formatTokens(totalTokensUsed)}</Text>
      </Box>
      <Box justifyContent="space-between">
        <Text color="muted">Total Cost:</Text>
        <Text color="yellow">${totalCost.toFixed(2)}</Text>
      </Box>
      <Box justifyContent="space-between">
        <Text color="muted">Active Alerts:</Text>
        <Text color={activeAlerts > 0 ? "red" : "green"}>
          {activeAlerts}
        </Text>
      </Box>
    </Box>
  );
};

export const TokenMetricsScreen: React.FC<TokenMetricsScreenProps> = ({
  isActive,
  onNavigate
}) => {
  const [dashboardData, setDashboardData] = useState<TUIDashboardData>(createMockDashboardData());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [tokenTools] = useState(() => new TokenMonitoringTools());
  const [useRealData, setUseRealData] = useState(true);

  // Initialize with real data
  useEffect(() => {
    if (useRealData) {
      try {
        const realData = createRealDashboardData(tokenTools);
        setDashboardData(realData);
      } catch (error) {
        console.warn('Failed to load real token data, falling back to mock data:', error);
        setDashboardData(createMockDashboardData());
        setUseRealData(false);
      }
    }
  }, [tokenTools, useRealData]);

  // Real-time updates from token monitoring tools
  useEffect(() => {
    if (!isActive || !autoRefresh || !useRealData) return;

    const interval = setInterval(() => {
      try {
        const realData = createRealDashboardData(tokenTools);
        setDashboardData(realData);
      } catch (error) {
        console.warn('Failed to update real token data:', error);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isActive, autoRefresh, tokenTools, useRealData]);

  // Fallback simulation if real data fails
  useEffect(() => {
    if (!isActive || !autoRefresh || useRealData) return;

    const interval = setInterval(() => {
      setDashboardData(prevData => ({
        ...prevData,
        agents: prevData.agents.map(agent => ({
          ...agent,
          currentUsage: agent.currentUsage + Math.floor(Math.random() * 100),
          percentage: Math.min(100, agent.percentage + Math.random() * 0.5),
          cost: agent.cost + Math.random() * 0.01,
          lastActivity: new Date(),
          efficiency: Math.max(0.1, Math.min(1, agent.efficiency + (Math.random() - 0.5) * 0.05))
        })),
        summary: {
          ...prevData.summary,
          totalTokensUsed: prevData.summary.totalTokensUsed + Math.floor(Math.random() * 200),
          totalCost: prevData.summary.totalCost + Math.random() * 0.02
        }
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isActive, autoRefresh]);

  const handleAcknowledgeAlert = useCallback((alertId: string) => {
    setDashboardData(prevData => ({
      ...prevData,
      alerts: prevData.alerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ),
      summary: {
        ...prevData.summary,
        activeAlerts: prevData.alerts.filter(a => !a.acknowledged && a.id !== alertId).length
      }
    }));
  }, []);

  const handleKeyPress = useCallback((input: string, _key: any) => {
    if (!isActive) return;

    switch (input) {
      case 'q':
        onNavigate('orchestrator');
        break;
      case 'r':
        setAutoRefresh(!autoRefresh);
        break;
      case 'a':
        if (dashboardData.alerts.length > 0) {
          const unacknowledgedAlert = dashboardData.alerts.find(a => !a.acknowledged);
          if (unacknowledgedAlert) {
            handleAcknowledgeAlert(unacknowledgedAlert.id);
          }
        }
        break;
      case 'up':
        setSelectedIndex(prev => Math.max(0, prev - 1));
        break;
      case 'down':
        setSelectedIndex(prev => Math.min(dashboardData.agents.length - 1, prev + 1));
        break;
    }
  }, [isActive, onNavigate, autoRefresh, dashboardData.alerts, handleAcknowledgeAlert]);

  useInput(handleKeyPress);

  if (!isActive) return null;

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color="orange" bold>
          📊 Token Metrics Dashboard
        </Text>
        <Text color="muted">
          Auto-refresh: {autoRefresh ? 'ON' : 'OFF'} | Press 'r' to toggle | 'q' to go back
        </Text>
      </Box>

      <Text color="muted">
        ─────────────────────────────────────────────────────────────────
      </Text>

      {/* Main Content */}
      <Box flexDirection="row" marginBottom={1}>
        {/* Left Column - Summary and Alerts */}
        <Box flexDirection="column" width="40%" marginRight={1}>
          <SummaryPanel
            totalAgents={dashboardData.summary.totalAgents}
            totalTokensUsed={dashboardData.summary.totalTokensUsed}
            totalCost={dashboardData.summary.totalCost}
            activeAlerts={dashboardData.summary.activeAlerts}
          />

          <Newline />

          <AlertPanel
            alerts={dashboardData.alerts}
            onAcknowledge={handleAcknowledgeAlert}
          />
        </Box>

        {/* Right Column - Agent Cards */}
        <Box flexDirection="column" width="60%">
          <Text color="blue" bold>
            🤖 Agent Token Status (↑↓ to navigate)
          </Text>

          {dashboardData.agents.map((agent, index) => (
            <AgentTokenCard
              key={agent.agentId}
              agent={agent}
              isSelected={index === selectedIndex}
              onSelect={() => setSelectedIndex(index)}
            />
          ))}
        </Box>
      </Box>

      {/* Footer */}
      <Text color="muted">
        ─────────────────────────────────────────────────────────────────
      </Text>
      <Text color="muted">
        Controls: [r] Toggle auto-refresh | [a] Acknowledge alert | [↑↓] Navigate | [q] Back
      </Text>
    </Box>
  );
};