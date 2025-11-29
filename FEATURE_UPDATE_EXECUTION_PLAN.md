
# FEATURE_UPDATE_EXECUTION_PLAN.md

## 0. Purpose of This Document

This document is the **feature and infrastructure upgrade blueprint** for VizDots **after** the initial `FINAL_EXECUTION_PLAN.md` has been implemented.

It focuses on:

- Making VizDots **robust for evolving businesses**:
  - Clean separation between raw “dot” data, AI interpretations, and human overrides.
  - Full history and reversibility of changes.
  - Handling of “variety” vs “wrongness” in workflows and tools.
- Giving **owners and managers a steering wheel** without wrecking data integrity.
- Making the system **more globally usable and trustworthy**:
  - Multi-language support.
  - Manager coaching layer (suggested actions).
  - Pattern alerts.
  - Team health scorecard (drillable).
  - Privacy & trust controls.

This plan **builds on** the now-stable production system and is designed for:

- Autonomous AI agents (code editors, refactorers, test writers).
- A human founder/engineer to review migrations, secrets, and sensitive UX/policy choices.

---

## 1. Ground Rules for All Agents

### 1.0 CRITICAL: MCP Server Requirements for Autonomous Execution

**⚠️ AI agents MUST use MCP servers for autonomous execution without human intervention:**

| Service | MCP Server | Required Operations |
|---------|-----------|---------------------|
| **Supabase** | `supabase` | Database migrations, schema changes, SQL execution, table management |
| **Vercel** | `vercel` | Deployments, environment variables, project management |
| **Stripe** | `stripe` | Billing products, prices, subscriptions, customer management |

**MCP Usage Rules:**
1. **ALWAYS use Supabase MCP** (`use_mcp_tool` with `server_name: "supabase"`) for:
   - Running migrations via `execute_sql` or `apply_migration`
   - Creating/modifying tables, indexes, triggers, RLS policies
   - Verifying schema changes via `list_tables`
   - Never ask humans to manually run SQL - do it via MCP

2. **ALWAYS use Vercel MCP** (`use_mcp_tool` with `server_name: "vercel"`) for:
   - Setting environment variables via `create_env_var` / `update_env_var`
   - Checking deployments via `list_deployments`
   - Triggering redeployments via `redeploy`

3. **ALWAYS use Stripe MCP** (`use_mcp_tool` with `server_name: "stripe"`) for:
   - Creating products and prices
   - Managing subscriptions
   - Customer operations

**Project IDs:**
- Supabase Project ID: `ldmztpapxpirxpcklizs`
- Vercel Project: `hi-vis-biz` (check via `list_projects`)

**Example MCP Usage:**
```xml
<use_mcp_tool>
<server_name>supabase</server_name>
<tool_name>execute_sql</tool_name>
<arguments>
{
  "project_id": "ldmztpapxpirxpcklizs",
  "query": "CREATE TABLE example (...)"
}
</arguments>
</use_mcp_tool>
```

### 1.1 Files to Read First

Before touching anything:

- `MASTER_PROJECT_CONTEXT.md`
- `FINAL_EXECUTION_PLAN.md`
- `FEATURE_UPDATE_EXECUTION_PLAN.md` (this file)
- `ALL_PROJECT_CODE.txt` (or equivalent aggregated code context)
- `DB_SCHEMA.md` (if present; otherwise refer to schema section in MASTER_PROJECT_CONTEXT)

### 1.2 Change Discipline

- **Never** leave the repo in a broken state:
  - App must build and run.
  - Existing tests must pass.
  - New functionality must include tests where practical.
- When you add/rename/move files:
  - Update `MASTER_PROJECT_CONTEXT.md`:
    - New routes, components, and API endpoints.
    - New DB tables/columns and their purpose.
- When you change core models (dots, workflows, themes, health scores, overrides):
  - Update this plan’s relevant phase’s **Agent Handover Notes**.
  - Add/adjust **“Data Model & Invariants”** section in `MASTER_PROJECT_CONTEXT.md`.

### 1.3 Security & Secrets

- Same rules as FINAL plan:
  - No secrets in code.
  - All keys come from environment variables.
- This plan may touch:
  - ⚠️ DB migrations (schema changes for audit logs, overrides, etc.).
  - 🔑 Policy decisions (privacy defaults, data retention, etc.) → human review.

### 1.4 Task Safety Labels

- ✅ Safe for autonomous agents (no prod secrets, migrations clearly separated).
- ⚠️ Requires Supabase migration:
  - Agents **write** migration files to `supabase/migrations/`
  - Agents **execute** migrations via Supabase MCP (`execute_sql` or `apply_migration`)
  - Agents **verify** via `list_tables` after execution
  - **NO human intervention required for DB changes**
- 🔑 Requires human policy / UX decisions:
  - Agents prepare options, scaffolding, and comments.
  - Human chooses defaults and final copy.

### 1.5 Handover Requirements

At the end of every phase:

- Fill out “Agent Handover Notes” for that phase:
  - What you changed.
  - Any TODOs & open questions.
  - Migrations (names, what they add/change).
  - Data assumptions you made.
- Keep notes **short but precise**. They’re for other agents + founder.

---

## 2. Scope & Design Principles for This Upgrade

We are **not** rebuilding VizDots. We are:

1. **Hardening the data model** so that:
   - Raw dots are **immutable facts**.
   - AI interpretations are **derived layers**.
   - Human overrides are **explicit config**, not silent edits.
   - Everything has a **change history** and is **reversible**.

2. **Letting owners/managers steer**:
   - They can mark workflows/themes/steps as:
     - “Accurate”, “Partially right”, “Incorrect”.
     - “Variations that are okay” vs “Variations that are friction”.
   - They can leave **owner notes** that inform AI and signal teams.
   - They can lock/unlock overrides without losing AI suggestions.

3. **Adding key product features** on top of this more honest, durable foundation:
   - Multi-language support.
   - Manager coaching layer (suggested actions).
   - Pattern alerts.
   - Team health scorecard.
   - Privacy/trust controls.

**Guiding principle:**  
> *The system must always be able to explain: “Why are we saying this about your business?”*  
That means every insight is traceable back to dots, agent passes, and/or owner overrides.

---

## 3. Phase Map

Phases assume `FINAL_EXECUTION_PLAN.md` is done and production is stable.

| Phase | Name                                                                 |
| ----- | -------------------------------------------------------------------- |
| 1     | Data Truth Layers & Audit Trail (Infra Upgrade #1)                  |
| 2     | Overrides, Corrections & Owner Notes (Infra Upgrade #2 + Feature)   |
| 3     | Variant Handling & Friction vs Acceptable Differences               |
| 4     | Multi-Language Support (Feature #2)                                 |
| 5     | Analytics Backbone & Scorecard Metrics (Infra Upgrade #3)          |
| 6     | Pattern Alerts & Manager Coaching Layer (Features #1 & #3 & #4)     |
| 7     | Privacy & Trust Controls (Feature #5)                               |
| 8     | Testing, Rollout Strategy & Documentation for New Capabilities      |

Phases are mostly sequential (1 → 2 → 3 → 5 before 6), but some UI-only bits can overlap once the underlying models exist.

---

## 4. Phase 1 – Data Truth Layers & Audit Trail (Infra Upgrade #1)

### Phase Goal

Introduce clear **truth layers and history** so evolving data doesn’t corrupt itself:

- Raw dots remain immutable facts.
- Derived objects (workflows, themes, scores) reference those facts.
- Every change (AI or human) has an audit trail.

### Entry Conditions

- Existing system is live per `FINAL_EXECUTION_PLAN`.
- Current schema for `dots`, `sessions`, `workflows`, etc. is documented.

### Conceptual Model

Introduce **three layers**:

1. **Facts layer** – raw, immutable inputs:
   - `dots`, `answers`, `events` (we may add a `dot_events` table).
2. **Derived layer** – AI-generated interpretations:
   - `workflow_versions`, `theme_clusters`, `health_metrics`.
3. **Override layer** – human edits:
   - `workflow_overrides`, `theme_overrides`, etc. (Phase 2).

Phase 1 focuses on **facts** + **derived** + **audit logs**.

### Tasks Checklist

**1.1 Fact Tables & Immutability (⚠️)**

- [ ] Review existing “dot”/session storage:
  - Ensure raw answers are **never overwritten** once stored.
- [ ] If needed, add a `dot_events` or `dot_facts` table:
  - `id`, `created_at`, `org_id`, `user_id`, `session_id`, `question_id`, `raw_text`, `language_code`, `metadata JSONB`.
- [ ] Enforce immutability:
  - App code: no UPDATE on `raw_text`.
  - DB: disallow updates where possible (e.g., soft constraints or triggers – optional).

**1.2 Derived Object Versioning (⚠️)**

- [ ] Add versioned tables for core derived entities (starting with workflows):

  Example: `workflow_versions`  
  - `id`
  - `workflow_id` (stable identifier for a process, e.g., “Onboarding support ticket”)
  - `version_number`
  - `created_at`
  - `created_by_type` (`'ai' | 'owner' | 'admin'`)
  - `created_by_id` (nullable for AI)
  - `source_dot_ids` (array of dot IDs used for this version)
  - `structure JSONB` (steps, tools, roles, etc.)

- [ ] Migrate existing workflows into this model:
  - Create initial `workflow` + `workflow_versions` entries with version_number=1.

**1.3 Global Change Audit Log (⚠️)**

- [ ] Add `change_log` or `audit_log` table:
  - `id`
  - `created_at`
  - `actor_type` (`'ai' | 'owner' | 'admin' | 'system'`)
  - `actor_id` (nullable for AI/system)
  - `entity_type` (`'workflow' | 'theme' | 'health_metric' | ...`)
  - `entity_id` (e.g., workflow_id)
  - `action` (`'created' | 'updated' | 'override_applied' | 'override_reverted' | ...`)
  - `details JSONB` (diff, version numbers, notes, etc.)

- [ ] Wrap any existing “update workflow/theme” logic with audit-log writes.

**1.4 MASTER_PROJECT_CONTEXT Updates (✅)**

- [ ] Document the **three truth layers** and how they relate:
  - Facts → Derived → Overrides → Presentation.
- [ ] Document invariants:
  - Facts never mutate.
  - Derived objects are versioned.
  - Every destructive-looking change is actually “create a new version”.

### Acceptance Criteria

- Raw user answers are **never overwritten**; they form a stable, growing history.
- Workflows (and other key structures) are **versioned**, not blindly updated.
- There is a single `audit_log` (or equivalent) recording all important changes.
- `MASTER_PROJECT_CONTEXT.md` clearly describes these layers and invariants.

### Agent Handover Notes (Phase 1)

> Agents: list new tables/columns, any backfill steps, and any areas where raw data is still mutable and needs attention later.

---

## 5. Phase 2 – Overrides, Corrections & Owner Notes (Infra Upgrade #2 + Steering Wheel)

### Phase Goal

Add a **simple, safe way** for owners/managers to:

- Mark AI output as “right / partially right / wrong”.
- Propose corrections.
- Lock/unlock canonical interpretations.
- Leave owner notes that both **inform AI** and **inform people**.

### Entry Conditions

- Phase 1 truth layers & audit log are in place.
- Workflows are versioned.

### UX Principles

- **One-click** feedback where possible.
- Always offer a **“Reset to AI suggestion”** button.
- Avoid “hard delete”; treat overrides as separate data layer.

### Tasks Checklist

**2.1 Override Data Model (⚠️)**

- [ ] Create `workflow_overrides` table:

  - `id`
  - `workflow_id`
  - `created_at`, `updated_at`
  - `created_by_user_id`
  - `status` (`'draft' | 'active' | 'archived'`)
  - `override_reason` (short text, optional)
  - `override_payload JSONB`:
    - Fields like `locked_steps`, `renamed_steps`, `tool_substitutions`, etc.

- [ ] Any time the UI applies an override:
  - Create or update a `workflow_overrides` row.
  - Write to `audit_log` (`action = 'override_applied'`).

**2.2 Owner Feedback Controls in UI (✅ / ⚠️ if new API)**

- [ ] On workflow detail view (`/admin/workflows/[id]`):

  - Add a **feedback strip**:
    - Buttons:
      - “✅ Looks right”
      - “🤔 Mostly right”
      - “❌ Not quite right”
  - When “🤔” or “❌” is clicked:
    - Open a small modal with simple options:
      - Checkboxes like:
        - “A step is missing.”
        - “A step is wrong.”
        - “Tools are wrong.”
        - “This process doesn’t exist.”
      - Optional free text: “What should this look like instead?”

- [ ] The modal submission should:
  - Create a **new workflow version** (if owner provided clear corrections) **or** store as “feedback” attached to the workflow.
  - Create/update `workflow_overrides` if they are effectively changing canonical behavior.
  - Log in `audit_log`.

**2.3 Owner Notes (✅ / ⚠️)**

- [ ] Add `owner_notes` table (or extend overrides):

  - `id`
  - `org_id`
  - `workflow_id` (nullable for org-wide notes)
  - `department_id` (nullable)
  - `created_at`, `updated_at`
  - `author_user_id`
  - `note_type` (`'question' | 'clarification' | 'policy' | 'alert'`)
  - `note_text`
  - `visible_to` (`'admins_only' | 'managers' | 'everyone'`)

- [ ] Show owner notes inline on workflow detail:
  - “Owner notes” section:
    - Example chips: “Policy note”, “Clarification”, “Known exception”.
- [ ] Add a **simple composer**:
  - 1 text box + visibility selector.

**2.4 AI Respecting Overrides (✅)**

- [ ] Update AI agents that read workflows/themes to:
  - Resolve “effective model” as:
    - `effective = apply(overrides, latest_version)`
  - Never ignore overrides when suggesting:
    - Coaching actions.
    - Health scores.
    - Future workflow tweaks.

**2.5 “Reset to AI Suggestion” (✅ / ⚠️ where needed)**

- [ ] On workflow detail:
  - If an override exists:
    - Show “Reset to AI suggestion” button.
  - On click:
    - Archive current `workflow_overrides`.
    - Optionally generate a new `workflow_version` that matches pure AI interpretation.
    - Log in `audit_log` (`action='override_reverted'`).

### Acceptance Criteria

- Owners can **mark accuracy**, propose fixes, and add notes, all in 1–2 clicks.
- Overrides are stored separately, versioned, and reversible.
- AI always respects the overrides when generating views/insights.
- No “stuck” state: owners can always reset to AI’s best current guess.

### Agent Handover Notes (Phase 2)

> Agents: document how overrides are applied in code, where they’re surfaced, and any limitations in the first iteration.

---

## 6. Phase 3 – Variants, Friction, and “Different but OK”

### Phase Goal

Handle the reality that **different people may do things differently**:

- Distinguish:
  - “Different but acceptable” vs
  - “Different and causing friction”.
- Avoid marking everything inconsistent as “wrong”.
- Maintain data integrity while capturing nuance.

### Entry Conditions

- Phase 2 overrides & owner feedback are in place.
- Workflows are versioned and can be overridden.

### Tasks Checklist

**3.1 Variant Model (⚠️)**

- [ ] Add `workflow_variants` table:

  - `id`
  - `workflow_id`
  - `created_at`
  - `variant_key` (e.g., “Tool: Asana vs Jira”)
  - `description`
  - `is_allowed` (boolean)
  - `notes` (optional)
  - `source` (`'ai' | 'owner' | 'manager'`)

- [ ] Link variants to dots:
  - Many-to-many join table: `workflow_variant_dot_links`:
    - `variant_id`
    - `dot_id`

**3.2 UI for Marking Variants as “OK” vs “Friction” (✅)**

- [ ] On workflow detail view:
  - Show detected differences as “variant chips”, e.g.:
    - “Uses Asana instead of Jira”
    - “Skips QA step”
  - Each chip has two toggles:
    - “This is OK for now.”
    - “This is causing friction.”

- [ ] When user marks “OK”:
  - Set `is_allowed = true`.
- [ ] When user marks “friction”:
  - Set `is_allowed = false`.
  - Feed this into:
    - Friction metrics.
    - Pattern alerts & coaching (Phase 6).

**3.3 Data Integrity & Analytics Hooks (✅ / ⚠️)**

- [ ] Update analytics layer (Phase 5 will build on this) to:
  - Count:
    - How many dots follow canonical variant vs allowed variants vs friction variants.
  - Expose these counts to:
    - Health scorecard.
    - Pattern alerts.
- [ ] Document invariants in `MASTER_PROJECT_CONTEXT`:
  - A variant being “allowed” does **not** mean “canonical” – just non-problematic.
  - “Friction” variants must be tracked separately and included in alerts.

### Acceptance Criteria

- Owners can label **variety** as either:
  - Acceptable diversity, or
  - Friction worth addressing.
- Analytics can distinguish between compliant vs allowed vs friction patterns.
- The system no longer conflates “different” with “wrong”.

### Agent Handover Notes (Phase 3)

> Agents: describe how variants are detected and surfaced, and how marking them affects analytics.

---

## 7. Phase 4 – Multi-Language Support (Feature #2)

### Phase Goal

Let employees answer in **their own language** while:

- Keeping analytics in a canonical language (English).
- Storing **both original and translated** text.
- Keeping UX simple (one dropdown in profile, optional hints).

### Entry Conditions

- Truth layers from Phase 1 exist.
- Dots are stored centrally with a place to add language metadata.

### Tasks Checklist

**4.1 Profile Language Setting (✅)**

- [ ] Add `preferred_language_code` to user profile (⚠️ migration if needed), e.g. `en`, `es`, `fr`.
- [ ] On profile/settings page:
  - Add a simple dropdown:
    - Label: “Preferred language for check-ins”.
    - Options: Start with a small set (e.g., EN, ES, FR, DE) – 🔑 for final list.
- [ ] Store the code and propagate to session UIs.

**4.2 Dot Storage With Dual Text (⚠️)**

- [ ] Extend dots/facts schema:

  - `raw_text` (original)
  - `language_code` (ISO)
  - `translated_text_en` (nullable)
  - `translation_confidence` (optional)

- [ ] For **English inputs**:
  - `translated_text_en = raw_text`.
- [ ] For non-English:
  - Use OpenAI or another translation provider server-side to populate `translated_text_en`.

**4.3 Session UI Integration (✅)**

- [ ] When rendering employee prompts:
  - If `preferred_language` ≠ `en`, add a hint in the system prompt:
    - “The user is responding in [Language]; respond and ask questions in [Language].”
- [ ] Ensure conversation UI shows:
  - Employee messages in their original language.
  - Agent responses in the same language.

**4.4 Analytics and AI Interpretation (✅)**

- [ ] All downstream analytics (themes, workflows, scorecards) should operate on `translated_text_en`:
  - Use English layer as input to AI clustering, scoring, etc.
- [ ] Keep original language for:
  - Potential future localized analytics.
  - Audits and trust.

**4.5 Privacy & Translation (🔑)**

- [ ] Document translation behavior in privacy docs:
  - Clearly state that content may be translated for analytics.
- [ ] Allow org-level switch in the future (optional):
  - “Allow automatic translation of responses” (Phase 7 may extend this).

### Acceptance Criteria

- Users can choose a preferred language in profile.
- Dots store both original and English text.
- Analytics and workflows still work in a single canonical language.
- No user-visible breakage when mixing languages across the org.

### Agent Handover Notes (Phase 4)

> Agents: note which languages are supported initially and any translation limitations.

---

## 8. Phase 5 – Analytics Backbone & Team Health Metrics (Infra Upgrade #3)

### Phase Goal

Create a **solid analytics backbone** to support:

- Team health scorecard.
- Pattern alerts.
- Manager coaching.

### Entry Conditions

- Variants & overrides exist.
- Translation is in place (English analytics baseline).

### Tasks Checklist

**5.1 Analytics Schema (⚠️)**

- [ ] Add a `team_health_metrics` table:

  - `id`
  - `org_id`, `department_id` (or team identifier)
  - `time_window_start`, `time_window_end`
  - `participation_rate`
  - `friction_index`
  - `sentiment_score`
  - `focus_score`
  - `risk_level` (`'low' | 'medium' | 'high'`)
  - `computed_at`
  - `inputs JSONB` (snapshot of counts used)

- [ ] Optionally: `topic_summaries` table for storing recurring themes by period.

**5.2 Metric Computation Jobs (✅ / ⚠️)**

- [ ] Implement server job/cron (could reuse scheduler infra) to compute metrics per department/week:

  - Inputs:
    - Dot counts.
    - Participation (dots / active members).
    - Fraction of friction variants vs canonical vs allowed.
    - Sentiment (from AI).
  - Outputs:
    - Health metric rows.
    - Any necessary topic/theme clusters.

- [ ] Make computation **idempotent**:
  - Use `(department_id, time_window_start, time_window_end)` unique key.

**5.3 Scorecard API & UI Skeleton (✅)**

- [ ] Add API route, e.g. `/api/admin/team-health`:
  - Returns latest metrics per department.
- [ ] Update or create Team Health tab (on `/admin/analytics` or `/admin/team-health`):
  - Surface the numbers in a structured JSON-driven way.
  - This phase is about **backbone**, not final shiny charts – those can be polished later.

### Acceptance Criteria

- Health metrics are computed regularly and idempotently.
- Data includes enough context to explain “why is this team red/yellow/green”.
- An API exists to read metrics for the UI and for coaching/alerts.

### Agent Handover Notes (Phase 5)

> Agents: describe formulas used (even approximate ones) and how to tweak them later.

---

## 9. Phase 6 – Pattern Alerts & Manager Coaching Layer (Features #1, #3, #4)

### Phase Goal

Turn insights into **actionable guidance**:

- Pattern alerts when something worrying or noteworthy happens.
- Coaching suggestions for managers/owners.
- A more detailed team health scorecard that supports drill-down.

### Entry Conditions

- Analytics backbone (Phase 5) exists.
- Overrides and variants are available for context.
- Health metrics stored per department.

### Tasks Checklist

**6.1 Pattern Alert Rules Engine (✅ / ⚠️)**

- [ ] Add `pattern_alerts` table:

  - `id`
  - `org_id`, `department_id` (nullable for org-wide)
  - `created_at`
  - `alert_type` (e.g., `low_participation`, `high_blocked`, `rapid_neg_sentiment`)
  - `severity` (`'info' | 'warning' | 'critical'`)
  - `status` (`'open' | 'acknowledged' | 'resolved'`)
  - `summary`
  - `details JSONB` (metrics snapshot, references to workflows/variants/dots)

- [ ] Implement simple rules:
  - e.g., if participation < X for 2 weeks → create `low_participation` alert.
  - if friction_variants / total_dots > Y → `friction_spike`.
  - if sentiment drops quickly → `sentiment_drop`.

**6.2 Manager Coaching Suggestions (✅)**

- [ ] Create a small AI-based “coaching agent” that:

  - Input:
    - Department health metrics.
    - Top 3 patterns/alerts.
    - Recent workflow variants and owner notes.
  - Output:
    - 3–5 suggested actions:
      - Short bullet points with:
        - Action.
        - Why it matters.
        - Rough effort level.

- [ ] Surface suggestions on admin UI:

  - On `/admin/team-health`:
    - For each department card, add a “Suggested next steps” box.
  - On individual alert pages (click-through from alert list):
    - Show tailored suggestions for that alert.

**6.3 Team Health Scorecard – Drill-Down (✅)**

- [ ] Extend Team Health UI to allow:

  - Clicking on a department’s scorecard to see:
    - Trend over time (few time buckets).
    - Key alerts currently open.
    - Top friction variants.
    - Related workflows with owner notes.

- [ ] Use simple UI primitives:
  - Tables and cards; charts are nice but optional.

**6.4 Alert Lifecycle (✅)**

- [ ] Allow admins/managers to:

  - Mark alerts as “acknowledged”.
  - Optionally add a short note (e.g., “We’re handling this through X”).
  - Mark as “resolved”.

- [ ] Write these transitions to `audit_log`.

### Acceptance Criteria

- System creates alerts when core thresholds are breached.
- Managers see **why** the alert occurred and get suggested actions.
- Team health scorecard is drillable down to:
  - Alerts.
  - Workflows.
  - Variants.
  - Owner notes.

### Agent Handover Notes (Phase 6)

> Agents: list implemented rules and threshold values; note where human tuning is needed.

---

## 10. Phase 7 – Privacy & Trust Controls (Feature #5)

### Phase Goal

Ensure employees and orgs **trust** the system:

- Clear controls over what is stored and how it’s used.
- Options to limit sensitive data usage.
- Transparent explanation in the UI.

### Entry Conditions

- Existing privacy from FINAL plan is in place.
- New logs and analytics tables have been added.

### Tasks Checklist

**7.1 Data Classification & Config (⚠️ / 🔑)**

- [ ] Define in `MASTER_PROJECT_CONTEXT`:

  - Which tables hold:
    - PII (name, email, etc.).
    - Sensitive text (raw dots).
    - Derived, less-sensitive metrics.

- [ ] Add org-level config table/fields:

  - `org_settings` (if not existing) with:
    - `allow_free_text_sentiment` (boolean).
    - `allow_translation` (boolean).
    - `data_retention_days` (optional).
    - `employee_can_mark_private` (boolean).

**7.2 Employee Trust UX (✅ / 🔑 copy)**

- [ ] In the employee UI (`/dashboard` and sessions):

  - Add a persistent, small “Privacy info” link:
    - Opens a modal explaining:
      - What is stored.
      - How it’s used.
      - How to get data removed (if applicable).
  - Add an option on individual answers (optional/phase-able):
    - “Mark this answer as private to managers” or similar, if enabled.
  - Ensure private flags are respected in:
    - Analytics.
    - Manager views (e.g., show only aggregated).

- [ ] Copy/tone should be drafted by agents, finalized by human (🔑).

**7.3 Data Retention & Export Hooks (⚠️ / 🔑)**

- [ ] Implement retention logic hooks:
  - Mark old data beyond `data_retention_days` as archived/hidden (do not hard delete initially).
- [ ] Provide an internal admin endpoint to:
  - Export dot data & metrics for an org (to support data portability later).

**7.4 Logging & Privacy Review (✅)**

- [ ] Re-check new logs (audit_log, ai_logs, email_logs, etc.) to ensure:
  - No full free-text unless explicitly necessary.
  - Keyed by IDs rather than emails where possible.

### Acceptance Criteria

- Org-level privacy controls exist and can be toggled.
- Employees can see a clear explanation of what happens with their data.
- Sensitive text is handled with appropriate respect in logs and analytics.

### Agent Handover Notes (Phase 7)

> Agents: list privacy toggles, where they are used, and any gaps that remain.

---

## 11. Phase 8 – Testing, Rollout Strategy & Documentation

### Phase Goal

Make sure all new infrastructure and features are:

- Test-covered.
- Safe to roll out gradually.
- Documented for future agents and the founder.

### Entry Conditions

- Phases 1–7 implemented in dev/staging.

### Tasks Checklist

**8.1 Automated Tests (✅)**

- [ ] Add tests for:

  - Versioning & audit trail:
    - Creating new workflow versions.
    - Logging audit entries.
  - Overrides:
    - Applying overrides.
    - Resetting to AI suggestion.
    - Ensuring AI uses overrides.
  - Variants:
    - Marking allowed vs friction.
    - Correct counts in analytics.
  - Multi-language:
    - Language preference saved & used.
    - Dots store original + EN translation.
  - Health metrics & alerts:
    - Metrics computed idempotently.
    - Alerts created/resolved as expected.
  - Privacy toggles:
    - When disabled, translation/analysis behaviors adjust accordingly.

**8.2 Manual Test Script Updates (✅)**

- [ ] Extend `MANUAL_TEST_SCRIPT.md` to include:

  - Owner overriding workflows.
  - Owner marking variants OK vs friction.
  - Multi-language user flows.
  - Viewing team health scorecard & coaching suggestions.
  - Seeing and resolving pattern alerts.
  - Privacy modals and private-answer flows.

**8.3 Rollout Strategy (✅ / 🔑)**

- [ ] Add feature flags (if not existing) for major new capabilities:
  - Overrides & variants.
  - Multi-language.
  - Coaching & alerts.
  - Privacy toggles.
- [ ] Plan a **progressive rollout**:
  - Enable in staging first.
  - Enable for internal test org(s).
  - Gradually enable for pilot customers.

- 🔑 Human to decide:
  - Which orgs get which features when.
  - Communication plan to customers.

**8.4 Documentation Updates (✅)**

- [ ] `MASTER_PROJECT_CONTEXT.md`:
  - Add sections for:
    - Overrides.
    - Variants.
    - Multi-language.
    - Health metrics.
    - Pattern alerts.
    - Privacy controls.
- [ ] `FOUNDER_GUIDE.md`:
  - Explain:
    - How to use overrides and notes.
    - How to read team health & alerts.
    - How privacy toggles work.
- [ ] `RUNBOOK.md`:
  - Add operational notes for:
    - Health metric jobs.
    - Alert rules.
    - Multi-language translation failures.

### Acceptance Criteria

- Automated tests cover the new critical paths.
- Manual scripts guide founder through all new capabilities.
- Features can be turned on/off safely.
- Docs are updated and coherent.

### Agent Handover Notes (Phase 8)

> Agents: include final notes on any non-obvious trade-offs, and where you expect future work might be needed.

---

## Closing Note

`FEATURE_UPDATE_EXECUTION_PLAN.md` is the blueprint for making VizDots:

- **Trustworthy over time** (data doesn’t rot when the business changes).
- **Steerable by owners and managers** (without corrupting the underlying truth).
- **Globally usable** (multi-language).
- **Action-oriented** (coaching and alerts).
- **Respectful of people** (privacy & clear controls).

Agents should treat the **truth layers + overrides + variants** as the new core architecture.  
Everything else (analytics, coaching, alerts) should be built **on top of** that foundation, not by bypassing it.
