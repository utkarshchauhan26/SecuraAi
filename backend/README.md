# AI Security Auditor Backend

Backend service for the AI Security Auditor application, providing code scanning, vulnerability detection, and AI-powered explanations.

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- Python 3.x (for Semgrep)
- Semgrep (`pip install semgrep`)
- OpenAI API key

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   OPENAI_API_KEY=your-openai-api-key
   MAX_TOKENS_PER_REQUEST=2000
   CACHE_TTL=3600
   UPLOADS_DIR=./uploads
   TEMP_DIR=./temp
   GITHUB_TOKEN=your-github-token-if-needed
   ```

3. Ensure Semgrep is installed:
   ```bash
   pip install semgrep
   ```

4. Create required directories:
   ```bash
   mkdir -p uploads temp
   ```

### Running the Server

Development mode:
```bash
npm run dev
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