// ============================================================
// Admin — community travel guides and the reports about them.
// Two tabs of /admin/travel:
//   GuidesTab   review, edit, approve / reject, remove guides written by users;
//               see the revenue each one earns
//   ReportsTab  review subscribers' reports, judge the guide, refund 100%
// Revenue-sharing figures live here only — users never see them.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { api, rupees } from '../../utils/api';
import GuideForm from '../../components/GuideForm/GuideForm';
import '../Travel/Travel.css';
import './AdminTravel.css';

const STATUS_PILL = {
  pending:  'at-pill at-pill--warn',
  approved: 'at-pill at-pill--ok',
  rejected: 'at-pill',
};

const fullDate = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

// ── Community guides ──────────────────────────────────────────
export function GuidesTab({ setError, focusId }) {
  const [data, setData]       = useState(null);
  const [editing, setEditing] = useState(focusId || null); // guide id being edited
  const [filter, setFilter]   = useState('all');
  const [busy, setBusy]       = useState('');

  const load = useCallback(() => {
    api('/admin/guides').then(setData).catch((err) => setError(err.message));
  }, [setError]);
  useEffect(() => { load(); }, [load]);

  async function remove(guide) {
    if (!window.confirm(`Remove "${guide.title}"? It disappears for everyone. Reports about it stay so you can still rule on them.`)) return;
    setBusy(guide._id);
    setError('');
    try {
      await api(`/admin/guides/${guide._id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  if (!data) return <p className="tv-muted">Loading…</p>;

  const { guides, plans, categories, revenue } = data;
  const shown = filter === 'all' ? guides : guides.filter((g) => g.status === filter);
  const authorsOwed = guides.reduce((sum, g) => sum + g.revenue.authorShare, 0);
  const cheapest = plans[0];

  return (
    <>
      <div className="at-stats">
        <div className="at-stat">
          <div className="at-stat__value">{guides.filter((g) => g.status === 'pending').length}</div>
          <div className="at-stat__label">Waiting for review</div>
        </div>
        <div className="at-stat">
          <div className="at-stat__value">{rupees(revenue.official.gross)}</div>
          <div className="at-stat__label">Earned by official (admin) guides</div>
        </div>
        <div className="at-stat">
          <div className="at-stat__value">{rupees(Math.round(authorsOwed))}</div>
          <div className="at-stat__label">Owed to guide authors ({revenue.sharePercent}% share)</div>
        </div>
      </div>

      <div className="at-note">
        A subscription pays for a plan, so its money is split equally between the pieces of content that subscriber
        was shown (your official guide counts as one, each community guide as one). The author&apos;s share of a
        community guide is set by <code>GUIDE_CREATOR_SHARE_PERCENT</code> on the server. Authors never see these figures.
      </div>

      <div className="at-tabs" style={{ marginBottom: '1rem' }}>
        {['all', 'pending', 'approved', 'rejected'].map((f) => (
          <button key={f} className={`at-tab${filter === f ? ' at-tab--active' : ''}`} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="tv-muted">No guides here.</p>}

      {shown.map((g) => (
        <div key={g._id} className="at-card">
          <div className="at-row">
            <div className="at-row__main">
              <div className="at-row__title">
                {g.title} <span className={STATUS_PILL[g.status]}>{g.status}</span>
                {g.minPlan && <span className="at-pill">{g.minPlan.name}</span>}
              </div>
              <div className="at-row__meta">
                {g.destination?.title || 'Removed destination'} · by <strong>{g.author?.fullName || 'Deleted user'}</strong>
                {g.author?.email && ` (${g.author.email})`} · {g.sections.length} section{g.sections.length !== 1 ? 's' : ''}
              </div>
              <div className="at-row__meta">
                Shown to {g.revenue.unlocks} subscription{g.revenue.unlocks !== 1 ? 's' : ''} ·
                revenue {rupees(Math.round(g.revenue.gross))} · author&apos;s share {rupees(Math.round(g.revenue.authorShare))}
              </div>
            </div>
            <div className="at-row__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setEditing(editing === g._id ? null : g._id)}>
                {editing === g._id ? 'Close' : g.status === 'pending' ? 'Review' : 'Edit'}
              </button>
              <button className="admin-btn admin-btn--danger" disabled={busy === g._id} onClick={() => remove(g)}>Remove</button>
            </div>
          </div>

          {editing === g._id && (
            <GuideAdminForm
              guide={g}
              plans={plans}
              defaultPlanId={cheapest?._id}
              categories={categories}
              onSaved={() => { setEditing(null); load(); }}
              onCancel={() => setEditing(null)}
            />
          )}
        </div>
      ))}
    </>
  );
}

// Content + review fields for one guide
function GuideAdminForm({ guide, plans, defaultPlanId, categories, onSaved, onCancel }) {
  const [status, setStatus]     = useState(guide.status === 'pending' ? 'approved' : guide.status);
  const [minPlan, setMinPlan]   = useState(guide.minPlan?._id || defaultPlanId || '');
  const [adminNote, setNote]    = useState(guide.adminNote || '');

  async function save(values) {
    await api(`/admin/guides/${guide._id}`, { method: 'PUT', body: { ...values, status, minPlan, adminNote } });
    onSaved();
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <GuideForm initial={guide} categories={categories} submitLabel="Save" onSubmit={save} onCancel={onCancel}>
        <div className="at-form" style={{ margin: 0 }}>
          <div className="at-field">
            <label htmlFor={`st-${guide._id}`}>Decision</label>
            <select id={`st-${guide._id}`} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="approved">Approved — visible to subscribers</option>
              <option value="pending">Pending review</option>
              <option value="rejected">Rejected — hidden</option>
            </select>
          </div>
          <div className="at-field">
            <label htmlFor={`pl-${guide._id}`}>Unlocked by plan</label>
            <select id={`pl-${guide._id}`} value={minPlan} onChange={(e) => setMinPlan(e.target.value)}>
              {plans.map((p) => <option key={p._id} value={p._id}>{p.name} — {rupees(p.price)} (level {p.rank})</option>)}
            </select>
          </div>
          <div className="at-field at-field--full">
            <label htmlFor={`nt-${guide._id}`}>Note to the author (optional, they can see it)</label>
            <input id={`nt-${guide._id}`} type="text" maxLength={500} value={adminNote} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
      </GuideForm>
    </div>
  );
}

// ── Reports ───────────────────────────────────────────────────
export function ReportsTab({ setError, onEditGuide, onCountChange }) {
  const [reports, setReports] = useState(null);
  const [filter, setFilter]   = useState('pending');
  const [busy, setBusy]       = useState('');
  const [notes, setNotes]     = useState({});
  const [notice, setNotice]   = useState('');

  const load = useCallback(() => {
    api(`/admin/guide-reports?status=${filter === 'all' ? '' : filter}`)
      .then((d) => { setReports(d.reports); onCountChange?.(d.pending); })
      .catch((err) => setError(err.message));
  }, [filter, setError, onCountChange]);
  useEffect(() => { load(); }, [load]);

  async function act(report, action) {
    setBusy(report._id + action);
    setError('');
    setNotice('');
    try {
      await api(`/admin/guide-reports/${report._id}`, { method: 'PATCH', body: { action, adminNote: notes[report._id] || '' } });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function refund(report) {
    const { amount, planName } = report.refundable;
    if (!window.confirm(`Refund ${rupees(amount)} (100% of the ${planName} payment) to ${report.reportedBy?.fullName}? Their subscription access for that payment ends.`)) return;
    setBusy(report._id + 'refund');
    setError('');
    try {
      await api(`/admin/guide-reports/${report._id}/refund`, { method: 'POST' });
      setNotice(`Refunded ${rupees(amount)} to ${report.reportedBy?.fullName}.`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function removeGuide(report) {
    if (!window.confirm(`Remove the guide "${report.guideTitle}"?`)) return;
    setBusy(report._id + 'remove');
    setError('');
    try {
      await api(`/admin/guides/${report.guide._id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <div className="at-tabs" style={{ marginBottom: '1rem' }}>
        {['pending', 'approved', 'rejected', 'all'].map((f) => (
          <button key={f} className={`at-tab${filter === f ? ' at-tab--active' : ''}`} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {notice && <div className="at-notice">{notice}</div>}
      {!reports ? <p className="tv-muted">Loading…</p> : reports.length === 0 && <p className="tv-muted">No reports here.</p>}

      {reports && reports.map((r) => {
        const refunded = r.refund && r.refund.payment;
        const is = (key) => busy === r._id + key;
        return (
          <div key={r._id} className="at-card">
            <div className="at-row">
              <div className="at-row__main">
                <div className="at-row__title">
                  {r.guideTitle || 'Guide'}
                  <span className={STATUS_PILL[r.status]}>report {r.status}</span>
                  {r.verdict && <span className={`at-pill ${r.verdict === 'correct' ? 'at-pill--ok' : 'at-pill--warn'}`}>guide {r.verdict}</span>}
                  {refunded && <span className="at-pill">refunded {rupees(r.refund.amount)}</span>}
                </div>
                <div className="at-row__meta">
                  Destination: <strong>{r.destination?.title || '—'}</strong> · Written by <strong>{r.guideAuthor?.fullName || 'Deleted user'}</strong>
                  {r.guideAuthor?.email && ` (${r.guideAuthor.email})`}
                </div>
                <div className="at-row__meta">
                  Reported by <strong>{r.reportedBy?.fullName || 'Deleted user'}</strong>
                  {r.reportedBy?.email && ` (${r.reportedBy.email})`} · {fullDate(r.createdAt)}
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <span className="at-pill" style={{ marginLeft: 0 }}>{r.reason}</span>
                  {r.description && <span className="tv-item__body"> “{r.description}”</span>}
                </div>
                {r.adminNote && <div className="at-row__meta">Admin note: {r.adminNote}</div>}
              </div>
            </div>

            {!refunded && (
              <div className="at-field" style={{ marginTop: '0.75rem' }}>
                <input
                  type="text" maxLength={500} placeholder="Admin note (optional)"
                  value={notes[r._id] ?? ''} onChange={(e) => setNotes((prev) => ({ ...prev, [r._id]: e.target.value }))}
                />
              </div>
            )}

            <div className="at-row__actions" style={{ marginTop: '0.75rem' }}>
              {!refunded && (
                <>
                  <button className="admin-btn admin-btn--ghost" disabled={!!busy} onClick={() => act(r, 'correct')}>{is('correct') ? '…' : 'Mark guide correct'}</button>
                  <button className="admin-btn admin-btn--ghost" disabled={!!busy} onClick={() => act(r, 'incorrect')}>{is('incorrect') ? '…' : 'Mark guide incorrect'}</button>
                  <button className="admin-btn admin-btn--ghost" disabled={!!busy} onClick={() => act(r, 'approve')}>{is('approve') ? '…' : 'Approve report'}</button>
                  <button className="admin-btn admin-btn--ghost" disabled={!!busy} onClick={() => act(r, 'reject')}>{is('reject') ? '…' : 'Reject report'}</button>
                </>
              )}
              {r.guide && (
                <>
                  <button className="admin-btn at-btn-primary" onClick={() => onEditGuide(r.guide._id)}>Edit guide</button>
                  <button className="admin-btn admin-btn--danger" disabled={!!busy} onClick={() => removeGuide(r)}>{is('remove') ? '…' : 'Remove guide'}</button>
                </>
              )}
              {r.refundable && (
                <button className="admin-btn at-btn-primary" disabled={!!busy} onClick={() => refund(r)}>
                  {is('refund') ? 'Refunding…' : `Refund ${rupees(r.refundable.amount)} (100%)`}
                </button>
              )}
            </div>
            {r.verdict === 'incorrect' && !refunded && !r.refundable && (
              <div className="at-row__meta" style={{ marginTop: '0.5rem' }}>
                No refund available: this user has no paid subscription that was shown this guide.
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
