# VizDots Vercel Environment Variables Checklist

## Required Environment Variables for Production

Check off each variable as you add it to Vercel (Settings → Environment Variables).

---

### 🔐 SUPABASE (Required - App Won't Work Without These)

| Variable | Where to Find | Status |
|----------|---------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL | ⬜ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon public | ⬜ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role (secret!) | ⬜ |

---

### 🤖 OPENAI (Required - AI Agents Need This)

| Variable | Where to Find | Status |
|----------|---------------|--------|
| `OPENAI_API_KEY` | OpenAI Platform → API Keys → Create new | ⬜ |

---

### ⏰ SCHEDULER SECRETS (Required - Cron Jobs Need These)

These protect your internal API endpoints from unauthorized access. Generate random strings.

| Variable | How to Generate | Status |
|----------|-----------------|--------|
| `SCHEDULER_SECRET` | Generate: `openssl rand -hex 32` or any 32+ char string | ⬜ |
| `SCHEDULER_REMINDERS_SECRET` | Generate: `openssl rand -hex 32` or any 32+ char string | ⬜ |

**Example values (generate your own!):**
```
SCHEDULER_SECRET=vizdots-scheduler-a1b2c3d4e5f6g7h8i9j0-secret
SCHEDULER_REMINDERS_SECRET=vizdots-reminders-x1y2z3a4b5c6d7e8f9g0-secret
```

---

### 📧 AWS SES EMAIL (Required for Phase 10 - Email Reminders)

| Variable | Where to Find | Status |
|----------|---------------|--------|
| `AWS_SES_ACCESS_KEY_ID` | AWS Console → IAM → Users → vizdots-ses → Access Keys | ⬜ |
| `AWS_SES_SECRET_ACCESS_KEY` | AWS Console (shown once when creating access key) | ⬜ |
| `AWS_SES_REGION` | Usually `us-east-1` (where your SES is configured) | ⬜ |
| `EMAIL_FROM` | `VizDots <no-reply@vizdots.com>` | ⬜ |
| `EMAIL_CONFIG_SET` | `vizdots-events` (your SES configuration set name) | ⬜ |

---

### 🌐 APP URL (Required)

| Variable | Value | Status |
|----------|-------|--------|
| `NEXT_PUBLIC_APP_URL` | `https://vizdots.com` (your production domain) | ⬜ |

---

## Quick Reference: All Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-...your-openai-key

# Scheduler Secrets (generate these yourself)
SCHEDULER_SECRET=your-random-32-char-string-here
SCHEDULER_REMINDERS_SECRET=your-random-32-char-string-here

# AWS SES
AWS_SES_ACCESS_KEY_ID=AKIA...
AWS_SES_SECRET_ACCESS_KEY=your-secret-key
AWS_SES_REGION=us-east-1
EMAIL_FROM=VizDots <no-reply@vizdots.com>
EMAIL_CONFIG_SET=vizdots-events

# App URL
NEXT_PUBLIC_APP_URL=https://vizdots.com
```

---

## How to Generate Secrets in PowerShell

```powershell
# Option 1: Using GUID
[guid]::NewGuid().ToString()

# Option 2: Random bytes (if you have openssl)
openssl rand -hex 32
```

---

## Vercel Environment Setup

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project (hi-vis-biz)
3. Go to **Settings** → **Environment Variables**
4. Add each variable above
5. Set scope to **Production**, **Preview**, and **Development** for most
   - Exception: Service role key should be **Production only** for security
6. Click **Save**
7. Redeploy the project to apply changes

---

## Verification Checklist

After adding all variables:

- [ ] Test login/register flow works
- [ ] Test AI Test Lab sends messages
- [ ] Check Vercel logs for any missing env var errors
- [ ] Verify cron job logs show successful runs

---

*Last updated: 2025-11-28 - Phase 10 (Email)*
