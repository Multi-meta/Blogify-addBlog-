// ============================================================
// UserDashboard Page
// Route: /user/dashboard  (auth-required)
// Shows: profile card with avatar upload, personal stats, recent blogs
// Users without an uploaded photo keep the default /images/default.png
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './UserDashboard.css';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}
function formatDateShort(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ── Stat Card (supports Link navigation or same-page scroll) ──
function StatCard({ icon, label, value, sub, to, scrollTo }) {
  function handleScroll() {
    const el = document.getElementById(scrollTo);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  const inner = (
    <>
      <div className="stat-card__icon">{icon}</div>
      <div className="stat-card__value">{value ?? '—'}</div>
      <div className="stat-card__label">{label}</div>
      {sub !== undefined && sub !== null && sub !== '' && (
        <div className="stat-card__sub">{sub}</div>
      )}
      {(to || scrollTo) && <div className="stat-card__arrow">{scrollTo ? 'See below ↓' : 'View →'}</div>}
    </>
  );

  if (to)       return <Link to={to} className="stat-card stat-card--link">{inner}</Link>;
  if (scrollTo) return <button className="stat-card stat-card--link" onClick={handleScroll}>{inner}</button>;
  return <div className="stat-card">{inner}</div>;
}


// ── Main Component ────────────────────────────────────────────
function UserDashboard({ user, onUserUpdate }) {
  const navigate = useNavigate();
  const fileRef  = useRef(null);

  const [profile,        setProfile]        = useState(null);
  const [stats,          setStats]          = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingStats,   setLoadingStats]   = useState(true);
  const [uploading,      setUploading]      = useState(false);
  const [avatarError,    setAvatarError]    = useState('');

  // Guard: redirect if not logged in
  useEffect(() => {
    if (!user) navigate('/user/signin');
  }, [user, navigate]);

  // Fetch fresh user data from DB (not from JWT which may be stale).
  // On failure we fall back to the JWT user prop already in App state.
  useEffect(() => {
    if (!user) return;
    fetch('/user/profile', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { if (d.success) setProfile(d.user); })
      .catch(() => {
        // Non-critical — the user prop from the JWT is used as fallback
      })
      .finally(() => setLoadingProfile(false));
  }, [user]);

  // Fetch personal stats
  useEffect(() => {
    if (!user) return;
    fetch('/user/stats', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { if (d.success) setStats(d.stats); })
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [user]);

  // ── Avatar upload handler ──────────────────────────────────
  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setAvatarError('');

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res  = await fetch('/user/update-avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.user);
        if (onUserUpdate) onUserUpdate(data.user); // update Navbar avatar immediately
      } else {
        setAvatarError(data.error || 'Upload failed.');
      }
    } catch {
      setAvatarError('Could not reach server.');
    } finally {
      setUploading(false);
      e.target.value = ''; // allow re-selecting the same file
    }
  }

  if (!user) return null;

  // Use DB profile when available; fall back to JWT user prop so the
  // dashboard always renders something useful even when the DB fetch fails.
  const displayUser = profile || user;
  const avatarSrc   = displayUser?.profileImageURL || '/images/default.png';
  const topCat      = stats?.categoryBreakdown?.[0];

  return (
    <div className="user-dash">
      <h1 className="user-dash__heading">My Dashboard</h1>

      {/* ── Profile Card ─────────────────────────────────── */}
      <section className="user-dash__profile-card">

        {/* Avatar with hover-overlay upload button */}
        <div className="user-dash__avatar-wrap">
          <img
            src={avatarSrc}
            alt={displayUser?.fullName || 'Profile'}
            className="user-dash__avatar"
            onError={(e) => { e.currentTarget.src = '/images/default.png'; }}
          />
          <button
            className="user-dash__avatar-overlay"
            onClick={() => fileRef.current?.click()}
            title="Change profile picture"
            disabled={uploading}
            aria-label="Change profile picture"
          >
            {uploading ? '⏳' : '📷'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </div>

        {/* User info — uses DB profile when loaded, JWT user prop as instant fallback */}
        <div className="user-dash__profile-info">
          <h2 className="user-dash__name">{displayUser?.fullName}</h2>
          <p className="user-dash__email">{displayUser?.email}</p>
          {displayUser?.role === 'ADMIN' && (
            <span className="user-dash__badge user-dash__badge--admin">Admin</span>
          )}
          {profile?.createdAt && (
            <p className="user-dash__meta">Member since {formatDate(profile.createdAt)}</p>
          )}

          {avatarError && (
            <p className="user-dash__avatar-error">⚠️ {avatarError}</p>
          )}

          {/* Hint — always visible so users know they can skip uploading */}
          <p className="user-dash__avatar-hint">
            Hover over your photo and click 📷 to upload a new profile picture
            (JPEG, PNG, GIF or WebP · max 5 MB).
            If you skip this, a default picture will be used automatically.
          </p>
        </div>
      </section>


      {/* ── Statistics ───────────────────────────────────── */}
      <section className="user-dash__section">
        <h2 className="user-dash__section-title">📊 My Statistics</h2>

        {loadingStats ? (
          <p className="user-dash__meta">Loading stats...</p>
        ) : (
          <div className="user-dash__stats">
            {/* Total Blogs → scroll to recent-blogs section */}
            <StatCard
              icon="📝"
              label="Total Blogs"
              value={stats?.totalBlogs ?? 0}
              scrollTo="recent-blogs"
            />
            {/* Comments Received → /user/comments */}
            <StatCard
              icon="💬"
              label="Comments Received"
              value={stats?.totalCommentsReceived ?? 0}
              to="/user/comments"
            />
            {/* Top Blog → navigate to the blog page */}
            <StatCard
              icon="🏆"
              label="Top Blog"
              value={stats?.topBlog ? `${stats.topBlog.commentCount} comments` : '—'}
              sub={
                stats?.topBlog
                  ? <Link to={`/blog/${stats.topBlog._id}`} className="stat-card__link">{stats.topBlog.title}</Link>
                  : 'No blogs yet'
              }
              to={stats?.topBlog ? `/blog/${stats.topBlog._id}` : undefined}
            />
            {/* Top Category → home with category filter */}
            <StatCard
              icon="📂"
              label="Top Category"
              value={topCat?.category || '—'}
              sub={topCat ? `${topCat.count} blog${topCat.count !== 1 ? 's' : ''}` : ''}
              to={topCat ? `/?category=${encodeURIComponent(topCat.category)}` : undefined}
            />
          </div>
        )}
      </section>


      {/* ── Recent Blogs ─────────────────────────────────── */}
      <section id="recent-blogs" className="user-dash__section">
        <h2 className="user-dash__section-title">
          📖 Recent Blogs
          {stats !== null && (
            <span className="user-dash__count">{stats.totalBlogs}</span>
          )}
        </h2>

        {loadingStats ? (
          <p className="user-dash__meta">Loading...</p>
        ) : !stats?.recentBlogs?.length ? (
          <div className="user-dash__empty">
            <p>You haven't written any blogs yet.</p>
            <Link to="/blog/add-new" className="user-dash__cta">✍️ Write your first blog</Link>
          </div>
        ) : (
          <>
            <div className="user-dash__blog-list">
              {stats.recentBlogs.map((blog) => (
                <div key={blog._id} className="user-dash__blog-row">
                  <div className="user-dash__blog-dot" />
                  <div className="user-dash__blog-info">
                    <Link to={`/blog/${blog._id}`} className="user-dash__blog-title">
                      {blog.title}
                    </Link>
                    <span className="user-dash__blog-date">{formatDateShort(blog.createdAt)}</span>
                  </div>
                  <Link to={`/blog/edit/${blog._id}`} className="user-dash__blog-edit">
                    ✏️ Edit
                  </Link>
                </div>
              ))}
            </div>

            {stats.totalBlogs > 5 && (
              <p className="user-dash__meta" style={{ textAlign: 'center', marginTop: '1rem' }}>
                Showing 5 most recent of {stats.totalBlogs} total blogs.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default UserDashboard;
