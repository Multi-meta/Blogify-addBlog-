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

  const fetchBlogs = useCallback(() => {
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedSubcategory) params.set('subcategory', selectedSubcategory);

    const url = `/api/blogs${params.toString() ? '?' + params.toString() : ''}`;

    fetch(url, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setBlogs(data.blogs);
        else setError('Failed to load blogs.');
      })
      .catch(() => setError('Could not connect to server. Make sure the backend is running.'))
      .finally(() => setLoading(false));
  }, [selectedCategory, selectedSubcategory]);

  useEffect(() => {
    fetchBlogs();
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
