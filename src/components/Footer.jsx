import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer__inner">
        {/* Brand */}
        <div className="footer__brand">
          <Link to="/" className="footer__logo" aria-label="VoidTV Home">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28" aria-hidden="true">
              <rect x="4" y="10" width="40" height="26" rx="4" stroke="currentColor" strokeWidth="2.5"/>
              <polygon points="19,17 19,31 33,24" fill="currentColor"/>
              <rect x="19" y="36" width="10" height="4" fill="currentColor" opacity="0.6"/>
              <rect x="14" y="40" width="20" height="2" rx="1" fill="currentColor" opacity="0.6"/>
            </svg>
            <span>Void<strong>TV</strong></span>
          </Link>
          <p className="footer__tagline">
            Classic cinema, free forever. Strictly verified public domain.
          </p>
        </div>

        {/* Links */}
        <nav className="footer__nav" aria-label="Footer navigation">
          <div className="footer__nav-group">
            <h3 className="footer__nav-heading">Browse</h3>
            <Link to="/"       className="footer__nav-link">Home</Link>
            <Link to="/browse" className="footer__nav-link">All Films</Link>
            <Link to="/search" className="footer__nav-link">Search</Link>
            <Link to="/playlists" className="footer__nav-link">My Playlists</Link>
          </div>
          <div className="footer__nav-group">
            <h3 className="footer__nav-heading">Information</h3>
            <a href="https://archive.org" target="_blank" rel="noopener noreferrer" className="footer__nav-link">Internet Archive</a>
            <a href="https://www.copyright.gov/help/faq/faq-duration.html" target="_blank" rel="noopener noreferrer" className="footer__nav-link">Copyright FAQ</a>
            <a href="https://github.com/phil08533/VoidTV" target="_blank" rel="noopener noreferrer" className="footer__nav-link">GitHub</a>
          </div>
        </nav>
      </div>

      {/* Legal */}
      <div className="footer__legal">
        <div className="footer__legal-inner">
          <p className="footer__disclaimer">
            <strong>Public Domain Notice:</strong> All films on VoidTV have been individually verified as public domain in the United States.
            Films published before January 1, 1928 are in the public domain per 17 U.S.C. §304.
            VoidTV does not host, store, or distribute any video files. All streams are embedded from verified third-party sources including the Internet Archive.
          </p>
          <p className="footer__copyright">
            © {new Date().getFullYear()} VoidTV. The VoidTV platform interface is open source.
            All film content belongs to its respective rights holders where applicable, or is in the public domain.
          </p>
          <p className="footer__disclaimer footer__disclaimer--small">
            VoidTV is not affiliated with, endorsed by, or sponsored by any of the original film studios or rights holders.
            If you believe any content has been incorrectly classified as public domain, please{' '}
            <a href="https://github.com/phil08533/VoidTV/issues" target="_blank" rel="noopener noreferrer">report it on GitHub</a>.
          </p>
        </div>
      </div>
    </footer>
  );
}
