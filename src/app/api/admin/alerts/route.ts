/**
 * @file src/app/api/admin/alerts/route.ts
 * @description API routes for Pattern Alerts - GET list, PATCH update status
 * @ai-context Part of Phase 6 Manager Coaching Layer. Handles alert retrieval and status updates.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAlerts, updateAlertStatus } from '@/lib/utils/alert-rules'

/**
 * GET /api/admin/alerts
 * Returns all open alerts for the user's organization
 * Query params:
 * - department_id: (optional) Filter by department
 * - status: (optional) Filter by status (default: 'open')
 * - include_resolved: (optional) Include resolved/dismissed alerts
 */
export async function GET(request: Request) {
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

    if (!member) {
      return NextResponse.json({ error: 'Not a member of any organization' }, { status: 403 })
    }

    if (!['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('department_id')
    const includeResolved = searchParams.get('include_resolved') === 'true'

    // Build query based on params
    let query = supabase
      .from('pattern_alerts')
      .select(`
        *,
        department:departments(id, name)
      `)
      .eq('org_id', member.org_id)
      .order('severity', { ascending: false })
      .order('created_at', { ascending: false })

    if (!includeResolved) {
      query = query.in('status', ['open', 'acknowledged'])
    }

    if (departmentId) {
      query = query.eq('department_id', departmentId)
    }

    const { data: alerts, error } = await query

    if (error) {
      console.error('Error fetching alerts:', error)
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }

    // Transform data to handle Supabase FK array issue
    const transformedAlerts = (alerts || []).map((alert: Record<string, unknown>) => {
      const deptRaw = alert.department as unknown
      const department = Array.isArray(deptRaw) ? deptRaw[0] : deptRaw
      return {
        ...alert,
        department
      }
    })

    // Get summary stats
    const stats = {
      total: transformedAlerts.length,
      critical: transformedAlerts.filter((a: Record<string, unknown>) => a.severity === 'critical' && a.status === 'open').length,
      warning: transformedAlerts.filter((a: Record<string, unknown>) => a.severity === 'warning' && a.status === 'open').length,
      acknowledged: transformedAlerts.filter((a: Record<string, unknown>) => a.status === 'acknowledged').length
    }

    return NextResponse.json({ alerts: transformedAlerts, stats })
  } catch (error) {
    console.error('Error in GET /api/admin/alerts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/alerts
 * Update alert status (acknowledge, resolve, dismiss)
 * Body: { alert_id, status, note? }
 */
export async function PATCH(request: Request) {
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

    if (!member) {
      return NextResponse.json({ error: 'Not a member of any organization' }, { status: 403 })
    }

    if (!['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { alert_id, status, note } = body

    if (!alert_id || !status) {
      return NextResponse.json({ error: 'alert_id and status are required' }, { status: 400 })
    }

    if (!['acknowledged', 'resolved', 'dismissed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Verify alert belongs to user's org
    const { data: alert } = await supabase
      .from('pattern_alerts')
      .select('org_id')
      .eq('id', alert_id)
      .maybeSingle()

    if (!alert || alert.org_id !== member.org_id) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    const result = await updateAlertStatus(alert_id, status, user.id, note)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/admin/alerts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
