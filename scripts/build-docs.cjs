#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const { execSync } = require('child_process');

/**
 * Documentation Build Script
 *
 * This script:
 * 1. Processes markdown files and converts them to HTML
 * 2. Copies existing index.html to build directory
 * 3. Generates search index
 * 4. Creates sitemap
 * 5. Optimizes assets
 */

const BUILD_DIR = path.resolve(__dirname, '../build');
const DOCS_DIR = path.resolve(__dirname, '../docs');
const ASSETS_DIR = path.resolve(__dirname, '../build/assets');

async function cleanBuildDir() {
  console.log('🧹 Cleaning build directory...');
  await fs.emptyDir(BUILD_DIR);
  console.log('✅ Build directory cleaned');
}

async function copyLandingPage() {
  console.log('📄 Copying landing page...');

  // Copy main index.html
  const indexSource = path.resolve(__dirname, '../index.html');
  const indexDest = path.join(BUILD_DIR, 'index.html');

  if (await fs.pathExists(indexSource)) {
    await fs.copy(indexSource, indexDest);
    console.log('✅ Landing page copied');
  } else {
    console.warn('⚠️  Warning: index.html not found');
  }

  // Copy CNAME if exists
  const cnameSource = path.resolve(__dirname, '../CNAME');
  if (await fs.pathExists(cnameSource)) {
    await fs.copy(cnameSource, path.join(BUILD_DIR, 'CNAME'));
    console.log('✅ CNAME copied');
  }

  // Copy images and assets
  const imagesDirs = ['images', 'assets', 'public'];
  for (const dir of imagesDirs) {
    const sourceDir = path.resolve(__dirname, '..', dir);
    if (await fs.pathExists(sourceDir)) {
      await fs.copy(sourceDir, path.join(BUILD_DIR, dir));
      console.log(`✅ ${dir} directory copied`);
    }
  }
}

async function processMarkdownFiles() {
  console.log('📝 Processing markdown files...');

  const markdownFiles = glob.sync('**/*.md', { cwd: DOCS_DIR });

  for (const file of markdownFiles) {
    const sourcePath = path.join(DOCS_DIR, file);
    const outputPath = path.join(BUILD_DIR, file.replace(/\.md$/, '.html'));

    // Create directory structure
    await fs.ensureDir(path.dirname(outputPath));

    // Read markdown content
    const content = await fs.readFile(sourcePath, 'utf8');

    // Simple markdown to HTML conversion
    const htmlContent = await convertMarkdownToHTML(content, file);

    // Generate HTML page
    const htmlPage = generateHTMLPage({
      title: extractTitle(content, file),
      content: htmlContent,
      breadcrumb: generateBreadcrumb(file),
      filePath: file
    });

    await fs.writeFile(outputPath, htmlPage);
    console.log(`✅ Processed: ${file} → ${file.replace(/\.md$/, '.html')}`);
  }
}

async function convertMarkdownToHTML(markdown, filePath) {
  // Simple markdown to HTML conversion
  let html = markdown
    // Headers
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Lists
    .replace(/^\* (.+)$/gim, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gim, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap in paragraphs
  if (!html.startsWith('<')) {
    html = '<p>' + html + '</p>';
  }

  // Fix list wrapping
  html = html.replace(/<p><li>/g, '<ul><li>').replace(/<\/li><\/p>/g, '</li></ul>');

  return html;
}

function extractTitle(content, filePath) {
  const titleMatch = content.match(/^# (.+)$/m);
  if (titleMatch) {
    return titleMatch[1];
  }

  // Fallback to filename
  const filename = path.basename(filePath, '.md');
  return filename
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function generateBreadcrumb(filePath) {
  const parts = filePath.split('/');
  const breadcrumb = [
    { name: 'Home', url: '/' },
    { name: 'Documentation', url: '/docs/' }
  ];

  if (parts.length > 1) {
    let urlPath = '/docs/';
    for (let i = 0; i < parts.length - 1; i++) {
      urlPath += parts[i] + '/';
      const name = parts[i]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      breadcrumb.push({ name, url: urlPath });
    }
  }

  // Current page
  const currentPage = parts[parts.length - 1].replace('.md', '');
  const name = currentPage
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  breadcrumb.push({ name, url: null, active: true });

  return breadcrumb;
}

function generateHTMLPage({ title, content, breadcrumb, filePath }) {
  const breadcrumbHtml = breadcrumb
    .map((item, index) => {
      if (item.url) {
        return `<li class="breadcrumb-item">
          <a href="${item.url}" class="breadcrumb-link">${item.name}</a>
        </li>`;
      } else {
        return `<li class="breadcrumb-item">
          <span class="breadcrumb-current">${item.name}</span>
        </li>`;
      }
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - PRP Documentation</title>
    <meta name="description" content="${title} documentation for PRP - Musical Development Orchestration">
    <meta name="keywords" content="PRP, documentation, ${title}, musical development, AI agents, orchestration">
    <meta name="author" content="dcversus">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://prp.theedgestory.org/${filePath.replace(/\.md$/, '.html')}">
    <meta property="og:title" content="${title} - PRP Documentation">
    <meta property="og:description" content="${title} documentation for PRP - Musical Development Orchestration">
    <meta property="og:image" content="https://prp.theedgestory.org/og-image.png">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="https://prp.theedgestory.org/${filePath.replace(/\.md$/, '.html')}">
    <meta property="twitter:title" content="${title} - PRP Documentation">
    <meta property="twitter:description" content="${title} documentation for PRP - Musical Development Orchestration">
    <meta property="twitter:image" content="https://prp.theedgestory.org/og-image.png">

    <!-- Canonical URL -->
    <link rel="canonical" href="https://prp.theedgestory.org/${filePath.replace(/\.md$/, '.html')}">

    <!-- Styles -->
    <style>
        /* Copy styles from the main documentation template */
        /* Base styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary-color: #FF8C00;
            --primary-hover: #FFA500;
            --text-dark: #1a1a1a;
            --text-light: #666;
            --text-lighter: #999;
            --bg-light: #f8f9fa;
            --bg-white: #ffffff;
            --bg-dark: #2d3748;
            --border-color: #e9ecef;
            --border-light: #dee2e6;
            --sidebar-width: 280px;
            --header-height: 70px;
            --container-max-width: 1200px;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: var(--text-dark);
            background-color: var(--bg-white);
        }

        .container {
            max-width: var(--container-max-width);
            margin: 0 auto;
            padding: 0 20px;
            width: 100%;
        }

        /* Header */
        .header {
            background: var(--bg-white);
            border-bottom: 1px solid var(--border-color);
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .header-content {
            height: var(--header-height);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .logo a {
            display: flex;
            align-items: center;
            text-decoration: none;
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--text-dark);
        }

        .logo-music {
            color: var(--primary-color);
            margin-right: 8px;
        }

        .logo-text {
            color: var(--text-dark);
        }

        .nav {
            display: flex;
            align-items: center;
            gap: 2rem;
        }

        .nav-link {
            text-decoration: none;
            color: var(--text-dark);
            font-weight: 500;
            transition: color 0.2s;
            padding: 0.5rem 0;
        }

        .nav-link:hover,
        .nav-link.active {
            color: var(--primary-color);
        }

        /* Breadcrumb */
        .breadcrumb {
            background: var(--bg-light);
            border-bottom: 1px solid var(--border-color);
            padding: 0.75rem 0;
        }

        .breadcrumb-list {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            list-style: none;
        }

        .breadcrumb-item:not(:last-child)::after {
            content: '/';
            margin-left: 0.5rem;
            color: var(--text-lighter);
        }

        .breadcrumb-link {
            color: var(--text-light);
            text-decoration: none;
            transition: color 0.2s;
        }

        .breadcrumb-link:hover {
            color: var(--primary-color);
        }

        .breadcrumb-current {
            color: var(--text-dark);
            font-weight: 500;
        }

        /* Main Content */
        .main {
            padding: 2rem 0;
            min-height: calc(100vh - var(--header-height) - 100px);
        }

        .content-wrapper {
            display: flex;
            gap: 3rem;
        }

        .sidebar {
            width: var(--sidebar-width);
            flex-shrink: 0;
            position: sticky;
            top: calc(var(--header-height) + 1rem);
            height: fit-content;
            max-height: calc(100vh - var(--header-height) - 2rem);
            overflow-y: auto;
        }

        .sidebar-section {
            margin-bottom: 2rem;
        }

        .sidebar-title {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-light);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.75rem;
        }

        .sidebar-list {
            list-style: none;
        }

        .sidebar-list li {
            margin-bottom: 0.25rem;
        }

        .sidebar-link {
            display: block;
            padding: 0.375rem 0.75rem;
            color: var(--text-dark);
            text-decoration: none;
            border-radius: 4px;
            transition: all 0.2s;
            font-size: 0.875rem;
        }

        .sidebar-link:hover {
            background-color: var(--bg-light);
            color: var(--primary-color);
            transform: translateX(2px);
        }

        .sidebar-link.active {
            background-color: var(--primary-color);
            color: white;
        }

        .content {
            flex: 1;
            min-width: 0;
            max-width: 800px;
        }

        .article {
            margin-bottom: 3rem;
        }

        /* Typography */
        .article h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: var(--text-dark);
            line-height: 1.2;
        }

        .article h2 {
            font-size: 1.875rem;
            font-weight: 600;
            margin: 2.5rem 0 1rem;
            color: var(--text-dark);
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 0.5rem;
        }

        .article h3 {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 2rem 0 1rem;
            color: var(--text-dark);
        }

        .article h4 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 1.5rem 0 0.75rem;
            color: var(--text-dark);
        }

        .article p {
            margin-bottom: 1rem;
            color: var(--text-dark);
            line-height: 1.7;
        }

        .article ul,
        .article ol {
            margin-bottom: 1rem;
            padding-left: 2rem;
        }

        .article li {
            margin-bottom: 0.5rem;
            color: var(--text-dark);
        }

        /* Code Blocks */
        .article code {
            background: var(--bg-light);
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 0.875em;
            color: var(--primary-color);
        }

        .article pre {
            background: var(--bg-dark);
            color: #e2e8f0;
            padding: 1.5rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1.5rem 0;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 0.875rem;
            line-height: 1.5;
        }

        .article pre code {
            background: none;
            padding: 0;
            color: inherit;
            font-size: inherit;
        }

        /* Blockquotes */
        .article blockquote {
            border-left: 4px solid var(--primary-color);
            padding-left: 1.5rem;
            margin: 1.5rem 0;
            font-style: italic;
            color: var(--text-light);
        }

        /* Tables */
        .article table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.5rem 0;
            font-size: 0.875rem;
        }

        .article th,
        .article td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }

        .article th {
            background: var(--bg-light);
            font-weight: 600;
            color: var(--text-dark);
        }

        .article tr:hover {
            background: var(--bg-light);
        }

        /* Links */
        .article a {
            color: var(--primary-color);
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-color 0.2s;
        }

        .article a:hover {
            border-bottom-color: var(--primary-color);
        }

        /* Footer */
        .footer {
            background: var(--bg-dark);
            color: white;
            padding: 2rem 0 1rem;
            margin-top: 3rem;
            text-align: center;
        }

        .footer-content {
            margin-bottom: 1rem;
        }

        .footer-links {
            display: flex;
            justify-content: center;
            gap: 2rem;
            margin-bottom: 1rem;
        }

        .footer-links a {
            color: rgba(255, 255, 255, 0.8);
            text-decoration: none;
            transition: color 0.2s;
        }

        .footer-links a:hover {
            color: var(--primary-color);
        }

        .footer-bottom {
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 1rem;
            color: rgba(255, 255, 255, 0.6);
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
            .content-wrapper {
                flex-direction: column;
            }

            .sidebar {
                width: 100%;
                position: static;
                max-height: none;
                margin-bottom: 2rem;
            }
        }

        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                height: auto;
                padding: 1rem 0;
                gap: 1rem;
            }

            .nav {
                flex-wrap: wrap;
                justify-content: center;
                gap: 1rem;
            }

            .article h1 {
                font-size: 2rem;
            }

            .article h2 {
                font-size: 1.5rem;
            }

            .footer-links {
                flex-direction: column;
                gap: 1rem;
            }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">
                    <a href="/">
                        <span class="logo-music">♫</span>
                        <span class="logo-text">PRP</span>
                    </a>
                </div>

                <nav class="nav">
                    <a href="/" class="nav-link">Home</a>
                    <a href="/docs/" class="nav-link active">Documentation</a>
                    <a href="/guides/" class="nav-link">Guides</a>
                    <a href="/examples/" class="nav-link">Examples</a>
                    <a href="https://github.com/dcversus/prp" class="nav-link">GitHub</a>
                </nav>
            </div>
        </div>
    </header>

    <!-- Breadcrumb -->
    <div class="breadcrumb">
        <div class="container">
            <nav aria-label="Breadcrumb">
                <ol class="breadcrumb-list">
                    ${breadcrumbHtml}
                </ol>
            </nav>
        </div>
    </div>

    <!-- Main Content -->
    <main class="main">
        <div class="container">
            <div class="content-wrapper">
                <!-- Sidebar Navigation -->
                <aside class="sidebar">
                    <nav class="sidebar-nav">
                        <div class="sidebar-section">
                            <h3 class="sidebar-title">Getting Started</h3>
                            <ul class="sidebar-list">
                                <li><a href="/docs/" class="sidebar-link">Overview</a></li>
                                <li><a href="/docs/installation.html" class="sidebar-link">Installation</a></li>
                                <li><a href="/docs/quick-start.html" class="sidebar-link">Quick Start</a></li>
                            </ul>
                        </div>

                        <div class="sidebar-section">
                            <h3 class="sidebar-title">Core Concepts</h3>
                            <ul class="sidebar-list">
                                <li><a href="/docs/orchestration.html" class="sidebar-link">Orchestration</a></li>
                                <li><a href="/docs/agents.html" class="sidebar-link">Agents</a></li>
                                <li><a href="/docs/signals.html" class="sidebar-link">Signals</a></li>
                                <li><a href="/docs/prp-methodology.html" class="sidebar-link">PRP Methodology</a></li>
                            </ul>
                        </div>

                        <div class="sidebar-section">
                            <h3 class="sidebar-title">Guides</h3>
                            <ul class="sidebar-list">
                                <li><a href="/guides/" class="sidebar-link">All Guides</a></li>
                                <li><a href="/guides/first-project.html" class="sidebar-link">First Project</a></li>
                                <li><a href="/guides/custom-agents.html" class="sidebar-link">Custom Agents</a></li>
                                <li><a href="/guides/advanced-workflows.html" class="sidebar-link">Advanced Workflows</a></li>
                            </ul>
                        </div>

                        <div class="sidebar-section">
                            <h3 class="sidebar-title">Reference</h3>
                            <ul class="sidebar-list">
                                <li><a href="/docs/cli-reference.html" class="sidebar-link">CLI Reference</a></li>
                                <li><a href="/docs/configuration.html" class="sidebar-link">Configuration</a></li>
                                <li><a href="/docs/troubleshooting.html" class="sidebar-link">Troubleshooting</a></li>
                            </ul>
                        </div>
                    </nav>
                </aside>

                <!-- Content Area -->
                <div class="content">
                    <article class="article">
                        ${content}

                        <!-- Page Footer -->
                        <footer class="page-footer">
                            <div class="contribute">
                                <p>
                                    Found an issue?{' '}
                                    <a
                                        href="https://github.com/dcversus/prp/edit/main/docs/${filePath}"
                                        class="edit-link"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Edit this page on GitHub
                                    </a>
                                </p>
                            </div>
                        </footer>
                    </article>
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-links">
                    <a href="/">Home</a>
                    <a href="/docs/">Documentation</a>
                    <a href="https://github.com/dcversus/prp">GitHub</a>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2025 PRP. All rights reserved. • Made with ♫ by dcversus</p>
            </div>
        </div>
    </footer>
</body>
</html>`;
}

async function generateSearchIndex() {
  console.log('🔍 Generating search index...');

  const searchIndex = [];
  const htmlFiles = glob.sync('**/*.html', { cwd: BUILD_DIR });

  for (const file of htmlFiles) {
    const filePath = path.join(BUILD_DIR, file);
    const content = await fs.readFile(filePath, 'utf8');

    // Extract title and description
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/);
    const title = titleMatch?.[1] || h1Match?.[1] || 'Untitled';

    // Extract meta description
    const descMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/);
    const description = descMatch?.[1] || '';

    // Strip HTML tags for content indexing
    const textContent = content
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000);

    searchIndex.push({
      title,
      description,
      content: textContent,
      url: '/' + file,
      path: file
    });
  }

  // Write search index
  await fs.ensureDir(ASSETS_DIR);
  await fs.writeJSON(path.join(ASSETS_DIR, 'search-index.json'), searchIndex, { spaces: 2 });

  console.log(`✅ Generated search index with ${searchIndex.length} pages`);
}

async function generateSitemap() {
  console.log('🗺️  Generating sitemap...');

  const htmlFiles = glob.sync('**/*.html', { cwd: BUILD_DIR });
  const baseUrl = 'https://prp.theedgestory.org';

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${htmlFiles.map(file => {
  const filePath = path.join(BUILD_DIR, file);
  const stats = fs.statSync(filePath);
  const lastMod = stats.mtime.toISOString().split('T')[0];
  const priority = file === 'index.html' ? '1.0' : file.includes('/docs/') ? '0.8' : '0.6';

  return `  <url>
    <loc>${baseUrl}/${file}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
}).join('\n')}
</urlset>`;

  await fs.writeFile(path.join(BUILD_DIR, 'sitemap.xml'), sitemap);
  console.log('✅ Sitemap generated');
}

async function buildDocumentation() {
  try {
    console.log('🚀 Starting documentation build...\n');

    await cleanBuildDir();
    await copyLandingPage();
    await processMarkdownFiles();
    await generateSearchIndex();
    await generateSitemap();

    console.log('\n🎉 Documentation build completed successfully!');
    console.log(`📁 Build directory: ${BUILD_DIR}`);
    console.log(`📊 Total pages: ${glob.sync('**/*.html', { cwd: BUILD_DIR }).length}`);

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run the build
if (require.main === module) {
  buildDocumentation();
}

module.exports = { buildDocumentation };