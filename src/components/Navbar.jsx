import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Navbar.css';

export default function Navbar() {
  const { toggleTheme, isDark, setIsSearchOpen, favorites } = useApp();
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Close menu on route change
  useEffect(() => setMenuOpen(false), [location.pathname]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <nav className={`navbar${scrolled ? ' navbar--scrolled' : ''}`} role="navigation" aria-label="Main navigation">
      <div className="navbar__inner">
        {/* Logo */}
        <Link to="/" className="navbar__logo" aria-label="VoidTV Home">
          <svg className="navbar__logo-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="4" y="10" width="40" height="26" rx="4" stroke="currentColor" strokeWidth="2.5"/>
            <rect x="8" y="14" width="32" height="18" rx="2" fill="currentColor" opacity="0.08"/>
            <polygon points="19,17 19,31 33,24" fill="currentColor"/>
            <rect x="19" y="36" width="10" height="4" fill="currentColor" opacity="0.6"/>
            <rect x="14" y="40" width="20" height="2" rx="1" fill="currentColor" opacity="0.6"/>
          </svg>
          <span className="navbar__logo-text">
            Void<span className="navbar__logo-tv">TV</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="navbar__links" role="list">
          <Link to="/"          className="navbar__link" role="listitem">Home</Link>
          <Link to="/browse"    className="navbar__link" role="listitem">Browse</Link>
          <Link to="/playlists" className="navbar__link" role="listitem">
            My Lists
            {favorites.length > 0 && (
              <span className="navbar__link-badge">{favorites.length}</span>
            )}
          </Link>
        </div>

        {/* Actions */}
        <div className="navbar__actions">
          <button
            className="navbar__action-btn"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search movies"
            title="Search (/ or Ctrl+K)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>

          <button
            className="navbar__action-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          {/* Mobile menu toggle */}
          <button
            className={`navbar__burger${menuOpen ? ' navbar__burger--open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <span/><span/><span/>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="navbar__mobile-menu" ref={menuRef} role="dialog" aria-label="Mobile navigation">
          <Link to="/"          className="navbar__mobile-link">Home</Link>
          <Link to="/browse"    className="navbar__mobile-link">Browse All</Link>
          <Link to="/playlists" className="navbar__mobile-link">
            My Lists {favorites.length > 0 && `(${favorites.length})`}
          </Link>
          <button
            className="navbar__mobile-link navbar__mobile-search"
            onClick={() => { setIsSearchOpen(true); setMenuOpen(false); }}
          >
            Search Movies
          </button>
          <div className="navbar__mobile-divider"/>
          <button
            className="navbar__mobile-link"
            onClick={() => { toggleTheme(); setMenuOpen(false); }}
          >
            {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </button>
        </div>
      )}
    </nav>
  );
}
