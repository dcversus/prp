/* global window, document, fetch, console, setTimeout, clearTimeout */

import { useState, useEffect, useRef } from 'react';

// @ts-check

/**
 * @typedef {Object} PageData
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [content]
 * @property {string} [url]
 * @property {string} [path]
 */

const Search = () => {
  const [query, setQuery] = useState(/** @type {string} */ (''));
  const [results, setResults] = useState(/** @type {PageData[]} */ ([]));
  const [isLoading, setIsLoading] = useState(/** @type {boolean} */ (false));
  const [isOpen, setIsOpen] = useState(/** @type {boolean} */ (false));
  const searchRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const searchTimeoutRef = useRef(/** @type {NodeJS.Timeout | null} */ (null));

  useEffect(() => {
    /**
     * @param {MouseEvent} event
     */
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(/** @type {Node} */ (event.target))) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length > 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      setIsLoading(true);

      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
      setIsLoading(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  /**
   * @param {string} searchQuery
   */
  const performSearch = async (searchQuery) => {
    try {
      const response = await fetch('/assets/search-index.json');
      const searchIndex = /** @type {PageData[]} */ (await response.json());

      const filteredResults = searchIndex.filter(/** @type {(page: PageData) => boolean} */ (page) =>
        Boolean(page.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        Boolean(page.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        Boolean(page.content?.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      setResults(filteredResults.slice(0, 10)); // Limit to 10 results
      setIsOpen(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  /**
   * @param {string} url
   */
  const handleResultClick = (url) => {
    setIsOpen(false);
    setQuery('');
    window.location.href = url;
  };

  /**
   * @param {string} text
   * @param {string} searchQuery
   * @returns {React.ReactNode[] | string}
   */
  const highlightText = (text, searchQuery) => {
    if (!searchQuery) return text;

    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? <mark key={index} className="search-highlight">{part}</mark> : part
    );
  };

  return (
    <div className="search" ref={searchRef}>
      <div className="search-input-container">
        <input
          type="text"
          placeholder="Search documentation..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length > 2 && setIsOpen(true)}
          className="search-input"
        />
        <div className="search-icon">
          {isLoading ? (
            <div className="search-spinner">⟳</div>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="search-results">
          {isLoading ? (
            <div className="search-loading">
              <div className="search-spinner-small">⟳</div>
              <span>Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="search-results-list">
              {results.map((/** @type {PageData} */ result, /** @type {number} */ index) => (
                <button
                  key={index}
                  className="search-result-item"
                  onClick={() => handleResultClick(result.url || '#')}
                >
                  <div className="search-result-title">
                    {highlightText(result.title || '', query)}
                  </div>
                  <div className="search-result-path">{result.path}</div>
                  <div className="search-result-description">
                    {highlightText(result.description || (result.content && result.content.substring(0, 150)) || '', query)}
                  </div>
                </button>
              ))}
            </div>
          ) : query.length > 2 ? (
            <div className="search-no-results">
              <div className="search-no-results-icon">🔍</div>
              <div className="search-no-results-text">No results found for "{query}"</div>
              <div className="search-no-results-hint">Try different keywords or check spelling</div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default Search;