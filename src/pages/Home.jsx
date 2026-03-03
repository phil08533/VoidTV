import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Hero from '../components/Hero';
import MovieRow from '../components/MovieRow';
import AdBanner from '../components/AdBanner';
import Footer from '../components/Footer';
import './Home.css';

// All unique genres, ordered by interest
const GENRE_ORDER = [
  'Horror', 'Comedy', 'Drama', 'Sci-Fi', 'Action', 'Romance',
  'Adventure', 'Thriller', 'War', 'Western', 'Animation', 'Silent', 'Epic',
];

export default function Home() {
  const {
    movies,
    loading,
    error,
    recentMovies,
    favoriteMovies,
    getKidSafeMovies,
    getMoviesByGenre,
  } = useApp();

  const kidSafeMovies = useMemo(() => getKidSafeMovies(), [getKidSafeMovies]);

  // Build genre rows in priority order
  const genreRows = useMemo(() => {
    const seen = new Set();
    const rows = [];
    GENRE_ORDER.forEach((genre) => {
      const list = getMoviesByGenre(genre);
      if (list.length >= 2) {
        rows.push({ genre, movies: list });
        list.forEach((m) => seen.add(m.id));
      }
    });
    return rows;
  }, [getMoviesByGenre]);

  if (loading) {
    return (
      <div className="page page--loading page-enter" aria-label="Loading">
        <div className="home-loading">
          <div className="home-loading__hero skeleton"/>
          <div className="home-loading__rows">
            {[1, 2, 3].map((i) => (
              <div key={i} className="home-loading__row">
                <div className="home-loading__row-title skeleton"/>
                <div className="home-loading__cards">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="home-loading__card skeleton"/>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page page-enter">
        <div className="home-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h2>Could not load films</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="page page--home page-enter">
      {/* Hero */}
      <Hero movies={movies} />

      {/* Ad below hero */}
      <AdBanner
        slot={import.meta.env.VITE_ADSENSE_SLOT_HERO || 'XXXXXXXXXX'}
        format="leaderboard"
        label="Advertisement"
      />

      <div className="home__rows">
        {/* Recently Watched */}
        {recentMovies.length > 0 && (
          <MovieRow
            title="Continue Watching"
            movies={recentMovies}
            icon="▶"
          />
        )}

        {/* Favorites */}
        {favoriteMovies.length > 0 && (
          <MovieRow
            title="My Favorites"
            movies={favoriteMovies}
            icon="♥"
          />
        )}

        {/* Kids & Family */}
        {kidSafeMovies.length > 0 && (
          <MovieRow
            title="Kids & Family"
            movies={kidSafeMovies}
            icon="★"
          />
        )}

        {/* Genre rows */}
        {genreRows.map(({ genre, movies: genreMovies }) => (
          <MovieRow
            key={genre}
            title={`${genre} Films`}
            movies={genreMovies}
          />
        ))}

        {/* All films row */}
        <MovieRow
          title="All Public Domain Films"
          movies={movies}
        />
      </div>

      <Footer />
    </main>
  );
}
