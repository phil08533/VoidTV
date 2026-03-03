import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { useMovies } from '../hooks/useMovies';
import { useTheme } from '../hooks/useTheme';
import {
  getFavorites,
  toggleFavorite as storageFavorite,
  isFavorite,
  getRecentlyWatched,
  addRecentlyWatched as storageAddRecent,
  getPlaylists,
  createPlaylist as storageCreatePlaylist,
  deletePlaylist as storageDeletePlaylist,
  addToPlaylist as storageAddToPlaylist,
  removeFromPlaylist as storageRemoveFromPlaylist,
  renamePlaylist as storageRenamePlaylist,
} from '../utils/storage';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { movies, loading, error } = useMovies();
  const { theme, toggleTheme, isDark } = useTheme();

  // ── UI State ──
  const [searchQuery, setSearchQuery]     = useState('');
  const [isSearchOpen, setIsSearchOpen]   = useState(false);

  // ── Persisted State (re-read from localStorage so updates propagate) ──
  const [favorites, setFavorites]           = useState(() => getFavorites());
  const [recentlyWatched, setRecentlyWatched] = useState(() => getRecentlyWatched());
  const [playlists, setPlaylists]           = useState(() => getPlaylists());

  // Refresh playlists state from storage (e.g. after mutations)
  const refreshPlaylists = useCallback(() => setPlaylists(getPlaylists()), []);
  const refreshFavorites = useCallback(() => setFavorites(getFavorites()), []);
  const refreshRecent    = useCallback(() => setRecentlyWatched(getRecentlyWatched()), []);

  // ── Favorites API ──
  const handleToggleFavorite = useCallback((movieId) => {
    storageFavorite(movieId);
    refreshFavorites();
  }, [refreshFavorites]);

  // ── Recently Watched API ──
  const handleAddRecent = useCallback((movieId) => {
    storageAddRecent(movieId);
    refreshRecent();
  }, [refreshRecent]);

  // ── Playlist API ──
  const handleCreatePlaylist = useCallback((name) => {
    const id = storageCreatePlaylist(name);
    refreshPlaylists();
    return id;
  }, [refreshPlaylists]);

  const handleDeletePlaylist = useCallback((playlistId) => {
    storageDeletePlaylist(playlistId);
    refreshPlaylists();
  }, [refreshPlaylists]);

  const handleAddToPlaylist = useCallback((playlistId, movieId) => {
    storageAddToPlaylist(playlistId, movieId);
    refreshPlaylists();
  }, [refreshPlaylists]);

  const handleRemoveFromPlaylist = useCallback((playlistId, movieId) => {
    storageRemoveFromPlaylist(playlistId, movieId);
    refreshPlaylists();
  }, [refreshPlaylists]);

  const handleRenamePlaylist = useCallback((playlistId, newName) => {
    storageRenamePlaylist(playlistId, newName);
    refreshPlaylists();
  }, [refreshPlaylists]);

  // ── Derived helpers ──
  const getMovieById = useCallback(
    (id) => movies.find((m) => m.id === id) ?? null,
    [movies]
  );

  const getMoviesByGenre = useCallback(
    (genre) => movies.filter((m) => m.genre.includes(genre)),
    [movies]
  );

  const getKidSafeMovies = useCallback(
    () => movies.filter((m) => m.kids_safe),
    [movies]
  );

  const searchMovies = useCallback(
    (query) => {
      if (!query.trim()) return [];
      const q = query.toLowerCase();
      return movies.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.director?.toLowerCase().includes(q) ||
          m.genre.some((g) => g.toLowerCase().includes(q)) ||
          String(m.year).includes(q)
      );
    },
    [movies]
  );

  const recentMovies = recentlyWatched
    .map((id) => getMovieById(id))
    .filter(Boolean);

  const favoriteMovies = favorites
    .map((id) => getMovieById(id))
    .filter(Boolean);

  // ── Search keyboard shortcut ──
  useEffect(() => {
    const handler = (e) => {
      if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) &&
          e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const value = {
    // Data
    movies,
    loading,
    error,
    // Theme
    theme,
    isDark,
    toggleTheme,
    // Search
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    setIsSearchOpen,
    searchMovies,
    // User data
    favorites,
    recentlyWatched,
    recentMovies,
    favoriteMovies,
    playlists,
    // Derived helpers
    getMovieById,
    getMoviesByGenre,
    getKidSafeMovies,
    // Actions
    toggleFavorite:       handleToggleFavorite,
    isFavorite:           (id) => favorites.includes(id),
    addRecentlyWatched:   handleAddRecent,
    createPlaylist:       handleCreatePlaylist,
    deletePlaylist:       handleDeletePlaylist,
    addToPlaylist:        handleAddToPlaylist,
    removeFromPlaylist:   handleRemoveFromPlaylist,
    renamePlaylist:       handleRenamePlaylist,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
