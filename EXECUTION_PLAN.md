# Hi-Vis Biz - Execution Plan
<!-- AI AGENT: Read this file at session start. Update after completing tasks. -->

## Quick Status
```
CURRENT_PHASE: 10
CURRENT_TASK: 10.1
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

- [ ] `10.1` Create migration: `009_enhanced_onboarding.sql`
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

- [ ] `10.2` Update TypeScript types
  - Regenerate database.ts or manually add new fields to OrganizationMember type
  **Verify**: Types include new fields

- [ ] `10.3` Commit schema changes
  ```bash
  git add .
  git commit -m "Add enhanced onboarding schema (migration 009)"
  git push
  ```

---

### Sub-Phase 10B: Onboarding Wizard - Core Structure
**Goal**: Create the multi-step wizard UI framework

- [ ] `10.4` Create wizard state management
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

- [ ] `10.5` Create wizard layout component
  - `src/app/admin/setup/layout.tsx`
  - Progress indicator showing steps 1-5
  - Step titles: Organization → Departments → Employees → Supervisors → Review
  - Clean, professional styling
  **Verify**: Layout renders with progress bar

- [ ] `10.6` Create Step 1: Organization Info page
  - `src/app/admin/setup/page.tsx` (replace existing)
  - Form: Organization name, Timezone dropdown, Size band dropdown
  - "Next" button → validates and saves to wizard state
  - No database write yet (all saved at Step 5)
  **Verify**: Can enter org info and proceed to Step 2

- [ ] `10.7` Commit wizard structure
  ```bash
  git add .
  git commit -m "Create onboarding wizard structure (Step 1)"
  git push
  ```

---

### Sub-Phase 10C: Step 2 - Departments
**Goal**: Allow owner to create departments during setup

- [ ] `10.8` Create Step 2: Departments page
  - `src/app/admin/setup/departments/page.tsx`
  - Display list of added departments
  - "Add Department" button with inline input
  - Edit (rename) functionality
  - Delete functionality (with confirmation)
  - Back button → Step 1
  - Next button → Step 3 (minimum 1 department required)
  **Verify**: Can add/edit/delete departments, navigate back/forward

- [ ] `10.9` Commit Step 2
  ```bash
  git add .
  git commit -m "Add onboarding Step 2: Departments"
  git push
  ```

---

### Sub-Phase 10D: Step 3 - Add Employees
**Goal**: Manual entry and CSV upload for bulk employee addition

- [ ] `10.10` Create CSV template and parser
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

- [ ] `10.11` Create Step 3: Employees page
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

- [ ] `10.12` Commit Step 3
  ```bash
  git add .
  git commit -m "Add onboarding Step 3: Employees (manual + CSV)"
  git push
  ```

---

### Sub-Phase 10E: Step 4 - Assign Supervisors
**Goal**: Allow supervisor assignment for reporting structure

- [ ] `10.13` Create Step 4: Supervisors page
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

- [ ] `10.14` Commit Step 4
  ```bash
  git add .
  git commit -m "Add onboarding Step 4: Supervisor Assignment"
  git push
  ```

---

### Sub-Phase 10F: Step 5 - Review & Send Invites
**Goal**: Summary page with final confirmation before sending invites

- [ ] `10.15` Create Step 5: Review page
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

- [ ] `10.16` Create API route for complete onboarding
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

- [ ] `10.17` Commit Step 5
  ```bash
  git add .
  git commit -m "Add onboarding Step 5: Review & Send Invites"
  git push
  ```

---

### Sub-Phase 10G: Step 6 - Employee Onboarding
**Goal**: Invited employees confirm their info and start first micro-session

- [ ] `10.18` Update auth callback to handle invite matching
  - When user accepts invite and sets password, match by email
  - Link auth.users.id to existing organization_members record (where invited_email = user.email)
  - Update organization_members.user_id and invite_status = 'accepted'
  **Verify**: Invited user gets linked to correct org member record

- [ ] `10.19` Rework employee onboarding page
  - `src/app/onboarding/page.tsx` (replace existing)
  - Pre-fill with data from organization_members record:
    - Name (display_name) - editable
    - Title (job_title) - editable
    - Department - show current, allow change if needed
  - Confirm button saves any edits
  - **IMPORTANT**: After confirmation, immediately redirect to first micro-session
  - Create initial session with role_mapper agent if none exists
  **Verify**: Employee sees pre-filled data, can confirm, starts micro-session

- [ ] `10.20` Commit Step 6
  ```bash
  git add .
  git commit -m "Add onboarding Step 6: Employee confirmation + first session"
  git push
  ```

---

### Sub-Phase 10H: Update Admin Pages
**Goal**: Update existing admin pages to work with new data model

- [ ] `10.21` Update Members page
  - `src/app/admin/members/page.tsx`
  - Show display_name, job_title from organization_members
  - Show invite_status (pending/sent/accepted)
  - Resend invite option for sent status
  - Show has_direct_reports and can_view_reports badges
  **Verify**: Members page shows new fields correctly

- [ ] `10.22` Update Departments page
  - Show member counts per department
  - Can still add/edit/delete departments post-setup
  **Verify**: Departments page works with new flow

- [ ] `10.23` Update Org Chart page
  - Use has_direct_reports to show manager nodes
  - Use supervisor assignments from organization_members
  **Verify**: Org chart reflects new supervisor data

- [ ] `10.24` Commit admin page updates
  ```bash
  git add .
  git commit -m "Update admin pages for new onboarding data model"
  git push
  ```

---

### Sub-Phase 10I: Cleanup & Testing
**Goal**: Remove old code, test complete flow

- [ ] `10.25` Remove deprecated code
  - Clean up any unused invite logic
  - Remove old employee addition from members page (replace with "Add Employee" that opens modal similar to wizard)
  - Ensure middleware routes correctly for new wizard paths
  **Verify**: No dead code, clean routing

- [ ] `10.26` Test complete flow end-to-end
  1. Owner registers and logs in
  2. Redirect to /admin/setup (Step 1)
  3. Complete all 5 steps with test data
  4. Verify database records created correctly
  5. Check that invite emails are sent
  6. Test employee invite acceptance flow
  7. Verify employee onboarding shows correct data
  8. Verify first micro-session is created
  **Verify**: Full flow works

- [ ] `10.27` Final commit for Phase 10
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
[DATE] [TASK_ID] [AGENT] - Brief description
```

---

## Previous Phases (Completed)

<details>
<summary>Phase 0-9 (Completed)</summary>

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
- Sub-Phase 9D (Multi-Org Support) deferred - will be implemented after Phase 10

</details>

---

### Supabase Auth URL Configuration (Required)
To fix email confirmation link 404:
1. Go to https://ldmztpapxpirxpcklizs.supabase.co → Authentication → URL Configuration
2. Set **Site URL**: `https://hi-vis-biz.vercel.app`
3. Add to **Redirect URLs**: `https://hi-vis-biz.vercel.app/auth/callback`
