# MASTER_PROJECT_CONTEXT.md
<!-- 
╔═══════════════════════════════════════════════════════════════════════════════╗
║ CRITICAL: AI AGENTS MUST READ THIS FILE BEFORE ANY WORK                       ║
║ UPDATE THIS FILE IMMEDIATELY AFTER ANY CODE CHANGES OR NEW FILE CREATION      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
-->

## META
```yaml
version: 3.0.0
last_updated: 2025-11-28
last_agent: cline
purpose: SINGLE SOURCE OF TRUTH for all AI agents working on this project
format: optimized for AI token efficiency
documentation_status: COMPLETE - all 79 code files + 13 SQL migrations documented
execution_plan_status: ALL 12 PHASES COMPLETE - PRODUCTION READY
rebrand_status: COMPLETE - rebranded from Hi-Vis Biz to VizDots
test_framework: COMPLETE - Vitest (unit) + Playwright (E2E)
design_system: COMPLETE - CSS custom properties, button/input/card components
accessibility: COMPLETE - Skip links, ARIA labels, 44px touch targets
billing_status: COMPLETE - Stripe integration with per-seat pricing ($29 base + $3/user)
email_status: COMPLETE - AWS SES for check-in reminders
```

## CRITICAL RULES FOR AI AGENTS
1. **READ** this file FIRST before any task
2. **UPDATE** this file IMMEDIATELY after creating/modifying ANY code
3. **VERIFY** your changes align with existing architecture
4. **NEVER** create duplicate functionality
5. **FOLLOW** existing patterns exactly
6. **ALWAYS COMMIT AND PUSH** - After completing any work, you MUST:
   - `git add -A`
   - `git commit -m "Descriptive message about changes"`
   - `git push origin main`
   - Never leave changes uncommitted or unpushed

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
repository: https://github.com/UnlockAiUs/hi-vis-biz.git
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
| New Org Owner | /auth/register | /admin/setup | Create org via 4-step wizard |
| Invited Employee | Email link | /auth/set-password → /onboarding | Set password, confirm info, start micro-sessions |
| Returning Admin | /auth/login | /admin | Manage org, view analytics |
| Returning Employee | /auth/login | /dashboard | Complete micro-sessions |
| Password Recovery | /auth/login (forgot) | /auth/set-password | Reset password via email |

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
│   │   │   └── setup/          # 4-step onboarding wizard
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
├── supabase/migrations/        # Database migrations (001-012)
├── tests/                      # Test files
│   ├── setup.ts                # Test configuration
│   ├── unit/                   # Vitest unit tests
│   └── e2e/                    # Playwright E2E tests
└── config files                # next.config.js, tailwind.config.ts, vitest.config.ts, playwright.config.ts, etc.
```

---

## DATABASE SCHEMA

### Core Tables
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `organizations` | Tenant orgs | id, name, timezone, size_band, trial_*, subscription_*, stripe_*, setup_completed_at |
| `departments` | Org departments | id, org_id, name |
| `organization_members` | User-org relationship | id, org_id, user_id, role, level, department_id, supervisor_user_id, status, display_name, job_title, has_direct_reports, can_view_reports, invite_* |
| `user_profiles` | JSONB profile per user | id, org_id, user_id, profile_json, version |

### AI/Session Tables
| Table | Purpose |
|-------|---------|
| `agents` | 5 AI agent definitions |
| `topic_archetypes` | Question types per agent |
| `sessions` | Scheduled micro-sessions (with idempotence constraint) |
| `session_topics` | Topics in session |
| `answers` | Responses + transcripts |
| `user_topic_history` | Topic tracking |
| `ai_logs` | AI call logging for debugging |

### Sessions Table Constraints
- **Idempotence Constraint (012):** Unique partial index on `(user_id, agent_code, scheduled_for::date)` WHERE `completed_at IS NULL`
- Prevents duplicate session creation when scheduler runs multiple times

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
| `src/lib/ai/agents/index.ts` | Agent registry & router | getAgent, agentMetadata (with icons) |
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
| `src/lib/utils/onboarding-wizard.ts` | Wizard state management | OnboardingState, useWizardState, WIZARD_STEPS (4 steps), INDUSTRIES, ScheduleSettings |
| `src/lib/utils/csv-parser.ts` | Employee CSV import | parseCSV, generateCSVTemplate, downloadCSVTemplate |
| `src/lib/utils/ai-logger.ts` | AI call logging | logAICall, startAITimer, withAILogging |
| `src/lib/utils/rate-limiter.ts` | API rate limiting | aiRateLimiter, authRateLimiter, checkRateLimit, getClientIP |

### UI Components

| File | Purpose | Exports |
|------|---------|---------|
| `src/components/auth/HashHandler.tsx` | URL hash auth token handler (invite/recovery) | default HashHandler |
| `src/components/ui/LoadingSpinner.tsx` | Loading spinners | LoadingSpinner, ButtonLoading |
| `src/components/ui/Toast.tsx` | Toast notifications | ToastProvider, useToast |
| `src/components/ui/Skeleton.tsx` | Loading placeholders | Skeleton, SkeletonCard, SkeletonTable, etc. |
| `src/components/ui/ActionMenu.tsx` | Dropdown action menu | default ActionMenu, ActionMenuIcons |
| `src/components/ui/ErrorBoundary.tsx` | React error boundary wrapper | ErrorBoundary |

### Auth Pages

| File | Purpose | Key Logic |
|------|---------|-----------|
| `src/app/auth/login/page.tsx` | Login form UI | Email/password form, **forgot password flow** with resetPasswordForEmail |
| `src/app/auth/register/page.tsx` | Registration form UI | Email/password form, calls signUp action |
| `src/app/auth/actions.ts` | Server actions for auth | signIn, signUp, signOut functions |
| `src/app/auth/callback/route.ts` | OAuth/magic link callback | Exchanges code, routes based on membership role |
| `src/app/auth/set-password/page.tsx` | Set password for invited/recovery users | Handles invite token AND password recovery |
| `src/app/auth/auth-code-error/page.tsx` | Auth error display | Shows error message with retry link |

### Dashboard Pages

| File | Purpose | Key Logic |
|------|---------|-----------|
| `src/app/dashboard/layout.tsx` | Dashboard layout wrapper | Auth check, navigation, **no-membership handling** with friendly UI |
| `src/app/dashboard/page.tsx` | Employee main dashboard | Lists pending/completed sessions, agent icons, **Day 0 empty state** |
| `src/app/dashboard/my-dots/page.tsx` | "My Dots" history page | Shows all completed check-ins with color-coded dots, stats, themes |
| `src/app/dashboard/session/[id]/page.tsx` | Micro-session chat interface | Real-time AI conversation, **completed session state handling** |

### Admin Pages

| File | Purpose | Key Logic |
|------|---------|-----------|
| `src/app/admin/layout.tsx` | Admin layout with sidebar | Auth + role check, **403 access denied page** for non-admin users |
| `src/app/admin/page.tsx` | Admin dashboard overview | Org stats, **resume setup banner**, early warning signals with actionable suggestions |
| `src/app/admin/AdminSidebar.tsx` | Navigation sidebar component | Links to all admin sections, **ARIA labels**, keyboard navigation, mobile drawer |
| `src/app/admin/analytics/page.tsx` | Analytics dashboard | Org-wide metrics, department breakdowns, charts |
| `src/app/admin/billing/page.tsx` | Billing & subscription | Trial status, plan details, **"Contact us to upgrade" CTA** |
| `src/app/admin/departments/page.tsx` | Department management | CRUD departments, member counts |
| `src/app/admin/members/page.tsx` | Member management | List, invite, edit, deactivate members |
| `src/app/admin/org-chart/page.tsx` | Organization chart | Hierarchical view of org structure |
| `src/app/admin/settings/page.tsx` | Organization settings | Org name, timezone, scheduling preferences |
| `src/app/admin/workflows/page.tsx` | Workflows page | Shows detected workflows from check-ins, grouped by department |
| `src/app/admin/ai-test-lab/page.tsx` | AI agent testing sandbox | **Sandbox banner**, test all 5 agents, sample prompts |

### Admin Setup Wizard (4 Steps)

| File | Purpose | Key Logic |
|------|---------|-----------|
| `src/app/admin/setup/layout.tsx` | Wizard layout | Progress indicator (4 steps), step navigation |
| `src/app/admin/setup/page.tsx` | Step 1: Company Basics | Org name, industry dropdown, team size |
| `src/app/admin/setup/departments/page.tsx` | Step 2: Departments & Roles | Add/edit/delete departments |
| `src/app/admin/setup/people/page.tsx` | Step 3: People | CSV upload or manual entry |
| `src/app/admin/setup/settings/page.tsx` | Step 4: Settings & Launch | Check-in frequency, time window, review summary, launch |

### Onboarding

| File | Purpose | Key Logic |
|------|---------|-----------|
| `src/app/onboarding/page.tsx` | Employee onboarding flow | Confirm details, intro to AI sessions |

### Root App Files

| File | Purpose | Key Logic |
|------|---------|-----------|
| `src/app/layout.tsx` | Root HTML layout | HashHandler, **skip link for accessibility**, Tailwind styles |
| `src/app/page.tsx` | Landing page | Marketing content, CTA buttons, responsive design |
| `src/app/globals.css` | Global styles | Tailwind imports, **design system** (buttons, inputs, cards, alerts, touch targets) |
| `src/app/error.tsx` | Global error boundary | Human-friendly error message, "Try Again" and "Go Home" buttons |
| `src/app/not-found.tsx` | Custom 404 page | Branded "We couldn't find that page" with CTAs to dashboard/home |

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
| `src/app/api/admin/ai-test/route.ts` | AI test lab endpoint | POST | Test agents with sample input |

### API Routes - Analytics

| File | Purpose | Exports | Key Logic |
|------|---------|---------|-----------|
| `src/app/api/analytics/org/route.ts` | Org-wide analytics | GET | Aggregated org metrics |
| `src/app/api/analytics/departments/route.ts` | Department analytics | GET | Per-department breakdowns |

### API Routes - Auth

| File | Purpose | Exports | Key Logic |
|------|---------|---------|-----------|
| `src/app/api/auth/link-invite/route.ts` | Link invite to user | POST | Associates invite token with authenticated user |

### API Routes - Billing (Phase 11)

| File | Purpose | Exports | Key Logic |
|------|---------|---------|-----------|
| `src/app/api/billing/create-checkout-session/route.ts` | Stripe checkout | POST | Creates Stripe checkout session, per-seat pricing ($29 base + $3/active user) |
| `src/app/api/billing/portal/route.ts` | Stripe customer portal | POST | Opens Stripe billing portal for subscription management |
| `src/app/api/billing/webhook/route.ts` | Stripe webhook handler | POST | Handles checkout.session.completed, subscription events, invoice events |

### Billing Components (Phase 11)

| File | Purpose | Exports |
|------|---------|---------|
| `src/lib/stripe/client.ts` | Stripe client config | stripe, STRIPE_BASE_PRICE_ID, STRIPE_SEAT_PRICE_ID, isStripeConfigured, getAppUrl |
| `src/app/admin/billing/BillingActions.tsx` | Billing button components | StartPlanButton, ManageBillingButton |

### API Routes - Internal

| File | Purpose | Exports | Key Logic |
|------|---------|---------|-----------|
| `src/app/api/internal/scheduler/route.ts` | Cron session scheduler | POST | Creates scheduled sessions, requires SCHEDULER_SECRET, idempotent |
| `src/app/api/internal/reminders/route.ts` | Check-in reminders | POST | Sends reminder emails via AWS SES, requires SCHEDULER_REMINDERS_SECRET, idempotent |

### Test Infrastructure

| File | Purpose | Key Logic |
|------|---------|-----------|
| `vitest.config.ts` | Vitest configuration | jsdom environment, path aliases, coverage config |
| `playwright.config.ts` | Playwright configuration | Multi-browser testing, mobile devices, auto-start dev server |
| `tests/setup.ts` | Test setup | Mock environment variables, global fetch mock |
| `tests/unit/scheduler.test.ts` | Scheduler unit tests | Session determination, idempotence, agent rotation, rate limiter |
| `tests/e2e/auth.spec.ts` | Auth E2E tests | Login, register, protected routes, 404, accessibility |

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
| `011_ai_logs.sql` | AI call logging table for debugging |
| `012_scheduler_idempotence.sql` | **Unique constraint for scheduler idempotence** - prevents duplicate sessions |

---

## PROJECT DOCUMENTATION FILES

| File | Purpose | Key Content |
|------|---------|-------------|
| `MASTER_PROJECT_CONTEXT.md` | Single source of truth for AI agents | This file - architecture, patterns, file docs |
| `SPEC.md` | Original product specification | Requirements and feature definitions |
| `FINAL_EXECUTION_PLAN.md` | 12-phase production-ready plan | Phases 1-9 complete, 10-12 pending |
| `BUGLOG.md` | Bug tracking and resolution | All P0/P1 bugs resolved |
| `MANUAL_TEST_SCRIPT.md` | Founder testing guide | Step-by-step manual test flows |
| `FOUNDER_GUIDE.md` | Non-technical operations guide | How to use VizDots as an admin |
| `EXECUTION_PLAN.md` | Original execution plan | Superseded by FINAL_EXECUTION_PLAN.md |
| `PRODUCTION_READY_EXECUTION_PLAN.md` | Production-ready plan | Superseded by FINAL_EXECUTION_PLAN.md |

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

### Get User's Org Membership (with proper FK handling)
```typescript
const { data: member } = await supabase
  .from('organization_members')
  .select('org_id, role, level, department:departments(name)')
  .eq('user_id', user.id)
  .maybeSingle() // Use maybeSingle() to avoid errors when no record

// FK relations return arrays, handle with:
const deptRaw = member?.department as any
const deptName = Array.isArray(deptRaw) ? deptRaw[0]?.name : deptRaw?.name
```

### AI Agent Call
```typescript
import { getAgent } from '@/lib/ai/agents'
const agent = getAgent(session.agent_code)
const response = await agent.chat(messages, context)
```

### Design System Button Classes
```css
/* Primary actions */
.btn-primary { /* Blue button */ }
.btn-secondary { /* White/gray button */ }
.btn-brand { /* Yellow brand button */ }
.btn-ghost { /* Transparent text button */ }
.btn-danger { /* Red danger button */ }

/* All buttons have 44px min-height for touch targets */
```

---

## ENVIRONMENT VARIABLES
| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Admin operations |
| `OPENAI_API_KEY` | Server | AI agent calls |
| `SCHEDULER_SECRET` | Server | Cron job auth for /api/internal/scheduler |
| `SCHEDULER_REMINDERS_SECRET` | Server | (Phase 10) Reminder cron job auth |
| `STRIPE_SECRET_KEY` | Server | (Phase 11) Stripe API |
| `STRIPE_PRICE_ID` | Server | (Phase 11) Subscription price |
| `STRIPE_WEBHOOK_SECRET` | Server | (Phase 11) Webhook signature |
| `EMAIL_PROVIDER_API_KEY` | Server | (Phase 10) Email sending |
| `EMAIL_FROM` | Server | (Phase 10) Sender address |

---

## ROUTING LOGIC

### Auth Callback Smart Routing
```
After auth success:
1. Check for invite type → handle invite flow → /auth/set-password
2. Check for recovery type → handle password reset → /auth/set-password
3. Check organization_members record:
   - NO record → NEW USER → /admin/setup
   - role=owner/admin → /admin
   - role=member → check profile → /dashboard or /onboarding
```

### Middleware Protected Routes
- `/admin/*` - requires auth + admin/owner role
- `/dashboard/*` - requires auth
- `/onboarding` - requires auth

### Access Control
- Non-admin users accessing `/admin/*` → 403 access denied page
- Users without org membership → Friendly "no team connected" UI
- Logged out users → Redirect to `/auth/login`

---

## COMPLETE FILE CHECKLIST (71 TypeScript/TSX + 12 SQL + 5 Test Files)

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

### ✅ Utilities (6 files)
- [x] `src/lib/utils/profile.ts`
- [x] `src/lib/utils/scheduler.ts`
- [x] `src/lib/utils/onboarding-wizard.ts`
- [x] `src/lib/utils/csv-parser.ts`
- [x] `src/lib/utils/ai-logger.ts`
- [x] `src/lib/utils/rate-limiter.ts`

### ✅ UI Components (6 files)
- [x] `src/components/auth/HashHandler.tsx`
- [x] `src/components/ui/LoadingSpinner.tsx`
- [x] `src/components/ui/Toast.tsx`
- [x] `src/components/ui/Skeleton.tsx`
- [x] `src/components/ui/ActionMenu.tsx`
- [x] `src/components/ui/ErrorBoundary.tsx`

### ✅ Auth Pages (6 files)
- [x] `src/app/auth/login/page.tsx` - **includes forgot password flow**
- [x] `src/app/auth/register/page.tsx`
- [x] `src/app/auth/actions.ts`
- [x] `src/app/auth/callback/route.ts`
- [x] `src/app/auth/set-password/page.tsx` - **handles invite + recovery**
- [x] `src/app/auth/auth-code-error/page.tsx`

### ✅ Dashboard Pages (4 files)
- [x] `src/app/dashboard/layout.tsx` - **no-membership handling**
- [x] `src/app/dashboard/page.tsx` - **Day 0 empty state**
- [x] `src/app/dashboard/my-dots/page.tsx`
- [x] `src/app/dashboard/session/[id]/page.tsx` - **completed session handling**

### ✅ Admin Pages (11 files)
- [x] `src/app/admin/layout.tsx` - **403 access denied for non-admins**
- [x] `src/app/admin/page.tsx` - **resume setup banner, early warnings**
- [x] `src/app/admin/AdminSidebar.tsx` - **ARIA labels, keyboard nav**
- [x] `src/app/admin/analytics/page.tsx`
- [x] `src/app/admin/billing/page.tsx` - **contact us CTA**
- [x] `src/app/admin/departments/page.tsx`
- [x] `src/app/admin/members/page.tsx`
- [x] `src/app/admin/org-chart/page.tsx`
- [x] `src/app/admin/settings/page.tsx`
- [x] `src/app/admin/workflows/page.tsx`
- [x] `src/app/admin/ai-test-lab/page.tsx` - **sandbox banner**

### ✅ Admin Setup Wizard (5 files)
- [x] `src/app/admin/setup/layout.tsx`
- [x] `src/app/admin/setup/page.tsx` (Step 1: Company Basics)
- [x] `src/app/admin/setup/departments/page.tsx` (Step 2: Departments)
- [x] `src/app/admin/setup/people/page.tsx` (Step 3: People)
- [x] `src/app/admin/setup/settings/page.tsx` (Step 4: Settings & Launch)

### ✅ Onboarding (1 file)
- [x] `src/app/onboarding/page.tsx`

### ✅ Root App (5 files)
- [x] `src/app/layout.tsx` - **skip link for accessibility**
- [x] `src/app/page.tsx`
- [x] `src/app/globals.css` - **design system**
- [x] `src/app/error.tsx`
- [x] `src/app/not-found.tsx` - **custom branded 404**

### ✅ Email System (2 files) - Phase 10
- [x] `src/lib/email/client.ts` - AWS SES v2 email client with retry logic
- [x] `src/lib/email/templates/checkin-reminder.ts` - Check-in reminder email template

### ✅ API Routes (14 files)
- [x] `src/app/api/sessions/route.ts`
- [x] `src/app/api/sessions/[id]/route.ts`
- [x] `src/app/api/sessions/[id]/messages/route.ts`
- [x] `src/app/api/admin/setup/route.ts`
- [x] `src/app/api/admin/setup/complete/route.ts`
- [x] `src/app/api/admin/members/route.ts`
- [x] `src/app/api/admin/invite/route.ts`
- [x] `src/app/api/admin/settings/route.ts`
- [x] `src/app/api/admin/ai-test/route.ts`
- [x] `src/app/api/analytics/org/route.ts`
- [x] `src/app/api/analytics/departments/route.ts`
- [x] `src/app/api/auth/link-invite/route.ts`
- [x] `src/app/api/internal/scheduler/route.ts`
- [x] `src/app/api/internal/reminders/route.ts` - **Phase 10: Check-in reminder emails**

### ✅ SQL Migrations (12 files)
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
- [x] `supabase/migrations/011_ai_logs.sql`
- [x] `supabase/migrations/012_scheduler_idempotence.sql` - **scheduler idempotence constraint**
- [x] `supabase/migrations/013_email_logs.sql` - **Phase 10: email tracking/idempotence**

### ✅ Test Files (5 files)
- [x] `vitest.config.ts`
- [x] `playwright.config.ts`
- [x] `tests/setup.ts`
- [x] `tests/unit/scheduler.test.ts`
- [x] `tests/e2e/auth.spec.ts`

---

## EXECUTION STATUS

### ALL 12 PHASES COMPLETE ✅ - PRODUCTION READY

- **Phase 1:** Baseline Snapshot & Bug Backlog ✅
- **Phase 2:** Core Micro-Session Experience ✅
- **Phase 3:** Auth, Onboarding, Password Recovery ✅
- **Phase 4:** Admin Experience ✅
- **Phase 5:** Scheduler & Data Integrity (incl. idempotence) ✅
- **Phase 6:** AI Reliability & Logging ✅
- **Phase 7:** Responsive Design & Accessibility ✅
- **Phase 8:** Automated & Manual Test Harness ✅
- **Phase 9:** Pre-Integration Perfection Audit ✅
- **Phase 10:** Outbound Email (AWS SES) ✅
- **Phase 11:** Stripe Billing ($29 base + $3/user per-seat pricing) ✅
- **Phase 12:** Final Documentation & Go-Live Checklist ✅

### Billing Model
- **Base fee:** $29/month per organization
- **Per-seat fee:** $3/month per ACTIVE user (inactive users not charged)
- **Users cannot be deleted** - only deactivated (data preservation)

---

## CHANGELOG
<!-- AI agents: log all changes here -->
```
2025-11-26 cline - Created MASTER_PROJECT_CONTEXT.md, initial structure
2025-11-26 cline - Added AI agent instruction headers to ALL 61 code files
2025-11-27 cline - COMPLETED full documentation of all files
2025-11-27 cline - COMPLETED Phase 1 Rebrand (Hi-Vis Biz → VizDots)
2025-11-27 cline - Added My Dots page (Phase 2)
2025-11-27 cline - Added Employee Welcome Screen (Phase 2)
2025-11-27 cline - Refactored Admin Onboarding Wizard (5 → 4 steps)
2025-11-27 cline - Enhanced Admin Dashboard with Early Warning Signals
2025-11-27 cline - Added AI Test Lab (Phase 3)
2025-11-27 cline - Added Error Handling (Phase 6)
2025-11-27 cline - Created FOUNDER_GUIDE.md (Phase 8)
2025-11-27 cline - Completed Phases 3, 6, 7 Production-Ready Features
2025-11-28 cline - Completed FINAL_EXECUTION_PLAN.md Phases 1-9:
  - Phase 1: Created BUGLOG.md, audited all routes
  - Phase 2: Fixed disabled Start button, added Day 0 empty states
  - Phase 3: Added forgot password flow, HashHandler routing
  - Phase 4: Resume setup banner, contact us CTA, early warnings
  - Phase 5: 012_scheduler_idempotence.sql migration
  - Phase 6: Sandbox banner in AI Test Lab
  - Phase 7: Design system in globals.css, accessibility improvements
  - Phase 8: Vitest + Playwright test framework, MANUAL_TEST_SCRIPT.md
  - Phase 9: not-found.tsx, 403 handling, no-membership handling
  - Version bumped to 2.0.0
  - File count: 71 TypeScript/TSX + 12 SQL + 5 Test files
2025-11-28 cline - Completed Phase 10 (Outbound Email):
  - Created src/lib/email/client.ts (AWS SES v2 with retry)
  - Created src/lib/email/templates/checkin-reminder.ts
  - Created supabase/migrations/013_email_logs.sql
  - Created src/app/api/internal/reminders/route.ts
  - Updated vercel.json with reminders cron
  - Fixed BUG-011: Map iteration (Array.from wrapper)
  - Fixed BUG-012: org_id column name in reminders route
  - File count: 74 TypeScript/TSX + 13 SQL + 5 Test files
2025-11-28 cline - Completed Phase 11 (Stripe Billing):
  - Created src/lib/stripe/client.ts
  - Created src/app/api/billing/create-checkout-session/route.ts
  - Created src/app/api/billing/portal/route.ts
  - Created src/app/api/billing/webhook/route.ts
  - Created src/app/admin/billing/BillingActions.tsx
  - Updated src/app/admin/billing/page.tsx with Stripe integration
  - Updated src/app/api/admin/members/route.ts (deactivate only, no delete)
  - Updated src/app/admin/members/page.tsx (deactivate only, no delete)
  - Billing model: $29 base + $3/active user per month
  - Users can NEVER be deleted (only deactivated)
  - Version bumped to 3.0.0
2025-11-28 cline - Completed Phase 12 (Final Documentation):
  - Updated MASTER_PROJECT_CONTEXT.md to v3.0.0
  - Updated FOUNDER_GUIDE.md with billing section
  - Created RUNBOOK.md (ops guide)
  - Created GO_LIVE_CHECKLIST.md
  - ALL 12 PHASES COMPLETE - PRODUCTION READY
