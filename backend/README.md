# SecuraAI Backend

Backend service for SecuraAI - AI-powered security code auditing platform.

## Features

- 🔐 **Authentication**: Supabase Auth with GitHub/Google OAuth
- 🗄️ **Database**: PostgreSQL via Supabase with Prisma ORM
- 🔍 **Code Scanning**: Semgrep integration for static analysis
- 🤖 **AI Explanations**: OpenAI GPT-4o-mini for vulnerability insights
- 💰 **Cost Tracking**: Token usage and budget management
- 📊 **PDF Reports**: Comprehensive security reports with Puppeteer
- ⚡ **Caching**: Response caching to reduce API costs

## Prerequisites

- **Node.js** v18+ 
- **Python 3.x** (for Semgrep)
- **Semgrep** (`pip install semgrep`)
- **Supabase Account** (free tier works)
- **OpenAI API Key** (for AI explanations)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

Follow the comprehensive guide in `../SUPABASE_SETUP.md` to:
- Create Supabase project
- Configure OAuth providers (GitHub + Google)
- Run database migrations
- Get API keys and connection string

### 3. Configure Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Required variables:
```bash
# Database (from Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# Supabase API (from Supabase dashboard)
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret

# Authentication
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

### 4. Generate Prisma Client

```bash
npm run prisma:generate
```

### 5. Install Semgrep

```bash
pip install semgrep
# Verify installation
semgrep --version
```

### 6. Create Required Directories

```bash
mkdir -p uploads temp cache
```

### 7. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:5000`

## Project Structure

```
backend/
├── controllers/         # Request handlers
│   ├── scan.controller.js
│   ├── github.controller.js
│   ├── report.controller.js
│   └── usage.controller.js
├── middleware/          # Express middleware
│   ├── auth.js         # JWT verification
│   └── fileValidation.js
├── services/           # Business logic
│   ├── semgrep.service.js    # Code scanning
│   ├── ai.service.js         # OpenAI integration
│   ├── scoring.service.js    # Risk calculation
│   └── usage.service.js      # Cost tracking
├── routes/             # API routes
│   ├── index.js
│   ├── scan.routes.js
│   ├── github.routes.js
│   ├── report.routes.js
│   └── usage.routes.js
├── prisma/            # Database
│   ├── schema.prisma  # Prisma schema
│   └── schema.sql     # Supabase SQL
├── lib/               # Utilities
│   └── prisma.js      # Prisma client
└── server.js          # Entry point
```

Production mode:
```bash
npm start
```

## API Endpoints

### Scan Endpoints

- `POST /api/scan/file` - Upload and scan a file
- `POST /api/scan/repo` - Scan a GitHub repository
- `GET /api/scan/status/:scanId` - Get scan status
- `GET /api/scan/results/:scanId` - Get scan results

### Report Endpoints

- `GET /api/report/:scanId` - Get scan report
- `GET /api/report/:scanId/pdf` - Generate PDF report

### Usage Endpoints

- `GET /api/usage/stats` - Get API usage statistics

## Architecture

- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic for scanning, AI integration, etc.
- **Middleware**: Request validation, authentication, etc.
- **Routes**: API endpoint definitions
- **Utils**: Helper functions and utilities

## Key Components

- **Semgrep Integration**: Static code analysis using Semgrep
- **OpenAI Integration**: AI-powered explanations for vulnerabilities
- **Caching**: Token usage optimization through response caching
- **Usage Tracking**: API call monitoring and cost estimation

## Development

### Adding New Vulnerability Rules

To add custom Semgrep rules, create YAML files in the `rules` directory following the Semgrep rule format.

### Extending AI Capabilities

Modify the `services/ai.service.js` file to change the AI prompt or parsing logic.

## License

[MIT](LICENSE)