#!/usr/bin/env node

/**
 * Deployment Monitoring Script
 *
 * This script monitors the deployment status and health of the PRP landing page.
 * It can be used for post-deployment verification and ongoing monitoring.
 */

import https from 'https';
import http from 'http';
import { performance } from 'perf_hooks';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAIN = 'prp.theedgestory.org';
const PROD_URL = `https://${DOMAIN}`;
const STAGING_URL = `https://main--${DOMAIN.replace('.', '-')}.gh.pages.dev`;

// Monitoring configuration
const MONITORING_CONFIG = {
  timeout: 10000, // 10 seconds
  retries: 3,
  alerts: {
    responseTimeThreshold: 2000, // ms
    sslDaysThreshold: 30, // days
    availabilityThreshold: 99.9, // %
    errorRateThreshold: 1.0 // %
  }
};

/**
 * Make HTTP request with timeout and retries
 */
async function makeRequest(url, options = {}) {
  const maxRetries = options.retries || MONITORING_CONFIG.retries;
  const timeout = options.timeout || MONITORING_CONFIG.timeout;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const startTime = performance.now();

      const response = await new Promise((resolve, reject) => {
        const requestModule = url.startsWith('https') ? https : http;
        const req = requestModule.get(url, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: data,
              responseTime: performance.now() - startTime
            });
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error(`Request timeout after ${timeout}ms`));
        });

        req.setTimeout(timeout);
      });

      return response;

    } catch (error) {
      console.warn(`Attempt ${attempt} failed for ${url}: ${error.message}`);

      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

/**
 * Check SSL certificate validity
 */
async function checkSSLCertificate() {
  const startTime = performance.now();

  try {
    const socket = new https.Socket();

    const certInfo = await new Promise((resolve, reject) => {
      socket.connect(443, DOMAIN, () => {
        const cert = socket.getPeerCertificate(true);
        socket.destroy();

        if (!cert || Object.keys(cert).length === 0) {
          reject(new Error('No certificate found'));
          return;
        }

        resolve({
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: new Date(cert.valid_from),
          validTo: new Date(cert.valid_to),
          daysUntilExpiry: Math.ceil((cert.valid_to - Date.now()) / (1000 * 60 * 60 * 24)),
          fingerprint: cert.fingerprint
        });
      });

      socket.on('error', reject);
      socket.setTimeout(MONITORING_CONFIG.timeout, () => {
        socket.destroy();
        reject(new Error('SSL check timeout'));
      });
    });

    const responseTime = performance.now() - startTime;

    return {
      ...certInfo,
      responseTime,
      status: certInfo.daysUntilExpiry > 0 ? 'valid' : 'expired'
    };

  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      responseTime: performance.now() - startTime
    };
  }
}

/**
 * Perform comprehensive health check
 */
async function performHealthCheck(environment = 'production') {
  const url = environment === 'production' ? PROD_URL : STAGING_URL;
  const results = {
    timestamp: new Date().toISOString(),
    environment,
    url,
    checks: {}
  };

  console.log(`🏥 Performing health check for ${environment} (${url})...`);

  try {
    // 1. Main page accessibility
    console.log('  📄 Checking main page...');
    const mainPageResponse = await makeRequest(url);
    results.checks.mainPage = {
      status: mainPageResponse.statusCode === 200 ? 'pass' : 'fail',
      statusCode: mainPageResponse.statusCode,
      responseTime: mainPageResponse.responseTime,
      contentLength: mainPageResponse.headers['content-length'],
      server: mainPageResponse.headers['server'],
      lastModified: mainPageResponse.headers['last-modified']
    };

    // 2. SSL certificate (HTTPS only)
    if (url.startsWith('https')) {
      console.log('  🔒 Checking SSL certificate...');
      const sslCheck = await checkSSLCertificate();
      results.checks.ssl = sslCheck;
    }

    // 3. Critical pages
    const criticalPages = [
      '/sitemap.xml',
      '/assets/search-index.json',
      '/robots.txt'
    ];

    results.checks.criticalPages = {};
    for (const page of criticalPages) {
      console.log(`  📄 Checking ${page}...`);
      try {
        const pageResponse = await makeRequest(url + page);
        results.checks.criticalPages[page] = {
          status: pageResponse.statusCode === 200 ? 'pass' : 'fail',
          statusCode: pageResponse.statusCode,
          responseTime: pageResponse.responseTime
        };
      } catch (error) {
        results.checks.criticalPages[page] = {
          status: 'fail',
          error: error.message
        };
      }
    }

    // 4. Content verification
    console.log('  🔍 Verifying content...');
    try {
      const homePageContent = await makeRequest(url);
      const contentChecks = {
        hasTitle: homePageContent.body.includes('<title>'),
        hasDescription: homePageContent.body.includes('name="description"'),
        hasAnalytics: homePageContent.body.includes('plausible.io'),
        hasMainContent: homePageContent.body.includes('PRP'),
        hasStyleSheet: homePageContent.body.includes('<link') || homePageContent.body.includes('<style')
      };

      results.checks.content = {
        status: Object.values(contentChecks).every(check => check) ? 'pass' : 'fail',
        details: contentChecks
      };
    } catch (error) {
      results.checks.content = {
        status: 'fail',
        error: error.message
      };
    }

    // 5. Performance check
    console.log('  ⚡ Checking performance...');
    const performanceCheck = await makeRequest(url);
    results.checks.performance = {
      responseTime: performanceCheck.responseTime,
      status: performanceCheck.responseTime < MONITORING_CONFIG.alerts.responseTimeThreshold ? 'pass' : 'warn',
      threshold: MONITORING_CONFIG.alerts.responseTimeThreshold
    };

    // 6. Overall status
    const failedChecks = Object.entries(results.checks)
      .filter(([key, check]) => key !== 'ssl' && check.status === 'fail')
      .length;

    const warningChecks = Object.entries(results.checks)
      .filter(([key, check]) => check.status === 'warn')
      .length;

    results.overall = {
      status: failedChecks === 0 ? (warningChecks === 0 ? 'pass' : 'warn') : 'fail',
      failedChecks,
      warningChecks,
      totalChecks: Object.keys(results.checks).length
    };

    console.log(`  ✅ Health check completed: ${results.overall.status.toUpperCase()}`);

  } catch (error) {
    results.overall = {
      status: 'fail',
      error: error.message
    };
    console.error(`  ❌ Health check failed: ${error.message}`);
  }

  return results;
}

/**
 * Generate monitoring report
 */
function generateMonitoringReport(healthCheckResults) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const report = {
    timestamp: healthCheckResults.timestamp,
    summary: {
      environment: healthCheckResults.environment,
      url: healthCheckResults.url,
      overall: healthCheckResults.overall
    },
    details: healthCheckResults.checks,
    recommendations: generateRecommendations(healthCheckResults)
  };

  return report;
}

/**
 * Generate recommendations based on health check results
 */
function generateRecommendations(results) {
  const recommendations = [];

  // SSL recommendations
  if (results.checks.ssl) {
    if (results.checks.ssl.status === 'expired') {
      recommendations.push({
        priority: 'critical',
        type: 'ssl',
        message: 'SSL certificate has expired. Renew immediately.',
        action: 'renew_ssl'
      });
    } else if (results.checks.ssl.daysUntilExpiry < MONITORING_CONFIG.alerts.sslDaysThreshold) {
      recommendations.push({
        priority: 'high',
        type: 'ssl',
        message: `SSL certificate expires in ${results.checks.ssl.daysUntilExpiry} days.`,
        action: 'renew_ssl_soon'
      });
    }
  }

  // Performance recommendations
  if (results.checks.performance && results.checks.performance.status === 'warn') {
    recommendations.push({
      priority: 'medium',
      type: 'performance',
      message: `Response time (${results.checks.performance.responseTime}ms) exceeds threshold (${MONITORING_CONFIG.alerts.responseTimeThreshold}ms).`,
      action: 'optimize_performance'
    });
  }

  // Content recommendations
  if (results.checks.content && results.checks.content.status === 'fail') {
    const missingItems = Object.entries(results.checks.content.details)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    recommendations.push({
      priority: 'high',
      type: 'content',
      message: `Missing content elements: ${missingItems.join(', ')}`,
      action: 'fix_content_issues'
    });
  }

  // Critical pages recommendations
  if (results.checks.criticalPages) {
    const failedPages = Object.entries(results.checks.criticalPages)
      .filter(([key, value]) => value.status === 'fail')
      .map(([key]) => key);

    if (failedPages.length > 0) {
      recommendations.push({
        priority: 'critical',
        type: 'availability',
        message: `Critical pages not accessible: ${failedPages.join(', ')}`,
        action: 'fix_critical_pages'
      });
    }
  }

  return recommendations;
}

/**
 * Save monitoring report
 */
async function saveMonitoringReport(report) {
  const reportsDir = path.join(__dirname, '../monitoring-reports');
  await fs.ensureDir(reportsDir);

  const filename = `deployment-report-${report.timestamp}.json`;
  const filepath = path.join(reportsDir, filename);

  await fs.writeJSON(filepath, report, { spaces: 2 });
  console.log(`📊 Monitoring report saved: ${filepath}`);

  // Also save latest report
  const latestPath = path.join(reportsDir, 'latest-report.json');
  await fs.writeJSON(latestPath, report, { spaces: 2 });

  return filepath;
}

/**
 * Send alert if needed
 */
async function sendAlert(report) {
  const criticalRecommendations = report.recommendations.filter(r => r.priority === 'critical');
  const highRecommendations = report.recommendations.filter(r => r.priority === 'high');

  if (criticalRecommendations.length > 0 || report.summary.overall.status === 'fail') {
    console.log('🚨 CRITICAL ALERT - Manual intervention required!');
    console.log('Issues found:');
    criticalRecommendations.forEach(rec => {
      console.log(`  - ${rec.message}`);
    });

    // Here you could integrate with notification systems
    // like Slack, email, Discord, etc.
  }

  if (highRecommendations.length > 0 || report.summary.overall.status === 'warn') {
    console.log('⚠️ WARNING - Attention needed soon!');
    console.log('Issues found:');
    highRecommendations.forEach(rec => {
      console.log(`  - ${rec.message}`);
    });
  }

  if (report.summary.overall.status === 'pass') {
    console.log('✅ All systems operational');
  }
}

/**
 * Monitor deployment status
 */
async function monitorDeployment(options = {}) {
  const environment = options.environment || 'production';
  const saveReport = options.saveReport !== false;
  const sendAlerts = options.sendAlerts !== false;

  console.log(`🚀 Starting deployment monitoring for ${environment}...`);

  try {
    // Perform health check
    const healthCheckResults = await performHealthCheck(environment);

    // Generate report
    const report = generateMonitoringReport(healthCheckResults);

    // Save report
    if (saveReport) {
      await saveMonitoringReport(report);
    }

    // Send alerts
    if (sendAlerts) {
      await sendAlert(report);
    }

    // Print summary
    console.log('\n📊 Monitoring Summary:');
    console.log(`  Environment: ${report.summary.environment}`);
    console.log(`  URL: ${report.summary.url}`);
    console.log(`  Status: ${report.summary.overall.status.toUpperCase()}`);
    console.log(`  Checks: ${report.summary.overall.totalChecks - report.summary.overall.failedChecks}/${report.summary.overall.totalChecks} passed`);

    if (report.recommendations.length > 0) {
      console.log(`  Recommendations: ${report.recommendations.length}`);
      report.recommendations.forEach(rec => {
        console.log(`    - [${rec.priority.toUpperCase()}] ${rec.message}`);
      });
    }

    return report;

  } catch (error) {
    console.error('❌ Monitoring failed:', error);
    throw error;
  }
}

/**
 * Continuous monitoring mode
 */
async function startContinuousMonitoring(intervalMinutes = 5) {
  console.log(`🔄 Starting continuous monitoring (interval: ${intervalMinutes} minutes)...`);

  const monitor = async () => {
    try {
      await monitorDeployment({
        environment: 'production',
        saveReport: true,
        sendAlerts: true
      });
    } catch (error) {
      console.error('❌ Continuous monitoring error:', error);
    }
  };

  // Run immediately
  await monitor();

  // Set up interval
  setInterval(monitor, intervalMinutes * 60 * 1000);
}

// CLI interface
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'health':
  case 'check':
    monitorDeployment({
      environment: args[1] || 'production'
    });
    break;

  case 'continuous':
  case 'monitor':
    const interval = parseInt(args[1]) || 5;
    startContinuousMonitoring(interval);
    break;

  case 'staging':
    monitorDeployment({
      environment: 'staging'
    });
    break;

  default:
    console.log(`
Usage: node monitor-deployment.js <command> [options]

Commands:
  health [environment]  - Perform one-time health check
  check [environment]   - Alias for health
  staging              - Check staging environment
  continuous [minutes] - Start continuous monitoring (default: 5 minutes)
  monitor [minutes]    - Alias for continuous

Examples:
  node monitor-deployment.js health production
  node monitor-deployment.js staging
  node monitor-deployment.js continuous 10
    `);
}

export {
  performHealthCheck,
  monitorDeployment,
  startContinuousMonitoring,
  generateMonitoringReport
};