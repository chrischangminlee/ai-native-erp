# Quick Start Guide

## Prerequisites
- Node.js v16+ installed
- npm installed

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd manufacturing-erp-demo
   npm install
   ```

2. **Start the Application**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend API on http://localhost:3001
   - Frontend on http://localhost:5173
   - API Docs on http://localhost:3001/api-docs

## Troubleshooting

### "Network Error" in Frontend

1. **Ensure both servers are running**
   - You should see output from both backend and frontend in the terminal
   - Backend should show: "Server running on http://localhost:3001"
   - Frontend should show: "Local: http://localhost:5173"

2. **If backend fails to start**
   - Check if port 3001 is already in use: `lsof -i :3001`
   - Kill any existing process: `kill -9 <PID>`

3. **Start servers individually for debugging**
   ```bash
   # Terminal 1
   npm run dev:backend

   # Terminal 2
   npm run dev:frontend
   ```

4. **Reset the database**
   If data seems corrupted:
   ```bash
   rm backend/src/db/erp.db
   npm run dev:backend  # Will recreate and seed database
   ```

## Verify Installation

1. **Check Backend Health**
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Check Sample API Response**
   ```bash
   curl http://localhost:3001/api/sales/dashboard
   ```

## Default Credentials
- No authentication required for demo
- All data is mock/sample data

## Browser Requirements
- Modern browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled