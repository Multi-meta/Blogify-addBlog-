// ============================================================
// AdminUsers Page — /admin/users
// Searchable table of all registered users with blog counts
// ============================================================

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './AdminDetail.css';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function AdminUsers({ user }) {
  const navigate = useNavigate();
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    if (user === null)                 { navigate('/user/signin'); return; }
    if (user && user.role !== 'ADMIN') { navigate('/'); }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    fetch('/admin/users', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.success) setUsers(d.users); else setError(d.error); })
      .catch(() => setError('Could not load users.'))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || user.role !== 'ADMIN') return null;

  const q        = search.toLowerCase();
  const filtered = users.filter((u) =>
    u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  );

  return (
    <div className="admin-detail">
      <div className="admin-detail__header">
        <Link to="/admin/dashboard" className="admin-detail__back">← Back to Dashboard</Link>
        <h1 className="admin-detail__heading">👥 All Users</h1>
        <p className="admin-detail__sub">{users.length} registered users on Blogify</p>
      </div>

      {error && <div className="admin-detail__error">⚠️ {error}</div>}

      <div className="admin-detail__toolbar">
        <input
          className="admin-detail__search"
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="admin-detail__count">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <p className="admin-detail__empty">Loading users…</p>
      ) : filtered.length === 0 ? (
        <p className="admin-detail__empty">No users match your search.</p>
      ) : (
        <div className="admin-detail__table-wrap">
          <table className="admin-detail__table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th style={{ textAlign: 'center' }}>Blogs</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div className="admin-detail__user-cell">
                      <img
                        src={u.profileImageURL || '/images/default.png'}
                        alt={u.fullName}
                        className="admin-detail__avatar"
                        onError={(e) => { e.currentTarget.src = '/images/default.png'; }}
                      />
                      <span className="admin-detail__user-name">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="admin-detail__email">{u.email}</td>
                  <td>
                    <span className={`admin-detail__role-badge${u.role === 'ADMIN' ? ' admin-detail__role-badge--admin' : ''}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="admin-detail__num">{u.blogCount}</td>
                  <td className="admin-detail__date">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
