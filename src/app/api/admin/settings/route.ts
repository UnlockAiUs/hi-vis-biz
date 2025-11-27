/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/api/admin/settings/route.ts
 * PURPOSE: API endpoint to update organization settings (name, timezone, schedule)
 * EXPORTS: PATCH handler
 * 
 * KEY LOGIC:
 * - Only organization owners can update settings
 * - Supports updating: name, timezone, schedule_config
 * - Uses service role client to bypass RLS for organization updates
 */

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Use service role to bypass RLS for organization updates
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PATCH /api/admin/settings - Update organization settings
export async function PATCH(request: Request) {
  const supabase = await createServerClient()
  
  // Verify user is authenticated and is owner
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Check if user is owner of an org
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .single()
  
  if (memberError || !membership) {
    return NextResponse.json({ error: 'Only owners can update organization settings' }, { status: 403 })
  }
  
  const body = await request.json()
  const { name, timezone, schedule_config } = body
  
  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {}
  
  if (name !== undefined) {
    updateData.name = name.trim()
  }
  
  if (timezone !== undefined) {
    updateData.timezone = timezone
  }
  
  if (schedule_config !== undefined) {
    updateData.schedule_config = schedule_config
  }
  
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }
  
  // Use service role to update (bypasses RLS)
  const { error: updateError } = await supabaseAdmin
    .from('organizations')
    .update(updateData)
    .eq('id', membership.org_id)
  
  if (updateError) {
    console.error('Error updating organization:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }
  
  return NextResponse.json({ success: true })
}
