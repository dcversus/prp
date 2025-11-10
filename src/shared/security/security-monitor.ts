/**
 * Security Monitoring and Alerting System
 *
 * Provides comprehensive security monitoring, threat detection, and alerting
 * capabilities for the PRP system following security best practices.
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { logger } from '../logger.js';

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  source: string;
  message: string;
  details?: Record<string, unknown>;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  actionTaken?: string;
}

export type SecurityEventType =
  | 'authentication_success'
  | 'authentication_failure'
  | 'authorization_violation'
  | 'injection_attempt'
  | 'path_traversal_attempt'
  | 'ssrf_attempt'
  | 'rate_limit_exceeded'
  | 'suspicious_activity'
  | 'data_exfiltration_attempt'
  | 'unauthorized_access'
  | 'credential_compromise'
  | 'anomalous_behavior'
  | 'security_policy_violation'
  | 'malware_detected'
  | 'brute_force_attempt';

export interface SecurityAlert {
  eventId: string;
  alertType: 'immediate' | 'hourly' | 'daily';
  recipients: string[];
  message: string;
  severity: SecurityEvent['severity'];
  metadata: Record<string, unknown>;
}

export interface SecurityMonitoringConfig {
  enableRealTimeAlerting: boolean;
  alertRetentionDays: number;
  rateLimitThresholds: {
    authenticationFailures: number;
    requestRate: number;
    dataAccessAttempts: number;
  };
  suspiciousPatterns: RegExp[];
  blacklistedIPs: string[];
  whitelistedIPs: string[];
  alertChannels: {
    email?: {
      enabled: boolean;
      recipients: string[];
      smtpConfig?: Record<string, unknown>;
    };
    webhook?: {
      enabled: boolean;
      url: string;
      headers?: Record<string, string>;
    };
    slack?: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
    };
  };
}

interface SecurityStats {
  eventsBySeverity: Record<string, number>;
  eventsByType: Record<string, number>;
  totalEvents: number;
  timeRange: { start: Date; end: Date };
  topIPs: Array<{ ip: string; count: number }>;
  criticalEvents: SecurityEvent[];
}

interface SecurityThreat {
  id: string;
  type: string;
  severity: string;
  description: string;
  source: string;
  timestamp: Date;
  count?: number;
}

export class SecurityMonitor extends EventEmitter {
  private static instance: SecurityMonitor;
  private events: SecurityEvent[] = [];
  private config: SecurityMonitoringConfig;
  private rateLimitTracker = new Map<string, { count: number; resetTime: number }>();
  private eventProcessorInterval?: NodeJS.Timeout;

  private constructor(config: SecurityMonitoringConfig) {
    super();
    this.config = config;
    this.startEventProcessor();
  }

  static getInstance(config?: SecurityMonitoringConfig): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      if (!config) {
        throw new Error('SecurityMonitor requires configuration on first instantiation');
      }
      SecurityMonitor.instance = new SecurityMonitor(config);
    }
    return SecurityMonitor.instance;
  }

  /**
   * Log a security event
   */
  logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...event
    };

    this.events.push(securityEvent);
    this.emit('securityEvent', securityEvent);

    // Process immediate alerts
    if (securityEvent.severity === 'critical' || securityEvent.severity === 'high') {
      this.processImmediateAlert(securityEvent);
    }

    // Clean up old events
    this.cleanupOldEvents();
  }

  /**
   * Check for suspicious patterns and anomalies
   */
  analyzeSecurityContext(context: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestPath?: string;
    method?: string;
    payload?: unknown;
  }): void {
    const { userId, ipAddress, requestPath, payload } = context;

    // Rate limiting analysis
    if (ipAddress) {
      this.checkRateLimit(ipAddress, 'requests');
    }

    if (userId) {
      this.checkRateLimit(userId, 'authentication_attempts');
    }

    // Suspicious pattern detection
    if (requestPath || payload) {
      this.detectSuspiciousPatterns(requestPath, payload);
    }

    // Anomalous behavior detection
    this.detectAnomalousBehavior(context);
  }

  /**
   * Block an IP address temporarily
   */
  blockIPAddress(ipAddress: string, durationMinutes: number = 60, reason: string): void {
    this.logSecurityEvent({
      type: 'unauthorized_access',
      severity: 'high',
      source: 'security_monitor',
      message: `IP address ${ipAddress} blocked for ${durationMinutes} minutes. Reason: ${reason}`,
      details: { ipAddress, durationMinutes, reason }
    });

    // In a real implementation, this would integrate with firewall/proxy
    logger.warn('security', 'SecurityMonitor', `IP ${ipAddress} blocked for ${durationMinutes} minutes due to: ${reason}`);
  }

  /**
   * Get security statistics
   */
  getSecurityStats(timeframeHours: number = 24): {
    totalEvents: number;
    eventsByType: Record<SecurityEventType, number>;
    eventsBySeverity: Record<SecurityEvent['severity'], number>;
    topIPs: Array<{ ip: string; count: number }>;
    criticalEvents: SecurityEvent[];
  } {
    const cutoff = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);
    const recentEvents = this.events.filter(event => event.timestamp >= cutoff);

    const eventsByType = {} as Record<SecurityEventType, number>;
    const eventsBySeverity = {} as Record<SecurityEvent['severity'], number>;
    const ipCounts = new Map<string, number>();

    recentEvents.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] ?? 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] ?? 0) + 1;

      if (event.ipAddress) {
        ipCounts.set(event.ipAddress, (ipCounts.get(event.ipAddress) ?? 0) + 1);
      }
    });

    const topIPs = Array.from(ipCounts.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const criticalEvents = recentEvents
      .filter(event => event.severity === 'critical')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      topIPs,
      criticalEvents,
      timeRange: {
        start: cutoff,
        end: new Date()
      }
    } as SecurityStats;
  }

  /**
   * Generate security report
   */
  generateSecurityReport(timeframeHours: number = 24): {
    summary: {
      totalEvents: number;
      criticalEvents: number;
      highSeverityEvents: number;
      uniqueIPs: number;
      uniqueUsers: number;
    };
    threats: Array<{
      type: string;
      count: number;
      severity: string;
      description: string;
    }>;
    recommendations: string[];
    topAttackers: Array<{ ip: string; events: number; types: string[] }>;
  } {
    const stats = this.getSecurityStats(timeframeHours);
    const cutoff = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);
    const recentEvents = this.events.filter(event => event.timestamp >= cutoff);

    const uniqueIPs = new Set(recentEvents.map(e => e.ipAddress).filter(Boolean));
    const uniqueUsers = new Set(recentEvents.map(e => e.userId).filter(Boolean));

    // Analyze threat patterns
    const threatAnalysis = this.analyzeThreats(recentEvents);

    // Generate recommendations
    const recommendations = this.generateRecommendations(stats as SecurityStats, threatAnalysis as SecurityThreat[]);

    // Analyze top attackers
    const topAttackers = this.analyzeTopAttackers(recentEvents);

    return {
      summary: {
        totalEvents: stats.totalEvents,
        criticalEvents: stats.eventsBySeverity.critical || 0,
        highSeverityEvents: stats.eventsBySeverity.high || 0,
        uniqueIPs: uniqueIPs.size,
        uniqueUsers: uniqueUsers.size
      },
      threats: threatAnalysis,
      recommendations,
      topAttackers
    };
  }

  /**
   * Export security events for analysis
   */
  exportSecurityEvents(format: 'json' | 'csv' = 'json', timeframeHours?: number): string {
    const events = timeframeHours
      ? this.events.filter(e => e.timestamp >= new Date(Date.now() - timeframeHours * 60 * 60 * 1000))
      : this.events;

    if (format === 'csv') {
      const headers = 'id,type,severity,timestamp,source,message,userId,ipAddress,actionTaken';
      const rows = events.map(e => [
        e.id,
        e.type,
        e.severity,
        e.timestamp.toISOString(),
        e.source,
        `"${e.message.replace(/"/g, '""')}"`,
        e.userId ?? '',
        e.ipAddress ?? '',
        e.actionTaken ?? ''
      ].join(','));

      return [headers, ...rows].join('\n');
    }

    return JSON.stringify(events, null, 2);
  }

  /**
   * Clear old security events
   */
  cleanupOldEvents(): void {
    const cutoff = new Date(Date.now() - this.config.alertRetentionDays * 24 * 60 * 60 * 1000);
    this.events = this.events.filter(event => event.timestamp >= cutoff);
  }

  // Private methods

  private startEventProcessor(): void {
    this.eventProcessorInterval = setInterval(() => {
      this.processBatchAlerts();
      this.cleanupOldEvents();
    }, 60000); // Process every minute
  }

  private processImmediateAlert(event: SecurityEvent): void {
    if (!this.config.enableRealTimeAlerting) {
      return;
    }

    const alert: SecurityAlert = {
      eventId: event.id,
      alertType: 'immediate',
      recipients: this.getAlertRecipients(event.severity),
      message: `🚨 Security Alert [${event.severity.toUpperCase()}]: ${event.message}`,
      severity: event.severity,
      metadata: {
        type: event.type,
        source: event.source,
        timestamp: event.timestamp,
        details: event.details
      }
    };

    this.sendAlert(alert);
  }

  private processBatchAlerts(): void {
    // Process hourly and daily alerts
    // This would aggregate events and send periodic summaries
  }

  private sendAlert(alert: SecurityAlert): void {
    this.emit('securityAlert', alert);

    // Send to configured alert channels
    if (this.config.alertChannels.email?.enabled) {
      this.sendEmailAlert(alert);
    }

    if (this.config.alertChannels.webhook?.enabled) {
      this.sendWebhookAlert(alert);
    }

    if (this.config.alertChannels.slack?.enabled) {
      this.sendSlackAlert(alert);
    }
  }

  private sendEmailAlert(_alert: SecurityAlert): void {
    // Implementation would use nodemailer or similar
  }

  private sendWebhookAlert(_alert: SecurityAlert): void {
    // Implementation would send HTTP POST to webhook URL
  }

  private sendSlackAlert(_alert: SecurityAlert): void {
    // Implementation would send to Slack webhook
  }

  private getAlertRecipients(_severity: SecurityEvent['severity']): string[] {
    const recipients: string[] = [];

    if (this.config.alertChannels.email?.enabled) {
      recipients.push(...this.config.alertChannels.email.recipients);
    }

    return recipients;
  }

  private checkRateLimit(identifier: string, type: string): void {
    const key = `${identifier}:${type}`;
    const now = Date.now();
    const windowMs = 60000; // 1 minute window

    if (!this.rateLimitTracker.has(key)) {
      this.rateLimitTracker.set(key, { count: 1, resetTime: now + windowMs });
      return;
    }

    const tracker = this.rateLimitTracker.get(key);
    if (!tracker) {
      throw new Error('Rate limit tracker entry not found');
    }

    if (now > tracker.resetTime) {
      tracker.count = 1;
      tracker.resetTime = now + windowMs;
      return;
    }

    tracker.count++;

    // Check against thresholds
    const threshold = this.config.rateLimitThresholds[type as keyof typeof this.config.rateLimitThresholds];
    if (threshold && tracker.count > threshold) {
      this.logSecurityEvent({
        type: 'rate_limit_exceeded',
        severity: 'medium',
        source: 'security_monitor',
        message: `Rate limit exceeded for ${identifier}: ${tracker.count} ${type} in 1 minute`,
        details: { identifier, type, count: tracker.count, threshold }
      });
    }
  }

  private detectSuspiciousPatterns(requestPath?: string, payload?: unknown): void {
    const patterns = this.config.suspiciousPatterns;
    const content = `${requestPath ?? ''} ${JSON.stringify(payload ?? {})}`;

    patterns.forEach(pattern => {
      if (pattern.test(content)) {
        this.logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'high',
          source: 'security_monitor',
          message: `Suspicious pattern detected: ${pattern.source}`,
          details: { pattern: pattern.source, requestPath, payload }
        });
      }
    });
  }

  private detectAnomalousBehavior(_context: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestPath?: string;
    method?: string;
  }): void {
    // Implement anomaly detection logic
    // This would include things like:
    // - Unusual access patterns
    // - Impossible travel times
    // - Atypical user agent strings
    // - Unauthorized access attempts to sensitive resources
  }

  private analyzeThreats(events: SecurityEvent[]): Array<{
    type: string;
    count: number;
    severity: string;
    description: string;
  }> {
    const threatMap = new Map<string, { count: number; severity: string; description: string }>();

    events.forEach(event => {
      const existing = threatMap.get(event.type);
      if (existing) {
        existing.count++;
      } else {
        threatMap.set(event.type, {
          count: 1,
          severity: event.severity,
          description: this.getThreatDescription(event.type)
        });
      }
    });

    return Array.from(threatMap.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.count - a.count);
  }

  private getThreatDescription(type: SecurityEventType): string {
    const descriptions: Record<SecurityEventType, string> = {
      authentication_success: 'Successful authentication events',
      authentication_failure: 'Failed login attempts or authentication challenges',
      authorization_violation: 'Attempts to access resources without proper permissions',
      injection_attempt: 'SQL, NoSQL, or command injection attempts detected',
      path_traversal_attempt: 'Directory traversal or path manipulation attempts',
      ssrf_attempt: 'Server-side request forgery attempts',
      rate_limit_exceeded: 'Exceeded configured rate limiting thresholds',
      suspicious_activity: 'Activity patterns matching suspicious behavior',
      data_exfiltration_attempt: 'Attempts to exfiltrate sensitive data',
      unauthorized_access: 'Access attempts to unauthorized resources',
      credential_compromise: 'Potential credential theft or compromise',
      anomalous_behavior: 'Behavior deviating from normal patterns',
      security_policy_violation: 'Violations of security policies',
      malware_detected: 'Malware or malicious code detected',
      brute_force_attempt: 'Brute force attack patterns detected'
    };

    return descriptions[type] || 'Unknown security threat type';
  }

  private generateRecommendations(stats: SecurityStats, threats: SecurityThreat[]): string[] {
    const recommendations: string[] = [];

    if ((stats.eventsBySeverity.critical ?? 0) > 0) {
      recommendations.push('🚨 Immediate attention required: Critical security events detected');
    }

    if ((stats.eventsBySeverity.high ?? 0) > 10) {
      recommendations.push('⚠️ High number of high-severity events - review security posture');
    }

    const bruteForceThreats = threats.find(t => t.type === 'brute_force_attempt');
    if (bruteForceThreats && (bruteForceThreats.count ?? 0) > 5) {
      recommendations.push('🔒 Implement stronger authentication mechanisms and account lockout policies');
    }

    const injectionThreats = threats.find(t => t.type === 'injection_attempt');
    if (injectionThreats && (injectionThreats.count ?? 0) > 0) {
      recommendations.push('🛡️ Strengthen input validation and parameterized queries');
    }

    if (stats.topIPs && stats.topIPs.length > 0 && stats.topIPs[0] && stats.topIPs[0].count > 20) {
      recommendations.push(`🚫 Consider blocking IP ${stats.topIPs[0].ip} - ${stats.topIPs[0].count} events detected`);
    }

    return recommendations;
  }

  private analyzeTopAttackers(events: SecurityEvent[]): Array<{ ip: string; events: number; types: string[] }> {
    const ipStats = new Map<string, { count: number; types: Set<string> }>();

    events.forEach(event => {
      if (event.ipAddress) {
        const existing = ipStats.get(event.ipAddress) ?? { count: 0, types: new Set() };
        existing.count++;
        existing.types.add(event.type);
        ipStats.set(event.ipAddress, existing);
      }
    });

    return Array.from(ipStats.entries())
      .map(([ip, stats]) => ({
        ip,
        events: stats.count,
        types: Array.from(stats.types)
      }))
      .sort((a, b) => b.events - a.events)
      .slice(0, 10);
  }

  /**
   * Shutdown the security monitor
   */
  shutdown(): void {
    if (this.eventProcessorInterval) {
      clearInterval(this.eventProcessorInterval);
    }
    this.removeAllListeners();
  }
}

export default SecurityMonitor;