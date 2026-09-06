// ============================================================
// Navbar Component
// Displays: Brand logo | Nav links | Auth actions
// Accepts: user (object|null), onLogout (fn)
// ============================================================

import { NavLink, Link } from 'react-router-dom';
import './Navbar.css';

function Navbar({ user, onLogout }) {
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
              <img
                src={user.profileImageURL || '/images/default.png'}
                alt={user.fullName || 'Profile'}
                className="navbar__avatar"
                onError={(e) => { e.currentTarget.src = '/images/default.png'; }}
              />
              <span className="navbar__username">{user.fullName}</span>
              <button className="navbar__btn navbar__btn--ghost" onClick={onLogout}>
                Sign Out
              </button>
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
