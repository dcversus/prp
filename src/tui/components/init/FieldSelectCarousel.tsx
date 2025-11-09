/**
 * ♫ FieldSelectCarousel - Horizontal carousel selector
 *
 * Horizontal slide selector with easing animations,
 * left/right navigation, and visual highlighting
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

// Import types
import type { TUIConfig } from '../../types/TUIConfig.js';

export interface FieldSelectCarouselProps {
  label: string;
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  config?: TUIConfig;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  wrap?: boolean;
  showIndex?: boolean;
  animationDuration?: number;
}

export const FieldSelectCarousel: React.FC<FieldSelectCarouselProps> = ({
  label,
  items,
  selectedIndex,
  onChange,
  config,
  disabled = false,
  onFocus,
  onBlur,
  wrap = true,
  showIndex = false,
  animationDuration = 150
}) => {
  const [focused, setFocused] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(selectedIndex);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Animate to new selection with easing
  useEffect(() => {
    if (selectedIndex !== displayIndex && !animating) {
      setAnimating(true);
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);

        // Ease-out cubic animation
        const easeOut = 1 - Math.pow(1 - progress, 3);

        if (progress < 1) {
          setAnimationFrame(easeOut);
          requestAnimationFrame(animate);
        } else {
          setDisplayIndex(selectedIndex);
          setAnimating(false);
          setAnimationFrame(0);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [selectedIndex, displayIndex, animating, animationDuration]);

  // Handle navigation
  const handleLeft = useCallback(() => {
    if (disabled || animating) return;

    const newIndex = wrap
      ? selectedIndex === 0 ? items.length - 1 : selectedIndex - 1
      : Math.max(0, selectedIndex - 1);

    onChange(newIndex);
  }, [disabled, animating, selectedIndex, onChange, wrap, items.length]);

  const handleRight = useCallback(() => {
    if (disabled || animating) return;

    const newIndex = wrap
      ? (selectedIndex + 1) % items.length
      : Math.min(items.length - 1, selectedIndex + 1);

    onChange(newIndex);
  }, [disabled, animating, selectedIndex, onChange, wrap, items.length]);

  // Handle focus
  const handleFocus = useCallback(() => {
    if (disabled) return;
    setFocused(true);
    onFocus?.();
  }, [disabled, onFocus]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    onBlur?.();
  }, [onBlur]);

  // Keyboard navigation
  useInput((input, key) => {
    if (key.leftArrow) {
      handleLeft();
    } else if (key.rightArrow) {
      handleRight();
    } else if (key.tab) {
      handleBlur();
    } else if (!focused && !disabled) {
      handleFocus();
    }
  }, { isActive: !disabled });

  // Color scheme
  const colors = config?.colors;
  const labelColor = disabled
    ? colors?.gray
    : focused
      ? colors?.accent_orange
      : colors?.muted;

  const arrowColor = focused ? colors?.accent_orange : colors?.muted;
  const selectedColor = colors?.accent_orange;
  const normalColor = colors?.muted;

  // Calculate visible items
  const maxVisible = 5; // Show at most 5 items at once
  const halfVisible = Math.floor(maxVisible / 2);

  let startIndex = Math.max(0, selectedIndex - halfVisible);
  const endIndex = Math.min(items.length, startIndex + maxVisible);

  // Adjust if we can show more items at the end
  if (endIndex - startIndex < maxVisible && startIndex > 0) {
    startIndex = Math.max(0, endIndex - maxVisible);
  }

  const visibleItems = items.slice(startIndex, endIndex);

  // Animation interpolation
  const interpolatePosition = (index: number) => {
    if (!animating || animationFrame === 0) return index;

    // Simple position interpolation for animation
    const targetIndex = selectedIndex;
    const currentIndex = displayIndex;
    const diff = targetIndex - currentIndex;

    return currentIndex + (diff * animationFrame);
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Label */}
      <Text color={labelColor} bold={focused}>
        {label}
      </Text>

      {/* Carousel */}
      <Box flexDirection="row" alignItems="center" justifyContent="center">
        {/* Left arrow */}
        <Text color={arrowColor} marginRight={1}>
          ‹
        </Text>

        {/* Items */}
        <Box flexDirection="row" flexGrow={1} justifyContent="center">
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            const isSelected = actualIndex === selectedIndex;
            const interpolatedPos = interpolatePosition(actualIndex);

            // Calculate visual offset during animation
            const visualOffset = animating
              ? Math.round((interpolatedPos - actualIndex) * 2)
              : 0;

            return (
              <Box
                key={actualIndex}
                marginX={1}
                style={{
                  transform: visualOffset !== 0 ? `translateX(${visualOffset}ch)` : undefined
                }}
              >
                <Text
                  color={isSelected ? selectedColor : normalColor}
                  bold={isSelected}
                  backgroundColor={isSelected ? `${selectedColor}20` : undefined}
                >
                  {isSelected ? `▸ ${item} ◂` : item}
                </Text>
              </Box>
            );
          })}
        </Box>

        {/* Right arrow */}
        <Text color={arrowColor} marginLeft={1}>
          ›
        </Text>
      </Box>

      {/* Index indicator */}
      {showIndex && (
        <Box flexDirection="row" justifyContent="center" marginTop={1}>
          <Text color={colors?.muted} dimColor>
            {selectedIndex + 1} / {items.length}
          </Text>
        </Box>
      )}

      {/* Status indicators */}
      {focused && (
        <Text color={colors?.muted} dimColor>
          [←/→] switch selection • [Tab] next field
        </Text>
      )}

      {/* Overflow indicator */}
      {items.length > maxVisible && (
        <Text color={colors?.muted} dimColor>
          {startIndex > 0 && '◀ '}{items.length > endIndex && ' ▼'}
        </Text>
      )}
    </Box>
  );
};

export default FieldSelectCarousel;