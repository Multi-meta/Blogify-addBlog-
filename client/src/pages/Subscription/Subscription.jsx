// ============================================================
// Subscription Page — /subscription
// Shows the plans (loaded from the admin-managed list), the user's current
// plan, and their payment history. Buying goes: checkout -> pay -> verify.
// Route accepts ?next=/travel/some-place to return there after purchase.
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, rupees, formatDate, safeNext } from '../../utils/api';
import StripeCheckout from '../../components/StripeCheckout/StripeCheckout';
import '../Travel/Travel.css';

function daysLeft(expiry) {
  return Math.max(0, Math.ceil((new Date(expiry) - Date.now()) / 86400000));
}

function Subscription({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get('next'));

  const [plans, setPlans]       = useState([]);
  const [me, setMe]             = useState(null); // { current, quotes, payments } — signed-in users only
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [starting, setStarting] = useState(null); // plan id being checked out
  const [pending, setPending]   = useState(null); // { payment, order } waiting for the user to pay
  const [paying, setPaying]     = useState(false);

  const load = useCallback(async () => {
    try {
      const [planData, meData] = await Promise.all([
        api('/api/plans'),
        user ? api('/api/subscription/me') : Promise.resolve(null),
      ]);
      setPlans(planData.plans);
      setMe(meData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function handleChoose(plan) {
    setError('');
    if (!user) {
      // Must be signed in to buy; come straight back here afterwards
      const back = '/subscription' + (next ? `?next=${encodeURIComponent(next)}` : '');
      navigate(`/user/signin?next=${encodeURIComponent(back)}`);
      return;
    }
    setStarting(plan._id);
    try {
      const data = await api('/api/subscription/checkout', { method: 'POST', body: { planId: plan._id } });
      setPending(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(null);
    }
  }

  async function handlePay(simulate) {
    setPaying(true);
    setError('');
    try {
      // Ask the server to confirm the payment. It checks with the gateway itself
      // (Stripe: it re-reads the payment) and only then grants the plan. If the
      // gateway is still processing it answers "pending", so ask again shortly.
      for (let attempt = 0; attempt < 8; attempt++) {
        const res = await api('/api/subscription/verify', {
          method: 'POST',
          body: { paymentId: pending.payment._id, simulate },
        });
        if (!res.pending) {
          setPending(null);
          navigate(next || '/travel');
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      setError('Your payment is still being confirmed. Check your payment history in a minute.');
      setPending(null);
      load();
    } catch (err) {
      setError(err.message);
      setPending(null);
      load(); // the failed attempt shows up in the history
    } finally {
      setPaying(false);
    }
  }

  const current = me?.current;

  return (
    <div className="tv-page">
      <h1 className="tv-heading">Plan your trip with Blogify</h1>
      <p className="tv-sub">
        Read our destination articles for free. Subscribe for step-by-step travel guides — routes,
        hotels, rentals, guides, costs and itineraries. Higher plans include everything in the lower ones.
      </p>

      {error && <div className="tv-error">{error}</div>}

      {current && (
        <div className="tv-banner">
          <div>
            <div className="tv-banner__title">
              Your plan: {current.plan?.name || current.planName}
            </div>
            <div className="tv-muted">
              Valid until {formatDate(current.expiryDate)} · {daysLeft(current.expiryDate)} days left
            </div>
          </div>
          <Link to="/travel" className="tv-btn tv-btn--gold">Browse travel guides</Link>
        </div>
      )}

      {loading ? (
        <p className="tv-muted">Loading plans…</p>
      ) : plans.length === 0 ? (
        <p className="tv-muted">No plans are available right now. Please check back soon.</p>
      ) : (
        <div className="tv-plans">
          {plans.map((plan) => {
            const quote = me?.quotes?.[plan._id];
            const isCurrent = current && String(current.plan?._id) === String(plan._id);

            let label = `Subscribe · ${rupees(plan.price)}/month`;
            let disabled = false;
            let note = '';
            if (quote) {
              if (!quote.allowed) {
                label = 'Included in your plan';
                disabled = true;
                note = quote.reason;
              } else if (quote.type === 'renewal') {
                label = `Renew · ${rupees(quote.amount)}`;
              } else if (quote.type === 'upgrade') {
                label = `Upgrade · ${rupees(quote.amount)}`;
                note = `Includes ${rupees(quote.credit)} credit for the unused time on your current plan.`;
              }
            }

            return (
              <div key={plan._id} className={`tv-plan${isCurrent ? ' tv-plan--current' : ''}`}>
                {isCurrent && <span className="tv-plan__badge">Current plan</span>}
                <div className="tv-plan__name">{plan.name}</div>
                <div className="tv-plan__desc">{plan.description}</div>
                <div className="tv-plan__price">
                  {rupees(plan.price)} <small>/ {plan.durationDays === 30 ? 'month' : `${plan.durationDays} days`}</small>
                </div>
                <ul className="tv-plan__features">
                  {plan.features.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                <button
                  className="tv-btn tv-btn--gold"
                  disabled={disabled || starting === plan._id}
                  onClick={() => handleChoose(plan)}
                >
                  {starting === plan._id ? 'Please wait…' : label}
                </button>
                {note && <div className="tv-plan__note">{note}</div>}
              </div>
            );
          })}
        </div>
      )}

      {me?.payments?.length > 0 && (
        <>
          <h2 className="tv-section-title">Payment history</h2>
          <div className="tv-table-wrap">
            <table className="tv-table">
              <thead>
                <tr><th>Date</th><th>Plan</th><th>Type</th><th>Status</th><th className="tv-num">Amount</th></tr>
              </thead>
              <tbody>
                {me.payments.map((p) => (
                  <tr key={p._id}>
                    <td>{formatDate(p.paidAt || p.createdAt)}</td>
                    <td>{p.planName}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.type}</td>
                    <td><span className={`tv-status tv-status--${p.status}`}>{p.status}</span></td>
                    <td className="tv-num">{rupees(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Checkout modal ── */}
      {pending && (
        <div className="tv-modal-back" onClick={() => !paying && setPending(null)}>
          <div className="tv-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {pending.payment.type === 'upgrade' ? 'Upgrade to' : pending.payment.type === 'renewal' ? 'Renew' : 'Subscribe to'}{' '}
              {pending.payment.planName}
            </h3>
            <div className="tv-modal__amount">{rupees(pending.payment.amount)}</div>

            {pending.order.gateway === 'stripe' ? (
              <StripeCheckout
                order={pending.order}
                amountLabel={rupees(pending.payment.amount)}
                busy={paying}
                onPaid={() => handlePay()}
                onCancel={() => setPending(null)}
              />
            ) : pending.order.gateway === 'mock' ? (
              <>
                <div className="tv-modal__test">
                  🧪 <strong>Test mode.</strong> No real money is charged. This is the
                  built-in practice payment.
                </div>
                <div className="tv-modal__actions">
                  <button className="tv-btn tv-btn--gold" disabled={paying} onClick={() => handlePay()}>
                    {paying ? 'Processing…' : `Pay ${rupees(pending.payment.amount)} (test)`}
                  </button>
                  <button className="tv-btn tv-btn--ghost" disabled={paying} onClick={() => setPending(null)}>
                    Cancel
                  </button>
                  <button className="tv-link-btn" disabled={paying} onClick={() => handlePay('failure')}>
                    Simulate a failed payment
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Razorpay goes here: open Razorpay Checkout with pending.order, then
                    call /api/subscription/verify with razorpay_payment_id / _signature. */}
                <p className="tv-muted">This payment method isn&apos;t available in the app yet.</p>
                <button className="tv-btn tv-btn--ghost" onClick={() => setPending(null)}>Close</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Subscription;
