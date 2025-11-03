import React, { useState, useEffect } from 'react';
import MDXContent from '../MDXContent.js';

const DocumentationLayout = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Get current page data from window
  const currentPage = window.CURRENT_PAGE || {};

  useEffect(() => {
    if (searchQuery.length > 2) {
      performSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const performSearch = async (query) => {
    setIsSearching(true);
    try {
      const response = await fetch('/assets/search-index.json');
      const searchIndex = await response.json();

      const results = searchIndex.filter(page =>
        page.title.toLowerCase().includes(query.toLowerCase()) ||
        page.description.toLowerCase().includes(query.toLowerCase()) ||
        page.content.toLowerCase().includes(query.toLowerCase())
      );

      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
    setIsSearching(false);
  };

  return (
    <div className="docs-layout">
      {/* Header with Search */}
      <header className="docs-header">
        <div className="docs-container">
          <div className="docs-header-content">
            <div className="docs-logo">
              <a href="/" className="logo-link">
                <span className="logo-music">♫</span>
                <span className="logo-text">PRP</span>
              </a>
            </div>

            <nav className="docs-nav">
              <a href="/" className="nav-link">Home</a>
              <a href="/docs/" className="nav-link active">Documentation</a>
              <a href="/guides/" className="nav-link">Guides</a>
              <a href="/examples/" className="nav-link">Examples</a>
              <a href="https://github.com/dcversus/prp" className="nav-link">GitHub</a>
            </nav>

            <div className="search-container">
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {isSearching && <div className="search-spinner">⟳</div>}
            </div>
          </div>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="search-results">
            <div className="docs-container">
              <div className="search-results-content">
                {searchResults.map((result, index) => (
                  <a key={index} href={result.url} className="search-result-item">
                    <div className="search-result-title">{result.title}</div>
                    <div className="search-result-url">{result.path}</div>
                    <div className="search-result-description">
                      {result.description || result.content.substring(0, 150)}...
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Breadcrumb */}
      {currentPage.breadcrumb && currentPage.breadcrumb.length > 1 && (
        <div className="breadcrumb">
          <div className="docs-container">
            <nav aria-label="Breadcrumb">
              <ol className="breadcrumb-list">
                {currentPage.breadcrumb.map((item, index) => (
                  <li key={index} className="breadcrumb-item">
                    {item.url ? (
                      <a href={item.url} className="breadcrumb-link">
                        {item.name}
                      </a>
                    ) : (
                      <span className="breadcrumb-current">
                        {item.name}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="docs-main">
        <div className="docs-container">
          <div className="docs-content-wrapper">
            {/* Sidebar Navigation */}
            <aside className="docs-sidebar">
              <nav className="sidebar-nav">
                <div className="sidebar-section">
                  <h3 className="sidebar-title">Getting Started</h3>
                  <ul className="sidebar-list">
                    <li><a href="/docs/" className="sidebar-link">Overview</a></li>
                    <li><a href="/docs/installation.html" className="sidebar-link">Installation</a></li>
                    <li><a href="/docs/quick-start.html" className="sidebar-link">Quick Start</a></li>
                  </ul>
                </div>

                <div className="sidebar-section">
                  <h3 className="sidebar-title">Core Concepts</h3>
                  <ul className="sidebar-list">
                    <li><a href="/docs/orchestration.html" className="sidebar-link">Orchestration</a></li>
                    <li><a href="/docs/agents.html" className="sidebar-link">Agents</a></li>
                    <li><a href="/docs/signals.html" className="sidebar-link">Signals</a></li>
                    <li><a href="/docs/prp-methodology.html" className="sidebar-link">PRP Methodology</a></li>
                  </ul>
                </div>

                <div className="sidebar-section">
                  <h3 className="sidebar-title">Guides</h3>
                  <ul className="sidebar-list">
                    <li><a href="/guides/" className="sidebar-link">All Guides</a></li>
                    <li><a href="/guides/first-project.html" className="sidebar-link">First Project</a></li>
                    <li><a href="/guides/custom-agents.html" className="sidebar-link">Custom Agents</a></li>
                    <li><a href="/guides/advanced-workflows.html" className="sidebar-link">Advanced Workflows</a></li>
                  </ul>
                </div>

                <div className="sidebar-section">
                  <h3 className="sidebar-title">Reference</h3>
                  <ul className="sidebar-list">
                    <li><a href="/docs/cli-reference.html" className="sidebar-link">CLI Reference</a></li>
                    <li><a href="/docs/configuration.html" className="sidebar-link">Configuration</a></li>
                    <li><a href="/docs/troubleshooting.html" className="sidebar-link">Troubleshooting</a></li>
                  </ul>
                </div>
              </nav>
            </aside>

            {/* Content Area */}
            <div className="docs-content">
              <article className="docs-article">
                <div id="mdx-content">
                  {/* MDX content will be rendered here */}
                  <MDXContent />
                </div>
              </article>

              {/* Page Footer */}
              <footer className="docs-page-footer">
                <div className="docs-footer-nav">
                  <div className="footer-nav-prev">
                    {/* Previous page link */}
                  </div>
                  <div className="footer-nav-next">
                    {/* Next page link */}
                  </div>
                </div>

                <div className="docs-contribute">
                  <p>
                    Found an issue?{' '}
                    <a
                      href={`https://github.com/dcversus/prp/edit/main/${currentPage.mdxPath || ''}`}
                      className="edit-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Edit this page on GitHub
                    </a>
                  </p>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="docs-footer">
        <div className="docs-container">
          <div className="docs-footer-content">
            <div className="footer-section">
              <h4>PRP</h4>
              <p>Musical Development Orchestration</p>
              <div className="footer-links">
                <a href="/">Home</a>
                <a href="/docs/">Documentation</a>
                <a href="https://github.com/dcversus/prp">GitHub</a>
              </div>
            </div>

            <div className="footer-section">
              <h4>Resources</h4>
              <div className="footer-links">
                <a href="/guides/">Guides</a>
                <a href="/examples/">Examples</a>
                <a href="/docs/cli-reference.html">CLI Reference</a>
              </div>
            </div>

            <div className="footer-section">
              <h4>Community</h4>
              <div className="footer-links">
                <a href="https://github.com/dcversus/prp/discussions">Discussions</a>
                <a href="https://github.com/dcversus/prp/issues">Issues</a>
                <a href="https://github.com/dcversus/prp/releases">Releases</a>
              </div>
            </div>

            <div className="footer-section">
              <h4>License</h4>
              <p>MIT License • Made with ♫ by dcversus</p>
            </div>
          </div>

          <div className="docs-footer-bottom">
            <p>&copy; 2025 PRP. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DocumentationLayout;