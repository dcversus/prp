/**
 * ♫ Token Metrics Screen Component
 *
 * Fourth screen for token monitoring and analytics dashboard
 * Basic placeholder implementation for navigation testing
 */

import React from 'react';
import { Box, Text } from 'ink';
import { TokenMetricsScreenProps } from '../../types/TUIConfig.js';

export const TokenMetricsScreen: React.FC<TokenMetricsScreenProps> = () => {
  return (
    <Box flexDirection="column" paddingY={1}>
      <Text color="orange" bold>
        📊 Token Metrics Dashboard
      </Text>
      <Text color="muted">
        ────────────────────────────────────────────
      </Text>
      <Text>
        Coming soon: Real-time token monitoring...
      </Text>
      <Text color="muted">
        • Token distribution per PRP
      </Text>
      <Text color="muted">
        • Agent performance analytics
      </Text>
      <Text color="muted">
        • Cost tracking and projections
      </Text>
    </Box>
  );
};