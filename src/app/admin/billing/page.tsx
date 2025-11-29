/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/admin/billing/page.tsx
 * PURPOSE: Billing page showing subscription status, Stripe checkout, and billing portal
 * QUERIES: organization_members with organizations join for billing info
 */
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StartPlanButton, ManageBillingButton } from './BillingActions'

interface PageProps {
  searchParams: Promise<{ success?: string; canceled?: string; session_id?: string }>
}

export default async function BillingPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }
  
  // Get organization billing info
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organizations(id, name, trial_ends_at, trial_started_at, subscription_status, stripe_customer_id, stripe_subscription_id)')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .maybeSingle()
  
  const organizations = membership?.organizations as {
    id: string
    name: string
    trial_ends_at?: string
    trial_started_at?: string
    subscription_status?: string
    stripe_customer_id?: string
    stripe_subscription_id?: string
  } | {
    id: string
    name: string
    trial_ends_at?: string
    trial_started_at?: string
    subscription_status?: string
    stripe_customer_id?: string
    stripe_subscription_id?: string
  }[] | null
  
  const org = Array.isArray(organizations) ? organizations[0] : organizations
  
  // Get ACTIVE member count for per-seat pricing display
  let memberCount = 1
  if (org?.id) {
    const { count } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('status', 'active')
    memberCount = count || 1
  }
  
  // Calculate estimated monthly cost: $29 base + $3/user
  const baseFee = 29
  const perSeatFee = 3
  const estimatedMonthly = baseFee + (memberCount * perSeatFee)
  
  // Calculate trial info
  let trialDaysRemaining = 0
  let trialStartDate = ''
  let trialEndDate = ''
  
  if (org?.trial_ends_at) {
    const trialEnds = new Date(org.trial_ends_at)
    const now = new Date()
    trialDaysRemaining = Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    trialEndDate = trialEnds.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }
  
  if (org?.trial_started_at) {
    const trialStart = new Date(org.trial_started_at)
    trialStartDate = trialStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const subscriptionStatus = org?.subscription_status || 'trialing'
  const hasActiveSubscription = subscriptionStatus === 'active'
  const hasStripeCustomer = Boolean(org?.stripe_customer_id)
  const isTrialing = subscriptionStatus === 'trialing'
  const isPastDue = subscriptionStatus === 'past_due'
  const isCanceled = subscriptionStatus === 'canceled'

  // Status badge styling
  const getStatusBadge = () => {
    switch (subscriptionStatus) {
      case 'active':
        return { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' }
      case 'trialing':
        return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Trial' }
      case 'past_due':
        return { bg: 'bg-red-100', text: 'text-red-800', label: 'Past Due' }
      case 'canceled':
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Canceled' }
      case 'expired':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Expired' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', label: subscriptionStatus }
    }
  }

  const statusBadge = getStatusBadge()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Success/Cancel Alerts */}
      {params.success === 'true' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-green-800">Payment successful!</h3>
              <p className="mt-1 text-sm text-green-700">
                Your subscription is now active. Thank you for subscribing to VizDots!
              </p>
            </div>
          </div>
        </div>
      )}

      {params.canceled === 'true' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Checkout canceled</h3>
              <p className="mt-1 text-sm text-yellow-700">
                No worries! You can start your subscription whenever you're ready.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Past Due Warning */}
      {isPastDue && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Payment past due</h3>
              <p className="mt-1 text-sm text-red-700">
                Please update your payment method to continue using VizDots.
              </p>
              <div className="mt-3">
                <ManageBillingButton />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Current Plan</h2>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {hasActiveSubscription ? 'VizDots Team Plan' : 'Free Trial'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {hasActiveSubscription 
                  ? `$${estimatedMonthly}/month (${memberCount} ${memberCount === 1 ? 'user' : 'users'})`
                  : trialDaysRemaining > 0 
                    ? `${trialDaysRemaining} days remaining in your trial`
                    : 'Trial expired'}
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                {statusBadge.label}
              </span>
            </div>
          </div>
          
          {/* Trial dates for trial users */}
          {isTrialing && trialStartDate && trialEndDate && (
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Trial Started</p>
                <p className="font-medium text-gray-900">{trialStartDate}</p>
              </div>
              <div>
                <p className="text-gray-500">Trial Ends</p>
                <p className="font-medium text-gray-900">{trialEndDate}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            {hasActiveSubscription ? (
              <ManageBillingButton />
            ) : (
              <StartPlanButton />
            )}
            
            {hasStripeCustomer && !hasActiveSubscription && (
              <ManageBillingButton />
            )}
          </div>
        </div>
      </div>

      {/* What's Included */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">What's Included</h2>
        </div>
        <div className="px-6 py-5">
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">$29</span>
              <span className="text-gray-500">/month base</span>
              <span className="text-gray-400">+</span>
              <span className="text-2xl font-bold text-gray-900">$3</span>
              <span className="text-gray-500">/user/month</span>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Your estimated cost:</span>{' '}
                ${baseFee} base + ({memberCount} users × ${perSeatFee}) = <span className="font-bold">${estimatedMonthly}/month</span>
              </p>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-gray-600">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Unlimited AI-powered check-ins (dots)
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                All 5 AI agents (Pulse, Role Mapper, Workflow Mapper, Pain Scanner, Focus Tracker)
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Workflow insights and department analytics
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Early warning signals for team health
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Automated email reminders
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Evolving employee profiles
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Frequently Asked Questions</h2>
        </div>
        <div className="px-6 py-5 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-900">How does billing work?</h3>
            <p className="mt-1 text-sm text-gray-500">
              You'll be billed monthly on the date you subscribe. You can cancel anytime.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">What happens when my trial ends?</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your team will lose access to check-ins until you start a paid subscription. Your data will be preserved.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">Can I cancel anytime?</h3>
            <p className="mt-1 text-sm text-gray-500">
              Yes! Cancel anytime from the billing portal. You'll continue to have access until the end of your billing period.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">Need help?</h3>
            <p className="mt-1 text-sm text-gray-500">
              Contact us at{' '}
              <a href="mailto:support@vizdots.com" className="text-blue-600 hover:text-blue-700">
                support@vizdots.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Back to Dashboard */}
      <div className="text-center">
        <Link 
          href="/admin" 
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
