// ============================================================
// Home Page
// Fetches real blogs from MongoDB via GET /api/blogs
// CategoryFilter in the right sidebar; user blogs moved to Navbar dropdown
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import BlogGrid from '../../components/BlogGrid/BlogGrid';
import CategoryFilter from '../../components/CategoryFilter/CategoryFilter';
import './Home.css';

function Home() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters live in the URL (?category=X&subcategory=Y), so any link to "/"
  // — Home, the Blogify logo, the footer — clears them
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || '';
  const selectedSubcategory = searchParams.get('subcategory') || '';

  const [wakingUp, setWakingUp] = useState(false);

  // The free Render backend can take ~30-60s to wake from sleep, and the Vercel
  // proxy gives up before then — so retry a few times before showing an error.
  const fetchBlogs = useCallback((signal) => {
    setLoading(true);
    setError('');
    setWakingUp(false);

    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedSubcategory) params.set('subcategory', selectedSubcategory);

    const url = `/api/blogs${params.toString() ? '?' + params.toString() : ''}`;
    const MAX_ATTEMPTS = 6;
    const RETRY_DELAY_MS = 10000;

    async function attempt(n) {
      try {
        const res = await fetch(url, { credentials: 'include', signal });
        const data = await res.json(); // throws on the proxy's HTML error page
        if (data.success) setBlogs(data.blogs);
        else setError('Failed to load blogs.');
        setWakingUp(false);
        setLoading(false);
      } catch (err) {
        if (signal?.aborted) return;
        if (n < MAX_ATTEMPTS) {
          setWakingUp(true);
          setTimeout(() => { if (!signal?.aborted) attempt(n + 1); }, RETRY_DELAY_MS);
        } else {
          setWakingUp(false);
          setError('Could not connect to server. Please try again in a minute.');
          setLoading(false);
        }
      }
    }
    attempt(1);
  }, [selectedCategory, selectedSubcategory]);

  useEffect(() => {
    const controller = new AbortController();
    fetchBlogs(controller.signal);
    return () => controller.abort();
  }, [fetchBlogs]);

  function handleFilterChange(category, subcategory) {
    const params = {};
    if (category) params.category = category;
    if (subcategory) params.subcategory = subcategory;
    setSearchParams(params);
  }

  return (
    <main className="home">
      <div className="home__inner">

        <div className="home__content">
          {error && (
            <div style={{
              padding: '1rem', background: '#fef2f2', color: '#ef4444',
              borderRadius: '8px', marginBottom: '1.5rem',
              border: '1px solid #fecaca', fontSize: '0.9rem'
            }}>
              ⚠️ {error}
            </div>
          )}
          {wakingUp && (
            <div style={{
              background: '#fffbeb', color: '#92400e',
              padding: '1rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem',
              border: '1px solid #fde68a', fontSize: '0.9rem'
            }}>
              ⏳ Waking up the server — this can take up to a minute…
            </div>
          )}
          <BlogGrid blogs={blogs} loading={loading} />
        </div>

        {/* Right sidebar: Category Filter only */}
        <div className="home__sidebar">
          <CategoryFilter
            selectedCategory={selectedCategory}
            selectedSubcategory={selectedSubcategory}
            onFilterChange={handleFilterChange}
          />
        </div>

      </div>
    </main>
  );
}

export default Home;
