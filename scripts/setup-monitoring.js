#!/usr/bin/env node

/**
 * Monitoring and Analytics Setup Script
 *
 * This script configures monitoring and analytics for the PRP landing page.
 * It sets up performance monitoring, error tracking, and usage analytics.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAIN = 'prp.theedgestory.org';
const ANALYTICS_CONFIG = {
  plausible: {
    domain: DOMAIN,
    scriptUrl: 'https://plausible.io/js/script.js',
    enableOutboundLinks: 'true',
    enableTagEvents: 'true'
  },
  customEvents: {
    deployment: 'deployment_completed',
    pageView: 'page_view',
    ctaClick: 'cta_click',
    search: 'search_query',
    download: 'download_file'
  }
};

/**
 * Generate analytics tracking code
 */
function generateAnalyticsCode() {
  return `
<!-- Analytics & Monitoring -->
<script>
  // Performance monitoring
  if ('performance' in window && 'measure' in window.performance) {
    window.addEventListener('load', function() {
      setTimeout(function() {
        const perfData = performance.getEntriesByType('navigation')[0];
        const loadTime = perfData.loadEventEnd - perfData.loadEventStart;

        // Track page load performance
        if (window.gtag) {
          gtag('event', 'page_load_time', {
            custom_parameter: loadTime
          });
        }

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
      stack: e.error ? e.error.stack : undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    console.error('JavaScript Error:', errorData);

    // Send to analytics if available
    if (window.plausible) {
      plausible('js_error', { props: {
        error_message: e.message,
        error_url: e.filename
      }});
    }
  });

  // Custom event tracking
  window.trackEvent = function(eventName, properties = {}) {
    console.log('Event tracked:', eventName, properties);

    if (window.plausible) {
      plausible(eventName, { props: properties });
    }

    if (window.gtag) {
      gtag('event', eventName, properties);
    }
  };

  // Track CTA clicks
  document.addEventListener('click', function(e) {
    const target = e.target.closest('[data-track]');
    if (target) {
      const eventName = target.dataset.track;
      const properties = {
        element: target.tagName,
        text: target.textContent?.trim(),
        href: target.href
      };

      trackEvent(eventName, properties);
    }
  });

  // Track search queries
  function trackSearch(query) {
    trackEvent('search', {
      query: query,
      results_count: window.searchResults?.length || 0
    });
  }

  // Track page visibility changes
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      trackEvent('page_hidden');
    } else {
      trackEvent('page_visible');
    }
  });

  // Track external link clicks
  document.addEventListener('click', function(e) {
    const target = e.target.closest('a[href^="http"]:not([href*="${DOMAIN}"])');
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
<script defer data-domain="${DOMAIN}"
        src="${ANALYTICS_CONFIG.plausible.scriptUrl}"
        ${ANALYTICS_CONFIG.plausible.enableOutboundLinks ? 'data-outbound-links="true"' : ''}
        ${ANALYTICS_CONFIG.plausible.enableTagEvents ? 'data-tag-events="true"' : ''}>
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
}

/**
 * Generate health check endpoint code
 */
function generateHealthCheckCode() {
  return `
<!-- Health Check Support -->
<script>
  // Health check endpoint for monitoring
  window.prpHealthCheck = {
    version: '${process.env.npm_package_version || "0.4.9"}',
    buildTime: '${new Date().toISOString()}',
    domain: '${DOMAIN}',

    check: function() {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: this.version,
        buildTime: this.buildTime,
        domain: this.domain,
        performance: {
          loadTime: performance.now(),
          memoryUsage: performance.memory ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          } : null
        }
      };
    }
  };

  // Expose health check for monitoring tools
  window.addEventListener('load', function() {
    // Create health check endpoint
    const healthPath = '/health';
    if (window.location.pathname === healthPath) {
      document.body.innerHTML = '<pre>' + JSON.stringify(window.prpHealthCheck.check(), null, 2) + '</pre>';
    }
  });
</script>
  `;
}

/**
 * Generate service worker for offline support
 */
function generateServiceWorker() {
  return `
// Service Worker for PRP Landing Page
const CACHE_NAME = 'prp-landing-v${process.env.npm_package_version || "0.4.9"}';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/main.js',
  '/assets/styles.css',
  '/sitemap.xml',
  '/assets/search-index.json'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          function(response) {
            // Check if valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(function() {
          // Return offline page for navigation requests
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
  `;
}

/**
 * Update webpack configuration to include analytics
 */
async function updateWebpackConfig() {
  const webpackConfigPath = path.join(__dirname, '../webpack.config.js');

  try {
    let webpackConfig = await fs.readFile(webpackConfigPath, 'utf8');

    // Check if analytics plugin is already added
    if (webpackConfig.includes('analytics-plugin')) {
      console.log('✅ Analytics already configured in webpack');
      return;
    }

    console.log('📊 Adding analytics configuration to webpack...');

    // Add analytics to plugins
    const analyticsPlugin = `
// Analytics and Performance Monitoring
const AnalyticsPlugin = (compiler) => {
  compiler.hooks.emit.tapAsync('AnalyticsPlugin', (compilation, callback) => {
    // Add analytics code to HTML files
    Object.keys(compilation.assets).forEach(filename => {
      if (filename.endsWith('.html')) {
        const source = compilation.assets[filename].source();
        const analyticsCode = \`${generateAnalyticsCode().replace(/`/g, '\\`')}\`;
        const healthCheckCode = \`${generateHealthCheckCode().replace(/`/g, '\\`')}\`;

        // Inject analytics before </head> or </body>
        const modifiedSource = source
          .replace('</head>', analyticsCode + '</head>')
          .replace('</body>', healthCheckCode + '</body>');

        compilation.assets[filename] = {
          source: () => modifiedSource,
          size: () => modifiedSource.length
        };
      }
    });
    callback();
  });
};

`;

    // Insert the analytics plugin before the export statement
    webpackConfig = analyticsPlugin + webpackConfig;

    // Add the plugin to the plugins array
    webpackConfig = webpackConfig.replace(
      'plugins: [',
      'plugins: [\n    new AnalyticsPlugin(),'
    );

    await fs.writeFile(webpackConfigPath, webpackConfig);
    console.log('✅ Analytics configuration added to webpack');

  } catch (error) {
    console.error('❌ Failed to update webpack config:', error);
  }
}

/**
 * Create service worker file
 */
async function createServiceWorker() {
  const serviceWorkerPath = path.join(__dirname, '../build/sw.js');

  try {
    await fs.ensureDir(path.dirname(serviceWorkerPath));
    await fs.writeFile(serviceWorkerPath, generateServiceWorker());
    console.log('✅ Service worker created');
  } catch (error) {
    console.error('❌ Failed to create service worker:', error);
  }
}

/**
 * Generate robots.txt with monitoring directives
 */
async function generateRobotsTxt() {
  const robotsTxt = `
User-agent: *
Allow: /
Allow: /assets/
Allow: /docs/
Allow: /api/
Disallow: /health
Disallow: /admin/

# Analytics and monitoring bots
User-agent: *
Allow: /sitemap.xml

# Sitemap location
Sitemap: https://${DOMAIN}/sitemap.xml

# Crawl delay for good citizenship
Crawl-delay: 1

# Host directive
Host: https://${DOMAIN}
  `.trim();

  const robotsPath = path.join(__dirname, '../build/robots.txt');

  try {
    await fs.writeFile(robotsPath, robotsTxt);
    console.log('✅ robots.txt generated');
  } catch (error) {
    console.error('❌ Failed to generate robots.txt:', error);
  }
}

/**
 * Generate .well-known/security.txt for security monitoring
 */
async function generateSecurityTxt() {
  const securityTxt = `
# Security policy for ${DOMAIN}
Contact: mailto:security@theedgestory.org
Contact: https://github.com/dcversus/prp/security
Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}Z
Canonical: https://${DOMAIN}/.well-known/security.txt
Policy: https://${DOMAIN}/security
Preferred-Languages: en
  `.trim();

  const securityPath = path.join(__dirname, '../build/.well-known/security.txt');

  try {
    await fs.ensureDir(path.dirname(securityPath));
    await fs.writeFile(securityPath, securityTxt);
    console.log('✅ security.txt generated');
  } catch (error) {
    console.error('❌ Failed to generate security.txt:', error);
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Setting up monitoring and analytics for PRP landing page...');

  try {
    await updateWebpackConfig();
    await createServiceWorker();
    await generateRobotsTxt();
    await generateSecurityTxt();

    console.log('✅ Monitoring and analytics setup completed!');
    console.log('');
    console.log('Features configured:');
    console.log('  📊 Plausible Analytics integration');
    console.log('  ⚡ Core Web Vitals tracking');
    console.log('  🏥 Health check endpoints');
    console.log('  🔄 Service Worker for offline support');
    console.log('  🛡️ Security.txt for responsible disclosure');
    console.log('  🤖 Enhanced robots.txt');
    console.log('  📈 Error tracking and performance monitoring');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  generateAnalyticsCode,
  generateHealthCheckCode,
  generateServiceWorker,
  updateWebpackConfig,
  createServiceWorker,
  generateRobotsTxt,
  generateSecurityTxt
};