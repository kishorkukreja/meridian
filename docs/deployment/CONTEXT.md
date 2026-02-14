# Deployment Context

## Infrastructure

### Supabase (Database + Auth + API + Edge Functions)

**Plan:** Free tier (sufficient for single-user tool)
- 500MB database storage
- 50,000 monthly active users (we need 1)
- 1GB file storage (not needed for v1)
- 2 million edge function invocations

**Setup Steps:**

1. Create a Supabase project at https://supabase.com
2. Note the project URL and anon key from Settings > API
3. Run all migration SQL files from `supabase/migrations/` in the SQL Editor (see Migrations section below)
4. Enable email/password auth in Authentication > Providers
5. Create the initial user account (the DNA Lead)
6. Enable RLS on all tables (included in migrations)
7. Deploy edge functions (see Edge Functions section below)
8. Set edge function secrets (see Environment Variables section below)

### Edge Functions

Three Supabase Edge Functions power the server-side features:

| Function | Purpose |
|----------|---------|
| `issues-api` | External REST API for programmatic issue management |
| `generate-mom` | AI-powered meeting minutes generation |
| `polish-email` | AI-powered email draft polishing |

**Deploying edge functions:**

```bash
# Deploy each function individually
npx supabase functions deploy issues-api
npx supabase functions deploy generate-mom
npx supabase functions deploy polish-email
```

**Edge function secrets:**

```bash
# Set the Gemini API key (required by generate-mom and polish-email)
npx supabase secrets set GEMINI_API_KEY=your_key_here
```

The following variables are automatically available inside edge functions and do not need to be set manually:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Vercel (Frontend Hosting)

**Plan:** Hobby (free tier)
- Unlimited deployments
- HTTPS included
- Auto-deploys from Git

**Setup Steps:**

1. Push the repo to GitHub (private repo)
2. Connect Vercel to the GitHub repo
3. Set environment variables in Vercel dashboard (see Environment Variables below)
4. Deploy

**Build Settings:**
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

### Custom Domain (Optional)

If desired, add a custom domain in Vercel. Otherwise, the app is accessible at `[project-name].vercel.app`.

## Environment Variables

### Complete List

**Frontend (set in Vercel dashboard):**

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL, e.g. `https://jqvdlzyaqqlbcyneqrnb.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key from Settings > API |

**Edge function secrets (set with `npx supabase secrets set`):**

| Secret | Description |
|--------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for AI features (generate-mom, polish-email) |

**Automatically available in edge functions (do not set manually):**

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Injected by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Injected by Supabase runtime |

### Local Development `.env`

```
VITE_SUPABASE_URL=https://jqvdlzyaqqlbcyneqrnb.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Migrations

There are 11 migration files in `supabase/migrations/`, applied in order:

| File | Description |
|------|-------------|
| `001_initial_schema.sql` | Core tables: objects, issues, comments |
| `002_*.sql` | Schema refinements |
| `003_*.sql` | Additional indexes and constraints |
| `004_*.sql` | Views and functions |
| `005_*.sql` | Additional schema updates |
| `006_api_tokens.sql` | API token table for external API auth |
| `007_*.sql` | Schema updates |
| `008_*.sql` | Schema updates |
| `009_*.sql` | Schema updates |
| `010_*.sql` | Schema updates |
| `011_pins.sql` | Pinned items support |

**Running migrations:**

```bash
# Option 1: Push all migrations via Supabase CLI (recommended)
npx supabase db push

# Option 2: Run each file manually in the Supabase SQL Editor
# Copy-paste each migration file in order from 001 through 011
```

Always run migrations before deploying new frontend code that depends on schema changes.

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
2. Push with `npx supabase db push` or run manually in the Supabase SQL Editor
3. Commit migration file to Git

### Edge Function Changes

1. Edit the function source in `supabase/functions/<function-name>/index.ts`
2. Deploy the updated function:
   ```bash
   npx supabase functions deploy <function-name>
   ```
3. Commit changes to Git

### Deploying Frontend Changes

1. Commit and push to `main`
2. Vercel auto-deploys on push to `main`
3. If database changes are needed, run migrations in Supabase first

### Full Deployment Checklist

```bash
# 1. Push any new migrations
npx supabase db push

# 2. Deploy updated edge functions
npx supabase functions deploy issues-api
npx supabase functions deploy generate-mom
npx supabase functions deploy polish-email

# 3. Set secrets if new ones were added
npx supabase secrets set GEMINI_API_KEY=your_key_here

# 4. Push frontend (auto-deploys via Vercel)
git push origin main
```

## Security Considerations

### Supabase Anon Key
The anon key is safe to expose in client-side code. It's designed for this. RLS policies ensure that even with the key, users can only access their own data.

### Authentication
- Email/password auth via Supabase
- Session tokens stored in browser localStorage by the Supabase JS client
- Sessions expire after configurable duration (default: 1 week)
- On mobile/Teams browser: user logs in once, session persists

### API Token Security
- External API tokens use the `mrd_` prefix format with 160-bit entropy
- Only SHA-256 hashes are stored in the database; plaintext is never persisted
- Tokens support scoped permissions (`issues:read`, `issues:write`)
- Tokens can be revoked or set to expire

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
- Supabase dashboard for database metrics and edge function logs
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
