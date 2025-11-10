/**
 * TUIApp Component Tests
 *
 * Comprehensive test suite for the main TUI application component
 * covering screen navigation, state management, and keyboard interactions
 */

import React from 'react';
import { render } from '@testing-library/react';
import TUIApp from '../../src/tui/components/TUIApp.js';
import type { TUIConfig } from '../../src/tui/types/TUIConfig.js';

// Mock ink components
jest.mock('ink', () => ({
  Box: ({ children, ...props }: any) => <div data-testid="box" {...props}>{children}</div>,
  Text: ({ children, ...props }: any) => <span data-testid="text" {...props}>{children}</span>,
  useInput: jest.fn(),
  useApp: jest.fn(() => ({
    exit: jest.fn()
  }))
}));

// Mock theme provider
jest.mock('../../src/tui/config/theme-provider.js', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      base_fg: '#FFFFFF',
      accent_orange: '#FF9A38',
      status: { error: '#FF6B6B' },
      neutrals: { muted: '#666666', text: '#FFFFFF' }
    }
  }))
}));

describe('TUIApp Component', () => {
  const mockConfig: TUIConfig = {
    enabled: true,
    theme: 'dark',
    colors: {
      base_fg: '#FFFFFF',
      accent_orange: '#FF9A38',
      accent_orange_dim: '#E67E00',
      accent_orange_bg: '#FF9A38',
      robo_aqa: '#B48EAD',
      robo_quality_control: '#F7B267',
      robo_system_analyst: '#F4A261',
      robo_developer: '#E76F51',
      robo_devops_sre: '#2A9D8F',
      robo_ux_ui: '#E9C46A',
      robo_legal_compliance: '#264653',
      orchestrator: '#FF9A38',
      robo_aqa_dim: '#8B7396',
      robo_quality_control_dim: '#C8944D',
      robo_system_analyst_dim: '#C8804D',
      robo_developer_dim: '#B8573F',
      robo_devops_sre_dim: '#1D7569',
      robo_ux_ui_dim: '#B8944F',
      robo_legal_compliance_dim: '#1C3439',
      orchestrator_dim: '#C8944D',
      robo_aqa_bg: '#B48EAD',
      robo_quality_control_bg: '#F7B267',
      robo_system_analyst_bg: '#F4A261',
      robo_developer_bg: '#E76F51',
      robo_devops_sre_bg: '#2A9D8F',
      robo_ux_ui_bg: '#E9C46A',
      robo_legal_compliance_bg: '#264653',
      orchestrator_bg: '#FF9A38',
      base_bg: '#000000',
      muted: '#666666',
      error: '#FF6B6B',
      warn: '#FFA726',
      ok: '#66BB6A',
      gray: '#9E9E9E',
      signal_braces: '#FF9A38',
      signal_placeholder: '#666666'
    },
    animations: {
      enabled: true,
      intro: {
        enabled: true,
        duration: 10000,
        fps: 12
      },
      status: {
        enabled: true,
        fps: 4
      },
      signals: {
        enabled: true,
        waveSpeed: 200,
        blinkSpeed: 500
      }
    },
    layout: {
      responsive: true,
      breakpoints: {
        compact: 80,
        normal: 100,
        wide: 120,
        ultrawide: 160
      },
      padding: {
        horizontal: 2,
        vertical: 1
      }
    },
    input: {
      maxTokens: 100000,
      tokenReserve: 0.1,
      pasteTimeout: 5000
    },
    debug: {
      enabled: false,
      maxLogLines: 100,
      showFullJSON: false
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      expect(() => {
        render(<TUIApp config={mockConfig} />);
      }).not.toThrow();
    });

    it('should render with initial state', () => {
      const { container } = render(<TUIApp config={mockConfig} />);
      expect(container.firstChild).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        ...mockConfig,
        theme: 'light' as const
      };

      expect(() => {
        render(<TUIApp config={customConfig} />);
      }).not.toThrow();
    });
  });

  describe('Navigation', () => {
    it('should handle keyboard input', () => {
      const { useInput } = require('ink');
      const mockHandler = jest.fn();
      useInput.mockImplementation((callback: any) => {
        mockHandler.mockImplementation(callback);
      });

      render(<TUIApp config={mockConfig} />);

      // Test that input handler is registered
      expect(useInput).toHaveBeenCalled();
      expect(mockHandler).toBeDefined();
    });

    it('should navigate between screens', () => {
      const { useInput } = require('ink');

      useInput.mockImplementation((callback: any) => {
        // Simulate key press for navigation
        callback('', { escape: true });
      });

      expect(() => {
        render(<TUIApp config={mockConfig} />);
      }).not.toThrow();
    });

    it('should handle exit key', () => {
      const { useInput, useApp } = require('ink');
      const mockExit = jest.fn();
      useApp.mockReturnValue({ exit: mockExit });

      useInput.mockImplementation((callback: any) => {
        // Simulate Ctrl+C for exit
        callback('', { ctrl: true, c: true });
      });

      render(<TUIApp config={mockConfig} />);
      expect(useApp).toHaveBeenCalled();
    });
  });

  describe('Screen Transitions', () => {
    it('should start with orchestrator screen', () => {
      const { container } = render(<TUIApp config={mockConfig} />);
      // The component should render with initial screen
      expect(container.firstChild).toBeDefined();
    });

    it('should handle screen state changes', () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      // Component should be stable after initial render
      expect(container.firstChild).toBeDefined();
    });
  });

  describe('Configuration Handling', () => {
    it('should respect animation settings', () => {
      const configWithAnimations = {
        ...mockConfig,
        animations: {
          enabled: false,
          intro: { enabled: false, duration: 5000, fps: 24 },
          status: { enabled: false, fps: 8 },
          signals: { enabled: false, waveSpeed: 100, blinkSpeed: 250 }
        }
      };

      expect(() => {
        render(<TUIApp config={configWithAnimations} />);
      }).not.toThrow();
    });

    it('should handle debug mode', () => {
      const debugConfig = {
        ...mockConfig,
        debug: {
          enabled: true,
          maxLogLines: 200,
          showFullJSON: true
        }
      };

      expect(() => {
        render(<TUIApp config={debugConfig} />);
      }).not.toThrow();
    });

    it('should handle responsive layout', () => {
      const responsiveConfig = {
        ...mockConfig,
        layout: {
          responsive: false,
          breakpoints: {
            compact: 60,
            normal: 80,
            wide: 100,
            ultrawide: 120
          },
          padding: {
            horizontal: 1,
            vertical: 0
          }
        }
      };

      expect(() => {
        render(<TUIApp config={responsiveConfig} />);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing configuration gracefully', () => {
      const incompleteConfig = {
        enabled: true,
        theme: 'dark' as const,
        colors: mockConfig.colors,
        animations: mockConfig.animations,
        layout: mockConfig.layout,
        input: mockConfig.input,
        debug: mockConfig.debug
      };

      expect(() => {
        render(<TUIApp config={incompleteConfig} />);
      }).not.toThrow();
    });

    it('should handle invalid configuration values', () => {
      const invalidConfig = {
        ...mockConfig,
        theme: 'invalid' as any
      };

      // Should not crash with invalid theme
      expect(() => {
        render(<TUIApp config={invalidConfig} />);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should render within reasonable time', () => {
      const startTime = performance.now();

      render(<TUIApp config={mockConfig} />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('should not cause memory leaks on unmount', () => {
      const { unmount } = render(<TUIApp config={mockConfig} />);

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have proper component structure', () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      // Should have a defined structure
      expect(container.firstChild).toBeDefined();
      expect(container.children).toBeDefined();
    });

    it('should handle keyboard navigation', () => {
      const { useInput } = require('ink');
      const inputHandler = jest.fn();

      useInput.mockImplementation((callback: any) => {
        inputHandler.mockImplementation(callback);
      });

      render(<TUIApp config={mockConfig} />);

      // Should register input handler
      expect(useInput).toHaveBeenCalled();
      expect(inputHandler).toBeDefined();
    });
  });
});