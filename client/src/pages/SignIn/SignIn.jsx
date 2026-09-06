// ============================================================
// SignIn Page — authenticates against MongoDB via Express
// Route: /user/signin
// ============================================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../SignIn/Auth.css';

function SignIn({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/user/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',         // sends/receives the httpOnly JWT cookie
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onLogin(data.user);
        navigate('/');
      } else {
        setError(data.error || 'Incorrect email or password.');
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
        <h2 className="auth-card__heading">Welcome back</h2>
        <p className="auth-card__subtext">Sign in with your Blogify account</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
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
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="auth-form__submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-card__footer">
          Don't have an account?{' '}
          <Link to="/user/signup">Create one</Link>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
