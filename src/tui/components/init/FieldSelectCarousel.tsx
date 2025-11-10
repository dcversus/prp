/**
 * ♫ Field Select Carousel - Horizontal selector component
 *
 * Horizontal sliding selector for choosing from a list of options.
 * Follows PRP-003 specifications for smooth carousel navigation.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../config/theme-provider.js';
import type { FieldSelectCarouselProps } from './types.js';

const FieldSelectCarousel: React.FC<FieldSelectCarouselProps> = ({
  label,
  items,
  selectedIndex,
  onChange,
  focused = false
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(focused);
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);
  // const [animating, setAnimating] = useState(false); // TODO: Implement animation

  // Sync external selection changes
  useEffect(() => {
    setCurrentIndex(selectedIndex);
  }, [selectedIndex]);

  // Sync focus state
  useEffect(() => {
    setIsFocused(focused);
  }, [focused]);

  // Handle keyboard input
  useInput((_input, key) => {
    if (!isFocused) {
      return;
    }

    if (key.escape) {
      setIsFocused(false);
      return;
    }

    if (key.leftArrow) {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      setCurrentIndex(newIndex);
      onChange(newIndex);
      // setAnimating(true); // TODO: Implement animation
      setTimeout(() => {
        // setAnimating(false);
      }, 200); // Animation duration
      return;
    }

    if (key.rightArrow) {
      const newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      setCurrentIndex(newIndex);
      onChange(newIndex);
      // setAnimating(true); // TODO: Implement animation
      setTimeout(() => {
        // setAnimating(false);
      }, 200); // Animation duration
      return;
    }

    if (key.return) {
      setIsFocused(false);
      
    }
  }, { isActive: isFocused });

  // const handleFocus = useCallback(() => {
  //   setIsFocused(true);
  // }, []); // TODO: Handle focus events

  // Calculate visible items (show 3-5 at a time depending on terminal width)
  const getVisibleRange = () => {
    const maxVisible = 5; // Show max 5 items at once
    const halfVisible = Math.floor(maxVisible / 2);

    let start = Math.max(0, currentIndex - halfVisible);
    const end = Math.min(items.length, start + maxVisible);

    // Adjust if we're near the end to always show maxVisible items
    if (end - start < maxVisible && start > 0) {
      start = Math.max(0, end - maxVisible);
    }

    return { start, end };
  };

  const { start, end } = getVisibleRange();
  const visibleItems = items.slice(start, end);
  const selectedRelativeIndex = currentIndex - start;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Label */}
      <Box flexDirection="row" marginBottom={1}>
        <Text color={theme.colors.neutrals.text} bold>
          {label}
        </Text>
      </Box>

      {/* Carousel */}
      <Box flexDirection="row" alignItems="center">
        {/* Left indicator */}
        {start > 0 && (
          <Text color={theme.colors.neutrals.muted}>
            ◀
          </Text>
        )}

        {/* Items */}
        {visibleItems.map((item, index) => {
          const isSelected = index === selectedRelativeIndex;
          // const isEdgeItem = (start > 0 && index === 0) || (end < items.length && index === visibleItems.length - 1); // TODO: Use for edge styling

          return (
            <Box key={`${start}-${index}`} flexDirection="row">
              {/* Item */}
              <Box
                paddingX={1}
                paddingY={0}
                marginRight={index < visibleItems.length - 1 ? 1 : 0}
              >
                <Text
                  color={
                    isSelected
                      ? (theme.colors.accent as any)?.orange ?? theme.colors.accent.orange
                      : isFocused
                        ? theme.colors.neutrals.text
                        : theme.colors.neutrals.muted
                  }
                  bold={isSelected}
                  dimColor={!isSelected && !isFocused}
                >
                  {item}
                </Text>
              </Box>

              {/* Separator between items */}
              {index < visibleItems.length - 1 && (
                <Text color={theme.colors.neutrals.muted}>
                  {isFocused ? '→' : '·'}
                </Text>
              )}
            </Box>
          );
        })}

        {/* Right indicator */}
        {end < items.length && (
          <Text color={theme.colors.neutrals.muted}>
            ▶
          </Text>
        )}
      </Box>

      {/* Navigation hints */}
      {isFocused && (
        <Box marginTop={1}>
          <Text color={theme.colors.neutrals.muted}>
            [←/→] switch • [Enter] select • [Tab] next field
          </Text>
        </Box>
      )}

      {/* Item counter */}
      {!isFocused && (
        <Box marginTop={0}>
          <Text color={theme.colors.neutrals.muted}>
            {currentIndex + 1} of {items.length}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default FieldSelectCarousel;