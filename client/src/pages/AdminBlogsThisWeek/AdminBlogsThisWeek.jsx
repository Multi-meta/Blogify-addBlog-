// ============================================================
// AdminBlogsThisWeek Page — /admin/blogs-this-week
// All blogs published in the last 7 days
// ============================================================

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../AdminUsers/AdminDetail.css';
import '../AdminDashboard/AdminDashboard.css';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function AdminBlogsThisWeek({ user }) {
  const navigate = useNavigate();
  const [blogs,   setBlogs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (user === null)                 { navigate('/user/signin'); return; }
    if (user && user.role !== 'ADMIN') { navigate('/'); }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    fetch('/admin/blogs?since=week', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.success) setBlogs(d.blogs); else setError(d.error); })
      .catch(() => setError('Could not load blogs.'))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="admin-detail">
      <div className="admin-detail__header">
        <Link to="/admin/dashboard" className="admin-detail__back">← Back to Dashboard</Link>
        <h1 className="admin-detail__heading">📈 Blogs This Week</h1>
        <p className="admin-detail__sub">
          {blogs.length} blog{blogs.length !== 1 ? 's' : ''} published in the last 7 days
        </p>
      </div>

      {error && <div className="admin-detail__error">⚠️ {error}</div>}

      {loading ? (
        <p className="admin-detail__empty">Loading…</p>
      ) : blogs.length === 0 ? (
        <p className="admin-detail__empty">No blogs published this week.</p>
      ) : (
        <div className="admin-blogs">
          {blogs.map((blog) => (
            <div key={blog._id} className="admin-blog-row">
              {blog.coverImageURL ? (
                <img
                  src={blog.coverImageURL}
                  alt={blog.title}
                  className="admin-blog-row__thumb"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className="admin-blog-row__thumb--placeholder">No img</div>
              )}
              <div className="admin-blog-row__info">
                <div className="admin-blog-row__title">
                  <Link to={`/blog/${blog._id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {blog.title}
                  </Link>
                </div>
                <div className="admin-blog-row__author">
                  by {blog.createdBy?.fullName || 'Unknown'} · {formatDate(blog.createdAt)}
                  {blog.category && (
                    <span className="admin-detail__cat-tag">{blog.category}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminBlogsThisWeek;
