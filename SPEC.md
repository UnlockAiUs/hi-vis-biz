# Hi-Vis Biz - Product Specification
<!-- AI AGENT: Reference doc for product requirements. Do not modify. -->

## Overview
```
NAME: Hi-Vis Biz
TYPE: AI-driven employee check-in system
STACK: Next.js 14 + Supabase + Vercel + OpenAI
GOAL: Collect structured employee data via micro AI chats (1-2 min, 2-3x/week)
```

**Core Loop**: Automated short AI conversations → Extract structured data → Build evolving employee profiles → Surface org insights

---

## User Roles

| Role | Capabilities |
|------|-------------|
| **Org Admin** | Create org, add departments, upload employee emails, flag managers/execs, activate/deactivate users, view aggregated analytics |
| **Employee** | Accept invite, complete profile, respond to micro-check-ins (2-3/week), profile evolves over time |

---

## AI Agents
<!-- 5 specialized agents, each extracts specific data -->

| Agent Code | Name | Mission | Output Schema |
|------------|------|---------|---------------|
| `pulse` | Pulse Agent | Track morale, workload, burnout | `{rating:1-5, reason:string, workload_rating:1-5, burnout_risk:low\|medium\|high}` |
| `role_mapper` | Role Mapper | Understand job role | `{role_summary:string, primary_duties:string[], customer_facing:bool, kpis_known:bool}` |
| `workflow_mapper` | Workflow Mapper | Map recurring tasks + tools | `{workflow_name:string, display_label:string, steps:string[], tools:string[], data_sources:string[]}` |
| `pain_scanner` | Pain Scanner | Quantify friction points | `{workflow_ref:string, tool_ref:string, pain_rating:1-5, reason:string, frequency:string, impact:string}` |
| `focus_tracker` | Focus Tracker | Current work + progress | `{current_focus_label:string, current_focus_tags:string[], still_primary_focus:bool, focus_rating:1-5, change_vs_last_time:string, reason:string}` |

**Agent Behavior**:
- Each session = 1 agent, 1-3 messages max
- Agent reads: user profile, past answers, profile gaps
- Agent returns: structured JSON matching output schema
- Backend merges response into user_profiles.profile_json

---

## Check-in Cadence

| Timing | Agent Focus |
|--------|-------------|
| **Early weeks** | Role Mapper + Workflow Mapper (build foundation) |
| **Steady state** | Pulse (weekly), Pain Scanner, Focus Tracker |
| **Per week** | ~3 micro-sessions per active employee |
| **Per session** | 1-2 minutes |

---

## Key Flows

### Flow 1: Admin Setup
```
1. Admin registers → creates org (name, timezone, size_band)
2. Admin adds departments (simple list)
3. Admin uploads employee emails (CSV or paste)
4. Admin optionally flags managers/execs
5. System sends invites, starts scheduling sessions for active members
```

### Flow 2: Employee Onboarding
```
1. Employee receives invite email → clicks link
2. Sets password via Supabase Auth
3. Completes profile screen:
   - Required: name, job_title, department
   - Optional: location, supervisor
4. (Recommended) Initial Role Mapper session:
   - "In one sentence, what are your primary duties?"
   - "What are the main things you do most weeks?"
5. Profile seeded → regular sessions begin
```

### Flow 3: Micro-Session
```
1. Session scheduled (session_type='agent', agent_code=X)
2. Employee opens session in dashboard
3. Backend loads: user profile, past answers, agent config
4. AI agent generates 1-3 contextual questions
5. Employee responds conversationally
6. AI extracts structured JSON
7. Backend saves: answer record + transcript
8. Backend merges JSON into user_profiles.profile_json
```

---

## Data Model

### Identity & Org Tables

**users** (extends Supabase auth.users)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, from auth.users |
| email | VARCHAR(255) | Unique |
| name | VARCHAR(255) | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**organizations**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR(255) | |
| timezone | VARCHAR(50) | Default 'UTC' |
| size_band | VARCHAR(20) | e.g. "11-50" |
| created_at | TIMESTAMPTZ | |

**departments**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| org_id | UUID | FK → organizations |
| name | VARCHAR(255) | |
| created_at | TIMESTAMPTZ | |

**organization_members**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| org_id | UUID | FK → organizations |
| user_id | UUID | FK → auth.users |
| role | VARCHAR(20) | owner, admin, member |
| level | VARCHAR(20) | exec, manager, ic |
| department_id | UUID | FK → departments (nullable) |
| supervisor_user_id | UUID | FK → auth.users (nullable) |
| status | VARCHAR(20) | invited, active, inactive |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### Agent & Session Tables

**agents**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| agent_code | VARCHAR(50) | Unique: pulse, role_mapper, workflow_mapper, pain_scanner, focus_tracker |
| name | VARCHAR(100) | |
| description | TEXT | |
| created_at | TIMESTAMPTZ | |

**topic_archetypes**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| agent_code | VARCHAR(50) | FK → agents |
| topic_code | VARCHAR(50) | Unique |
| display_name | VARCHAR(100) | |
| kind | VARCHAR(30) | morale, role, workflow, tools, pain, focus |
| level | VARCHAR(20) | exec, manager, ic, all |
| dept_tags_json | JSONB | e.g. ["sales"], ["all"] |
| frequency_hint | VARCHAR(30) | core_weekly, onboarding, periodic, rare |
| output_schema_json | JSONB | Expected answer structure |
| is_active | BOOLEAN | Default true |
| created_at | TIMESTAMPTZ | |

**sessions**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| org_id | UUID | FK → organizations |
| user_id | UUID | FK → auth.users |
| agent_code | VARCHAR(50) | FK → agents |
| scheduled_for | TIMESTAMPTZ | |
| started_at | TIMESTAMPTZ | Nullable |
| completed_at | TIMESTAMPTZ | Nullable |
| source | VARCHAR(20) | Default 'autopilot' |
| created_at | TIMESTAMPTZ | |

**session_topics**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| session_id | UUID | FK → sessions |
| topic_code | VARCHAR(50) | FK → topic_archetypes |
| sequence | INT | Default 1 |
| created_at | TIMESTAMPTZ | |

**answers**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| org_id | UUID | FK → organizations |
| session_id | UUID | FK → sessions |
| topic_code | VARCHAR(50) | |
| user_id | UUID | FK → auth.users |
| agent_code | VARCHAR(50) | |
| answer_text | TEXT | Summary/main reason |
| answer_number | DECIMAL | Primary numeric measure |
| answer_json | JSONB | Full structured payload |
| transcript_json | JSONB | Full chat transcript |
| created_at | TIMESTAMPTZ | |

**user_topic_history**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| org_id | UUID | FK → organizations |
| user_id | UUID | FK → auth.users |
| topic_code | VARCHAR(50) | |
| last_asked_at | TIMESTAMPTZ | |
| times_answered | INT | Default 0 |

### Profile Table

**user_profiles**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| org_id | UUID | FK → organizations |
| user_id | UUID | FK → auth.users |
| profile_json | JSONB | Full profile data |
| version | INT | Default 1, increment on role change |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**profile_json schema**:
```json
{
  "role_summary": "string",
  "primary_duties": ["string"],
  "customer_facing": "boolean",
  "main_workflows": [{
    "workflow_ref": "string",
    "display_label": "string",
    "tools": ["string"],
    "data_sources": ["string"]
  }],
  "primary_tools": ["string"],
  "current_focus": {
    "label": "string",
    "tags": ["string"],
    "last_updated": "ISO8601"
  },
  "pain_points": [{
    "id": "string",
    "label": "string",
    "related_workflow_ref": "string",
    "severity_trend": "string"
  }],
  "morale_trend": "string",
  "open_profile_gaps": [{
    "id": "string",
    "priority": "string",
    "description": "string",
    "suggested_agent": "string"
  }]
}
```

---

## Scheduling Logic

**Scheduler Job** (Vercel Cron, daily):
1. Query all organization_members WHERE status = 'active'
2. For each member, check existing scheduled sessions for next 7 days
3. Create sessions based on:
   - Profile completeness (sparse → more Role Mapper)
   - Last asked dates (avoid repetition)
   - Agent frequency hints
4. Target: ~3 sessions/week/user

**vercel.json**:
```json
{"crons":[{"path":"/api/internal/scheduler","schedule":"0 6 * * *"}]}
```

---

## RLS Security Pattern

All tables scoped by org_id. Example policies:

```sql
-- Users see own org data
CREATE POLICY "view_own_org" ON organization_members
FOR SELECT USING (
  org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
);

-- Only admins insert members
CREATE POLICY "admin_insert_members" ON organization_members
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid() AND org_id = NEW.org_id AND role IN ('owner','admin')
  )
);
```

---

## Analytics (MVP)

| Level | Metrics |
|-------|---------|
| **Org** | Avg morale (week), morale trend (4-8 weeks), response rate, top pain themes |
| **Department** | Avg morale, participation rate, top pain themes |
| **Individual** | Data exists but no MVP UI (privacy) |

---

## Tech Stack Detail

| Layer | Tech | Purpose |
|-------|------|---------|
| Frontend | Next.js 14 (App Router) | React SSR/SSG |
| Styling | Tailwind CSS | Utility-first CSS |
| Backend | Next.js API Routes | Serverless endpoints |
| Database | Supabase (PostgreSQL 15) | Managed Postgres + RLS |
| Auth | Supabase Auth | Email/password, OAuth, invites |
| AI | OpenAI API | Agent conversations |
| Hosting | Vercel | Auto-deploy from GitHub |
| Scheduling | Vercel Cron | Daily session creation |
| Version Control | GitHub | Source of truth |

---

## Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| NEXT_PUBLIC_SUPABASE_URL | Public | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Public | Supabase anon key |
| SUPABASE_SERVICE_ROLE_KEY | Server | Supabase admin operations |
| OPENAI_API_KEY | Server | AI agent calls |
| SCHEDULER_SECRET | Server | Cron job authentication |

---

## Agent Prompt Patterns

### Pulse Agent
```
Context: {user.role_summary}, {recent_morale_history}
Q1: "Quick check-in: 1-5, how has this week felt at work?"
Q2: "What's one thing that made it a {rating} instead of {rating+1}?"
Extract: rating, reason, workload_rating, burnout_risk
```

### Role Mapper (New User)
```
Q1: "In one sentence, what are your primary duties?"
Q2: "What are the main things you do most weeks?"
Extract: role_summary, primary_duties[], customer_facing, kpis_known
```

### Role Mapper (Existing User)
```
Context: {existing role_summary, primary_duties}
Q1: "Has your role changed recently? If yes, how?"
Extract: updated fields or no_change flag
```

### Workflow Mapper
```
Context: {known primary_duties}
Pick one duty not yet mapped
Q1: "Walk me through {duty} step by step"
Q2: "What tools/systems do you use at each step?"
Extract: workflow_name, steps[], tools[], data_sources[]
```

### Pain Scanner
```
Context: {known workflows, tools}
Pick one workflow/tool combo
Q1: "How smooth or painful is {workflow} with {tool}? 1-5"
Q2: "What's most annoying about it?"
Extract: workflow_ref, tool_ref, pain_rating, reason, frequency, impact
```

### Focus Tracker
```
Initial: "What are you mainly working on right now?"
Follow-up: "Last time you said {previous_focus}. Still focused on that? How's it going? 1-5"
Extract: current_focus_label, tags[], focus_rating, change_vs_last
```

---

## Role Change Detection

**Triggers**:
- Admin updates organization_members.level or department_id
- Employee self-reports via Role Mapper

**Actions**:
1. Insert row into member_role_history
2. Increment user_profiles.version (or create new row)
3. Next Role Mapper session asks: "Congrats on your new role! What will you be doing now?"

---

## Future Extensions (Not MVP)
- Org-specific custom topic_archetypes
- Company knowledge graph (tools, workflows, pain relationships)
- Infra/portal builder from profiles
- Advanced analytics (correlate morale ↔ pain ↔ tools)
- Slack/Teams bot delivery
- SSO/HRIS integration