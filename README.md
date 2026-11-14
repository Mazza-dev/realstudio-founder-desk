# RealStudio Founder Desk

The dashboard lives in `public/`. Its sign in, saved statuses, videos, and decisions use Supabase. `api/report.js` generates the end of day report through OpenRouter.

## Vercel settings

Import this repository with the **Other** framework preset. Keep `public` as the output directory. Add these server environment variables before the production deployment:

- `OPENROUTER_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

The public Supabase URL and publishable key in `public/config.js` are browser configuration. Never put a database password or Supabase service role key there.
