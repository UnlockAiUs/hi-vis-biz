/**
 * Stripe Client Configuration
 * 
 * This module provides a configured Stripe client for server-side operations.
 * Only use this on the server side - never expose the secret key to the client.
 */

import Stripe from 'stripe'

// Validate environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Warning: STRIPE_SECRET_KEY is not set. Stripe operations will fail.')
}

// Create and export the Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

// Export price IDs for the Team Plan
// Base fee: $29/month for the organization
export const STRIPE_BASE_PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_1SYar2C2yoKDb4XmlvWbwXTY'
// Per-seat fee: $3/user/month
export const STRIPE_SEAT_PRICE_ID = process.env.STRIPE_SEAT_PRICE_ID || 'price_1SYbH1C2yoKDb4XmBZQzpKxt'

// Legacy alias for backward compatibility
export const STRIPE_PRICE_ID = STRIPE_BASE_PRICE_ID

// Helper to check if Stripe is configured
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

// Helper to get the app URL for redirect URLs
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}
