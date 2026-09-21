// ============================================================
// Travel Plan Page — /travel/:slug
// This is where the "Travel Guide" button lands. The gate, in order:
//   1. not signed in           -> ask them to sign in / register
//   2. no active subscription  -> send them to /subscription (and back here after)
//   3. subscribed              -> show the guide; higher-tier items are shown as
//                                 locked with an upgrade prompt
// Below the official (admin) guide sit community guides written by other users;
// each can be reported.
// What is locked is decided by the server, which never sends locked details.
// ============================================================

import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, rupees, formatDate } from '../../utils/api';
import '../Travel/Travel.css';

const tierClass = (plan) => `tv-tier tv-tier--${plan && plan.rank <= 3 ? plan.rank : 'n'}`;

function TierPill({ plan }) {
  if (!plan) return null;
  return <span className={tierClass(plan)}>{plan.name} · {rupees(plan.price)}</span>;
}

function LockMessage({ plan, next }) {
  if (!plan) return <div className="tv-lock">🔒 This information isn&apos;t available right now.</div>;
  return (
    <div className="tv-lock">
      🔒 This feature is available in the <strong>{rupees(plan.price)} {plan.name}</strong> plan.
      Upgrade your subscription to access this travel information.{' '}
      <Link to={`/subscription?next=${encodeURIComponent(next)}`}>Upgrade to {plan.name} →</Link>
    </div>
  );
}

const REASON_LABEL = {
  incorrect: 'Incorrect information',
  outdated: 'Outdated',
  misleading: 'Misleading',
  incomplete: 'Incomplete',
  other: 'Something else',
};

// "Report information" on a community guide
function ReportGuide({ guideId, reasons }) {
  const [open, setOpen]        = useState(false);
  const [reason, setReason]    = useState(reasons[0]);
  const [description, setDesc] = useState('');
  const [sending, setSending]  = useState(false);
  const [msg, setMsg]          = useState({ text: '', ok: false });

  async function send(e) {
    e.preventDefault();
    setSending(true);
    try {
      await api(`/api/travel/guides/${guideId}/report`, { method: 'POST', body: { reason, description } });
      setMsg({ text: 'Thanks. The admin will review your report.', ok: true });
      setOpen(false);
      setDesc('');
    } catch (err) {
      setMsg({ text: err.message, ok: false });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="tv-report">
      {!open && (
        <button type="button" className="tv-link-btn" onClick={() => { setOpen(true); setMsg({ text: '', ok: false }); }}>
          🚩 Report information
        </button>
      )}
      {open && (
        <form onSubmit={send} className="tv-report__form">
          <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason">
            {reasons.map((r) => <option key={r} value={r}>{REASON_LABEL[r] || r}</option>)}
          </select>
          <textarea
            rows={3} maxLength={1000} value={description} onChange={(e) => setDesc(e.target.value)}
            placeholder="What is wrong, and what should it say instead? (optional)" required={reason === 'other'}
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="tv-btn" disabled={sending}>{sending ? 'Sending…' : 'Send report'}</button>
            <button type="button" className="tv-btn tv-btn--ghost" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
      {msg.text && <div className={msg.ok ? 'tv-report__ok' : 'tv-report__err'}>{msg.text}</div>}
    </div>
  );
}

function TravelPlan({ user }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const here = `/travel/${slug}`;

  const [plan, setPlan]       = useState(null); // full response for signed-in subscribers
  const [teaser, setTeaser]   = useState(null); // public info for the sign-in gate
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    if (!user) {
      // Step 1: not signed in — show a public teaser + sign-in prompt
      api('/api/travel')
        .then((d) => setTeaser(d.destinations.find((x) => x.slug === slug) || null))
        .catch(() => {})
        .finally(() => setLoading(false));
      return;
    }

    api(`/api/travel/${slug}`)
      .then(setPlan)
      .catch((err) => {
        // Step 2: signed in but no active subscription -> subscription page
        if (err.code === 'SUBSCRIPTION_REQUIRED') {
          navigate(`/subscription?next=${encodeURIComponent(here)}`, { replace: true });
        } else {
          setError(err.status === 404 ? 'This travel guide was not found.' : err.message);
        }
      })
      .finally(() => setLoading(false));
  }, [user, slug, here, navigate]);

  // ── Step 1: sign-in gate ────────────────────────────────────
  if (!user) {
    return (
      <div className="tv-page">
        <div className="tv-gate">
          <h2>{teaser ? `${teaser.title} – Travel Guide` : 'Travel Guide'}</h2>
          {teaser?.summary && <p>{teaser.summary}</p>}
          <p>Sign in or create a free account to see the travel guide and subscription options.</p>
          <div className="tv-gate__actions">
            <Link className="tv-btn tv-btn--gold" to={`/user/signin?next=${encodeURIComponent(here)}`}>Sign In</Link>
            <Link className="tv-btn tv-btn--ghost" to={`/user/signup?next=${encodeURIComponent(here)}`}>Create Account</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="tv-page"><p className="tv-muted">Loading travel guide…</p></div>;

  if (error || !plan) {
    return (
      <div className="tv-page">
        <div className="tv-error">{error || 'Could not load this travel guide.'}</div>
        <Link to="/travel" className="tv-btn tv-btn--ghost">← All travel guides</Link>
      </div>
    );
  }

  const { destination, categories, sections, rateCard, access } = plan;
  const guides = plan.guides || [];
  const reportReasons = plan.reportReasons || [];

  // Cheapest plan that would unlock something the user can't see yet
  const lockedPlans = [...sections, ...rateCard].filter((i) => i.locked && i.requiredPlan).map((i) => i.requiredPlan);
  const lockedCount = [...sections, ...rateCard].filter((i) => i.locked).length;
  const nextPlan = lockedPlans.sort((a, b) => a.rank - b.rank)[0];

  const byCategory = categories
    .map((cat) => ({ ...cat, items: sections.filter((s) => s.category === cat.key) }))
    .filter((cat) => cat.items.length > 0);

  return (
    <div className="tv-page">
      <div className="tv-hero">
        {destination.coverImageURL && <img className="tv-hero__img" src={destination.coverImageURL} alt={destination.title} />}
        <div className="tv-hero__text">
          <h1 className="tv-heading">{destination.title} – Travel Guide</h1>
          {destination.location && <div className="tv-muted" style={{ marginBottom: '0.5rem' }}>📍 {destination.location}</div>}
          {destination.summary && <p className="tv-sub" style={{ marginBottom: '0.75rem' }}>{destination.summary}</p>}
          <div className="tv-muted">
            {access.isAdmin
              ? '🛡️ Admin preview — you can see everything.'
              : <>Your plan: <strong>{access.planName}</strong> · valid until {formatDate(access.expiryDate)}</>}
            {destination.blogId && <> · <Link to={`/blog/${destination.blogId}`}>Read the article</Link></>}
          </div>
        </div>
      </div>

      {lockedCount > 0 && nextPlan && (
        <div className="tv-upsell">
          <span>
            🔒 <strong>{lockedCount}</strong> item{lockedCount !== 1 ? 's' : ''} in this guide are locked.
            Upgrade to <strong>{nextPlan.name}</strong> ({rupees(nextPlan.price)}/month) to unlock more.
          </span>
          <Link className="tv-btn tv-btn--gold" to={`/subscription?next=${encodeURIComponent(here)}`}>See upgrade options</Link>
        </div>
      )}

      {(byCategory.length > 0 || rateCard.length > 0) && (
        <div className="tv-chips">
          {byCategory.map((cat) => <a key={cat.key} className="tv-chip" href={`#cat-${cat.key}`}>{cat.label}</a>)}
          {rateCard.length > 0 && <a className="tv-chip" href="#rate-card">Rate Card</a>}
        </div>
      )}

      {byCategory.length === 0 && rateCard.length === 0 && (
        <p className="tv-muted">The official travel guide for this destination is still being prepared. Check back soon!</p>
      )}

      {byCategory.map((cat) => (
        <section key={cat.key} id={`cat-${cat.key}`} className="tv-cat">
          <h2 className="tv-cat__title">{cat.label}</h2>
          {cat.items.map((item) => (
            <div key={item._id} className={`tv-item${item.locked ? ' tv-item--locked' : ''}`}>
              <div className="tv-item__head">
                <span className="tv-item__title">{item.locked ? `🔒 ${cat.label}` : item.title}</span>
                <TierPill plan={item.requiredPlan} />
              </div>
              {item.locked ? (
                <LockMessage plan={item.requiredPlan} next={here} />
              ) : (
                <>
                  {item.body && <div className="tv-item__body">{item.body}</div>}
                  {item.contact && <div className="tv-item__contact">📞 {item.contact}</div>}
                </>
              )}
            </div>
          ))}
        </section>
      ))}

      {rateCard.length > 0 && (
        <section id="rate-card" className="tv-cat">
          <h2 className="tv-cat__title">Rate Card</h2>
          <div className="tv-table-wrap">
            <table className="tv-table">
              <thead>
                <tr><th>Service</th><th className="tv-num">Price</th><th>Available in</th></tr>
              </thead>
              <tbody>
                {rateCard.map((row) => (
                  <tr key={row._id} className={row.locked ? 'tv-row--locked' : ''}>
                    <td>
                      {row.locked ? '🔒 ' : ''}{row.service}
                      {!row.locked && row.notes && <div className="tv-muted">{row.notes}</div>}
                    </td>
                    <td className="tv-num">
                      {row.locked ? 'Locked' : <>{rupees(row.price)}{row.unit && <span className="tv-muted"> {row.unit}</span>}</>}
                    </td>
                    <td><TierPill plan={row.requiredPlan} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rateCard.some((r) => r.locked) && (
            <p className="tv-muted" style={{ marginTop: '0.5rem' }}>
              Locked prices unlock with a higher plan. <Link to={`/subscription?next=${encodeURIComponent(here)}`}>Upgrade →</Link>
            </p>
          )}
          <p className="tv-muted" style={{ marginTop: '0.5rem' }}>Prices are estimates and may change.</p>
        </section>
      )}

      <section id="community" className="tv-cat">
        <h2 className="tv-cat__title">Guides from other travellers</h2>
        {guides.length === 0 && <p className="tv-muted">No traveller guides for {destination.title} yet.</p>}
        {guides.map((g) => (
          <div key={g._id} className={`tv-item${g.locked ? ' tv-item--locked' : ''}`}>
            <div className="tv-item__head">
              <span className="tv-item__title">{g.locked ? '🔒 Traveller guide' : g.title}</span>
              <TierPill plan={g.requiredPlan} />
            </div>
            {g.locked ? (
              <LockMessage plan={g.requiredPlan} next={here} />
            ) : (
              <>
                <div className="tv-muted">
                  By {g.author?.fullName || 'a traveller'} · updated {formatDate(g.updatedAt)} · written by a community member
                </div>
                {g.sections.map((sec) => (
                  <div key={sec._id} className="tv-sub-item">
                    <div className="tv-sub-item__title">
                      <span className="tv-tier">{categories.find((c) => c.key === sec.category)?.label || sec.category}</span>
                      {' '}{sec.title}
                    </div>
                    {sec.body && <div className="tv-item__body">{sec.body}</div>}
                    {sec.contact && <div className="tv-item__contact">📞 {sec.contact}</div>}
                  </div>
                ))}
                {!g.isMine && !access.isAdmin && <ReportGuide guideId={g._id} reasons={reportReasons} />}
              </>
            )}
          </div>
        ))}
        <p className="tv-muted" style={{ marginTop: '0.75rem' }}>
          Been to {destination.title}? <Link to={`/travel/${destination.slug}/contribute`}>Share your own guide →</Link>
        </p>
      </section>

      <Link to="/travel" className="tv-btn tv-btn--ghost">← All travel guides</Link>
    </div>
  );
}

export default TravelPlan;
