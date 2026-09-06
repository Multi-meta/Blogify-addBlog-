// ============================================================
// BlogDetail Page — fetches real blog + comments from MongoDB
// Route: /blog/:id
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import './BlogDetail.css';
import '../../components/RichTextEditor/RichTextEditor.css';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function BlogDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [blog, setBlog]               = useState(null);
  const [comments, setComments]       = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [submitting, setSubmitting]   = useState(false);

  // Admin: delete state
  const [deleting, setDeleting] = useState(false);

  // Report state
  const [showReport, setShowReport]   = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting]     = useState(false);
  const [reportMsg, setReportMsg]     = useState('');   // success/error feedback

  useEffect(() => {
    fetch(`/blog/${id}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setBlog(data.blog);
          setComments(data.comments);
        } else {
          setError('Blog not found.');
        }
      })
      .catch(() => setError('Could not connect to server.'))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Comment submit (unchanged) ──────────────────────────────
  async function handleCommentSubmit(e) {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/blog/comment/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: commentText }),
      });
      const data = await res.json();
      if (data.success) {
        setComments((prev) => [data.comment, ...prev]);
        setCommentText('');
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  // ── Admin: delete blog ──────────────────────────────────────
  async function handleDelete() {
    if (!window.confirm('Permanently delete this blog and all its comments?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/blog/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        navigate('/');
      } else {
        setError(data.error || 'Could not delete blog.');
      }
    } catch {
      setError('Could not connect to server.');
    } finally {
      setDeleting(false);
    }
  }

  // ── User: report blog ───────────────────────────────────────
  async function handleReport(e) {
    e.preventDefault();
    if (!reportReason.trim() || reporting) return;
    setReporting(true);
    setReportMsg('');
    try {
      const res = await fetch(`/blog/report/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: reportReason }),
      });
      const data = await res.json();
      if (data.success) {
        setReportMsg('✅ Your report has been sent to the admin. Thank you!');
        setReportReason('');
        setTimeout(() => setShowReport(false), 3000);
      } else {
        setReportMsg(`❌ ${data.error}`);
      }
    } catch {
      setReportMsg('❌ Could not send report.');
    } finally {
      setReporting(false);
    }
  }

  // ── Loading / error states ──────────────────────────────────
  if (loading) {
    return (
      <div className="blog-detail">
        <p style={{ color: 'var(--color-text-muted)', marginTop: '2rem' }}>Loading...</p>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="blog-detail">
        <p style={{ color: 'var(--color-danger)', marginTop: '2rem' }}>{error || 'Blog not found.'}</p>
        <Link to="/" style={{ marginTop: '1rem', display: 'inline-block', color: 'var(--color-primary)' }}>
          ← Back to Home
        </Link>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';

  return (
    <article className="blog-detail">

      {/* Cover Image */}
      {blog.coverImageURL && (
        <img
          src={blog.coverImageURL}
          alt={blog.title}
          className="blog-detail__cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}

      {/* Title */}
      <h1 className="blog-detail__title">{blog.title}</h1>

      {/* Author Row */}
      <div className="blog-detail__author">
        <img
          src={blog.createdBy?.profileImageURL || '/images/default.png'}
          alt={blog.createdBy?.fullName}
          className="blog-detail__avatar"
          onError={(e) => { e.currentTarget.src = '/images/default.png'; }}
        />
        <div>
          <div className="blog-detail__author-name">{blog.createdBy?.fullName}</div>
          <div className="blog-detail__date">{formatDate(blog.createdAt)}</div>
        </div>
      </div>

      {/* Body — rendered as HTML from the rich text editor */}
      <div
        className="blog-detail__body blog-body-html"
        dangerouslySetInnerHTML={{ __html: blog.body }}
      />

      {/* ── Action Bar (Admin Delete + User Report) ── */}
      {user && (
        <div className="blog-detail__actions">
          {/* Admin: Delete Blog */}
          {isAdmin && (
            <button
              className="blog-detail__btn blog-detail__btn--danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : '🗑 Delete Blog'}
            </button>
          )}

          {/* Any signed-in user: Report to Admin */}
          {!showReport ? (
            <button
              className="blog-detail__btn blog-detail__btn--report"
              onClick={() => { setShowReport(true); setReportMsg(''); }}
            >
              🚩 Report to Admin
            </button>
          ) : (
            <form className="report-form" onSubmit={handleReport}>
              <p className="report-form__label">
                What's incorrect or problematic about this blog?
              </p>
              <textarea
                className="report-form__textarea"
                rows={3}
                placeholder="Describe the issue..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                required
              />
              {reportMsg && (
                <p className={`report-form__msg ${reportMsg.startsWith('✅') ? 'report-form__msg--ok' : 'report-form__msg--err'}`}>
                  {reportMsg}
                </p>
              )}
              <div className="report-form__row">
                <button type="submit" className="blog-detail__btn blog-detail__btn--report" disabled={reporting}>
                  {reporting ? 'Sending...' : 'Submit Report'}
                </button>
                <button
                  type="button"
                  className="blog-detail__btn blog-detail__btn--ghost"
                  onClick={() => { setShowReport(false); setReportMsg(''); setReportReason(''); }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Comments (completely unchanged) ── */}
      <section className="blog-detail__comments">
        <h2 className="blog-detail__comments-title">
          Comments ({comments.length})
        </h2>

        {user ? (
          <form className="comment-form" onSubmit={handleCommentSubmit}>
            <input
              type="text"
              className="comment-form__input"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button type="submit" className="comment-form__btn" disabled={submitting}>
              {submitting ? '...' : 'Add'}
            </button>
          </form>
        ) : (
          <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted)' }}>
            <Link to="/user/signin" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              Sign in
            </Link>{' '}to leave a comment.
          </p>
        )}

        <div className="comment-list">
          {comments.map((comment) => (
            <div key={comment._id} className="comment-item">
              <img
                src={comment.createdBy?.profileImageURL || '/images/default.png'}
                alt={comment.createdBy?.fullName}
                className="comment-item__avatar"
                onError={(e) => { e.currentTarget.src = '/images/default.png'; }}
              />
              <div className="comment-item__content">
                <div className="comment-item__header">
                  <span className="comment-item__name">{comment.createdBy?.fullName}</span>
                  <span className="comment-item__date">{formatDate(comment.createdAt)}</span>
                </div>
                <p className="comment-item__text">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}

export default BlogDetail;
