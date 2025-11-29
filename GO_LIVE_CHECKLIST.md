# VizDots Go-Live Checklist

> **CRITICAL**: Complete ALL items before deploying to production. This is the final verification before launch.

---

## Pre-Launch Status

| Category | Status |
|----------|--------|
| Code Complete | ✅ All 12 phases done |
| Tests Passing | ⬜ Verify |
| Environment Setup | ⬜ Configure |
| Integrations | ⬜ Test |
| Security | ⬜ Audit |
| Legal | ⬜ Review |

---

## 1. Code & Build Verification

### 1.1 Build Check
- [ ] `npm run build` completes without errors
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No ESLint warnings/errors (`npm run lint`)

### 1.2 Test Suite
- [ ] Unit tests pass (`npm run test`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Manual test script completed (see MANUAL_TEST_SCRIPT.md)

### 1.3 Code Review
- [ ] All changes committed to Git
- [ ] Latest commit pushed to GitHub
- [ ] No sensitive data in codebase (secrets, API keys)
- [ ] `.env.example` is up to date

---

## 2. Database (Supabase)

### 2.1 Migrations Applied
- [ ] 001_initial_schema.sql
- [ ] 002_agents_sessions.sql
- [ ] 003_user_profiles.sql
- [ ] 004_rls_policies.sql
- [ ] 005_seed_agents.sql
- [ ] 006_fix_org_creation_rls.sql
- [ ] 007_complete_rls_setup.sql
- [ ] 008_schedule_settings.sql
- [ ] 009_enhanced_onboarding.sql
- [ ] 010_subscription_trial.sql
- [ ] 011_ai_logs.sql
- [ ] 012_scheduler_idempotence.sql
- [ ] 013_email_logs.sql

### 2.2 Database Verification
- [ ] All tables exist with correct schema
- [ ] RLS policies enabled on all tables
- [ ] 5 AI agents seeded in `agents` table
- [ ] No test data in production database

### 2.3 Backup Configuration
- [ ] Daily backups enabled (Supabase Pro plan)
- [ ] Backup retention period set
- [ ] Test restore procedure documented

---

## 3. Vercel Configuration

### 3.1 Environment Variables Set
```
Required variables (check each is set):
```
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `SCHEDULER_SECRET`
- [ ] `SCHEDULER_REMINDERS_SECRET`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_BASE_PRICE_ID`
- [ ] `STRIPE_SEAT_PRICE_ID`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `AWS_SES_ACCESS_KEY_ID`
- [ ] `AWS_SES_SECRET_ACCESS_KEY`
- [ ] `AWS_SES_REGION`
- [ ] `EMAIL_FROM`

### 3.2 Cron Jobs Configured
- [ ] `/api/internal/scheduler` - Daily at 8 AM UTC
- [ ] `/api/internal/reminders` - 9 AM & 2 PM UTC, Mon-Fri
- [ ] Cron jobs visible in Vercel Dashboard

### 3.3 Domain Configuration
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] DNS records correct

### 3.4 Deployment Settings
- [ ] Production branch set to `main`
- [ ] Build command: `npm run build`
- [ ] Output directory: `.next`
- [ ] Node.js version: 18.x or 20.x

---

## 4. Stripe Billing

### 4.1 Products & Prices Created
- [ ] Base product created ($29/month)
- [ ] Per-seat product created ($3/month per user)
- [ ] Both prices are **recurring** (not one-time)
- [ ] Price IDs copied to Vercel environment variables

### 4.2 Webhook Configuration
- [ ] Webhook endpoint: `https://your-domain.com/api/billing/webhook`
- [ ] Events enabled:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.paid`
  - [ ] `invoice.payment_failed`
- [ ] Webhook secret copied to `STRIPE_WEBHOOK_SECRET`
- [ ] Test webhook with Stripe CLI or dashboard

### 4.3 Customer Portal
- [ ] Customer portal enabled in Stripe Dashboard
- [ ] Cancellation policy configured
- [ ] Invoice history enabled

### 4.4 Test Transactions
- [ ] Test checkout flow with test card (4242 4242 4242 4242)
- [ ] Verify subscription created in Stripe Dashboard
- [ ] Verify `organizations` table updated with Stripe IDs
- [ ] Test customer portal access

---

## 5. AWS SES Email

### 5.1 Domain Verification
- [ ] Domain verified in AWS SES
- [ ] DKIM records added to DNS
- [ ] SPF record configured
- [ ] DMARC record configured (recommended)

### 5.2 Production Access
- [ ] Out of SES sandbox (production access granted)
- [ ] Sending limits appropriate for expected volume
- [ ] Bounce/complaint notifications configured

### 5.3 Email Testing
- [ ] Test email sends successfully
- [ ] Email renders correctly
- [ ] Links in email work
- [ ] Unsubscribe mechanism (if required)

---

## 6. OpenAI

### 6.1 API Configuration
- [ ] API key valid and not expired
- [ ] Usage limits set in OpenAI dashboard
- [ ] Billing configured in OpenAI

### 6.2 Testing
- [ ] AI Test Lab returns valid responses
- [ ] All 5 agents respond correctly
- [ ] Response times acceptable (<10s)

---

## 7. Security Audit

### 7.1 Authentication
- [ ] Password requirements enforced
- [ ] Session tokens expire appropriately
- [ ] Invite links expire after use

### 7.2 Authorization
- [ ] RLS policies tested for all tables
- [ ] Admin-only routes protected
- [ ] API routes require authentication

### 7.3 Secrets
- [ ] All secrets are unique (not copied from examples)
- [ ] SCHEDULER_SECRET ≠ SCHEDULER_REMINDERS_SECRET
- [ ] No secrets in client-side code
- [ ] No secrets in Git history

### 7.4 Data Protection
- [ ] HTTPS enforced (Vercel default)
- [ ] Sensitive data encrypted at rest (Supabase default)
- [ ] No PII in logs

---

## 8. Monitoring Setup

### 8.1 Vercel Monitoring
- [ ] Function logs accessible
- [ ] Error tracking enabled
- [ ] Cron job monitoring active

### 8.2 Alerting (Optional but Recommended)
- [ ] Email alerts for deployment failures
- [ ] Alerts for high error rates
- [ ] Alerts for cron job failures

### 8.3 Health Checks
- [ ] Landing page loads (/)
- [ ] Login page loads (/auth/login)
- [ ] Admin dashboard loads (/admin)
- [ ] API responds (/api/sessions)

---

## 9. Legal & Compliance

### 9.1 Required Pages
- [ ] Privacy Policy page/link
- [ ] Terms of Service page/link
- [ ] Cookie policy (if applicable)

### 9.2 Data Handling
- [ ] User data retention policy defined
- [ ] Data deletion process documented
- [ ] GDPR compliance (if applicable)

### 9.3 Billing Transparency
- [ ] Pricing clearly displayed
- [ ] Trial terms explained
- [ ] Cancellation policy documented

---

## 10. Final Verification

### 10.1 Full User Flow Test
- [ ] **New org owner signup**
  - [ ] Register new account
  - [ ] Complete 4-step wizard
  - [ ] Invite test employee
  
- [ ] **Employee flow**
  - [ ] Receive invite email
  - [ ] Set password
  - [ ] Complete onboarding
  - [ ] Complete check-in
  
- [ ] **Admin operations**
  - [ ] View dashboard
  - [ ] See employee's check-in
  - [ ] View analytics
  - [ ] Access billing page
  
- [ ] **Billing flow**
  - [ ] Start paid plan (test mode)
  - [ ] Verify subscription active
  - [ ] Access customer portal

### 10.2 Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### 10.3 Mobile Testing
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Touch targets work (44px minimum)

---

## 11. Go-Live Execution

### 11.1 Pre-Launch (1 hour before)
- [ ] Final Git push to main
- [ ] Verify Vercel deployment succeeded
- [ ] Run health checks
- [ ] Team notified of launch

### 11.2 Launch
- [ ] Announce launch
- [ ] Monitor Vercel logs for errors
- [ ] Monitor Supabase logs
- [ ] Check first few signups work

### 11.3 Post-Launch (First 24 hours)
- [ ] Monitor error rates
- [ ] Check cron jobs executed
- [ ] Verify emails sending
- [ ] Respond to any user issues

---

## Emergency Contacts

| Role | Contact |
|------|---------|
| Technical Lead | [Your contact] |
| Vercel Support | support@vercel.com |
| Supabase Support | support@supabase.io |
| Stripe Support | support@stripe.com |
| AWS Support | AWS Console |

---

## Rollback Plan

If critical issues discovered post-launch:

1. **Immediate**: Promote previous Vercel deployment
2. **Database**: Do NOT rollback unless data corruption
3. **Communication**: Notify users of temporary issues
4. **Investigation**: Check logs, identify root cause
5. **Fix**: Deploy fix, verify, re-launch

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product | | | |
| Founder | | | |

---

*Checklist version: 1.0.0*
*Last updated: November 28, 2025*
