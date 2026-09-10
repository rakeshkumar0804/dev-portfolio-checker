PortfolioPulse

Evidence-based GitHub, portfolio, and resume analysis for developers.

PortfolioPulse brings developer profile analysis into a SaaS career intelligence workspace. Members can evaluate their public GitHub activity, portfolio website, and resume, review scores and supporting evidence, and keep reports alongside their account usage and analysis history.

Live App

What it does

Area

Purpose

GitHub analysis

Inspect public profile, repository, and activity evidence.

Portfolio analysis

Inspect website structure, metadata, and discoverable contact, resume, and social links.

Resume analysis

Parse an uploaded PDF for technical skills, structure, and ATS-oriented indicators.

Profile comparison

Compare detected skills across sources and against the selected target role.

Scoring and feedback

Present deterministic scores with optional Gemini-generated narrative feedback.

Member workspace

Track account usage and saved report history.

Report sharing

Share a report through a server-generated public link.

How analysis works

Create an account and sign in to your workspace.

Choose your analysis scope and target role. Provide the GitHub username, portfolio URL, and/or resume PDF required by that scope.

Run the analysis. PortfolioPulse collects evidence from the selected sources and applies its scoring rules.

Review the report. Inspect numerical scores, source findings, detected skills, and any available narrative feedback.

Keep or share the result. Access saved reports from your workspace or share a report link.

Understanding the scores

Numerical scores come from deterministic application rules. Optional Gemini feedback provides narrative interpretation; it does not determine the underlying numerical scores.

These scores are heuristic assessments of the evidence the application can inspect. They are not hiring probabilities, guarantees of interview selection, or certifications of technical proficiency. Resume ATS indicators do not guarantee a result in a particular employer's applicant tracking system.

Evidence coverage matters: a skill not detected in inspected sources does not establish that a developer lacks that skill. Website rendering, upstream availability, and API rate limits can also affect what can be inspected. Review source availability and supporting evidence alongside the headline score.

Accounts and plans

Accounts use registration and sign-in with seven-day signed sessions. Each plan includes a monthly analysis allowance.

Plan

Analyses per month

Intended use

Starter

3

Individual developers trying the product

Pro

25

Active job seekers

Team

100

Mentors, bootcamps, or career teams

Billing status: Plan entitlements and a pricing page are in place. Stripe Checkout and webhook integration are still required before collecting payments. The Team allowance does not, by itself, imply shared workspaces or team administration features.

Technology

Layer

Technology

Frontend

React and Vite

API

Node.js

Durable storage

MongoDB

Public developer evidence

GitHub API and portfolio inspection

Optional narrative generation

Google Gemini API

Password hashing

Node.js scrypt

Run locally

Prerequisites

Node.js 20 or newer and npm

A local copy of this repository

MongoDB if you want accounts and report history to persist

From the repository root, install dependencies and create your environment file.

PowerShell

npm install
Copy-Item .env.example .env

macOS / Linux

npm install
cp .env.example .env

Edit .env using the settings below, then start the API:

npm run start

In a second terminal, start the frontend:

npm run dev

Open the URL printed by Vite, normally http://localhost:5173, and create a free account before running an analysis. The API defaults to port 5000.

Production frontend build

npm run build

This builds the frontend; the API and its environment must also be configured for a working deployment.

Environment variables

Use .env.example as the configuration template. Keep secrets out of version control.

Variable

Requirement

Purpose

CLIENT_URL

Set for production

Allowed frontend origin for production API requests.

PORT

Optional

API port; defaults to 5000.

MONGODB_URI

Needed for durable storage

Persists accounts and report history. Development without MongoDB uses temporary in-memory storage.

JWT_SECRET

Required in production

Long, random secret used to sign sessions.

GEMINI_API_KEY

Optional

Enables generated executive summaries and narrative feedback.

GITHUB_TOKEN

Optional

Raises GitHub API rate limits for server-side requests.

In-memory development data is temporary and does not survive a process restart. Configure MongoDB for deployments that need persistent accounts and reports.

Privacy and security

Workspace access: Account usage and saved report management require sign-in.

Public reports: Report links are accessible to anyone who has the link. A private account does not make a shared report private. Account credentials are not exposed through report sharing.

Passwords: Passwords are salted and hashed with Node.js scrypt; plaintext passwords are not stored.

Resume uploads: PDF signatures are checked, and temporary files are deleted after parsing.

URL inspection: Public-URL scanning includes protections against requests to local and private network destinations.

Browser origins: Local development permits local browser origins; production restricts allowed origins to CLIENT_URL.

Optional AI processing: Enabling Gemini sends analysis context to an external provider. Review the application's privacy disclosures before submitting personal information.

Taking payments live

Before enabling paid subscriptions:

Connect the pricing flow to Stripe Checkout.

Implement server-side webhook handling and verify webhook signatures.

Update a user's paid plan only from verified payment events, never from a browser-supplied plan value or a success-page redirect.

Define and test subscription cancellation, failed-payment, and entitlement-update behavior.

Keep session secrets, MongoDB credentials, and provider keys in the deployment host's secret manager. Stripe configuration should be documented when the integration is implemented.

Current limitations

Payment collection is not connected yet.

Optional AI feedback depends on provider availability and may be unavailable for a report.

Public-source inspection is limited to accessible evidence; it cannot establish a developer's complete capabilities.

Shared report links are public, even when the report is saved in an authenticated workspace.

Built by Rakesh Kumar.
