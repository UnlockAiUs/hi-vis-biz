import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function BillingPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }
  
  // Get organization trial info
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organizations(name, trial_ends_at, trial_started_at, subscription_status)')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .maybeSingle()
  
  const org = membership?.organizations as {
    name: string
    trial_ends_at?: string
    trial_started_at?: string
    subscription_status?: string
  } | null
  
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Current Plan</h2>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {org?.subscription_status === 'trialing' ? 'Free Trial' : 'Free Trial'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {trialDaysRemaining > 0 
                  ? `${trialDaysRemaining} days remaining`
                  : 'Trial expired'}
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                org?.subscription_status === 'trialing' 
                  ? 'bg-blue-100 text-blue-800' 
                  : org?.subscription_status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {org?.subscription_status === 'trialing' ? 'Trial' : org?.subscription_status || 'Trial'}
              </span>
            </div>
          </div>
          
          {trialStartDate && trialEndDate && (
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
        </div>
      </div>

      {/* Pricing Info */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Pricing</h2>
        </div>
        <div className="px-6 py-5">
          <div className="space-y-4">
            <div className="flex items-baseline">
              <span className="text-4xl font-bold text-gray-900">$10</span>
              <span className="ml-1 text-gray-500">/month base</span>
            </div>
            <p className="text-sm text-gray-600">
              Plus <span className="font-medium">$2/user/month</span> for additional users
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Unlimited AI check-ins
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                All 5 AI agents
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Department analytics
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Evolving employee profiles
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">Billing Integration Coming Soon</h3>
        <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
          We're integrating with Stripe to bring you seamless subscription management. 
          For now, enjoy your 30-day free trial with full access to all features!
        </p>
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
