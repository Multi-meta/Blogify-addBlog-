// ============================================================
// AdminComments Page — /admin/comments
// All platform comments, searchable by content/author/blog
// ============================================================

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../AdminUsers/AdminDetail.css';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function AdminComments({ user }) {
  const navigate   = useNavigate();
  const [comments, setComments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    if (user === null)                 { navigate('/user/signin'); return; }
    if (user && user.role !== 'ADMIN') { navigate('/'); }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    fetch('/admin/comments', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.success) setComments(d.comments); else setError(d.error); })
      .catch(() => setError('Could not load comments.'))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || user.role !== 'ADMIN') return null;

  const q        = search.toLowerCase();
  const filtered = comments.filter((c) =>
    c.content?.toLowerCase().includes(q) ||
    c.createdBy?.fullName?.toLowerCase().includes(q) ||
    c.blogId?.title?.toLowerCase().includes(q)
  );

  return (
    <div className="admin-detail">
      <div className="admin-detail__header">
        <Link to="/admin/dashboard" className="admin-detail__back">← Back to Dashboard</Link>
        <h1 className="admin-detail__heading">💬 All Comments</h1>
        <p className="admin-detail__sub">{comments.length} comments across all blogs</p>
      </div>

      {error && <div className="admin-detail__error">⚠️ {error}</div>}

      <div className="admin-detail__toolbar">
        <input
          className="admin-detail__search"
          type="text"
          placeholder="Search by content, author or blog title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="admin-detail__count">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <p className="admin-detail__empty">Loading comments…</p>
      ) : filtered.length === 0 ? (
        <p className="admin-detail__empty">No comments match your search.</p>
      ) : (
        <div className="admin-detail__card-list">
          {filtered.map((c) => (
            <div key={c._id} className="admin-detail__comment-card">
              <div className="admin-detail__comment-author">
                <img
                  src={c.createdBy?.profileImageURL || '/images/default.png'}
                  alt={c.createdBy?.fullName}
                  className="admin-detail__avatar"
                  onError={(e) => { e.currentTarget.src = '/images/default.png'; }}
                />
                <div>
                  <span className="admin-detail__user-name">{c.createdBy?.fullName}</span>
                  <span className="admin-detail__date"> · {formatDate(c.createdAt)}</span>
                </div>
              </div>
              <p className="admin-detail__comment-text">"{c.content}"</p>
              <div className="admin-detail__comment-blog">
                on{' '}
                <Link to={`/blog/${c.blogId?._id}`} className="admin-detail__link">
                  {c.blogId?.title || 'Unknown Blog'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminComments;
