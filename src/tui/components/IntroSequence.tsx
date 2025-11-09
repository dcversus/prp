/**
 * ♫ Intro Sequence Component
 *
 * 10-second video-to-text style intro animation with music symbols
 * and brand display as specified in the PRP
 */

import { useState, useEffect } from 'react';
import { Text } from 'ink';
import { TUIConfig } from '../types/TUIConfig.js';
import { createLayerLogger } from '../../shared/logger.js';
import { getVersion } from '../../utils/version.js';

const logger = createLayerLogger('tui');

interface IntroSequenceProps {
  config: TUIConfig;
  onComplete: (success: boolean) => void;
}

interface Frame {
  content: string[][];
  delay: number;
}

export function IntroSequence({ config, onComplete }: IntroSequenceProps) {
    const [frame, setFrame] = useState(0);
  const [frames, setFrames] = useState<Frame[]>([]);

  // Generate intro frames
  useEffect(() => {
    const generatedFrames = generateIntroFrames(config);
    setFrames(generatedFrames);
    logger.info('frames', 'Generated intro frames', { count: generatedFrames.length });
  }, [config]);

  // Frame animation loop
  useEffect(() => {
    if (frames.length === 0) return;

    const timer = setTimeout(() => {
      if (frame < frames.length - 1) {
        setFrame(frame + 1);
      } else {
        // Animation complete
        onComplete(true);
      }
    }, frames[frame]?.delay ?? 100);

    return () => clearTimeout(timer);
  }, [frame, frames, onComplete]);

  // Allow skipping with any key
  useEffect(() => {
    const handleKeyPress = () => {
      onComplete(true);
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
  }, [onComplete]);

  if (frames.length === 0 || frame >= frames.length) {
    return null;
  }

  const currentFrame = frames[frame];

  if (!currentFrame) {
    return null;
  }

  return (
    <>
      {currentFrame.content.map((line, lineIndex) => (
        <Text key={lineIndex} color={config.colors.base_fg}>
          {line.join('')}
        </Text>
      ))}
    </>
  );
}

/**
 * Generate intro animation frames based on the specification
 */
function generateIntroFrames(config: TUIConfig): Frame[] {
  const { columns, rows } = process.stdout;
  const { duration, fps } = config.animations.intro;
  const totalFrames = Math.floor((duration / 1000) * fps);
  const frameDelay = 1000 / fps;

  const frames: Frame[] = [];

  // Calculate center position
  const centerX = Math.floor(columns / 2);
  const centerY = Math.floor(rows / 2);

  // Music symbols for animation
  const musicSymbols = ['♪', '♩', '♬', '♫'];

  // ASCII ramp for radial effect
  const asciiRamp = ['  ', '·', ':', ';', 'o', 'x', '%', '#', '@'];

  for (let i = 0; i < totalFrames; i++) {
    const progress = i / totalFrames;
    const content: string[][] = Array(rows).fill(null).map(() => Array(columns).fill(' '));

    // Phase 1: 0.0-1.0s - Fade-in radial vignette; single ♪ appears center
    if (progress < 0.1) {
      const alpha = progress / 0.1;
      const symbol = '♪';

      // Add radial vignette
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
          const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
          const maxDistance = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
          const vignetteAlpha = Math.max(0, 1 - (distance / maxDistance));
          const finalAlpha = vignetteAlpha * alpha;

          if (finalAlpha > 0.1) {
            const rampIndex = Math.floor(finalAlpha * (asciiRamp.length - 1));
            const char = asciiRamp[Math.min(rampIndex, asciiRamp.length - 1)];
            if (content[y] && char !== undefined) {
              const row = content[y];
              if (row) row[x] = char;
            }
          }
        }
      }

      if (alpha > 0.5) {
        const centerRow = content[centerY];
        if (centerRow) centerRow[centerX] = symbol;
      }
    }

    // Phase 2: 1.0-3.0s - ♪ pulses (grow/shrink 1 char), subtle starfield drift
    else if (progress < 0.3) {
      const pulseProgress = (progress - 0.1) / 0.2;
      const pulse = Math.sin(pulseProgress * Math.PI * 4) * 0.5 + 0.5;
      const symbol = '♪';

      // Pulsing symbol
      const symbolSize = Math.floor(1 + pulse * 2);
      for (let dy = -symbolSize; dy <= symbolSize; dy++) {
        for (let dx = -symbolSize; dx <= symbolSize; dx++) {
          const x = centerX + dx;
          const y = centerY + dy;
          if (x >= 0 && x < columns && y >= 0 && y < rows) {
            const row = content[y];
            if (row) row[x] = symbol;
          }
        }
      }

      // Add subtle starfield
      const starCount = Math.floor(pulse * 10);
      for (let i = 0; i < starCount; i++) {
        const x = Math.floor(Math.random() * columns);
        const y = Math.floor(Math.random() * rows);
        const row = content[y];
        if (row) row[x] = Math.random() > 0.5 ? '·' : '*';
      }
    }

    // Phase 3: 3.0-6.0s - Orbiting notes (♪ ♩ ♬) circle center on 8-step path
    else if (progress < 0.6) {
      const orbitProgress = (progress - 0.3) / 0.3;
      const orbitSteps = 8;
      const orbitRadius = Math.min(columns, rows) / 4;

      // Draw orbit path
      for (let step = 0; step < orbitSteps; step++) {
        const angle = (step / orbitSteps) * Math.PI * 2;
        const x = Math.floor(centerX + Math.cos(angle) * orbitRadius);
        const y = Math.floor(centerY + Math.sin(angle) * orbitRadius);

        if (x >= 0 && x < columns && y >= 0 && y < rows && content[y]) {
          const symbolIndex = (step + Math.floor(orbitProgress * orbitSteps)) % musicSymbols.length;
          const symbol = musicSymbols[symbolIndex];
          if (symbol !== undefined) {
            content[y][x] = symbol;
          }
        }
      }

      // Center symbol
      const centerRow = content[centerY];
      if (centerRow) centerRow[centerX] = '♫';
    }

    // Phase 4: 6.0-8.0s - Morph trail: ♪ trails → ♬ → resolves to ♫ (hold)
    else if (progress < 0.8) {
      const morphProgress = (progress - 0.6) / 0.2;
      const trailLength = Math.floor(morphProgress * 10);

      // Create trail
      for (let i = 0; i < trailLength; i++) {
        const angle = morphProgress * Math.PI * 2;
        const distance = i * 2;
        const x = Math.floor(centerX + Math.cos(angle) * distance);
        const y = Math.floor(centerY + Math.sin(angle) * distance);

        if (x >= 0 && x < columns && y >= 0 && y < rows) {
          let symbol: string;
          if (morphProgress < 0.3) {
            symbol = '♪';
          } else if (morphProgress < 0.6) {
            symbol = '♬';
          } else {
            symbol = '♫';
          }
          const row = content[y];
          if (row) row[x] = symbol;
        }
      }

      // Center final symbol
      const finalCenterRow = content[centerY];
      if (finalCenterRow) finalCenterRow[centerX] = '♫';

      // Radial glow effect
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
          const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
          const glowRadius = 10 + morphProgress * 5;
          if (distance < glowRadius) {
            const row = content[y];
            if (row?.[x] === ' ') {
              const alpha = 1 - (distance / glowRadius);
              if (alpha > 0.3 && Math.random() > 0.8) {
                row[x] = '·';
              }
            }
          }
        }
      }
    }

    // Phase 5: 8.0-10.0s - Title wipes in below: ♫ @dcversus/prp + subtitle lines
    else {
      const titleProgress = (progress - 0.8) / 0.2;

      // Final symbol at center
      const finalSymbolRow = content[centerY];
      if (finalSymbolRow) finalSymbolRow[centerX] = '♫';

      // Title lines
      const titleLines = [
        '♫ @dcversus/prp',
        'Autonomous Development Orchestration',
        `v${getVersion()} - Three-Layer Architecture`
      ];

      titleLines.forEach((line, lineIndex) => {
        const y = centerY + 3 + lineIndex;
        const lineLength = line.length;
        const startX = centerX - Math.floor(lineLength / 2);

        // Wipe effect
        const visibleLength = Math.floor(lineLength * titleProgress);
        const visibleLine = line.substring(0, visibleLength);

        for (let i = 0; i < visibleLine.length; i++) {
          const x = startX + i;
          const char = visibleLine[i];
          if (x >= 0 && x < columns && y >= 0 && y < rows && char !== undefined) {
            const row = content[y];
            if (row) row[x] = char;
          }
        }
      });

      // Fade out background elements
      if (titleProgress > 0.5) {
        const fadeAlpha = 1 - ((titleProgress - 0.5) / 0.5);
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < columns; x++) {
            const row = content[y];
            if (row && (row[x] === '·' || row[x] === '*')) {
              if (Math.random() > fadeAlpha) {
                row[x] = ' ';
              }
            }
          }
        }
      }
    }

    frames.push({
      content,
      delay: frameDelay
    });
  }

  return frames;
}