/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/app/api/admin/workflows/variants/route.ts
 * PURPOSE: API for managing workflow variants - marking as OK vs friction
 * EXPORTS: GET (list variants), POST (create variant), PATCH (classify variant)
 * 
 * LOGIC:
 * - GET: List variants for a workflow
 * - POST: Create a new variant (AI or manual)
 * - PATCH: Classify a variant as OK (is_allowed=true) or friction (is_allowed=false)
 * 
 * TABLES: workflow_variants, workflow_variant_dot_links, audit_log
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/workflows/variants?workflow_id=xxx
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workflowId = searchParams.get('workflow_id')

  if (!workflowId) {
    return NextResponse.json({ error: 'workflow_id is required' }, { status: 400 })
  }

  // Verify user has access to this workflow's org
  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'No organization membership found' }, { status: 403 })
  }

  // Verify workflow belongs to user's org
  const { data: workflow } = await supabase
    .from('workflows')
    .select('id, org_id')
    .eq('id', workflowId)
    .eq('org_id', membership.org_id)
    .single()

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  // Get variants for this workflow
  const { data: variants, error } = await supabase
    .from('workflow_variants')
    .select(`
      id,
      variant_key,
      description,
      is_allowed,
      notes,
      source,
      classified_at,
      details,
      created_at,
      updated_at
    `)
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching variants:', error)
    return NextResponse.json({ error: 'Failed to fetch variants' }, { status: 500 })
  }

  // Define variant type
  type VariantRow = {
    id: string
    variant_key: string
    description: string | null
    is_allowed: boolean | null
    notes: string | null
    source: string
    classified_at: string | null
    details: Record<string, unknown>
    created_at: string
    updated_at: string
  }

  // Get dot counts per variant
  const variantIds = (variants || []).map((v: VariantRow) => v.id)
  let variantDotCounts: Record<string, number> = {}

  if (variantIds.length > 0) {
    const { data: dotLinks } = await supabase
      .from('workflow_variant_dot_links')
      .select('variant_id')
      .in('variant_id', variantIds)

    if (dotLinks) {
      variantDotCounts = dotLinks.reduce((acc: Record<string, number>, link: { variant_id: string }) => {
        acc[link.variant_id] = (acc[link.variant_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }

  // Enrich variants with dot counts
  const enrichedVariants = (variants || []).map((v: VariantRow) => ({
    ...v,
    dot_count: variantDotCounts[v.id] || 0
  }))

  return NextResponse.json({ 
    variants: enrichedVariants,
    summary: {
      total: enrichedVariants.length,
      unclassified: enrichedVariants.filter((v: VariantRow & { dot_count: number }) => v.is_allowed === null).length,
      allowed: enrichedVariants.filter((v: VariantRow & { dot_count: number }) => v.is_allowed === true).length,
      friction: enrichedVariants.filter((v: VariantRow & { dot_count: number }) => v.is_allowed === false).length
    }
  })
}

// POST /api/admin/workflows/variants
// Body: { workflow_id, variant_key, description?, notes?, source?, details? }
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { workflow_id, variant_key, description, notes, source = 'owner', details = {} } = body

  if (!workflow_id || !variant_key) {
    return NextResponse.json({ error: 'workflow_id and variant_key are required' }, { status: 400 })
  }

  // Verify user is admin/owner
  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // Verify workflow belongs to user's org
  const { data: workflow } = await supabase
    .from('workflows')
    .select('id, org_id')
    .eq('id', workflow_id)
    .eq('org_id', membership.org_id)
    .single()

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
  }

  // Create the variant
  const { data: variant, error } = await supabase
    .from('workflow_variants')
    .insert({
      workflow_id,
      variant_key,
      description,
      notes,
      source,
      details
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json({ error: 'Variant with this key already exists for this workflow' }, { status: 409 })
    }
    console.error('Error creating variant:', error)
    return NextResponse.json({ error: 'Failed to create variant' }, { status: 500 })
  }

  return NextResponse.json({ variant }, { status: 201 })
}

// PATCH /api/admin/workflows/variants
// Body: { variant_id, is_allowed: boolean, notes?: string }
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { variant_id, is_allowed, notes } = body

  if (!variant_id || typeof is_allowed !== 'boolean') {
    return NextResponse.json({ error: 'variant_id and is_allowed (boolean) are required' }, { status: 400 })
  }

  // Verify user is admin/owner
  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // Verify variant exists and belongs to user's org
  const { data: existingVariant } = await supabase
    .from('workflow_variants')
    .select(`
      id,
      workflow_id,
      workflow:workflows(org_id)
    `)
    .eq('id', variant_id)
    .single()

  if (!existingVariant) {
    return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workflowRaw = existingVariant.workflow as any
  const workflowOrgId = Array.isArray(workflowRaw) ? workflowRaw[0]?.org_id : workflowRaw?.org_id

  if (workflowOrgId !== membership.org_id) {
    return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
  }

  // Update the variant
  const updateData: {
    is_allowed: boolean
    classified_by_user_id: string
    classified_at: string
    notes?: string
  } = {
    is_allowed,
    classified_by_user_id: user.id,
    classified_at: new Date().toISOString()
  }

  if (notes !== undefined) {
    updateData.notes = notes
  }

  const { data: variant, error } = await supabase
    .from('workflow_variants')
    .update(updateData)
    .eq('id', variant_id)
    .select()
    .single()

  if (error) {
    console.error('Error updating variant:', error)
    return NextResponse.json({ error: 'Failed to update variant' }, { status: 500 })
  }

  return NextResponse.json({ 
    variant,
    message: is_allowed ? 'Variant marked as acceptable' : 'Variant marked as friction'
  })
}
