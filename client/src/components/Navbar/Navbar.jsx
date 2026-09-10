// ============================================================
// Navbar Component
// Displays: Brand logo | Nav links | Auth actions
// User avatar opens a dropdown with My Blogs + Edit links
// Accepts: user (object|null), onLogout (fn)
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { NavLink, Link } from 'react-router-dom';
import './Navbar.css';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function Navbar({ user, onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [blogs, setBlogs]               = useState([]);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const dropdownRef                     = useRef(null);

  // Fetch user's blogs when dropdown opens
  useEffect(() => {
    if (!dropdownOpen || !user) return;
    setLoadingBlogs(true);
    fetch('/api/my-blogs', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.success) setBlogs(d.blogs); })
      .catch(() => {})
      .finally(() => setLoadingBlogs(false));
  }, [dropdownOpen, user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar__inner">

        {/* Brand */}
        <Link to="/" className="navbar__brand">
          Blogify
        </Link>

        {/* Navigation Links */}
        <ul className="navbar__links">
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                'navbar__link' + (isActive ? ' navbar__link--active' : '')
              }
            >
              Home
            </NavLink>
          </li>

          {user && (
            <li>
              <NavLink
                to="/blog/add-new"
                className={({ isActive }) =>
                  'navbar__link' + (isActive ? ' navbar__link--active' : '')
                }
              >
                Create Post
              </NavLink>
            </li>
          )}

          {user?.role === 'ADMIN' && (
            <li>
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  'navbar__link navbar__link--admin' + (isActive ? ' navbar__link--active' : '')
                }
              >
                ⚙️ Admin
              </NavLink>
            </li>
          )}
        </ul>

        {/* Auth Actions */}
        <div className="navbar__auth">
          {user ? (
            <>
              {/* Clickable avatar + name — opens dropdown */}
              <div className="navbar__profile-wrap" ref={dropdownRef}>
                <button
                  className="navbar__profile-btn"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  aria-expanded={dropdownOpen}
                  aria-label="My profile and blogs"
                >
                  <img
                    src={user.profileImageURL || '/images/default.png'}
                    alt={user.fullName || 'Profile'}
                    className="navbar__avatar"
                    onError={(e) => { e.currentTarget.src = '/images/default.png'; }}
                  />
                  <span className="navbar__username">{user.fullName}</span>
                  <span className="navbar__chevron">{dropdownOpen ? '▲' : '▼'}</span>
                </button>

                {/* Dropdown panel */}
                {dropdownOpen && (
                  <div className="navbar__dropdown">
                    {/* Profile header */}
                    <div className="navbar__dropdown-header">
                      <img
                        src={user.profileImageURL || '/images/default.png'}
                        alt={user.fullName}
                        className="navbar__dropdown-avatar"
                        onError={(e) => { e.currentTarget.src = '/images/default.png'; }}
                      />
                      <div>
                        <p className="navbar__dropdown-name">{user.fullName}</p>
                        {user.role === 'ADMIN' && (
                          <span className="navbar__dropdown-badge">Admin</span>
                        )}
                      </div>
                    </div>

                    <div className="navbar__dropdown-divider" />

                    {/* My Blogs list */}
                    <p className="navbar__dropdown-section-title">
                      My Blogs
                      {!loadingBlogs && (
                        <span className="navbar__dropdown-count">{blogs.length}</span>
                      )}
                    </p>

                    {loadingBlogs ? (
                      <p className="navbar__dropdown-meta">Loading...</p>
                    ) : blogs.length === 0 ? (
                      <div>
                        <p className="navbar__dropdown-meta">No blogs yet.</p>
                        <Link
                          to="/blog/add-new"
                          className="navbar__dropdown-create"
                          onClick={() => setDropdownOpen(false)}
                        >
                          + Write your first blog
                        </Link>
                      </div>
                    ) : (
                      <ul className="navbar__dropdown-list">
                        {blogs.map((blog) => (
                          <li key={blog._id} className="navbar__dropdown-item">
                            <div className="navbar__dropdown-dot" />
                            <div className="navbar__dropdown-info">
                              <Link
                                to={`/blog/${blog._id}`}
                                className="navbar__dropdown-blog-title"
                                title={blog.title}
                                onClick={() => setDropdownOpen(false)}
                              >
                                {blog.title}
                              </Link>
                              <div className="navbar__dropdown-blog-footer">
                                <span className="navbar__dropdown-date">
                                  {formatDate(blog.createdAt)}
                                </span>
                                <Link
                                  to={`/blog/edit/${blog._id}`}
                                  className="navbar__dropdown-edit"
                                  onClick={() => setDropdownOpen(false)}
                                >
                                  ✏️ Edit
                                </Link>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="navbar__dropdown-divider" />

                    {/* Sign out */}
                    <button
                      className="navbar__dropdown-signout"
                      onClick={() => { setDropdownOpen(false); onLogout(); }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/user/signin" className="navbar__btn navbar__btn--ghost">
                Sign In
              </Link>
              <Link to="/user/signup" className="navbar__btn navbar__btn--solid">
                Create Account
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}

export default Navbar;
