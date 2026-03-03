import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import MovieCard from '../components/MovieCard';
import Footer from '../components/Footer';
import './SearchPage.css';

const GENRES = [
  'All', 'Horror', 'Comedy', 'Drama', 'Sci-Fi', 'Action',
  'Romance', 'Adventure', 'Thriller', 'War', 'Western', 'Animation', 'Silent',
];

export default function SearchPage() {
  const { movies, searchMovies } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue]     = useState(searchParams.get('q') ?? '');
  const [activeGenre, setActiveGenre]   = useState('All');
  const [sortBy, setSortBy]             = useState('relevance');

  // Sync input with URL param on mount / back navigation
  useEffect(() => {
    setInputValue(searchParams.get('q') ?? '');
  }, [searchParams]);

  const query = searchParams.get('q') ?? '';

  const rawResults = useMemo(() => {
    if (query.trim()) return searchMovies(query);
    return movies;
  }, [query, searchMovies, movies]);

  // Genre filter
  const genreFiltered = useMemo(() => {
    if (activeGenre === 'All') return rawResults;
    return rawResults.filter((m) => m.genre.includes(activeGenre));
  }, [rawResults, activeGenre]);

  // Sort
  const sorted = useMemo(() => {
    const list = [...genreFiltered];
    if (sortBy === 'year-asc')  return list.sort((a, b) => a.year - b.year);
    if (sortBy === 'year-desc') return list.sort((a, b) => b.year - a.year);
    if (sortBy === 'title')     return list.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === 'duration')  return list.sort((a, b) => a.duration - b.duration);
    return list; // relevance = default order
  }, [genreFiltered, sortBy]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setSearchParams({ q: inputValue.trim() });
    } else {
      setSearchParams({});
    }
    setActiveGenre('All');
  };

  const clearSearch = () => {
    setInputValue('');
    setSearchParams({});
    setActiveGenre('All');
  };

  return (
    <main className="page page-enter search-page">
      <div className="search-page__header">
        <h1 className="search-page__heading">
          {query ? (
            <>Results for <span className="text-accent">"{query}"</span></>
          ) : (
            'Browse All Films'
          )}
        </h1>
        <p className="search-page__subtitle">
          {sorted.length} film{sorted.length !== 1 ? 's' : ''} in our public domain catalog
        </p>

        {/* Search form */}
        <form className="search-page__form" onSubmit={handleSearch} role="search">
          <div className="search-page__input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" className="search-page__input-icon" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="search"
              className="search-page__input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search title, director, year, genre…"
              aria-label="Search films"
            />
            {inputValue && (
              <button type="button" className="search-page__clear" onClick={clearSearch} aria-label="Clear">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="14" height="14">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          <button type="submit" className="btn-primary search-page__submit">Search</button>
        </form>
      </div>

      {/* Filters */}
      <div className="search-page__filters">
        <div className="search-page__genres" role="group" aria-label="Filter by genre">
          {GENRES.map((g) => (
            <button
              key={g}
              className={`search-page__genre-btn${activeGenre === g ? ' search-page__genre-btn--active' : ''}`}
              onClick={() => setActiveGenre(g)}
              aria-pressed={activeGenre === g}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="search-page__sort">
          <label htmlFor="sort-select" className="search-page__sort-label">Sort by</label>
          <select
            id="sort-select"
            className="search-page__sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort results"
          >
            <option value="relevance">Relevance</option>
            <option value="title">Title A–Z</option>
            <option value="year-desc">Newest First</option>
            <option value="year-asc">Oldest First</option>
            <option value="duration">Shortest First</option>
          </select>
        </div>
      </div>

      {/* Results grid */}
      {sorted.length === 0 ? (
        <div className="search-page__empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <h2>No films found</h2>
          {query && <p>No results for "{query}"{activeGenre !== 'All' ? ` in ${activeGenre}` : ''}.</p>}
          <button className="btn-secondary" onClick={clearSearch}>Clear filters</button>
        </div>
      ) : (
        <div className="search-page__grid" role="list" aria-label="Search results">
          {sorted.map((movie) => (
            <div key={movie.id} role="listitem">
              <MovieCard movie={movie} size="md" />
            </div>
          ))}
        </div>
      )}

      <Footer />
    </main>
  );
}
