/**
 * ♫ React Error Boundary for TUI
 *
 * Catches React errors and warnings to prevent them from appearing in console/stderr
 * Routes them to the logger system for internal handling instead
 */

import React, { Component, JSX } from 'react';
import { Box, Text } from 'ink';

import { createLayerLogger } from '../../shared/logger';

import type { ErrorInfo, ReactNode } from 'react';

const logger = createLayerLogger('tui');

interface TUIErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  debugMode?: boolean;
};

interface TUIErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryRequested?: boolean;
};

export class TUIErrorBoundary extends Component<TUIErrorBoundaryProps, TUIErrorBoundaryState> {
  private readonly originalConsoleError: typeof console.error;
  private readonly originalConsoleWarn: typeof console.warn;
  private readonly warningBuffer: string[] = [];

  constructor(props: TUIErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };

    // Store original console methods
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
  }

  componentDidMount() {
    // Override console methods to intercept React warnings
    this.interceptConsoleOutput();
  }

  componentWillUnmount() {
    // Restore original console methods
    this.restoreConsoleOutput();
  }

  private interceptConsoleOutput() {
    // Override console.error to catch React warnings and errors
    console.error = (...args: unknown[]) => {
      const message = args.join(' ');

      // Check if this is a React warning or error
      if (this.isReactWarning(message) || this.isReactError(message)) {
        // Route to logger instead of console
        logger.error('ErrorBoundary', 'React console.error', new Error(message), {
          args: args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))),
          type: this.isReactWarning(message) ? 'warning' : 'error',
        });

        // Only show in debug mode
        if (this.props.debugMode) {
          this.originalConsoleError(...args);
        }
      } else {
        // Pass through non-React errors
        this.originalConsoleError(...args);
      }
    };

    // Override console.warn to catch React warnings
    console.warn = (...args: unknown[]) => {
      const message = args.join(' ');

      // Check if this is a React warning
      if (this.isReactWarning(message)) {
        // Route to logger instead of console
        logger.warn('ErrorBoundary', 'React console.warn', {
          args: args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))),
          message,
        });

        // Only show in debug mode
        if (this.props.debugMode) {
          this.originalConsoleWarn(...args);
        }
      } else {
        // Pass through non-React warnings
        this.originalConsoleWarn(...args);
      }
    };
  }

  private restoreConsoleOutput() {
    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;
  }

  private isReactWarning(message: string): boolean {
    // Common React warning patterns
    const reactWarningPatterns = [
      /Warning: .+/, // React warning messages
      /Maximum update depth exceeded/, // Infinite loop warning
      /Each child in a list should have a unique "key" prop/,
      /Warning: .+ is using uppercase HTML/,
      /Warning: .+ is passing a function/,
      /Warning: .+ is calling useMemo/,
      /Warning: .+ received a value for/,
      /Warning: Failed prop type:/,
      /Warning: Invalid DOM property/,
      /Warning: Unknown prop/,
      /Warning: React does not recognize/,
      /Warning: Text content does not match/,
      /Warning: Can't perform a React state update/,
      /Warning: A component is changing an uncontrolled input/,
      /Warning: An invalid form control/,
    ];

    return reactWarningPatterns.some((pattern) => pattern.test(message));
  }

  private isReactError(message: string): boolean {
    // React error patterns
    const reactErrorPatterns = [
      /Uncaught Error: .+/, // React runtime errors
      /Error: .+/, // Generic error (but only if React-related)
      /TypeError: .+/, // Type errors from React
      /ReferenceError: .+/, // Reference errors from React
      /Cannot read propert(y|ies)/, // Common React error pattern
      /is not a function/, // Common React function error
      /Cannot access .+ before initialization/,
    ];

    // Check if it's a React error by looking for React-specific keywords
    const isReactRelated =
      message.toLowerCase().includes('react') ||
      message.toLowerCase().includes('component') ||
      message.toLowerCase().includes('hook') ||
      message.toLowerCase().includes('render');

    return isReactRelated && reactErrorPatterns.some((pattern) => pattern.test(message));
  }

  static getDerivedStateFromError(error: Error): TUIErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log React errors to logger instead of console
    logger.error('ErrorBoundary', 'React component error caught', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      errorMessage: error.message,
      errorStack: error.stack,
    });

    // Always log to console for debugging since we're fixing the infinite loop issue
    this.originalConsoleError('React Error Boundary caught an error:', error.message);
    this.originalConsoleError('Component stack:', errorInfo.componentStack);

    this.setState({
      error,
      errorInfo,
    });
  }

  private readonly handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryRequested: true,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && !this.state.retryRequested) {
      // Show custom error fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI for TUI using Ink components
      return (
        <Box flexDirection="column" padding={1}>
          <Text color="red" bold>
            ⚠️ React Error
          </Text>
          <Text>A React error occurred in the TUI.</Text>
          {this.props.debugMode && this.state.error && (
            <Box flexDirection="column" marginTop={1}>
              <Text color="yellow">Error Details:</Text>
              <Text color="gray">{this.state.error.message}</Text>
              {this.state.errorInfo && (
                <Text color="gray">
                  Component:{' '}
                  {this.state.errorInfo.componentStack.split('\n')[1]?.trim() || 'Unknown'}
                </Text>
              )}
            </Box>
          )}
          <Text color="blue" marginTop={1}>
            Press Ctrl+C to exit and restart the application.
          </Text>
        </Box>
      );
    }

    return this.props.children;
  }
};

/**
 * Higher-order component to wrap any component with TUIErrorBoundary
 */
export function withTUIErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  debugMode?: boolean,
): React.ComponentType<P> {
  return function WrappedComponent(props: P) {
    return (
      <TUIErrorBoundary fallback={fallback} debugMode={debugMode}>
        <Component {...props} />
      </TUIErrorBoundary>
    );
  };
};
