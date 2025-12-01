// Distributed Tracing Configuration for PRP CLI
import { trace, context, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-grpc';

// Configuration
export interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  jaegerEndpoint?: string;
  otlpEndpoint?: string;
  prometheusPort?: number;
  samplingRate?: number;
  enableMetrics?: boolean;
}

// Default configuration
const DEFAULT_CONFIG: TracingConfig = {
  serviceName: 'prp-mcp-server',
  serviceVersion: process.env.npm_package_version || '0.5.0',
  environment: process.env.NODE_ENV || 'development',
  jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  otlpEndpoint: process.env.OTLP_ENDPOINT || 'localhost:14250',
  prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9464'),
  samplingRate: parseFloat(process.env.TRACE_SAMPLING_RATE || '0.1'),
  enableMetrics: process.env.ENABLE_METRICS !== 'false',
};

class TracingManager {
  private sdk: NodeSDK | null = null;
  private readonly config: TracingConfig;
  private readonly tracer = trace.getTracer('prp-cli-tracer');

  constructor(config: Partial<TracingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize OpenTelemetry tracing
   */
  async initialize(): Promise<void> {
    if (this.sdk) {
      console.warn('Tracing SDK already initialized');
      return;
    }

    try {
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
      });

      const exporters = [];

      // Jaeger exporter for distributed tracing
      if (this.config.jaegerEndpoint) {
        const jaegerExporter = new JaegerExporter({
          endpoint: this.config.jaegerEndpoint,
        });
        exporters.push(jaegerExporter);
      }

      // OTLP exporter for OpenTelemetry compatibility
      if (this.config.otlpEndpoint) {
        const otlpExporter = new OTLPTraceExporter({
          url: this.config.otlpEndpoint,
        });
        exporters.push(otlpExporter);
      }

      // Prometheus exporter for metrics
      let prometheusExporter;
      if (this.config.enableMetrics) {
        prometheusExporter = new PrometheusExporter({
          port: this.config.prometheusPort,
        });
        exporters.push(prometheusExporter);
      }

      this.sdk = new NodeSDK({
        resource,
        traceExporter: exporters[0], // Use first exporter as primary
        metricExporter: this.config.enableMetrics ? prometheusExporter : undefined,
        instrumentations: [getNodeAutoInstrumentations()],
        spanProcessors: [],
        sampler: {
          type: 'traceidratio',
          option: this.config.samplingRate,
        },
      });

      this.sdk.start();

      console.log('✅ OpenTelemetry tracing initialized', {
        service: this.config.serviceName,
        version: this.config.serviceVersion,
        environment: this.config.environment,
        samplingRate: this.config.samplingRate,
        metricsEnabled: this.config.enableMetrics,
      });

    } catch (error) {
      console.error('❌ Failed to initialize tracing:', error);
      throw error;
    }
  }

  /**
   * Shutdown tracing gracefully
   */
  async shutdown(): Promise<void> {
    if (this.sdk) {
      try {
        await this.sdk.shutdown();
        this.sdk = null;
        console.log('✅ Tracing shutdown completed');
      } catch (error) {
        console.error('❌ Error shutting down tracing:', error);
      }
    }
  }

  /**
   * Create a span for manual instrumentation
   */
  createSpan(name: string, attributes?: Record<string, unknown>) {
    return this.tracer.startSpan(name, {
      kind: SpanKind.SERVER,
      attributes: {
        ...attributes,
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
      },
    });
  }

  /**
   * Wrap a function with tracing
   */
  async traceAsync<T>(
    name: string,
    fn: (span: any) => Promise<T>,
    attributes?: Record<string, unknown>
  ): Promise<T> {
    const span = this.createSpan(name, attributes);

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Trace HTTP request
   */
  traceHttpRequest(method: string, url: string, userAgent?: string) {
    return this.createSpan('http_request', {
      [SemanticResourceAttributes.HTTP_METHOD]: method,
      [SemanticResourceAttributes.HTTP_URL]: url,
      [SemanticResourceAttributes.HTTP_USER_AGENT]: userAgent,
    });
  }

  /**
   * Trace agent operation
   */
  traceAgentOperation(agentType: string, operation: string, prpId?: string) {
    return this.createSpan('agent_operation', {
      'agent.type': agentType,
      'agent.operation': operation,
      'prp.id': prpId,
    });
  }

  /**
   * Trace file system operation
   */
  traceFileSystemOperation(operation: string, filePath: string) {
    return this.createSpan('file_system_operation', {
      'fs.operation': operation,
      'fs.path': filePath,
    });
  }

  /**
   * Trace CLI command
   */
  traceCliCommand(command: string, args: string[]) {
    return this.createSpan('cli_command', {
      'cli.command': command,
      'cli.args': args.join(' '),
    });
  }

  /**
   * Add custom attributes to current span
   */
  addAttributes(attributes: Record<string, unknown>): void {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.setAttributes(attributes);
    }
  }

  /**
   * Add event to current span
   */
  addEvent(name: string, attributes?: Record<string, unknown>): void {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.addEvent(name, attributes);
    }
  }

  /**
   * Record exception in current span
   */
  recordException(error: Error): void {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.recordException(error);
      currentSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }
  }

  /**
   * Get configuration
   */
  getConfig(): TracingConfig {
    return { ...this.config };
  }

  /**
   * Check if tracing is enabled
   */
  isEnabled(): boolean {
    return this.sdk !== null;
  }
}

// Singleton instance
let tracingManager: TracingManager | null = null;

/**
 * Get or create tracing manager instance
 */
export function getTracingManager(config?: Partial<TracingConfig>): TracingManager {
  if (!tracingManager) {
    tracingManager = new TracingManager(config);
  }
  return tracingManager;
}

/**
 * Initialize tracing with default configuration
 */
export async function initializeTracing(config?: Partial<TracingConfig>): Promise<void> {
  const manager = getTracingManager(config);
  await manager.initialize();
}

/**
 * Shutdown tracing
 */
export async function shutdownTracing(): Promise<void> {
  if (tracingManager) {
    await tracingManager.shutdown();
    tracingManager = null;
  }
}

// Express middleware for automatic HTTP tracing
export function expressTracingMiddleware() {
  return (req: any, res: any, next: any) => {
    const manager = getTracingManager();
    const span = manager.traceHttpRequest(
      req.method,
      req.url,
      req.headers['user-agent']
    );

    // Add request attributes
    span.setAttributes({
      'http.user_agent': req.headers['user-agent'],
      'http.remote_addr': req.ip || req.connection.remoteAddress,
      'http.protocol': req.protocol,
    });

    // Capture response
    res.on('finish', () => {
      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.response_size': res.get('content-length') || 0,
      });

      if (res.statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${res.statusCode}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
      span.end();
    });

    next();
  };
}

// Decorator for automatic method tracing
export function traceable(name?: string, attributes?: Record<string, unknown>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const manager = getTracingManager();
      return manager.traceAsync(
        methodName,
        async (span) => {
          // Add method arguments as attributes (be careful with sensitive data)
          if (args.length > 0) {
            span.setAttributes({
              'method.args_count': args.length,
              'method.name': propertyKey,
            });
          }
          return await originalMethod.apply(this, args);
        },
        attributes
      );
    };

    return descriptor;
  };
}

export { TracingManager, TracingConfig };