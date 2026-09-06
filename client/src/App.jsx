// ============================================================
// App.jsx — Root component
// Connects to real MongoDB via Express API on port 8000
// Vite proxy forwards /user/* and /blog/* to http://localhost:8000
// ============================================================

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home/Home';
import BlogDetail from './pages/BlogDetail/BlogDetail';
import CreatePost from './pages/CreatePost/CreatePost';
import EditPost from './pages/EditPost/EditPost';
import SignIn from './pages/SignIn/SignIn';
import SignUp from './pages/SignUp/SignUp';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';

import './styles/global.css';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // On mount: restore session from the httpOnly JWT cookie via /user/me
  useEffect(() => {
    fetch('/user/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  function handleLogin(userData) {
    setUser(userData);
  }

  async function handleLogout() {
    await fetch('/user/logout', { credentials: 'include' });
    setUser(null);
  }

  // Wait until we know auth state before rendering (prevents flash)
  if (authLoading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center',
        alignItems: 'center', height: '100vh',
        color: 'var(--color-text-muted)', fontSize: '1rem'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/"                  element={<Home user={user} />} />
        <Route path="/blog/add-new"       element={<CreatePost user={user} />} />
        <Route path="/blog/edit/:id"      element={<EditPost user={user} />} />
        <Route path="/blog/:id"           element={<BlogDetail user={user} />} />
        <Route path="/user/signin"        element={<SignIn onLogin={handleLogin} />} />
        <Route path="/user/signup"        element={<SignUp onLogin={handleLogin} />} />
        <Route path="/admin/dashboard"    element={<AdminDashboard user={user} />} />
        <Route
          path="*"
          element={
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
              <h2>404 — Page Not Found</h2>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
