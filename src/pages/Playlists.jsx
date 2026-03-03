import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import MovieCard from '../components/MovieCard';
import Footer from '../components/Footer';
import './Playlists.css';

export default function Playlists() {
  const {
    playlists,
    favoriteMovies,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    getMovieById,
    removeFromPlaylist,
  } = useApp();

  const [activeTab, setActiveTab]     = useState('favorites');
  const [activePl, setActivePl]       = useState(null); // playlist id for detail view
  const [newName, setNewName]         = useState('');
  const [showCreate, setShowCreate]   = useState(false);
  const [renamingId, setRenamingId]   = useState(null);
  const [renameVal, setRenameVal]     = useState('');

  const playlistList = Object.values(playlists).sort((a, b) => b.createdAt - a.createdAt);
  const activePlaylist = activePl ? playlists[activePl] : null;
  const activeMovies = activePlaylist
    ? activePlaylist.movieIds.map(getMovieById).filter(Boolean)
    : [];

  const handleCreate = useCallback((e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    createPlaylist(name);
    setNewName('');
    setShowCreate(false);
  }, [newName, createPlaylist]);

  const handleDelete = useCallback((id) => {
    if (!confirm('Delete this playlist?')) return;
    deletePlaylist(id);
    if (activePl === id) setActivePl(null);
  }, [deletePlaylist, activePl]);

  const handleRename = useCallback((e, id) => {
    e.preventDefault();
    const name = renameVal.trim();
    if (!name) return;
    renamePlaylist(id, name);
    setRenamingId(null);
    setRenameVal('');
  }, [renameVal, renamePlaylist]);

  return (
    <main className="page page-enter playlists-page">
      <div className="playlists-page__inner">
        <div className="playlists-page__header">
          <h1 className="playlists-page__title">My Library</h1>
          <p className="playlists-page__subtitle">Your saved films and custom playlists</p>
        </div>

        {/* Tabs */}
        <div className="playlists-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'favorites'}
            className={`playlists-tab${activeTab === 'favorites' ? ' playlists-tab--active' : ''}`}
            onClick={() => { setActiveTab('favorites'); setActivePl(null); }}
          >
            <svg viewBox="0 0 24 24" fill={activeTab === 'favorites' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            Favorites
            {favoriteMovies.length > 0 && (
              <span className="playlists-tab__count">{favoriteMovies.length}</span>
            )}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'playlists'}
            className={`playlists-tab${activeTab === 'playlists' ? ' playlists-tab--active' : ''}`}
            onClick={() => { setActiveTab('playlists'); setActivePl(null); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Playlists
            {playlistList.length > 0 && (
              <span className="playlists-tab__count">{playlistList.length}</span>
            )}
          </button>
        </div>

        {/* ── Favorites Tab ── */}
        {activeTab === 'favorites' && (
          <div className="playlists-page__section fade-in">
            {favoriteMovies.length === 0 ? (
              <div className="playlists-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <h2>No favorites yet</h2>
                <p>Click the heart icon on any film to save it here.</p>
                <Link to="/" className="btn-primary">Browse Films</Link>
              </div>
            ) : (
              <div className="playlists-grid" role="list">
                {favoriteMovies.map((movie) => (
                  <div key={movie.id} role="listitem">
                    <MovieCard movie={movie} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Playlists Tab ── */}
        {activeTab === 'playlists' && !activePl && (
          <div className="playlists-page__section fade-in">
            {/* Create playlist */}
            {showCreate ? (
              <form className="playlists-create-form" onSubmit={handleCreate}>
                <input
                  type="text"
                  className="playlists-input"
                  placeholder="Playlist name…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={60}
                  autoFocus
                  aria-label="New playlist name"
                />
                <button type="submit" className="btn-primary" disabled={!newName.trim()}>Create</button>
                <button type="button" className="btn-ghost" onClick={() => { setShowCreate(false); setNewName(''); }}>Cancel</button>
              </form>
            ) : (
              <button className="btn-secondary playlists-new-btn" onClick={() => setShowCreate(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New Playlist
              </button>
            )}

            {playlistList.length === 0 ? (
              <div className="playlists-empty" style={{marginTop: 24}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                <h2>No playlists yet</h2>
                <p>Create a playlist to organise films you want to watch.</p>
              </div>
            ) : (
              <div className="playlists-list">
                {playlistList.map((pl) => (
                  <div key={pl.id} className="playlist-row">
                    {renamingId === pl.id ? (
                      <form className="playlist-row__rename" onSubmit={(e) => handleRename(e, pl.id)}>
                        <input
                          className="playlists-input playlist-row__rename-input"
                          value={renameVal}
                          onChange={(e) => setRenameVal(e.target.value)}
                          autoFocus
                          maxLength={60}
                        />
                        <button type="submit" className="btn-primary" style={{padding: '6px 14px', fontSize: '0.82rem'}}>Save</button>
                        <button type="button" className="btn-ghost" onClick={() => setRenamingId(null)}>Cancel</button>
                      </form>
                    ) : (
                      <>
                        <button className="playlist-row__main" onClick={() => setActivePl(pl.id)}>
                          <div className="playlist-row__icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                            </svg>
                          </div>
                          <div className="playlist-row__info">
                            <span className="playlist-row__name">{pl.name}</span>
                            <span className="playlist-row__count">
                              {pl.movieIds.length} film{pl.movieIds.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="playlist-row__arrow">
                            <polyline points="9,18 15,12 9,6"/>
                          </svg>
                        </button>
                        <div className="playlist-row__actions">
                          <button
                            className="btn-ghost playlist-row__action"
                            onClick={() => { setRenamingId(pl.id); setRenameVal(pl.name); }}
                            aria-label="Rename playlist"
                            title="Rename"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button
                            className="btn-ghost playlist-row__action playlist-row__action--danger"
                            onClick={() => handleDelete(pl.id)}
                            aria-label="Delete playlist"
                            title="Delete"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <polyline points="3,6 5,6 21,6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Playlist Detail ── */}
        {activeTab === 'playlists' && activePl && activePlaylist && (
          <div className="playlists-page__section fade-in">
            <button className="btn-ghost playlists-back" onClick={() => setActivePl(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
              Back to playlists
            </button>

            <div className="playlist-detail-header">
              <h2 className="playlist-detail-title">{activePlaylist.name}</h2>
              <span className="text-dim" style={{fontSize: '0.85rem'}}>
                {activeMovies.length} film{activeMovies.length !== 1 ? 's' : ''}
              </span>
            </div>

            {activeMovies.length === 0 ? (
              <div className="playlists-empty">
                <p>This playlist is empty.</p>
                <p className="text-dim" style={{fontSize: '0.82rem'}}>Add films by clicking "Playlist" on a movie page.</p>
                <Link to="/" className="btn-primary">Browse Films</Link>
              </div>
            ) : (
              <div className="playlists-grid" role="list">
                {activeMovies.map((movie) => (
                  <div key={movie.id} role="listitem" className="playlist-detail__item">
                    <MovieCard movie={movie} />
                    <button
                      className="playlist-detail__remove"
                      onClick={() => removeFromPlaylist(activePl, movie.id)}
                      aria-label={`Remove ${movie.title} from playlist`}
                      title="Remove"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="12" height="12">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
