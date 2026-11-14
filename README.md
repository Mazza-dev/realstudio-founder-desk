# RealStudio Founder Desk

The dashboard lives in `public/`. Visitors can open it directly. Their status, video, and decision changes stay in their browser. `api/report.js` generates the end of day report through OpenRouter, with a browser fallback if the API is unavailable.

## Vercel settings

Import this repository with the **Other** framework preset. Keep `public` as the output directory. Add this server environment variable before the production deployment:

- `OPENROUTER_API_KEY`
