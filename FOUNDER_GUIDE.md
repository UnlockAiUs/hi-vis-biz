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
10. [Manual Test Script](#manual-test-script)
11. [Troubleshooting](#troubleshooting)

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

### After Trial
- Upgrade to continue service
- Stripe integration coming soon

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

*Last updated: November 27, 2025*
