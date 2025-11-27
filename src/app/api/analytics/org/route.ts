import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/analytics/org - Get organization-wide analytics
export async function GET() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Get user's organization membership (must be admin or owner)
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .single()
  
  if (memberError || !membership) {
    return NextResponse.json({ error: 'Not authorized to view analytics' }, { status: 403 })
  }
  
  const orgId = membership.org_id
  
  try {
    // Get all org members
    const { data: members } = await supabase
      .from('organization_members')
      .select('id, user_id')
      .eq('org_id', orgId)
    
    const memberIds = members?.map(m => m.id) || []
    const userIds = members?.map(m => m.user_id) || []
    
    // Get completed sessions count
    const { count: completedSessions } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .in('member_id', memberIds)
      .eq('status', 'completed')
    
    // Get pending sessions count
    const { count: pendingSessions } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .in('member_id', memberIds)
      .eq('status', 'pending')
    
    // Get total sessions this week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const { count: sessionsThisWeek } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .in('member_id', memberIds)
      .gte('created_at', weekAgo.toISOString())
    
    // Get user profiles for morale/workload data
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('profile_json')
      .in('user_id', userIds)
    
    // Calculate average morale and workload from profiles
    let totalMorale = 0
    let totalWorkload = 0
    let moraleCount = 0
    let workloadCount = 0
    const painThemes: Record<string, number> = {}
    
    profiles?.forEach(profile => {
      const json = profile.profile_json as Record<string, unknown> | null
      if (json) {
        // Get pulse data for morale/workload
        const pulse = json.pulse as Record<string, unknown> | undefined
        if (pulse) {
          if (typeof pulse.morale === 'number') {
            totalMorale += pulse.morale
            moraleCount++
          }
          if (typeof pulse.workload === 'number') {
            totalWorkload += pulse.workload
            workloadCount++
          }
        }
        
        // Get pain scanner data for themes
        const painScanner = json.pain_scanner as Record<string, unknown> | undefined
        if (painScanner && Array.isArray(painScanner.pain_points)) {
          painScanner.pain_points.forEach((pain: unknown) => {
            const painObj = pain as Record<string, unknown>
            const category = painObj.category as string
            if (category) {
              painThemes[category] = (painThemes[category] || 0) + 1
            }
          })
        }
      }
    })
    
    const avgMorale = moraleCount > 0 ? Math.round(totalMorale / moraleCount * 10) / 10 : null
    const avgWorkload = workloadCount > 0 ? Math.round(totalWorkload / workloadCount * 10) / 10 : null
    
    // Get morale trend (last 30 days from session answers)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: recentSessions } = await supabase
      .from('sessions')
      .select(`
        created_at,
        answers (
          answer_json
        )
      `)
      .in('member_id', memberIds)
      .eq('status', 'completed')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })
    
    // Process morale trend by week
    const moraleTrend: { week: string; avgMorale: number; count: number }[] = []
    const weeklyMorale: Record<string, { total: number; count: number }> = {}
    
    recentSessions?.forEach(session => {
      const weekStart = getWeekStart(new Date(session.created_at))
      const answers = session.answers as { answer_json: Record<string, unknown> }[] | null
      
      answers?.forEach(answer => {
        const json = answer.answer_json
        if (json && typeof json.morale === 'number') {
          if (!weeklyMorale[weekStart]) {
            weeklyMorale[weekStart] = { total: 0, count: 0 }
          }
          weeklyMorale[weekStart].total += json.morale as number
          weeklyMorale[weekStart].count++
        }
      })
    })
    
    Object.entries(weeklyMorale)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([week, data]) => {
        moraleTrend.push({
          week,
          avgMorale: Math.round(data.total / data.count * 10) / 10,
          count: data.count
        })
      })
    
    // Calculate response rate
    const totalPossibleSessions = (completedSessions || 0) + (pendingSessions || 0)
    const responseRate = totalPossibleSessions > 0 
      ? Math.round((completedSessions || 0) / totalPossibleSessions * 100) 
      : 0
    
    // Sort pain themes by frequency
    const topPainThemes = Object.entries(painThemes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, count }))
    
    return NextResponse.json({
      overview: {
        totalMembers: members?.length || 0,
        completedSessions: completedSessions || 0,
        pendingSessions: pendingSessions || 0,
        sessionsThisWeek: sessionsThisWeek || 0,
        responseRate
      },
      metrics: {
        avgMorale,
        avgWorkload
      },
      moraleTrend,
      topPainThemes
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}
