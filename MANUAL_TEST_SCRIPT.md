# MANUAL_TEST_SCRIPT.md

VizDots Manual Testing Script for Production Readiness

This script provides step-by-step test scenarios for manual verification before go-live. Each tester should record actual results in the "Result" column.

---

## Test Environment Setup

Before testing:
1. Ensure app is running (`npm run dev` for local, or use staging URL)
2. Have access to Supabase dashboard for data verification
3. Prepare test email accounts (use `+` aliases for Gmail, e.g., `you+test1@gmail.com`)

---

## Part 1: Owner/Admin Journey

### 1.1 Registration & Setup

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1.1.1 | Navigate to `/` | Landing page loads with VizDots branding | | |
| 1.1.2 | Click "Get Started" or "Sign Up" | Redirected to registration page | | |
| 1.1.3 | Enter email and password, submit | Account created, redirected to setup or onboarding | | |
| 1.1.4 | Check email for confirmation (if enabled) | Confirmation email received | | |

### 1.2 Setup Wizard

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1.2.1 | Land on `/admin/setup` | Step 1 (Company Basics) displayed | | |
| 1.2.2 | Enter company name, click Continue | Moves to Step 2 (Departments) | | |
| 1.2.3 | Try to skip to Step 4 directly | Should be locked or redirected | | |
| 1.2.4 | Add 2-3 departments, click Continue | Moves to Step 3 (People) | | |
| 1.2.5 | Add a test member, click Continue | Moves to Step 4 (Settings) | | |
| 1.2.6 | Configure schedule settings, click Finish | Setup complete, redirected to `/admin` | | |
| 1.2.7 | Verify `setup_completed_at` is set in DB | Field is populated | | |

### 1.3 Partial Setup & Resume

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1.3.1 | Create new test org, complete Step 1 only | | | |
| 1.3.2 | Navigate to `/admin` | "Resume Setup" banner appears | | |
| 1.3.3 | Click "Resume Setup" | Returns to correct wizard step | | |

---

## Part 2: Admin Dashboard Usage

### 2.1 Dashboard Overview

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 2.1.1 | Navigate to `/admin` | Dashboard loads with overview cards | | |
| 2.1.2 | Check active members count | Matches DB records | | |
| 2.1.3 | Check trial banner (if applicable) | Shows days remaining correctly | | |

### 2.2 Members Management

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 2.2.1 | Navigate to `/admin/members` | Members list loads | | |
| 2.2.2 | Click "Invite Member" | Invite modal/form appears | | |
| 2.2.3 | Enter email, select role & department | Form validates correctly | | |
| 2.2.4 | Submit invite | Success message, member appears in list as "invited" | | |
| 2.2.5 | Check invited member's email | Invite email received | | |

### 2.3 Other Admin Pages

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 2.3.1 | Navigate to `/admin/departments` | Departments list loads | | |
| 2.3.2 | Navigate to `/admin/workflows` | Workflows page loads (may be empty) | | |
| 2.3.3 | Navigate to `/admin/analytics` | Analytics page loads, shows empty state if no data | | |
| 2.3.4 | Navigate to `/admin/billing` | Billing page loads with trial info | | |
| 2.3.5 | Navigate to `/admin/ai-test-lab` | AI Test Lab loads with sandbox banner | | |
| 2.3.6 | Test AI agent in test lab | Returns structured output | | |

---

## Part 3: Employee Journey

### 3.1 Invite Acceptance

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 3.1.1 | Open invite email in incognito/different browser | Email contains invite link | | |
| 3.1.2 | Click invite link | Lands on set-password page | | |
| 3.1.3 | Enter and confirm password | Password set successfully | | |
| 3.1.4 | After password set | Redirected to onboarding or dashboard | | |

### 3.2 Onboarding Flow

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 3.2.1 | Land on `/onboarding` | Welcome step displayed | | |
| 3.2.2 | Complete profile info (name, etc.) | Form submits successfully | | |
| 3.2.3 | Complete all onboarding steps | Redirected to `/dashboard` | | |

### 3.3 Employee Dashboard (Day 0 - No Sessions)

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 3.3.1 | View `/dashboard` with no sessions | "No check-ins ready" message displayed | | |
| 3.3.2 | Message is friendly, not an error | Clear explanation provided | | |
| 3.3.3 | Navigate to My Dots | Empty state message shown | | |

### 3.4 Employee Session Flow

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 3.4.1 | (Create test session in DB or run scheduler) | Pending session exists for user | | |
| 3.4.2 | View `/dashboard` | Pending check-in card displayed | | |
| 3.4.3 | Click "Start Check-in" | Opens `/dashboard/session/[id]` | | |
| 3.4.4 | View session page | Agent greeting displayed, input area ready | | |
| 3.4.5 | Type response, click Send | Message sent, AI responds | | |
| 3.4.6 | Complete conversation | Session marked complete, success message | | |
| 3.4.7 | View `/dashboard/my-dots` | Completed dot appears in list | | |

---

## Part 4: Access Control

### 4.1 Non-Admin Access to Admin Routes

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 4.1.1 | Log in as regular employee | Dashboard loads | | |
| 4.1.2 | Navigate to `/admin` directly | Access denied page shown | | |
| 4.1.3 | Access denied message is friendly | Includes CTA to dashboard | | |

### 4.2 No Membership Edge Case

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 4.2.1 | Log in as user with no org membership | | | |
| 4.2.2 | Navigate to `/dashboard` | "No team connected" message shown | | |
| 4.2.3 | Navigate to `/admin` | Access denied or no-membership message | | |

---

## Part 5: Authentication Flows

### 5.1 Login/Logout

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 5.1.1 | Navigate to `/auth/login` | Login form displayed | | |
| 5.1.2 | Enter valid credentials, submit | Redirected to appropriate page (admin/dashboard) | | |
| 5.1.3 | Click Sign Out | Logged out, redirected to login | | |
| 5.1.4 | Try to access `/dashboard` after logout | Redirected to login | | |
| 5.1.5 | Try to access `/admin` after logout | Redirected to login | | |

### 5.2 Password Recovery

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 5.2.1 | Navigate to `/auth/login` | | | |
| 5.2.2 | Click "Forgot password?" | Recovery form appears | | |
| 5.2.3 | Enter email, submit | Success message shown | | |
| 5.2.4 | Check email | Recovery link received | | |
| 5.2.5 | Click recovery link | Set password page loads | | |
| 5.2.6 | Set new password | Password updated successfully | | |
| 5.2.7 | Log in with new password | Login successful | | |

---

## Part 6: Error Handling

### 6.1 Invalid Routes

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 6.1.1 | Navigate to `/nonexistent-page` | Custom 404 page displayed | | |
| 6.1.2 | 404 page has navigation options | Links to home/dashboard present | | |

### 6.2 Invalid Session

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 6.2.1 | Navigate to `/dashboard/session/invalid-id` | Friendly error message | | |
| 6.2.2 | No raw error or stack trace shown | Human-readable message only | | |

### 6.3 API Errors

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 6.3.1 | Trigger an AI error (if possible) | User-friendly error message | | |
| 6.3.2 | No raw JSON or stack trace exposed | Clean error display | | |

---

## Part 7: Responsive Design

### 7.1 Mobile Testing (375px width)

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 7.1.1 | View landing page on mobile | No horizontal scroll | | |
| 7.1.2 | View login page on mobile | Form is usable | | |
| 7.1.3 | View dashboard on mobile | Content stacks vertically | | |
| 7.1.4 | View admin sidebar on mobile | Collapses to hamburger menu | | |
| 7.1.5 | Open mobile admin menu | Menu slides in/out properly | | |
| 7.1.6 | Tap targets are large enough | Buttons minimum ~44px | | |

---

## Part 8: Data Integrity Verification

### 8.1 Database Checks (via Supabase)

| Step | Check | Expected Result | Actual Result | Pass/Fail |
|------|-------|-----------------|---------------|-----------|
| 8.1.1 | Organizations table | All orgs have valid trial/subscription data | | |
| 8.1.2 | Organization members | All members have valid org_id, user_id | | |
| 8.1.3 | Sessions table | Sessions have valid references | | |
| 8.1.4 | Completed sessions | Have `completed_at` timestamp | | |

---

## Sign-Off

| Tester Name | Date | Environment | Overall Pass/Fail | Notes |
|-------------|------|-------------|-------------------|-------|
| | | | | |
| | | | | |

---

## Issue Log

Record any bugs or issues found during testing:

| Issue # | Step | Description | Severity | Screenshot/Video |
|---------|------|-------------|----------|------------------|
| | | | | |
| | | | | |
| | | | | |

---

## Notes

- P0 = Blocker (must fix before launch)
- P1 = Critical (should fix before launch)
- P2 = Important (can launch but fix soon)
- P3 = Nice to have

End of Manual Test Script
