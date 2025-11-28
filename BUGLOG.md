# BUGLOG.md

## Overview
This file tracks all known bugs, UX issues, and technical debt for VizDots.
Created as part of Phase 1 of FINAL_EXECUTION_PLAN.md.

---

## Bug Severity Levels
- **P0**: Critical - Blocks core functionality, must fix before any release
- **P1**: High - Significant impact on user experience, fix in current phase
- **P2**: Medium - Noticeable issue, fix before production launch
- **P3**: Low - Minor issue, can defer to post-launch

---

## Active Bugs

### BUG-001: Dashboard "Start" Button Disabled (P0) ✅ RESOLVED
**Status**: Resolved
**Severity**: P0 - Critical
**Location**: `src/app/dashboard/page.tsx`
**Resolution Date**: 2025-11-27
**Fix**: Replaced disabled button with Link component linking to `/dashboard/session/${session.id}`. Also added agent icons via agentMetadata.

---

### BUG-002: Missing "Forgot Password?" Link on Login (P1) ✅ RESOLVED
**Status**: Resolved
**Severity**: P1 - High
**Location**: `src/app/auth/login/page.tsx`
**Resolution Date**: 2025-11-27
**Fix**: Added full "Forgot your password?" flow with:
- Link next to password label that switches to forgot password mode
- Dedicated forgot password form with email input
- Calls Supabase `resetPasswordForEmail` with redirect to `/auth/set-password`
- Success message with "Check your email" confirmation
- "Back to sign in" buttons throughout

---

### BUG-003: Missing "Contact Us to Upgrade" CTA on Billing (P2) ✅ RESOLVED
**Status**: Resolved
**Severity**: P2 - Medium
**Location**: `src/app/admin/billing/page.tsx`
**Resolution Date**: 2025-11-27
**Fix**: Added "Contact us to upgrade" button with:
- Primary blue CTA button with email icon
- mailto link to support@vizdots.com with pre-filled subject and body
- Helper text: "We'll help you set up your subscription manually while we finish the integration."

---

### BUG-004: Scheduler Idempotence Relies Only on Application Logic (P1) ✅ RESOLVED
**Status**: Resolved
**Severity**: P1 - High
**Location**: `supabase/migrations/012_scheduler_idempotence.sql`
**Resolution Date**: 2025-11-27
**Fix**: Added database-level uniqueness constraint with:
- Unique partial index on `(user_id, agent_code, scheduled_for::date)` for pending sessions
- Constraint only applies to sessions where `completed_at IS NULL` (allows historical data)
- Added optimized index for scheduler's pending session lookups
- Database now rejects duplicate session creation attempts at the constraint level

---

### BUG-005: Missing Custom 404 Page (P2) ✅ RESOLVED
**Status**: Resolved
**Severity**: P2 - Medium
**Location**: `src/app/not-found.tsx`
**Resolution Date**: 2025-11-27
**Fix**: Created branded 404 page with:
- VizDots-themed icon and styling
- "We couldn't find that page" messaging
- CTAs: Go to Dashboard, Sign in, Back to home
- Brand footer with VizDots tagline

---

### BUG-006: MASTER_PROJECT_CONTEXT References Legacy Setup Pages (P3) ✅ RESOLVED
**Status**: Resolved
**Severity**: P3 - Low
**Location**: `MASTER_PROJECT_CONTEXT.md`
**Resolution Date**: 2025-11-27
**Fix**: Removed legacy setup page references from Admin Setup Wizard table:
- Removed entries for employees/page.tsx, supervisors/page.tsx, review/page.tsx
- Table now only shows the 5 current files (layout + 4 steps)
- Documentation accurately reflects the codebase

---

### BUG-007: No Sandbox Banner in AI Test Lab (P2) ✅ RESOLVED
**Status**: Resolved
**Severity**: P2 - Medium
**Location**: `src/app/admin/ai-test-lab/page.tsx`
**Resolution Date**: 2025-11-27
**Fix**: Added prominent amber-colored sandbox warning banner at top of page with:
- Info icon
- "This is a sandbox" heading
- Description: "Nothing you do here changes live employee check-ins. Use this to test and experiment with AI agents safely."

---

### BUG-008: Dashboard Layout Missing Membership Error Handling (P1) ✅ RESOLVED
**Status**: Resolved
**Severity**: P1 - High
**Location**: `src/app/dashboard/layout.tsx`
**Resolution Date**: 2025-11-27
**Fix**: Added comprehensive no-membership handling with:
- Changed `.single()` to `.maybeSingle()` to prevent errors when no record exists
- Created friendly "No team connected yet" UI with VizDots branding
- Includes: team icon, clear messaging, Contact Support CTA (mailto), Sign out button
- Link to admin setup for organization owners

---

### BUG-009: Non-Admin Access to /admin/* Shows Generic Error (P2) ✅ RESOLVED
**Status**: Resolved
**Severity**: P2 - Medium
**Location**: `src/app/admin/layout.tsx`
**Resolution Date**: 2025-11-27
**Fix**: Added proper role-based access control with friendly 403 page:
- First checks if user has ANY membership (to distinguish new owners from employees)
- If user has membership but NOT as owner/admin, shows access denied page
- Access denied page includes: warning icon, clear heading, explanation, and CTA to dashboard
- New org owners without membership can still access setup pages

---

## UX Issues

### UX-001: Session Page Missing "Already Complete" State (P2) ✅ VERIFIED
**Status**: Verified - Already Implemented
**Severity**: P2 - Medium
**Location**: `src/app/dashboard/session/[id]/page.tsx`
**Verification Date**: 2025-11-27
**Implementation**: Session page correctly handles completed sessions with:
- "Complete" badge in header when `isComplete=true`
- Input area shows "This check-in is complete. Thanks for sharing!"
- "Return to Dashboard" button

---

### UX-002: Day 0 Empty State Messaging (P2) ✅ VERIFIED
**Status**: Verified - Already Implemented
**Severity**: P2 - Medium
**Location**: `src/app/dashboard/page.tsx`
**Verification Date**: 2025-11-27
**Implementation**: Dashboard handles Day 0 with:
- "No sessions yet" empty state when no upcoming/recent sessions exist
- Icon, clear heading, and helpful messaging
- Explains check-ins will appear once scheduled (usually within a day)

---

### UX-003: My Dots Empty State (P2) ✅ VERIFIED
**Status**: Verified - Already Implemented
**Severity**: P2 - Medium
**Location**: `src/app/dashboard/my-dots/page.tsx`
**Verification Date**: 2025-11-27
**Implementation**: My Dots page has proper empty state with:
- Icon (inbox icon)
- "No dots yet" heading
- Helpful text explaining first check-in will add a dot
- "Go to Dashboard" CTA button

---

## Technical Debt

### TD-001: TypeScript FK Relation Handling Pattern
**Status**: Documented
**Severity**: P3 - Low
**Description**: Supabase joins return arrays for FK relations, requiring pattern: `Array.isArray(rel) ? rel[0]?.field : rel?.field`. This is documented but adds complexity.
**Affected Files**: Multiple admin pages
**Note**: This is a known Supabase pattern, not a bug per se.

---

### TD-002: Rate Limiter Not Applied to All Routes
**Status**: Open
**Severity**: P2 - Medium
**Location**: `src/lib/utils/rate-limiter.ts`
**Description**: Rate limiter utility exists but may not be applied consistently across all API routes.
**Affected Phase**: Phase 6

---

### TD-003: AI Logger Integration Incomplete
**Status**: Open
**Severity**: P2 - Medium
**Location**: `src/lib/utils/ai-logger.ts`
**Description**: AI logging utility exists but needs verification that it's integrated into all AI call paths.
**Affected Phase**: Phase 6

---

## Resolved Bugs

(None yet - will be moved here after fixes)

---

## Changelog

| Date | Bug ID | Action | Notes |
|------|--------|--------|-------|
| 2025-11-27 | ALL | Created | Initial bug backlog from Phase 1 baseline audit |
| 2025-11-27 | BUG-001 | Resolved | Fixed disabled Start button on dashboard |
| 2025-11-27 | BUG-002 | Resolved | Added forgot password flow to login page |
| 2025-11-27 | BUG-003 | Resolved | Added Contact us to upgrade CTA to billing |
| 2025-11-27 | BUG-005 | Resolved | Created custom branded 404 page |
| 2025-11-27 | BUG-007 | Resolved | Added sandbox banner to AI Test Lab |
| 2025-11-27 | BUG-009 | Resolved | Added 403 access denied page for non-admin users |
| 2025-11-27 | BUG-008 | Resolved | Added no-membership handling to dashboard layout |
| 2025-11-27 | BUG-004 | Resolved | Added database uniqueness constraint for scheduler idempotence |
| 2025-11-27 | UX-001 | Verified | Session page already has complete state handling |
| 2025-11-27 | UX-002 | Verified | Dashboard already has Day 0 empty state |
| 2025-11-27 | UX-003 | Verified | My Dots already has proper empty state |
| 2025-11-27 | BUG-006 | Resolved | Removed legacy setup page references from documentation |
