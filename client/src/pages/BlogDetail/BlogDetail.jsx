// ============================================================
// BlogDetail Page — fetches real blog + comments from MongoDB
// Route: /blog/:id
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { getFallbackCoverImage } from '../../data/categories';
import './BlogDetail.css';
import '../../components/RichTextEditor/RichTextEditor.css';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

// Put a "Travel Guide" button right under the heading of each destination linked
// to this post (the first heading that mentions the destination's name, e.g.
// "1. Warangal Fort – Explore The Ruins"). Destinations whose button the author
// already placed by hand, or that match no heading, are left to the fallback
// box below the article. `html` must already be sanitized.
function addTravelGuideButtons(html, destinations) {
  const placed = new Set();
  if (destinations.length === 0) return { html, placed };

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const isHeading = (el) =>
    /^H[1-6]$/.test(el.tagName) ||
    (el.tagName === 'P' && el.children.length === 1 && /^(STRONG|B)$/.test(el.children[0].tagName) &&
      el.textContent.trim() === el.children[0].textContent.trim());
  const headings = [...doc.body.children].filter(isHeading);

  destinations.forEach((d) => {
    if (doc.querySelector(`a[href="/travel/${d.slug}"]`)) { placed.add(d.slug); return; }
    const name = d.title.trim().toLowerCase();
    const heading = name && headings.find((h) => h.textContent.toLowerCase().includes(name));
    if (!heading) return;

    const p = doc.createElement('p');
    const a = doc.createElement('a');
    a.setAttribute('href', `/travel/${d.slug}`);
    a.textContent = 'Travel Guide';
    p.appendChild(a);
    heading.after(p);
    placed.add(d.slug);
  });

  return { html: doc.body.innerHTML, placed };
}

function BlogDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [blog, setBlog]               = useState(null);
  const [comments, setComments]       = useState([]);
  const [destinations, setDestinations] = useState([]); // travel plans linked to this post
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

  // Admin: inline comment editing
  const [editingId, setEditingId]       = useState(null);
  const [editText, setEditText]         = useState('');
  const [savingEdit, setSavingEdit]     = useState(false);
  const [commentError, setCommentError] = useState('');

  // Blog author: reporting a comment on their own blog
  const [reportingId, setReportingId]     = useState(null);
  const [commentReason, setCommentReason] = useState('');
  const [sendingCommentReport, setSendingCommentReport] = useState(false);
  const [commentReportMsg, setCommentReportMsg] = useState({ id: null, text: '', ok: false });

  useEffect(() => {
    fetch(`/blog/${id}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setBlog(data.blog);
          setComments(data.comments);
          setDestinations(data.destinations || []);
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

  // ── Admin: edit any comment ─────────────────────────────────
  function startEdit(comment) {
    setEditingId(comment._id);
    setEditText(comment.content);
    setCommentError('');
  }

  async function handleEditSave(e) {
    e.preventDefault();
    if (!editText.trim() || savingEdit) return;
    setSavingEdit(true);
    setCommentError('');
    try {
      const res = await fetch(`/blog/comment/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: editText }),
      });
      const data = await res.json();
      if (data.success) {
        setComments((prev) => prev.map((c) => (c._id === editingId ? data.comment : c)));
        setEditingId(null);
      } else {
        setCommentError(data.error || 'Could not update comment.');
      }
    } catch {
      setCommentError('Could not connect to server.');
    } finally {
      setSavingEdit(false);
    }
  }

  // ── Blog author: report a comment on their own blog ─────────
  async function handleCommentReport(e) {
    e.preventDefault();
    if (!commentReason.trim() || sendingCommentReport) return;
    setSendingCommentReport(true);
    const commentId = reportingId;
    try {
      const res = await fetch(`/blog/comment/${commentId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: commentReason }),
      });
      const data = await res.json();
      if (data.success) {
        setCommentReportMsg({ id: commentId, text: '✅ Comment reported to the admin.', ok: true });
        setReportingId(null);
        setCommentReason('');
      } else {
        setCommentReportMsg({ id: commentId, text: `❌ ${data.error}`, ok: false });
      }
    } catch {
      setCommentReportMsg({ id: commentId, text: '❌ Could not send report.', ok: false });
    } finally {
      setSendingCommentReport(false);
    }
  }

  // Body HTML with a Travel Guide button under each linked destination's heading
  const body = useMemo(
    () => addTravelGuideButtons(DOMPurify.sanitize(blog?.body || ''), destinations),
    [blog, destinations]
  );

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

  // "Travel Guide" buttons live inside the post body as links to /travel/<slug>.
  // Open them through the router (no full page reload). The travel page itself
  // handles the sign-in / subscription gate.
  function handleBodyClick(e) {
    const link = e.target.closest?.('a[href^="/travel/"]');
    if (!link) return;
    e.preventDefault();
    navigate(link.getAttribute('href'));
  }

  // Linked destinations that got no button inside the article text
  const extraTrips = destinations.filter((d) => !body.placed.has(d.slug));
  const isAuthor = !!user && String(blog.createdBy?._id) === String(user._id);

  return (
    <article className="blog-detail">

      {/* Cover Image */}
      <img
        src={blog.coverImageURL || getFallbackCoverImage(blog.category, blog.subcategory)}
        alt={blog.title}
        className="blog-detail__cover"
        onError={(e) => {
          e.currentTarget.src = getFallbackCoverImage(blog.category, blog.subcategory);
        }}
      />

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

      {/* Body — rendered as HTML from the rich text editor. The API accepts
          any HTML, so scripts and event handlers are stripped first */}
      <div
        className="blog-detail__body blog-body-html"
        onClick={handleBodyClick}
        dangerouslySetInnerHTML={{ __html: body.html }}
      />

      {/* Travel plans linked to this post but not placed inline */}
      {extraTrips.length > 0 && (
        <div className="trip-cta">
          <div className="trip-cta__title">🧳 Planning a trip? Open the travel guide</div>
          <div className="trip-cta__buttons">
            {extraTrips.map((d) => (
              <Link key={d._id} to={`/travel/${d.slug}`} className="trip-cta__btn">
                Travel Guide · {d.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Action Bar (Admin Delete + User Report) ── */}
      {user && (
        <div className="blog-detail__actions">
          {/* Author or Admin: Edit Blog */}
          {(isAuthor || isAdmin) && (
            <Link to={`/blog/edit/${blog._id}`} className="blog-detail__btn blog-detail__btn--edit">
              ✏️ Edit Blog
            </Link>
          )}

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

                {editingId === comment._id ? (
                  <form className="comment-edit" onSubmit={handleEditSave}>
                    <textarea
                      className="report-form__textarea"
                      rows={3}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      required
                    />
                    {commentError && (
                      <p className="report-form__msg report-form__msg--err">{commentError}</p>
                    )}
                    <div className="report-form__row">
                      <button type="submit" className="blog-detail__btn blog-detail__btn--edit" disabled={savingEdit}>
                        {savingEdit ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="blog-detail__btn blog-detail__btn--ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="comment-item__text">{comment.content}</p>
                )}

                {/* Admin can edit any comment; a blog's author can report comments on it */}
                {editingId !== comment._id && (isAdmin || isAuthor) && (
                  <div className="comment-item__actions">
                    {isAdmin && (
                      <button type="button" className="comment-item__action" onClick={() => startEdit(comment)}>
                        ✏️ Edit
                      </button>
                    )}
                    {isAuthor && reportingId !== comment._id && (
                      <button
                        type="button"
                        className="comment-item__action"
                        onClick={() => {
                          setReportingId(comment._id);
                          setCommentReason('');
                          setCommentReportMsg({ id: null, text: '', ok: false });
                        }}
                      >
                        🚩 Report
                      </button>
                    )}
                  </div>
                )}

                {isAuthor && reportingId === comment._id && (
                  <form className="report-form" onSubmit={handleCommentReport}>
                    <textarea
                      className="report-form__textarea"
                      rows={2}
                      placeholder="Why are you reporting this comment?"
                      value={commentReason}
                      onChange={(e) => setCommentReason(e.target.value)}
                      required
                    />
                    <div className="report-form__row">
                      <button type="submit" className="blog-detail__btn blog-detail__btn--report" disabled={sendingCommentReport}>
                        {sendingCommentReport ? 'Sending...' : 'Submit Report'}
                      </button>
                      <button
                        type="button"
                        className="blog-detail__btn blog-detail__btn--ghost"
                        onClick={() => setReportingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {commentReportMsg.id === comment._id && commentReportMsg.text && (
                  <p className={`report-form__msg ${commentReportMsg.ok ? 'report-form__msg--ok' : 'report-form__msg--err'}`}>
                    {commentReportMsg.text}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}

export default BlogDetail;
