import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import './PlaylistModal.css';

export default function PlaylistModal({ movieId, onClose }) {
  const {
    playlists,
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist,
  } = useApp();

  const [newName, setNewName]   = useState('');
  const [creating, setCreating] = useState(false);
  const [toast, setToast]       = useState(null);
  const inputRef = useRef(null);
  const overlayRef = useRef(null);

  const playlistList = Object.values(playlists).sort(
    (a, b) => b.createdAt - a.createdAt
  );

  // Focus trap
  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleToggle = useCallback((playlistId) => {
    const pl = playlists[playlistId];
    if (!pl) return;
    if (pl.movieIds.includes(movieId)) {
      removeFromPlaylist(playlistId, movieId);
      showToast('Removed from playlist');
    } else {
      addToPlaylist(playlistId, movieId);
      showToast('Added to playlist');
    }
  }, [playlists, movieId, addToPlaylist, removeFromPlaylist, showToast]);

  const handleCreate = useCallback((e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const id = createPlaylist(name);
    addToPlaylist(id, movieId);
    setNewName('');
    setCreating(false);
    showToast(`Created "${name}" and added film`);
  }, [newName, createPlaylist, addToPlaylist, movieId, showToast]);

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Add to playlist"
    >
      <div className="modal playlist-modal scale-in">
        {/* Header */}
        <div className="modal__header">
          <h2 className="modal__title">Add to Playlist</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Playlist list */}
        <div className="modal__body">
          {playlistList.length === 0 && !creating && (
            <p className="modal__empty">No playlists yet. Create one below.</p>
          )}
          {playlistList.map((pl) => {
            const included = pl.movieIds.includes(movieId);
            return (
              <button
                key={pl.id}
                className={`playlist-item${included ? ' playlist-item--active' : ''}`}
                onClick={() => handleToggle(pl.id)}
                aria-pressed={included}
              >
                <div className="playlist-item__icon" aria-hidden="true">
                  {included ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  )}
                </div>
                <div className="playlist-item__info">
                  <span className="playlist-item__name">{pl.name}</span>
                  <span className="playlist-item__count">
                    {pl.movieIds.length} film{pl.movieIds.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Create new playlist */}
        <div className="modal__footer">
          {!creating ? (
            <button
              className="btn-secondary playlist-modal__create-btn"
              onClick={() => setCreating(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create New Playlist
            </button>
          ) : (
            <form className="playlist-modal__create-form" onSubmit={handleCreate}>
              <input
                ref={inputRef}
                type="text"
                className="playlist-modal__input"
                placeholder="Playlist name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={60}
                autoComplete="off"
                aria-label="New playlist name"
              />
              <button type="submit" className="btn-primary" disabled={!newName.trim()}>
                Create
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => { setCreating(false); setNewName(''); }}
              >
                Cancel
              </button>
            </form>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="modal-toast" role="status" aria-live="polite">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
