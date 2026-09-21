// ============================================================
// Admin — Travel & Subscriptions   Route: /admin/travel  (ADMIN only)
// Tabs:  Plans · Destinations · Community Guides · Guide Reports · Subscribers
// Everything the public pages show is created here — nothing is hardcoded.
// Destination content and rate cards are edited on /admin/travel/destinations/:id
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, rupees, formatDate } from '../../utils/api';
import '../AdminDashboard/AdminDashboard.css';
import { GuidesTab, ReportsTab } from './AdminGuides';
import '../Travel/Travel.css';
import './AdminTravel.css';

// ── Plan create / edit form ───────────────────────────────────
function PlanForm({ plan, onSaved, onCancel }) {
  const [f, setF] = useState(() => ({
    name: plan?.name ?? '',
    price: plan?.price ?? '',
    durationDays: plan?.durationDays ?? 30,
    rank: plan?.rank ?? '',
    description: plan?.description ?? '',
    features: (plan?.features ?? []).join('\n'),
    isActive: plan?.isActive ?? true,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (key) => (e) =>
    setF((prev) => ({ ...prev, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api(plan ? `/admin/plans/${plan._id}` : '/admin/plans', { method: plan ? 'PUT' : 'POST', body: f });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="at-form" onSubmit={submit}>
      {error && <div className="admin-error at-field--full" style={{ margin: 0 }}>{error}</div>}
      <div className="at-field">
        <label htmlFor="p-name">Plan name</label>
        <input id="p-name" type="text" value={f.name} onChange={set('name')} required />
      </div>
      <div className="at-field">
        <label htmlFor="p-price">Price (₹)</label>
        <input id="p-price" type="number" min="0" step="1" value={f.price} onChange={set('price')} required />
      </div>
      <div className="at-field">
        <label htmlFor="p-rank">Access level (rank)</label>
        <input id="p-rank" type="number" min="1" step="1" value={f.rank} onChange={set('rank')} required />
        <span className="at-field__hint">Higher rank includes everything from lower ranks (1 = lowest).</span>
      </div>
      <div className="at-field">
        <label htmlFor="p-days">Duration (days)</label>
        <input id="p-days" type="number" min="1" step="1" value={f.durationDays} onChange={set('durationDays')} required />
      </div>
      <div className="at-field at-field--full">
        <label htmlFor="p-desc">Short description</label>
        <input id="p-desc" type="text" value={f.description} onChange={set('description')} />
      </div>
      <div className="at-field at-field--full">
        <label htmlFor="p-features">Features (one per line — shown on the plan card)</label>
        <textarea id="p-features" rows={6} value={f.features} onChange={set('features')} />
      </div>
      <label className="at-check at-field--full">
        <input type="checkbox" checked={f.isActive} onChange={set('isActive')} />
        Available to buy (untick to hide it; existing subscribers keep access)
      </label>
      <div className="at-form__actions">
        <button className="admin-btn at-btn-primary" disabled={saving}>{saving ? 'Saving…' : plan ? 'Save plan' : 'Create plan'}</button>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

// ── Plans tab ─────────────────────────────────────────────────
function PlansTab({ setError }) {
  const [plans, setPlans]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // plan id | 'new' | null

  const load = useCallback(() => {
    api('/admin/plans')
      .then((d) => setPlans(d.plans))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [setError]);
  useEffect(() => { load(); }, [load]);

  async function remove(plan) {
    if (!window.confirm(`Delete the "${plan.name}" plan?`)) return;
    setError('');
    try {
      await api(`/admin/plans/${plan._id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const saved = () => { setEditing(null); load(); };

  return (
    <>
      <div className="at-toolbar">
        <span className="admin-page__sub" style={{ margin: 0 }}>
          Content is unlocked by <strong>access level</strong>: a plan sees everything at its level and below.
        </span>
        {editing !== 'new' && (
          <button className="admin-btn at-btn-primary" onClick={() => setEditing('new')}>+ New plan</button>
        )}
      </div>

      {editing === 'new' && <PlanForm onSaved={saved} onCancel={() => setEditing(null)} />}

      {loading ? <p className="admin-empty">Loading plans…</p> : plans.length === 0 ? (
        <p className="admin-empty">No plans yet.</p>
      ) : plans.map((plan) => (
        <div key={plan._id} className={`at-card${plan.isActive ? '' : ' at-card--off'}`}>
          <div className="at-row">
            <div className="at-row__main">
              <div className="at-row__title">
                {plan.name} — {rupees(plan.price)} / {plan.durationDays} days
                <span className="at-pill">Level {plan.rank}</span>
                {!plan.isActive && <span className="at-pill at-pill--warn">Hidden</span>}
              </div>
              <div className="at-row__meta">
                {plan.activeSubscribers} active subscriber{plan.activeSubscribers !== 1 ? 's' : ''}
                {plan.description && ` · ${plan.description}`}
              </div>
              {plan.features.length > 0 && (
                <ul className="at-features">{plan.features.map((x, i) => <li key={i}>{x}</li>)}</ul>
              )}
            </div>
            <div className="at-row__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setEditing(plan._id)}>Edit</button>
              <button className="admin-btn admin-btn--danger" onClick={() => remove(plan)}>Delete</button>
            </div>
          </div>
          {editing === plan._id && <PlanForm plan={plan} onSaved={saved} onCancel={() => setEditing(null)} />}
        </div>
      ))}
    </>
  );
}

// ── Destinations tab ──────────────────────────────────────────
function DestinationsTab({ setError }) {
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle]     = useState('');
  const [location, setLocation] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    api('/admin/destinations')
      .then((d) => setItems(d.destinations))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [setError]);
  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const d = await api('/admin/destinations', { method: 'POST', body: { title, location } });
      navigate(`/admin/travel/destinations/${d.destination._id}`); // straight to filling it in
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Delete "${item.title}" and all its travel content and rate card?`)) return;
    setError('');
    try {
      await api(`/admin/destinations/${item._id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <form className="at-form" onSubmit={create}>
        <div className="at-field">
          <label htmlFor="d-title">New destination</label>
          <input id="d-title" type="text" placeholder="e.g. Warangal Fort" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="at-field">
          <label htmlFor="d-loc">Location</label>
          <input id="d-loc" type="text" placeholder="e.g. Telangana" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="at-form__actions">
          <button className="admin-btn at-btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create & add content'}</button>
        </div>
      </form>

      {loading ? <p className="admin-empty">Loading…</p> : items.length === 0 ? (
        <p className="admin-empty">No destinations yet — create the first one above.</p>
      ) : items.map((d) => (
        <div key={d._id} className={`at-card${d.isPublished ? '' : ' at-card--off'}`}>
          <div className="at-row">
            <div className="at-row__main">
              <div className="at-row__title">
                {d.title}
                {!d.isPublished && <span className="at-pill at-pill--warn">Draft</span>}
              </div>
              <div className="at-row__meta">
                /travel/{d.slug} · {d.contentCount} content item{d.contentCount !== 1 ? 's' : ''} · {d.rateCardCount} rate card row{d.rateCardCount !== 1 ? 's' : ''}
                {d.blogId?.title && <> · linked to “{d.blogId.title}”</>}
              </div>
            </div>
            <div className="at-row__actions">
              <Link to={`/admin/travel/destinations/${d._id}`} className="admin-btn at-btn-primary" style={{ textDecoration: 'none' }}>Manage</Link>
              <Link to={`/travel/${d.slug}`} className="admin-btn admin-btn--ghost" style={{ textDecoration: 'none' }}>Preview</Link>
              <button className="admin-btn admin-btn--danger" onClick={() => remove(d)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Subscribers tab ───────────────────────────────────────────
function SubscribersTab({ setError }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/admin/subscriptions')
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [setError]);

  if (loading) return <p className="admin-empty">Loading…</p>;
  if (!data) return null;
  const { summary, subscriptions, payments } = data;

  return (
    <>
      <div className="at-stats">
        <div className="at-stat"><div className="at-stat__value">{summary.activeSubscribers}</div><div className="at-stat__label">Active subscribers</div></div>
        <div className="at-stat"><div className="at-stat__value">{rupees(summary.revenueTotal)}</div><div className="at-stat__label">Total revenue ({summary.paidPayments} payments)</div></div>
        <div className="at-stat"><div className="at-stat__value">{rupees(summary.revenueLast30Days)}</div><div className="at-stat__label">Last 30 days</div></div>
        <div className="at-stat"><div className="at-stat__value">{rupees(summary.refundedTotal || 0)}</div><div className="at-stat__label">Refunded ({summary.refundedCount || 0}). Not counted in revenue</div></div>
      </div>

      <h3 className="admin-section__title">Subscriptions</h3>
      {subscriptions.length === 0 ? <p className="admin-empty">No subscriptions yet.</p> : (
        <div className="tv-table-wrap" style={{ marginBottom: '2rem' }}>
          <table className="tv-table">
            <thead><tr><th>User</th><th>Plan</th><th>Status</th><th>Started</th><th>Expires</th><th className="tv-num">Paid</th></tr></thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr key={s._id}>
                  <td>{s.user?.fullName || '—'}<div className="tv-muted">{s.user?.email}</div></td>
                  <td>{s.planName}{s.grantedByAdmin && <span className="at-pill">admin-granted</span>}</td>
                  <td><span className={`tv-status tv-status--${s.status === 'active' ? 'paid' : 'refunded'}`}>{s.status}</span></td>
                  <td>{formatDate(s.startDate)}</td>
                  <td>{formatDate(s.expiryDate)}</td>
                  <td className="tv-num">{rupees(s.pricePaid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="admin-section__title">Payments</h3>
      {payments.length === 0 ? <p className="admin-empty">No payments yet.</p> : (
        <div className="tv-table-wrap">
          <table className="tv-table">
            <thead><tr><th>Date</th><th>User</th><th>Plan</th><th>Type</th><th>Status</th><th>Gateway</th><th className="tv-num">Amount</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td>{formatDate(p.paidAt || p.createdAt)}</td>
                  <td>{p.user?.fullName || '—'}</td>
                  <td>{p.planName}</td>
                  <td style={{ textTransform: 'capitalize' }}>{p.type}</td>
                  <td><span className={`tv-status tv-status--${p.status}`}>{p.status}</span></td>
                  <td>{p.gateway}</td>
                  <td className="tv-num">{rupees(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Users & plans tab ─────────────────────────────────────────
function UsersTab({ setError }) {
  const [users, setUsers]   = useState(null);
  const [plans, setPlans]   = useState([]);
  const [query, setQuery]   = useState('');
  const [busy, setBusy]     = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    Promise.all([api('/admin/user-subscriptions'), api('/admin/plans')])
      .then(([u, p]) => { setUsers(u.users); setPlans(p.plans.filter((x) => x.isActive)); })
      .catch((err) => setError(err.message));
  }, [setError]);
  useEffect(() => { load(); }, [load]);

  async function setPlan(u, planId) {
    const label = planId ? plans.find((p) => p._id === planId)?.name : 'no plan';
    const paid = u.subscription && !u.subscription.grantedByAdmin;
    const warn = paid ? '\n\nTheir current PAID plan will be ended without a refund.' : '';
    if (!window.confirm(`Set ${u.fullName} to ${label}?${warn}`)) return;
    setBusy(u._id);
    setError('');
    setNotice('');
    try {
      await api(`/admin/user-subscriptions/${u._id}`, { method: 'PUT', body: { planId: planId || null } });
      setNotice(`${u.fullName} is now on: ${label}. This is an admin grant. No payment was created.`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  if (!users) return <p className="admin-empty">Loading…</p>;
  const q = query.trim().toLowerCase();
  const shown = q ? users.filter((u) => `${u.fullName} ${u.email}`.toLowerCase().includes(q)) : users;

  return (
    <>
      <div className="at-note">
        Change any user&apos;s plan for testing or support. An admin grant creates <strong>no payment</strong>, earns
        no revenue and can&apos;t be refunded. Real purchases still go through checkout.
      </div>
      {notice && <div className="at-notice">{notice}</div>}
      <div className="at-field" style={{ maxWidth: 360, marginBottom: '1rem' }}>
        <input type="text" placeholder="Search name or email…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="tv-table-wrap">
        <table className="tv-table">
          <thead><tr><th>User</th><th>Role</th><th>Current plan</th><th>Expires</th><th>Set plan</th></tr></thead>
          <tbody>
            {shown.map((u) => {
              const s = u.subscription;
              return (
                <tr key={u._id}>
                  <td>{u.fullName}<div className="tv-muted">{u.email}</div></td>
                  <td>{u.role}</td>
                  <td>
                    {s ? <>{s.planName} <span className="tv-muted">({rupees(s.pricePaid)} paid)</span>{s.grantedByAdmin && <span className="at-pill">admin-granted</span>}</> : <span className="tv-muted">No subscription</span>}
                  </td>
                  <td>{s ? formatDate(s.expiryDate) : '—'}</td>
                  <td>
                    <select
                      disabled={busy === u._id}
                      value={s ? s.plan : ''}
                      onChange={(e) => setPlan(u, e.target.value)}
                      aria-label={`Plan for ${u.fullName}`}
                    >
                      <option value="">No subscription</option>
                      {plans.map((p) => <option key={p._id} value={p._id}>{p.name} · {rupees(p.price)}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────
const TABS = [
  { key: 'plans', label: '💳 Plans' },
  { key: 'destinations', label: '🧳 Destinations' },
  { key: 'guides', label: '📝 Community Guides' },
  { key: 'reports', label: '🚩 Guide Reports' },
  { key: 'users', label: '👤 Users & Plans' },
  { key: 'subscribers', label: '👥 Subscribers & Revenue' },
];

function AdminTravel({ user }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [tab, setTab]     = useState(TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'plans');
  const [error, setError] = useState('');
  const [focusGuide, setFocusGuide] = useState(null); // guide to open when jumping from a report

  useEffect(() => {
    if (user === null)                 { navigate('/user/signin'); return; }
    if (user && user.role !== 'ADMIN') { navigate('/'); }
  }, [user, navigate]);

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="admin-page">
      <Link to="/admin/dashboard" className="at-back">← Back to Dashboard</Link>
      <h1 className="admin-page__heading">🧳 Travel &amp; Subscriptions</h1>
      <p className="admin-page__sub">Create plans, destinations, travel content and rate cards. Changes go live immediately.</p>

      {error && <div className="admin-error">⚠️ {error}</div>}

      <div className="at-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`at-tab${tab === t.key ? ' at-tab--active' : ''}`}
            onClick={() => { setTab(t.key); setError(''); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plans' && <PlansTab setError={setError} />}
      {tab === 'destinations' && <DestinationsTab setError={setError} />}
      {tab === 'guides' && <GuidesTab key={focusGuide || 'all'} setError={setError} focusId={focusGuide} />}
      {tab === 'reports' && (
        <ReportsTab setError={setError} onEditGuide={(id) => { setFocusGuide(id); setTab('guides'); setError(''); }} />
      )}
      {tab === 'users' && <UsersTab setError={setError} />}
      {tab === 'subscribers' && <SubscribersTab setError={setError} />}
    </div>
  );
}

export default AdminTravel;
