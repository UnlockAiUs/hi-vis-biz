/**
 * @file src/app/api/admin/privacy/route.ts
 * @description API routes for managing org privacy settings
 * @ai-instruction This file handles privacy configuration for organizations
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org membership
    const { data: member } = await supabase
      .from('organization_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get org privacy settings
    const { data: org, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        allow_free_text_sentiment,
        allow_translation,
        data_retention_days,
        employee_can_mark_private,
        privacy_policy_url,
        data_processing_consent_required
      `)
      .eq('id', member.org_id)
      .single()

    if (error) {
      console.error('Error fetching org privacy settings:', error)
      return NextResponse.json({ error: 'Failed to fetch privacy settings' }, { status: 500 })
    }

    return NextResponse.json(org)
  } catch (error) {
    console.error('Privacy settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org membership
    const { data: member } = await supabase
      .from('organization_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      allow_free_text_sentiment,
      allow_translation,
      data_retention_days,
      employee_can_mark_private,
      privacy_policy_url,
      data_processing_consent_required
    } = body

    // Update org privacy settings
    const { data: updatedOrg, error } = await supabase
      .from('organizations')
      .update({
        allow_free_text_sentiment,
        allow_translation,
        data_retention_days,
        employee_can_mark_private,
        privacy_policy_url,
        data_processing_consent_required
      })
      .eq('id', member.org_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating org privacy settings:', error)
      return NextResponse.json({ error: 'Failed to update privacy settings' }, { status: 500 })
    }

    return NextResponse.json(updatedOrg)
  } catch (error) {
    console.error('Privacy settings PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
