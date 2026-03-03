import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './SearchOverlay.css';

export default function SearchOverlay() {
  const { isSearchOpen, setIsSearchOpen, searchMovies, movies } = useApp();
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const inputRef  = useRef(null);
  const navigate  = useNavigate();

  // Auto-focus input when opened
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
      setQuery('');
      setResults([]);
    }
  }, [isSearchOpen]);

  // Live search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const id = setTimeout(() => setResults(searchMovies(query)), 160);
    return () => clearTimeout(id);
  }, [query, searchMovies]);

  const handleSelect = useCallback((movieId) => {
    setIsSearchOpen(false);
    navigate(`/movie/${movieId}`);
  }, [setIsSearchOpen, navigate]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearchOpen(false);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }, [query, setIsSearchOpen, navigate]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setIsSearchOpen(false);
  }, [setIsSearchOpen]);

  if (!isSearchOpen) return null;

  return (
    <div
      className="search-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) setIsSearchOpen(false); }}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div className="search-modal scale-in">
        {/* Input */}
        <form className="search-modal__form" onSubmit={handleSubmit} role="search">
          <svg
            className="search-modal__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="search"
            className="search-modal__input"
            placeholder="Search by title, director, genre, year…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck="false"
            aria-label="Search movies"
            aria-controls="search-results"
          />
          {query && (
            <button
              type="button"
              className="search-modal__clear"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              aria-label="Clear search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="16" height="16">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
          <kbd className="search-modal__esc">Esc</kbd>
        </form>

        {/* Results */}
        <div
          id="search-results"
          className="search-modal__results"
          role="listbox"
          aria-label="Search results"
        >
          {!query.trim() && (
            <div className="search-modal__hint">
              <p>Search {movies.length} public domain films</p>
              <p className="search-modal__hint-sub">Press <kbd>/</kbd> or <kbd>Ctrl+K</kbd> to open search</p>
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div className="search-modal__no-results">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <p>No films found for "<strong>{query}</strong>"</p>
              <p className="search-modal__hint-sub">Try a title, director name, or year</p>
            </div>
          )}

          {results.slice(0, 8).map((movie) => (
            <button
              key={movie.id}
              className="search-result"
              onClick={() => handleSelect(movie.id)}
              role="option"
              aria-label={`${movie.title}, ${movie.year}`}
            >
              <div className="search-result__thumb">
                <img src={movie.thumbnail} alt="" loading="lazy" decoding="async"/>
              </div>
              <div className="search-result__info">
                <span className="search-result__title">{movie.title}</span>
                <span className="search-result__meta">
                  {movie.year} · {movie.genre.slice(0, 2).join(', ')}
                  {movie.director && ` · ${movie.director}`}
                </span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="search-result__arrow" aria-hidden="true">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
            </button>
          ))}

          {results.length > 8 && (
            <button
              className="search-modal__see-all"
              onClick={handleSubmit}
            >
              See all {results.length} results for "{query}"
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
