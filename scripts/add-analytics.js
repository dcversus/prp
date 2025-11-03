#!/usr/bin/env node

/**
 * Add Analytics to Built HTML Files
 *
 * This script adds analytics and monitoring code to all HTML files in the build directory.
 * It's called after the webpack build completes.
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const analyticsCode = `
<!-- Analytics & Monitoring -->
<script>
  // Performance monitoring
  if ('performance' in window && 'measure' in window.performance) {
    window.addEventListener('load', function() {
      setTimeout(function() {
        const perfData = performance.getEntriesByType('navigation')[0];
        const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
        console.log('Page load time:', loadTime + 'ms');
      }, 0);
    });
  }

  // Error tracking
  window.addEventListener('error', function(e) {
    const errorData = {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
    console.error('JavaScript Error:', errorData);
  });

  // Custom event tracking
  window.trackEvent = function(eventName, properties = {}) {
    console.log('Event tracked:', eventName, properties);
  };

  // Track external link clicks
  document.addEventListener('click', function(e) {
    const target = e.target.closest('a[href^="http"]:not([href*="prp.theedgestory.org"])');
    if (target) {
      trackEvent('external_link', {
        url: target.href,
        text: target.textContent?.trim()
      });
    }
  });

  console.log('📊 Analytics and monitoring initialized');
</script>

<!-- Plausible Analytics -->
<script defer data-domain="prp.theedgestory.org"
        src="https://plausible.io/js/script.js"
        data-outbound-links="true"
        data-tag-events="true">
</script>

<!-- Performance Observer API -->
<script>
if ('PerformanceObserver' in window) {
  // Track Core Web Vitals
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      switch (entry.entryType) {
        case 'largest-contentful-paint':
          trackEvent('lcp', { value: Math.round(entry.startTime) });
          break;
        case 'first-input':
          trackEvent('fid', { value: Math.round(entry.processingStart - entry.startTime) });
          break;
        case 'layout-shift':
          if (!entry.hadRecentInput) {
            trackEvent('cls', { value: Math.round(entry.value * 1000) / 1000 });
          }
          break;
      }
    }
  });

  observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
}
</script>
`;

/**
 * Add analytics to HTML files
 */
async function addAnalyticsToHTMLFiles() {
  const buildDir = path.join(__dirname, '../build');

  try {
    const htmlFiles = await glob('**/*.html', { cwd: buildDir });

    console.log(`📊 Adding analytics to ${htmlFiles.length} HTML files...`);

    for (const file of htmlFiles) {
      const filePath = path.join(buildDir, file);
      let content = await fs.readFile(filePath, 'utf8');

      // Add analytics before closing head tag
      if (content.includes('</head>')) {
        content = content.replace('</head>', analyticsCode + '</head>');
      } else {
        // If no head tag, add at the beginning
        content = analyticsCode + content;
      }

      await fs.writeFile(filePath, content);
    }

    console.log('✅ Analytics added to all HTML files');

  } catch (error) {
    console.error('❌ Failed to add analytics:', error);
    throw error;
  }
}

/**
 * Generate additional monitoring files
 */
async function generateMonitoringFiles() {
  const buildDir = path.join(__dirname, '../build');

  try {
    // Generate robots.txt
    const robotsTxt = `User-agent: *
Allow: /
Allow: /assets/
Allow: /docs/
Allow: /api/
Disallow: /health
Disallow: /admin/

# Sitemap location
Sitemap: https://prp.theedgestory.org/sitemap.xml

# Crawl delay for good citizenship
Crawl-delay: 1

# Host directive
Host: https://prp.theedgestory.org
`;

    await fs.writeFile(path.join(buildDir, 'robots.txt'), robotsTxt);
    console.log('✅ robots.txt generated');

    // Generate .well-known/security.txt
    const securityTxt = `# Security policy for prp.theedgestory.org
Contact: mailto:security@theedgestory.org
Contact: https://github.com/dcversus/prp/security
Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}Z
Canonical: https://prp.theedgestory.org/.well-known/security.txt
Policy: https://prp.theedgestory.org/security
Preferred-Languages: en
`;

    const securityDir = path.join(buildDir, '.well-known');
    await fs.ensureDir(securityDir);
    await fs.writeFile(path.join(securityDir, 'security.txt'), securityTxt);
    console.log('✅ security.txt generated');

    // Generate health check endpoint
    const healthPage = `<!DOCTYPE html>
<html>
<head>
    <title>PRP Landing Page - Health Check</title>
</head>
<body>
    <pre id="health"></pre>
    <script>
        const healthData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '${process.env.npm_package_version || '0.4.9'}',
            buildTime: '${new Date().toISOString()}',
            domain: 'prp.theedgestory.org',
            performance: {
                loadTime: performance.now(),
                memoryUsage: performance.memory ? {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                } : null
            }
        };

        document.getElementById('health').textContent = JSON.stringify(healthData, null, 2);
    </script>
</body>
</html>
`;

    await fs.writeFile(path.join(buildDir, 'health'), healthPage);
    console.log('✅ Health check endpoint generated');

  } catch (error) {
    console.error('❌ Failed to generate monitoring files:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await addAnalyticsToHTMLFiles();
    await generateMonitoringFiles();
    console.log('🎉 Analytics and monitoring setup completed!');
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { addAnalyticsToHTMLFiles, generateMonitoringFiles };