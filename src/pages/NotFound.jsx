import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <main className="page page-enter not-found-page">
      <div className="not-found">
        <div className="not-found__visual" aria-hidden="true">
          <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" width="240" height="180">
            <rect x="20" y="20" width="200" height="130" rx="12" stroke="currentColor" strokeWidth="3" opacity="0.3"/>
            <rect x="34" y="34" width="172" height="102" rx="6" fill="currentColor" opacity="0.05"/>
            <text x="120" y="100" textAnchor="middle" fontSize="52" fontWeight="900" fill="currentColor" opacity="0.15" fontFamily="system-ui">404</text>
            <line x1="80" y1="150" x2="160" y2="150" stroke="currentColor" strokeWidth="3" opacity="0.3" strokeLinecap="round"/>
            <rect x="100" y="150" width="40" height="10" rx="2" fill="currentColor" opacity="0.15"/>
            <circle cx="100" cy="95" r="16" stroke="currentColor" strokeWidth="2.5" opacity="0.4"/>
            <line x1="111" y1="106" x2="122" y2="117" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.4"/>
          </svg>
        </div>
        <h1 className="not-found__code">404</h1>
        <h2 className="not-found__title">Film Not Found</h2>
        <p className="not-found__desc">
          This page doesn't exist, or the film you're looking for isn't in our public domain catalog.
        </p>
        <div className="not-found__actions">
          <Link to="/" className="btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
            Back to Home
          </Link>
          <Link to="/browse" className="btn-secondary">Browse All Films</Link>
        </div>
      </div>
    </main>
  );
}
