# PRODUCTION_READY_EXECUTION_PLAN.md

## 0. Purpose of This Document

This document describes how to take the existing VizDots application from a solid MVP to a **polished, production-ready product**.

It is designed to be used by **multiple, independent agents** working sequentially.  
Every agent should:

1. Read this file **fully** before making changes.
2. Read **MASTER_PROJECT_CONTEXT.md** to understand the current code and architecture.
3. Work on one or more **phases** below.
4. Update:
   - This file: mark completed checklist items, add notes.
   - `MASTER_PROJECT_CONTEXT.md`: update file list and behavior when code changes.
5. Leave clear **handover notes** at the end of the phase(s) they touch.

---

## 1. Ground Rules for All Agents

Before doing anything, follow these rules:

- ✅ **Always read first**:
  - `MASTER_PROJECT_CONTEXT.md`
  - `SPEC.md`
  - `EXECUTION_PLAN.md` (historical context)
  - This `PRODUCTION_READY_EXECUTION_PLAN.md`

- ✅ **Do not break what works**
  - If tests exist, keep them passing.
  - If new tests are added, ensure they run and pass.

- ✅ **Keep docs in sync**
  - When you add/rename/move files, update `MASTER_PROJECT_CONTEXT.md` accordingly.
  - If you significantly change flows or features, update this file’s relevant phase notes and checklists.

- ✅ **Security & secrets**
  - Never commit API keys or secrets to the repo.
  - Use environment variables for OpenAI, Supabase, and any other external services.

- ✅ **Clarity over cleverness**
  - Prefer straightforward, well-commented code.
  - Add short comments where logic is non-obvious.

- ✅ **Handover**
  - At the end of your work, fill in the **“Agent Handover Notes”** section under the phases you touched.
  - Include: what you did, any TODOs, known issues, and where the next agent should focus.

---

## 2. High-Level Product Overview

**Product Name:** VizDots  
**Concept:** Turn small daily check-ins into “dots” that reveal how work really gets done inside small businesses.

Key ideas:

- Short, lightweight check-ins from employees (“dots”).
- AI agents turn dots into:
  - Workflows / process maps
  - Friction points and pain themes
  - Role clarity and documentation
  - Early warning signals (bottlenecks, drops in participation)
- Target users:
  - SMB owners and managers (service, field operations, logistics, trades, retail, hospitality, distributed teams).
  - Their frontline employees.

The current system is a working MVP, but **not** yet fully polished or production-ready.

---

## 3. Phase Map

Each phase can be handled by one or more agents.  
Phases should generally be done in order, but some can be parallelized carefully.

| Phase | Name                                           |
|-------|------------------------------------------------|
| 1     | Baseline & Rebrand to VizDots                  |
| 2     | UX & User Flow Overhaul                        |
| 3     | AI Testability & Reliability                   |
| 4     | Responsive Design & Mobile-Friendliness        |
| 5     | Analytics & Insight Features (Dots & Workflows)|
| 6     | Production Essentials (Tests, Errors, Security)|
| 7     | Website / Marketing Page Polish                |
| 8     | Final Documentation & Founder Guide            |

---

## 4. Phase 1 – Baseline & Rebrand to VizDots

### Phase Goal

- Establish a clean baseline.
- Ensure **all user-facing text and prompts** use the VizDots branding and language (dots, check-ins, clarity, etc.).
- Document initial UX/branding issues for later phases.

### Entry Conditions

- Codebase builds and runs.
- `MASTER_PROJECT_CONTEXT.md` exists and roughly reflects the project.

### Tasks Checklist

**Baseline**

- [x] Create a baseline branch (e.g. `vizdots-prepolish-baseline`) from the current main branch.
- [ ] Verify app can run locally with existing instructions (update instructions if needed).

**Rebranding**

- [ ] Search for all old product/brand names in the codebase (pages, components, prompts, tests, emails).
- [ ] Replace user-facing occurrences with **VizDots** and updated language.
- [ ] Ensure app title, navigation, and any logos/alt text say “VizDots”.

**Copy Alignment**

- [ ] Update key user-facing phrases to match the tone and ideas in **Appendix A (Website Messaging)**:
  - “See Your Business Clearly — One Dot at a Time.”
  - “Small Inputs. Big Visibility. Real Improvement.”
  - Emphasis on dots, daily check-ins, clarity, no configuration.
- [ ] Update email templates (invites, onboarding, etc.) to reference VizDots and dots.
- [ ] Update AI agent prompts to refer to:
  - VizDots
  - “dots” as individual check-ins
  - workflows, friction points, role clarity, early warning signals.

**Documentation**

- [ ] Add/Update a section in `MASTER_PROJECT_CONTEXT.md` summarizing:
  - That the project has been rebranded to VizDots.
  - Any major text or prompt changes applied.

### Acceptance Criteria

- All user-facing UI and emails use “VizDots” and no old names remain.
- AI prompts are aligned with VizDots branding and concept (dots, check-ins, clarity).
- Baseline branch exists and can be used to compare changes.
- `MASTER_PROJECT_CONTEXT.md` mentions the VizDots rebrand and outlines the current product name and concept.

### Agent Handover Notes (Phase 1)

> Agents: write here what you changed, any remaining branding issues, and any text you weren’t sure about.

---

## 5. Phase 2 – UX & User Flow Overhaul

### Phase Goal

Make VizDots intuitive and pleasant to use for:

- **Admins/owners** setting up the organization.
- **Employees** completing daily/weekly check-ins.

We aim for:

- A guided admin onboarding wizard (max 4 steps).
- A clear admin dashboard.
- A simple, obvious employee flow (“Welcome” → onboarding → check-in → “My Dots”).

### Entry Conditions

- Phase 1 rebrand completed (no old name in UI).
- Existing flows roughly working (even if clumsy).

### Target Admin Flow

1. Visit marketing site → click **“Start Free → 30 Days On Us”**.
2. Create account / log in.
3. **Onboarding Wizard** (4 steps):
   1. Company basics.
   2. Departments & roles.
   3. People import.
   4. Check-in settings & preview.
4. See **Admin Dashboard** with today’s dots and insights.

### Target Employee Flow

1. Receive invite email → click link.
2. Simple welcome screen explaining VizDots in 2–3 short lines.
3. Confirm personal info (name, role, department) – prefilled when possible.
4. Complete a short check-in (3–5 questions).
5. See a “Thanks, your dot was added” screen.
6. Future visits:
   - If check-in due → show today’s check-in.
   - Otherwise → show “My Dots” overview.

### Tasks Checklist

**Admin Onboarding Wizard**

- [ ] Implement or refine a 4-step wizard:
  1. **Company Basics**  
     - Fields: company name, industry (dropdown), approximate team size.
  2. **Departments & Roles**  
     - UI for adding departments and common roles.
     - Allow skipping with warning (can add later).
  3. **People Import**  
     - CSV upload with clear sample template.
     - Manual add option.
     - Clear validation errors.
  4. **Check-In Settings & Preview**  
     - Choose frequency (daily/weekly) and time window.
     - Button: “Preview Check-In” showing a sample employee experience.
- [ ] Ensure admin is **forced through wizard** on first login until completed.
- [ ] Save wizard progress so admins can resume.

**Admin Dashboard Structure**

- [ ] Create/Refine an **Admin Dashboard** with at least these sections:
  - **Today** (default):
    - Dots today (completed vs expected).
    - Participation rate.
    - Top 3 current themes/issues (from existing AI data if available).
  - **People**:
    - List of employees.
    - Invitation status (Active / Invited / No dots yet).
    - Ability to resend invites.
  - **Workflows**:
    - List of workflows detected (even if basic at this stage).
  - **Settings**:
    - Organization info.
    - Check-in schedule.
    - Trial status and basic subscription info (even if billing is partial).

**Employee Flow Improvements**

- [ ] Implement a simple **Welcome Screen** for first-time employees:
  - Short text explaining:
    - 1-minute check-ins.
    - Goal: help the business see how work really happens.
- [ ] Ensure there is a **single clear entry path** for employees:
  - On app visit:
    - If not onboarded → show welcome + onboarding.
    - If onboarded and check-in due → show today’s check-in.
    - If no check-in due → show “My Dots”.
- [ ] Implement a **“My Dots”** page:
  - Show list of recent check-ins with dates and short labels.
  - Optionally show a simple summary of top themes for that employee.

**Documentation**

- [ ] Update `MASTER_PROJECT_CONTEXT.md`:
  - Add/update entries for all new/modified pages/components.
  - Describe the new admin and employee flow.

### Acceptance Criteria

- New admin can sign up and be guided through the wizard without confusion.
- Employees can:
  - Accept invite, onboard, and complete a check-in easily.
  - Return later and see either today’s check-in or “My Dots”.
- No “dead-end” screens in normal usage (no unexplained 404s, errors, or confusing redirects).

### Agent Handover Notes (Phase 2)

> Agents: document UX decisions, known rough edges, and any TODOs for future polish.

---

## 6. Phase 3 – AI Testability & Reliability

### Phase Goal

Make it easy to:

- Confirm that AI agents are working.
- Debug AI-related issues.
- Ensure AI failures don’t break the whole app.

### Entry Conditions

- AI agents already exist and are called in the app (as per current system).

### Tasks Checklist

**AI Test Lab (Admin Only)**

- [ ] Add an admin-only page, e.g. `/admin/ai-test-lab`.
- [ ] On this page, allow admin to:
  - Select which AI agent to test (e.g. pulse, role mapper, workflow mapper, pain scanner, focus tracker).
  - Input a sample transcript or scenario text.
  - Run the agent and display:
    - Raw JSON response.
    - Parsed/human-readable summary (if feasible).
    - Any error messages.

**Error Handling**

- [ ] Wrap all OpenAI calls in robust error handling:
  - `try/catch` around each call.
  - On failure:
    - Log an error (see logging guidelines in Phase 6).
    - Return a safe, user-friendly message.
- [ ] Ensure user-facing UI never shows stack traces or raw internal errors.

**Minimal AI Logging**

- [ ] Implement a simple logging mechanism (database table or structured logs) capturing:
  - Timestamp.
  - Agent name.
  - Org ID / user ID (if available).
  - Success/failure flag.
  - Error type (if any).
- [ ] Do **not** log full user text if privacy is a concern; consider truncated snippets or hashes.

**Documentation**

- [ ] Document the AI Test Lab in `MASTER_PROJECT_CONTEXT.md`:
  - Where it lives.
  - How it works.
  - Limitations.

### Acceptance Criteria

- Admin can go to AI Test Lab, pick an agent, input text, and see a result or a clear error message.
- AI failures are safely handled (no unhandled exceptions breaking pages).
- There is a defined place to inspect AI failures for debugging.

### Agent Handover Notes (Phase 3)

> Agents: note which agents are wired into the test lab, any known limitations or bugs, and suggestions for improvement.

---

## 7. Phase 4 – Responsive Design & Mobile-Friendliness

### Phase Goal

Ensure the **app and marketing site are mobile-friendly**, with a smooth experience on phones and tablets.

### Entry Conditions

- Main admin and employee flows are implemented (even if not yet polished visually).

### Tasks Checklist

**Layout & Navigation**

- [ ] For the **app shell** (global layout), ensure:
  - On mobile (e.g. ≤ 640px width), content is single-column.
  - Sidebars/nav collapse into a top or bottom navigation pattern.
- [ ] Ensure no key content is off-screen or requires horizontal scrolling.

**Key Screens to Validate**

- [ ] Admin onboarding wizard.
- [ ] Admin dashboard (Today, People, Workflows, Settings).
- [ ] Employee welcome/onboarding screen.
- [ ] Employee check-in page.
- [ ] “My Dots” page.
- [ ] Public/marketing landing page.

**Touch & Typography**

- [ ] Make sure buttons and interactive elements are at least ~44px tall with sufficient padding.
- [ ] Text is legible on small screens (no tiny fonts).

**Manual Testing**

- [ ] Test at minimum three breakpoints:
  - ~375px width (small phone).
  - ~768px width (tablet).
  - ≥1024px width (desktop).

**Documentation**

- [ ] Mention responsive design decisions in `MASTER_PROJECT_CONTEXT.md`:
  - Any key layout components.
  - How navigation changes across breakpoints.

### Acceptance Criteria

- App and marketing site do not require horizontal scroll on mobile.
- All core flows can be completed on a small phone with touch input.
- CTAs (e.g. Start Free, check-in buttons) are easily tappable.

### Agent Handover Notes (Phase 4)

> Agents: describe any remaining responsive issues, particularly tricky layouts, or devices/widths that need more work.

---

## 8. Phase 5 – Analytics & Insight Features (Dots & Workflows)

### Phase Goal

Deliver simple but meaningful analytics that match the VizDots promise:

- Operational clarity.
- Live workflow maps.
- Early warning signals.
- Role visibility.

We do not need complex dashboards; **simple, honest summaries** are enough.

### Tasks Checklist

**Dashboard: Dots Overview**

- [ ] On the admin **Today** tab, implement:
  - “Dots This Week”:
    - Number of check-ins completed this week.
    - Comparison to last week (up/down indicator).
  - Participation by department:
    - Simple bar chart or table.
  - Top 3 themes/issues:
    - Derived from existing AI outputs (e.g. pain scanner).

**Workflows View**

- [ ] Implement a **Workflows** page using existing workflow mapper outputs:
  - Show a list of workflows per role or department.
  - For each workflow:
    - Workflow name or label.
    - Key steps (4–10 steps is fine).
    - Roles/departments involved.
  - Label as “Workflow Map (Beta)” if needed to set expectations.

**Early Warning Signals**

- [ ] Implement a simple early warning system:
  - Each week, compute or infer:
    - Workflows with rising mentions of “delay”, “blocked”, “waiting”, etc.
    - Departments with significant drops in participation.
- [ ] Display these on the dashboard in an “Early Warnings” card:
  - e.g. “Dispatch: more mentions of waiting for parts this week.”
  - e.g. “Field Techs: participation down from 90% to 60%.”

**Implementation Notes**

- [ ] Prefer simple aggregation and rules over complex ML.
- [ ] Use existing AI outputs wherever possible to avoid extra cost and complexity.
- [ ] Ensure heavy computations run in server-side code or scheduled jobs, not client-side.

**Documentation**

- [ ] Document:
  - How “Dots This Week” is calculated.
  - How workflows are stored and displayed.
  - How early warning signals are generated.

### Acceptance Criteria

- Admin dashboard shows basic dot counts, participation, and top themes.
- A Workflows page is available and understandable.
- An Early Warnings card exists and updates as new dots arrive.

### Agent Handover Notes (Phase 5)

> Agents: describe how you implemented analytics, any shortcuts taken, and potential future improvements.

---

## 9. Phase 6 – Production Essentials (Tests, Errors, Security)

### Phase Goal

Add a minimal but meaningful layer of production readiness:

- Basic tests.
- Error tracking.
- Better handling of secrets.
- Simple rate limiting.

### Tasks Checklist

**Automated Tests**

- [ ] Add or extend test setup (e.g. Jest, Playwright, or framework of choice).
- [ ] At minimum, cover:
  - Backend/API:
    - Protected endpoint returns unauthenticated error when no user.
    - Check-in creation works with valid input.
  - End-to-end (or integration):
    - Admin can complete onboarding wizard.
    - Employee can complete a check-in.
- [ ] Ensure tests are runnable via a single command (e.g. `npm test`).

**Error Tracking**

- [ ] Add an error boundary or global error handler for front-end.
- [ ] Integrate with an error tracking mechanism if available (e.g. Sentry):
  - Capture unhandled exceptions.
  - Avoid sending PII when possible.

**Secrets & Env Config**

- [ ] Confirm:
  - OpenAI API keys are used only in server-side code.
  - Supabase service role keys are never exposed client-side.
  - All secrets are accessed via environment variables.
- [ ] Add or update a `.env.example` (without real secrets) to show required env variables.

**Rate Limiting**

- [ ] Implement basic rate limiting on:
  - AI-related endpoints.
  - Authentication endpoints (login, password reset).
- [ ] Ensure rate limiting uses IP + user-based logic where appropriate.

**Documentation**

- [ ] In `MASTER_PROJECT_CONTEXT.md`, document:
  - How to run tests.
  - Where errors will be logged/tracked.
  - Any rate-limiting notes.

### Acceptance Criteria

- There is at least a small suite of automated tests that pass.
- Errors do not crash the app silently; they are surfaced and captured somewhere.
- No obvious secrets are committed in the repo.
- Critical endpoints cannot be easily spammed.

### Agent Handover Notes (Phase 6)

> Agents: list what tests are in place, any failing or flaky tests, and any remaining security concerns.

---

## 10. Phase 7 – Website / Marketing Page Polish

### Phase Goal

Ensure the public-facing VizDots website:

- Reflects the provided messaging.
- Feels cohesive and professional.
- Is fully mobile-friendly.
- Seamlessly routes new users into the signup/onboarding flow.

### Tasks Checklist

**Landing Page Structure**

Build or refine the landing page with these sections (content in Appendix A):

1. **Hero**
   - Headline: “See Your Business Clearly — One Dot at a Time.”
   - Subheadline: VizDots explanation.
   - Primary CTA: “Start Free → 30 Days On Us”
   - Optionally: a secondary CTA (“Watch how it works”) that can be a placeholder.

2. **What VizDots Does**
   - Explain dots, small inputs, big visibility, no setup or dashboards.

3. **Why This Matters**
   - Undocumented processes, roles in people’s heads, unseen friction.

4. **Who VizDots Is For**
   - List of business types (service/field ops, logistics, trades, etc.).

5. **How VizDots Works**
   - 5-step explanation of the flow from org creation to continuous clarity.

6. **What You Get From VizDots**
   - Operational clarity, live workflow maps, documentation, early warning, role visibility.

7. **Why VizDots Wins**
   - Small-business focus, zero training, no setup/config/dashboards.

**CTA Flow**

- [ ] Ensure **“Start Free → 30 Days On Us”** leads directly to the signup flow that begins the admin onboarding wizard.

**Responsive Design (Marketing)**

- [ ] Verify the marketing page is responsive:
  - Stack sections vertically on mobile.
  - Use columns or side-by-side layouts on desktop.
- [ ] Ensure copy is readable and images (if any) scale gracefully.

**Documentation**

- [ ] Add a note in `MASTER_PROJECT_CONTEXT.md` describing:
  - The marketing/landing page code location.
  - How it connects to the app signup.

### Acceptance Criteria

- Marketing site content matches the tone and structure in Appendix A.
- Landing page is mobile-friendly.
- Primary CTA starts the actual VizDots onboarding flow.

### Agent Handover Notes (Phase 7)

> Agents: note any deviations from the provided copy, and any design decisions that might matter later.

---

## 11. Phase 8 – Final Documentation & Founder Guide

### Phase Goal

Make the system understandable and usable by a non-technical founder and by future developers/agents.

### Tasks Checklist

**MASTER_PROJECT_CONTEXT.md Updates**

- [ ] Ensure all major components, pages, API routes, and utilities added/modified in previous phases are:
  - Listed.
  - Described clearly (purpose, key behavior).
- [ ] Ensure any major architectural decisions (e.g., AI Test Lab, early warning generator, new tables) are documented.

**Create FOUNDER_GUIDE.md (or similar)**

- [ ] Add a new markdown file summarizing, in non-technical language:
  - How to:
    - Log in as an admin.
    - Complete the onboarding wizard.
    - Invite employees (CSV + manual).
    - Confirm employees are active.
    - Review dots, workflows, early warnings.
    - Use the AI Test Lab to check the system.
  - What metrics to watch on the dashboard.
  - How the trial/free period works at a high level.

**Optional: Simple Test Script**

- [ ] Create a short “Manual Test Script” section that the founder can follow:
  - Step-by-step tasks to confirm the system is working end-to-end.

### Acceptance Criteria

- `MASTER_PROJECT_CONTEXT.md` is up-to-date and reflects the actual code.
- `FOUNDER_GUIDE.md` (or equivalent) exists and can be followed by a non-developer.
- A simple manual test script exists or is embedded in the guide.

### Agent Handover Notes (Phase 8)

> Agents: confirm which sections of the docs you updated and anything that still feels unclear for a non-technical user.

---

## Appendix A – VizDots Website Messaging Reference

This section captures the product messaging that should guide copy across the app and website.

### Hero

**See Your Business Clearly — One Dot at a Time.**  
VizDots turns small daily check-ins into a living map of how your business actually runs.  
Simple. Human. Insightful.

Uncover hidden steps. Spot friction points. Strengthen your team.  
Get clarity without complexity.

**Start Free → 30 Days On Us**

---

### What VizDots Does

**Small Inputs. Big Visibility. Real Improvement.**

Your people know the truth about how work gets done.  
VizDots makes it easy for them to share it — naturally, in tiny moments.

Each check-in is a dot:  
a small clue about workflows, roadblocks, responsibilities, and experience.

VizDots connects those dots into a clear, living picture of your operations.

No setup.  
No dashboards to build.  
No training required.

Just clarity delivered automatically.

---

### Why This Matters

Because most small businesses run on undocumented knowledge.

- Processes live in people’s heads.
- Roles evolve without being captured.
- Owners see the outcomes — not the steps it took to get there.
- Employees work around problems that never get surfaced.

VizDots reveals the real story, one dot at a time.

---

### Who VizDots Is For

Built for the businesses where clarity matters most:

- Service & field operations  
- Logistics & dispatch  
- Trades & labor  
- Retail & distributed teams  
- Hospitality & support  
- Growing SMBs with evolving roles  

If your business depends on people doing real work every day…  
VizDots helps you see it.

---

### How VizDots Works

1. **Create Your Organization**  
   Enter your company name and invite your team with a simple CSV upload.

2. **Your Team Gets Quick, Daily Check-Ins**  
   Short. Lightweight. Personalized to each role.

3. **Each Response Becomes a Dot**  
   Every dot reflects a small truth about how work happens.

4. **VizDots Connects the Dots**  
   Workflows revealed.  
   Friction surfaced.  
   Documentation auto-generated.  
   Insights delivered.

5. **You Get Continuous Clarity**  
   No configuration.  
   No complexity.  
   Just a clear, evolving view of your business.

---

### What You Get From VizDots

- **Operational Clarity**  
  See how work actually gets done — not how you assume it works.

- **Live Workflow Maps**  
  Dots build patterns; patterns become insight.

- **Documentation Without the Pain**  
  Process documentation created from real check-ins.

- **Early Warning Signals**  
  Catch bottlenecks before they turn into problems.

- **Performance & Role Visibility**  
  See responsibilities, steps, and blockers per role.

- **Small Wins, Big Results**  
  Tiny daily signals that compound into a smarter business.

---

### Why VizDots Wins

**Made for Small Businesses, Not Corporations**

Simple setup.  
Natural adoption.  
Value from day one.

**Zero Training Required**

Your team interacts with VizDots like a person, not a platform.

**No Setup. No Configuration. No Overhead.**

Enter your people, and VizDots does the rest.
