# 🚀 PortfolioPulse
> **Built to help developers understand how recruiters evaluate technical profiles before the interview stage.**

PortfolioPulse is a full-stack developer career intelligence platform that analyzes **GitHub profiles, portfolio websites, and resumes** to generate evidence-based hiring insights.

Instead of relying on vanity metrics, it evaluates repository quality, documentation, portfolio structure, resume readiness, and technical presentation using **deterministic, rule-based scoring** — every score is backed by real, explainable evidence, not a black-box guess.

## ✨ Features

- 🔍 GitHub Repository Analysis
- 🌐 Portfolio Website Evaluation
- 📄 Resume & ATS Analysis
- 📊 Hiring Readiness Score (rule-based, fully explainable)
- 🎭 Recruiter Screening Simulation (illustrative walkthrough of what a recruiter checks)
- 📈 Personalized Career Roadmap
- 📑 PDF Report Export
- 💾 Workspace for Saved Reports

---

## 🛠️ Tech Stack

**Frontend**
- React
- Vite
- React Router
- Axios

**Backend**
- Node.js
- Express.js
- MongoDB Atlas
- JWT Authentication

**APIs**
- GitHub REST API

**Deployment**
- Vercel

---

## 🚀 Getting Started

Clone the repository
```bash
git clone https://github.com/rakeshkumar0804/dev-portfolio-checker.git
```

Install dependencies (run in both `client` and `server` folders if applicable)
```bash
npm install
```

Create a `.env` file (see `.env.example`)
```env
MONGODB_URI=
JWT_SECRET=
GITHUB_TOKEN=
```

> Note: You'll need a GitHub Personal Access Token with `public_repo` and `read:user` scopes. Generate one at github.com → Settings → Developer settings → Personal access tokens.

Run the project
```bash
npm run dev
```

---

## 📸 Preview

> Add screenshots of:
- Home Page
- GitHub Analysis
- Hiring Dashboard
- Resume Analysis
- Workspace

---

## 💡 Why PortfolioPulse?

Most profile analyzers only display raw GitHub statistics with no context. PortfolioPulse combines GitHub analysis, portfolio evaluation, resume review, and hiring intelligence into a single report — and every score is deterministic and rule-based, with the underlying evidence shown next to each number. Nothing is a black box: if a score is low, you can see exactly why, and exactly what to fix.

---

## 👨‍💻 Author

**Rakesh Kumar**
- GitHub: https://github.com/rakeshkumar0804
- Portfolio: https://dev-portfolio-checker.vercel.app

---

⭐ If you found this project useful, consider giving it a star.
