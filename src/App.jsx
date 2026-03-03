import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import SearchOverlay from './components/SearchOverlay';

// Lazy-load pages for code splitting
const Home        = lazy(() => import('./pages/Home'));
const MovieDetail = lazy(() => import('./pages/MovieDetail'));
const SearchPage  = lazy(() => import('./pages/SearchPage'));
const Playlists   = lazy(() => import('./pages/Playlists'));
const NotFound    = lazy(() => import('./pages/NotFound'));

// SearchPage aliased for /browse (no query param = browse all)
const BrowsePage = lazy(() => import('./pages/SearchPage'));

function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        gap: 16,
        color: 'var(--text-dim)',
        flexDirection: 'column',
      }}
      role="status"
      aria-label="Loading"
    >
      <div className="spinner" />
      <span style={{ fontSize: '0.85rem' }}>Loading…</span>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Navbar />
        <SearchOverlay />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"             element={<Home />} />
            <Route path="/movie/:id"    element={<MovieDetail />} />
            <Route path="/search"       element={<SearchPage />} />
            <Route path="/browse"       element={<BrowsePage />} />
            <Route path="/playlists"    element={<Playlists />} />
            <Route path="*"             element={<NotFound />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </AppProvider>
  );
}
