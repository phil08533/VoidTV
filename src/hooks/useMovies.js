import { useState, useEffect } from 'react';

const MOVIES_URL = `${import.meta.env.BASE_URL}movies.json`;

/**
 * useMovies — fetch and cache movies from /public/movies.json
 */
export function useMovies() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(MOVIES_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          // Validate structure before accepting
          const valid = Array.isArray(data)
            ? data.filter(
                (m) =>
                  m &&
                  typeof m.id === 'string' &&
                  typeof m.title === 'string' &&
                  m.verified_public_domain === true
              )
            : [];
          setMovies(valid);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[VoidTV] Failed to load movies.json:', err);
          setError('Failed to load movie catalog. Please refresh.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { movies, loading, error };
}
