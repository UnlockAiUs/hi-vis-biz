/**
 * Billing Portal API
 * 
 * Creates a Stripe customer portal session for managing subscriptions.
 * Requires authenticated owner/admin.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, getAppUrl, isStripeConfigured } from '@/lib/stripe/client'

export async function POST() {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Billing is not configured yet. Please contact support.' },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization membership
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('org_id, role, organizations(id, name, stripe_customer_id)')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .single()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'You must be an organization owner or admin to manage billing.' },
        { status: 403 }
      )
    }

    const org = membership.organizations as { id: string; name: string; stripe_customer_id: string | null }

    if (!org.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Please set up billing first.' },
        { status: 400 }
      )
    }

    const appUrl = getAppUrl()

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${appUrl}/admin/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Billing portal error:', error)
    return NextResponse.json(
      { error: 'Failed to open billing portal. Please try again.' },
      { status: 500 }
    )
  }
}
