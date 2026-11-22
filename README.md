# Swapno Tech SMM

A Bangladesh-focused SMM panel foundation with React/Vite, Express, MongoDB/Mongoose, cookie-based sessions, BDT wallet UI/API, and a server-only ResellerSMM adapter.

## Local setup
1. Use Node.js 20+ and MongoDB (local or MongoDB Atlas).
2. Copy `.env.example` to root `.env`. Set `MONGODB_URI` and a random `JWT_SECRET` of at least 32 characters.
3. Run `npm install`, then `npm run dev`. Client: http://localhost:5173; API: http://localhost:4000/api/health.

## Demo account
Set `DEMO_ACCOUNT_ENABLED=true`, `DEMO_EMAIL`, and a unique `DEMO_PASSWORD` (12+ characters) in the backend environment. A demo user and sample services are seeded after MongoDB connects. The demo starts with BDT 1,000 simulated balance. Demo orders are not sent to a provider. Do not use demo mode for real payments.

## Production configuration
Set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, and `NODE_ENV=production` in the backend/Vercel environment. Keep provider credentials server-side only. Never commit .env or paste secrets into chat.

## Safety and scope
Registration/login use bcrypt password hashes and signed HTTP-only cookies. User data, orders, deposits and wallet ledger are stored in MongoDB. Deposits remain pending for manual review and are never credited automatically. Live provider fulfillment, protected admin workflows, atomic wallet reconciliation, rate limiting, CSRF hardening, and production monitoring must be completed and tested before accepting real funds or live orders. Non-demo order placement is intentionally disabled until provider integration and admin controls are configured.
