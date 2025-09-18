# SecuraAI

A lightweight, AI-powered web application that helps identify security vulnerabilities in code with static analysis, natural language explanations, and remediation suggestions.

## Project Overview

SecuraAI is designed to help developers, especially those who aren't security experts, identify and fix common security vulnerabilities in their code. It combines static code analysis with AI-powered explanations to make security more accessible.

### Key Features

1. **Code Upload & Analysis**
   - Upload individual source code files
   - Provide GitHub repository links for scanning
   - Static analysis using Semgrep

2. **Vulnerability Detection**
   - SQL Injection detection
   - Cross-Site Scripting (XSS) detection
   - Hardcoded Secrets identification
   - Unsafe Data Handling pattern detection

3. **AI-Powered Explanations**
   - Human-readable explanations of vulnerabilities
   - Plain language descriptions of why issues matter
   - Specific fix suggestions tailored to the code

4. **Security Scoring**
   - Overall project security scoring
   - Risk level assessment
   - Vulnerability categorization by severity

5. **Cost Awareness**
   - API usage tracking
   - Cost estimation for AI services
   - Caching to minimize API usage

## Technology Stack

- **Frontend:** Next.js with React and Tailwind CSS
- **Backend:** Node.js with Express
- **Static Analysis:** Semgrep
- **AI Integration:** OpenAI GPT
- **Caching:** Node-Cache (in-memory caching)

## Setup Instructions

### Prerequisites

- Node.js (v14+ recommended)
- npm or pnpm
- Python 3.x (for Semgrep)
- OpenAI API key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Semgrep:
   ```bash
   pip install semgrep
   ```

4. Create a `.env` file in the backend directory with the following variables:
   ```
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   OPENAI_API_KEY=your-openai-api-key
   MAX_TOKENS_PER_REQUEST=2000
   CACHE_TTL=3600
   ```

5. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Install dependencies from the project root:
   ```bash
   npm install
   # or
   pnpm install
   ```

2. Create a `.env.local` file in the project root with:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Guide

### Scanning Individual Files

1. Navigate to the dashboard
2. Click on the upload zone or drag and drop a file
3. Configure scan parameters (severity levels, scan depth)
4. Click "Start Scan"
5. View results in the vulnerability report section

### Scanning GitHub Repositories

1. Navigate to the dashboard
2. Enter a GitHub repository URL
3. Configure scan parameters
4. Click "Start Scan"
5. View results in the vulnerability report section

### Understanding Results

- **Vulnerability List:** All detected issues sorted by severity
- **Security Score:** Overall rating of your code's security
- **Explanation:** AI-generated explanation of each issue
- **Fix Suggestions:** Specific code examples to fix each vulnerability

### Usage Statistics

View your API usage and cost estimates in the Settings section.

## Development

### Project Structure

- **Frontend (Next.js)**
  - `/app`: Next.js app router pages
  - `/components`: Reusable UI components
  - `/lib`: Utility functions and API client
  - `/styles`: Global CSS styles

- **Backend (Express)**
  - `/controllers`: Request handlers
  - `/services`: Business logic
  - `/middleware`: Express middleware
  - `/routes`: API endpoint definitions

### Adding New Rules

To add custom Semgrep rules for new vulnerability types:

1. Create YAML rule files in `backend/rules/`
2. Follow Semgrep rule format (see [Semgrep documentation](https://semgrep.dev/docs/writing-rules/rule-syntax/))
3. Update the `semgrep.service.js` to include your custom rules

## Limitations

- Currently supports a limited set of programming languages
- Analysis depth depends on Semgrep's capabilities
- AI explanations may occasionally require technical interpretation

## License

MIT