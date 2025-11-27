/**
 * ♫ Signal Filter Component for @dcversus/prp TUI
 *
 * Interactive filtering system for signal streams with advanced search capabilities.
 */

import React, { JSX, useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

import {
  SignalSourceEnum,
  SignalPriorityEnum,
} from '../../types';

import type {
  SignalEvent,
  SignalSource,
  SignalPriority} from '../../types';

export interface SignalFilterProps {
  signals: SignalEvent[];
  onFilter: (filtered: SignalEvent[]) => void;
  availableSources?: SignalSource[];
  availablePriorities?: SignalPriority[];
  placeholder?: string;
  showStats?: boolean;
};

export const SignalFilter: React.FC<SignalFilterProps> = ({
  signals,
  onFilter,
  availableSources = Object.values(SignalSourceEnum),
  availablePriorities = Object.values(SignalPriorityEnum),
  placeholder = 'Filter signals...',
  showStats = true,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedSources, setSelectedSources] = useState<SignalSource[]>(availableSources);
  const [selectedPriorities, setSelectedPriorities] =
    useState<SignalPriority[]>(availablePriorities);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = signals;

    // Text search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        (signal) =>
          signal.title.toLowerCase().includes(searchLower) ||
          signal.description.toLowerCase().includes(searchLower) ||
          signal.signal.toLowerCase().includes(searchLower) ||
          signal.source.toLowerCase().includes(searchLower),
      );
    }

    // Source filter
    if (selectedSources.length < availableSources.length) {
      filtered = filtered.filter((signal) => selectedSources.includes(signal.source));
    }

    // Priority filter
    if (selectedPriorities.length < availablePriorities.length) {
      filtered = filtered.filter((signal) => selectedPriorities.includes(signal.priority));
    }

    onFilter(filtered);
  }, [
    signals,
    searchText,
    selectedSources,
    selectedPriorities,
    availableSources,
    availablePriorities,
    onFilter,
  ]);

  // Apply filters whenever dependencies change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Toggle source selection
  const toggleSource = useCallback((source: SignalSource) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source],
    );
  }, []);

  // Toggle priority selection
  const togglePriority = useCallback((priority: SignalPriority) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority],
    );
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchText('');
    setSelectedSources(availableSources);
    setSelectedPriorities(availablePriorities);
  }, [availableSources, availablePriorities]);

  // Get filter statistics
  const getFilterStats = useCallback(() => {
    const total = signals.length;
    const filtered = signals.filter((signal) => {
      const matchesText =
        !searchText.trim() ||
        signal.title.toLowerCase().includes(searchText.toLowerCase()) ||
        signal.description.toLowerCase().includes(searchText.toLowerCase());

      const matchesSource = selectedSources.includes(signal.source);
      const matchesPriority = selectedPriorities.includes(signal.priority);

      return matchesText && matchesSource && matchesPriority;
    }).length;

    return { total, filtered };
  }, [signals, searchText, selectedSources, selectedPriorities]);

  const stats = getFilterStats();

  // Handle keyboard input
  useInput((input, key) => {
    if (key.return) {
      // Focus/unfocus search
      setIsFocused(!isFocused);
      return;
    }

    if (isFocused) {
      // Handle search input
      if (key.backspace || key.delete) {
        setSearchText((prev) => prev.slice(0, -1));
      } else if (key.ctrl || key.meta) {
        // Ignore control keys
      } else if (input.length === 1) {
        setSearchText((prev) => prev + input);
      }
    } else {
      // Handle hotkeys
      switch (input) {
        case 'a':
          setIsAdvancedMode((prev) => !prev);
          break;
        case 'c':
          clearFilters();
          break;
      }
    }
  });

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🔍 Signal Filter {isAdvancedMode && '(Advanced)'}
        </Text>
      </Box>

      {/* Search Input */}
      <Box marginBottom={1}>
        <Text color="gray">Search: </Text>
        <Text
          color={isFocused ? 'green' : 'white'}
          backgroundColor={isFocused ? 'white' : undefined}
        >
          {searchText || (isFocused ? '' : placeholder)}
          {isFocused && (
            <Text backgroundColor="white" color="black">
              _
            </Text>
          )}
        </Text>
      </Box>

      {/* Filter Controls */}
      <Box marginBottom={1}>
        <Text color="gray">
          Mode:{' '}
          <Text color={isAdvancedMode ? 'green' : 'yellow'} bold>
            {isAdvancedMode ? 'Advanced' : 'Simple'}
          </Text>{' '}
          | Press 'a' to toggle
        </Text>
      </Box>

      {/* Advanced Filters */}
      {isAdvancedMode && (
        <Box flexDirection="column" marginBottom={1}>
          {/* Source Filters */}
          <Box marginBottom={1}>
            <Text color="gray" bold>
              Sources:
            </Text>
            <Box flexDirection="row" flexWrap="wrap">
              {availableSources.map((source) => (
                <Box key={source} marginRight={1}>
                  <Text
                    color={selectedSources.includes(source) ? 'green' : 'gray'}
                    bold={selectedSources.includes(source)}
                  >
                    [{selectedSources.includes(source) ? '✓' : ' '}] {source}
                  </Text>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Priority Filters */}
          <Box>
            <Text color="gray" bold>
              Priorities:
            </Text>
            <Box flexDirection="row" flexWrap="wrap">
              {availablePriorities.map((priority) => {
                const isSelected = selectedPriorities.includes(priority);
                const priorityColor = isSelected ? 'green' : 'gray';

                return (
                  <Box key={priority} marginRight={1}>
                    <Text color={priorityColor} bold={isSelected}>
                      [{isSelected ? '✓' : ' '}] {priority.toUpperCase()}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      )}

      {/* Statistics */}
      {showStats && (
        <Box marginBottom={1}>
          <Text color="gray">
            Results: {stats.filtered} / {stats.total} signals
            {stats.filtered < stats.total && (
              <Text color="yellow">
                {' '}
                ({Math.round((stats.filtered / stats.total) * 100)}% shown)
              </Text>
            )}
          </Text>
        </Box>
      )}

      {/* Quick Actions */}
      <Box>
        <Text color="gray">
          Actions:
          <Text color="blue"> [c] Clear</Text>
          <Text color="blue"> [a] Advanced</Text>
        </Text>
      </Box>
    </Box>
  );
};

export default SignalFilter;
