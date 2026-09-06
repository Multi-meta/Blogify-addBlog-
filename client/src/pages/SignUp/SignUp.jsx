// ============================================================
// SignUp Page — creates a real account in MongoDB via Express
// Route: /user/signup
// ============================================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../SignIn/Auth.css';

function SignUp({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/user/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',         // receives the httpOnly JWT cookie
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onLogin(data.user);
        navigate('/');
      } else {
        setError(data.error || 'Could not create account. Email may already be in use.');
      }
    } catch {
      setError('Cannot reach server. Please start Express on port 8000.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">Blogify</div>
        <h2 className="auth-card__heading">Create an account</h2>
        <p className="auth-card__subtext">Join Blogify and start writing</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form__field">
            <label className="auth-form__label" htmlFor="fullName">Full Name</label>
            <input
              id="fullName" name="fullName" type="text"
              className="auth-form__input"
              placeholder="Your full name"
              value={form.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="auth-form__field">
            <label className="auth-form__label" htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email"
              className="auth-form__input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="auth-form__field">
            <label className="auth-form__label" htmlFor="password">Password</label>
            <input
              id="password" name="password" type="password"
              className="auth-form__input"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="auth-form__submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-card__footer">
          Already have an account?{' '}
          <Link to="/user/signin">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
