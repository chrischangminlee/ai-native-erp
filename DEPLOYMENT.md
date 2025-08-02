# Deployment Guide (Gemini AI Frontend)

This is a frontend-only application that uses Google Gemini AI directly from the browser.

## Vercel Deployment (Recommended)

1. Set up your Gemini API key:
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key

2. Push your code to GitHub

3. Deploy to Vercel:
   - Go to [Vercel](https://vercel.com) and sign in
   - Click "New Project" and import your GitHub repository
   - Add environment variable:
     - Name: `VITE_GEMINI_API_KEY`
     - Value: Your Gemini API key
   - Click "Deploy"

## Alternative Deployment Options

### Netlify
1. Build the project:
   ```bash
   cd llm-retrieval-experiment/frontend
   npm run build
   ```
2. Go to Netlify dashboard
3. Add environment variable: `VITE_GEMINI_API_KEY`
4. Drag and drop the 'dist' folder

### Local Development
```bash
cd llm-retrieval-experiment/frontend
cp .env.example .env
# Edit .env to add your Gemini API key
npm install
npm run dev
```

## Important Notes

- The Gemini API key is required for the application to work
- The API key is used directly from the browser (client-side)
- Google's Gemini API supports CORS for browser usage
- Keep your API key secure and use Vercel's environment variables for production