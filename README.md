# Swapno Tech SMM

MERN starter for an independent, Bangladesh-first SMM reseller panel. React/Vite client, Express API, MongoDB/Mongoose, BDT-oriented UI, and a server-only ResellerSMM v2 adapter. Provider boundary is designed to allow additional providers later.

## Run locally
1. Install Node.js 20+ and MongoDB.
2. Copy `.env.example` to `.env` at repository root.
3. Add your ResellerSMM API key to `RESELLERSMM_API_KEY` in that local `.env` file. Never paste it into chat, React code, or GitHub. Keep SSL verification enabled.
4. Run `npm install`, then `npm run dev`.

Client: http://localhost:5173 · API: http://localhost:4000/api/health

## Where to place the API key
Local: root `.env`, variable `RESELLERSMM_API_KEY`. Production: backend service's environment/secrets configuration, same variable. Do not set it in frontend/Vite environment variables. The repository intentionally includes only a blank-key `.env.example`.

## Important scope / launch checklist
This commit is the application foundation and dashboard shell, **not a production-ready panel**. Before accepting deposits or orders, implement and test account authentication, admin authorization, immutable wallet ledger with atomic balance updates, manual deposit approval, service sync, order state machine and reconciliation, rate limits, CSRF/CORS policy, audit logs, backups, and deployment secrets. Never trust prices, balances, or provider status supplied by the browser. Use idempotency for order creation and wallet mutations.
