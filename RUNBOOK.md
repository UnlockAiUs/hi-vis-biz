# VizDots Operations Runbook

> **For DevOps and technical operators**: This guide covers deployments, secrets management, monitoring, and incident response.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Environment Variables](#environment-variables)
3. [Deployment](#deployment)
4. [Database Migrations](#database-migrations)
5. [Cron Jobs](#cron-jobs)
6. [Monitoring & Logging](#monitoring--logging)
7. [Incident Response](#incident-response)
8. [Rollback Procedures](#rollback-procedures)
9. [Security](#security)

---

## Architecture Overview

### Tech Stack
| Component | Service | Purpose |
|-----------|---------|---------|
| Frontend/API | Vercel | Next.js 14 hosting, serverless functions |
| Database | Supabase | PostgreSQL with RLS, Auth |
| AI | OpenAI | GPT-4 for agent conversations |
| Payments | Stripe | Subscription billing |
| Email | AWS SES | Check-in reminder emails |
| Repository | GitHub | Source control, CI/CD trigger |

### Data Flow
```
User → Vercel (Next.js) → Supabase (Auth/DB) → OpenAI (AI agents)
                       → Stripe (Billing)
                       → AWS SES (Emails)
```

### Critical Endpoints
| Endpoint | Purpose | Auth |
|----------|---------|------|
| `/api/sessions/[id]/messages` | AI conversations | User session |
| `/api/internal/scheduler` | Create scheduled sessions | SCHEDULER_SECRET |
| `/api/internal/reminders` | Send reminder emails | SCHEDULER_REMINDERS_SECRET |
| `/api/billing/webhook` | Stripe events | Stripe signature |

---

## Environment Variables

### Required Variables (Production)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-...

# Scheduler Cron Jobs
SCHEDULER_SECRET=your-random-secret-for-scheduler
SCHEDULER_REMINDERS_SECRET=your-random-secret-for-reminders

# Stripe Billing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_BASE_PRICE_ID=price_...  # $29 base price
STRIPE_SEAT_PRICE_ID=price_...  # $3 per seat price
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# AWS SES Email
AWS_SES_ACCESS_KEY_ID=AKIA...
AWS_SES_SECRET_ACCESS_KEY=...
AWS_SES_REGION=us-east-1
EMAIL_FROM=noreply@vizdots.com
```

### Setting Variables in Vercel

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add each variable with appropriate scope:
   - `NEXT_PUBLIC_*` variables: All environments
   - Secrets: Production only (or Preview for testing)
3. Redeploy after changing variables

### Generating Secrets

```bash
# Generate random secrets for cron jobs
openssl rand -hex 32

# Example output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## Deployment

### Automatic Deployment (Recommended)

Vercel auto-deploys on push to `main`:

```bash
git add -A
git commit -m "Your changes"
git push origin main
# Vercel automatically deploys
```

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Pre-Deployment Checklist

- [ ] All environment variables set in Vercel
- [ ] Database migrations applied in Supabase
- [ ] Stripe webhook endpoint configured
- [ ] AWS SES domain verified
- [ ] SCHEDULER_SECRET and SCHEDULER_REMINDERS_SECRET are unique

### Post-Deployment Verification

1. Visit the app URL
2. Test login flow
3. Check Vercel Function logs for errors
4. Verify cron jobs are registered (Vercel Dashboard → Cron Jobs)

---

## Database Migrations

### Migration Files Location
```
supabase/migrations/
├── 001_initial_schema.sql
├── 002_agents_sessions.sql
├── 003_user_profiles.sql
├── 004_rls_policies.sql
├── 005_seed_agents.sql
├── 006_fix_org_creation_rls.sql
├── 007_complete_rls_setup.sql
├── 008_schedule_settings.sql
├── 009_enhanced_onboarding.sql
├── 010_subscription_trial.sql
├── 011_ai_logs.sql
├── 012_scheduler_idempotence.sql
├── 013_email_logs.sql
├── 014_truth_layers.sql
├── 015_overrides_owner_notes.sql
├── 016_workflow_variants.sql
├── 017_multi_language.sql
├── 018_team_health_metrics.sql
├── 019_pattern_alerts.sql
└── 020_privacy_controls.sql
```

### Applying Migrations

**Option 1: Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste migration SQL
3. Run the query

**Option 2: Supabase CLI**
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### Migration Best Practices
- Always backup before major migrations
- Test migrations on a branch/preview environment first
- Migrations are idempotent where possible (IF NOT EXISTS)
- Never modify existing migrations; create new ones

---

## Cron Jobs

### Configured Cron Jobs (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/internal/scheduler",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/internal/reminders",
      "schedule": "0 9,14 * * 1-5"
    }
  ]
}
```

### Scheduler Job (`/api/internal/scheduler`)
- **Schedule**: Daily at 8 AM UTC
- **Purpose**: Create scheduled check-in sessions for employees
- **Auth**: Requires `SCHEDULER_SECRET` header
- **Idempotence**: Uses DB constraint to prevent duplicates

### Reminders Job (`/api/internal/reminders`)
- **Schedule**: 9 AM and 2 PM UTC, Monday-Friday
- **Purpose**: Send reminder emails for pending check-ins
- **Auth**: Requires `SCHEDULER_REMINDERS_SECRET` header
- **Idempotence**: Uses email_logs table to prevent duplicates

### Manual Cron Trigger

```bash
# Trigger scheduler manually
curl -X POST https://your-app.vercel.app/api/internal/scheduler \
  -H "Authorization: Bearer YOUR_SCHEDULER_SECRET"

# Trigger reminders manually
curl -X POST https://your-app.vercel.app/api/internal/reminders \
  -H "Authorization: Bearer YOUR_SCHEDULER_REMINDERS_SECRET"
```

### Vercel Cron Monitoring
1. Go to Vercel Dashboard → Project → Cron Jobs
2. View execution history and logs
3. Check for failures or timeouts

---

## Monitoring & Logging

### Vercel Logs
- **Real-time**: Vercel Dashboard → Project → Logs
- **Function logs**: Shows API route execution
- **Build logs**: Shows deployment issues

### Supabase Logs
- **Database**: Supabase Dashboard → Logs → Postgres
- **Auth**: Supabase Dashboard → Logs → Auth
- **API**: Supabase Dashboard → Logs → API

### AI Logs (Custom)
VizDots logs AI calls to `ai_logs` table:
```sql
SELECT * FROM ai_logs 
ORDER BY created_at DESC 
LIMIT 50;
```

### Key Metrics to Monitor

| Metric | Where | Alert Threshold |
|--------|-------|-----------------|
| API errors | Vercel Logs | >5% error rate |
| Auth failures | Supabase Auth Logs | >10 failures/hour |
| AI latency | ai_logs table | >10s response time |
| Email failures | email_logs table | Any failures |
| Cron failures | Vercel Cron Jobs | Any failures |

### Health Checks

```bash
# Check API health (should return 200)
curl -I https://your-app.vercel.app/

# Check if scheduler ran today
# Query sessions table for today's scheduled sessions
```

---

## Incident Response

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P0 | Service down, no users can access | Immediate |
| P1 | Major feature broken, >50% affected | <1 hour |
| P2 | Minor feature broken, workaround exists | <4 hours |
| P3 | Cosmetic issue, no user impact | Next business day |

### P0: Service Down

1. **Check Vercel Status**: https://vercel-status.com/
2. **Check Supabase Status**: https://status.supabase.com/
3. **Check Vercel Logs** for deployment errors
4. **Rollback** if recent deployment caused issue

### P1: AI Not Responding

1. Check OpenAI status: https://status.openai.com/
2. Check `ai_logs` table for errors
3. Verify `OPENAI_API_KEY` is valid
4. Check rate limiting in Vercel logs

### P1: Billing Not Working

1. Check Stripe Dashboard for webhook failures
2. Verify `STRIPE_WEBHOOK_SECRET` is correct
3. Check Vercel logs for `/api/billing/webhook` errors
4. Verify Stripe products/prices exist

### P1: Emails Not Sending

1. Check AWS SES Console for bounces/complaints
2. Verify `email_logs` table for failures
3. Check if domain is verified in SES
4. Verify AWS credentials are valid

### P2: Cron Jobs Not Running

1. Check Vercel Cron Jobs dashboard
2. Verify secrets are set correctly
3. Manually trigger to test
4. Check for timeout issues (>10s)

---

## Rollback Procedures

### Vercel Rollback

1. Go to Vercel Dashboard → Project → Deployments
2. Find the last working deployment
3. Click "..." menu → "Promote to Production"

### Database Rollback

**⚠️ DANGER: Data loss possible**

1. Restore from Supabase daily backup:
   - Supabase Dashboard → Settings → Database → Backups
   - Download backup and restore

2. Or manually revert migration:
```sql
-- Example: Revert a column addition
ALTER TABLE table_name DROP COLUMN column_name;
```

### Emergency Contacts

| Service | Contact |
|---------|---------|
| Vercel Support | support@vercel.com |
| Supabase Support | support@supabase.io |
| Stripe Support | support@stripe.com |
| AWS Support | AWS Console |

---

## Security

### API Security

| Endpoint Type | Protection |
|---------------|------------|
| User APIs | Supabase Auth (JWT) |
| Admin APIs | Auth + Role check (owner/admin) |
| Internal APIs | Secret header validation |
| Webhooks | Signature verification |

### Database Security

- **RLS Enabled**: All tables have Row Level Security
- **Service Role**: Only used server-side for admin operations
- **Anon Key**: Limited to authenticated user's data

### Secret Rotation

1. **SCHEDULER_SECRET / SCHEDULER_REMINDERS_SECRET**:
   - Generate new secret
   - Update in Vercel
   - Redeploy

2. **STRIPE_WEBHOOK_SECRET**:
   - Create new webhook in Stripe
   - Update secret in Vercel
   - Delete old webhook

3. **OPENAI_API_KEY**:
   - Generate new key in OpenAI
   - Update in Vercel
   - Revoke old key

4. **Supabase Keys**:
   - Rotate via Supabase Dashboard → Settings → API
   - Update all related services

### Audit Trail

- All user actions logged in session tables
- AI calls logged in `ai_logs`
- Emails logged in `email_logs`
- Stripe events tracked via webhooks
- Workflow changes logged in `audit_log` (Phase 1+)

---

## Feature Update Systems (Phases 1-7)

### Workflow Versioning & Audit Log

**Tables**: `workflows`, `workflow_versions`, `audit_log`

- Workflows are never deleted, only versioned
- Every change creates a new version
- `audit_log` tracks all changes with actor info

**Monitoring**:
```sql
-- Recent audit entries
SELECT * FROM audit_log 
ORDER BY created_at DESC 
LIMIT 50;

-- Workflow version history
SELECT w.display_name, wv.version_number, wv.created_at, wv.created_by_type
FROM workflows w
JOIN workflow_versions wv ON w.id = wv.workflow_id
ORDER BY wv.created_at DESC;
```

### Workflow Overrides & Owner Notes

**Tables**: `workflow_overrides`, `owner_notes`

- Overrides layer human corrections on top of AI versions
- Notes provide contextual information with visibility controls

**Health Check**:
```sql
-- Active overrides
SELECT COUNT(*) FROM workflow_overrides WHERE status = 'active';

-- Recent notes
SELECT note_type, COUNT(*) FROM owner_notes 
WHERE is_active = true 
GROUP BY note_type;
```

### Workflow Variants & Friction Tracking

**Tables**: `workflow_variants`, `workflow_variant_dot_links`

- Variants track different ways people do the same process
- `is_allowed = false` indicates friction points

**Metrics**:
```sql
-- Friction ratio by workflow
SELECT 
  w.display_name,
  COUNT(*) FILTER (WHERE wv.is_allowed = false) as friction_count,
  COUNT(*) as total_variants,
  ROUND(COUNT(*) FILTER (WHERE wv.is_allowed = false)::numeric / COUNT(*) * 100, 2) as friction_pct
FROM workflows w
LEFT JOIN workflow_variants wv ON w.id = wv.workflow_id
GROUP BY w.id, w.display_name;
```

### Multi-Language Translation

**Location**: `src/lib/utils/translation.ts`

**How It Works**:
1. Employee sets preferred language in profile
2. AI responds in that language
3. Answer is stored with both `raw_text` and `translated_text_en`
4. Analytics always use English translation

**Supported Languages**: en, es, fr, de, pt, it, nl, pl, ja, zh, ko

**Troubleshooting Translation Failures**:
- Check OpenAI API status
- Verify `OPENAI_API_KEY` is valid
- Check `answers` table for missing `translated_text_en`

```sql
-- Find answers missing translations
SELECT id, language_code, raw_text 
FROM answers 
WHERE language_code != 'en' 
  AND translated_text_en IS NULL;
```

### Team Health Metrics

**Table**: `team_health_metrics`

**Metrics Computed**:
| Metric | Description | Source |
|--------|-------------|--------|
| participation_rate | % of members with check-ins | Sessions/members count |
| friction_index | Friction variants ratio | workflow_variants |
| sentiment_score | Overall mood (0-100) | Pulse agent output |
| focus_score | Priority clarity (0-100) | Focus Tracker output |
| workload_score | Work distribution (0-100) | Pulse agent output |
| burnout_risk_score | Stress indicators (0-100) | Pulse agent output |

**Time Windows**: week, month, quarter

**Manual Computation**:
```bash
# Trigger via API (admin only)
curl -X POST https://your-app.vercel.app/api/admin/team-health \
  -H "Cookie: [session cookie]" \
  -H "Content-Type: application/json" \
  -d '{"time_window": "week"}'
```

**Monitoring**:
```sql
-- Recent metrics by department
SELECT 
  d.name as department,
  thm.time_window_start,
  thm.participation_rate,
  thm.friction_index,
  thm.risk_level
FROM team_health_metrics thm
JOIN departments d ON thm.department_id = d.id
ORDER BY thm.time_window_start DESC
LIMIT 20;
```

### Pattern Alerts

**Table**: `pattern_alerts`

**Alert Types**:
| Type | Trigger Threshold |
|------|------------------|
| low_participation | <50% |
| high_friction | >40% |
| sentiment_drop | >15 point drop |
| workload_spike | >20 point increase |
| burnout_risk | >70 score |
| focus_drift | >20 point drop |
| process_variance | >30% friction variants |

**Alert Lifecycle**: open → acknowledged → resolved/dismissed

**Monitoring**:
```sql
-- Open alerts by severity
SELECT severity, COUNT(*) 
FROM pattern_alerts 
WHERE status = 'open'
GROUP BY severity;

-- Alert volume trend
SELECT 
  DATE_TRUNC('day', created_at) as day,
  COUNT(*)
FROM pattern_alerts
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;
```

### Privacy Controls

**Tables**: Organizations (privacy columns), `user_consents`, `data_export_requests`, `archived_data_log`

**Privacy Settings** (in `organizations` table):
- `allow_free_text_sentiment` - Enable mood analysis
- `allow_translation` - Enable auto-translation
- `data_retention_days` - Auto-archive old data
- `employee_can_mark_private` - Let employees mark answers private
- `privacy_notice_enabled` / `privacy_notice_text` - Custom notice

**GDPR Compliance**:
- Data export requests tracked in `data_export_requests`
- Consent tracked in `user_consents`
- Archived data logged in `archived_data_log`

**Data Retention Check**:
```sql
-- Organizations with retention configured
SELECT name, data_retention_days 
FROM organizations 
WHERE data_retention_days IS NOT NULL;

-- Pending export requests
SELECT * FROM data_export_requests 
WHERE status = 'pending';
```

### Feature Flags

**Location**: `src/lib/config/feature-flags.ts`

All Phase 1-7 features are enabled by default. To disable a feature:

```typescript
// In src/lib/config/feature-flags.ts
export const FEATURE_FLAGS = {
  // ...
  PATTERN_ALERTS: false, // Disable alerts
  // ...
}
```

Use in code:
```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags'

if (isFeatureEnabled('PATTERN_ALERTS')) {
  // Show alerts UI
}
```

---

## Quick Reference Commands

```bash
# Check deployment status
vercel ls

# View logs
vercel logs your-deployment-url

# Check environment variables
vercel env ls

# Force redeploy
vercel --force --prod

# Database query via Supabase CLI
supabase db execute --sql "SELECT COUNT(*) FROM organizations;"
```

---

*Last updated: November 28, 2025*
