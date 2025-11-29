/**
 * @file src/app/api/admin/team-health/route.ts
 * @description API route for team health metrics (Phase 5)
 * 
 * AI AGENT INSTRUCTIONS:
 * - GET: Returns latest team health metrics for the user's org
 * - POST: Triggers metric computation for the org
 * - Requires admin/owner role
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLatestTeamHealthMetrics, computeTeamHealthMetrics, TimeWindow } from '@/lib/utils/team-health'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org membership
    const { data: member } = await supabase
      .from('organization_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .maybeSingle()

    if (!member) {
      return NextResponse.json({ error: 'Forbidden - admin access required' }, { status: 403 })
    }

    // Get latest metrics
    const metrics = await getLatestTeamHealthMetrics(member.org_id)

    // Get department names for display
    const { data: departments } = await supabase
      .from('departments')
      .select('id, name')
      .eq('org_id', member.org_id)

    const departmentMap = new Map(departments?.map((d: { id: string; name: string }) => [d.id, d.name]) || [])

    // Enrich metrics with department names
    const enrichedMetrics = metrics.map(m => ({
      ...m,
      department_name: m.department_id ? departmentMap.get(m.department_id) || 'Unknown' : 'Organization-wide'
    }))

    return NextResponse.json({ 
      metrics: enrichedMetrics,
      org_id: member.org_id
    })
  } catch (error) {
    console.error('Error fetching team health metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's org membership
    const { data: member } = await supabase
      .from('organization_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .maybeSingle()

    if (!member) {
      return NextResponse.json({ error: 'Forbidden - admin access required' }, { status: 403 })
    }

    // Parse request body for options
    let windowType: TimeWindow = 'week'
    try {
      const body = await request.json()
      if (body.window_type && ['week', 'month', 'quarter'].includes(body.window_type)) {
        windowType = body.window_type as TimeWindow
      }
    } catch {
      // Use default if no body or invalid JSON
    }

    // Compute metrics
    const metrics = await computeTeamHealthMetrics(member.org_id, windowType)

    // Get department names for display
    const { data: departments } = await supabase
      .from('departments')
      .select('id, name')
      .eq('org_id', member.org_id)

    const departmentMap = new Map(departments?.map((d: { id: string; name: string }) => [d.id, d.name]) || [])

    // Enrich metrics with department names
    const enrichedMetrics = metrics.map(m => ({
      ...m,
      department_name: m.department_id ? departmentMap.get(m.department_id) || 'Unknown' : 'Organization-wide'
    }))

    return NextResponse.json({ 
      metrics: enrichedMetrics,
      computed: true,
      window_type: windowType
    })
  } catch (error) {
    console.error('Error computing team health metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
