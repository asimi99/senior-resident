# Senior Resident

A reasoning coach that sits beside your question bank and walks you to the answer one decision at a time.

- `index.html` landing page, pricing, install
- `app/` the coach (web app, and the page the extension shows in its side panel)
- `extension/senior-resident/` Chrome extension (Manifest V3), zipped as `extension/senior-resident.zip`
- `supabase/` database schema, the `resident` coach function and the `sr-stripe` webhook
- `config.js` prices, free allowance, Stripe links and the billing switch

## Turning on payments

1. Supabase SQL editor: run `supabase/senior-resident.sql`.
2. Supabase Edge Functions: deploy `resident` and `sr-stripe`, both with JWT verification off. Secrets: `ANTHROPIC_API_KEY`, `BILLING_LIVE=true`, `STRIPE_WEBHOOK_SECRET`.
3. Stripe: create a Pro product with a monthly price, make a Payment Link for it, and add a webhook to `.../functions/v1/sr-stripe` for `checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted`.
4. `config.js`: paste the link (and the customer portal link), set `BILLING_LIVE: true`.

Until then everyone has full access and Upgrade collects a waitlist.

## Website and portal
- The website (index.html, how.html, pricing.html at the root) is static HTML built from app/home.js. After changing home.js, serve the repo root on port 8811 and run `python3 build/landing.py`.
- The portal is /app/. Signed out, it allows one coached question per browser, then asks for a free account. #try, #signin, #signup, #plan, #exam and #stats open that part of the portal.
