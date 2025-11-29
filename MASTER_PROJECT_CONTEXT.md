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
documentation_status: COMPLETE - all 100 code files + 20 SQL migrations documented
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
├── supabase/migrations/        # Database migrations (001-015)
├── tests/                      # Test files
│   ├── setup.ts                # Test configuration
│   ├── unit/                   # Vitest unit tests
│   └── e2e/                    # Playwright E2E tests
└── config files                # next.config.js, tailwind.config.ts, vitest.config.ts, playwright.config.ts, etc.
```

---

## DATA TRUTH LAYERS ARCHITECTURE

VizDots uses a three-layer data architecture to ensure data integrity and traceability:

### Layer 1: Facts (Immutable)
Raw inputs from employees that are **never modified** after creation:
- `answers` - Raw check-in responses, transcripts, and AI-extracted data
- Enforced by database trigger `prevent_answer_mutation()` that blocks all UPDATEs

### Layer 2: Derived (Versioned)
AI-generated interpretations built from facts:
- `workflows` + `workflow_versions` - Discovered business processes with version history
- Each change creates a NEW version (never updates existing versions)
- Versions track: who created them (AI/owner/admin), source dots used, change summary

### Layer 3: Overrides (Phase 2 - Coming)
Human corrections that layer on top of derived data:
- `workflow_overrides` - Owner corrections to AI-generated workflows
- Override layer is separate from derived layer, preserving AI suggestions

### Data Invariants
1. **Facts never mutate** - Raw dots are immutable historical records
2. **Derived objects are versioned** - No destructive updates, only new versions
3. **Every change is audited** - `audit_log` captures all significant modifications
4. **Overrides are reversible** - Can always "reset to AI suggestion"

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

### Truth Layer Tables (Phase 1)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `workflows` | Stable workflow identifiers | id, org_id, workflow_key, display_name, department_id, status |
| `workflow_versions` | Versioned workflow snapshots | id, workflow_id, version_number, created_by_type, created_by_id, source_dot_ids, structure (JSONB) |
| `audit_log` | Global change tracking | id, org_id, actor_type, actor_id, entity_type, entity_id, action, details (JSONB) |

### Analytics Backbone Tables (Phase 5)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `team_health_metrics` | Computed team health metrics per department/time window | id, org_id, department_id, time_window_start, time_window_end, participation_rate, friction_index, sentiment_score, focus_score, workload_score, burnout_risk_score, risk_level |
| `topic_summaries` | Recurring themes by period | id, org_id, department_id, time_window_start, time_window_end, topic_key, topic_label, mention_count, sentiment_trend, summary_text |

### Pattern Alerts Tables (Phase 6)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `pattern_alerts` | Automated alerts when health metrics breach thresholds | id, org_id, department_id, alert_type, severity, status, metric_snapshot (JSONB), coaching_suggestions (JSONB[]), resolved_at, resolved_by_user_id, resolution_note, alert_date |

### Privacy & Consent Tables (Phase 7)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `user_consents` | Tracks user consent for data processing | id, org_id, user_id, consent_type, consented_at, withdrawn_at, consent_version, ip_address |
| `data_export_requests` | GDPR data export requests | id, org_id, user_id, requested_at, status, completed_at, download_url, expires_at |
| `archived_data_log` | Data retention compliance audit log | id, org_id, table_name, record_count, archived_at, retention_days, archive_type |

### Override Layer Tables (Phase 2)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `workflow_overrides` | Owner/admin corrections to AI workflows | id, workflow_id, created_by_user_id, status, override_reason, override_payload (JSONB), accuracy_rating, accuracy_feedback (JSONB) |
| `owner_notes` | Contextual notes from owners/admins | id, org_id, workflow_id, department_id, author_user_id, note_type, note_text, visible_to, is_active |

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
| `src/lib/supabase/direct-sql.ts` | Direct SQL execution (bypasses MCP) | executeDirectSQL, executeMigration, tableExists, listTables, getTableColumns |

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
| `src/lib/utils/team-health.ts` | Team health metric computations | computeTeamHealthMetrics, computeParticipationRate, computeFrictionIndex, computeSentimentScore, computeFocusScore, computeWorkloadScore, computeBurnoutRiskScore |
| `src/lib/utils/alert-rules.ts` | Pattern alert rules engine | DEFAULT_THRESHOLDS, COACHING_TEMPLATES, evaluateAndCreateAlerts, getOpenAlerts, updateAlertStatus |

### UI Components

| File | Purpose | Exports |
|------|---------|---------|
| `src/components/auth/HashHandler.tsx` | URL hash auth token handler with smart routing | default HashHandler |
| `src/components/ui/LoadingSpinner.tsx` | Loading spinners | LoadingSpinner, ButtonLoading |
| `src/components/ui/Toast.tsx` | Toast notifications | ToastProvider, useToast |
| `src/components/ui/Skeleton.tsx` | Loading placeholders | Skeleton, SkeletonCard, SkeletonTable, etc. |
| `src/components/ui/ActionMenu.tsx` | Dropdown action menu | default ActionMenu, ActionMenuIcons |
| `src/components/ui/ErrorBoundary.tsx` | React error boundary wrapper | ErrorBoundary |
| `src/components/ui/PrivacyInfoModal.tsx` | Employee-facing privacy info modal | PrivacyInfoModal |

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
| `013_email_logs.sql` | **Phase 10: email tracking/idempotence** |
| `014_truth_layers.sql` | **Phase 1 Feature Update: workflows, workflow_versions, audit_log, fact immutability** |
| `015_overrides_owner_notes.sql` | **Phase 2 Feature Update: workflow_overrides, owner_notes, audit trigger** |
| `016_workflow_variants.sql` | **Phase 3 Feature Update: workflow_variants, workflow_variant_dot_links** |
| `017_multi_language.sql` | **Phase 4 Feature Update: multi-language support, dual text storage** |
| `018_team_health_metrics.sql` | **Phase 5 Feature Update: team_health_metrics, topic_summaries tables** |
| `019_pattern_alerts.sql` | **Phase 6 Feature Update: pattern_alerts table with RLS policies** |
| `020_privacy_controls.sql` | **Phase 7 Feature Update: privacy settings, consent tracking, data export requests** |

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
After auth success (callback route or HashHandler):
1. Check for invite type → handle invite flow → /auth/set-password
2. Check for recovery type → handle password reset → /auth/set-password
3. Check organization_members record:
   - NO record → NEW USER → /admin/setup
   - role=owner/admin → /admin
   - role=member → check profile → /dashboard or /onboarding

HashHandler handles tokens in URL hash fragment (client-side):
- Supabase email verification sends tokens in hash fragment
- HashHandler sets session, then performs same smart routing as callback
- This ensures new org owners go directly to /admin/setup after email verification
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

## COMPLETE FILE CHECKLIST (100 TypeScript/TSX + 20 SQL + 4 Test Files)

### ✅ Core Infrastructure (5 files)
- [x] `src/middleware.ts`
- [x] `src/lib/supabase/client.ts`
- [x] `src/lib/supabase/server.ts`
- [x] `src/lib/supabase/middleware.ts`
- [x] `src/lib/supabase/direct-sql.ts` - **Direct SQL execution for autonomous AI operations (bypasses MCP)**

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

### ✅ Utilities (10 files)
- [x] `src/lib/utils/profile.ts`
- [x] `src/lib/utils/scheduler.ts`
- [x] `src/lib/utils/onboarding-wizard.ts`
- [x] `src/lib/utils/csv-parser.ts`
- [x] `src/lib/utils/ai-logger.ts`
- [x] `src/lib/utils/rate-limiter.ts`
- [x] `src/lib/utils/workflow-resolver.ts` - **Phase 2: Resolves effective workflows with overrides applied**
- [x] `src/lib/utils/translation.ts` - **Phase 4: Multi-language translation utilities (translateToEnglish, detectLanguage, processAnswerForStorage)**
- [x] `src/lib/utils/team-health.ts` - **Phase 5: Team health metric computations (participation, friction, sentiment, focus, workload, burnout)**
- [x] `src/lib/utils/alert-rules.ts` - **Phase 6: Pattern alert rules engine (thresholds, coaching templates, alert evaluation)**

### ✅ UI Components (7 files)
- [x] `src/components/auth/HashHandler.tsx`
- [x] `src/components/ui/LoadingSpinner.tsx`
- [x] `src/components/ui/Toast.tsx`
- [x] `src/components/ui/Skeleton.tsx`
- [x] `src/components/ui/ActionMenu.tsx`
- [x] `src/components/ui/ErrorBoundary.tsx`
- [x] `src/components/ui/PrivacyInfoModal.tsx` - **Phase 7: Employee-facing privacy info modal**

### ✅ Auth Pages (6 files)
- [x] `src/app/auth/login/page.tsx` - **includes forgot password flow**
- [x] `src/app/auth/register/page.tsx`
- [x] `src/app/auth/actions.ts`
- [x] `src/app/auth/callback/route.ts`
- [x] `src/app/auth/set-password/page.tsx` - **handles invite + recovery**
- [x] `src/app/auth/auth-code-error/page.tsx`

### ✅ Dashboard Pages (5 files)
- [x] `src/app/dashboard/layout.tsx` - **no-membership handling, Settings nav link**
- [x] `src/app/dashboard/page.tsx` - **Day 0 empty state**
- [x] `src/app/dashboard/my-dots/page.tsx`
- [x] `src/app/dashboard/session/[id]/page.tsx` - **completed session handling**
- [x] `src/app/dashboard/settings/page.tsx` - **Phase 4: Employee language preference settings**

### ✅ Admin Pages (14 files)
- [x] `src/app/admin/layout.tsx` - **403 access denied for non-admins**
- [x] `src/app/admin/page.tsx` - **resume setup banner, early warnings**
- [x] `src/app/admin/AdminSidebar.tsx` - **ARIA labels, keyboard nav**
- [x] `src/app/admin/analytics/page.tsx`
- [x] `src/app/admin/billing/page.tsx` - **contact us CTA**
- [x] `src/app/admin/departments/page.tsx`
- [x] `src/app/admin/members/page.tsx`
- [x] `src/app/admin/org-chart/page.tsx`
- [x] `src/app/admin/settings/page.tsx`
- [x] `src/app/admin/workflows/page.tsx` - **Updated Phase 2: uses workflows/workflow_versions tables**
- [x] `src/app/admin/workflows/[id]/page.tsx` - **Phase 2: Workflow detail view with feedback & notes**
- [x] `src/app/admin/workflows/[id]/WorkflowFeedback.tsx` - **Phase 2: Feedback strip (accurate/partial/incorrect)**
- [x] `src/app/admin/workflows/[id]/OwnerNotes.tsx` - **Phase 2: Note composer with type/visibility**
- [x] `src/app/admin/workflows/[id]/WorkflowVariants.tsx` - **Phase 3: Variant chips with OK/friction toggles**
- [x] `src/app/admin/team-health/page.tsx` - **Phase 5: Team Health Scorecard UI**
- [x] `src/app/admin/alerts/page.tsx` - **Phase 6: Pattern alerts management UI with coaching suggestions**
- [x] `src/app/admin/privacy/page.tsx` - **Phase 7: Privacy & trust settings UI**
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

### ✅ API Routes (18 files)
- [x] `src/app/api/sessions/route.ts`
- [x] `src/app/api/sessions/[id]/route.ts`
- [x] `src/app/api/sessions/[id]/messages/route.ts`
- [x] `src/app/api/admin/setup/route.ts`
- [x] `src/app/api/admin/setup/complete/route.ts`
- [x] `src/app/api/admin/members/route.ts`
- [x] `src/app/api/admin/invite/route.ts`
- [x] `src/app/api/admin/settings/route.ts`
- [x] `src/app/api/admin/ai-test/route.ts`
- [x] `src/app/api/admin/workflows/feedback/route.ts` - **Phase 2: Submit accuracy feedback**
- [x] `src/app/api/admin/workflows/reset/route.ts` - **Phase 2: Reset to AI suggestion**
- [x] `src/app/api/admin/workflows/notes/route.ts` - **Phase 2: Create/archive owner notes**
- [x] `src/app/api/admin/workflows/variants/route.ts` - **Phase 3: GET/POST/PATCH workflow variants**
- [x] `src/app/api/analytics/org/route.ts`
- [x] `src/app/api/analytics/departments/route.ts`
- [x] `src/app/api/auth/link-invite/route.ts`
- [x] `src/app/api/internal/scheduler/route.ts`
- [x] `src/app/api/internal/reminders/route.ts` - **Phase 10: Check-in reminder emails**
- [x] `src/app/api/user/language/route.ts` - **Phase 4: GET/PUT user language preference**
- [x] `src/app/api/admin/team-health/route.ts` - **Phase 5: GET/POST team health metrics**
- [x] `src/app/api/admin/alerts/route.ts` - **Phase 6: GET alerts list, PATCH alert status**
- [x] `src/app/api/admin/privacy/route.ts` - **Phase 7: GET/PUT org privacy settings**

### ✅ SQL Migrations (20 files)
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
- [x] `supabase/migrations/014_truth_layers.sql` - **Phase 1 Feature Update: workflow versioning, audit_log, fact immutability**
- [x] `supabase/migrations/015_overrides_owner_notes.sql` - **Phase 2 Feature Update: workflow_overrides, owner_notes**
- [x] `supabase/migrations/016_workflow_variants.sql` - **Phase 3 Feature Update: workflow_variants, workflow_variant_dot_links**
- [x] `supabase/migrations/017_multi_language.sql` - **Phase 4 Feature Update: multi-language support, dual text storage**
- [x] `supabase/migrations/018_team_health_metrics.sql` - **Phase 5 Feature Update: team_health_metrics, topic_summaries tables**
- [x] `supabase/migrations/019_pattern_alerts.sql` - **Phase 6 Feature Update: pattern_alerts table with RLS policies**
- [x] `supabase/migrations/020_privacy_controls.sql` - **Phase 7 Feature Update: privacy settings, consent tracking, data export requests**

### ✅ Test Files (6 files)
- [x] `vitest.config.ts`
- [x] `playwright.config.ts`
- [x] `tests/setup.ts`
- [x] `tests/unit/scheduler.test.ts`
- [x] `tests/unit/feature-updates.test.ts` - **Phase 8: Feature Update tests (Phases 1-7)**
- [x] `tests/e2e/auth.spec.ts`

### ✅ Configuration Files (1 file)
- [x] `src/lib/config/feature-flags.ts` - **Phase 8: Feature flags for progressive rollout**

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
2025-11-28 cline - Started FEATURE_UPDATE_EXECUTION_PLAN Phase 1:
  - Created supabase/migrations/014_truth_layers.sql
  - Added workflows + workflow_versions tables for versioned workflows
  - Added audit_log table for global change tracking
  - Added fact immutability trigger on answers table
  - Documented Data Truth Layers architecture in MASTER_PROJECT_CONTEXT.md
2025-11-28 cline - Completed FEATURE_UPDATE_EXECUTION_PLAN Phase 2 (DB layer):
  - Created supabase/migrations/015_overrides_owner_notes.sql
  - Added workflow_overrides table for owner corrections to AI workflows
  - Added owner_notes table for contextual notes
  - Added audit trigger for override changes
  - All tables have RLS policies and indexes
2025-11-28 cline - Completed FEATURE_UPDATE_EXECUTION_PLAN Phase 2 (UI layer):
  - Created src/app/admin/workflows/[id]/page.tsx (workflow detail view)
  - Created src/app/admin/workflows/[id]/WorkflowFeedback.tsx (feedback strip)
  - Created src/app/admin/workflows/[id]/OwnerNotes.tsx (note composer)
  - Created src/app/api/admin/workflows/feedback/route.ts (POST feedback)
  - Created src/app/api/admin/workflows/reset/route.ts (POST reset)
  - Created src/app/api/admin/workflows/notes/route.ts (POST/DELETE notes)
  - Updated src/app/admin/workflows/page.tsx to use new workflow tables
  - Created src/lib/utils/workflow-resolver.ts for AI agents
  - Fixed TypeScript build error (Supabase FK array to object transform)
  - Phase 2 COMPLETE - Owner Feedback Controls & Notes UI shipped
2025-11-28 cline - Completed FEATURE_UPDATE_EXECUTION_PLAN Phase 3 (Variants):
  - Created supabase/migrations/016_workflow_variants.sql
  - Created src/app/api/admin/workflows/variants/route.ts (GET/POST/PATCH)
  - Created src/app/admin/workflows/[id]/WorkflowVariants.tsx
  - Updated workflow detail page to include WorkflowVariants component
  - Phase 3 COMPLETE - Variant handling & friction tracking shipped
2025-11-28 cline - Completed FEATURE_UPDATE_EXECUTION_PLAN Phase 4 (Multi-Language):
  - Created supabase/migrations/017_multi_language.sql (executed via MCP)
  - Created src/lib/utils/translation.ts (translateToEnglish, detectLanguage, processAnswerForStorage)
  - Created src/app/api/user/language/route.ts (GET/PUT language preference)
  - Created src/app/dashboard/settings/page.tsx (employee language settings UI)
  - Updated src/app/dashboard/layout.tsx (added Settings nav link)
  - 11 supported languages: en, es, fr, de, pt, it, nl, pl, ja, zh, ko
  - Dual text storage: original language + English translation for analytics
  - Phase 4 COMPLETE - Multi-language support shipped
2025-11-28 cline - Completed FEATURE_UPDATE_EXECUTION_PLAN Phase 5 (Analytics Backbone):
  - Created supabase/migrations/018_team_health_metrics.sql (team_health_metrics, topic_summaries tables)
  - Created src/lib/utils/team-health.ts (metric computation utilities)
  - Created src/app/api/admin/team-health/route.ts (GET/POST metrics API)
  - Created src/app/admin/team-health/page.tsx (Team Health Scorecard UI)
  - Updated src/app/admin/AdminSidebar.tsx (added Team Health nav link)
  - Metrics: participation_rate, friction_index, sentiment_score, focus_score, workload_score, burnout_risk_score
  - Risk levels: low (0-33), medium (34-66), high (67-100)
  - Time windows: week, month, quarter
  - Phase 5 COMPLETE - Analytics backbone shipped
2025-11-28 cline - Completed FEATURE_UPDATE_EXECUTION_PLAN Phase 6 (Pattern Alerts):
  - Created supabase/migrations/019_pattern_alerts.sql (pattern_alerts table with RLS)
  - Created src/lib/utils/alert-rules.ts (DEFAULT_THRESHOLDS, COACHING_TEMPLATES, evaluateAndCreateAlerts)
  - Created src/app/api/admin/alerts/route.ts (GET list with stats, PATCH status update)
  - Created src/app/admin/alerts/page.tsx (expandable alert cards, coaching suggestions, action buttons)
  - Updated src/app/admin/AdminSidebar.tsx (added Alerts nav link with bell icon)
  - Alert types: low_participation, high_friction, sentiment_drop, workload_spike, burnout_risk, focus_drift, process_variance
  - Alert severities: info, warning, critical
  - Alert statuses: open, acknowledged, resolved, dismissed
  - Phase 6 COMPLETE - Pattern alerts & manager coaching shipped
2025-11-28 cline - Completed FEATURE_UPDATE_EXECUTION_PLAN Phase 7 (Privacy & Trust):
  - Created supabase/migrations/020_privacy_controls.sql (privacy columns, user_consents, data_export_requests, archived_data_log)
  - Created src/app/api/admin/privacy/route.ts (GET/PUT org privacy settings)
  - Created src/app/admin/privacy/page.tsx (Privacy settings admin UI)
  - Created src/components/ui/PrivacyInfoModal.tsx (employee-facing privacy info)
  - Updated src/app/admin/AdminSidebar.tsx (added Privacy nav link)
  - Privacy features: data retention settings, employee privacy controls, consent tracking, GDPR compliance hooks
  - Phase 7 COMPLETE - Privacy & trust controls shipped
2025-11-29 cline - Fixed new org owner onboarding flow:
  - Updated src/components/auth/HashHandler.tsx with smart routing (same logic as callback/route.ts)
  - New owners now route directly to /admin/setup after email verification
  - Updated src/app/auth/register/page.tsx to use NEXT_PUBLIC_APP_URL for redirect
  - NOTE: Supabase Dashboard Site URL must be updated from hi-vis-biz.vercel.app to vizdots.com
2025-11-28 cline - Completed FEATURE_UPDATE_EXECUTION_PLAN Phase 8 (Testing & Documentation):
  - Created tests/unit/feature-updates.test.ts (unit tests for all Feature Update phases 1-7)
  - Updated MANUAL_TEST_SCRIPT.md (added Parts 9-14 for Feature Update manual testing)
  - Created src/lib/config/feature-flags.ts (feature flags for progressive rollout)
  - Updated FOUNDER_GUIDE.md (added sections for workflow overrides, team health, alerts, multi-language, privacy)
  - Updated RUNBOOK.md (added Feature Update Systems section with operational notes)
  - ALL 8 FEATURE UPDATE PHASES COMPLETE
