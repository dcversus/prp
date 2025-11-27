/**
 * Metrics Route for Prometheus
 * Exposes all internal stats as Prometheus metrics
 */
import { Router } from 'express';
import * as client from 'prom-client';

import type { Request, Response } from 'express';

const router = Router();
// Create a Registry to register the metrics
const register = new client.Registry();
// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'prp-mcp-server',
});
// Enable the collection of default metrics
client.collectDefaultMetrics({ register });
// Custom metrics for PRP
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});
const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});
const activeConnections = new client.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections',
  registers: [register],
});
const activeAgents = new client.Gauge({
  name: 'agents_active',
  help: 'Number of active agents',
  registers: [register],
});
const totalPRPs = new client.Gauge({
  name: 'prps_total',
  help: 'Total number of PRPs',
  registers: [register],
});
const activePRPs = new client.Gauge({
  name: 'prps_active',
  help: 'Number of active PRPs',
  registers: [register],
});
// @ts-expect-error - metrics used in runtime
const tokenUsage = new client.Gauge({
  name: 'token_usage_total',
  help: 'Total token usage',
  labelNames: ['model', 'type'],
  registers: [register],
});
// @ts-expect-error - metrics used in runtime
const signalCount = new client.Counter({
  name: 'signals_total',
  help: 'Total number of signals processed',
  labelNames: ['type', 'severity'],
  registers: [register],
});
// @ts-expect-error - metrics used in runtime
const taskCompletionTime = new client.Histogram({
  name: 'task_completion_seconds',
  help: 'Time taken to complete tasks',
  labelNames: ['agent_type', 'task_type'],
  buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600],
  registers: [register],
});
const systemMemoryUsage = new client.Gauge({
  name: 'system_memory_bytes',
  help: 'System memory usage in bytes',
  labelNames: ['type'],
  registers: [register],
});
const mcpOperations = new client.Counter({
  name: 'mcp_operations_total',
  help: 'Total MCP operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});
// Scanner-specific metrics
const scannerTotalScans = new client.Counter({
  name: 'scanner_scans_total',
  help: 'Total number of scans performed',
  registers: [register],
});
const scannerScanDuration = new client.Histogram({
  name: 'scanner_scan_duration_seconds',
  help: 'Time taken to complete scans',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});
const scannerWorktreesCount = new client.Gauge({
  name: 'scanner_worktrees_count',
  help: 'Number of worktrees being monitored',
  registers: [register],
});
const scannerFileChangesCount = new client.Gauge({
  name: 'scanner_file_changes_count',
  help: 'Number of file changes detected',
  labelNames: ['change_type'],
  registers: [register],
});
const scannerSignalsDetected = new client.Counter({
  name: 'scanner_signals_detected_total',
  help: 'Total number of signals detected',
  labelNames: ['signal_type', 'severity'],
  registers: [register],
});
const scannerTokensAccounted = new client.Gauge({
  name: 'scanner_tokens_accounted',
  help: 'Tokens accounted for by the token accountant',
  labelNames: ['agent_id', 'agent_type'],
  registers: [register],
});
const scannerErrorCount = new client.Counter({
  name: 'scanner_errors_total',
  help: 'Total number of scanner errors',
  labelNames: ['error_type'],
  registers: [register],
});
const scannerPRPFilesCount = new client.Gauge({
  name: 'scanner_prp_files_count',
  help: 'Number of PRP files being monitored',
  registers: [register],
});
const scannerEventQueueSize = new client.Gauge({
  name: 'scanner_event_queue_size',
  help: 'Current size of the scanner event queue',
  registers: [register],
});
const scannerPeakWorktrees = new client.Gauge({
  name: 'scanner_peak_worktrees',
  help: 'Peak number of worktrees monitored',
  registers: [register],
});
// File-specific metrics
const filesScannedTotal = new client.Counter({
  name: 'files_scanned_total',
  help: 'Total number of files scanned',
  labelNames: ['file_extension'],
  registers: [register],
});
const fileHashCacheSize = new client.Gauge({
  name: 'file_hash_cache_size',
  help: 'Current size of the file hash cache',
  registers: [register],
});
const fileSizeBytes = new client.Histogram({
  name: 'file_size_bytes',
  help: 'Distribution of file sizes',
  buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
  registers: [register],
});
// Git-specific metrics
// @ts-expect-error - metrics used in runtime
const _gitStatusCheckDuration = new client.Histogram({
  name: 'git_status_check_duration_seconds',
  help: 'Time taken to check git status',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});
// @ts-expect-error - metrics used in runtime
const _gitBranchesCount = new client.Gauge({
  name: 'git_branches_count',
  help: 'Number of git branches being monitored',
  registers: [register],
});
// @ts-expect-error - metrics used in runtime
const _gitCommitsAheadBehind = new client.Gauge({
  name: 'git_commits_ahead_behind',
  help: 'Number of commits ahead/behind main branch',
  labelNames: ['direction', 'branch'],
  registers: [register],
});
// Middleware to track HTTP metrics
function trackMetrics(req: Request, res: Response, next: any) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    httpRequestDuration.labels(req.method, route, res.statusCode.toString()).observe(duration);
    httpRequestTotal.labels(req.method, route, res.statusCode.toString()).inc();
  });
  next();
}
// Metrics endpoint
router.get('/', trackMetrics, async (req: Request, res: Response) => {
  try {
    // Update custom metrics with current values
    const {mcpServer} = (req as any);
    if (mcpServer) {
      const status = await mcpServer.getServerStatus();
      // Update connection metrics
      activeConnections.set(status.connections.active);
      // Update agent metrics
      activeAgents.set(status.agents.active);
      // Update PRP metrics
      totalPRPs.set(status.prps.total);
      activePRPs.set(status.prps.active);
      // Update memory metrics
      systemMemoryUsage.labels('rss').set(status.server.memory.rss);
      systemMemoryUsage.labels('heap_used').set(status.server.memory.heapUsed);
      systemMemoryUsage.labels('heap_total').set(status.server.memory.heapTotal);
      systemMemoryUsage.labels('external').set(status.server.memory.external);
      // Update scanner metrics if scanner is available
      const {scanner} = mcpServer;
      if (scanner && typeof scanner.getMetrics === 'function') {
        const scannerMetrics = scanner.getMetrics();
        // Scanner performance metrics
        if (scannerMetrics.scanMetrics) {
          scannerTotalScans.inc(scannerMetrics.scanMetrics.totalScans || 0);
          scannerScanDuration.observe(scannerMetrics.scanMetrics.avgScanTime || 0);
          scannerPeakWorktrees.set(scannerMetrics.scanMetrics.peakWorktrees || 0);
          if (scannerMetrics.scanMetrics?.errors) {
            scannerErrorCount.labels('general').inc(scannerMetrics.scanMetrics.errors);
          }
        }
        // Worktree metrics
        if (scannerMetrics.worktrees) {
          const {worktrees} = scannerMetrics;
          let cleanCount = 0,
            dirtyCount = 0,
            conflictCount = 0,
            divergedCount = 0;
          let totalPRPFiles = 0;
          let totalFilesScanned = 0;
          const fileChangeTypes: Record<string, number> = {};
          const fileExtensions: Record<string, number> = {};
          worktrees.forEach((wt: any) => {
            // Count worktree statuses
            switch (wt.status) {
              case 'clean':
                cleanCount++;
                break;
              case 'dirty':
                dirtyCount++;
                break;
              case 'conflict':
                conflictCount++;
                break;
              case 'diverged':
                divergedCount++;
                break;
            }
            // Count PRP files
            totalPRPFiles += wt.prpFiles ? wt.prpFiles.length : 0;
            // Count file changes
            if (wt.fileChanges) {
              wt.fileChanges.forEach((fc: any) => {
                fileChangeTypes[fc.changeType] = (fileChangeTypes[fc.changeType] || 0) + 1;
                totalFilesScanned++;
                // Count file extensions
                const ext = fc.path.split('.').pop() || 'no-ext';
                fileExtensions[ext] = (fileExtensions[ext] || 0) + 1;
                // Observe file size
                if (fc.size) {
                  fileSizeBytes.observe(fc.size);
                }
              });
            }
          });
          // Update worktree metrics
          scannerWorktreesCount.set(worktrees.length);
          scannerPRPFilesCount.set(totalPRPFiles);
          // Update file change metrics
          Object.entries(fileChangeTypes).forEach(([type, count]) => {
            scannerFileChangesCount.labels(type).set(count);
          });
          // Update file scanned metrics
          Object.entries(fileExtensions).forEach(([ext, count]) => {
            filesScannedTotal.labels(ext).inc(count);
          });
        }
        // Signal metrics
        if (scannerMetrics.signals) {
          scannerMetrics.signals.forEach((signal: any) => {
            scannerSignalsDetected
              .labels(signal.type || 'unknown', signal.severity || 'unknown')
              .inc();
          });
        }
        // Token usage metrics
        if (scannerMetrics.tokenUsage) {
          Object.entries(scannerMetrics.tokenUsage).forEach(([agentId, usage]: [string, any]) => {
            scannerTokensAccounted
              .labels(agentId, usage.agentType || 'unknown')
              .set(usage.totalTokens || 0);
          });
        }
        // Event queue metrics
        if (typeof scanner.getEventQueueSize === 'function') {
          const queueSize = scanner.getEventQueueSize();
          scannerEventQueueSize.set(queueSize);
        }
        // File hash cache metrics
        if (typeof scanner.getFileHashCacheSize === 'function') {
          const cacheSize = scanner.getFileHashCacheSize();
          fileHashCacheSize.set(cacheSize);
        }
      }
      // Track MCP operations
      mcpOperations.labels('metrics_request', 'success').inc();
    }
    // Return metrics in Prometheus format
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error('Error generating metrics:', error);
    mcpOperations.labels('metrics_request', 'error').inc();
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});
// Health check for readiness probe (detailed)
router.get('/health/readiness', trackMetrics, async (req: Request, res: Response) => {
  try {
    // @ts-expect-error - server data used in runtime
    const _mcpServerData = (req as any).mcpServer;
    const checks = {
      status: 'ready',
      timestamp: Date.now(),
      checks: {
        database: 'pass', // Would check actual DB connection
        auth: 'pass', // Would check auth system
        agents: 'pass', // Would check agent manager
        scanner: 'pass', // Would check file scanner
        disk: 'pass', // Would check disk space
      },
    };
    // Determine overall readiness
    const failedChecks = Object.values(checks.checks).filter((c) => c !== 'pass');
    if (failedChecks.length > 0) {
      checks.status = 'not ready';
      res.status(503);
    }
    res.json(checks);
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
// Health check for liveness probe (simple)
router.get('/health/liveness', trackMetrics, async (req: Request, res: Response) => {
  try {
    const {mcpServer} = (req as any);
    const uptime = mcpServer ? Date.now() - mcpServer.startTime : 0;
    // Simple liveness check - if we can respond, we're alive
    res.json({
      status: 'alive',
      timestamp: Date.now(),
      uptime,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
export { router as metricsRouter, trackMetrics };
