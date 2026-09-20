// ============================================================
// UserComments Page — /user/comments
// All comments received on the logged-in user's blogs,
// grouped by blog post
// ============================================================

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './UserComments.css';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function UserComments({ user }) {
  const navigate   = useNavigate();
  const [comments, setComments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (!user) navigate('/user/signin');
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    fetch('/user/comments-received', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.success) setComments(d.comments); else setError(d.error); })
      .catch(() => setError('Could not load comments.'))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  // Group by blog, preserving insertion order (already sorted by date desc)
  const groups = [];
  const seen   = {};
  comments.forEach((c) => {
    const key = String(c.blogId);
    if (!seen[key]) {
      seen[key] = { blogId: key, blogTitle: c.blogTitle, items: [] };
      groups.push(seen[key]);
    }
    seen[key].items.push(c);
  });

  return (
    <div className="user-comments">
      <div className="user-comments__header">
        <Link to="/user/dashboard" className="user-comments__back">← Back to Dashboard</Link>
        <h1 className="user-comments__heading">💬 Comments on My Blogs</h1>
        <p className="user-comments__sub">
          {comments.length} comment{comments.length !== 1 ? 's' : ''} received
          {groups.length > 0 && ` across ${groups.length} blog${groups.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {error && <div className="user-comments__error">⚠️ {error}</div>}

      {loading ? (
        <p className="user-comments__empty">Loading comments…</p>
      ) : comments.length === 0 ? (
        <div className="user-comments__empty-state">
          <p>No comments on your blogs yet.</p>
          <Link to="/blog/add-new" className="user-comments__cta">✍️ Write a new blog</Link>
        </div>
      ) : (
        <div className="user-comments__groups">
          {groups.map((group) => (
            <section key={group.blogId} className="user-comments__group">
              <h2 className="user-comments__blog-title">
                <Link to={`/blog/${group.blogId}`} className="user-comments__blog-link">
                  📖 {group.blogTitle}
                </Link>
                <span className="user-comments__blog-count">{group.items.length}</span>
              </h2>

              <div className="user-comments__list">
                {group.items.map((c) => (
                  <div key={c._id} className="user-comments__card">
                    <img
                      src={c.createdBy?.profileImageURL || '/images/default.png'}
                      alt={c.createdBy?.fullName}
                      className="user-comments__avatar"
                      onError={(e) => { e.currentTarget.src = '/images/default.png'; }}
                    />
                    <div className="user-comments__card-body">
                      <div className="user-comments__card-header">
                        <span className="user-comments__commenter">{c.createdBy?.fullName}</span>
                        <span className="user-comments__date">{formatDate(c.createdAt)}</span>
                      </div>
                      <p className="user-comments__text">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserComments;
