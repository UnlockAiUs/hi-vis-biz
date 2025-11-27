-- Migration: 010_subscription_trial.sql
-- Description: Add trial and subscription tracking to organizations
-- Created: 2025-11-26
-- Purpose: Support 30-day free trial and prepare for Stripe billing integration

-- Billing Model:
-- - $10/month base (includes 1 user)
-- - $2/user/month for additional users
-- - 30-day free trial (full features, no limits)

-- Add trial and subscription fields to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');

-- Subscription status: trialing (30-day trial), active (paid), past_due (payment failed), canceled (user canceled), expired (trial ended, not paid)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trialing';

-- Add check constraint for subscription_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_subscription_status_check'
  ) THEN
    ALTER TABLE organizations
    ADD CONSTRAINT organizations_subscription_status_check
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'expired'));
  END IF;
END $$;

-- Stripe integration fields (for future use)
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

-- Index for subscription queries (e.g., finding expired trials)
CREATE INDEX IF NOT EXISTS idx_org_subscription_status ON organizations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_org_trial_ends ON organizations(trial_ends_at);

-- Add comments explaining the new columns
COMMENT ON COLUMN organizations.trial_started_at IS 'When the 30-day free trial started';
COMMENT ON COLUMN organizations.trial_ends_at IS 'When the 30-day free trial ends';
COMMENT ON COLUMN organizations.subscription_status IS 'Current subscription state: trialing, active, past_due, canceled, expired';
COMMENT ON COLUMN organizations.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN organizations.stripe_subscription_id IS 'Stripe subscription ID for recurring billing';

-- Update existing organizations to be in trial (for any existing orgs without status)
UPDATE organizations
SET 
  trial_started_at = COALESCE(trial_started_at, created_at),
  trial_ends_at = COALESCE(trial_ends_at, created_at + INTERVAL '30 days'),
  subscription_status = COALESCE(subscription_status, 'trialing')
WHERE trial_started_at IS NULL OR trial_ends_at IS NULL OR subscription_status IS NULL;
