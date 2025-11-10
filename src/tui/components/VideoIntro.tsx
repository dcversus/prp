/**
 * ♫ Video-to-Text Intro Component
 *
 * 10-second ASCII art animation with music symbol progression,
 * radial vignette, starfield background, and title wipe-in.
 * Based on PRP-004 specifications for retro chip demo vibe.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Text } from 'ink';
import type { TUIConfig } from '../../shared/types/TUIConfig.js';
import { createLayerLogger } from '../../shared/logger.js';
import { getVersion } from '../../shared/utils/version.js';

const logger = createLayerLogger('tui');

interface VideoIntroProps {
  config: TUIConfig;
  onComplete: (success: boolean) => void;
}

interface AnimationFrame {
  content: string[];
  delay: number;
}

interface Star {
  x: number;
  y: number;
  symbol: '·' | '*';
  speed: number;
  brightness: number;
}

interface OrbitNote {
  symbol: '♪' | '♩' | '♬';
  angle: number;
  radius: number;
  color: string;
}

export function VideoIntro({ config, onComplete }: VideoIntroProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [stars, setStars] = useState<Star[]>([]);
  const [orbitNotes, setOrbitNotes] = useState<OrbitNote[]>([]);
  const [currentSymbol, setCurrentSymbol] = useState<'♪' | '♩' | '♬' | '♫'>('♪');
  const [radialAlpha, setRadialAlpha] = useState(0);

  // Animation configuration
  const animationConfig = useMemo(() => ({
    totalFrames: 120, // 10 seconds @ 12fps
    fps: 12,
    frameDelay: 83, // ~1000/12 ms
    terminalSize: {
      width: process.stdout.columns || 120,
      height: process.stdout.rows || 34
    }
  }), []);

  // Initialize starfield
  useEffect(() => {
    const starCount = Math.floor((animationConfig.terminalSize.width * animationConfig.terminalSize.height) / 200);
    const initialStars: Star[] = [];

    for (let i = 0; i < starCount; i++) {
      initialStars.push({
        x: Math.random() * animationConfig.terminalSize.width,
        y: Math.random() * animationConfig.terminalSize.height,
        symbol: Math.random() > 0.7 ? '*' : '·',
        speed: 0.1 + Math.random() * 0.3,
        brightness: 0.3 + Math.random() * 0.7
      });
    }

    setStars(initialStars);
  }, [animationConfig.terminalSize]);

  // Initialize orbit notes
  useEffect(() => {
    const notes: OrbitNote[] = [
      { symbol: '♪', angle: 0, radius: Math.min(animationConfig.terminalSize.width, animationConfig.terminalSize.height) / 6, color: config.colors.accent_orange },
      { symbol: '♩', angle: Math.PI * 2 / 3, radius: Math.min(animationConfig.terminalSize.width, animationConfig.terminalSize.height) / 6, color: config.colors.role_colors['robo-aqa'] },
      { symbol: '♬', angle: Math.PI * 4 / 3, radius: Math.min(animationConfig.terminalSize.width, animationConfig.terminalSize.height) / 6, color: config.colors.role_colors['robo-developer'] }
    ];
    setOrbitNotes(notes);
  }, [animationConfig.terminalSize, config.colors]);

  // Update animation state based on current frame
  useEffect(() => {
    const progress = frameIndex / animationConfig.totalFrames;

    // Update music symbol progression
    if (progress < 0.3) {
      setCurrentSymbol('♪');
    } else if (progress < 0.6) {
      setCurrentSymbol('♩');
    } else if (progress < 0.8) {
      setCurrentSymbol('♬');
    } else {
      setCurrentSymbol('♫');
    }

    // Update radial vignette alpha
    if (progress < 0.1) {
      setRadialAlpha(progress / 0.1);
    } else if (progress > 0.9) {
      setRadialAlpha((1 - progress) / 0.1);
    } else {
      setRadialAlpha(1);
    }

    // Update orbit notes rotation
    if (progress >= 0.3 && progress <= 0.6) {
      const orbitProgress = (progress - 0.3) / 0.3;
      setOrbitNotes(prev => prev.map(note => ({
        ...note,
        angle: note.angle + orbitProgress * Math.PI * 2
      })));
    }
  }, [frameIndex, animationConfig.totalFrames]);

  // Frame animation loop
  useEffect(() => {
    if (frameIndex >= animationConfig.totalFrames) {
      onComplete(true);
      return;
    }

    const timer = setTimeout(() => {
      setFrameIndex(prev => prev + 1);
    }, animationConfig.frameDelay);

    return () => clearTimeout(timer);
  }, [frameIndex, animationConfig.totalFrames, animationConfig.frameDelay, onComplete]);

  // Handle keyboard input for skipping
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

  // Generate current frame
  const currentFrame = useMemo(() => {
    return generateFrame(frameIndex, animationConfig, {
      currentSymbol,
      radialAlpha,
      stars: stars.map(star => ({
        ...star,
        x: star.x + star.speed,
        y: star.y + star.speed * 0.5
      })),
      orbitNotes,
      config
    });
  }, [frameIndex, animationConfig, currentSymbol, radialAlpha, stars, orbitNotes, config]);

  return (
    <Text color={config.colors.base_fg}>
      {currentFrame.content}
    </Text>
  );
}

/**
 * Generate a single animation frame
 */
function generateFrame(
  frameIndex: number,
  config: { totalFrames: number; terminalSize: { width: number; height: number } },
  state: {
    currentSymbol: '♪' | '♩' | '♬' | '♫';
    radialAlpha: number;
    stars: Star[];
    orbitNotes: OrbitNote[];
    config: TUIConfig;
  }
): AnimationFrame {
  const { width, height } = config.terminalSize;
  const progress = frameIndex / config.totalFrames;

  // Initialize frame buffer
  const buffer: string[][] = Array(height).fill(null).map(() => Array(width).fill(' '));

  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  // ASCII luminance ramp for radial effects
  const asciiRamp = ['  ', '·', ':', ';', 'o', 'x', '%', '#', '@'];

  // Phase 1: 0.0-1.0s - Fade-in radial vignette
  if (progress < 0.1) {
    const alpha = progress / 0.1;
    applyRadialVignette(buffer, centerX, centerY, width, height, alpha * state.radialAlpha, asciiRamp);

    // Single music symbol appears center
    if (alpha > 0.5) {
      drawSymbol(buffer, centerX, centerY, state.currentSymbol, width, height);
    }
  }

  // Phase 2: 1.0-3.0s - Symbol pulses with starfield drift
  else if (progress < 0.3) {
    const pulseProgress = (progress - 0.1) / 0.2;
    const pulse = Math.sin(pulseProgress * Math.PI * 4) * 0.5 + 0.5;

    // Pulsing central symbol
    const symbolSize = 1 + Math.floor(pulse * 2);
    drawSymbolPulse(buffer, centerX, centerY, state.currentSymbol, symbolSize, width, height);

    // Animated starfield
    drawStarfield(buffer, state.stars, width, height, asciiRamp);
  }

  // Phase 3: 3.0-6.0s - Orbiting notes with color transitions
  else if (progress < 0.6) {
    const orbitProgress = (progress - 0.3) / 0.3;

    // Draw orbiting notes
    drawOrbitingNotes(buffer, centerX, centerY, state.orbitNotes, width, height);

    // Central symbol
    drawSymbol(buffer, centerX, centerY, '♫', width, height);

    // Background starfield
    drawStarfield(buffer, state.stars, width, height, asciiRamp);
  }

  // Phase 4: 6.0-8.0s - Morph trail and radial glow
  else if (progress < 0.8) {
    const morphProgress = (progress - 0.6) / 0.2;

    // Morph trail effect
    drawMorphTrail(buffer, centerX, centerY, morphProgress, width, height);

    // Enhanced radial glow
    applyRadialGlow(buffer, centerX, centerY, width, height, morphProgress, asciiRamp);
  }

  // Phase 5: 8.0-10.0s - Title wipe-in and fade out
  else {
    const titleProgress = (progress - 0.8) / 0.2;

    // Draw title with wipe-in effect
    drawTitleWipe(buffer, centerX, centerY + 3, titleProgress, width, height);

    // Final central symbol
    drawSymbol(buffer, centerX, centerY, '♫', width, height);

    // Fade out background elements
    if (titleProgress > 0.5) {
      const fadeAlpha = 1 - ((titleProgress - 0.5) / 0.5);
      fadeBackground(buffer, fadeAlpha, asciiRamp);
    }
  }

  // Convert buffer to string
  const content = buffer.map(row => row.join('')).join('\n');

  return {
    content,
    delay: 83 // ~12fps
  };
}

/**
 * Apply radial vignette effect
 */
function applyRadialVignette(
  buffer: string[][],
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  alpha: number,
  asciiRamp: string[]
): void {
  const maxDistance = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const vignetteAlpha = Math.max(0, 1 - (distance / maxDistance));
      const finalAlpha = vignetteAlpha * alpha;

      if (finalAlpha > 0.1) {
        const rampIndex = Math.floor(finalAlpha * (asciiRamp.length - 1));
        const char = asciiRamp[Math.min(rampIndex, asciiRamp.length - 1)];
        if (char !== '  ') {
          buffer[y][x] = char;
        }
      }
    }
  }
}

/**
 * Draw a single symbol at specified position
 */
function drawSymbol(
  buffer: string[][],
  x: number,
  y: number,
  symbol: string,
  width: number,
  height: number
): void {
  if (x >= 0 && x < width && y >= 0 && y < height) {
    buffer[y][x] = symbol;
  }
}

/**
 * Draw a pulsing symbol
 */
function drawSymbolPulse(
  buffer: string[][],
  centerX: number,
  centerY: number,
  symbol: string,
  size: number,
  width: number,
  height: number
): void {
  for (let dy = -size; dy <= size; dy++) {
    for (let dx = -size; dx <= size; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= size) {
          buffer[y][x] = symbol;
        }
      }
    }
  }
}

/**
 * Draw animated starfield
 */
function drawStarfield(
  buffer: string[][],
  stars: Star[],
  width: number,
  height: number,
  asciiRamp: string[]
): void {
  stars.forEach(star => {
    const x = Math.floor(star.x % width);
    const y = Math.floor(star.y % height);

    if (star.brightness > 0.5) {
      buffer[y][x] = star.symbol;
    } else {
      const rampIndex = Math.floor(star.brightness * asciiRamp.length);
      buffer[y][x] = asciiRamp[Math.min(rampIndex, asciiRamp.length - 1)];
    }
  });
}

/**
 * Draw orbiting notes
 */
function drawOrbitingNotes(
  buffer: string[][],
  centerX: number,
  centerY: number,
  notes: OrbitNote[],
  width: number,
  height: number
): void {
  notes.forEach(note => {
    const x = Math.floor(centerX + Math.cos(note.angle) * note.radius);
    const y = Math.floor(centerY + Math.sin(note.angle) * note.radius);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      buffer[y][x] = note.symbol;
    }
  });
}

/**
 * Draw morph trail effect
 */
function drawMorphTrail(
  buffer: string[][],
  centerX: number,
  centerY: number,
  progress: number,
  width: number,
  height: number
): void {
  const trailLength = Math.floor(progress * 15);
  const angle = progress * Math.PI * 4;

  for (let i = 0; i < trailLength; i++) {
    const distance = i * 1.5;
    const x = Math.floor(centerX + Math.cos(angle) * distance);
    const y = Math.floor(centerY + Math.sin(angle) * distance);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      let symbol: string;
      if (progress < 0.3) {
        symbol = '♪';
      } else if (progress < 0.6) {
        symbol = '♬';
      } else {
        symbol = '♫';
      }
      buffer[y][x] = symbol;
    }
  }
}

/**
 * Apply radial glow effect
 */
function applyRadialGlow(
  buffer: string[][],
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  intensity: number,
  asciiRamp: string[]
): void {
  const glowRadius = 10 + intensity * 8;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      if (distance < glowRadius && buffer[y][x] === ' ') {
        const alpha = 1 - (distance / glowRadius);
        if (alpha > 0.3 && Math.random() > 0.7) {
          const rampIndex = Math.floor(alpha * 3);
          buffer[y][x] = asciiRamp[Math.min(rampIndex, 2)];
        }
      }
    }
  }
}

/**
 * Draw title with wipe-in effect
 */
function drawTitleWipe(
  buffer: string[][],
  centerX: number,
  startY: number,
  progress: number,
  width: number,
  height: number
): void {
  const titleLines = [
    '♫ @dcversus/prp',
    'Autonomous Development Orchestration',
    `v${getVersion()} — Signal-Driven Workflow`
  ];

  titleLines.forEach((line, lineIndex) => {
    const y = startY + lineIndex;
    if (y >= 0 && y < height) {
      const lineLength = line.length;
      const startX = Math.max(0, centerX - Math.floor(lineLength / 2));

      // Wipe effect from left to right
      const visibleLength = Math.floor(lineLength * progress);
      const visibleLine = line.substring(0, visibleLength);

      for (let i = 0; i < visibleLine.length; i++) {
        const x = startX + i;
        const char = visibleLine[i];
        if (x < width && char !== undefined) {
          buffer[y][x] = char;
        }
      }
    }
  });
}

/**
 * Fade background elements
 */
function fadeBackground(
  buffer: string[][],
  fadeAlpha: number,
  asciiRamp: string[]
): void {
  for (let y = 0; y < buffer.length; y++) {
    for (let x = 0; x < buffer[y].length; x++) {
      const char = buffer[y][x];
      if (char === '·' || char === '*') {
        if (Math.random() > fadeAlpha) {
          buffer[y][x] = ' ';
        }
      }
    }
  }
}