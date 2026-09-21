// ============================================================
// Travel Guides list — /travel
// Public catalogue of destinations. Opening one takes the user through the
// sign-in / subscribe gate (handled on the plan page itself).
// ============================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, formatDate } from '../../utils/api';
import '../Travel/Travel.css';

function TravelIndex({ user }) {
  const [destinations, setDestinations] = useState([]);
  const [current, setCurrent]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  useEffect(() => {
    api('/api/travel')
      .then((d) => setDestinations(d.destinations))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    api('/api/subscription/me').then((d) => setCurrent(d.current)).catch(() => {});
  }, [user]);

  return (
    <div className="tv-page">
      <h1 className="tv-heading">Travel Guides</h1>
      <p className="tv-sub">
        Pick a destination for a complete travel guide: how to reach, where to stay, what to see,
        what it will cost, and a day-by-day itinerary.
      </p>

      {error && <div className="tv-error">{error}</div>}

      {user && (
        <div className="tv-banner">
          {current ? (
            <div>
              <div className="tv-banner__title">Your plan: {current.plan?.name || current.planName}</div>
              <div className="tv-muted">Valid until {formatDate(current.expiryDate)}</div>
            </div>
          ) : (
            <div>
              <div className="tv-banner__title">You don&apos;t have a subscription yet</div>
              <div className="tv-muted">Subscribe to unlock full travel guides.</div>
            </div>
          )}
          <Link to="/subscription" className="tv-btn tv-btn--gold">
            {current ? 'Manage subscription' : 'See plans'}
          </Link>
        </div>
      )}

      {loading ? (
        <p className="tv-muted">Loading destinations…</p>
      ) : destinations.length === 0 ? (
        <p className="tv-muted">No travel guides have been published yet.</p>
      ) : (
        <div className="tv-dest-grid">
          {destinations.map((d) => (
            <Link key={d._id} to={`/travel/${d.slug}`} className="tv-dest">
              {d.coverImageURL
                ? <img className="tv-dest__img" src={d.coverImageURL} alt={d.title} />
                : <div className="tv-dest__img" />}
              <div className="tv-dest__body">
                <div className="tv-dest__title">{d.title}</div>
                {d.location && <div className="tv-dest__loc">📍 {d.location}</div>}
                {d.summary && <div className="tv-dest__sum">{d.summary}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default TravelIndex;
