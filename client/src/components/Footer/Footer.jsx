// ============================================================
// Footer Component
// Displays: Brand + tagline | Explore links | Writing call-to-action
// Bottom bar: copyright + social links
// Accepts: user (object|null)
// ============================================================

import { Link } from 'react-router-dom';
import './Footer.css';

const SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://www.instagram.com/utkarsh_yuvraj16/', icon: 'instagram' },
  { label: 'GitHub',    href: 'https://github.com/Multi-meta/Blogify-addBlog-', icon: 'github' },
];

const ICONS = {
  github: (
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  ),
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </>
  ),
};

function Footer({ user }) {
  return (
    <footer className="footer">
      <div className="footer__inner">

        <div className="footer__top">
          {/* Brand + tagline */}
          <div className="footer__about">
            <Link to="/" className="footer__brand">
              Blogify
            </Link>
            <p className="footer__tagline">
              Stories on travel, technology, food and everything in between
              written by people who love to share them.
            </p>
          </div>

          {/* Explore links */}
          <nav className="footer__nav" aria-label="Footer">
            <h2 className="footer__heading">Explore</h2>
            <ul className="footer__links">
              <li><Link to="/" className="footer__link">Home</Link></li>
              <li><Link to="/blog/add-new" className="footer__link">Write a Post</Link></li>
              {user?.role === 'ADMIN' && (
                <li><Link to="/admin/dashboard" className="footer__link">Admin Dashboard</Link></li>
              )}
              {!user && (
                <>
                  <li><Link to="/user/signin" className="footer__link">Sign In</Link></li>
                  <li><Link to="/user/signup" className="footer__link">Create Account</Link></li>
                </>
              )}
            </ul>
          </nav>

          {/* Call to action */}
          <div className="footer__cta">
            <h2 className="footer__heading">Share Your Story</h2>
            <p className="footer__cta-text">
              Got something worth reading? Publish it on Blogify in minutes.
            </p>
            <Link to={user ? '/blog/add-new' : '/user/signup'} className="footer__cta-btn">
              {user ? 'Start Writing' : 'Join Blogify'}
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer__bottom">
          <p className="footer__copyright">
            &copy; {new Date().getFullYear()} Blogify. All rights reserved.
          </p>

          <div className="footer__socials">
            {SOCIAL_LINKS.map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="footer__social"
                aria-label={label}
                title={label}
              >
                <svg
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                >
                  {ICONS[icon]}
                </svg>
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}

export default Footer;
