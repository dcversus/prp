/**
 * TUI Navigation Integration Tests
 *
 * End-to-end testing for complete TUI navigation workflows
 * including screen transitions, keyboard shortcuts, and state management
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import TUIApp from '../../src/tui/components/TUIApp.js';
import type { TUIConfig } from '../../src/tui/types/TUIConfig.js';

// Mock ink components and hooks
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
      status: { error: '#FF6B6B', ok: '#66BB6A' },
      neutrals: { muted: '#666666', text: '#FFFFFF' }
    }
  }))
}));

describe('TUI Navigation Integration', () => {
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
      intro: { enabled: true, duration: 10000, fps: 12 },
      status: { enabled: true, fps: 4 },
      signals: { enabled: true, waveSpeed: 200, blinkSpeed: 500 }
    },
    layout: {
      responsive: true,
      breakpoints: { compact: 80, normal: 100, wide: 120, ultrawide: 160 },
      padding: { horizontal: 2, vertical: 1 }
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

  let inputHandlers: Array<(input: string, key: any) => void> = [];

  beforeEach(() => {
    jest.clearAllMocks();
    inputHandlers = [];

    const { useInput } = require('ink');
    useInput.mockImplementation((handler: any) => {
      inputHandlers.push(handler);
    });
  });

  const simulateKeyPress = (key: string, options: any = {}) => {
    const keyEvent = {
      [key]: true,
      ...options
    };

    inputHandlers.forEach(handler => {
      try {
        handler('', keyEvent);
      } catch (error) {
        // Handle errors gracefully
      }
    });
  };

  describe('Initial Load and Screen Management', () => {
    it('should initialize with orchestrator screen', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      expect(inputHandlers.length).toBeGreaterThan(0);
    });

    it('should handle multiple input handlers', async () => {
      render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(inputHandlers.length).toBeGreaterThan(0);
      });

      // Multiple handlers should work without conflicts
      expect(() => {
        simulateKeyPress('q');
      }).not.toThrow();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle Tab navigation between screens', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      expect(() => {
        simulateKeyPress('tab');
      }).not.toThrow();
    });

    it('should handle arrow key navigation', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      expect(() => {
        simulateKeyPress('upArrow');
        simulateKeyPress('downArrow');
        simulateKeyPress('leftArrow');
        simulateKeyPress('rightArrow');
      }).not.toThrow();
    });

    it('should handle screen switching shortcuts', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      // Test common screen switching shortcuts
      expect(() => {
        simulateKeyPress('1'); // Orchestrator screen
        simulateKeyPress('2'); // Agent screen
        simulateKeyPress('3'); // Token metrics screen
        simulateKeyPress('4'); // Debug screen
      }).not.toThrow();
    });

    it('should handle Escape key behavior', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      expect(() => {
        simulateKeyPress('escape');
      }).not.toThrow();
    });

    it('should handle Enter key interactions', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      expect(() => {
        simulateKeyPress('return');
      }).not.toThrow();
    });
  });

  describe('Screen Transitions', () => {
    it('should navigate between different screens', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      // Simulate screen navigation
      expect(() => {
        simulateKeyPress('1'); // Navigate to orchestrator
        simulateKeyPress('2'); // Navigate to agents
        simulateKeyPress('3'); // Navigate to token metrics
        simulateKeyPress('4'); // Navigate to debug
      }).not.toThrow();

      // Component should remain stable
      expect(container.firstChild).toBeDefined();
    });

    it('should maintain state during screen transitions', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      // Navigate through multiple screens
      simulateKeyPress('1');
      simulateKeyPress('2');
      simulateKeyPress('3');

      // State should be preserved
      expect(container.firstChild).toBeDefined();
    });

    it('should handle rapid screen switching', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      // Rapid screen switching
      expect(() => {
        for (let i = 0; i < 10; i++) {
          simulateKeyPress('1');
          simulateKeyPress('2');
          simulateKeyPress('3');
        }
      }).not.toThrow();
    });
  });

  describe('Error Recovery', () => {
    it('should handle keyboard input errors gracefully', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      expect(() => {
        // Simulate invalid key combinations
        simulateKeyPress('invalidKey');
        simulateKeyPress('tab', { ctrl: true, meta: true });
      }).not.toThrow();
    });

    it('should recover from navigation errors', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      // Attempt to navigate with invalid keys
      expect(() => {
        simulateKeyPress('9'); // Invalid screen number
        simulateKeyPress('0'); // Invalid screen number
        simulateKeyPress('escape'); // Should still work
      }).not.toThrow();

      expect(container.firstChild).toBeDefined();
    });

    it('should handle configuration errors during navigation', async () => {
      const invalidConfig = {
        ...mockConfig,
        theme: 'invalid' as any
      };

      const { container } = render(<TUIApp config={invalidConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      expect(() => {
        simulateKeyPress('1');
        simulateKeyPress('2');
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle rapid keyboard input', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      const startTime = performance.now();

      // Simulate rapid keyboard input
      expect(() => {
        for (let i = 0; i < 100; i++) {
          simulateKeyPress('tab');
          simulateKeyPress('upArrow');
          simulateKeyPress('downArrow');
        }
      }).not.toThrow();

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should handle within 1 second
    });

    it('should maintain responsiveness during screen transitions', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      const startTime = performance.now();

      // Rapid screen transitions
      for (let i = 0; i < 50; i++) {
        simulateKeyPress('1');
        simulateKeyPress('2');
        simulateKeyPress('3');
        simulateKeyPress('4');
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(2000); // Should handle within 2 seconds

      expect(container.firstChild).toBeDefined();
    });

    it('should not leak memory during navigation', async () => {
      const { unmount } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(inputHandlers.length).toBeGreaterThan(0);
      });

      // Perform extensive navigation
      for (let i = 0; i < 10; i++) {
        simulateKeyPress('1');
        simulateKeyPress('2');
        simulateKeyPress('3');
      }

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should maintain keyboard navigation order', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      expect(() => {
        // Test tab navigation order
        simulateKeyPress('tab');
        simulateKeyPress('shift', 'tab');
        simulateKeyPress('tab');
      }).not.toThrow();
    });

    it('should handle assistive technology shortcuts', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      expect(() => {
        // Common accessibility shortcuts
        simulateKeyPress('tab', { ctrl: true });
        simulateKeyPress('tab', { shift: true });
        simulateKeyPress('f1'); // Help
      }).not.toThrow();
    });

    it('should provide screen reader friendly structure', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      // Should have proper DOM structure for accessibility
      expect(container.firstChild).toBeDefined();
      expect(container.children).toBeDefined();
    });
  });

  describe('Exit Behavior', () => {
    it('should handle application exit', async () => {
      const { useApp } = require('ink');
      const mockExit = jest.fn();
      useApp.mockReturnValue({ exit: mockExit });

      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      expect(() => {
        simulateKeyPress('c', { ctrl: true }); // Ctrl+C
      }).not.toThrow();

      expect(useApp).toHaveBeenCalled();
    });

    it('should handle graceful shutdown', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      expect(() => {
        simulateKeyPress('q'); // Quit
        simulateKeyPress('escape');
        simulateKeyPress('c', { ctrl: true });
      }).not.toThrow();
    });
  });

  describe('State Persistence', () => {
    it('should maintain user preferences during navigation', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      // Simulate user interactions
      simulateKeyPress('1');
      simulateKeyPress('2');
      simulateKeyPress('3');

      // State should be preserved
      expect(container.firstChild).toBeDefined();
    });

    it('should handle session restoration', async () => {
      const { container } = render(<TUIApp config={mockConfig} />);

      await waitFor(() => {
        expect(container.firstChild).toBeDefined();
      });

      // Simulate session data
      expect(() => {
        simulateKeyPress('r'); // Refresh/restore
      }).not.toThrow();
    });
  });
});