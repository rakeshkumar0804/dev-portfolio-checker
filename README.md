# Developer Portfolio Health Checker 🔍

> AI-powered Career Intelligence Platform — analyze your GitHub, portfolio, and resume to see exactly how you look to recruiters.

## Features

- **Calibrated Scoring** — real scores with evidence breakdowns, not random numbers
- **Score Evidence** — click any score to see exactly why it's that value (metric-by-metric)
- **Improvement Cards** — each suggestion shows: why it matters, how to fix it, +points gained, difficulty & time estimate
- **10-Second Recruiter Scan** — animated simulation of what a recruiter notices in their first 10 seconds
- **Portfolio Audit** — SEO, accessibility, mobile responsiveness, content & performance checks
- **Resume Analysis** — ATS score, keyword matching, action verb detection, GitHub consistency check
- **Career Roadmap** — AI-generated weekly milestones from your current level to target level
- **Skill Gap Detection** — compares your GitHub skills against your target role requirements
- **Shareable Reports** — permanent public link for every analysis

## Tech Stack

**Backend:** Node.js · Express · MongoDB · Gemini AI · Cheerio · pdf-parse  
**Frontend:** React 18 · Vite · React Router · Vanilla CSS

## Setup

### 1. Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY and MONGODB_URI
npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

## Environment Variables

`backend/.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/devportfolio
GEMINI_API_KEY=your_key_here
GITHUB_TOKEN=          # optional, increases rate limit from 60 to 5000/hr
CLIENT_URL=http://localhost:5173
```

## Project Structure

```
developer-portfolio/
├── backend/
│   ├── controllers/     # analyzeController, resumeController
│   ├── models/          # Report.js (MongoDB schema)
│   ├── routes/          # analyzeRoutes, resumeRoutes
│   ├── services/        # githubService, portfolioService, scoringService, aiService, resumeService
│   ├── utils/           # connectDatabase
│   └── server.js
└── frontend/
    ├── src/
    │   ├── components/  # ScoreGauge, ImprovementCard, RecruiterSimulator, CareerRoadmap, etc.
    │   ├── pages/       # HomePage, ResultsPage
    │   ├── services/    # apiService
    │   ├── styles.css
    │   └── App.jsx
    └── index.html
```
