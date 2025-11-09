/**
 * ♫ GenerationProgress - Real-time generation progress component
 *
 * Tracks file copying, generation steps, diff snapshots,
 * and CoT (Chain of Thought) progress with visual feedback
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text } from 'ink';

// Import types
import type { TUIConfig } from '../../types/TUIConfig.js';

export interface GenerationStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number; // 0-100
  message?: string;
  details?: string;
  duration?: number; // ms
}

export interface CopyProgress {
  current: string;
  count: number;
  total: number;
  bytesCopied?: number;
  totalBytes?: number;
}

export interface GenerationEvent {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export interface DiffSnapshot {
  file: string;
  additions: number;
  deletions: number;
  changes: number;
  preview?: string[];
}

export interface CoTSnapshot {
  title: string;
  lines: string[];
  file?: string;
}

export interface GenerationProgressProps {
  copying?: CopyProgress;
  steps: GenerationStep[];
  events: GenerationEvent[];
  diffSnapshots?: DiffSnapshot[];
  cotSnapshots?: CoTSnapshot[];
  config?: TUIConfig;
  showDetails?: boolean;
  maxHeight?: number;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  copying,
  steps,
  events,
  diffSnapshots = [],
  cotSnapshots = [],
  config,
  showDetails = true,
  maxHeight = 15
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const scrollContainerRef = useRef<any>(null);

  // Animation frame updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 60);
    }, 100); // 10 fps for progress animation

    return () => clearInterval(interval);
  }, []);

  // Find current running step
  useEffect(() => {
    const runningStepIndex = steps.findIndex(step => step.status === 'running');
    if (runningStepIndex >= 0) {
      setCurrentStepIndex(runningStepIndex);
    }
  }, [steps]);

  // Calculate overall progress
  const calculateOverallProgress = useCallback(() => {
    if (steps.length === 0) return 0;

    const totalProgress = steps.reduce((sum, step) => {
      const stepProgress = step.progress || (step.status === 'completed' ? 100 : 0);
      return sum + stepProgress;
    }, 0);

    return Math.round(totalProgress / steps.length);
  }, [steps]);

  // Format duration
  const formatDuration = useCallback((ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  }, []);

  // Progress bar animation
  const renderProgressBar = useCallback((progress: number, width: number = 30) => {
    const filledChars = Math.floor((progress / 100) * width);
    const emptyChars = width - filledChars;
    const animationChar = animationFrame % 2 === 0 ? '█' : '▓';

    return (
      <Box flexDirection="row">
        <Text color={config?.colors?.accent_orange}>
          {'█'.repeat(filledChars)}
        </Text>
        <Text color={config?.colors?.muted}>
          {animationFrame % 4 < 2 ? animationChar : '░'}.repeat(emptyChars)
        </Text>
        <Text color={config?.colors?.muted}>
          {' '}
          {Math.round(progress)}%
        </Text>
      </Box>
    );
  }, [animationFrame, config]);

  // Copy progress visualization
  const renderCopyProgress = useCallback(() => {
    if (!copying) return null;

    const copyProgress = Math.round((copying.count / copying.total) * 100);
    const speed = copying.bytesCopied && copying.duration
      ? `${Math.round(copying.bytesCopied / (copying.duration / 1000) / 1024)}KB/s`
      : '';

    return (
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor={config?.colors?.accent_orange} padding={1}>
        <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
          <Text color={config?.colors?.accent_orange} bold>
            Copying Files
          </Text>
          <Text color={config?.colors?.muted}>
            {copying.count} / {copying.total}
          </Text>
        </Box>

        {renderProgressBar(copyProgress, 40)}

        <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
          <Text color={config?.colors?.muted} dimColor>
            {copying.current}
          </Text>
          {speed && (
            <Text color={config?.colors?.muted} dimColor>
              {speed}
            </Text>
          )}
        </Box>
      </Box>
    );
  }, [copying, renderProgressBar, config]);

  // Steps visualization
  const renderSteps = useCallback(() => {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text color={config?.colors?.accent_orange} bold marginBottom={1}>
          Generation Steps
        </Text>

        {steps.map((step, index) => {
          const isCurrent = index === currentStepIndex;
          const statusIcon = step.status === 'completed' ? '✓' :
                           step.status === 'running' ? (animationFrame % 4 < 2 ? '⟳' : '◫') :
                           step.status === 'error' ? '✗' : '○';

          const statusColor = step.status === 'completed' ? config?.colors?.ok :
                            step.status === 'running' ? config?.colors?.accent_orange :
                            step.status === 'error' ? config?.colors?.error :
                            config?.colors?.muted;

          return (
            <Box key={index} flexDirection="column" marginBottom={1}>
              <Box flexDirection="row" alignItems="center">
                <Text color={statusColor} marginRight={1}>
                  {statusIcon}
                </Text>
                <Text color={isCurrent ? config?.colors?.accent_orange : config?.colors?.base_fg} bold={isCurrent}>
                  {step.name}
                </Text>
                <Box flexGrow={1} />
                {step.duration && (
                  <Text color={config?.colors?.muted} dimColor>
                    {formatDuration(step.duration)}
                  </Text>
                )}
              </Box>

              {/* Step progress bar */}
              {isCurrent && step.progress !== undefined && (
                <Box marginLeft={3} marginTop={1}>
                  {renderProgressBar(step.progress)}
                </Box>
              )}

              {/* Step message */}
              {step.message && (
                <Text color={config?.colors?.muted} dimColor marginLeft={3}>
                  {step.message}
                </Text>
              )}

              {/* Step details */}
              {step.details && showDetails && (
                <Text color={config?.colors?.muted} dimColor marginLeft={3}>
                  {step.details}
                </Text>
              )}
            </Box>
          );
        })}
      </Box>
    );
  }, [steps, currentStepIndex, animationFrame, showDetails, renderProgressBar, formatDuration, config]);

  // Diff snapshots
  const renderDiffSnapshots = useCallback(() => {
    if (diffSnapshots.length === 0 || !showDetails) return null;

    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text color={config?.colors?.accent_orange} bold marginBottom={1}>
          Recent Changes
        </Text>

        {diffSnapshots.slice(-3).map((diff, index) => (
          <Box key={index} flexDirection="column" marginBottom={1} marginLeft={2}>
            <Box flexDirection="row">
              <Text color={config?.colors?.ok}>
                +{diff.additions}
              </Text>
              <Text color={config?.colors?.error} marginLeft={1}>
                -{diff.deletions}
              </Text>
              <Text color={config?.colors?.muted} marginLeft={2}>
                {diff.file}
              </Text>
            </Box>

            {diff.preview && diff.preview.length > 0 && (
              <Box flexDirection="column" marginLeft={2}>
                {diff.preview.slice(0, 3).map((line, lineIndex) => (
                  <Text key={lineIndex} color={
                    line.startsWith('+') ? config?.colors?.ok :
                    line.startsWith('-') ? config?.colors?.error :
                    config?.colors?.muted
                  } dimColor>
                    {line}
                  </Text>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    );
  }, [diffSnapshots, showDetails, config]);

  // CoT snapshots
  const renderCoTSnapshots = useCallback(() => {
    if (cotSnapshots.length === 0 || !showDetails) return null;

    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text color={config?.colors?.accent_orange} bold marginBottom={1}>
          Chain of Thought
        </Text>

        {cotSnapshots.slice(-2).map((cot, index) => (
          <Box key={index} flexDirection="column" marginBottom={1} marginLeft={2}>
            <Text color={config?.colors?.accent_orange}>
              {cot.title}
            </Text>
            {cot.file && (
              <Text color={config?.colors?.muted} dimColor>
                {cot.file}
              </Text>
            )}
            <Box flexDirection="column">
              {cot.lines.slice(0, 3).map((line, lineIndex) => (
                <Text key={lineIndex} color={config?.colors?.muted} dimColor marginLeft={2}>
                  {line}
                </Text>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    );
  }, [cotSnapshots, showDetails, config]);

  // Event log
  const renderEventLog = useCallback(() => {
    const recentEvents = events.slice(-5);

    return (
      <Box flexDirection="column">
        <Text color={config?.colors?.accent_orange} bold marginBottom={1}>
          Activity Log
        </Text>

        {recentEvents.length === 0 ? (
          <Text color={config?.colors?.muted} dimColor>
            No recent activity
          </Text>
        ) : (
          recentEvents.map((event) => (
            <Box key={event.id} flexDirection="row" marginBottom={1}>
              <Text color={
                event.type === 'success' ? config?.colors?.ok :
                event.type === 'error' ? config?.colors?.error :
                event.type === 'warning' ? config?.colors?.warn :
                config?.colors?.muted
              }>
                [{event.timestamp.toLocaleTimeString()}]
              </Text>
              <Text color={config?.colors?.muted} marginLeft={1}>
                {event.message}
              </Text>
            </Box>
          ))
        )}
      </Box>
    );
  }, [events, config]);

  // Overall progress
  const overallProgress = calculateOverallProgress();
  const isComplete = overallProgress === 100;
  const hasErrors = steps.some(step => step.status === 'error');

  return (
    <Box flexDirection="column" maxHeight={maxHeight}>
      {/* Overall progress */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom={1}>
        <Text color={config?.colors?.accent_orange} bold>
          {isComplete ? '✓' : hasErrors ? '⚠' : '⟳'}  Generation Progress
        </Text>
        <Text color={config?.colors?.muted}>
          {overallProgress}% complete
        </Text>
      </Box>

      {renderProgressBar(overallProgress, 50)}

      {/* Copy progress */}
      {renderCopyProgress()}

      {/* Steps */}
      {renderSteps()}

      {/* Diff snapshots */}
      {renderDiffSnapshots()}

      {/* CoT snapshots */}
      {renderCoTSnapshots()}

      {/* Event log */}
      {renderEventLog()}

      {/* Status footer */}
      <Box flexDirection="row" justifyContent="center" marginTop={1}>
        <Text color={isComplete ? config?.colors?.ok : hasErrors ? config?.colors?.error : config?.colors?.accent_orange}>
          {isComplete ? '✓ Generation Complete' :
           hasErrors ? '⚠ Generation Completed with Errors' :
           '⟳ Generation in Progress...'}
        </Text>
      </Box>
    </Box>
  );
};

export default GenerationProgress;