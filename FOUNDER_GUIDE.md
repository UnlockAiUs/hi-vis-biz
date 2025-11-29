# VizDots Founder's Guide

> **For founders and non-technical users**: This guide walks you through everything you need to know to operate VizDots.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Admin Dashboard Overview](#admin-dashboard-overview)
3. [Onboarding Wizard](#onboarding-wizard)
4. [Inviting Employees](#inviting-employees)
5. [Understanding Dots](#understanding-dots)
6. [Viewing Workflows](#viewing-workflows)
7. [Early Warning Signals](#early-warning-signals)
8. [AI Test Lab](#ai-test-lab)
9. [Trial & Subscription](#trial--subscription)
10. [Workflow Feedback & Overrides](#workflow-feedback--overrides)
11. [Team Health Scorecard](#team-health-scorecard)
12. [Pattern Alerts & Coaching](#pattern-alerts--coaching)
13. [Multi-Language Support](#multi-language-support)
14. [Privacy Settings](#privacy-settings)
15. [Manual Test Script](#manual-test-script)
16. [Troubleshooting](#troubleshooting)

---

## Getting Started

### What is VizDots?

VizDots turns small daily check-ins ("dots") from your employees into actionable insights about how your business actually operates. Through quick 1-2 minute AI conversations 2-3 times per week, VizDots reveals:

- **Workflows** - How work actually gets done
- **Friction Points** - Where bottlenecks and delays occur
- **Role Clarity** - What each person really does
- **Early Warnings** - Problems before they escalate

### First-Time Login

1. Go to your VizDots URL (e.g., `vizdots.vercel.app`)
2. Click **"Start Free → 30 Days On Us"**
3. Register with your email and password
4. You'll be taken to the **Onboarding Wizard**

---

## Admin Dashboard Overview

After completing setup, you'll see the **Admin Dashboard** with these sections:

### Today Section
- **Dots Today**: How many check-ins were completed vs. expected
- **Participation Rate**: Percentage of employees participating this week
- **Top Themes**: Common topics from recent check-ins

### Early Warning Signals
Shows potential issues like:
- Rising mentions of "blocked", "delayed", "waiting"
- Participation drops by department

### Quick Actions
- **Invite Team** - Add new employees
- **View Members** - Manage current team
- **Workflows** - See detected processes
- **Settings** - Organization configuration

---

## Onboarding Wizard

The wizard has **4 steps**:

### Step 1: Company Basics
- Company name
- Industry (dropdown)
- Team size (1-10, 11-50, 51-200, 201-500, 500+)

### Step 2: Departments & Roles
- Add your departments (e.g., Operations, Sales, Support)
- These help organize employee check-ins

### Step 3: People
Two options:
1. **CSV Upload**: Download the template, fill in employee details, upload
2. **Manual Entry**: Add employees one-by-one

CSV Template columns:
- `name` (required)
- `email` (required)
- `job_title`
- `department`
- `supervisor_email`
- `is_supervisor` (true/false)

### Step 4: Settings & Launch
- **Check-in Frequency**: Daily or Weekly
- **Time Window**: When check-ins should be completed
- **Review Summary**: See what you've set up
- Click **"Launch VizDots"** to go live

---

## Inviting Employees

### From the Members Page
1. Go to **Admin → Members**
2. Click **"Invite New Member"**
3. Enter name, email, job title, department
4. Click **"Send Invite"**

### What Employees See
1. Email with invite link
2. Welcome screen explaining VizDots
3. Quick profile confirmation
4. First check-in starts immediately

### Resending Invites
- Go to **Members** page
- Find the employee with "Invited" status
- Click the **⋮** menu → "Resend Invite"

---

## Understanding Dots

### What is a Dot?
A "dot" is a single check-in from an employee. Each dot captures:
- Current mood/workload
- What they're working on
- Any blockers or friction
- Tools and processes used

### Dot Types (AI Agents)
VizDots uses 5 AI agents that rotate through check-ins:

| Agent | What It Discovers |
|-------|------------------|
| **Pulse** | Mood, workload, burnout risk |
| **Role Mapper** | Job responsibilities, duties |
| **Workflow Mapper** | Processes, steps, tools used |
| **Pain Scanner** | Friction points, blockers |
| **Focus Tracker** | Current priorities, changes |

### Viewing Employee Dots
Employees can see their own history at **Dashboard → My Dots**

---

## Viewing Workflows

### What Are Workflows?
Workflows are the actual processes your team follows, discovered through their check-ins. VizDots builds these automatically.

### Accessing Workflows
1. Go to **Admin → Workflows**
2. See workflows grouped by department
3. Each workflow shows:
   - Name/label
   - Key steps
   - Tools involved

### Note
Workflows are marked as "Beta" - they improve as more dots are collected.

---

## Workflow Feedback & Overrides

### What Is It?
As an admin/owner, you can provide feedback on AI-detected workflows and make corrections. This helps VizDots learn and improves accuracy over time.

### Accessing Workflow Details
1. Go to **Admin → Workflows**
2. Click on any workflow to see details
3. View the workflow steps, tools, and version history

### Providing Accuracy Feedback
On each workflow detail page, you'll see feedback buttons:

| Button | When to Use |
|--------|------------|
| **✅ Accurate** | AI got it right |
| **🤔 Partial** | Mostly correct, some issues |
| **❌ Incorrect** | Needs significant changes |

When you select "Partial" or "Incorrect", you can specify:
- Missing steps
- Wrong steps
- Incorrect tools
- Free-text explanation

### Adding Owner Notes
Add notes to workflows to provide context:

1. Find the **"Add Note"** section
2. Select note type:
   - **Policy** - Official guidance
   - **Clarification** - Explain nuances
   - **Question** - Flag for team discussion
   - **Alert** - Important warning
3. Choose visibility (Admins only, Managers, Everyone)
4. Save the note

### Marking Workflow Variants
When VizDots detects different ways people do the same process:

1. View "Variants" section on workflow detail
2. Each variant shows how it differs from the main process
3. Toggle **"OK"** for acceptable variations
4. Toggle **"Friction"** for variations causing problems

Friction variants are tracked in metrics and may trigger alerts.

### Reset to AI Suggestion
If you want to undo your changes:
1. Find the **"Reset to AI Suggestion"** button
2. Confirm the reset
3. Workflow reverts to pure AI interpretation

---

## Early Warning Signals

### What Are They?
VizDots automatically detects potential issues by:
- Tracking friction keywords (blocked, delay, waiting, stuck, slow, problem, issue, frustrated, bottleneck, backlog)
- Monitoring participation drops by department

### Where to Find Them
- **Admin Dashboard** → "Early Warning Signals" section
- Warnings show:
  - Issue type
  - Affected department
  - Severity (High = red, Medium = orange)

### What to Do
- High friction mentions → Talk to that team
- Participation drop → Check if employees received invites

---

## Team Health Scorecard

### What Is It?
A dashboard showing the health of each department/team based on check-in data.

### Accessing Team Health
Go to **Admin → Team Health** (heart icon in sidebar)

### Understanding Metrics

| Metric | What It Measures | Good Range |
|--------|-----------------|------------|
| **Participation Rate** | % of employees completing check-ins | >70% |
| **Friction Index** | Amount of reported blockers/issues | <30% |
| **Sentiment Score** | Overall mood from check-ins | >60 |
| **Focus Score** | Priority clarity | >60 |
| **Workload Score** | Work distribution balance | 40-70 |
| **Burnout Risk** | Signs of overwork/stress | <40 |

### Risk Levels
Each department shows a risk badge:
- 🟢 **Low** (0-33): Healthy team
- 🟡 **Medium** (34-66): Watch closely
- 🔴 **High** (67-100): Action needed

### Time Windows
Use the selector to view metrics for:
- **Week** - Last 7 days
- **Month** - Last 30 days
- **Quarter** - Last 90 days

---

## Pattern Alerts & Coaching

### What Are Alerts?
VizDots automatically creates alerts when metrics cross concerning thresholds.

### Accessing Alerts
Go to **Admin → Alerts** (bell icon in sidebar)

### Alert Types

| Alert Type | Trigger |
|-----------|---------|
| **Low Participation** | <50% check-in rate |
| **High Friction** | >40% friction index |
| **Sentiment Drop** | Rapid mood decline |
| **Workload Spike** | Sudden workload increase |
| **Burnout Risk** | High burnout indicators |
| **Focus Drift** | Unclear priorities |
| **Process Variance** | Many workflow deviations |

### Alert Severity
- **Info** (blue) - FYI, no immediate action needed
- **Warning** (yellow) - Should address soon
- **Critical** (red) - Needs immediate attention

### Coaching Suggestions
Each alert includes **actionable suggestions**:
- Specific steps you can take
- Why it matters
- Rough effort level

Example for "Low Participation":
> - Schedule brief 1:1 check-ins with team members who haven't responded
> - Consider adjusting check-in timing to better fit team schedules

### Managing Alerts
Use the action buttons on each alert:

| Action | Purpose |
|--------|---------|
| **Acknowledge** | "I've seen this" |
| **Resolve** | "I've addressed this" (add a note) |
| **Dismiss** | "Not relevant" |

---

## Multi-Language Support

### What Is It?
Employees can complete check-ins in their preferred language. VizDots translates responses for analytics while preserving original text.

### Supported Languages
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Portuguese (pt)
- Italian (it)
- Dutch (nl)
- Polish (pl)
- Japanese (ja)
- Chinese (zh)
- Korean (ko)

### Employee Language Settings
Employees can set their preference:
1. **Dashboard → Settings**
2. Select preferred language
3. Save

### How It Works
1. Employee responds in their language
2. AI converses in that language
3. Response is stored with both original and English translation
4. Analytics always use English translation for consistency

---

## Privacy Settings

### What Is It?
Controls for how employee data is collected, stored, and used. Helps with GDPR compliance and employee trust.

### Accessing Privacy Settings
Go to **Admin → Privacy** (shield icon in sidebar)

### Available Controls

| Setting | Description |
|---------|-------------|
| **Allow Translation** | Enable/disable automatic translation |
| **Allow Sentiment Analysis** | Enable/disable mood analysis |
| **Data Retention Days** | How long to keep data (blank = forever) |
| **Employee Can Mark Private** | Let employees mark specific responses as private |
| **Privacy Notice** | Custom message shown to employees |

### Privacy Notice
If enabled, employees see a notice explaining:
- What data is collected
- How it's used
- Their rights

### Data Export (GDPR)
Employees can request a copy of their data. This feature supports:
- Data portability requirements
- Right to access requests

### Best Practices
1. Enable privacy notice for transparency
2. Set reasonable retention periods
3. Be consistent with your privacy policy
4. Train managers on data handling

---

## AI Test Lab

### What Is It?
An admin-only page to test AI agents and verify they're working correctly.

### How to Use
1. Go to **Admin → AI Test Lab**
2. Select an agent from the dropdown
3. Enter sample text (or use a sample prompt)
4. Click **"Test Agent"**
5. See the raw JSON response and parsed summary

### When to Use
- To verify AI is working after setup
- To debug if check-ins seem stuck
- To understand what agents extract

---

## Trial & Subscription

### Free Trial
- **30 days** from organization creation
- Full access to all features
- No credit card required

### Checking Trial Status
1. Go to **Admin → Billing**
2. See "Trial ends on [date]"
3. Shows days remaining

### Pricing Model
VizDots uses a **per-seat pricing** model:

| Component | Price |
|-----------|-------|
| **Base fee** | $29/month per organization |
| **Per-seat fee** | $3/month per active user |

**Example:** An organization with 10 active employees pays:
- Base: $29
- Seats: 10 × $3 = $30
- **Total: $59/month**

### Important: Users Cannot Be Deleted
- Employees can only be **deactivated**, not deleted
- Deactivated users are **not charged** (inactive users free)
- This preserves historical data and audit trails
- You can reactivate users at any time

### Upgrading from Trial
1. Go to **Admin → Billing**
2. Click **"Start Paid Plan"**
3. You'll be redirected to Stripe checkout
4. Enter payment information
5. Subscription starts immediately

### Managing Your Subscription
1. Go to **Admin → Billing**
2. Click **"Manage Billing"**
3. Opens Stripe Customer Portal where you can:
   - Update payment method
   - View invoices
   - Cancel subscription

### Subscription States
| State | Meaning |
|-------|---------|
| **Trialing** | Within 30-day free trial |
| **Active** | Paid subscription active |
| **Past Due** | Payment failed, service continues briefly |
| **Canceled** | Subscription ended |
| **Expired** | Trial ended without upgrade |

### Check-in Reminder Emails
VizDots automatically sends reminder emails to employees:
- Sent when employees have pending check-ins
- Scheduled via Vercel cron jobs
- Uses AWS SES for reliable delivery
- Includes direct link to complete check-in

---

## Manual Test Script

Use this checklist to verify everything is working:

### As Admin
- [ ] Log in to admin dashboard
- [ ] See "Today" section with stats
- [ ] Navigate to each sidebar section (Members, Departments, Workflows, Analytics, Settings)
- [ ] Go to **AI Test Lab** and test the "pulse" agent with: "I'm feeling good but pretty busy today"
- [ ] Verify you get a JSON response

### As Employee (Test Account)
- [ ] Invite yourself with a different email
- [ ] Open the invite email and click the link
- [ ] Complete the welcome screen
- [ ] Fill in profile details
- [ ] Start a check-in
- [ ] Answer 2-3 questions from the AI
- [ ] Complete the check-in
- [ ] Go to "My Dots" and see the completed dot

### Verification
- [ ] Return to admin dashboard
- [ ] "Dots Today" count should increase
- [ ] Check Workflows page for any detected workflows

---

## Troubleshooting

### Employee Can't Log In
1. Check if they received the invite email (check spam)
2. Resend the invite from Members page
3. Have them use "Forgot Password" if needed

### Check-ins Not Appearing
1. Verify the employee completed the check-in (green checkmark)
2. Refresh the admin dashboard
3. Check the Sessions API in browser dev tools

### AI Not Responding
1. Go to AI Test Lab and test an agent
2. If it fails, check that `OPENAI_API_KEY` is set in environment variables
3. Check Vercel logs for errors

### Workflows Empty
- Workflows only appear after employees complete check-ins
- The workflow_mapper agent needs to run first
- Check that at least 2-3 check-ins have been completed

### Dashboard Shows No Data
- Verify employees have "Active" status (not just "Invited")
- Complete at least one check-in to generate data
- Wait a few seconds and refresh

---

## Key Metrics to Watch

| Metric | What It Means | Healthy Range |
|--------|--------------|---------------|
| **Participation Rate** | % of employees doing check-ins | >70% |
| **Dots This Week** | Total check-ins completed | 2-3 per employee |
| **Early Warnings** | Issues detected | Fewer is better |
| **Workflow Count** | Processes discovered | Grows over time |

---

## Support

For help, contact: **support@vizdots.com**

---

*Last updated: November 28, 2025*
