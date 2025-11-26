# Hi-Vis Biz - Project Context
<!-- AI AGENT: Read this file to understand codebase structure -->
<!-- Update this file when adding/modifying files -->

## Quick Reference
```
STACK: Next.js 14 (App Router) + Supabase + Vercel + OpenAI
LANGUAGE: TypeScript
STYLING: Tailwind CSS
STATE: Server components + React hooks
AUTH: Supabase Auth
DB: PostgreSQL via Supabase
```

## Project Root
```
G:\My Drive\UnlockAi\Hi-Vis Biz\Project Code\
```

## Directory Structure
<!-- Update this tree when adding folders/files -->
```
/
├── .env.local              # Local secrets (gitignored)
├── .env.example            # Template for env vars
├── next.config.js          # Next.js config
├── tailwind.config.js      # Tailwind config
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── vercel.json             # Vercel config (crons)
├── middleware.ts           # Auth route protection
├── EXECUTION_PLAN.md       # Task tracking (this project)
├── PROJECT_CONTEXT.md      # This file
│
├── /src
│   ├── /app                # Next.js App Router
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Landing page (/)
│   │   │
│   │   ├── /auth
│   │   │   ├── /login/page.tsx      # Login form
│   │   │   ├── /register/page.tsx   # Registration form
│   │   │   └── /callback/route.ts   # OAuth callback handler
│   │   │
│   │   ├── /onboarding
│   │   │   └── page.tsx    # Employee profile setup
│   │   │
│   │   ├── /dashboard      # Employee area
│   │   │   ├── layout.tsx  # Dashboard layout
│   │   │   ├── page.tsx    # Employee home
│   │   │   └── /session
│   │   │       └── /[id]/page.tsx   # Micro-session chat UI
│   │   │
│   │   ├── /admin          # Admin area
│   │   │   ├── layout.tsx  # Admin layout + nav
│   │   │   ├── page.tsx    # Admin dashboard
│   │   │   ├── /setup/page.tsx      # Initial org setup
│   │   │   ├── /departments/page.tsx # Manage departments
│   │   │   ├── /members/page.tsx    # Manage employees
│   │   │   └── /analytics/page.tsx  # View analytics
│   │   │
│   │   └── /api            # API routes
│   │       ├── /orgs/route.ts
│   │       ├── /departments/route.ts
│   │       ├── /members/route.ts
│   │       ├── /sessions/route.ts
│   │       ├── /sessions/[id]/route.ts
│   │       ├── /sessions/[id]/messages/route.ts
│   │       ├── /analytics/org/route.ts
│   │       ├── /analytics/departments/route.ts
│   │       └── /internal/scheduler/route.ts
│   │
│   ├── /components
│   │   ├── /ui             # Base UI (buttons, inputs, cards)
│   │   ├── /forms          # Form components
│   │   ├── /dashboard      # Employee dashboard components
│   │   └── /admin          # Admin-specific components
│   │
│   ├── /lib
│   │   ├── /supabase
│   │   │   ├── client.ts   # Browser Supabase client
│   │   │   ├── server.ts   # Server Supabase client
│   │   │   └── middleware.ts # Auth helper for middleware
│   │   │
│   │   ├── /ai
│   │   │   ├── openai.ts   # OpenAI client instance
│   │   │   └── /agents
│   │   │       ├── base.ts          # Agent types/interfaces
│   │   │       ├── index.ts         # Agent router
│   │   │       ├── pulse.ts         # Morale/workload agent
│   │   │       ├── role-mapper.ts   # Role discovery agent
│   │   │       ├── workflow-mapper.ts # Workflow discovery agent
│   │   │       ├── pain-scanner.ts  # Pain point agent
│   │   │       └── focus-tracker.ts # Current work agent
│   │   │
│   │   └── /utils
│   │       ├── scheduler.ts  # Session scheduling logic
│   │       └── profile.ts    # Profile merge utilities
│   │
│   └── /types
│       ├── database.ts     # Generated Supabase types
│       └── index.ts        # App-specific types
│
└── /supabase
    ├── config.toml         # Local Supabase config
    └── /migrations
        ├── 001_initial_schema.sql
        ├── 002_agents_sessions.sql
        ├── 003_user_profiles.sql
        ├── 004_rls_policies.sql
        └── 005_seed_agents.sql
```

## File Purpose Index
<!-- Update when adding files -->

### Core Config
| File | Purpose |
|------|---------|
| `.env.local` | Secrets: Supabase keys, OpenAI key |
| `middleware.ts` | Protects /dashboard/* and /admin/* routes |
| `vercel.json` | Cron job config for scheduler |

### Supabase Clients
| File | Use When |
|------|----------|
| `lib/supabase/client.ts` | Client components, browser-side |
| `lib/supabase/server.ts` | Server components, API routes |

### AI Agents
| Agent | Purpose | Output Schema |
|-------|---------|---------------|
| `pulse.ts` | Morale + workload check | `{rating, reason, workload_rating, burnout_risk}` |
| `role-mapper.ts` | Discover job role | `{role_summary, primary_duties[], customer_facing, kpis_known}` |
| `workflow-mapper.ts` | Map tasks + tools | `{workflow_name, steps[], tools[], data_sources[]}` |
| `pain-scanner.ts` | Find friction | `{workflow_ref, tool_ref, pain_rating, reason, frequency, impact}` |
| `focus-tracker.ts` | Current work | `{current_focus_label, tags[], focus_rating, change_vs_last}` |

### API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/orgs` | POST | Create organization |
| `/api/departments` | GET, POST, DELETE | CRUD departments |
| `/api/members` | GET, POST, PATCH | CRUD members + invite |
| `/api/sessions` | GET | List user's sessions |
| `/api/sessions/[id]` | GET | Get single session |
| `/api/sessions/[id]/messages` | POST | Send chat message, get AI response |
| `/api/internal/scheduler` | POST | Create scheduled sessions (cron) |

## Database Tables
| Table | Purpose |
|-------|---------|
| `organizations` | Tenant orgs |
| `departments` | Org departments |
| `organization_members` | User-org relationship + role/level |
| `agents` | 5 AI agent definitions |
| `topic_archetypes` | Question types per agent |
| `sessions` | Scheduled micro-sessions |
| `session_topics` | Topics covered in session |
| `answers` | Stored responses + transcripts |
| `user_topic_history` | Track when topics last asked |
| `user_profiles` | JSONB profile per user |

## Key Patterns

### Auth Check (Server Component)
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/auth/login')
```

### Auth Check (API Route)
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
```

### Get User's Org
```typescript
const { data: member } = await supabase
  .from('organization_members')
  .select('org_id, role, level')
  .eq('user_id', user.id)
  .single()
```

### AI Agent Call
```typescript
import { getAgent } from '@/lib/ai/agents'
const agent = getAgent(session.agent_code)
const response = await agent.run({
  profile: userProfile,
  history: previousAnswers,
  message: userMessage
})
```

## Environment Variables
| Variable | Where Used |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (admin ops) |
| `OPENAI_API_KEY` | Server only (AI agents) |
| `SCHEDULER_SECRET` | Cron auth |

## Commands
```bash
# Development
npm run dev          # Start dev server (localhost:3000)

# Database
npx supabase gen types typescript --project-id [ID] > src/types/database.ts

# Git
git add .
git commit -m "message"
git push

# Deploy
# Automatic on push to main via Vercel
```

## Change Log
<!-- Agents: Log significant changes here -->
```
[DATE] [AGENT] - Description of change
2025-11-25 human - Initial context file created
```