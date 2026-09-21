// ============================================================
// Admin — one destination   Route: /admin/travel/destinations/:id  (ADMIN only)
// Edit its details, add travel content (hotels, transport, guides, itinerary…)
// and rate-card rows. Every item picks the plan that unlocks it.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, rupees } from '../../utils/api';
import '../AdminDashboard/AdminDashboard.css';
import '../Travel/Travel.css';
import './AdminTravel.css';

const planLabel = (p) => `${p.name} — ${rupees(p.price)} (level ${p.rank})`;

function PlanSelect({ id, plans, value, onChange }) {
  return (
    <select id={id} value={value} onChange={onChange} required>
      <option value="">Choose a plan…</option>
      {plans.map((p) => <option key={p._id} value={p._id}>{planLabel(p)}</option>)}
    </select>
  );
}

// ── Destination details form ──────────────────────────────────
function DetailsForm({ destination, blogs, onSaved }) {
  const [f, setF] = useState(() => ({
    title: destination.title,
    slug: destination.slug,
    location: destination.location || '',
    summary: destination.summary || '',
    coverImageURL: destination.coverImageURL || '',
    blogId: destination.blogId || '',
    isPublished: destination.isPublished,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [saved, setSaved]   = useState(false);

  const set = (key) => (e) => {
    setSaved(false);
    setF((prev) => ({ ...prev, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  };

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const d = await api(`/admin/destinations/${destination._id}`, { method: 'PUT', body: f });
      setSaved(true);
      onSaved(d.destination);
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
        <label htmlFor="dd-title">Title</label>
        <input id="dd-title" type="text" value={f.title} onChange={set('title')} required />
      </div>
      <div className="at-field">
        <label htmlFor="dd-slug">URL slug</label>
        <input id="dd-slug" type="text" value={f.slug} onChange={set('slug')} />
        <span className="at-field__hint">Public link: /travel/{f.slug}. Changing it breaks links already placed in blog posts.</span>
      </div>
      <div className="at-field">
        <label htmlFor="dd-loc">Location</label>
        <input id="dd-loc" type="text" value={f.location} onChange={set('location')} />
      </div>
      <div className="at-field">
        <label htmlFor="dd-cover">Cover image URL</label>
        <input id="dd-cover" type="text" placeholder="/uploads/… or https://…" value={f.coverImageURL} onChange={set('coverImageURL')} />
      </div>
      <div className="at-field at-field--full">
        <label htmlFor="dd-sum">Public teaser (visible before subscribing)</label>
        <textarea id="dd-sum" rows={2} value={f.summary} onChange={set('summary')} />
      </div>
      <div className="at-field at-field--full">
        <label htmlFor="dd-blog">Linked blog post</label>
        <select id="dd-blog" value={f.blogId} onChange={set('blogId')}>
          <option value="">— none —</option>
          {blogs.map((b) => <option key={b._id} value={b._id}>{b.title}</option>)}
        </select>
        <span className="at-field__hint">
          A linked post shows a “Travel Guide” button for this destination even without editing the post.
        </span>
      </div>
      <label className="at-check at-field--full">
        <input type="checkbox" checked={f.isPublished} onChange={set('isPublished')} />
        Published (untick to keep it as a draft — only admins can open it)
      </label>
      <div className="at-form__actions">
        <button className="admin-btn at-btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save details'}</button>
        {saved && <span className="tv-muted" style={{ alignSelf: 'center' }}>✓ Saved</span>}
      </div>
    </form>
  );
}

// ── Travel content form (hotel, bus, itinerary …) ─────────────
function ContentForm({ destinationId, item, plans, categories, onSaved, onCancel }) {
  const [f, setF] = useState(() => ({
    category: item?.category ?? categories[0]?.key ?? '',
    title: item?.title ?? '',
    body: item?.body ?? '',
    contact: item?.contact ?? '',
    minPlan: item?.minPlan?._id ?? '',
    order: item?.order ?? 0,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (key) => (e) => setF((prev) => ({ ...prev, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api(item ? `/admin/travel-content/${item._id}` : `/admin/destinations/${destinationId}/content`, {
        method: item ? 'PUT' : 'POST',
        body: f,
      });
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
        <label htmlFor="c-cat">Section</label>
        <select id="c-cat" value={f.category} onChange={set('category')}>
          {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>
      <div className="at-field">
        <label htmlFor="c-plan">Unlocked by plan</label>
        <PlanSelect id="c-plan" plans={plans} value={f.minPlan} onChange={set('minPlan')} />
        <span className="at-field__hint">Higher plans see it too.</span>
      </div>
      <div className="at-field at-field--full">
        <label htmlFor="c-title">Title</label>
        <input id="c-title" type="text" placeholder="e.g. Hyderabad → Warangal by TSRTC bus" value={f.title} onChange={set('title')} required />
      </div>
      <div className="at-field at-field--full">
        <label htmlFor="c-body">Details</label>
        <textarea id="c-body" rows={6} value={f.body} onChange={set('body')} />
      </div>
      <div className="at-field">
        <label htmlFor="c-contact">Contact / booking info</label>
        <input id="c-contact" type="text" value={f.contact} onChange={set('contact')} />
      </div>
      <div className="at-field">
        <label htmlFor="c-order">Order</label>
        <input id="c-order" type="number" step="1" value={f.order} onChange={set('order')} />
        <span className="at-field__hint">Lower numbers show first within a section.</span>
      </div>
      <div className="at-form__actions">
        <button className="admin-btn at-btn-primary" disabled={saving}>{saving ? 'Saving…' : item ? 'Save changes' : 'Add content'}</button>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

// ── Rate-card row form ────────────────────────────────────────
function RateForm({ destinationId, item, plans, onSaved, onCancel }) {
  const [f, setF] = useState(() => ({
    service: item?.service ?? '',
    price: item?.price ?? '',
    unit: item?.unit ?? '',
    notes: item?.notes ?? '',
    minPlan: item?.minPlan?._id ?? '',
    order: item?.order ?? 0,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (key) => (e) => setF((prev) => ({ ...prev, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api(item ? `/admin/rate-card/${item._id}` : `/admin/destinations/${destinationId}/rate-card`, {
        method: item ? 'PUT' : 'POST',
        body: f,
      });
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
        <label htmlFor="r-service">Service</label>
        <input id="r-service" type="text" placeholder="e.g. Bike Rental" value={f.service} onChange={set('service')} required />
      </div>
      <div className="at-field">
        <label htmlFor="r-plan">Unlocked by plan</label>
        <PlanSelect id="r-plan" plans={plans} value={f.minPlan} onChange={set('minPlan')} />
      </div>
      <div className="at-field">
        <label htmlFor="r-price">Price (₹)</label>
        <input id="r-price" type="number" min="0" step="1" value={f.price} onChange={set('price')} required />
      </div>
      <div className="at-field">
        <label htmlFor="r-unit">Unit</label>
        <input id="r-unit" type="text" placeholder="per day, per night, one way…" value={f.unit} onChange={set('unit')} />
      </div>
      <div className="at-field">
        <label htmlFor="r-notes">Notes</label>
        <input id="r-notes" type="text" value={f.notes} onChange={set('notes')} />
      </div>
      <div className="at-field">
        <label htmlFor="r-order">Order</label>
        <input id="r-order" type="number" step="1" value={f.order} onChange={set('order')} />
      </div>
      <div className="at-form__actions">
        <button className="admin-btn at-btn-primary" disabled={saving}>{saving ? 'Saving…' : item ? 'Save changes' : 'Add row'}</button>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────
function AdminDestination({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData]       = useState(null); // { destination, content, rateCard, plans, categories }
  const [blogs, setBlogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [editing, setEditing] = useState(null); // 'content:new' | 'content:<id>' | 'rate:new' | 'rate:<id>'

  useEffect(() => {
    if (user === null)                 { navigate('/user/signin'); return; }
    if (user && user.role !== 'ADMIN') { navigate('/'); }
  }, [user, navigate]);

  const load = useCallback(() => {
    api(`/admin/destinations/${id}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    load();
    api('/admin/blogs').then((d) => setBlogs(d.blogs)).catch(() => {});
  }, [user, load]);

  async function remove(kind, item) {
    const label = kind === 'content' ? item.title : item.service;
    if (!window.confirm(`Delete "${label}"?`)) return;
    setError('');
    try {
      await api(kind === 'content' ? `/admin/travel-content/${item._id}` : `/admin/rate-card/${item._id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const saved = () => { setEditing(null); load(); };

  if (!user || user.role !== 'ADMIN') return null;
  if (loading) return <div className="admin-page"><p className="admin-empty">Loading…</p></div>;
  if (!data) {
    return (
      <div className="admin-page">
        <div className="admin-error">{error || 'Destination not found.'}</div>
        <Link to="/admin/travel" className="at-back">← Back to Travel &amp; Subscriptions</Link>
      </div>
    );
  }

  const { destination, content, rateCard, plans, categories } = data;
  const catLabel = Object.fromEntries(categories.map((c) => [c.key, c.label]));
  const noPlans = plans.length === 0;

  return (
    <div className="admin-page">
      <Link to="/admin/travel" className="at-back">← Back to Travel &amp; Subscriptions</Link>
      <h1 className="admin-page__heading">🧳 {destination.title}</h1>
      <p className="admin-page__sub">
        <Link to={`/travel/${destination.slug}`}>Preview the public travel guide →</Link>
      </p>

      {error && <div className="admin-error">⚠️ {error}</div>}

      <div className="at-note">
        <strong>Adding a “Travel Guide” button to a blog post:</strong> in the post editor, click the 🧳 toolbar
        button and choose this destination — the button appears right where your cursor is, e.g. under “1. {destination.title}”.
        Or link this destination to a blog post below to show the button at the end of that post.
      </div>

      <h2 className="admin-section__title">Details</h2>
      <DetailsForm
        destination={destination}
        blogs={blogs}
        onSaved={(d) => setData((prev) => ({ ...prev, destination: d }))}
      />

      {/* ── Travel content ── */}
      <div className="at-toolbar" style={{ marginTop: '2rem' }}>
        <h2 className="admin-section__title" style={{ margin: 0, border: 'none', padding: 0 }}>
          Travel content <span className="at-pill">{content.length}</span>
        </h2>
        {editing !== 'content:new' && (
          <button className="admin-btn at-btn-primary" disabled={noPlans} onClick={() => setEditing('content:new')}>+ Add content</button>
        )}
      </div>
      {noPlans && <div className="admin-error">Create at least one plan first (Travel &amp; Subscriptions → Plans).</div>}

      {editing === 'content:new' && (
        <ContentForm destinationId={destination._id} plans={plans} categories={categories} onSaved={saved} onCancel={() => setEditing(null)} />
      )}

      {content.length === 0 ? <p className="admin-empty">No content yet.</p> : content.map((item) => (
        <div key={item._id} className="at-card">
          <div className="at-row">
            <div className="at-row__main">
              <div className="at-row__title">
                {item.title}
                <span className="at-pill">{catLabel[item.category] || item.category}</span>
                <span className={`tv-tier tv-tier--${item.minPlan && item.minPlan.rank <= 3 ? item.minPlan.rank : 'n'}`} style={{ marginLeft: '0.4rem' }}>
                  {item.minPlan ? `${item.minPlan.name} · ${rupees(item.minPlan.price)}` : 'No plan!'}
                </span>
              </div>
              {item.body && <div className="at-row__meta" style={{ whiteSpace: 'pre-wrap' }}>{item.body.length > 220 ? item.body.slice(0, 220) + '…' : item.body}</div>}
            </div>
            <div className="at-row__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setEditing(`content:${item._id}`)}>Edit</button>
              <button className="admin-btn admin-btn--danger" onClick={() => remove('content', item)}>Delete</button>
            </div>
          </div>
          {editing === `content:${item._id}` && (
            <ContentForm destinationId={destination._id} item={item} plans={plans} categories={categories} onSaved={saved} onCancel={() => setEditing(null)} />
          )}
        </div>
      ))}

      {/* ── Rate card ── */}
      <div className="at-toolbar" style={{ marginTop: '2rem' }}>
        <h2 className="admin-section__title" style={{ margin: 0, border: 'none', padding: 0 }}>
          Rate card <span className="at-pill">{rateCard.length}</span>
        </h2>
        {editing !== 'rate:new' && (
          <button className="admin-btn at-btn-primary" disabled={noPlans} onClick={() => setEditing('rate:new')}>+ Add row</button>
        )}
      </div>

      {editing === 'rate:new' && (
        <RateForm destinationId={destination._id} plans={plans} onSaved={saved} onCancel={() => setEditing(null)} />
      )}

      {rateCard.length === 0 ? <p className="admin-empty">No rate card rows yet.</p> : rateCard.map((item) => (
        <div key={item._id} className="at-card">
          <div className="at-row">
            <div className="at-row__main">
              <div className="at-row__title">
                {item.service} — {rupees(item.price)}{item.unit && <span className="tv-muted"> {item.unit}</span>}
                <span className={`tv-tier tv-tier--${item.minPlan && item.minPlan.rank <= 3 ? item.minPlan.rank : 'n'}`} style={{ marginLeft: '0.5rem' }}>
                  {item.minPlan ? `${item.minPlan.name} · ${rupees(item.minPlan.price)}` : 'No plan!'}
                </span>
              </div>
              {item.notes && <div className="at-row__meta">{item.notes}</div>}
            </div>
            <div className="at-row__actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setEditing(`rate:${item._id}`)}>Edit</button>
              <button className="admin-btn admin-btn--danger" onClick={() => remove('rate', item)}>Delete</button>
            </div>
          </div>
          {editing === `rate:${item._id}` && (
            <RateForm destinationId={destination._id} item={item} plans={plans} onSaved={saved} onCancel={() => setEditing(null)} />
          )}
        </div>
      ))}
    </div>
  );
}

export default AdminDestination;
