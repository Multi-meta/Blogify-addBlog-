// ============================================================
// BlogGrid Component
// Renders a responsive grid of BlogCard components
// Props:
//   blogs: array of blog objects
//   loading: boolean
// ============================================================

import BlogCard from '../BlogCard/BlogCard';
import './BlogGrid.css';

function BlogGrid({ blogs = [], loading = false }) {

  // Show skeleton placeholders while loading
  if (loading) {
    return (
      <div className="blog-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="blog-grid__skeleton" />
        ))}
      </div>
    );
  }

  // Empty state
  if (blogs.length === 0) {
    return (
      <div className="blog-grid">
        <p className="blog-grid__empty">No blogs yet. Be the first to create one!</p>
      </div>
    );
  }

  return (
    <div className="blog-grid">
      {blogs.map((blog) => (
        <BlogCard key={blog._id} blog={blog} />
      ))}
    </div>
  );
}

export default BlogGrid;
