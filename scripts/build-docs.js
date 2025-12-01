#!/usr/bin/env node

/**
 * Universal Documentation Build Script
 *
 * Features:
 * - Build documentation from /docs to /build
 * - Watch mode with live reload
 * - Development server with Browsersync
 * - Production-ready static generation
 */

// -- Need to update build-docs.js to process new documentation structure and implement Wiki.js integration [no] - robo-developer
/**
 * - Multiple serving modes
 */

import { watch } from 'chokidar';
import { marked } from 'marked';
import hljs from 'highlight.js';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
  rmSync,
  statSync,
} from 'fs';
import { glob } from 'glob';
import browserSyncPkg from 'browser-sync';
import { createServer } from 'http';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
  buildDir: join(__dirname, '../build'),
  docsDir: join(__dirname, '../docs'),
  scriptsDir: __dirname,
  defaultPort: 3001,
  staticPort: 3002,
  watchPatterns: ['../docs/**/*.md', '../scripts/build-docs-simple.js', '../docs/index.html'],
  reloadDelay: 500,
};

// Colors for terminal output
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Color helpers
function colorError(message) {
  console.error(`${COLORS.red}❌ ${message}${COLORS.reset}`);
}

function colorSuccess(message) {
  console.log(`${COLORS.green}✅ ${message}${COLORS.reset}`);
}


function colorCyan(message) {
  console.log(`${COLORS.cyan}${message}${COLORS.reset}`);
}

// MIME types for static server
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    watch: false,
    serve: false,
    port: CONFIG.defaultPort,
    static: false,
    help: false,
    dev: false,
    prod: false,
    production: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--watch':
      case '-w':
        options.watch = true;
        break;
      case '--serve':
      case '-s':
        options.serve = true;
        break;
      case '--port':
      case '-p':
        const port = parseInt(args[++i], 10);
        if (isNaN(port) || port < 1024 || port > 65535) {
          colorError('Invalid port number. Use between 1024-65535.');
          process.exit(1);
        }
        options.port = port;
        break;
      case '--static':
        options.static = true;
        options.serve = true;
        options.port = CONFIG.staticPort;
        break;
      case '--dev':
      case '--development':
        options.dev = true;
        options.watch = true;
        options.serve = true;
        break;
      case '--prod':
      case '--production':
        options.prod = true;
        options.production = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (arg.startsWith('-')) {
          colorError(`Unknown option: ${arg}`);
          options.help = true;
        }
    }
  }

  return options;
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
${COLORS.cyan}Universal Documentation Build Script${COLORS.reset}

${COLORS.yellow}Usage:${COLORS.reset}
  node scripts/build-docs.js [options]

${COLORS.yellow}Options:${COLORS.reset}
  ${COLORS.cyan}-w, --watch${COLORS.reset}         Watch files and rebuild on changes
  ${COLORS.cyan}-s, --serve${COLORS.reset}         Serve documentation after building
  ${COLORS.cyan}-p, --port <port>${COLORS.reset}    Specify port for development server (default: 3001)
  ${COLORS.cyan}--static${COLORS.reset}             Use static file server instead of Browsersync
  ${COLORS.cyan}--dev${COLORS.reset}               Development mode (watch + serve + live reload)
  ${COLORS.cyan}--prod${COLORS.reset}              Production mode (optimized build)
  ${COLORS.cyan}-h, --help${COLORS.reset}           Show this help message

${COLORS.yellow}Examples:${COLORS.reset}
  node scripts/build-docs.js                    # Build documentation once (production)
  node scripts/build-docs.js --dev              # Development mode with watch and live reload
  node scripts/build-docs.js --prod             # Production build (optimized)
  node scripts/build-docs.js --serve            # Build and serve with live reload
  node scripts/build-docs.js --watch --serve    # Watch, build, and serve with live reload
  node scripts/build-docs.js --static           # Build and serve static files (port 3002)
  node scripts/build-docs.js --port 8080        # Build and serve on custom port

${COLORS.yellow}Package.json Scripts:${COLORS.reset}
  npm run build:docs          # Build documentation once
  npm run dev:docs            # Development mode (--dev)
  npm run serve:docs          # Static server mode (--static)
`);
}

/**
 * Get MIME type for file
 */
function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'text/plain';
}

/**
 * Serve file for static server
 */
function serveFile(res, filePath) {
  try {
    const content = readFileSync(filePath);
    const mimeType = getMimeType(filePath);

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(content);
  } catch {
    serveError(res, 500, 'Internal Server Error');
  }
}

/**
 * Serve error page
 */
function serveError(res, statusCode, message) {
  res.writeHead(statusCode, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Error ${statusCode}</title>
        <style>
          body { font-family: system-ui, sans-serif; margin: 2rem; }
          h1 { color: #e53e3e; }
        </style>
      </head>
      <body>
        <h1>Error ${statusCode}</h1>
        <p>${message}</p>
      </body>
    </html>
  `);
}

/**
 * Resolve file path for static server
 */
function resolveFilePath(urlPath) {
  // Remove query string and hash
  const cleanPath = urlPath.split('?')[0].split('#')[0];

  // Default to index.html for root
  if (cleanPath === '/' || cleanPath === '') {
    return join(CONFIG.buildDir, 'index.html');
  }

  // Prevent directory traversal
  const safePath = cleanPath.replace(/\.\./g, '').replace(/\/+/g, '/');
  const filePath = join(CONFIG.buildDir, safePath);

  // If it's a directory, try to serve index.html
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    return join(filePath, 'index.html');
  }

  return filePath;
}

/**
 * Create static file server
 */
function createStaticServer(_port) {
  const server = createServer((req, res) => {
    const filePath = resolveFilePath(req.url);

    // Check if file exists
    if (!existsSync(filePath)) {
      // Try to serve as HTML (for SPA routing)
      const htmlPath = filePath + '.html';
      if (existsSync(htmlPath)) {
        return serveFile(res, htmlPath);
      }

      // Try to serve index.html (for SPA routing)
      const indexPath = join(CONFIG.buildDir, 'index.html');
      if (existsSync(indexPath)) {
        return serveFile(res, indexPath);
      }

      return serveError(res, 404, 'File Not Found');
    }

    serveFile(res, filePath);
  });

  return server;
}

/**
 * Start static development server
 */
function startStaticServer(port) {
  colorCyan('🚀 Starting static documentation server...');

  const server = createStaticServer(port);

  server.listen(port, () => {
    console.log('\n' + '='.repeat(60));
    console.log(`${COLORS.cyan}📚 Static Documentation Server${COLORS.reset}`);
    console.log('='.repeat(60));
    console.log(`🌐 Server running at ${COLORS.green}http://localhost:${port}${COLORS.reset}`);
    console.log(`📁 Serving files from: ${CONFIG.buildDir}`);
    console.log('\n💡 Note: This is a static server.');
    console.log('   Use --watch for live reload functionality.');
    console.log('\n📝 Commands:');
    console.log('  • Press Ctrl+C to stop the server');
    console.log('='.repeat(60));
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
      console.log('✅ Server stopped');
      process.exit(0);
    });
  });

  // Handle errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      colorError(`Port ${port} is already in use`);
      console.log(`   Try a different port or kill the process using port ${port}`);
    } else {
      colorError(`Server error: ${error.message}`);
    }
    process.exit(1);
  });
}

/**
 * Start development server with Browsersync
 */
async function startDevServer(port) {
  colorCyan('🚀 Starting documentation development server with live reload...');

  // Initialize Browsersync
  const bs = browserSyncPkg.create();

  // Build function with reload
  async function buildAndReload() {
    console.log('🔄 Rebuilding documentation...');
    try {
      await buildDocs();
      colorSuccess('Documentation rebuilt');
      setTimeout(() => {
        bs.reload();
        console.log('🔄 Browser reloaded');
      }, CONFIG.reloadDelay);
    } catch (error) {
      colorError(`Build failed: ${error.message}`);
    }
  }

  // Initial build
  console.log('📦 Building documentation...');
  await buildDocs();

  // Initialize Browsersync
  bs.init({
    server: {
      baseDir: CONFIG.buildDir,
      serveStaticOptions: {
        extensions: ['html'],
      },
    },
    port: port,
    open: true,
    notify: {
      styles: {
        top: 'auto',
        bottom: '0',
        right: '20px',
        left: 'auto',
        backgroundColor: '#4CAF50',
        color: 'white',
        fontSize: '14px',
        padding: '10px 20px',
        borderRadius: '0 0 0 4px',
      },
    },
    callbacks: {
      ready: function (_err, _bs) {
        console.log('\n' + '='.repeat(60));
        console.log(`${COLORS.cyan}🌐 Development Server with Live Reload${COLORS.reset}`);
        console.log('='.repeat(60));
        console.log(`🌐 Server running at ${COLORS.green}http://localhost:${port}${COLORS.reset}`);
        console.log(`📁 Serving files from: ${CONFIG.buildDir}`);
        console.log('\n📝 Commands:');
        console.log('  • Edit files in /docs to trigger rebuild');
        console.log('  • Press Ctrl+C to stop the server');
        console.log('='.repeat(60));
      },
    },
  });

  // Setup file watchers
  const watchers = CONFIG.watchPatterns.map((pattern) => {
    const watcher = watch(pattern, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    watcher.on('change', (path) => {
      console.log(`📝 File changed: ${path}`);
      buildAndReload();
    });

    watcher.on('add', (path) => {
      console.log(`➕ File added: ${path}`);
      buildAndReload();
    });

    watcher.on('unlink', (path) => {
      console.log(`➖ File removed: ${path}`);
      buildAndReload();
    });

    return watcher;
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development server...');
    watchers.forEach((watcher) => watcher.close());
    bs.exit();
    process.exit(0);
  });

  console.log('👀 Watching patterns:');
  CONFIG.watchPatterns.forEach((pattern) => console.log(`  • ${pattern}`));
}

/**
 * Build documentation in watch mode
 */
async function buildWithWatch() {
  colorCyan('👀 Starting documentation build watch mode...');

  // Initial build
  console.log('📦 Building documentation...');
  await buildDocs();

  // Setup file watchers
  const watchers = CONFIG.watchPatterns.map((pattern) => {
    const watcher = watch(pattern, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    watcher.on('change', (path) => {
      console.log(`📝 File changed: ${path}`);
      rebuildDocs();
    });

    watcher.on('add', (path) => {
      console.log(`➕ File added: ${path}`);
      rebuildDocs();
    });

    watcher.on('unlink', (path) => {
      console.log(`➖ File removed: ${path}`);
      rebuildDocs();
    });

    return watcher;
  });

  // Debounced rebuild function
  let rebuildTimeout;
  async function rebuildDocs() {
    if (rebuildTimeout) {
      clearTimeout(rebuildTimeout);
    }

    rebuildTimeout = setTimeout(async () => {
      try {
        console.log('🔄 Rebuilding documentation...');
        await buildDocs();
        colorSuccess('Documentation rebuilt successfully');
      } catch (error) {
        colorError(`Rebuild failed: ${error.message}`);
      }
    }, 300);
  }

  console.log('\n👀 Watching for changes...');
  console.log('📝 Commands:');
  console.log('  • Edit files in /docs to trigger rebuild');
  console.log('  • Press Ctrl+C to stop watching');

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping file watchers...');
    watchers.forEach((watcher) => watcher.close());
    process.exit(0);
  });
}

// Configure marked for GitHub Flavored Markdown
marked.setOptions({
  highlight: function (code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
  gfm: true,
  breaks: true,
  linkify: true,
  typographer: true,
});

/**
 * Generate compact documentation navigation with file names
 */
function generateDocsNav(currentFilePath = '') {
  const docsFiles = [
    { name: 'Quick Start', file: 'QUICK_START' },
    { name: 'Configuration', file: 'configuration' },
    { name: 'CLI Wizard', file: 'CLI_WIZARD' },
    { name: 'Signal Flow', file: 'SIGNAL_FLOW' },
    { name: 'Signal Reference', file: 'SIGNAL_REFERENCE' },
    { name: 'PRP Template', file: 'PRP_TEMPLATE' },
    { name: 'CLI Commands', file: 'CLI_COMMANDS' },
    { name: 'DevOps Guide', file: 'DEVOPS_GUIDE' },
    { name: 'Troubleshooting', file: 'TROUBLESHOOTING' },
    { name: 'FAQ', file: 'FAQ' },
  ];

  let navHtml = `
    <div class="compact-nav">
      <div class="nav-items">`;

  docsFiles.forEach((doc) => {
    const href = `/docs/${doc.file.toLowerCase().replace(/_/g, '-')}.html`;
    const isActive =
      currentFilePath && currentFilePath.includes(doc.file.toLowerCase().replace(/_/g, '-'));
    navHtml += `
              <a href="${href}" class="nav-item ${isActive ? 'active' : ''}">
                <span class="nav-text"># ${doc.file}</span>
              </a>`;
  });

  navHtml += `
          </div>
      </div>
    </div>`;

  return navHtml;
}

/**
 * Extract metadata from markdown frontmatter
 */
function extractFrontMatter(content) {
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontMatterMatch) return { metadata: {}, content };

  try {
    const frontMatter = frontMatterMatch[1];
    const markdownContent = frontMatterMatch[2];
    const metadata = {};

    frontMatter.split('\n').forEach((line) => {
      const [key, ...values] = line.split(': ');
      if (key && values.length > 0) {
        metadata[key] = values.join(': ').trim();
      }
    });

    return { metadata, content: markdownContent };
  } catch {
    return { metadata: {}, content };
  }
}

/**
 * Process a single markdown file to HTML with custom template
 */
function processMarkdownWithTemplate(filePath, outputPath, _template) {
  const sourcePath = filePath;

  if (!existsSync(sourcePath)) {
    console.warn(`⚠️  File not found: ${sourcePath}`);
    return;
  }

  const content = readFileSync(sourcePath, 'utf8');
  const { metadata, content: markdownContent } = extractFrontMatter(content);

  // Load the actual docs/index.html template
  const templatePath = join(__dirname, '../docs/index.html');
  let docsTemplate;

  if (existsSync(templatePath)) {
    docsTemplate = readFileSync(templatePath, 'utf8');
  } else {
    console.warn('⚠️  docs/index.html template not found, using fallback');
    return;
  }

  // Render markdown to HTML
  const html = marked(markdownContent);

  // Extract title and description
  const title = metadata.title || markdownContent.match(/^#\s+(.+)$/m)?.[1] || 'Documentation';

  const description =
    metadata.description ||
    markdownContent
      .substring(0, 150)
      .replace(/[#*\[*]/g, '')
      .trim();

  // Update template header to include Documentation link and GitHub with icon
  const updatedNav = `
            <a href="/" class="logo">
                ♫ PRP
            </a>
            <ul class="nav-links">
                <li><a href="/">Home</a></li>
                <li><a href="/docs/" class="active">Documentation</a></li>
                <li><a href="/agents">Agents</a></li>
                <li><a href="https://github.com/dcversus/prp" style="display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                    GitHub
                </a></li>
            </ul>`;

  // Create docs-specific main content
  const currentFilePath = outputPath.replace(/^docs\//, '').replace(/\.html$/, '');

  // Create separate navigation and content sections
  const docsNav = `
        <div class="docs-compact-nav">
            <div class="compact-nav">
                ${generateDocsNav(currentFilePath)}
            </div>
        </div>`;

  const docsMain = `
        <div class="docs-layout">
            <div class="docs-content">
                <div class="markdown-body">
                    ${html}
                </div>
            </div>
        </div>`;

  // Replace header navigation
  let finalHtml = docsTemplate.replace(
    /<nav class="container">[\s\S]*?<\/nav>/,
    `<nav class="container">${updatedNav}</nav>`
  );

  // Insert docs navigation after </header> and before <main>
  finalHtml = finalHtml.replace(/<\/header>\s*<main>/, `</header>\n${docsNav}\n<main>`);

  // Replace main content
  finalHtml = finalHtml.replace(/<main>[\s\S]*?<\/main>/, `<main>${docsMain}</main>`);

  // Update title
  finalHtml = finalHtml.replace(
    /<title>.*?<\/title>/,
    `<title>${title} - PRP Documentation</title>`
  );

  // Update meta description
  finalHtml = finalHtml.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${description}">`
  );

  // Add docs-specific styles
  const docsStyles = `
        /* Compact Docs Navigation - 160px height */
        .docs-compact-nav {
            height: 160px;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            border-bottom: 1px solid var(--border-color);
            background: var(--bg-white);
        }

        /* Docs Layout Container */
        .docs-layout {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }

        .compact-nav {
            height: 100%;
            display: flex;
            align-items: center;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }

        .nav-items {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            align-items: center;
        }

        .nav-item {
            display: inline-flex;
            align-items: center;
            padding: 0.5rem 1rem;
            text-decoration: none;
            color: var(--text-light);
            font-weight: 500;
            font-size: 0.9rem;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            transition: color 0.2s;
            border-radius: 6px;
        }

        .nav-item:hover {
            color: var(--primary-color);
        }

        .nav-item.active {
            color: var(--primary-color);
            background: rgba(255, 140, 0, 0.1);
            font-weight: 600;
        }

        .nav-text {
            color: inherit;
        }

        /* Content Area - 820px max-width */
        .docs-content {
            max-width: 820px;
            margin: 0 auto;
            padding: 0 20px;
            margin-top: 2rem;
        }

        .markdown-body {
            background: transparent;
            padding: 0;
            border: none;
            border-radius: 0;
            box-shadow: none;
            color: var(--text-dark);
            line-height: 1.6;
        }

        .docs-content {
            background: transparent;
        }

        /* GitHub-style markdown */
        .markdown-body h1,
        .markdown-body h2,
        .markdown-body h3,
        .markdown-body h4,
        .markdown-body h5,
        .markdown-body h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
        }

        .markdown-body h1 {
            font-size: 2em;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 0.3em;
            margin-bottom: 16px;
        }

        .markdown-body h2 {
            font-size: 1.5em;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 0.3em;
            margin-top: 2.5em;
        }

        .markdown-body h3 {
            font-size: 1.25em;
        }

        .markdown-body p {
            margin-bottom: 16px;
        }

        .markdown-body ul,
        .markdown-body ol {
            margin-bottom: 16px;
            padding-left: 2em;
        }

        .markdown-body li {
            margin-bottom: 0.25em;
        }

        .markdown-body li > p {
            margin-bottom: 0;
        }

        .markdown-body blockquote {
            padding: 0 1em;
            color: var(--text-light);
            border-left: 0.25em solid var(--border-color);
            margin: 0 0 16px 0;
        }

        .markdown-body pre {
            padding: 16px;
            overflow: auto;
            font-size: 85%;
            line-height: 1.45;
            background-color: var(--bg-light);
            border-radius: 6px;
            margin-bottom: 16px;
        }

        .markdown-body code {
            padding: 0.2em 0.4em;
            margin: 0;
            font-size: 85%;
            background-color: rgba(27, 31, 35, 0.05);
            border-radius: 6px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        }

        .markdown-body pre code {
            padding: 0;
            background: transparent;
            font-size: inherit;
        }

        .markdown-body table {
            border-spacing: 0;
            border-collapse: collapse;
            margin-bottom: 16px;
        }

        .markdown-body table th,
        .markdown-body table td {
            padding: 6px 13px;
            border: 1px solid var(--border-color);
        }

        .markdown-body table th {
            font-weight: 600;
            background-color: var(--bg-light);
        }

        .markdown-body img {
            max-width: 100%;
            box-sizing: content-box;
        }

        .markdown-body hr {
            height: 0.25em;
            padding: 0;
            margin: 24px 0;
            background-color: var(--border-color);
            border: 0;
        }

        /* Active nav styling */
        .nav-links a.active {
            color: var(--primary-color) !important;
            border-bottom: 2px solid var(--primary-color);
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
            .docs-compact-nav {
                height: auto;
                padding: 1rem 15px;
            }

            .nav-items {
                justify-content: center;
            }

            .nav-item {
                font-size: 0.8rem;
                padding: 0.4rem 0.8rem;
            }

            .docs-content {
                padding: 0 15px;
            }
        }`;

  // Add styles to head
  finalHtml = finalHtml.replace('</style>', `}\n\n${docsStyles}\n</style>`);

  // Add markdown styles if not present
  if (!finalHtml.includes('github-markdown-css')) {
    const markdownStyles = `
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.2.0/github-markdown.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css">`;
    finalHtml = finalHtml.replace('</head>', `${markdownStyles}\n</head>`);
  }

  // Write HTML file
  const outputFile = join(__dirname, '../build', outputPath);
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, finalHtml);

  console.log(`✅ Generated: ${outputPath}`);
}

/**
 * Copy all files from source to destination preserving structure
 */
function copyDirectory(src, dest) {
  const sourceDir = join(__dirname, src);
  const destDir = join(__dirname, dest);

  if (!existsSync(sourceDir)) {
    console.warn(`⚠️  Source directory not found: ${sourceDir}`);
    return;
  }

  // Create destination directory
  mkdirSync(destDir, { recursive: true });

  // Copy all files recursively
  const files = glob.sync(`${sourceDir}/**/*`, { nodir: true });

  files.forEach((file) => {
    const relativePath = file.replace(sourceDir, '');
    const destFile = join(destDir, relativePath);

    mkdirSync(dirname(destFile), { recursive: true });
    copyFileSync(file, destFile);
  });

  console.log(`📁 Copied directory: ${src} → ${dest} (${files.length} files)`);
}

/**
 * Convert docs/README.md to build/docs/index.html
 */
function convertReadmeToIndex() {
  const readmePath = join(__dirname, '../docs/README.md');

  if (!existsSync(readmePath)) {
    console.warn('⚠️  docs/README.md not found, skipping index.html conversion');
    return;
  }

  // Use the same processing as other docs pages for consistency
  processMarkdownWithTemplate(readmePath, 'docs/index.html');
}

/**
 * Generate CNAME file
 */
function generateCNAME() {
  const cnamePath = join(__dirname, '../build/CNAME');
  const cnameContent = 'prp.theedgestory.org';

  writeFileSync(cnamePath, cnameContent);
  console.log(`✅ Generated: CNAME with content "${cnameContent}"`);
}

/**
 * Copy original index.html to build root for GitHub Pages
 */
function copyIndexToRoot() {
  const sourceIndex = join(__dirname, '../docs/index.html');
  const targetIndex = join(__dirname, '../build/index.html');

  if (existsSync(sourceIndex)) {
    copyFileSync(sourceIndex, targetIndex);
    console.log(`✅ Copied original index.html to build root for GitHub Pages`);
  } else {
    console.warn(`⚠️  docs/index.html not found, skipping root copy`);
  }
}

/**
 * Build all documentation
 */
async function buildDocs() {
  console.log('📚 Building Documentation...');

  // Clean build directory
  const buildDir = join(__dirname, '../build');

  if (existsSync(buildDir)) {
    // Remove all files except .gitkeep
    const files = glob.sync(`${buildDir}/**/*`, { nodir: true });
    files.forEach((file) => {
      if (file !== `${buildDir}/.gitkeep`) {
        rmSync(file);
      }
    });
  } else {
    mkdirSync(buildDir, { recursive: true });
  }

  // 1. Copy all files from docs/ to build/docs/ preserving structure
  console.log('\n📁 Copying docs directory structure...');
  copyDirectory('../docs', '../build/docs');

  // 2. Convert README.md to index.html
  console.log('\n🔄 Converting docs/README.md to index.html...');
  convertReadmeToIndex();

  // 3. Generate CNAME file
  console.log('\n🌐 Generating CNAME file...');
  generateCNAME();

  // 4. Copy index.html to build root for GitHub Pages
  console.log('\n📄 Copying index.html to build root...');
  copyIndexToRoot();

  // 5. Process all markdown files to HTML (except README.md which is already processed)
  console.log('\n📝 Processing markdown files...');
  const markdownFiles = glob
    .sync(join(__dirname, '../docs/**/*.md'))
    .filter((file) => !file.endsWith('README.md'));

  if (markdownFiles.length === 0) {
    console.log('ℹ️  No additional markdown files found (excluding README.md)');
  } else {
    // Process all markdown files using docs/index.html template for consistency
    markdownFiles.forEach((filePath) => {
      const relativePath = filePath
        .replace(join(__dirname, '../docs/'), '')
        .replace('.md', '.html');
      processMarkdownWithTemplate(filePath, `docs/${relativePath}`, null);
    });
  }

  console.log(`\n✅ Documentation complete!`);
  console.log(`   📁 Copied docs structure to build/docs/`);
  console.log(`   📄 Converted docs/README.md to build/docs/index.html`);
  console.log(`   🌐 Generated CNAME file for prp.theedgestory.org`);
  console.log(`   📄 Copied index.html to build root for GitHub Pages`);
  console.log(`   📝 Processed ${markdownFiles.length} additional markdown files`);
  console.log(`   📂 Output directory: ${buildDir}`);
}

/**
 * Main build function
 */
async function build() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log(`${COLORS.cyan}📚 Universal Documentation Build Script${COLORS.reset}`);
  console.log('='.repeat(60));

  // Show build mode
  if (options.dev) {
    console.log(`${COLORS.yellow}🔧 Development Mode${COLORS.reset}`);
  } else if (options.prod) {
    console.log(`${COLORS.green}🚀 Production Mode${COLORS.reset}`);
  } else {
    console.log(`${COLORS.blue}📦 Standard Build Mode${COLORS.reset}`);
  }

  try {
    if (options.dev) {
      // Development mode: watch + serve + live reload
      await startDevServer(options.port);
    } else if (options.serve) {
      if (options.static) {
        // Static build + serve
        console.log('📦 Building documentation for static serving...');
        await buildDocs();
        startStaticServer(options.port);
      } else if (options.watch) {
        // Watch + build + serve with live reload
        await startDevServer(options.port);
      } else {
        // Build + serve without watch
        console.log('📦 Building documentation...');
        await buildDocs();
        startStaticServer(options.port);
      }
    } else if (options.watch) {
      // Watch mode only
      await buildWithWatch();
    } else {
      // Build once (production or standard)
      if (options.prod) {
        console.log('📦 Building production documentation...');
        // Add production optimizations here if needed in the future
        await buildDocs();
        colorSuccess('Production documentation built successfully!');
      } else {
        console.log('📦 Building documentation...');
        await buildDocs();
        colorSuccess('Documentation built successfully!');
      }
      console.log(`📂 Output directory: ${CONFIG.buildDir}`);
    }
  } catch (error) {
    colorError(`Documentation build failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  build();
}

export { buildDocs, startStaticServer, startDevServer };
