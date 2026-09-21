@echo off
rem Forwards Stripe test-mode webhook events to the local server.
rem Keep this window open while testing payments. It prints the whsec_ signing
rem secret on the first line: copy it into STRIPE_WEBHOOK_SECRET in server/.env.
stripe listen --events payment_intent.succeeded,payment_intent.payment_failed,charge.refunded --forward-to localhost:8000/api/subscription/stripe/webhook
