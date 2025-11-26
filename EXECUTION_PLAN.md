# Hi-Vis Biz - Execution Plan
<!-- AI AGENT: Read this file at session start. Update after completing tasks. -->

## Quick Status
```
CURRENT_PHASE: 7
CURRENT_TASK: 7.1
BLOCKERS: none
LAST_UPDATED: 2025-11-26
LAST_AGENT: cline
```

## Agent Instructions
1. Read `PROJECT_CONTEXT.md` for codebase structure
2. Find `CURRENT_TASK` below and execute it
3. After completion: update task status to `[x]`, advance `CURRENT_TASK`, update `LAST_UPDATED` and `LAST_AGENT`
4. If blocked: set `BLOCKERS`, leave task as `[~]`
5. Run verification command before marking complete

---

## Phase 0: Project Initialization
**Goal**: Empty folder → running Next.js app connected to GitHub

### Tasks
- [x] `0.1` Initialize git repo locally
  ```bash
  cd "G:\My Drive\UnlockAi\Hi-Vis Biz\Project Code"
  git init
  ```
  **Verify**: `.git` folder exists

- [x] `0.2` Create GitHub repo named `hi-vis-biz` (public or private)
  - Go to github.com → New Repository
  - Name: `hi-vis-biz`
  - Do NOT init with README
  **Verify**: Empty repo exists at github.com/unlockaius/hi-vis-biz

- [x] `0.3` Connect local to GitHub
  ```bash
  git remote add origin https://github.com/unlockaius/hi-vis-biz.git
  ```
  **Verify**: `git remote -v` shows origin

- [x] `0.4` Create Next.js project
  ```bash
  npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
  ```
  Accept defaults when prompted
  **Verify**: `package.json` exists (npm install deferred to Vercel due to Google Drive sync issues)

- [x] `0.5` Create initial project structure
  ```
  src/
    app/           # Already created by Next.js
    components/
      ui/
    lib/
      supabase/
      ai/
        agents/
      utils/
    types/
  supabase/
    migrations/
  ```
  **Verify**: All folders exist

- [x] `0.6` Create environment files
  - Create `.env.local` (gitignored, real values)
  - Create `.env.example` (committed, placeholder values)
  ```env
  NEXT_PUBLIC_SUPABASE_URL=your-project-url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  SUPABASE_SERVICE_ROLE_KEY=your-service-key
  OPENAI_API_KEY=your-openai-key
  ```
  **Verify**: Both files exist, `.env.local` in `.gitignore`

- [x] `0.7` Initial commit and push
  ```bash
  git add .
  git commit -m "Initial Next.js setup with project structure"
  git branch -M main
  git push -u origin main
  ```
  **Verify**: Code visible on GitHub

- [x] `0.8` Connect Vercel
  - Go to vercel.com → Add New Project
  - Import `hi-vis-biz` from GitHub
  - Framework: Next.js (auto-detected)
  - Deploy
  **Verify**: Live URL works at https://hi-vis-biz.vercel.app/

---

## Phase 1: Supabase Setup
**Goal**: Database schema + RLS policies ready

### Tasks
- [x] `1.1` Create Supabase project
  - Go to supabase.com/dashboard → New Project
  - Name: `hi-vis-biz`
  - Generate strong DB password (save it!)
  - Region: closest to you
  - Wait for project to provision (~2 min)
  **Verify**: Project dashboard accessible at https://ldmztpapxpirxpcklizs.supabase.co

- [x] `1.2` Get API keys and update `.env.local`
  - Settings → API → Copy URL and anon key
  - Copy service_role key (keep secret!)
  **Verify**: `.env.local` has real values

- [x] `1.3` Add env vars to Vercel
  - Vercel dashboard → Project → Settings → Environment Variables
  - Add all 4 variables from `.env.local`
  **Verify**: Variables visible in Vercel dashboard

- [x] `1.4` Install Supabase client packages
  ```bash
  npm install @supabase/supabase-js @supabase/ssr
  ```
  **Verify**: Packages in `package.json`

- [x] `1.5` Create Supabase client utilities
  - `src/lib/supabase/client.ts` (browser client)
  - `src/lib/supabase/server.ts` (server client)
  - `src/lib/supabase/middleware.ts` (auth middleware)
  **Verify**: Files exist, no TypeScript errors

- [x] `1.6` Create migration: `001_initial_schema.sql`
  - Tables: organizations, departments, organization_members
  - See spec section 6.1
  **Verify**: File in `supabase/migrations/`

- [x] `1.7` Create migration: `002_agents_sessions.sql`
  - Tables: agents, topic_archetypes, sessions, session_topics, answers, user_topic_history
  - See spec sections 6.2, 6.3
  **Verify**: File in `supabase/migrations/`

- [x] `1.8` Create migration: `003_user_profiles.sql`
  - Table: user_profiles with JSONB profile_json
  - See spec section 6.4
  **Verify**: File in `supabase/migrations/`

- [x] `1.9` Create migration: `004_rls_policies.sql`
  - RLS policies for all tables
  - See spec section 10.4
  **Verify**: File in `supabase/migrations/`

- [x] `1.10` Create migration: `005_seed_agents.sql`
  - Insert 5 agents: role_mapper, workflow_mapper, pain_scanner, pulse, focus_tracker
  - Insert initial topic_archetypes
  **Verify**: File in `supabase/migrations/`

- [x] `1.11` Run migrations in Supabase
  - SQL Editor → paste each migration → Run
  - OR use Supabase CLI: `supabase db push`
  **Verify**: Tables visible in Table Editor

- [x] `1.12` Generate TypeScript types
  ```bash
  npx supabase gen types typescript --project-id [PROJECT_ID] > src/types/database.ts
  ```
  **Verify**: `src/types/database.ts` exists with table types

- [x] `1.13` Commit and push
  ```bash
  git add .
  git commit -m "Add Supabase schema and client utilities"
  git push
  ```
  **Verify**: Vercel redeploys successfully

---

## Phase 2: Authentication
**Goal**: Users can register, login, logout

### Tasks
- [x] `2.1` Create auth callback route
  - `src/app/auth/callback/route.ts`
  **Verify**: File exists

- [x] `2.2` Create login page
  - `src/app/auth/login/page.tsx`
  - Email + password form
  - Link to register
  **Verify**: Page renders at /auth/login

- [x] `2.3` Create register page
  - `src/app/auth/register/page.tsx`
  - Email + password + confirm password
  - Link to login
  **Verify**: Page renders at /auth/register

- [x] `2.4` Create auth middleware
  - `src/middleware.ts`
  - Protect /dashboard/* and /admin/* routes
  - Redirect unauthenticated to /auth/login
  **Verify**: Unauthenticated users redirected

- [x] `2.5` Create logout functionality
  - Server action or API route
  - Clear session, redirect to login
  **Verify**: Logout clears session

- [x] `2.6` Test auth flow end-to-end
  - Register new user
  - Check email confirmation (Supabase)
  - Login
  - Access protected route
  - Logout
  **Verify**: All steps work
  **Note**: Email callback 404 requires Supabase URL config (see below)

- [x] `2.7` Commit and push
  ```bash
  git add .
  git commit -m "Add authentication flow"
  git push
  ```

---

## Phase 3: Org Admin Setup
**Goal**: Admin can create org, add departments, upload members

### Tasks
- [x] `3.1` Create org setup page
  - `src/app/admin/setup/page.tsx`
  - Form: org name, timezone, size band
  - Creates organization + organization_member (role=owner)
  **Verify**: Org created in Supabase

- [x] `3.2` Create admin layout
  - `src/app/admin/layout.tsx`
  - Sidebar navigation
  - Check user is admin/owner
  **Verify**: Layout renders for admin users

- [x] `3.3` Create admin dashboard
  - `src/app/admin/page.tsx`
  - Overview stats placeholder
  **Verify**: Page renders

- [x] `3.4` Create departments page
  - `src/app/admin/departments/page.tsx`
  - List departments
  - Add new department form
  - Delete department
  **Verify**: CRUD works

- [x] `3.5` Create members page
  - `src/app/admin/members/page.tsx`
  - List members with status
  - CSV upload or manual add
  - Set level (exec/manager/ic)
  - Activate/deactivate
  **Verify**: Members appear in Supabase

- [x] `3.6` Create invite email trigger
  - Use Supabase Auth invite
  - `supabase.auth.admin.inviteUserByEmail()`
  **Verify**: Invite emails sent

- [x] `3.7` Commit and push
  ```bash
  git add .
  git commit -m "Add org admin setup and member management"
  git push
  ```

---

## Phase 4: Employee Onboarding
**Goal**: Invited employees can join and complete profile

### Tasks
- [x] `4.1` Create invite acceptance flow
  - Handle Supabase invite token
  - Set password
  - Create organization_member record
  **Verify**: Invited user can set password

- [x] `4.2` Create employee profile setup
  - `src/app/onboarding/page.tsx`
  - Form: name, title, department, supervisor (optional)
  - Creates/updates user profile
  **Verify**: Profile saved to user_profiles

- [x] `4.3` Create employee dashboard layout
  - `src/app/dashboard/layout.tsx`
  - Simple navigation
  **Verify**: Layout renders

- [x] `4.4` Create employee dashboard
  - `src/app/dashboard/page.tsx`
  - Show pending sessions
  - Show profile summary
  - Next check-in time
  **Verify**: Dashboard shows user data

- [x] `4.5` Commit and push
  ```bash
  git add .
  git commit -m "Add employee onboarding and dashboard"
  git push
  ```

---

## Phase 5: AI Agents Core
**Goal**: AI agent infrastructure ready

### Tasks
- [x] `5.1` Install OpenAI package
  ```bash
  npm install openai
  ```
  **Verify**: Package in package.json

- [x] `5.2` Create OpenAI client
  - `src/lib/ai/openai.ts`
  **Verify**: File exists, exports client

- [x] `5.3` Create base agent interface
  - `src/lib/ai/agents/base.ts`
  - Define AgentContext, AgentResponse types
  **Verify**: Types exported

- [x] `5.4` Create Pulse agent
  - `src/lib/ai/agents/pulse.ts`
  - Morale/workload questions
  - Returns structured JSON
  **Verify**: Agent function works

- [x] `5.5` Create Role Mapper agent
  - `src/lib/ai/agents/role-mapper.ts`
  **Verify**: Agent function works

- [x] `5.6` Create Workflow Mapper agent
  - `src/lib/ai/agents/workflow-mapper.ts`
  **Verify**: Agent function works

- [x] `5.7` Create Pain Scanner agent
  - `src/lib/ai/agents/pain-scanner.ts`
  **Verify**: Agent function works

- [x] `5.8` Create Focus Tracker agent
  - `src/lib/ai/agents/focus-tracker.ts`
  **Verify**: Agent function works

- [x] `5.9` Create agent router
  - `src/lib/ai/agents/index.ts`
  - Routes to correct agent by agent_code
  **Verify**: Router exports all agents

- [x] `5.10` Commit and push
  ```bash
  git add .
  git commit -m "Add AI agent infrastructure"
  git push
  ```

---

## Phase 6: Sessions & Check-ins
**Goal**: Employees can complete micro-sessions

### Tasks
- [x] `6.1` Create session API routes
  - `src/app/api/sessions/route.ts` - list user sessions
  - `src/app/api/sessions/[id]/route.ts` - get session
  - `src/app/api/sessions/[id]/messages/route.ts` - chat endpoint
  **Verify**: APIs respond

- [x] `6.2` Create session UI
  - `src/app/dashboard/session/[id]/page.tsx`
  - Chat interface
  - Send message → get AI response
  - Save answers when complete
  **Verify**: Chat works end-to-end

- [x] `6.3` Create scheduler logic
  - `src/lib/utils/scheduler.ts`
  - Determine which sessions to create
  - Based on profile completeness + history
  **Verify**: Logic creates appropriate sessions

- [x] `6.4` Create scheduler API route
  - `src/app/api/internal/scheduler/route.ts`
  - Protected with SCHEDULER_SECRET
  - Called by Vercel cron
  **Verify**: Creates sessions when called

- [x] `6.5` Configure Vercel cron
  - Add to `vercel.json`
  ```json
  {
    "crons": [{
      "path": "/api/internal/scheduler",
      "schedule": "0 6 * * *"
    }]
  }
  ```
  **Verify**: Cron visible in Vercel dashboard

- [x] `6.6` Create profile update logic
  - `src/lib/utils/profile.ts`
  - Merge agent responses into user_profiles.profile_json
  **Verify**: Profile updates after session

- [x] `6.7` Commit and push
  ```bash
  git add .
  git commit -m "Add sessions, check-ins, and scheduling"
  git push
  ```

---

## Phase 7: Analytics
**Goal**: Admin can view org/department analytics

### Tasks
- [ ] `7.1` Create analytics API routes
  - `src/app/api/analytics/org/route.ts`
  - `src/app/api/analytics/departments/route.ts`
  **Verify**: APIs return aggregated data

- [ ] `7.2` Create analytics page
  - `src/app/admin/analytics/page.tsx`
  - Morale trend chart
  - Response rate
  - Top pain themes
  - Department breakdown
  **Verify**: Charts render with data

- [ ] `7.3` Install chart library
  ```bash
  npm install recharts
  ```
  **Verify**: Charts work

- [ ] `7.4` Commit and push
  ```bash
  git add .
  git commit -m "Add analytics dashboard"
  git push
  ```

---

## Phase 8: Polish & Launch
**Goal**: Production-ready app

### Tasks
- [ ] `8.1` Add loading states
  - Skeleton loaders
  - Button loading states
  **Verify**: No jarring loads

- [ ] `8.2` Add error handling
  - Error boundaries
  - Toast notifications
  **Verify**: Errors handled gracefully

- [ ] `8.3` Add landing page
  - `src/app/page.tsx`
  - Explain product
  - CTA to register
  **Verify**: Landing page looks good

- [ ] `8.4` Mobile responsive check
  - Test all pages on mobile viewport
  **Verify**: Usable on mobile

- [ ] `8.5` Security review
  - RLS policies working
  - No exposed secrets
  - API routes protected
  **Verify**: Security checklist passed

- [ ] `8.6` Final commit and deploy
  ```bash
  git add .
  git commit -m "Production ready - v1.0"
  git push
  ```
  **Verify**: Live site fully functional

---

## Completed Tasks Log
<!-- Agents: Add completed tasks here with date -->
```
[DATE] [TASK_ID] [AGENT] - Brief description
2025-11-25 0.1 cline - Initialized git repo locally
2025-11-25 0.2 human - Created GitHub repo hi-vis-biz
2025-11-25 0.3 cline - Connected local repo to GitHub remote
2025-11-25 0.4 cline - Created Next.js project files manually (npm install deferred to Vercel)
2025-11-25 0.5 cline - Created initial project structure
2025-11-25 0.6 cline - Created environment files
2025-11-25 0.7 cline - Initial commit and push to GitHub
2025-11-25 0.8 human - Connected Vercel, deployed to https://hi-vis-biz.vercel.app/
2025-11-25 1.1 human - Created Supabase project (https://ldmztpapxpirxpcklizs.supabase.co)
2025-11-25 1.2 human - Got API keys and updated .env.local
2025-11-25 1.3 human - Added env vars to Vercel
2025-11-25 1.4 cline - Added Supabase packages to package.json
2025-11-25 1.5 cline - Created Supabase client utilities (client.ts, server.ts, middleware.ts)
2025-11-25 1.6 cline - Created migration 001_initial_schema.sql
2025-11-25 1.7 cline - Created migration 002_agents_sessions.sql
2025-11-25 1.8 cline - Created migration 003_user_profiles.sql
2025-11-25 1.9 cline - Created migration 004_rls_policies.sql
2025-11-25 1.10 cline - Created migration 005_seed_agents.sql
2025-11-25 1.11 human - Ran all 5 migrations in Supabase SQL Editor
2025-11-25 1.12 cline - Created TypeScript types (src/types/database.ts)
2025-11-25 1.13 cline - Committed and pushed to GitHub
2025-11-25 2.1 cline - Created auth callback route
2025-11-25 2.2 cline - Created login page
2025-11-25 2.3 cline - Created register page
2025-11-25 2.4 cline - Created auth middleware
2025-11-25 2.5 cline - Created logout functionality and server action
2025-11-25 2.7 cline - Committed and pushed auth flow to GitHub
2025-11-25 2.6 human - Tested auth flow (login/register/logout works)
2025-11-25 cline - Added landing page with login/register links
2025-11-25 3.1 cline - Created org setup page
2025-11-25 3.2 cline - Created admin layout with sidebar navigation
2025-11-25 3.3 cline - Created admin dashboard with stats
2025-11-25 3.4 cline - Created departments page with CRUD
2025-11-25 3.5 cline - Created members page with invite and CSV upload
2025-11-25 3.6 cline - Created invite email API route
2025-11-25 3.7 cline - Committed and pushed Phase 3
2025-11-26 4.1 cline - Invite acceptance flow complete (set-password redirects to onboarding)
2025-11-26 4.2 cline - Created employee profile setup page (/onboarding)
2025-11-26 4.3 cline - Created employee dashboard layout with navigation
2025-11-26 4.4 cline - Enhanced employee dashboard with profile, sessions, stats
2025-11-26 4.5 cline - Committed and pushed Phase 4 to GitHub
2025-11-26 5.1 cline - Added OpenAI package to package.json
2025-11-26 5.2 cline - Created OpenAI client utility (src/lib/ai/openai.ts)
2025-11-26 5.3 cline - Created base agent interface with types (src/lib/ai/agents/base.ts)
2025-11-26 5.4 cline - Created Pulse agent for morale/workload check-ins
2025-11-26 5.5 cline - Created Role Mapper agent for role understanding
2025-11-26 5.6 cline - Created Workflow Mapper agent for process mapping
2025-11-26 5.7 cline - Created Pain Scanner agent for friction detection
2025-11-26 5.8 cline - Created Focus Tracker agent for priority tracking
2025-11-26 5.9 cline - Created agent router with exports and metadata
2025-11-26 5.10 cline - Committed and pushed Phase 5 to GitHub
2025-11-26 6.1 cline - Created session API routes (list, detail, messages)
2025-11-26 6.2 cline - Created session chat UI with real-time messaging
2025-11-26 6.3 cline - Created scheduler logic for session scheduling
2025-11-26 6.4 cline - Created scheduler API route for Vercel cron
2025-11-26 6.5 cline - Configured Vercel cron in vercel.json
2025-11-26 6.6 cline - Created profile update logic for agent outputs
2025-11-26 6.7 cline - Committed and pushed Phase 6 to GitHub
```

### Supabase Auth URL Configuration (Required)
To fix email confirmation link 404:
1. Go to https://ldmztpapxpirxpcklizs.supabase.co → Authentication → URL Configuration
2. Set **Site URL**: `https://hi-vis-biz.vercel.app`
3. Add to **Redirect URLs**: `https://hi-vis-biz.vercel.app/auth/callback`
