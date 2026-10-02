# DevCircle

**Build. Connect. Get Opportunities.**

A student developer community MVP — not a generic job board.

Students create a technical profile → automatically join skill communities → discover people & teammates → showcase proof of work → get matched opportunities.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth + Postgres + RLS)
- Lucide icons

## Quick start

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and create a project
2. Open **SQL Editor** and run migrations in order:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_qa_rls_polish.sql
supabase/migrations/003_seed_skills.sql
```

Then run `npm run seed` for demo students, communities, opportunities, and posts.

3. In **Project Settings → API**, copy:
   - Project URL
   - `anon` `public` key
   - `service_role` key (server only — never expose in the browser)

### 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_EMAILS=admin@devcircle.demo
```

### 4. Auth settings (recommended for demo)

In Supabase **Authentication → Providers → Email**:

- Disable “Confirm email” for faster local demos (optional)

**Authentication → URL configuration**:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

### 5. Seed demo data

```bash
npm run seed
```

This creates:

- Skills + communities
- 10 demo students
- 15 demo opportunities (labelled **Demo Opportunity**)
- Projects, posts, team requests, notifications
- Admin: `admin@devcircle.demo` / `demo123456`

Demo student login:

| Email | Password |
|-------|----------|
| `rahul@devcircle.demo` | `demo123456` |
| `priya@devcircle.demo` | `demo123456` |
| `admin@devcircle.demo` | `demo123456` |

### 6. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Product loop

```text
STUDENT → SKILLS → AUTOMATIC COMMUNITIES → PEOPLE → PROJECTS → OPPORTUNITIES → PROOF OF WORK
```

## Main routes

| Route | Description |
|-------|-------------|
| `/` | Landing |
| `/register` `/login` | Auth |
| `/onboarding` | 4-step student onboarding |
| `/dashboard` | For You feed |
| `/communities` `/communities/[slug]` | Communities + feed |
| `/opportunities` | Matched opportunity feed |
| `/teammates` | Find teammates |
| `/people` | Developer directory |
| `/profile` `/settings` | Own profile |
| `/u/[username]` | Public developer profile |
| `/search` | Global search |
| `/admin` | Demo admin (admin users only) |

## Matching

Deterministic TypeScript scoring (no AI API):

- Skills **50%**
- Opportunity type **25%**
- Location / remote **15%**
- Experience level **10%**

## Security notes

- Passwords via Supabase Auth only
- RLS enabled; students edit only their own profile
- `SUPABASE_SERVICE_ROLE_KEY` is server-only (seed script / never shipped to client)

## Future (not in this MVP UI)

Code is structured for later:

- Company / recruiter accounts
- Posting opportunities from companies
- Shortlist / contact / hire flows
- Paid projects + platform fee
- GitHub OAuth + repo import

Look for `// FUTURE: recruiter functionality` comments.

## Deploy (same day)

1. Push to GitHub
2. Deploy on [Vercel](https://vercel.com)
3. Add the same env vars
4. Set Supabase redirect URLs to your production domain
5. Re-run seed against the production Supabase project if needed

Temporary product name: **DevCircle**.
