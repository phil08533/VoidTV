import React, { useRef, useState, useCallback, useEffect } from 'react';
import MovieCard from './MovieCard';
import './MovieRow.css';

export default function MovieRow({ title, movies, icon, emptyMessage }) {
  const scrollRef = useRef(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging]         = useState(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, movies]);

  const scroll = useCallback((dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  }, []);

  // Mouse drag-to-scroll
  const onMouseDown = (e) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, scrollLeft: scrollRef.current.scrollLeft };
  };
  const onMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
  };
  const onMouseUp = () => setIsDragging(false);

  if (!movies || movies.length === 0) {
    if (!emptyMessage) return null;
    return (
      <section className="movie-row">
        <div className="movie-row__header">
          {icon && <span className="movie-row__icon" aria-hidden="true">{icon}</span>}
          <h2 className="movie-row__title">{title}</h2>
        </div>
        <p className="movie-row__empty">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="movie-row" aria-label={title}>
      {/* Header */}
      <div className="movie-row__header">
        {icon && <span className="movie-row__icon" aria-hidden="true">{icon}</span>}
        <h2 className="movie-row__title">{title}</h2>
        <span className="movie-row__count">{movies.length}</span>
      </div>

      {/* Scroll container */}
      <div className="movie-row__track-wrapper">
        {/* Left fade + arrow */}
        {canScrollLeft && (
          <>
            <div className="movie-row__fade movie-row__fade--left" aria-hidden="true"/>
            <button
              className="movie-row__arrow movie-row__arrow--left"
              onClick={() => scroll('left')}
              aria-label={`Scroll ${title} left`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <polyline points="15,18 9,12 15,6"/>
              </svg>
            </button>
          </>
        )}

        <div
          className={`movie-row__track${isDragging ? ' movie-row__track--dragging' : ''}`}
          ref={scrollRef}
          role="list"
          aria-label={`${title} films`}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {movies.map((movie) => (
            <div key={movie.id} role="listitem">
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>

        {/* Right fade + arrow */}
        {canScrollRight && (
          <>
            <div className="movie-row__fade movie-row__fade--right" aria-hidden="true"/>
            <button
              className="movie-row__arrow movie-row__arrow--right"
              onClick={() => scroll('right')}
              aria-label={`Scroll ${title} right`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
            </button>
          </>
        )}
      </div>
    </section>
  );
}
