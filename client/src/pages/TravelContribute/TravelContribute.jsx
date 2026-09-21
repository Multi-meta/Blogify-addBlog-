// ============================================================
// Share your own travel guide — /travel/:slug/contribute
// Any signed-in user can write a guide for a destination. It is saved under
// their account and reviewed by the admin before subscribers can see it.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, formatDate } from '../../utils/api';
import GuideForm from '../../components/GuideForm/GuideForm';
import '../Travel/Travel.css';

const STATUS_LABEL = {
  pending:  { text: 'Waiting for review', cls: 'tv-status--created' },
  approved: { text: 'Published',          cls: 'tv-status--paid' },
  rejected: { text: 'Not accepted',       cls: 'tv-status--failed' },
};

function TravelContribute({ user }) {
  const { slug } = useParams();
  const here = `/travel/${slug}/contribute`;

  const [info, setInfo]         = useState(null); // { destination, categories }
  const [mine, setMine]         = useState([]);   // this user's guides for this destination
  const [editing, setEditing]   = useState(null); // guide being edited | 'new' | null
  const [notice, setNotice]     = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api(`/api/travel/${slug}/info`);
      setInfo(d);
      if (user) {
        const g = await api('/api/travel/guides/mine');
        setMine(g.guides.filter((x) => x.destination?.slug === slug));
      }
    } catch (err) {
      setError(err.status === 404 ? 'This destination was not found.' : err.message);
    } finally {
      setLoading(false);
    }
  }, [slug, user]);

  useEffect(() => { load(); }, [load]);

  async function save(values) {
    if (editing && editing !== 'new') {
      await api(`/api/travel/guides/${editing._id}`, { method: 'PUT', body: values });
    } else {
      await api(`/api/travel/${slug}/guides`, { method: 'POST', body: values });
    }
    setNotice('Thanks! Your guide was saved and will appear for subscribers once the admin has reviewed it.');
    setEditing(null);
    load();
  }

  async function withdraw(guide) {
    if (!window.confirm(`Delete "${guide.title}"?`)) return;
    setError('');
    try {
      await api(`/api/travel/guides/${guide._id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="tv-page"><p className="tv-muted">Loading…</p></div>;
  if (!info) {
    return (
      <div className="tv-page">
        <div className="tv-error">{error || 'Could not load this page.'}</div>
        <Link to="/travel" className="tv-btn tv-btn--ghost">← All travel guides</Link>
      </div>
    );
  }

  const { destination, categories } = info;

  if (!user) {
    return (
      <div className="tv-page">
        <div className="tv-gate">
          <h2>Share your {destination.title} guide</h2>
          <p>Sign in to write a travel guide for {destination.title}.</p>
          <div className="tv-gate__actions">
            <Link className="tv-btn tv-btn--gold" to={`/user/signin?next=${encodeURIComponent(here)}`}>Sign In</Link>
            <Link className="tv-btn tv-btn--ghost" to={`/user/signup?next=${encodeURIComponent(here)}`}>Create Account</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tv-page">
      <h1 className="tv-heading">Share your {destination.title} guide</h1>
      <p className="tv-sub">
        Know how to get there, where to stay or what it costs? Write it down. Your guide is
        saved under your account and checked by our team before other travellers can read it.
      </p>

      {error && <div className="tv-error">{error}</div>}
      {notice && <div className="tv-banner"><div>{notice}</div></div>}

      {editing ? (
        <GuideForm
          initial={editing === 'new' ? null : editing}
          categories={categories}
          submitLabel={editing === 'new' ? 'Submit for review' : 'Save & resubmit for review'}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <button className="tv-btn tv-btn--gold" onClick={() => { setNotice(''); setEditing('new'); }}>
          + Write a guide
        </button>
      )}

      {mine.length > 0 && !editing && (
        <>
          <h2 className="tv-section-title" style={{ marginTop: '2rem' }}>Your guides for {destination.title}</h2>
          {mine.map((g) => (
            <div key={g._id} className="tv-item">
              <div className="tv-item__head">
                <span className="tv-item__title">{g.title}</span>
                <span className={`tv-status ${STATUS_LABEL[g.status].cls}`}>{STATUS_LABEL[g.status].text}</span>
              </div>
              <div className="tv-muted">{g.sections.length} section{g.sections.length !== 1 ? 's' : ''} · updated {formatDate(g.updatedAt)}</div>
              {g.adminNote && <div className="tv-item__body">Note from the reviewer: {g.adminNote}</div>}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                <button className="tv-btn tv-btn--ghost" onClick={() => { setNotice(''); setEditing(g); }}>Edit</button>
                {g.status !== 'approved' && (
                  <button className="tv-btn tv-btn--ghost" onClick={() => withdraw(g)}>Delete</button>
                )}
              </div>
            </div>
          ))}
          <p className="tv-muted">Editing a published guide sends it back for review.</p>
        </>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link to={`/travel/${slug}`} className="tv-btn tv-btn--ghost">← Back to {destination.title}</Link>
      </p>
    </div>
  );
}

export default TravelContribute;
