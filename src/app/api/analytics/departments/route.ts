import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface DepartmentAnalytics {
  id: string
  name: string
  memberCount: number
  completedSessions: number
  responseRate: number
  avgMorale: number | null
  avgWorkload: number | null
  topPainThemes: { theme: string; count: number }[]
}

// GET /api/analytics/departments - Get department-level analytics
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
    .select('organization_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .single()
  
  if (memberError || !membership) {
    return NextResponse.json({ error: 'Not authorized to view analytics' }, { status: 403 })
  }
  
  const orgId = membership.organization_id
  
  try {
    // Get all departments
    const { data: departments } = await supabase
      .from('departments')
      .select('id, name')
      .eq('organization_id', orgId)
      .order('name')
    
    if (!departments || departments.length === 0) {
      return NextResponse.json({ departments: [] })
    }
    
    // Get all org members with department info
    const { data: members } = await supabase
      .from('organization_members')
      .select('id, user_id, department_id')
      .eq('organization_id', orgId)
      .eq('is_active', true)
    
    // Get user profiles
    const userIds = members?.map(m => m.user_id).filter(Boolean) || []
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, profile_json')
      .in('user_id', userIds)
    
    // Create a map of user_id to profile
    const profileMap = new Map<string, Record<string, unknown>>()
    profiles?.forEach(p => {
      if (p.user_id && p.profile_json) {
        profileMap.set(p.user_id, p.profile_json as Record<string, unknown>)
      }
    })
    
    // Get all sessions for org members
    const memberIds = members?.map(m => m.id) || []
    const { data: sessions } = await supabase
      .from('sessions')
      .select('member_id, status')
      .in('member_id', memberIds)
    
    // Create a map of member_id to session counts
    const sessionCounts = new Map<string, { completed: number; total: number }>()
    sessions?.forEach(s => {
      const current = sessionCounts.get(s.member_id) || { completed: 0, total: 0 }
      current.total++
      if (s.status === 'completed') {
        current.completed++
      }
      sessionCounts.set(s.member_id, current)
    })
    
    // Process each department
    const departmentAnalytics: DepartmentAnalytics[] = departments.map(dept => {
      // Get members in this department
      const deptMembers = members?.filter(m => m.department_id === dept.id) || []
      const deptMemberIds = deptMembers.map(m => m.id)
      const deptUserIds = deptMembers.map(m => m.user_id).filter(Boolean)
      
      // Calculate session stats
      let totalCompleted = 0
      let totalSessions = 0
      deptMemberIds.forEach(memberId => {
        const counts = sessionCounts.get(memberId)
        if (counts) {
          totalCompleted += counts.completed
          totalSessions += counts.total
        }
      })
      
      // Calculate morale/workload from profiles
      let totalMorale = 0
      let totalWorkload = 0
      let moraleCount = 0
      let workloadCount = 0
      const painThemes: Record<string, number> = {}
      
      deptUserIds.forEach(userId => {
        const profile = profileMap.get(userId)
        if (profile) {
          const pulse = profile.pulse as Record<string, unknown> | undefined
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
          
          const painScanner = profile.pain_scanner as Record<string, unknown> | undefined
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
      const responseRate = totalSessions > 0 ? Math.round(totalCompleted / totalSessions * 100) : 0
      
      const topPainThemes = Object.entries(painThemes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([theme, count]) => ({ theme, count }))
      
      return {
        id: dept.id,
        name: dept.name,
        memberCount: deptMembers.length,
        completedSessions: totalCompleted,
        responseRate,
        avgMorale,
        avgWorkload,
        topPainThemes
      }
    })
    
    // Also include "Unassigned" for members without department
    const unassignedMembers = members?.filter(m => !m.department_id) || []
    if (unassignedMembers.length > 0) {
      const unassignedMemberIds = unassignedMembers.map(m => m.id)
      const unassignedUserIds = unassignedMembers.map(m => m.user_id).filter(Boolean)
      
      let totalCompleted = 0
      let totalSessions = 0
      unassignedMemberIds.forEach(memberId => {
        const counts = sessionCounts.get(memberId)
        if (counts) {
          totalCompleted += counts.completed
          totalSessions += counts.total
        }
      })
      
      let totalMorale = 0
      let totalWorkload = 0
      let moraleCount = 0
      let workloadCount = 0
      const painThemes: Record<string, number> = {}
      
      unassignedUserIds.forEach(userId => {
        const profile = profileMap.get(userId)
        if (profile) {
          const pulse = profile.pulse as Record<string, unknown> | undefined
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
          
          const painScanner = profile.pain_scanner as Record<string, unknown> | undefined
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
      const responseRate = totalSessions > 0 ? Math.round(totalCompleted / totalSessions * 100) : 0
      
      const topPainThemes = Object.entries(painThemes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([theme, count]) => ({ theme, count }))
      
      departmentAnalytics.push({
        id: 'unassigned',
        name: 'Unassigned',
        memberCount: unassignedMembers.length,
        completedSessions: totalCompleted,
        responseRate,
        avgMorale,
        avgWorkload,
        topPainThemes
      })
    }
    
    return NextResponse.json({ departments: departmentAnalytics })
  } catch (error) {
    console.error('Department analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch department analytics' }, { status: 500 })
  }
}
