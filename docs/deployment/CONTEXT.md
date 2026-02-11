# Deployment Context

## Infrastructure

### Supabase (Database + Auth + API)

**Plan:** Free tier (sufficient for single-user tool)
- 500MB database storage
- 50,000 monthly active users (we need 1)
- 1GB file storage (not needed for v1)
- 2 million edge function invocations (not needed)

**Setup Steps:**

1. Create a Supabase project at https://supabase.com
2. Note the project URL and anon key from Settings > API
3. Run the migration SQL files from `supabase/migrations/` in the SQL Editor
4. Enable email/password auth in Authentication > Providers
5. Create the initial user account (the DNA Lead)
6. Enable RLS on all tables (included in migrations)

**Environment Variables:**
```
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

### Vercel (Frontend Hosting)

**Plan:** Hobby (free tier)
- Unlimited deployments
- HTTPS included
- Auto-deploys from Git

**Setup Steps:**

1. Push the repo to GitHub (private repo)
2. Connect Vercel to the GitHub repo
3. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

**Build Settings:**
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

### Custom Domain (Optional)

If desired, add a custom domain in Vercel. Otherwise, the app is accessible at `[project-name].vercel.app`.

## GitHub Repository

**Visibility:** Private
**Branch strategy:** Single `main` branch for v1. No need for complex branching.

**Recommended .gitignore additions:**
```
.env
.env.local
node_modules/
dist/
```

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Database Changes
1. Write SQL migration in `supabase/migrations/`
2. Run in Supabase SQL Editor (or use Supabase CLI for local dev)
3. Commit migration file to Git

### Deploying Changes
1. Commit and push to `main`
2. Vercel auto-deploys
3. If database changes are needed, run migrations in Supabase dashboard first

## Security Considerations

### Supabase Anon Key
The anon key is safe to expose in client-side code. It's designed for this. RLS policies ensure that even with the key, users can only access their own data.

### Authentication
- Email/password auth via Supabase
- Session tokens stored in browser localStorage by the Supabase JS client
- Sessions expire after configurable duration (default: 1 week)
- On mobile/Teams browser: user logs in once, session persists

### Data in Transit
- All Supabase connections are HTTPS/TLS
- All Vercel traffic is HTTPS
- No data transmitted in plaintext

### Data at Rest
- Supabase encrypts data at rest (managed by Supabase infra)
- Combined with masking convention, even a database breach reveals no identifiable information

## Monitoring (v2)

Not needed for v1. Future options:
- Vercel Analytics for frontend performance
- Supabase dashboard for database metrics
- Simple uptime check via a free service like UptimeRobot

## Cost

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Supabase | Free | $0 |
| Vercel | Hobby | $0 |
| GitHub | Free (private repos) | $0 |
| **Total** | | **$0** |

If usage grows beyond free tiers (unlikely for single-user):
- Supabase Pro: $25/month
- Vercel Pro: $20/month
