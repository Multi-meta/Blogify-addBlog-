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

  const [reports,       setReports]       = useState([]);
  const [blogs,         setBlogs]         = useState([]);
  const [adminStats,    setAdminStats]    = useState(null);
  const [loadingReports, setLR]           = useState(true);
  const [loadingBlogs,   setLB]           = useState(true);
  const [loadingStats,   setLS]           = useState(true);
  const [error,          setError]        = useState('');
  const [guideReports,   setGuideReports]  = useState(null); // pending travel-guide reports
  const [dismissing,     setDismissing]   = useState(null);
  const [deleting,       setDeleting]     = useState(null);

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

  const fetchStats = useCallback(() => {
    setLS(true);
    fetch('/admin/stats', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.success) setAdminStats(d.stats); })
      .catch(() => {})
      .finally(() => setLS(false));
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchReports();
      fetchBlogs();
      fetchStats();
      fetch('/admin/guide-reports?status=pending', { credentials: 'include' })
        .then((res) => res.json())
        .then((d) => { if (d.success) setGuideReports(d.pending); })
        .catch(() => {});
    }
  }, [user, fetchReports, fetchBlogs, fetchStats]);


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

      {/* ── Stats Section ── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 className="admin-section__title">📊 Platform Statistics</h2>
        {loadingStats ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            Loading stats...
          </p>
        ) : (
          <div className="admin-stats-grid">
            {/* Total Users → /admin/users */}
            <Link to="/admin/users" className="stat-card stat-card--link">
              <div className="stat-card__icon">👥</div>
              <div className="stat-card__value">{adminStats?.totalUsers ?? '—'}</div>
              <div className="stat-card__label">Total Users</div>
              <div className="stat-card__arrow">View all →</div>
            </Link>

            {/* Total Blogs → scroll to all-blogs section */}
            <a href="#all-blogs" className="stat-card stat-card--link">
              <div className="stat-card__icon">📝</div>
              <div className="stat-card__value">{adminStats?.totalBlogs ?? '—'}</div>
              <div className="stat-card__label">Total Blogs</div>
              <div className="stat-card__arrow">See below ↓</div>
            </a>

            {/* Total Comments → /admin/comments */}
            <Link to="/admin/comments" className="stat-card stat-card--link">
              <div className="stat-card__icon">💬</div>
              <div className="stat-card__value">{adminStats?.totalComments ?? '—'}</div>
              <div className="stat-card__label">Total Comments</div>
              <div className="stat-card__arrow">View all →</div>
            </Link>

            {/* Pending Reports → scroll to reports section */}
            <a href="#reports" className="stat-card stat-card--link">
              <div className="stat-card__icon">🚩</div>
              <div className="stat-card__value">{adminStats?.pendingReports ?? '—'}</div>
              <div className="stat-card__label">Pending Reports</div>
              <div className="stat-card__arrow">See below ↓</div>
            </a>

            {/* Blogs This Week → /admin/blogs-this-week */}
            <Link to="/admin/blogs-this-week" className="stat-card stat-card--link">
              <div className="stat-card__icon">📈</div>
              <div className="stat-card__value">{adminStats?.blogsThisWeek ?? '—'}</div>
              <div className="stat-card__label">Blogs This Week</div>
              <div className="stat-card__arrow">View all →</div>
            </Link>

            {/* Travel plans & subscriptions → /admin/travel */}
            <Link to="/admin/travel" className="stat-card stat-card--link">
              <div className="stat-card__icon">🧳</div>
              <div className="stat-card__value" style={{ fontSize: 'var(--font-size-lg)' }}>Travel &amp; Plans</div>
              <div className="stat-card__label">Subscriptions, destinations, rate cards</div>
              <div className="stat-card__arrow">Manage →</div>
            </Link>

            {/* Reported travel guides → review + refund */}
            <Link to="/admin/travel?tab=reports" className="stat-card stat-card--link">
              <div className="stat-card__icon">🚩</div>
              <div className="stat-card__value">{guideReports ?? '—'}</div>
              <div className="stat-card__label">Reported Travel Guides</div>
              <div className="stat-card__arrow">Review →</div>
            </Link>

            {/* Top Category → home with filter */}
            <Link
              to={adminStats?.topCategories?.[0] ? `/?category=${encodeURIComponent(adminStats.topCategories[0].category)}` : '/'}
              className="stat-card stat-card--link"
            >
              <div className="stat-card__icon">🏷️</div>
              <div className="stat-card__value" style={{ fontSize: 'var(--font-size-lg)' }}>
                {adminStats?.topCategories?.[0]?.category || '—'}
              </div>
              <div className="stat-card__label">Top Category</div>
              {adminStats?.topCategories?.[0] && (
                <div className="stat-card__sub">
                  {adminStats.topCategories[0].count} blog{adminStats.topCategories[0].count !== 1 ? 's' : ''}
                </div>
              )}
              <div className="stat-card__arrow">Browse →</div>
            </Link>
          </div>
        )}
      </section>

      {/* ── Reports Section ── */}
      <section id="reports" style={{ marginBottom: '3rem' }}>

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
                  {report.commentId && (
                    <div className="admin-report-card__meta">
                      💬 Reported comment by <strong>{report.commentId.createdBy?.fullName || 'Unknown'}</strong>:
                      {' '}"{report.commentId.content}"
                    </div>
                  )}
                  <span className="admin-report-card__reason">
                    "{report.reason}"
                  </span>
                </div>
                <div className="admin-report-card__actions">
                  {report.commentId ? (
                    <Link
                      to={`/blog/${report.blogId?._id}`}
                      className="admin-btn admin-btn--ghost"
                      style={{ textDecoration: 'none', textAlign: 'center' }}
                    >
                      Review Comment
                    </Link>
                  ) : (
                    <button
                      className="admin-btn admin-btn--danger"
                      onClick={() => handleDeleteBlog(report.blogId?._id)}
                      disabled={deleting === report.blogId?._id}
                    >
                      {deleting === report.blogId?._id ? 'Deleting...' : 'Delete Blog'}
                    </button>
                  )}
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
      <section id="all-blogs">
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
