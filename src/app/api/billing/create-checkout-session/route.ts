/**
 * Create Checkout Session API
 * 
 * Creates a Stripe checkout session for subscription purchases.
 * Requires authenticated owner/admin.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, STRIPE_BASE_PRICE_ID, STRIPE_SEAT_PRICE_ID, getAppUrl, isStripeConfigured } from '@/lib/stripe/client'

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

    // Handle Supabase FK relation - can return array
    const orgRaw = membership.organizations as unknown
    const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as { id: string; name: string; stripe_customer_id: string | null }
    
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }
    const appUrl = getAppUrl()

    // Count ACTIVE organization members for per-seat pricing
    const { count: memberCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('status', 'active')
    
    const seatCount = memberCount || 1 // Minimum 1 seat

    // Create or retrieve Stripe customer
    let customerId = org.stripe_customer_id

    if (!customerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: {
          org_id: org.id,
          user_id: user.id,
        },
      })
      customerId = customer.id

      // Save the customer ID to the organization
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', org.id)
    }

    // Create checkout session with both base fee and per-seat pricing
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          // Base organization fee: $29/month
          price: STRIPE_BASE_PRICE_ID,
          quantity: 1,
        },
        {
          // Per-seat fee: $3/user/month
          price: STRIPE_SEAT_PRICE_ID,
          quantity: seatCount,
        },
      ],
      success_url: `${appUrl}/admin/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${appUrl}/admin/billing?canceled=true`,
      metadata: {
        org_id: org.id,
        seat_count: seatCount.toString(),
      },
      subscription_data: {
        metadata: {
          org_id: org.id,
          seat_count: seatCount.toString(),
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout session error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session. Please try again.' },
      { status: 500 }
    )
  }
}
