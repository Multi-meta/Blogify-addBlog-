// ============================================================
// StripeCheckout — the card form shown inside the subscription modal.
// Uses Stripe's Payment Element (Stripe's secure fields in an iframe, so card
// numbers never touch this app or our server), styled with the site's colours.
// `order` is what the server's /api/subscription/checkout returned for a Stripe
// payment: { clientSecret, publishableKey }. Nothing secret is used here.
// onPaid() runs once Stripe accepts the payment; the caller then asks the server to
// confirm it (the server re-checks with Stripe before granting the plan).
// ============================================================

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// One Stripe.js instance per publishable key
const stripePromises = {};
const getStripe = (key) => (stripePromises[key] ||= loadStripe(key));

// Match the site: same font, gold accent, navy text, 8px corners
const appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#c9a84c',
    colorText: '#1a1a2e',
    colorDanger: '#b91c1c',
    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    borderRadius: '8px',
  },
};

function PayForm({ amountLabel, busy, onPaid, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage]       = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setMessage('');
    const { error } = await stripe.confirmPayment({
      elements,
      // Only used if the bank asks for a redirect; cards normally stay on this page
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    if (error) {
      // e.g. card declined: the user can fix the details and try again
      setMessage(error.message || 'The payment could not be completed.');
      setSubmitting(false);
      return;
    }
    await onPaid();
    setSubmitting(false);
  }

  const working = submitting || busy;

  return (
    <form onSubmit={submit}>
      {/* Cards only: hide Stripe Link ("save my information") and wallet buttons */}
      <PaymentElement options={{ wallets: { link: 'never', applePay: 'never', googlePay: 'never' } }} />
      {message && <div className="tv-error" style={{ marginTop: '0.75rem', marginBottom: 0 }}>{message}</div>}
      <div className="tv-modal__actions" style={{ marginTop: '1rem' }}>
        <button className="tv-btn tv-btn--gold" disabled={!stripe || working}>
          {working ? 'Processing…' : `Pay ${amountLabel}`}
        </button>
        <button type="button" className="tv-btn tv-btn--ghost" disabled={working} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function StripeCheckout({ order, amountLabel, busy, onPaid, onCancel }) {
  if (!order.publishableKey || !order.clientSecret) {
    return <div className="tv-error">Card payments are not set up on the server yet.</div>;
  }
  const testMode = order.publishableKey.startsWith('pk_test_');

  return (
    <>
      {testMode && (
        <div className="tv-modal__test">
          🧪 <strong>Test mode.</strong> No real money is charged. Use card{' '}
          <strong>4242 4242 4242 4242</strong>, any future expiry date, any 3-digit code.
        </div>
      )}
      <Elements stripe={getStripe(order.publishableKey)} options={{ clientSecret: order.clientSecret, appearance }}>
        <PayForm amountLabel={amountLabel} busy={busy} onPaid={onPaid} onCancel={onCancel} />
      </Elements>
    </>
  );
}

export default StripeCheckout;
