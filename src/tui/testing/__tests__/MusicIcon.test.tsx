/**
 * ♫ MusicIcon Component Tests
 *
 * Tests for the MusicIcon component with animation integration
 */

import React from 'react';
import { expectComponent, MockComponents } from '../ComponentTestHelpers.js';
import { MusicIcon, OptimizedMusicIcon } from '../../components/MusicIcon.js';

describe('MusicIcon Component', () => {
  describe('Basic Rendering', () => {
    test('should render spawning status icon', () => {
      expectComponent(
        <MusicIcon status="SPAWNING" animate={false} />
      )
        .containsText('♪')
        .hasColorCode('#FFCC66');
    });

    test('should render running status icon', () => {
      expectComponent(
        <MusicIcon status="RUNNING" animate={false} />
      )
        .containsText('♪')
        .hasColorCode('#B8F28E');
    });

    test('should render idle status icon', () => {
      expectComponent(
        <MusicIcon status="IDLE" animate={false} />
      )
        .containsText('♫')
        .hasColorCode('#9AA0A6');
    });

    test('should render error status icon', () => {
      expectComponent(
        <MusicIcon status="ERROR" animate={false} />
      )
        .containsText('⚠')
        .hasColorCode('#FF5555');
    });

    test('should render different sizes', () => {
      // Small size
      expectComponent(
        <MusicIcon status="IDLE" size="small" animate={false} />
      ).containsText('♫');

      // Normal size
      expectComponent(
        <MusicIcon status="IDLE" size="normal" animate={false} />
      ).containsText('♫');

      // Large size
      expectComponent(
        <MusicIcon status="IDLE" size="large" animate={false} />
      ).containsText('♫ ');
    });

    test('should handle disabled animation', () => {
      expectComponent(
        <MusicIcon status="RUNNING" animate={false} />
      )
        .containsText('♪')
        .doesNotHaveColorCode('\x1b[1m'); // No bold without animation
    });
  });

  describe('Status Colors', () => {
    test('should use correct colors for each status', () => {
      const colorMap = {
        SPAWNING: '#FFCC66',
        RUNNING: '#B8F28E',
        IDLE: '#9AA0A6',
        ERROR: '#FF5555'
      };

      Object.entries(colorMap).forEach(([status, expectedColor]) => {
        expectComponent(
          <MusicIcon status={status as any} animate={false} />
        ).hasColorCode(expectedColor);
      });
    });
  });

  describe('Optimized Component', () => {
    test('should render same as regular component', () => {
      const RegularIcon = () => <MusicIcon status="IDLE" animate={false} />;
      const OptimizedIcon = () => <OptimizedMusicIcon status="IDLE" animate={false} />;

      const regularResult = expectComponent(<RegularIcon />);
      const optimizedResult = expectComponent(<OptimizedIcon />);

      expect(regularResult.getSummary().cleanContent).toBe(optimizedResult.getSummary().cleanContent);
    });

    test('should prevent unnecessary re-renders with same props', () => {
      const TestComponent = () => {
        const [renderCount, setRenderCount] = React.useState(0);
        React.useEffect(() => setRenderCount(prev => prev + 1));

        return (
          <>
            <OptimizedMusicIcon status="IDLE" animate={false} />
            <Text>Render count: {renderCount}</Text>
          </>
        );
      };

      const instance = expectComponent(<TestComponent />);

      // Initial render should show count 1
      expect(instance.containsText('Render count: 1')).toBeTruthy();
    });
  });

  describe('Animation Integration', () => {
    test('should handle animation engine integration', () => {
      // This test would require mocking the animation engine
      // For now, just ensure it doesn't crash with animation enabled
      expect(() => {
        expectComponent(
          <MusicIcon status="RUNNING" animate={true} />
        );
      }).not.toThrow();
    });

    test('should handle animation cleanup on unmount', () => {
      // Test that animation cleanup doesn't throw errors
      expect(() => {
        const TestComponent = () => {
          const [show, setShow] = React.useState(true);

          React.useEffect(() => {
            // Unmount after a short delay
            const timer = setTimeout(() => setShow(false), 100);
            return () => clearTimeout(timer);
          }, []);

          return show ? <MusicIcon status="RUNNING" animate={true} /> : null;
        };

        expectComponent(<TestComponent />);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid status gracefully', () => {
      expect(() => {
        expectComponent(
          <MusicIcon status="INVALID" as any animate={false} />
        );
      }).not.toThrow();

      // Should default to idle behavior
      expectComponent(
        <MusicIcon status="INVALID" as any animate={false} />
      ).containsText('♫');
    });

    test('should handle missing props gracefully', () => {
      expect(() => {
        expectComponent(
          // @ts-expect-error Testing missing props
          <MusicIcon />
        );
      }).not.toThrow();
    });

    test('should handle null status gracefully', () => {
      expect(() => {
        expectComponent(
          // @ts-expect-error Testing null status
          <MusicIcon status={null} animate={false} />
        );
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    test('should render quickly', async () => {
      const { PerformanceTester } = require('../ComponentTestHelpers.js');

      const component = <MusicIcon status="IDLE" animate={false} />;
      const metrics = await PerformanceTester.measureRenderTime(component, 100);

      // Should render in under 1ms on average
      expect(metrics.averageTime).toBeLessThan(1);
      expect(metrics.maxTime).toBeLessThan(5);
    });

    test('should have minimal memory impact', () => {
      const { PerformanceTester } = require('../ComponentTestHelpers.js');

      const initialMemory = PerformanceTester.measureMemoryUsage();

      // Create many instances
      for (let i = 0; i < 100; i++) {
        expectComponent(<MusicIcon status="IDLE" animate={false} />);
      }

      const finalMemory = PerformanceTester.measureMemoryUsage();

      // Memory increase should be minimal (less than 1MB)
      const memoryIncrease = finalMemory.used - initialMemory.used;
      expect(memoryIncrease).toBeLessThan(1024 * 1024); // 1MB
    });
  });

  describe('Integration with Layout', () => {
    test('should work within Box components', () => {
      const TestComponent = () => (
        <MockComponents.Box>
          <Text>Status: </Text>
          <MusicIcon status="RUNNING" animate={false} />
          <Text> Agent</Text>
        </MockComponents.Box>
      );

      expectComponent(<TestComponent />)
        .containsText('Status: ♪ Agent');
    });

    test('should work with different terminal sizes', () => {
      const component = <MusicIcon status="IDLE" animate={false} />;

      // Test with different terminal dimensions
      const sizes = [
        { columns: 80, rows: 24 },
        { columns: 100, rows: 30 },
        { columns: 120, rows: 40 }
      ];

      sizes.forEach(size => {
        expect(() => {
          expectComponent(component, {
            mockTerminal: { dimensions: size }
          });
        }).not.toThrow();
      });
    });
  });

  describe('Accessibility', () => {
    test('should provide clear visual distinction for different statuses', () => {
      const statuses = ['SPAWNING', 'RUNNING', 'IDLE', 'ERROR'] as const;
      const renderedContents = [];

      statuses.forEach(status => {
        const result = expectComponent(
          <MusicIcon status={status} animate={false} />
        );
        renderedContents.push(result.getSummary().cleanContent);
      });

      // Each status should render different content
      const uniqueContents = [...new Set(renderedContents)];
      expect(uniqueContents.length).toBe(statuses.length);
    });

    test('should maintain consistent sizing', () => {
      const component = <MusicIcon status="IDLE" size="normal" animate={false} />;
      const result = expectComponent(component);

      // Content should be a single character (no extra spacing issues)
      expect(result.getSummary().cleanContent.trim().length).toBe(1);
    });
  });
});