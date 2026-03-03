import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './MovieCard.css';

// Lazy-load images with IntersectionObserver
function LazyImage({ src, alt, className }) {
  const [loaded, setLoaded]   = useState(false);
  const [errored, setErrored] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  const attachObserver = useCallback((node) => {
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observerRef.current?.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observerRef.current.observe(node);
    imgRef.current = node;
  }, []);

  return (
    <div className={`lazy-img-wrapper ${className ?? ''}`} ref={attachObserver}>
      {!loaded && !errored && (
        <div className="lazy-img-placeholder skeleton" aria-hidden="true"/>
      )}
      {errored && (
        <div className="lazy-img-error" aria-label="Image unavailable">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
        </div>
      )}
      {visible && (
        <img
          src={src}
          alt={alt}
          className={`lazy-img${loaded ? ' lazy-img--loaded' : ''}`}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
}

export default function MovieCard({ movie, size = 'md' }) {
  const { toggleFavorite, isFavorite, setIsSearchOpen } = useApp();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const fav = isFavorite(movie.id);

  const handleClick = useCallback(() => {
    navigate(`/movie/${movie.id}`);
  }, [navigate, movie.id]);

  const handleFavClick = useCallback((e) => {
    e.stopPropagation();
    toggleFavorite(movie.id);
  }, [toggleFavorite, movie.id]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <article
      className={`movie-card movie-card--${size}${hovered ? ' movie-card--hovered' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${movie.title} (${movie.year}) — ${movie.genre.join(', ')}`}
    >
      {/* Thumbnail */}
      <div className="movie-card__thumb">
        <LazyImage
          src={movie.thumbnail}
          alt={`${movie.title} poster`}
        />

        {/* Hover overlay */}
        <div className="movie-card__overlay" aria-hidden="true">
          <div className="movie-card__play-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          </div>
        </div>

        {/* Badges */}
        <div className="movie-card__badges">
          {movie.kids_safe && (
            <span className="badge badge--kids" title="Family Friendly">K</span>
          )}
        </div>

        {/* Favorite button */}
        <button
          className={`movie-card__fav${fav ? ' movie-card__fav--active' : ''}`}
          onClick={handleFavClick}
          aria-label={fav ? `Remove ${movie.title} from favorites` : `Add ${movie.title} to favorites`}
          aria-pressed={fav}
          tabIndex={-1}
        >
          <svg viewBox="0 0 24 24" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" width="14" height="14">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="movie-card__info">
        <h3 className="movie-card__title" title={movie.title}>{movie.title}</h3>
        <div className="movie-card__meta">
          <span className="movie-card__year">{movie.year}</span>
          <span className="movie-card__dot" aria-hidden="true">·</span>
          <span className="movie-card__duration">
            {movie.duration < 60
              ? `${movie.duration}m`
              : `${Math.floor(movie.duration / 60)}h ${movie.duration % 60 > 0 ? `${movie.duration % 60}m` : ''}`}
          </span>
        </div>
        <div className="movie-card__genres">
          {movie.genre.slice(0, 2).map((g) => (
            <span key={g} className="movie-card__genre">{g}</span>
          ))}
        </div>
      </div>
    </article>
  );
}
