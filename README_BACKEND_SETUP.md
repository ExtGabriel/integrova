# CFE INSIGHT - Backend Setup Instructions

## Overview
This document explains how to set up the backend proxy server for secure IA functionality in CFE INSIGHT.

## Security Improvements
- ✅ API keys moved to server-side (no longer exposed in client)
- ✅ All IA calls now go through secure backend proxy
- ✅ Improved error handling and logging
- ✅ Better separation of client and server responsibilities

## Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

## Installation

### 1. Install Node.js
Download and install Node.js from https://nodejs.org/
- Choose the LTS (Long Term Support) version
- This will also install npm

### 2. Verify Installation
Open a terminal and run:
```bash
node --version
npm --version
```

### 3. Install Dependencies
In the CFE INSIGHT root directory, run:
```bash
npm install
```

## Configuration

### Environment Variables (Recommended for Production)
Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_actual_openai_api_key_here
PORT=3001
```

### API Key Setup
1. Get your OpenAI API key from https://platform.openai.com/api-keys
2. Replace the placeholder in `server.js` or set the environment variable

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on http://localhost:3001 by default.

## API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and timestamp.

### IA Call
```
POST /api/ai/call
```
Body:
```json
{
  "prompt": "Your prompt here",
  "context": "soporte|auditoria|reporte|chat",
  "provider": "openai",
  "options": {
    "maxTokens": 1000,
    "temperature": 0.7
  }
}
```

### Analyze Logs
```
POST /api/ai/analyze-logs
```
Body:
```json
{
  "logs": [...],
  "analysisType": "general|anomalies|patterns|recommendations"
}
```

### Generate Report
```
POST /api/ai/generate-report
```
Body:
```json
{
  "data": {...},
  "reportType": "general|auditoria|compromisos|usuarios"
}
```

## Client Configuration
The client automatically connects to the backend proxy. Make sure:
- The server is running on the configured port (default: 3001)
- The client config in `App/js/config.js` points to the correct backend URL

## Troubleshooting

### Server won't start
- Check if port 3001 is available
- Verify Node.js and npm are installed
- Check for syntax errors in server.js

### IA calls fail
- Verify your OpenAI API key is correct
- Check server logs for error messages
- Ensure the server is running and accessible

### Client can't connect to backend
- Verify the server is running on the correct port
- Check firewall settings
- Ensure the client config points to the right URL

## Security Notes
- Never commit API keys to version control
- Use environment variables in production
- Keep the server updated with security patches
- Monitor server logs for suspicious activity

## Next Steps
1. Test all IA functionality through the web interface
2. Monitor server performance and logs
3. Set up proper production deployment (nginx, PM2, etc.)
4. Implement rate limiting and additional security measures
