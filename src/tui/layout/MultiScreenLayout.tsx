/**
 * Multi-Screen Layout Manager
 *
 * Manages display of multiple TUI screens simultaneously
 * for wide displays (2K+), with intelligent layout allocation
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Text, useStdoutDimensions } from 'ink';

import type { TUIConfig } from '../../shared/types/TUIConfig';

export type ScreenId = 'orchestrator' | 'agents' | 'prp-context' | 'token-metrics' | 'signals' | 'info' | 'debug';

interface ScreenConfig {
  id: ScreenId;
  title: string;
  minWidth: number;
  minHeight: number;
  priority: number; // Higher = more important
  flexible: boolean; // Can expand/shrink
  defaultVisible: boolean;
}

interface ScreenSlot {
  id: ScreenId;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

interface LayoutPreset {
  name: string;
  minColumns: number;
  minRows: number;
  screens: Partial<Record<ScreenId, ScreenSlot>>;
}

export class MultiScreenLayout {
  private readonly screens: Map<ScreenId, ScreenConfig>;
  private readonly layoutPresets: LayoutPreset[];
  private currentPreset: string;

  constructor() {
    this.screens = new Map([
      ['orchestrator', {
        id: 'orchestrator',
        title: 'Orchestrator',
        minWidth: 60,
        minHeight: 20,
        priority: 10,
        flexible: true,
        defaultVisible: true,
      }],
      ['agents', {
        id: 'agents',
        title: 'Agents',
        minWidth: 50,
        minHeight: 15,
        priority: 8,
        flexible: true,
        defaultVisible: true,
      }],
      ['prp-context', {
        id: 'prp-context',
        title: 'PRP Context',
        minWidth: 60,
        minHeight: 15,
        priority: 7,
        flexible: true,
        defaultVisible: false,
      }],
      ['token-metrics', {
        id: 'token-metrics',
        title: 'Token Metrics',
        minWidth: 40,
        minHeight: 10,
        priority: 6,
        flexible: false,
        defaultVisible: true,
      }],
      ['signals', {
        id: 'signals',
        title: 'Signals',
        minWidth: 50,
        minHeight: 8,
        priority: 5,
        flexible: true,
        defaultVisible: true,
      }],
      ['info', {
        id: 'info',
        title: 'Info',
        minWidth: 40,
        minHeight: 10,
        priority: 4,
        flexible: false,
        defaultVisible: false,
      }],
      ['debug', {
        id: 'debug',
        title: 'Debug',
        minWidth: 60,
        minHeight: 15,
        priority: 1,
        flexible: true,
        defaultVisible: false,
      }],
    ]);

    this.layoutPresets = [
      {
        name: 'single',
        minColumns: 80,
        minRows: 24,
        screens: {
          orchestrator: { id: 'orchestrator', x: 0, y: 0, width: 80, height: 24, visible: true },
        },
      },
      {
        name: 'compact',
        minColumns: 120,
        minRows: 24,
        screens: {
          orchestrator: { id: 'orchestrator', x: 0, y: 0, width: 60, height: 24, visible: true },
          signals: { id: 'signals', x: 60, y: 0, width: 60, height: 8, visible: true },
          tokenMetrics: { id: 'token-metrics', x: 60, y: 8, width: 60, height: 16, visible: true },
        },
      },
      {
        name: 'standard',
        minColumns: 160,
        minRows: 30,
        screens: {
          orchestrator: { id: 'orchestrator', x: 0, y: 0, width: 80, height: 30, visible: true },
          agents: { id: 'agents', x: 80, y: 0, width: 80, height: 15, visible: true },
          prpContext: { id: 'prp-context', x: 80, y: 15, width: 80, height: 15, visible: true },
        },
      },
      {
        name: 'wide',
        minColumns: 200,
        minRows: 35,
        screens: {
          orchestrator: { id: 'orchestrator', x: 0, y: 0, width: 80, height: 35, visible: true },
          agents: { id: 'agents', x: 80, y: 0, width: 60, height: 20, visible: true },
          signals: { id: 'signals', x: 140, y: 0, width: 60, height: 12, visible: true },
          tokenMetrics: { id: 'token-metrics', x: 140, y: 12, width: 60, height: 11, visible: true },
          prpContext: { id: 'prp-context', x: 80, y: 20, width: 60, height: 15, visible: true },
          info: { id: 'info', x: 140, y: 23, width: 60, height: 12, visible: true },
        },
      },
      {
        name: 'ultrawide',
        minColumns: 240,
        minRows: 40,
        screens: {
          orchestrator: { id: 'orchestrator', x: 0, y: 0, width: 100, height: 40, visible: true },
          agents: { id: 'agents', x: 100, y: 0, width: 70, height: 20, visible: true },
          prpContext: { id: 'prp-context', x: 100, y: 20, width: 70, height: 20, visible: true },
          signals: { id: 'signals', x: 170, y: 0, width: 70, height: 13, visible: true },
          tokenMetrics: { id: 'token-metrics', x: 170, y: 13, width: 35, height: 14, visible: true },
          info: { id: 'info', x: 205, y: 13, width: 35, height: 14, visible: true },
          debug: { id: 'debug', x: 170, y: 27, width: 70, height: 13, visible: false },
        },
      },
    ];

    this.currentPreset = 'single';
  }

  /**
   * Calculate optimal layout based on terminal size
   */
  calculateLayout(columns: number, rows: number): LayoutPreset {
    // Find the largest preset that fits
    let bestPreset = this.layoutPresets[0]; // Start with single

    for (const preset of this.layoutPresets) {
      if (columns >= preset.minColumns && rows >= preset.minRows) {
        bestPreset = preset;
      }
    }

    return bestPreset;
  }

  /**
   * Get screen slots for current layout
   */
  getScreenSlots(columns: number, rows: number): Map<ScreenId, ScreenSlot> {
    const preset = this.calculateLayout(columns, rows);
    const slots = new Map<ScreenId, ScreenSlot>();

    // Apply preset and adjust for actual terminal size
    Object.entries(preset.screens).forEach(([id, slot]) => {
      const screenConfig = this.screens.get(id as ScreenId);
      if (!screenConfig) return;

      // Adjust slot size if terminal is larger than preset
      const extraCols = Math.max(0, columns - preset.minColumns);
      const extraRows = Math.max(0, rows - preset.minRows);

      const adjustedSlot: ScreenSlot = {
        ...slot,
        width: screenConfig.flexible
          ? slot.width + Math.floor(extraCols * 0.5)
          : Math.min(slot.width, columns - slot.x),
        height: screenConfig.flexible
          ? slot.height + Math.floor(extraRows * 0.5)
          : Math.min(slot.height, rows - slot.y),
        visible: slot.visible && screenConfig.defaultVisible,
      };

      slots.set(id as ScreenId, adjustedSlot);
    });

    return slots;
  }

  /**
   * Get visible screens for a given terminal size
   */
  getVisibleScreens(columns: number, rows: number): ScreenSlot[] {
    const slots = this.getScreenSlots(columns, rows);
    return Array.from(slots.values()).filter(slot => slot.visible);
  }

  /**
   * Check if multi-screen mode is available
   */
  canUseMultiScreen(columns: number, rows: number): boolean {
    const preset = this.calculateLayout(columns, rows);
    return preset.name !== 'single';
  }

  /**
   * Toggle screen visibility
   */
  toggleScreen(screenId: ScreenId, columns: number, rows: number): ScreenSlot[] {
    const slots = this.getScreenSlots(columns, rows);
    const slot = slots.get(screenId);

    if (slot) {
      slot.visible = !slot.visible;
    }

    return this.getVisibleScreens(columns, rows);
  }

  /**
   * Reorder screens (swap positions)
   */
  swapScreens(screenId1: ScreenId, screenId2: ScreenId, columns: number, rows: number): ScreenSlot[] {
    const slots = this.getScreenSlots(columns, rows);
    const slot1 = slots.get(screenId1);
    const slot2 = slots.get(screenId2);

    if (slot1 && slot2) {
      // Swap positions
      const tempX = slot1.x;
      const tempY = slot1.y;
      slot1.x = slot2.x;
      slot1.y = slot2.y;
      slot2.x = tempX;
      slot2.y = tempY;

      // Swap dimensions
      const tempWidth = slot1.width;
      const tempHeight = slot1.height;
      slot1.width = slot2.width;
      slot1.height = slot2.height;
      slot2.width = tempWidth;
      slot2.height = tempHeight;
    }

    return this.getVisibleScreens(columns, rows);
  }

  /**
   * Get available presets
   */
  getPresets(): LayoutPreset[] {
    return [...this.layoutPresets];
  }

  /**
   * Set layout preset manually
   */
  setPreset(presetName: string): boolean {
    const preset = this.layoutPresets.find(p => p.name === presetName);
    if (preset) {
      this.currentPreset = presetName;
      return true;
    }
    return false;
  }

  /**
   * Get current preset
   */
  getCurrentPreset(): string {
    return this.currentPreset;
  }
}

export const multiScreenLayout = new MultiScreenLayout();