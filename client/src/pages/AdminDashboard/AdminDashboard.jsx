// ============================================================
// Admin Dashboard Page
// Route: /admin/dashboard  (ADMIN only)
// Shows: pending reports + all blogs with delete controls
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function AdminDashboard({ user }) {
  const navigate = useNavigate();

  const [reports, setReports]       = useState([]);
  const [blogs, setBlogs]           = useState([]);
  const [loadingReports, setLR]     = useState(true);
  const [loadingBlogs, setLB]       = useState(true);
  const [error, setError]           = useState('');
  const [dismissing, setDismissing] = useState(null); // report id being dismissed
  const [deleting, setDeleting]     = useState(null); // blog id being deleted

  // Guard: redirect non-admins
  useEffect(() => {
    if (user === null) { navigate('/user/signin'); return; }
    if (user && user.role !== 'ADMIN') { navigate('/'); }
  }, [user, navigate]);

  const fetchReports = useCallback(() => {
    setLR(true);
    fetch('/admin/reports', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.success) setReports(d.reports); else setError(d.error); })
      .catch(() => setError('Could not load reports.'))
      .finally(() => setLR(false));
  }, []);

  const fetchBlogs = useCallback(() => {
    setLB(true);
    fetch('/admin/blogs', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.success) setBlogs(d.blogs); else setError(d.error); })
      .catch(() => setError('Could not load blogs.'))
      .finally(() => setLB(false));
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchReports();
      fetchBlogs();
    }
  }, [user, fetchReports, fetchBlogs]);

  async function handleDismiss(reportId) {
    setDismissing(reportId);
    try {
      const res = await fetch(`/admin/reports/${reportId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const d = await res.json();
      if (d.success) setReports((prev) => prev.filter((r) => r._id !== reportId));
      else setError(d.error);
    } catch {
      setError('Could not dismiss report.');
    } finally {
      setDismissing(null);
    }
  }

  async function handleDeleteBlog(blogId) {
    if (!window.confirm('Permanently delete this blog and all its comments?')) return;
    setDeleting(blogId);
    try {
      const res = await fetch(`/blog/${blogId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const d = await res.json();
      if (d.success) {
        setBlogs((prev) => prev.filter((b) => b._id !== blogId));
        // Also remove any reports that referenced this blog
        setReports((prev) => prev.filter((r) => r.blogId?._id !== blogId));
      } else {
        setError(d.error);
      }
    } catch {
      setError('Could not delete blog.');
    } finally {
      setDeleting(null);
    }
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="admin-page">
      <h1 className="admin-page__heading">⚙️ Admin Dashboard</h1>
      <p className="admin-page__sub">Manage reports and blog content for Blogify.</p>

      {error && <div className="admin-error">⚠️ {error}</div>}

      {/* ── Reports Section ── */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 className="admin-section__title">
          🚩 Pending Reports
          {reports.length > 0 && (
            <span className="admin-badge">{reports.length}</span>
          )}
        </h2>

        {loadingReports ? (
          <p className="admin-empty">Loading reports...</p>
        ) : reports.length === 0 ? (
          <p className="admin-empty">No pending reports. All clear! ✅</p>
        ) : (
          <div className="admin-reports">
            {reports.map((report) => (
              <div key={report._id} className="admin-report-card">
                <div className="admin-report-card__body">
                  <div className="admin-report-card__blog">
                    📄{' '}
                    <Link to={`/blog/${report.blogId?._id}`} style={{ color: 'inherit' }}>
                      {report.blogTitle || report.blogId?.title || 'Unknown Blog'}
                    </Link>
                  </div>
                  <div className="admin-report-card__meta">
                    Reported by <strong>{report.reportedBy?.fullName}</strong>
                    {' '}({report.reportedBy?.email}) · {formatDate(report.createdAt)}
                  </div>
                  <span className="admin-report-card__reason">
                    "{report.reason}"
                  </span>
                </div>
                <div className="admin-report-card__actions">
                  <button
                    className="admin-btn admin-btn--danger"
                    onClick={() => handleDeleteBlog(report.blogId?._id)}
                    disabled={deleting === report.blogId?._id}
                  >
                    {deleting === report.blogId?._id ? 'Deleting...' : 'Delete Blog'}
                  </button>
                  <button
                    className="admin-btn admin-btn--ghost"
                    onClick={() => handleDismiss(report._id)}
                    disabled={dismissing === report._id}
                  >
                    {dismissing === report._id ? 'Dismissing...' : 'Dismiss'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── All Blogs Section ── */}
      <section>
        <h2 className="admin-section__title">
          📝 All Blogs ({blogs.length})
        </h2>

        {loadingBlogs ? (
          <p className="admin-empty">Loading blogs...</p>
        ) : blogs.length === 0 ? (
          <p className="admin-empty">No blogs found.</p>
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
                  </div>
                </div>

                <button
                  className="admin-btn admin-btn--danger"
                  onClick={() => handleDeleteBlog(blog._id)}
                  disabled={deleting === blog._id}
                >
                  {deleting === blog._id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;
