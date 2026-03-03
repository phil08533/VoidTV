/**
 * VoidTV Storage Utilities
 * Typed wrappers around localStorage for all persistent app data
 */

const KEYS = {
  FAVORITES:        'voidtv-favorites',
  RECENTLY_WATCHED: 'voidtv-recently-watched',
  PLAYLISTS:        'voidtv-playlists',
  WATCH_PROGRESS:   'voidtv-watch-progress',
  THEME:            'voidtv-theme',
};

// Max items in recently watched history
const MAX_RECENT = 20;

// ── Generic helpers ──────────────────────────────────────────
function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[VoidTV Storage] Write failed:', e);
  }
}

// ── Favorites ────────────────────────────────────────────────
export function getFavorites()             { return read(KEYS.FAVORITES, []); }
export function addFavorite(movieId)       {
  const favs = getFavorites();
  if (!favs.includes(movieId)) write(KEYS.FAVORITES, [...favs, movieId]);
}
export function removeFavorite(movieId)    {
  write(KEYS.FAVORITES, getFavorites().filter((id) => id !== movieId));
}
export function isFavorite(movieId)        { return getFavorites().includes(movieId); }
export function toggleFavorite(movieId)    {
  isFavorite(movieId) ? removeFavorite(movieId) : addFavorite(movieId);
}

// ── Recently Watched ─────────────────────────────────────────
export function getRecentlyWatched()       { return read(KEYS.RECENTLY_WATCHED, []); }
export function addRecentlyWatched(movieId) {
  const list = getRecentlyWatched().filter((id) => id !== movieId);
  write(KEYS.RECENTLY_WATCHED, [movieId, ...list].slice(0, MAX_RECENT));
}

// ── Watch Progress ───────────────────────────────────────────
// progress stored as { [movieId]: { percent: number, timestamp: number } }
export function getWatchProgress(movieId) {
  const all = read(KEYS.WATCH_PROGRESS, {});
  return all[movieId] ?? null;
}
export function setWatchProgress(movieId, percent) {
  const all = read(KEYS.WATCH_PROGRESS, {});
  write(KEYS.WATCH_PROGRESS, {
    ...all,
    [movieId]: { percent, timestamp: Date.now() },
  });
}

// ── Playlists ────────────────────────────────────────────────
// Structure: { [playlistId]: { id, name, createdAt, movieIds: [] } }
export function getPlaylists()             { return read(KEYS.PLAYLISTS, {}); }
export function createPlaylist(name)       {
  const playlists = getPlaylists();
  const id = `pl_${Date.now()}`;
  write(KEYS.PLAYLISTS, {
    ...playlists,
    [id]: { id, name, createdAt: Date.now(), movieIds: [] },
  });
  return id;
}
export function deletePlaylist(playlistId) {
  const playlists = getPlaylists();
  const { [playlistId]: _removed, ...rest } = playlists;
  write(KEYS.PLAYLISTS, rest);
}
export function addToPlaylist(playlistId, movieId) {
  const playlists = getPlaylists();
  const pl = playlists[playlistId];
  if (!pl) return;
  if (!pl.movieIds.includes(movieId)) {
    write(KEYS.PLAYLISTS, {
      ...playlists,
      [playlistId]: { ...pl, movieIds: [...pl.movieIds, movieId] },
    });
  }
}
export function removeFromPlaylist(playlistId, movieId) {
  const playlists = getPlaylists();
  const pl = playlists[playlistId];
  if (!pl) return;
  write(KEYS.PLAYLISTS, {
    ...playlists,
    [playlistId]: { ...pl, movieIds: pl.movieIds.filter((id) => id !== movieId) },
  });
}
export function renamePlaylist(playlistId, newName) {
  const playlists = getPlaylists();
  const pl = playlists[playlistId];
  if (!pl) return;
  write(KEYS.PLAYLISTS, { ...playlists, [playlistId]: { ...pl, name: newName } });
}
export function isInPlaylist(playlistId, movieId) {
  const pl = getPlaylists()[playlistId];
  return pl ? pl.movieIds.includes(movieId) : false;
}

export { KEYS };
