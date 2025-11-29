/**
 * Stripe Webhook Handler
 * 
 * Handles subscription lifecycle events from Stripe.
 * Updates organization subscription status accordingly.
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

// Use service role for webhook operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('Missing Stripe signature')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('Webhook secret not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log(`Received Stripe event: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orgId = session.metadata?.org_id
  if (!orgId) {
    console.error('No org_id in checkout session metadata')
    return
  }

  console.log(`Checkout completed for org: ${orgId}`)

  // Get the subscription details
  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    )

    await updateOrganizationSubscription(orgId, subscription)
  }
}

/**
 * Handle subscription created/updated
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata?.org_id
  if (!orgId) {
    // Try to find org by customer ID
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('stripe_customer_id', subscription.customer as string)
      .single()

    if (org) {
      await updateOrganizationSubscription(org.id, subscription)
    } else {
      console.error('Could not find org for subscription:', subscription.id)
    }
    return
  }

  await updateOrganizationSubscription(orgId, subscription)
}

/**
 * Handle subscription deleted/canceled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata?.org_id

  if (!orgId) {
    // Try to find org by customer ID
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('stripe_customer_id', subscription.customer as string)
      .single()

    if (org) {
      await updateOrganizationStatus(org.id, 'canceled')
    }
    return
  }

  await updateOrganizationStatus(orgId, 'canceled')
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (org) {
    await updateOrganizationStatus(org.id, 'past_due')
    console.log(`Payment failed for org: ${org.id}`)
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  
  const { data: org } = await supabase
    .from('organizations')
    .select('id, subscription_status')
    .eq('stripe_customer_id', customerId)
    .single()

  if (org && org.subscription_status === 'past_due') {
    await updateOrganizationStatus(org.id, 'active')
    console.log(`Payment succeeded, restoring org: ${org.id}`)
  }
}

/**
 * Update organization subscription details
 */
async function updateOrganizationSubscription(
  orgId: string,
  subscription: Stripe.Subscription
) {
  const status = mapStripeStatus(subscription.status)

  const { error } = await supabase
    .from('organizations')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: status,
      subscription_started_at: subscription.status === 'active' 
        ? new Date().toISOString() 
        : null,
    })
    .eq('id', orgId)

  if (error) {
    console.error('Error updating organization subscription:', error)
    throw error
  }

  console.log(`Updated org ${orgId} subscription status to: ${status}`)
}

/**
 * Update organization subscription status only
 */
async function updateOrganizationStatus(
  orgId: string,
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'expired'
) {
  const { error } = await supabase
    .from('organizations')
    .update({ subscription_status: status })
    .eq('id', orgId)

  if (error) {
    console.error('Error updating organization status:', error)
    throw error
  }

  console.log(`Updated org ${orgId} status to: ${status}`)
}

/**
 * Map Stripe subscription status to our status
 */
function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): 'active' | 'past_due' | 'canceled' | 'trialing' | 'expired' {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'unpaid':
      return 'canceled'
    case 'trialing':
      return 'trialing'
    case 'incomplete':
    case 'incomplete_expired':
      return 'expired'
    default:
      return 'expired'
  }
}
