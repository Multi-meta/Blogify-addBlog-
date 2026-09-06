// ============================================================
// Sidebar Component
// Shows user's name, avatar, and their own blog posts
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function Sidebar({ user }) {
  const [blogs, setBlogs]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch('/api/my-blogs', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.success) setBlogs(d.blogs); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  return (
    <aside className="sidebar">

      {/* Profile Section */}
      <div className="sidebar__profile">
        <div className="sidebar__profile-row">
          <img
            src={user.profileImageURL || '/images/default.png'}
            alt={user.fullName}
            className="sidebar__avatar"
            onError={(e) => { e.currentTarget.src = '/images/default.png'; }}
          />
          <div className="sidebar__profile-info">
            <span className="sidebar__profile-name">{user.fullName}</span>
            {user.role === 'ADMIN' && (
              <span className="sidebar__role-badge">Admin</span>
            )}
          </div>
        </div>
      </div>

      {/* My Blogs Section */}
      <div className="sidebar__blogs">
        <h3 className="sidebar__blogs-title">
          My Blogs
          {!loading && (
            <span className="sidebar__blogs-count">{blogs.length}</span>
          )}
        </h3>

        {loading ? (
          <p className="sidebar__blogs-meta">Loading...</p>
        ) : blogs.length === 0 ? (
          <div>
            <p className="sidebar__blogs-meta">You haven't published any blogs yet.</p>
            <Link to="/blog/add-new" className="sidebar__create-btn">
              + Write your first blog
            </Link>
          </div>
        ) : (
          <ul className="sidebar__blog-list">
            {blogs.map((blog) => (
              <li key={blog._id} className="sidebar__blog-item">
                <div className="sidebar__blog-dot" />
                <div className="sidebar__blog-info">
                  <Link
                    to={`/blog/${blog._id}`}
                    className="sidebar__blog-name"
                    title={blog.title}
                  >
                    {blog.title}
                  </Link>
                  <div className="sidebar__blog-footer">
                    <span className="sidebar__blog-date">{formatDate(blog.createdAt)}</span>
                    <Link
                      to={`/blog/edit/${blog._id}`}
                      className="sidebar__edit-link"
                    >
                      ✏️ Edit
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

    </aside>
  );
}

export default Sidebar;
