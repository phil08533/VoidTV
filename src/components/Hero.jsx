import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Hero.css';

// Rotate the featured movie every 12 seconds
const ROTATE_MS = 12000;

export default function Hero({ movies }) {
  const { toggleFavorite, isFavorite } = useApp();
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  // Pick top-rated/curated films as hero candidates (first 6)
  const candidates = movies.slice(0, 6);
  const movie = candidates[idx] ?? null;

  useEffect(() => {
    if (candidates.length < 2) return;
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIdx((i) => (i + 1) % candidates.length);
        setFading(false);
      }, 400);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [candidates.length]);

  if (!movie) return null;

  const fav = isFavorite(movie.id);

  return (
    <section className={`hero${fading ? ' hero--fading' : ''}`} aria-label={`Featured: ${movie.title}`}>
      {/* Background image */}
      <div className="hero__bg" role="presentation">
        <img
          src={movie.thumbnail}
          alt=""
          className="hero__bg-img"
          loading="eager"
        />
        <div className="hero__bg-gradient"/>
        <div className="hero__bg-bottom"/>
      </div>

      {/* Content */}
      <div className="hero__content">
        <div className="hero__meta">
          <span className="badge badge--accent">Public Domain</span>
          {!movie.kids_safe && (
            <span className="badge badge--warning">Mature</span>
          )}
          {movie.kids_safe && (
            <span className="badge badge--kids">Family Friendly</span>
          )}
        </div>

        <h1 className="hero__title">{movie.title}</h1>

        <div className="hero__info">
          <span className="hero__year">{movie.year}</span>
          <span className="hero__dot" aria-hidden="true">·</span>
          <span className="hero__duration">{Math.floor(movie.duration / 60)}h {movie.duration % 60}m</span>
          <span className="hero__dot" aria-hidden="true">·</span>
          <span className="hero__director">Dir. {movie.director}</span>
        </div>

        <div className="hero__genres">
          {movie.genre.slice(0, 3).map((g) => (
            <span key={g} className="hero__genre-tag">{g}</span>
          ))}
        </div>

        <p className="hero__description">{movie.description}</p>

        <div className="hero__actions">
          <button
            className="btn-primary hero__play-btn"
            onClick={() => navigate(`/movie/${movie.id}`)}
            aria-label={`Watch ${movie.title}`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
            Watch Now
          </button>

          <button
            className={`btn-secondary hero__fav-btn${fav ? ' hero__fav-btn--active' : ''}`}
            onClick={() => toggleFavorite(movie.id)}
            aria-label={fav ? `Remove ${movie.title} from favorites` : `Add ${movie.title} to favorites`}
            aria-pressed={fav}
          >
            <svg viewBox="0 0 24 24" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {fav ? 'Saved' : 'Save'}
          </button>

          <button
            className="btn-ghost hero__info-btn"
            onClick={() => navigate(`/movie/${movie.id}`)}
            aria-label={`More info about ${movie.title}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            More Info
          </button>
        </div>
      </div>

      {/* Pagination dots */}
      {candidates.length > 1 && (
        <div className="hero__dots" role="tablist" aria-label="Featured movies">
          {candidates.map((m, i) => (
            <button
              key={m.id}
              className={`hero__dot-btn${i === idx ? ' hero__dot-btn--active' : ''}`}
              onClick={() => { setFading(true); setTimeout(() => { setIdx(i); setFading(false); }, 400); }}
              aria-label={`Featured: ${m.title}`}
              aria-selected={i === idx}
              role="tab"
            />
          ))}
        </div>
      )}
    </section>
  );
}
