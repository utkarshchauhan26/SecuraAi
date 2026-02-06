<div align="center">

# 🛡️ SecuraAI

### **AI-Powered Code Security Scanner & EU Compliance Engine**

[![Next.js](https://img.shields.io/badge/Next.js-15.2.5-black?logo=next.js)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Semgrep](https://img.shields.io/badge/Semgrep-Static%20Analysis-purple)](https://semgrep.dev)
[![Gemini AI](https://img.shields.io/badge/Gemini%20AI-Powered-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Scan your code for vulnerabilities in seconds. Get AI-powered explanations, remediation steps, and EU AI compliance scoring — all in a beautiful dashboard.

---

</div>

## ✨ What is SecuraAI?

SecuraAI is a **full-stack security scanning platform** that helps developers — especially those who aren't security experts — find and fix vulnerabilities in their code. It combines **Semgrep static analysis** with **Google Gemini AI** to provide human-readable explanations, auto-generated PDF compliance reports, and dual scoring against both industry standards and the **EU AI Code of Practice**.

<br>

## 🚀 Key Features

| Feature | Description |
|---------|-------------|
| 🔍 **Smart Scanning** | Upload files or paste a GitHub repo URL — Semgrep analyzes your code in the cloud via GitHub Actions |
| 🤖 **AI Explanations** | Gemini AI explains each vulnerability in plain English with tailored fix suggestions |
| 📊 **Dual Scoring** | **SecuraAI Smart Score™** (security + best practices) and **EU AI Code of Practice Score** (GPAI compliance) |
| 📄 **PDF Reports** | Beautiful, auto-generated compliance reports with certification badges and charts |
| ⚡ **Fast & Deep Scans** | Fast scan (40+ rules, \~2 min) or Deep scan (60+ rules with SSRF, race conditions, etc.) |
| 🔐 **Authentication** | Google OAuth via NextAuth + Supabase Row Level Security |
| 💰 **Cost Tracking** | Monitor AI API usage and costs per scan |
| 🌗 **Dark Mode** | Gorgeous dark-first UI with Tailwind CSS and glassmorphism |

<br>

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 15)                  │
│    React 19 · Tailwind CSS · shadcn/ui · Framer Motion   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐   ┌────────────┐   ┌──────────────────┐   │
│  │ Dashboard │   │  Reports   │   │   Settings       │   │
│  │  • Upload │   │  • List    │   │   • API Usage    │   │
│  │  • Scan   │   │  • Preview │   │   • Cost Stats   │   │
│  │  • Status │   │  • PDF ⬇️  │   │   • Profile      │   │
│  └─────┬─────┘   └─────┬──────┘   └──────────────────┘   │
│        │               │                                  │
├────────┴───────────────┴──────────────────────────────────┤
│                    BACKEND (Express.js)                    │
│      Supabase Auth · JWT · Rate Limiting · Multer         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Semgrep      │  │  Gemini AI   │  │  PDF Engine    │ │
│  │  40+ Rules    │  │  Explanations│  │  Smart Score   │ │
│  │  Fast / Deep  │  │  Summaries   │  │  EU AI Score   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬─────────┘ │
│         │                 │                  │           │
├─────────┴─────────────────┴──────────────────┴───────────┤
│              INFRASTRUCTURE & STORAGE                     │
│                                                          │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ GitHub Actions │  │  Supabase    │  │  Supabase    │  │
│  │ (Scan Runner)  │  │  PostgreSQL  │  │  Storage     │  │
│  └───────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────┘
```

<br>

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS 4, shadcn/ui, Framer Motion |
| **Backend** | Node.js, Express.js, PDFKit |
| **Database** | Supabase (PostgreSQL) with Row Level Security |
| **Auth** | NextAuth.js (Google OAuth) → Supabase Auth |
| **Analysis** | Semgrep (40+ custom YAML rules) |
| **AI** | Google Gemini API (explanations, summaries, recommendations) |
| **CI/CD** | GitHub Actions (cloud-based scanning) |
| **Deployment** | Vercel (frontend) + Render (backend) |

<br>

## 📦 Quick Start

### Prerequisites

- **Node.js** 18+ and **pnpm**
- **Python 3.x** (for Semgrep)
- **Supabase** project (free tier works)
- **Google OAuth** credentials
- **Gemini API** key

### 1️⃣ Clone & Install

```bash
# Clone the repository
git clone https://github.com/utkarshchauhan26/SecuraAi.git
cd SecuraAi

# Install frontend dependencies
pnpm install

# Install backend dependencies
cd backend
npm install

# Install Semgrep
pip install semgrep
```

### 2️⃣ Environment Setup

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# AI
GEMINI_API_KEY=your-gemini-api-key

# Auth
NEXTAUTH_SECRET=your-nextauth-secret

# GitHub Actions (for cloud scanning)
GITHUB_TOKEN=your-github-pat
```

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXTAUTH_SECRET=your-nextauth-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3️⃣ Database Setup

Run the SQL schema in your Supabase SQL Editor:

```bash
# The schema file is at:
backend/prisma/schema.sql
```

### 4️⃣ Launch

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
pnpm dev
```

Open **http://localhost:3000** 🎉

<br>

## 🔍 Scan Rules

SecuraAI uses **custom Semgrep rules** optimized for real-world detection:

### ⚡ Fast Scan (40+ rules)

| Category | Examples |
|----------|---------|
| 🔴 **Secrets & Credentials** | Hardcoded passwords, API keys, AWS credentials, JWT secrets |
| 🔴 **Injection** | SQL injection, command injection, NoSQL injection, eval() |
| 🔴 **Path Traversal** | Unsanitized file paths, directory traversal |
| 🟠 **XSS** | innerHTML, dangerouslySetInnerHTML, document.write |
| 🟠 **Crypto** | Weak hashing (MD5/SHA1), insecure cookies, HTTP URLs |
| 🟠 **Config** | Wildcard CORS, disabled Helmet headers, open redirects |
| 🟡 **Quality** | Empty catch blocks, console.log, TODO comments, deprecated APIs |

### 🔬 Deep Scan (60+ rules, includes all fast rules)

| Category | Examples |
|----------|---------|
| 🔴 **SSRF** | Server-side request forgery via axios, fetch, requests |
| 🔴 **JWT Attacks** | No-verify decode, "none" algorithm |
| 🔴 **XXE** | XML external entity injection |
| 🟠 **Race Conditions** | TOCTOU file operations |
| 🟠 **Session** | Session fixation, insecure random tokens |
| 🟠 **Infrastructure** | Missing rate limiting, info disclosure headers |
| 🟡 **Defense in Depth** | Missing Helmet, no body size limits |

<br>

## 📄 PDF Reports

Every scan generates a **professional AI-enhanced compliance report** including:

- 📊 **Executive Summary** — findings count, risk metrics, scan metadata
- 🏆 **SecuraAI Smart Score™** — weighted across 5 parameters (security, best practices, maintainability, dependencies, AI ethics)
- 🇪🇺 **EU AI Code of Practice Score** — 5-pillar evaluation (transparency, copyright, risk management, data governance, accountability)
- 🔍 **Detailed Findings** — top 10 vulnerabilities with AI-generated fix suggestions
- 🤖 **Gemini AI Recommendations** — project-level improvement advice
- ✅ **Certification Badge** — Level A through D compliance rating

<br>

## 📁 Project Structure

```
SecuraAI/
├── app/                    # Next.js App Router
│   ├── api/                #   API routes (auth callbacks)
│   ├── auth/               #   Auth pages (sign-in)
│   └── dashboard/          #   Main dashboard pages
├── components/             # React components
│   ├── ui/                 #   shadcn/ui primitives
│   └── providers/          #   Context providers
├── contexts/               # React contexts (scan state)
├── hooks/                  # Custom React hooks
├── lib/                    # API client, utilities
├── backend/                # Express.js API server
│   ├── config/             #   Semgrep rule files (YAML)
│   ├── controllers/        #   Route handlers
│   ├── middleware/          #   Auth, validation
│   ├── services/           #   Core logic (Semgrep, AI, PDF, Scoring)
│   ├── routes/             #   Express route definitions
│   ├── prisma/             #   Database schema
│   └── reports/            #   Generated PDF output
└── .github/workflows/      # GitHub Actions scan runner
```

<br>

## 🔄 How It Works

```
1. 📤 User uploads code or enters a GitHub repo URL
          ↓
2. 🚀 Backend triggers GitHub Actions workflow
          ↓
3. 🔍 GitHub Actions clones repo → runs Semgrep with custom rules
          ↓
4. 💾 Findings inserted into Supabase (scan_id, severity, file, line, code)
          ↓
5. 🤖 Gemini AI generates explanations + Smart Score + EU Score
          ↓
6. 📄 PDF report auto-generated and uploaded to Supabase Storage
          ↓
7. 📊 User views results in dashboard → downloads PDF report
```

<br>

## 🌐 Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| Frontend | **Vercel** | Auto-deploys from `main` branch |
| Backend | **Render** | Web Service with env vars |
| Database | **Supabase** | Free tier PostgreSQL + Storage |
| Scanning | **GitHub Actions** | Triggered via `repository_dispatch` |

> See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for the full deployment guide.

<br>

## ⚠️ Limitations

- Scan rules focus on **JavaScript, TypeScript, Python, Java, Go, Ruby, and PHP**
- AI explanations depend on Gemini API availability and quota
- File upload scanning requires GitHub Actions (cloud-based)
- Analysis depth is bounded by Semgrep's static analysis capabilities
- EU AI compliance scoring is advisory, not a formal certification

<br>

## 🤝 Contributing

Contributions are welcome! To add new vulnerability rules:

1. Edit `backend/config/fast-scan-rules.yaml` (common rules) or `backend/config/deep-scan-rules.yaml` (advanced)
2. Follow the [Semgrep rule syntax](https://semgrep.dev/docs/writing-rules/rule-syntax/)
3. Test locally: `semgrep scan --config=backend/config/fast-scan-rules.yaml your-code/`
4. Open a PR with a description of what the rule detects

<br>

## 📝 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

<br>

<div align="center">

---

**Built with ❤️ by [Utkarsh Chauhan](https://github.com/utkarshchauhan26)**

🛡️ *Making security accessible to every developer*

</div>