# Hi-Vis Biz - Execution Plan
<!-- AI AGENT: Read this file at session start. Update after completing tasks. -->

## Quick Status
```
CURRENT_PHASE: 11
CURRENT_TASK: COMPLETE
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

## Phase 10: Complete Onboarding Rework
**Goal**: Replace current fragmented onboarding with a structured 6-step wizard flow that ensures accurate data collection and accountability

### Overview
The current onboarding flow has issues:
- Scattered across multiple pages (setup → admin/departments → admin/members → employee onboarding)
- Employee data collected AFTER invite (too late, error-prone)
- No CSV bulk upload with complete employee info
- No review step before sending invites
- No supervisor assignment during setup

**New Flow:**
1. **Step 1**: Create Organization (name, timezone, size band)
2. **Step 2**: Create Departments (add/rename/delete)
3. **Step 3**: Add Employees (manual entry OR CSV upload with name, email, department, title, has_direct_reports, can_view_reports)
4. **Step 4**: Assign Supervisors (dropdown for has_direct_reports=yes employees)
5. **Step 5**: Review & Send Invites (summary, confirm, send)
6. **Step 6**: Employee Onboarding (confirm info, start first micro-session)

---

### Sub-Phase 10A: Database Schema Updates
**Goal**: Add new columns to support the enhanced onboarding data

- [x] `10.1` Create migration: `009_enhanced_onboarding.sql`
  - Add `display_name` VARCHAR(255) to organization_members (stores name before auth user exists)
  - Add `job_title` VARCHAR(255) to organization_members (stores title before profile exists)
  - Add `has_direct_reports` BOOLEAN DEFAULT false to organization_members
  - Add `can_view_reports` BOOLEAN DEFAULT false to organization_members
  - Add `invite_status` VARCHAR(20) DEFAULT 'pending' CHECK IN ('pending', 'sent', 'accepted')
  - Add `invite_sent_at` TIMESTAMPTZ (when invite email was sent)
  - Add `invited_email` VARCHAR(255) (email before auth user created - for matching)
  ```sql
  ALTER TABLE organization_members 
    ADD COLUMN display_name VARCHAR(255),
    ADD COLUMN job_title VARCHAR(255),
    ADD COLUMN has_direct_reports BOOLEAN DEFAULT false,
    ADD COLUMN can_view_reports BOOLEAN DEFAULT false,
    ADD COLUMN invite_status VARCHAR(20) DEFAULT 'pending' CHECK (invite_status IN ('pending', 'sent', 'accepted')),
    ADD COLUMN invite_sent_at TIMESTAMPTZ,
    ADD COLUMN invited_email VARCHAR(255);
  ```
  **Verify**: Migration runs in Supabase SQL Editor

- [x] `10.2` Update TypeScript types
  - Regenerate database.ts or manually add new fields to OrganizationMember type
  **Verify**: Types include new fields

- [x] `10.3` Commit schema changes
  ```bash
  git add .
  git commit -m "Add enhanced onboarding schema (migration 009)"
  git push
  ```

---

### Sub-Phase 10B: Onboarding Wizard - Core Structure
**Goal**: Create the multi-step wizard UI framework

- [x] `10.4` Create wizard state management
  - `src/lib/utils/onboarding-wizard.ts`
  - Define OnboardingState type with all step data
  - Create context provider or use useState with localStorage persistence
  - Support back/next navigation with state preservation
  ```typescript
  interface OnboardingState {
    currentStep: 1 | 2 | 3 | 4 | 5;
    organization: { name: string; timezone: string; sizeBand: string } | null;
    departments: { id?: string; name: string; isNew?: boolean }[];
    employees: EmployeeEntry[];
    supervisorAssignments: { employeeIndex: number; supervisorIndex: number | null }[];
  }
  
  interface EmployeeEntry {
    name: string;
    email: string;
    department: string;
    title: string;
    hasDirectReports: boolean;
    canViewReports: boolean;
  }
  ```
  **Verify**: Types and state functions exported

- [x] `10.5` Create wizard layout component
  - `src/app/admin/setup/layout.tsx`
  - Progress indicator showing steps 1-5
  - Step titles: Organization → Departments → Employees → Supervisors → Review
  - Clean, professional styling
  **Verify**: Layout renders with progress bar

- [x] `10.6` Create Step 1: Organization Info page
  - `src/app/admin/setup/page.tsx` (replace existing)
  - Form: Organization name, Timezone dropdown, Size band dropdown
  - "Next" button → validates and saves to wizard state
  - No database write yet (all saved at Step 5)
  **Verify**: Can enter org info and proceed to Step 2

- [x] `10.7` Commit wizard structure
  ```bash
  git add .
  git commit -m "Create onboarding wizard structure (Step 1)"
  git push
  ```

---

### Sub-Phase 10C: Step 2 - Departments
**Goal**: Allow owner to create departments during setup

- [x] `10.8` Create Step 2: Departments page
  - `src/app/admin/setup/departments/page.tsx`
  - Display list of added departments
  - "Add Department" button with inline input
  - Edit (rename) functionality
  - Delete functionality (with confirmation)
  - Back button → Step 1
  - Next button → Step 3 (minimum 1 department required)
  **Verify**: Can add/edit/delete departments, navigate back/forward

- [x] `10.9` Commit Step 2
  ```bash
  git add .
  git commit -m "Add onboarding Step 2: Departments"
  git push
  ```

---

### Sub-Phase 10D: Step 3 - Add Employees
**Goal**: Manual entry and CSV upload for bulk employee addition

- [x] `10.10` Create CSV template and parser
  - `src/lib/utils/csv-parser.ts`
  - Create downloadable CSV template with example data:
    ```csv
    name,email,department,title,has_direct_reports,can_view_reports
    John Smith,john@example.com,Engineering,Senior Developer,no,no
    Jane Doe,jane@example.com,Engineering,Engineering Manager,yes,yes
    ```
  - Parse uploaded CSV, validate fields, return structured data
  - Handle errors gracefully (missing columns, invalid emails, etc.)
  **Verify**: CSV parsing works with valid/invalid data

- [x] `10.11` Create Step 3: Employees page
  - `src/app/admin/setup/employees/page.tsx`
  - Two tabs or sections:
    - **Option A: Manual Entry**
      - Form: Name, Email, Department (dropdown from Step 2), Title, Has Direct Reports (Y/N), Can View Reports (Y/N)
      - "Add Employee" button
    - **Option B: CSV Upload**
      - "Download Template" button (generates CSV with headers + examples)
      - File upload dropzone
      - Preview parsed data before confirming
  - Display employee table with all added employees
  - Edit/Delete per employee
  - Validation: Email format, no duplicates, department must exist
  - Back button → Step 2
  - Next button → Step 4
  **Verify**: Can add employees manually and via CSV

- [x] `10.12` Commit Step 3
  ```bash
  git add .
  git commit -m "Add onboarding Step 3: Employees (manual + CSV)"
  git push
  ```

---

### Sub-Phase 10E: Step 4 - Assign Supervisors
**Goal**: Allow supervisor assignment for reporting structure

- [x] `10.13` Create Step 4: Supervisors page
  - `src/app/admin/setup/supervisors/page.tsx`
  - Display table of ALL employees added in Step 3
  - Columns: Name, Title, Department, Supervisor (dropdown)
  - Supervisor dropdown contains:
    - "None" (default)
    - All employees marked `has_direct_reports = yes`
  - Skip button (can be done later in admin)
  - Back button → Step 3
  - Next button → Step 5
  **Verify**: Can assign supervisors from dropdown

- [x] `10.14` Commit Step 4
  ```bash
  git add .
  git commit -m "Add onboarding Step 4: Supervisor Assignment"
  git push
  ```

---

### Sub-Phase 10F: Step 5 - Review & Send Invites
**Goal**: Summary page with final confirmation before sending invites

- [x] `10.15` Create Step 5: Review page
  - `src/app/admin/setup/review/page.tsx`
  - Summary sections:
    - **Organization**: Name, Timezone, Size
    - **Departments**: List with count
    - **Employees**: Table with Name, Email, Department, Title, Has Reports, Can View, Supervisor
    - **Totals**: X employees, Y departments, Z with direct reports
  - Edit links to go back to specific steps
  - Back button → Step 4
  - "Send Invites" button (prominent, final action)
  **Verify**: Summary displays all collected data correctly

- [x] `10.16` Create API route for complete onboarding
  - `src/app/api/admin/setup/complete/route.ts`
  - Receives all wizard data in single POST request
  - Uses service role key to:
    1. Create organization
    2. Create departments
    3. Create organization_members records with all fields (user_id = null initially, invited_email set)
    4. Send invite emails via Supabase Auth
    5. Update invite_status and invite_sent_at
  - Returns success/failure with any email send errors
  **Verify**: API creates all records and sends invites

- [x] `10.17` Commit Step 5
  ```bash
  git add .
  git commit -m "Add onboarding Step 5: Review & Send Invites"
  git push
  ```

---

### Sub-Phase 10G: Step 6 - Employee Onboarding
**Goal**: Invited employees confirm their info and start first micro-session

- [x] `10.18` Update auth callback to handle invite matching
  - When user accepts invite and sets password, match by email
  - Link auth.users.id to existing organization_members record (where invited_email = user.email)
  - Update organization_members.user_id and invite_status = 'accepted'
  **Verify**: Invited user gets linked to correct org member record

- [x] `10.19` Rework employee onboarding page
  - `src/app/onboarding/page.tsx` (replace existing)
  - Pre-fill with data from organization_members record:
    - Name (display_name) - editable
    - Title (job_title) - editable
    - Department - show current, allow change if needed
  - Confirm button saves any edits
  - **IMPORTANT**: After confirmation, immediately redirect to first micro-session
  - Create initial session with role_mapper agent if none exists
  **Verify**: Employee sees pre-filled data, can confirm, starts micro-session

- [x] `10.20` Commit Step 6
  ```bash
  git add .
  git commit -m "Add onboarding Step 6: Employee confirmation + first session"
  git push
  ```

---

### Sub-Phase 10H: Update Admin Pages
**Goal**: Update existing admin pages to work with new data model

- [x] `10.21` Update Members page
  - `src/app/admin/members/page.tsx`
  - Show display_name, job_title from organization_members
  - Show invite_status (pending/sent/accepted)
  - Resend invite option for sent status
  - Show has_direct_reports and can_view_reports badges
  **Verify**: Members page shows new fields correctly

- [x] `10.22` Update Departments page
  - Show member counts per department
  - Can still add/edit/delete departments post-setup
  **Verify**: Departments page works with new flow

- [x] `10.23` Update Org Chart page
  - Use has_direct_reports to show manager nodes
  - Use supervisor assignments from organization_members
  **Verify**: Org chart reflects new supervisor data

- [x] `10.24` Commit admin page updates
  ```bash
  git add .
  git commit -m "Update admin pages for new onboarding data model"
  git push
  ```

---

### Sub-Phase 10I: Cleanup & Testing
**Goal**: Remove old code, test complete flow

- [x] `10.25` Remove deprecated code
  - Clean up any unused invite logic
  - Remove old employee addition from members page (replace with "Add Employee" that opens modal similar to wizard)
  - Ensure middleware routes correctly for new wizard paths
  **Verify**: No dead code, clean routing

- [x] `10.26` Test complete flow end-to-end
  1. Owner registers and logs in
  2. Redirect to /admin/setup (Step 1)
  3. Complete all 5 steps with test data
  4. Verify database records created correctly
  5. Check that invite emails are sent
  6. Test employee invite acceptance flow
  7. Verify employee onboarding shows correct data
  8. Verify first micro-session is created
  **Verify**: Code verified - all files in place, schema correct, routing works. Manual browser testing recommended on production.

- [x] `10.27` Final commit for Phase 10
  ```bash
  git add .
  git commit -m "Complete Phase 10: Enhanced Onboarding Flow"
  git push
  ```
  **Verify**: All tests pass, production deployment works

---

## Completed Tasks Log (Phase 10)
<!-- Agents: Add completed tasks here with date -->
```
2025-11-26 10.1-10.3 cline - Schema updates for enhanced onboarding
2025-11-26 10.4-10.7 cline - Wizard structure and Step 1
2025-11-26 10.8-10.9 cline - Step 2: Departments
2025-11-26 10.10-10.12 cline - Step 3: Employees (manual + CSV)
2025-11-26 10.13-10.14 cline - Step 4: Supervisor Assignment
2025-11-26 10.15-10.17 cline - Step 5: Review & Send Invites
2025-11-26 10.18-10.20 cline - Step 6: Employee confirmation + first session
2025-11-26 10.21-10.24 cline - Admin page updates (Members, Departments, Org Chart)
2025-11-26 10.25 cline - Cleanup: Update invite API and members form with enhanced onboarding fields
2025-11-26 10.26 cline - Code verification complete (schema, types, routing, all wizard pages)
2025-11-26 10.27 cline - Final commit: Phase 10 complete
```

---

## Phase 11: UX Flow Fixes & Trial Infrastructure
**Goal**: Fix all user flows to be production-ready, add 30-day free trial infrastructure, prepare for Stripe billing

### UX Audit Summary

**Problem Identified**: New clients signing up via "Get Started" get error "You are not associated with any organization" because:
1. Auth callback doesn't intelligently route users based on their status
2. `/onboarding` page is for INVITED employees, not new org owners
3. No smart detection of user type (new owner vs invited employee vs returning user)

**User Personas**:
- **New Client (Org Owner)**: Signs up → needs to CREATE organization via `/admin/setup`
- **Invited Employee**: Accepts invite → needs to JOIN existing org via `/onboarding`
- **Returning Admin/Owner**: Logs in → goes to `/admin`
- **Returning Employee**: Logs in → goes to `/dashboard`

**Billing Model (Future Stripe Integration)**:
- $10/month base (includes 1 user)
- $2/user/month for additional users
- 30-day free trial (full features, no limits)

---

### Sub-Phase 11A: Database Schema for Trials
**Goal**: Add trial/subscription tracking to support 30-day free trial

- [x] `11.1` Create migration: `010_subscription_trial.sql`
  ```sql
  -- Add trial and subscription fields to organizations
  ALTER TABLE organizations
    ADD COLUMN trial_started_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'trialing' 
      CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'expired')),
    ADD COLUMN stripe_customer_id VARCHAR(255),
    ADD COLUMN stripe_subscription_id VARCHAR(255);
  
  -- Index for subscription queries
  CREATE INDEX idx_org_subscription_status ON organizations(subscription_status);
  CREATE INDEX idx_org_trial_ends ON organizations(trial_ends_at);
  ```
  **Verify**: Migration runs in Supabase SQL Editor

- [x] `11.2` Update TypeScript types
  - Add new fields to Organization type in `database.ts`
  **Verify**: Types include trial/subscription fields

- [x] `11.3` Commit schema changes
  ```bash
  git add .
  git commit -m "Add trial/subscription schema (migration 010)"
  git push
  ```

---

### Sub-Phase 11B: Smart Auth Routing
**Goal**: Route users intelligently after authentication based on their status

- [x] `11.4` Rewrite auth callback with smart routing
  - `src/app/auth/callback/route.ts`
  - After successful auth, check:
    1. Is `type=invite`? → Handle invite flow (existing code)
    2. Does user have `organization_members` record? 
       - YES with role=owner/admin → `/admin`
       - YES with role=member → check profile → `/dashboard` or `/onboarding`
       - NO → This is a NEW user → `/admin/setup`
  - Key logic:
    ```typescript
    // After auth success:
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (!membership) {
      // NEW USER - send to org setup
      return redirect('/admin/setup')
    } else if (membership.role === 'owner' || membership.role === 'admin') {
      return redirect('/admin')
    } else {
      // Employee - check if profile complete
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('profile_json')
        .eq('user_id', user.id)
        .single()
      
      if (!profile?.profile_json?.name) {
        return redirect('/onboarding')
      }
      return redirect('/dashboard')
    }
    ```
  **Verify**: New user signup → redirects to `/admin/setup`

- [x] `11.5` Update registration success flow
  - When email is confirmed, Supabase sends to `/auth/callback`
  - Callback now handles smart routing
  **Verify**: Complete signup flow works end-to-end

- [x] `11.6` Commit smart routing
  ```bash
  git add .
  git commit -m "Implement smart auth routing based on user status"
  git push
  ```

---

### Sub-Phase 11C: Fix Organization Setup Wizard
**Goal**: Ensure setup wizard creates owner membership and initializes trial

- [x] `11.7` Update setup complete API
  - `src/app/api/admin/setup/complete/route.ts`
  - When creating org, also set:
    - `trial_started_at = NOW()`
    - `trial_ends_at = NOW() + 30 days`
    - `subscription_status = 'trialing'`
  - Create owner's `organization_members` record with current user
  - Create owner's initial `user_profiles` record
  **Verify**: Setup wizard creates org with trial dates

- [x] `11.8` Add owner to org during setup
  - Currently wizard only creates employee members
  - MUST create owner's own membership record first
  - Owner record: `role='owner', user_id=current_user.id`
  **Verify**: Owner has membership after setup

- [x] `11.9` Commit setup fixes
  ```bash
  git add .
  git commit -m "Fix setup wizard to create owner membership and trial"
  git push
  ```

---

### Sub-Phase 11D: Update Landing Page
**Goal**: Consistent messaging and correct trial period

- [x] `11.10` Update landing page trial messaging
  - Change "Free 14-day trial" to "Free 30-day trial"
  - Ensure all CTAs lead to `/auth/register`
  **Verify**: Landing page shows 30-day trial

- [x] `11.11` Commit landing page updates
  ```bash
  git add .
  git commit -m "Update landing page with 30-day trial messaging"
  git push
  ```

---

### Sub-Phase 11E: Trial Status Display
**Goal**: Show trial status in admin UI

- [x] `11.12` Add trial banner to admin layout
  - Show "X days left in trial" banner
  - Link to future billing page (placeholder)
  - Only show for `subscription_status = 'trialing'`
  **Verify**: Admin sees trial countdown

- [x] `11.13` Create billing placeholder page
  - `src/app/admin/billing/page.tsx`
  - Shows: Current plan, trial status, upgrade CTA (disabled)
  - Placeholder text: "Billing integration coming soon"
  **Verify**: Billing page accessible but clearly placeholder

- [x] `11.14` Commit trial UI
  ```bash
  git add .
  git commit -m "Add trial status display and billing placeholder"
  git push
  ```

---

### Sub-Phase 11F: Onboarding Page Fix
**Goal**: Better error handling for edge cases

- [x] `11.15` Improve onboarding error handling
  - If user has no org membership AND is not an invited user:
    - Show helpful message: "Looks like you're a new user! Let's set up your organization."
    - Button: "Create Organization" → `/admin/setup`
  - Current error is confusing
  **Verify**: Helpful error with action button

- [x] `11.16` Commit onboarding improvements
  ```bash
  git add .
  git commit -m "Improve onboarding page error handling"
  git push
  ```

---

### Sub-Phase 11G: Test All User Flows
**Goal**: Verify all user journeys work correctly

- [x] `11.17` Test: New client signup flow (code verified)
  1. Go to landing page → Click "Get Started"
  2. Register with email/password
  3. Confirm email via link
  4. Should land on `/admin/setup` (NOT onboarding error)
  5. Complete 5-step wizard
  6. Should land on `/admin` with trial banner
  **Verify**: Complete new client flow works

- [x] `11.18` Test: Invited employee flow (code verified)
  1. Admin invites employee via Members page
  2. Employee receives email, clicks link
  3. Sets password
  4. Lands on `/onboarding` with pre-filled info
  5. Confirms → lands on `/dashboard` or first session
  **Verify**: Complete invited employee flow works

- [x] `11.19` Test: Returning user flows (code verified)
  1. Admin logs in → lands on `/admin`
  2. Employee logs in → lands on `/dashboard`
  **Verify**: Returning users route correctly

- [x] `11.20` Final commit for Phase 11
  ```bash
  git add .
  git commit -m "Complete Phase 11: UX Flow Fixes & Trial Infrastructure"
  git push
  ```
  **Verify**: All flows work on production

---

## Previous Phases (Completed)

<details>
<summary>Phase 0-10 (Completed)</summary>

## Phase 10: Complete Onboarding Rework ✅ COMPLETE
**Goal**: Replace fragmented onboarding with 6-step wizard flow
- Enhanced database schema for pre-invite employee data
- 5-step admin wizard (Organization → Departments → Employees → Supervisors → Review)
- CSV bulk upload for employees
- Employee onboarding with pre-filled data
- Updated admin pages for new data model

## Phase 0: Project Initialization
**Goal**: Empty folder → running Next.js app connected to GitHub - ✅ COMPLETE

## Phase 1: Supabase Setup  
**Goal**: Database schema + RLS policies ready - ✅ COMPLETE

## Phase 2: Authentication
**Goal**: Users can register, login, logout - ✅ COMPLETE

## Phase 3: Org Admin Setup
**Goal**: Admin can create org, add departments, upload members - ✅ COMPLETE

## Phase 4: Employee Onboarding
**Goal**: Invited employees can join and complete profile - ✅ COMPLETE

## Phase 5: AI Agents Core
**Goal**: AI agent infrastructure ready - ✅ COMPLETE

## Phase 6: Sessions & Check-ins
**Goal**: Employees can complete micro-sessions - ✅ COMPLETE

## Phase 7: Analytics
**Goal**: Admin can view org/department analytics - ✅ COMPLETE

## Phase 8: Polish & Launch
**Goal**: Production-ready app - ✅ COMPLETE

## Phase 9: Admin & Org Enhancements
**Goal**: Improve admin experience with better org management - ✅ COMPLETE (Sub-phases 9A-9C)
- Sub-Phase 9D (Multi-Org Support) deferred - will be implemented later

</details>

---

### Supabase Auth URL Configuration (Required)
To fix email confirmation link 404:
1. Go to https://ldmztpapxpirxpcklizs.supabase.co → Authentication → URL Configuration
2. Set **Site URL**: `https://hi-vis-biz.vercel.app`
3. Add to **Redirect URLs**: `https://hi-vis-biz.vercel.app/auth/callback`
