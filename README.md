# PortfolioPulse

PortfolioPulse is a SaaS career intelligence workspace for developers. Members create a private account, run evidence-based analyses of their GitHub, portfolio, and resume, and keep their reports in one workspace.

## SaaS capabilities

- Account registration and sign-in with seven-day signed sessions
- Starter, Pro, and Team plans with monthly analysis credits
- Private workspace with account usage and saved report history
- Public share links for reports, without exposing account credentials
- Pricing page ready for Stripe Checkout integration
- Deterministic scoring plus optional Gemini AI narrative feedback

## Product tiers

| Plan | Analyses / month | Intended customer |
| --- | ---: | --- |
| Starter | 3 | Individual developer trying the product |
| Pro | 25 | Active job seeker |
| Team | 100 | Mentor, bootcamp, or career team |

## Run locally

Requires Node.js 20+.

```powershell
npm install
Copy-Item .env.example .env
npm run start
```

In another terminal:

```powershell
npm run dev
```

Open the app at the URL Vite prints (normally `http://localhost:5173`). Create a free account before running an analysis.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `CLIENT_URL` | No | The deployed frontend origin. |
| `PORT` | No | API port; defaults to `5000`. |
| `MONGODB_URI` | No | Durable accounts and report history. Without it, development uses temporary in-memory storage. |
| `JWT_SECRET` | Yes in production | Long random value used to sign sessions. |
| `GEMINI_API_KEY` | No | Enables generated executive summaries. |
| `GITHUB_TOKEN` | No | Raises GitHub API rate limits. |

## Taking payments live

The product and plan entitlements are in place. To enable real payment collection, connect Stripe Checkout and webhooks, then update a user's `plan` only from a verified Stripe webhook. Keep `JWT_SECRET`, MongoDB, Stripe keys, and Gemini keys in your host's secret manager.

## Safety

- Public-URL scanning blocks local and private network destinations.
- Reports receive server-generated share IDs.
- Resume files are signature-checked and deleted after parsing.
- Passwords are salted with Node's `scrypt`; no plaintext password is stored.
- Local development accepts local browser origins; production allows only `CLIENT_URL`.
