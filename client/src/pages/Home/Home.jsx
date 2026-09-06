// ============================================================
// Home Page
// Fetches real blogs from MongoDB via GET /api/blogs
// Includes CategoryFilter below the blog grid
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import BlogGrid from '../../components/BlogGrid/BlogGrid';
import CategoryFilter from '../../components/CategoryFilter/CategoryFilter';
import Sidebar from '../../components/Sidebar/Sidebar';
import './Home.css';

function Home({ user }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');

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
      .catch(() => setError('Could not connect to server. Make sure Express is running on port 8000.'))
      .finally(() => setLoading(false));
  }, [selectedCategory, selectedSubcategory]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  function handleFilterChange(category, subcategory) {
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
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

        {/* Right side: Category Filter + User Sidebar */}
        <div className="home__sidebar">
          <CategoryFilter
            selectedCategory={selectedCategory}
            selectedSubcategory={selectedSubcategory}
            onFilterChange={handleFilterChange}
          />
          {user && <Sidebar user={user} />}
        </div>

      </div>
    </main>
  );
}

export default Home;
