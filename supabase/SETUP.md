# Supabase Setup — Bidragsguiden

## Project Info

| Field | Value |
|-------|-------|
| **Organization** | The Palace |
| **Project name** | bidragsguiden |
| **Schema** | public (tables prefixed with `bg_`) |

## Tables

| Table | Purpose |
|-------|---------|
| `bg_sessions` | Anonymous browser sessions (UUID-based, no signup) |
| `bg_searches` | Each completed quiz + AI results (JSONB) |
| `bg_feedback` | User marks individual grants as eligible/not eligible |

---

## How Supabase works (the basics)

Supabase is an open-source backend that gives you a **Postgres database** + **instant REST API** + **auth** out of the box. Here's the mental model:

1. **You create tables** in a Postgres database (via the dashboard or SQL)
2. **Supabase auto-generates a REST API** for every table — you never write backend routes for CRUD
3. **Your app talks to Supabase directly** from the browser using the `@supabase/supabase-js` client library
4. **Row Level Security (RLS)** controls who can read/write what — this is your security layer

### How our app connects to Supabase

```
Your Next.js app
  │
  ├── lib/supabase.js          ← creates the Supabase client
  │     uses 2 env vars:
  │       NEXT_PUBLIC_SUPABASE_URL       (your project URL)
  │       NEXT_PUBLIC_SUPABASE_ANON_KEY  (your public API key)
  │
  ├── supabase.from("bg_searches").insert(...)   ← writes data
  ├── supabase.from("bg_searches").select(...)   ← reads data
  └── supabase.from("bg_feedback").upsert(...)   ← updates data
```

The Supabase client library handles all the HTTP calls for you. You just call `.insert()`, `.select()`, `.update()`, `.delete()` — it feels like talking to a local database but it's going over HTTPS to Supabase's servers.

### Why NEXT_PUBLIC_ prefix?

Environment variables in Next.js that start with `NEXT_PUBLIC_` are exposed to the browser. This is fine for Supabase because:
- The **anon key** is designed to be public — it's not a secret
- The **real security** comes from Row Level Security (RLS) policies in the database
- The `ANTHROPIC_API_KEY` does NOT have this prefix — it stays server-side only

---

## How to set up (first time)

### 1. Create the project (if you haven't already)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select **The Palace** organization
3. Click **New project**
4. Name it **bidragsguiden**
5. Choose a strong database password (save it somewhere — you won't need it in the app, but you'll need it if you ever connect directly to Postgres)
6. Pick region **EU West (Stockholm)** — closest to Swedish users

### 2. Important settings when creating the project

**Enable Data API** — yes, keep that ON. That's what lets your app talk to Supabase. Without it, none of the save/load stuff works. The Data API is what auto-generates REST endpoints for your tables — it's the whole reason we use Supabase instead of building our own API.

**Database password** — this is NOT the same as the anon key. The database password is for direct Postgres connections (like from a SQL client). The anon key is for your app's browser-side API calls.

### 3. Run the SQL migration

This creates all three tables, indexes, and security policies in one go:

1. In the Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Copy-paste the **entire** contents of `setup.sql` (in this folder)
4. Click **Run**

You should see "Success. No rows returned" — that means everything was created.

**What the SQL does:**
- Creates 3 tables (`bg_sessions`, `bg_searches`, `bg_feedback`)
- Adds indexes for faster lookups (session lookups, date sorting)
- Enables Row Level Security on all tables
- Creates RLS policies that allow the anon key to insert/select/update/delete

### 4. Verify tables exist

Go to **Table Editor** in the left sidebar. You should see:
- `bg_sessions`
- `bg_searches`
- `bg_feedback`

Click on each one — they should be empty but have the correct columns.

### 5. Get your API credentials

1. Go to **Settings** (gear icon in sidebar) → **API**
2. Copy these two values:

| Setting | Env var name | Where to find it |
|---------|-------------|------------------|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` | Under "Project URL" — looks like `https://abcdefg.supabase.co` |
| **anon public** key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Under "Project API keys" → `anon` `public` — starts with `eyJ...` |

**Do NOT copy the `service_role` key.** That one bypasses RLS and should never be in frontend code.

### 6. Add env vars to the app

**Local development** — create `.env.local` in project root:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
```

**Vercel deployment** — add the same 3 vars in:
Project Settings → Environment Variables

### 7. Test the connection

Run `npm run dev`, open the app, and complete a quiz. Then check the Supabase Table Editor:
- `bg_sessions` should have 1 row (your session)
- `bg_searches` should have 1 row (your quiz + AI result)

If nothing appears, check the browser console for errors.

---

## Understanding the dashboard

### Table Editor
This is where you browse your data. You can click on any table to see its rows, add filters, sort, and even manually edit rows. Think of it as a spreadsheet view of your database.

### SQL Editor
For running raw SQL queries. Use this for:
- Running the initial `setup.sql` migration
- Running analytics queries (see "Useful queries" below)
- Debugging data issues

### Authentication
We don't use Supabase Auth in this app. Our "auth" is just a UUID stored in the browser. No sign-up, no login, no passwords. This keeps things simple — the tradeoff is that if someone clears their browser data, they lose their session.

### Settings → API
Where you find your project URL and API keys. The two important ones:
- **anon key** (public, safe for frontend) — this is what your app uses
- **service_role key** (secret, never expose) — this bypasses all security, only for server-side admin tasks

### Logs
Check **Edge Functions** and **API** logs if something isn't working. Common issues:
- "No rows returned" on insert → check RLS policies
- 401 errors → wrong or missing anon key
- "relation does not exist" → SQL migration wasn't run

---

## How the bg_ prefix works

Since Supabase uses Postgres's `public` schema by default, all your tables share the same namespace. The `bg_` prefix (short for Bidragsguiden) prevents name collisions if you have other projects in the same Supabase instance.

For example, if you also had a project called "Kontorshund", its tables might be `kh_users`, `kh_bookings`, etc. They all live in the same database but don't conflict.

**In the code**, you reference tables by their full name:
```javascript
supabase.from("bg_searches").select("*")  // not just "searches"
```

---

## Architecture

```
Browser
  |
  |-- Quiz answers (no personal data)
  |
  |-- On submit -> POST /api/analyze -> Anthropic Claude API
  |                                      (server-side, API key hidden)
  |
  |-- Results saved -> Supabase bg_searches (JSONB)
  |
  |-- User feedback -> Supabase bg_feedback (per grant card)
  |
  +-- Session ID stored in browser localStorage
      (only thing in localStorage -- just the UUID)
```

### How sessions work

- First visit: app creates a row in `bg_sessions`, stores the UUID in `localStorage`
- Return visits: app finds the UUID in `localStorage`, updates `last_active`
- No email, no password, no personal info — the UUID **is** the identity
- If user clears browser data, they get a new session (old data stays in DB but is orphaned)

### How feedback + refinement works

1. AI returns 6-12 grant recommendations
2. User marks each as "Kan vara aktuellt" (yes) or "Inte aktuellt" (no)
3. If "no", user can optionally explain why (e.g. "too few employees")
4. Each toggle saves to `bg_feedback` in real-time
5. User clicks "Forfina" → app sends original answers + feedback to AI
6. AI returns improved results, saved as an update to `bg_searches`

---

## Security

- **Row Level Security (RLS)** is enabled on all tables — this is the main security layer
- The `anon` key can only INSERT/SELECT/UPDATE/DELETE via the policies we defined — no admin access
- The `anon` key is safe to expose in frontend code (it's designed for this by Supabase)
- The real security boundary is the session UUID — only the browser that created it knows it
- No personal data is collected (no names, no org numbers, no emails)
- The `ANTHROPIC_API_KEY` never touches the browser — it stays on the server in `/api/analyze`

### What if someone gets the anon key?

They can insert/read data — but they can't do anything destructive because:
1. They can only interact through the RLS policies we defined
2. They don't know anyone else's session UUID, so they can't access other people's data (unless they guess a UUID, which is practically impossible — UUIDs have 122 bits of entropy)
3. There's no sensitive data anyway — just quiz answers about company type and region

---

## Useful queries

Run these in the SQL Editor to see what's happening in your app.

Check how many searches have been made:
```sql
SELECT count(*) FROM bg_searches;
```

See recent searches with summaries:
```sql
SELECT
  id,
  answers->>'industry' as industry,
  answers->>'region' as region,
  result->>'total_potential' as potential,
  created_at
FROM bg_searches
ORDER BY created_at DESC
LIMIT 10;
```

See feedback patterns (what grants get rejected most):
```sql
SELECT
  benefit_name,
  eligible,
  count(*) as times,
  array_agg(DISTINCT reason) FILTER (WHERE reason IS NOT NULL) as reasons
FROM bg_feedback
GROUP BY benefit_name, eligible
ORDER BY times DESC
LIMIT 20;
```

Clean up old orphaned sessions (no searches, older than 30 days):
```sql
DELETE FROM bg_sessions
WHERE id NOT IN (SELECT DISTINCT session_id FROM bg_searches)
AND created_at < now() - interval '30 days';
```

---

## Common gotchas

| Problem | Cause | Fix |
|---------|-------|-----|
| "relation bg_sessions does not exist" | SQL migration wasn't run | Run `setup.sql` in SQL Editor |
| Data not saving, no errors | Supabase env vars not set | Check `.env.local` has both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| 401 Unauthorized | Wrong anon key | Copy the key again from Settings → API |
| "new row violates row-level security" | RLS policies missing | Re-run `setup.sql` — the CREATE POLICY statements may have failed |
| App works locally but not on Vercel | Env vars not set in Vercel | Add all 3 env vars in Vercel Project Settings → Environment Variables |
| Data saves but history doesn't load | Session ID mismatch | Clear localStorage and refresh — a new session will be created |
