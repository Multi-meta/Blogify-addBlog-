// ============================================================
// Payment gateway abstraction
//
// The rest of the app only talks to getProvider(). To go live with Razorpay:
//   1. set PAYMENT_PROVIDER=razorpay, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
//   2. fill in the two razorpay functions below
//   3. (recommended) add a webhook route for `payment.captured` that calls
//      activatePayment() from services/subscription.js — it is idempotent, so
//      the browser verify call and the webhook can both fire safely.
// Nothing else (models, routes, UI access rules) needs to change.
//
// PAYMENT_PROVIDER=stripe is implemented below (PaymentIntents + Payment Element).
// Keys live in server/.env only: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY (public,
// sent to the browser), STRIPE_WEBHOOK_SECRET (see routes/stripeWebhook.js).
//
// Provider contract:
//   createOrder(payment)        -> { gateway, orderId, amount, currency, ...extra for the client }
//   verify(payment, clientBody) -> { ok, gatewayPaymentId?, gatewaySignature?, reason? }
//                                  or { ok: false, pending: true } while the gateway is still
//                                  processing (the payment is then left open, not failed)
//   refund(payment, amount)     -> { ok, gatewayRefundId?, reason? }
// ============================================================

const isProduction = process.env.NODE_ENV === "production";

// One Stripe client, created on first use so the app boots without Stripe keys
let stripeClient = null;
function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY is missing).");
  // Test mode only: a live key (sk_live_...) is refused so real money can never move by accident
  if (!/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY)) throw new Error("Only Stripe test-mode keys (sk_test_...) are allowed.");
  if (!stripeClient) stripeClient = require("stripe")(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

// Stripe takes the smallest currency unit (paise for INR)
const minorUnits = (amount) => Math.round(amount * 100);

const providers = {
  // Test provider: "pays" instantly with no money moving. Lets the whole
  // subscribe / upgrade / expire flow be built and demoed before a gateway exists.
  mock: {
    async createOrder(payment) {
      return {
        gateway: "mock",
        orderId: `mock_order_${payment._id}`,
        amount: payment.amount,
        currency: payment.currency,
      };
    },
    async verify(payment, body) {
      if (body && body.simulate === "failure") {
        return { ok: false, reason: "Simulated payment failure." };
      }
      return { ok: true, gatewayPaymentId: `mock_pay_${payment._id}` };
    },
    async refund(payment) {
      return { ok: true, gatewayRefundId: `mock_refund_${payment._id}` };
    },
  },

  // Stripe, test mode. The server prices the order and creates a PaymentIntent; the
  // browser only receives its client secret to show the card form (Payment Element).
  // Access is granted when Stripe confirms the payment: by the signed webhook, or by
  // verify() re-reading the PaymentIntent from Stripe. Never on the browser's word.
  stripe: {
    async createOrder(payment) {
      const intent = await stripe().paymentIntents.create(
        {
          amount: minorUnits(payment.amount),
          currency: payment.currency.toLowerCase(),
          payment_method_types: ["card"],
          description: `Blogify ${payment.planName} plan`,
          metadata: { paymentId: String(payment._id), userId: String(payment.user) },
        },
        { idempotencyKey: `checkout_${payment._id}` }
      );
      return {
        gateway: "stripe",
        orderId: intent.id,
        amount: payment.amount,
        currency: payment.currency,
        clientSecret: intent.client_secret,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
      };
    },
    async verify(payment) {
      const intent = await stripe().paymentIntents.retrieve(payment.gatewayOrderId);
      // The intent must be the one created for this payment, for this exact amount
      if (
        intent.metadata.paymentId !== String(payment._id) ||
        intent.amount !== minorUnits(payment.amount) ||
        intent.currency !== payment.currency.toLowerCase()
      ) {
        return { ok: false, reason: "Payment details did not match." };
      }
      if (intent.status === "succeeded") return { ok: true, gatewayPaymentId: intent.latest_charge || intent.id };
      if (intent.status === "canceled") return { ok: false, reason: "Payment was cancelled." };
      return { ok: false, pending: true, reason: "The payment has not been confirmed yet." };
    },
    async refund(payment, amount) {
      const refund = await stripe().refunds.create(
        { payment_intent: payment.gatewayOrderId, amount: minorUnits(amount) },
        { idempotencyKey: `refund_${payment._id}` }
      );
      return { ok: refund.status !== "failed" && refund.status !== "canceled", gatewayRefundId: refund.id, reason: refund.failure_reason };
    },
  },

  razorpay: {
    async createOrder(/* payment */) {
      // TODO: POST https://api.razorpay.com/v1/orders with
      //   { amount: Math.round(payment.amount * 100) /* paise */, currency: payment.currency,
      //     receipt: String(payment._id) }
      // using Basic auth (KEY_ID:KEY_SECRET), and return
      //   { gateway: "razorpay", orderId: order.id, amount, currency, keyId: KEY_ID }
      throw new Error("Razorpay is not connected yet.");
    },
    async verify(/* payment, body */) {
      // TODO: body = { razorpay_order_id, razorpay_payment_id, razorpay_signature }.
      // Valid when HMAC-SHA256(`${order_id}|${payment_id}`, KEY_SECRET) === signature
      // (compare with crypto.timingSafeEqual) and order_id === payment.gatewayOrderId.
      throw new Error("Razorpay is not connected yet.");
    },
    async refund(/* payment, amount */) {
      // TODO: POST https://api.razorpay.com/v1/payments/{payment.gatewayPaymentId}/refund
      // with { amount: Math.round(amount * 100) /* paise */ } using Basic auth, and return
      //   { ok: true, gatewayRefundId: refund.id }
      throw new Error("Razorpay is not connected yet.");
    },
  },
};

// getProvider()           -> the provider new payments use (PAYMENT_PROVIDER)
// getProvider("stripe")   -> a specific one, e.g. to refund a payment made with it
function getProvider(which) {
  const name = (which || process.env.PAYMENT_PROVIDER || "mock").toLowerCase();
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown PAYMENT_PROVIDER "${name}".`);

  // The mock provider grants access for free, so it must never be reachable
  // on the live site unless someone opts in on purpose.
  if (name === "mock" && isProduction && process.env.ALLOW_MOCK_PAYMENTS !== "true") {
    throw new Error("Payments are not enabled yet.");
  }
  return { name, ...provider };
}

module.exports = { getProvider };
