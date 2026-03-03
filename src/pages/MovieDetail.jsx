import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import AdBanner from '../components/AdBanner';
import MovieRow from '../components/MovieRow';
import PlaylistModal from '../components/PlaylistModal';
import Footer from '../components/Footer';
import { setWatchProgress, getWatchProgress } from '../utils/storage';
import './MovieDetail.css';

export default function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getMovieById,
    getMoviesByGenre,
    toggleFavorite,
    isFavorite,
    addRecentlyWatched,
    movies,
  } = useApp();

  const movie = getMovieById(id);
  const [showPlayer, setShowPlayer]       = useState(false);
  const [showPlaylist, setShowPlaylist]   = useState(false);
  const [showWarning, setShowWarning]     = useState(false);
  const playerRef = useRef(null);

  // Scroll to top on mount / id change
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [id]);

  // Add to recently watched when player is opened
  useEffect(() => {
    if (showPlayer && movie) addRecentlyWatched(movie.id);
  }, [showPlayer, movie, addRecentlyWatched]);

  // Show content warning for flagged films before playing
  const handlePlayClick = useCallback(() => {
    if (movie?.id === 'birth-of-a-nation-1915') {
      setShowWarning(true);
    } else {
      setShowPlayer(true);
    }
  }, [movie]);

  // Scroll to player when it opens
  useEffect(() => {
    if (showPlayer) {
      setTimeout(() => {
        playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [showPlayer]);

  if (!movie) {
    // Try to find partial match
    const suggestions = movies.filter((m) =>
      m.title.toLowerCase().includes((id ?? '').replace(/-/g, ' '))
    );
    return (
      <div className="page page-enter">
        <div className="detail-not-found">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="52" height="52" aria-hidden="true">
            <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <h2>Film Not Found</h2>
          <p>This film is not in our catalog.</p>
          <Link to="/" className="btn-primary">Back to Home</Link>
          {suggestions.length > 0 && (
            <div className="detail-not-found__suggestions">
              <p>Did you mean:</p>
              {suggestions.map((m) => (
                <Link key={m.id} to={`/movie/${m.id}`} className="btn-ghost">{m.title}</Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const fav = isFavorite(movie.id);
  const related = getMoviesByGenre(movie.genre[0])
    .filter((m) => m.id !== movie.id)
    .slice(0, 10);

  const hours = Math.floor(movie.duration / 60);
  const mins  = movie.duration % 60;

  return (
    <main className="page page-enter detail-page">
      {/* Backdrop */}
      <div className="detail__backdrop" aria-hidden="true">
        <img src={movie.thumbnail} alt="" className="detail__backdrop-img"/>
        <div className="detail__backdrop-overlay"/>
      </div>

      <div className="detail__layout">
        {/* Left: Poster & quick actions */}
        <aside className="detail__sidebar">
          <div className="detail__poster">
            <img
              src={movie.thumbnail}
              alt={`${movie.title} poster`}
              className="detail__poster-img"
            />
          </div>
          <div className="detail__quick-actions">
            <button
              className={`btn-secondary detail__fav-btn${fav ? ' detail__fav-btn--active' : ''}`}
              onClick={() => toggleFavorite(movie.id)}
              aria-pressed={fav}
              aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg viewBox="0 0 24 24" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              {fav ? 'Saved' : 'Save'}
            </button>
            <button
              className="btn-secondary"
              onClick={() => setShowPlaylist(true)}
              aria-label="Add to playlist"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              Playlist
            </button>
          </div>
        </aside>

        {/* Right: Details */}
        <div className="detail__content">
          {/* Badges */}
          <div className="detail__badges">
            <span className="badge badge--accent">
              <svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10" style={{marginRight: 4}}>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Verified Public Domain
            </span>
            {movie.kids_safe
              ? <span className="badge badge--kids">Family Friendly</span>
              : <span className="badge badge--warning">Mature Audiences</span>
            }
          </div>

          <h1 className="detail__title">{movie.title}</h1>

          <div className="detail__meta-row">
            <span className="detail__meta-item">{movie.year}</span>
            <span className="detail__meta-sep" aria-hidden="true">·</span>
            <span className="detail__meta-item">
              {hours > 0 ? `${hours}h ` : ''}{mins > 0 ? `${mins}m` : ''}
            </span>
            <span className="detail__meta-sep" aria-hidden="true">·</span>
            <span className="detail__meta-item">{movie.source}</span>
          </div>

          <div className="detail__genres">
            {movie.genre.map((g) => (
              <span key={g} className="detail__genre-tag">{g}</span>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="detail__cta">
            <button className="btn-primary detail__play-btn" onClick={handlePlayClick}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
              {showPlayer ? 'Playing' : 'Watch Now'}
            </button>
            <a
              href={movie.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              aria-label={`View ${movie.title} on ${movie.source}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15,3 21,3 21,9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              View on Archive
            </a>
          </div>

          {/* Description */}
          <div className="detail__description">
            <p>{movie.description}</p>
          </div>

          {/* Metadata table */}
          <dl className="detail__facts">
            {movie.director && (
              <>
                <dt>Director</dt>
                <dd>{movie.director}</dd>
              </>
            )}
            {movie.cast && movie.cast.length > 0 && (
              <>
                <dt>Cast</dt>
                <dd>{movie.cast.join(', ')}</dd>
              </>
            )}
            <dt>Released</dt>
            <dd>{movie.year}</dd>
            <dt>Runtime</dt>
            <dd>{hours > 0 ? `${hours}h ` : ''}{mins > 0 ? `${mins}m` : `${movie.duration}m`}</dd>
            <dt>Genres</dt>
            <dd>{movie.genre.join(', ')}</dd>
            <dt>Source</dt>
            <dd>
              <a href={movie.source_url} target="_blank" rel="noopener noreferrer">
                {movie.source}
              </a>
            </dd>
          </dl>

          {/* Public domain info */}
          <div className="detail__pd-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="9,12 12,15 16,10"/>
            </svg>
            <div>
              <strong>Public Domain Verification</strong>
              <p>{movie.pd_notes}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ad above player */}
      <div className="detail__ad-wrap">
        <AdBanner
          slot={import.meta.env.VITE_ADSENSE_SLOT_DETAIL || 'XXXXXXXXXX'}
          format="leaderboard"
          label="Advertisement"
        />
      </div>

      {/* Video Player */}
      {showPlayer && (
        <div className="detail__player-section" ref={playerRef}>
          <div className="detail__player-wrap">
            <div className="detail__player">
              <iframe
                src={movie.embed_url}
                title={`Watch ${movie.title}`}
                frameBorder="0"
                allowFullScreen
                allow="fullscreen"
                loading="lazy"
                referrerPolicy="no-referrer"
                sandbox="allow-same-origin allow-scripts allow-presentation allow-forms"
                aria-label={`${movie.title} video player`}
              />
            </div>
            <p className="detail__player-notice">
              Video hosted by <a href={movie.source_url} target="_blank" rel="noopener noreferrer">{movie.source}</a>.
              VoidTV does not host video files.
            </p>
          </div>
        </div>
      )}

      {/* Related films */}
      {related.length > 0 && (
        <div className="detail__related">
          <MovieRow
            title={`More ${movie.genre[0]} Films`}
            movies={related}
          />
        </div>
      )}

      <Footer />

      {/* Playlist Modal */}
      {showPlaylist && (
        <PlaylistModal
          movieId={movie.id}
          onClose={() => setShowPlaylist(false)}
        />
      )}

      {/* Content Warning Modal */}
      {showWarning && (
        <div className="modal-overlay" onClick={() => setShowWarning(false)} role="alertdialog" aria-modal="true" aria-label="Content warning">
          <div className="modal detail__warning-modal scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title" style={{color: '#f59e0b'}}>
                ⚠ Content Warning
              </h2>
            </div>
            <div className="modal__body" style={{padding: '16px 24px'}}>
              <p style={{color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.92rem'}}>
                <strong>The Birth of a Nation (1915)</strong> contains extreme racial prejudice,
                glorification of the Ku Klux Klan, and deeply offensive depictions of Black Americans.
                This film is presented solely for its historical and technical significance in cinema education.
                VoidTV does not endorse, promote, or share the ideological content of this film.
              </p>
            </div>
            <div className="modal__footer" style={{display: 'flex', gap: 8}}>
              <button
                className="btn-primary"
                style={{background: '#92400e', flex: 1}}
                onClick={() => { setShowWarning(false); setShowPlayer(true); }}
              >
                I Understand — Continue
              </button>
              <button className="btn-ghost" onClick={() => setShowWarning(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
