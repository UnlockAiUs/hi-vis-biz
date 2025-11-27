# MASTER_PROJECT_CONTEXT.md
<!-- 
╔═══════════════════════════════════════════════════════════════════════════════╗
║ CRITICAL: AI AGENTS MUST READ THIS FILE BEFORE ANY WORK                       ║
║ UPDATE THIS FILE IMMEDIATELY AFTER ANY CODE CHANGES OR NEW FILE CREATION      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
-->

## META
```yaml
version: 1.2.0
last_updated: 2025-11-27
last_agent: cline
purpose: SINGLE SOURCE OF TRUTH for all AI agents working on this project
format: optimized for AI token efficiency
documentation_status: COMPLETE - all 61 code files documented
rebrand_status: COMPLETE - rebranded from Hi-Vis Biz to VizDots
```

## CRITICAL RULES FOR AI AGENTS
1. **READ** this file FIRST before any task
2. **UPDATE** this file IMMEDIATELY after creating/modifying ANY code
3. **VERIFY** your changes align with existing architecture
4. **NEVER** create duplicate functionality
5. **FOLLOW** existing patterns exactly

---

## PROJECT IDENTITY
```yaml
name: VizDots
previous_name: Hi-Vis Biz (rebranded 2025-11-27)
type: AI-driven employee check-in SaaS
domain: HR/Employee engagement
tagline: "See Your Business Clearly — One Dot at a Time"
messaging: "Small Inputs. Big Visibility. Real Improvement."
cta: "Start Free → 30 Days On Us"
stack: Next.js 14 (App Router) + Supabase + Vercel + OpenAI
language: TypeScript
styling: Tailwind CSS
auth: Supabase Auth
db: PostgreSQL via Supabase
hosting: Vercel (auto-deploy from GitHub)
```

## CORE CONCEPT
```
AI micro-conversations (1-2 min, 2-3x/week) → Extract structured data → Build employee profiles → Surface org insights

VizDots Terminology:
- "Dots" = Individual check-ins from employees (small daily inputs)
- Dots build patterns → patterns become insight
- Focus: operational clarity, workflow maps, friction points, early warning signals
```

---

## USER ROLES & FLOWS
| Role | Entry Point | Destination | Capabilities |
|------|-------------|-------------|--------------|
| New Org Owner | /auth/register | /admin/setup | Create org via 5-step wizard |
| Invited Employee | Email link | /onboarding | Confirm info, start micro-sessions |
| Returning Admin | /auth/login | /admin | Manage org, view analytics |
| Returning Employee | /auth/login | /dashboard | Complete micro-sessions |

---

## AI AGENTS (5 TOTAL)
| Code | Name | Purpose | Output Schema |
|------|------|---------|---------------|
| `pulse` | Pulse | Morale/workload/burnout | `{rating:1-5,reason,workload_rating:1-5,burnout_risk:low|medium|high}` |
| `role_mapper` | Role Mapper | Job role discovery | `{role_summary,primary_duties[],customer_facing,kpis_known}` |
| `workflow_mapper` | Workflow Mapper | Task/tool mapping | `{workflow_name,display_label,steps[],tools[],data_sources[]}` |
| `pain_scanner` | Pain Scanner | Friction points | `{workflow_ref,tool_ref,pain_rating:1-5,reason,frequency,impact}` |
| `focus_tracker` | Focus Tracker | Current work tracking | `{current_focus_label,current_focus_tags[],still_primary_focus,focus_rating:1-5,change_vs_last_time,reason}` |

---

## ARCHITECTURE OVERVIEW

### Directory Structure
```
/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes
│   │   │   ├── admin/          # Admin-only APIs
│   │   │   ├── analytics/      # Analytics APIs
│   │   │   ├── auth/           # Auth-related APIs
│   │   │   ├── internal/       # Internal/cron APIs
│   │   │   └── sessions/       # Session management APIs
│   │   ├── admin/              # Admin UI pages
│   │   │   └── setup/          # 5-step onboarding wizard
│   │   ├── auth/               # Auth UI pages
│   │   ├── dashboard/          # Employee UI pages
│   │   │   └── session/[id]/   # Micro-session chat
│   │   └── onboarding/         # Employee onboarding
│   ├── components/
│   │   ├── auth/               # Auth components
│   │   └── ui/                 # Shared UI components
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── agents/         # 5 AI agent implementations
│   │   │   └── openai.ts       # OpenAI client
│   │   ├── supabase/           # Supabase clients
│   │   └── utils/              # Utility functions
│   └── types/                  # TypeScript types
├── supabase/migrations/        # Database migrations (001-010)
└── config files                # next.config.js, tailwind.config.ts, etc.
```

---

## DATABASE SCHEMA

### Core Tables
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `organizations` | Tenant orgs | id, name, timezone, size_band, trial_*, subscription_*, stripe_* |
| `departments` | Org departments | id, org_id, name |
| `organization_members` | User-org relationship | id, org_id, user_id, role, level, department_id, supervisor_user_id, status, display_name, job_title, has_direct_reports, can_view_reports, invite_* |
| `user_profiles` | JSONB profile per user | id, org_id, user_id, profile_json, version |

### AI/Session Tables
| Table | Purpose |
|-------|---------|
| `agents` | 5 AI agent definitions |
| `topic_archetypes` | Question types per agent |
| `sessions` | Scheduled micro-sessions |
| `session_topics` | Topics in session |
| `answers` | Responses + transcripts |
| `user_topic_history` | Topic tracking |

### Organization Members Roles
- `role`: owner | admin | member
- `level`: exec | manager | ic
- `status`: invited | active | inactive

### Subscription Status
- `subscription_status`: trialing | active | past_due | canceled | expired
- Trial: 30 days from org creation

---

## FILE-BY-FILE DOCUMENTATION

### Core Infrastructure Files

| File | Purpose | Key Exports |
|------|---------|-------------|
| `src/middleware.ts` | Auth session refresh on every request | middleware, config |
| `src/lib/supabase/client.ts` | Browser-side Supabase client factory | createClient |
| `src/lib/supabase/server.ts` | Server-side Supabase clients | createClient, createServiceClient |
| `src/lib/supabase/middleware.ts` | Session refresh middleware helper | updateSession |

### Type Definitions

| File | Purpose | Key Types |
|------|---------|-----------|
| `src/types/database.ts` | Database & agent output types | Tables, ProfileJson, PulseOutput, RoleMapperOutput, etc. |

### AI System

| File | Purpose | Exports |
|------|---------|---------|
| `src/lib/ai/openai.ts` | OpenAI client singleton | getOpenAIClient, createChatCompletion, createConversation, AI_CONFIG |
| `src/lib/ai/agents/base.ts` | Agent interfaces/types | AgentCode, Agent interface, AgentContext, buildContextPrompt, hasMinimumInfo |
| `src/lib/ai/agents/index.ts` | Agent registry & router | getAgent, agentMetadata |
| `src/lib/ai/agents/pulse.ts` | Morale/workload agent | PulseAgent, pulseAgent |
| `src/lib/ai/agents/role-mapper.ts` | Role discovery agent | RoleMapperAgent, roleMapperAgent |
| `src/lib/ai/agents/workflow-mapper.ts` | Process mapping agent | WorkflowMapperAgent, workflowMapperAgent |
| `src/lib/ai/agents/pain-scanner.ts` | Friction point agent | PainScannerAgent, painScannerAgent |
| `src/lib/ai/agents/focus-tracker.ts` | Priority tracking agent | FocusTrackerAgent, focusTrackerAgent |

### Utility Functions

| File | Purpose | Key Functions |
|------|---------|---------------|
| `src/lib/utils/profile.ts` | Profile merge utilities | mergeAgentOutputIntoProfile, updateProfileGaps |
| `src/lib/utils/scheduler.ts` | Session scheduling | SCHEDULING_CONFIG, determineSessionsToSchedule |
| `src/lib/utils/onboarding-wizard.ts` | Wizard state management | OnboardingState, useWizardState, localStorage persistence |
| `src/lib/utils/csv-parser.ts` | Employee CSV import | parseCSV, generateCSVTemplate, downloadCSVTemplate |

### UI Components

| File | Purpose | Exports |
|------|---------|---------|
| `src/components/auth/HashHandler.tsx` | URL hash auth token handler | default HashHandler |
| `src/components/ui/LoadingSpinner.tsx` | Loading spinners | LoadingSpinner, ButtonLoading |
| `src/components/ui/Toast.tsx` | Toast notifications | ToastProvider, useToast |
| `src/components/ui/Skeleton.tsx` | Loading placeholders | Skeleton, SkeletonCard, SkeletonTable, etc. |
| `src/components/ui/ActionMenu.tsx` | Dropdown action menu | default ActionMenu, ActionMenuIcons |

### Auth Pages

| File | Purpose | Key Logic |
|------|---------|-----------|
| `src/app/auth/login/page.tsx` | Login form UI | Email/password form, calls signIn action |
| `src/app/auth/register/page.tsx` | Registration form UI | Email/password form, calls signUp action |
| `src/app/auth/actions.ts` | Server actions for auth | signIn, signUp, signOut functions |
| `src/app/auth/callback/route.ts` | OAuth/magic link callback | Exchanges code, routes based on membership role |
| `src/app/auth/set-password/page.tsx` | Set password for invited users | Handles invite token, sets initial password |
| `src/app/auth/auth-code-error/page.tsx` | Auth error display | Shows error message with retry link |

### Dashboard Pages

| File | Purpose | Key Logic |
|------|---------|-----------|
| `src/app/dashboard/layout.tsx` | Dashboard layout wrapper | Auth check, navigation structure |
| `src/app/dashboard/page.tsx` | Employee main dashboard | Lists pending/completed sessions, profile summary |
| `src/app/dashboard/session/[id]/page.tsx` | Micro-session chat interface | Real-time AI conversation, message input/display |

### Admin Pages

| File | Purpose | Key Logic |
|------|---------|-----------|
| `src/app/admin/layout.tsx` | Admin layout with sidebar | Auth + role check (admin/owner), AdminSidebar |
| `src/app/admin/page.tsx` | Admin dashboard overview | Org stats, recent activity, quick actions |
| `src/app/admin/AdminSidebar.tsx` | Navigation sidebar component | Links to all admin sections, active state |
| `src/app/admin/analytics/page.tsx` | Analytics dashboard | Org-wide metrics, department breakdowns, charts |
| `src/app/admin/billing/page.tsx` | Billing & subscription | Trial status, plan details, Stripe integration placeholder |
| `src/app/admin/departments/page.tsx` | Department management | CRUD departments, member counts |
| `src/app/admin/members/page.tsx` | Member management | List, invite, edit, deactivate members |
| `src/app/admin/org-chart/page.tsx` | Organization chart | Hierarchical view of org structure |
| `src/app/admin/settings/page.tsx` | Organization settings | Org name, timezone, scheduling preferences |

### Admin Setup Wizard (5 Steps)

| File | Purpose | Key Logic |
|------|---------|-----------|
| `src/app/admin/setup/layout.tsx` | Wizard layout | Progress indicator, step navigation |
| `src/app/admin/setup/page.tsx` | Step 1: Company info | Org name, size, timezone input |
| `src/app/admin/setup/departments/page.tsx` | Step 2: Departments | Add/edit/delete departments |
| `src/app/admin/setup/employees/page.tsx` | Step 3: Employees | CSV upload or manual entry |
| `src/app/admin/setup/supervisors/page.tsx` | Step 4: Supervisors | Assign reporting relationships |
| `src/app/admin/setup/review/page.tsx` | Step 5: Review & launch | Summary, confirm, complete setup |

### Onboarding

| File | Purpose | Key Logic |
|------|---------|-----------|
| `src/app/onboarding/page.tsx` | Employee onboarding flow | Confirm details, intro to AI sessions |

### API Routes - Sessions

| File | Purpose | Exports | Key Logic |
|------|---------|---------|-----------|
| `src/app/api/sessions/route.ts` | List/create sessions | GET, POST | GET: user's sessions; POST: create new session |
| `src/app/api/sessions/[id]/route.ts` | Session operations | GET, PATCH | GET: session detail+topics+answers; PATCH: start/complete |
| `src/app/api/sessions/[id]/messages/route.ts` | AI conversation | POST | Core AI endpoint - processes messages through agents, builds AgentContext, maintains transcript |

### API Routes - Admin

| File | Purpose | Exports | Key Logic |
|------|---------|---------|-----------|
| `src/app/api/admin/setup/route.ts` | Setup wizard data | GET, POST, PUT | Wizard state persistence |
| `src/app/api/admin/setup/complete/route.ts` | Complete setup | POST | Finalizes org setup, creates initial sessions |
| `src/app/api/admin/members/route.ts` | Member CRUD | GET, POST, PATCH, DELETE | Member management operations |
| `src/app/api/admin/invite/route.ts` | Invite members | POST | Sends email invites to employees |
| `src/app/api/admin/settings/route.ts` | Org settings | GET, PUT | Read/update org settings |

### API Routes - Analytics

| File | Purpose | Exports | Key Logic |
|------|---------|---------|-----------|
| `src/app/api/analytics/org/route.ts` | Org-wide analytics | GET | Aggregated org metrics |
| `src/app/api/analytics/departments/route.ts` | Department analytics | GET | Per-department breakdowns |

### API Routes - Auth

| File | Purpose | Exports | Key Logic |
|------|---------|---------|-----------|
| `src/app/api/auth/link-invite/route.ts` | Link invite to user | POST | Associates invite token with authenticated user |

### API Routes - Internal

| File | Purpose | Exports | Key Logic |
|------|---------|---------|-----------|
| `src/app/api/internal/scheduler/route.ts` | Cron session scheduler | POST | Creates scheduled sessions, requires SCHEDULER_SECRET |

### Root App Files

| File | Purpose | Key Logic |
|------|---------|-----------|
| `src/app/layout.tsx` | Root HTML layout | HashHandler, Tailwind styles |
| `src/app/page.tsx` | Landing page | Marketing content, CTA buttons |
| `src/app/globals.css` | Global styles | Tailwind imports, CSS variables |

### Database Migrations (in order)

| Migration | Purpose |
|-----------|---------|
| `001_initial_schema.sql` | orgs, departments, members tables |
| `002_agents_sessions.sql` | agents, sessions, answers tables |
| `003_user_profiles.sql` | JSONB profile storage |
| `004_rls_policies.sql` | Initial RLS policies |
| `005_seed_agents.sql` | Seed 5 AI agents |
| `006_fix_org_creation_rls.sql` | Fix org creation RLS |
| `007_complete_rls_setup.sql` | Complete RLS setup |
| `008_schedule_settings.sql` | Schedule settings table |
| `009_enhanced_onboarding.sql` | Onboarding improvements |
| `010_subscription_trial.sql` | Trial/subscription fields |

---

## KEY PATTERNS

### Auth Check (Server Component)
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/auth/login')
```

### Auth Check (API Route)
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
```

### Get User's Org Membership
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
const response = await agent.chat(messages, context)
```

---

## ENVIRONMENT VARIABLES
| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Admin operations |
| `OPENAI_API_KEY` | Server | AI agent calls |
| `SCHEDULER_SECRET` | Server | Cron job auth |

---

## ROUTING LOGIC

### Auth Callback Smart Routing
```
After auth success:
1. Check for invite type → handle invite flow
2. Check organization_members record:
   - NO record → NEW USER → /admin/setup
   - role=owner/admin → /admin
   - role=member → check profile → /dashboard or /onboarding
```

### Middleware Protected Routes
- `/admin/*` - requires auth + admin/owner role
- `/dashboard/*` - requires auth
- `/onboarding` - requires auth

---

---

## COMPLETE FILE CHECKLIST (61 TypeScript/TSX + 10 SQL)

### ✅ Core Infrastructure (4 files)
- [x] `src/middleware.ts`
- [x] `src/lib/supabase/client.ts`
- [x] `src/lib/supabase/server.ts`
- [x] `src/lib/supabase/middleware.ts`

### ✅ Types (1 file)
- [x] `src/types/database.ts`

### ✅ AI System (8 files)
- [x] `src/lib/ai/openai.ts`
- [x] `src/lib/ai/agents/base.ts`
- [x] `src/lib/ai/agents/index.ts`
- [x] `src/lib/ai/agents/pulse.ts`
- [x] `src/lib/ai/agents/role-mapper.ts`
- [x] `src/lib/ai/agents/workflow-mapper.ts`
- [x] `src/lib/ai/agents/pain-scanner.ts`
- [x] `src/lib/ai/agents/focus-tracker.ts`

### ✅ Utilities (4 files)
- [x] `src/lib/utils/profile.ts`
- [x] `src/lib/utils/scheduler.ts`
- [x] `src/lib/utils/onboarding-wizard.ts`
- [x] `src/lib/utils/csv-parser.ts`

### ✅ UI Components (5 files)
- [x] `src/components/auth/HashHandler.tsx`
- [x] `src/components/ui/LoadingSpinner.tsx`
- [x] `src/components/ui/Toast.tsx`
- [x] `src/components/ui/Skeleton.tsx`
- [x] `src/components/ui/ActionMenu.tsx`

### ✅ Auth Pages (6 files)
- [x] `src/app/auth/login/page.tsx`
- [x] `src/app/auth/register/page.tsx`
- [x] `src/app/auth/actions.ts`
- [x] `src/app/auth/callback/route.ts`
- [x] `src/app/auth/set-password/page.tsx`
- [x] `src/app/auth/auth-code-error/page.tsx`

### ✅ Dashboard Pages (3 files)
- [x] `src/app/dashboard/layout.tsx`
- [x] `src/app/dashboard/page.tsx`
- [x] `src/app/dashboard/session/[id]/page.tsx`

### ✅ Admin Pages (10 files)
- [x] `src/app/admin/layout.tsx`
- [x] `src/app/admin/page.tsx`
- [x] `src/app/admin/AdminSidebar.tsx`
- [x] `src/app/admin/analytics/page.tsx`
- [x] `src/app/admin/billing/page.tsx`
- [x] `src/app/admin/departments/page.tsx`
- [x] `src/app/admin/members/page.tsx`
- [x] `src/app/admin/org-chart/page.tsx`
- [x] `src/app/admin/settings/page.tsx`

### ✅ Admin Setup Wizard (6 files)
- [x] `src/app/admin/setup/layout.tsx`
- [x] `src/app/admin/setup/page.tsx`
- [x] `src/app/admin/setup/departments/page.tsx`
- [x] `src/app/admin/setup/employees/page.tsx`
- [x] `src/app/admin/setup/supervisors/page.tsx`
- [x] `src/app/admin/setup/review/page.tsx`

### ✅ Onboarding (1 file)
- [x] `src/app/onboarding/page.tsx`

### ✅ Root App (3 files)
- [x] `src/app/layout.tsx`
- [x] `src/app/page.tsx`
- [x] `src/app/globals.css`

### ✅ API Routes (11 files)
- [x] `src/app/api/sessions/route.ts`
- [x] `src/app/api/sessions/[id]/route.ts`
- [x] `src/app/api/sessions/[id]/messages/route.ts`
- [x] `src/app/api/admin/setup/route.ts`
- [x] `src/app/api/admin/setup/complete/route.ts`
- [x] `src/app/api/admin/members/route.ts`
- [x] `src/app/api/admin/invite/route.ts`
- [x] `src/app/api/admin/settings/route.ts`
- [x] `src/app/api/analytics/org/route.ts`
- [x] `src/app/api/analytics/departments/route.ts`
- [x] `src/app/api/auth/link-invite/route.ts`
- [x] `src/app/api/internal/scheduler/route.ts`

### ✅ SQL Migrations (10 files)
- [x] `supabase/migrations/001_initial_schema.sql`
- [x] `supabase/migrations/002_agents_sessions.sql`
- [x] `supabase/migrations/003_user_profiles.sql`
- [x] `supabase/migrations/004_rls_policies.sql`
- [x] `supabase/migrations/005_seed_agents.sql`
- [x] `supabase/migrations/006_fix_org_creation_rls.sql`
- [x] `supabase/migrations/007_complete_rls_setup.sql`
- [x] `supabase/migrations/008_schedule_settings.sql`
- [x] `supabase/migrations/009_enhanced_onboarding.sql`
- [x] `supabase/migrations/010_subscription_trial.sql`

---

## VERIFICATION COMMAND
Run this to verify all files exist:
```bash
find src -name "*.ts" -o -name "*.tsx" | wc -l
# Should output: 61
find supabase/migrations -name "*.sql" | wc -l
# Should output: 10
```

---

## CHANGELOG
<!-- AI agents: log all changes here -->
```
2025-11-26 cline - Created MASTER_PROJECT_CONTEXT.md, initial structure
2025-11-26 cline - Added AI agent instruction headers to ALL 61 code files
2025-11-27 cline - COMPLETED full documentation of all files:
  - Added Auth Pages section (6 files)
  - Added Dashboard Pages section (3 files)
  - Added Admin Pages section (10 files)
  - Added Admin Setup Wizard section (6 files)
  - Added Onboarding section (1 file)
  - Added Root App Files section (3 files)
  - Added complete API Routes documentation (11 files)
  - Added COMPLETE FILE CHECKLIST with all 61+10 files
  - Added verification command
  - Version bumped to 1.1.0
  - Status: DOCUMENTATION COMPLETE
2025-11-27 cline - COMPLETED Phase 1 Rebrand (Hi-Vis Biz → VizDots):
  - Updated 11 files with VizDots branding
  - Files modified: layout.tsx, page.tsx, login, register, dashboard layout, 
    onboarding, AdminSidebar, admin setup layout, admin page, invite route, 
    onboarding-wizard.ts
  - Updated messaging: "See Your Business Clearly — One Dot at a Time"
  - Updated CTA: "Start Free → 30 Days On Us"
  - Updated footer: "Small inputs. Big visibility. Real improvement."
  - Updated localStorage key: hivisbiz_onboarding_state → vizdots_onboarding_state
  - Updated invite URL fallback: hi-vis-biz.vercel.app → vizdots.com
  - Updated support email: support@vizdots.com
  - Version bumped to 1.2.0
  - Status: REBRAND COMPLETE
