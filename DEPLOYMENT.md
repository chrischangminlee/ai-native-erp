# Deployment Guide (Frontend-Only Demo)

This is a frontend-only demo version that doesn't require backend deployment.

## Vercel Deployment (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and sign in
3. Click "New Project" and import your GitHub repository
4. Vercel will automatically detect the configuration from `vercel.json`
5. Click "Deploy" - no environment variables needed!

## Alternative Static Hosting Options

Since this is a static frontend application, you can deploy it to any static hosting service:

### Netlify
```bash
cd llm-retrieval-experiment/frontend
npm run build
# Drag and drop the 'dist' folder to Netlify
```

### GitHub Pages
```bash
cd llm-retrieval-experiment/frontend
npm run build
# Configure GitHub Pages to serve from the dist folder
```

### Local Preview
```bash
cd llm-retrieval-experiment/frontend
npm run build
npm run preview
```

## Important Notes

- This demo version uses mock LLM responses (keyword-based matching)
- All data is embedded in the frontend bundle
- No API keys or backend services required
- Perfect for demonstrations and testing the UI/UX flow