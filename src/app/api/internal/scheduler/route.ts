import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { determineSessionsToSchedule, UserSchedulingContext } from '@/lib/utils/scheduler'
import { ProfileJson } from '@/types/database'

// This route is called by Vercel cron - protected by SCHEDULER_SECRET
export async function POST(request: Request) {
  // Verify the scheduler secret
  const authHeader = request.headers.get('authorization')
  const schedulerSecret = process.env.SCHEDULER_SECRET
  
  if (!schedulerSecret || authHeader !== `Bearer ${schedulerSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Use service role to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  try {
    // Get all active organization members
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select(`
        user_id,
        org_id,
        level,
        user_profiles (
          profile_json
        )
      `)
      .eq('status', 'active')
    
    if (membersError) {
      console.error('Error fetching members:', membersError)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }
    
    const results = {
      processed: 0,
      sessionsCreated: 0,
      errors: [] as string[],
    }
    
    for (const member of members || []) {
      try {
        // Get user's pending sessions
        const { data: pendingSessions } = await supabase
          .from('sessions')
          .select('agent_code')
          .eq('user_id', member.user_id)
          .eq('org_id', member.org_id)
          .is('completed_at', null)
        
        // Get user's last completed session for each agent
        const { data: lastSessions } = await supabase
          .from('sessions')
          .select('agent_code, completed_at')
          .eq('user_id', member.user_id)
          .eq('org_id', member.org_id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
        
        // Build last sessions by agent map
        const lastSessionsByAgent: Record<string, Date | null> = {}
        for (const session of lastSessions || []) {
          if (!lastSessionsByAgent[session.agent_code]) {
            lastSessionsByAgent[session.agent_code] = new Date(session.completed_at!)
          }
        }
        
        // Get profile - user_profiles is an array from the join
        const userProfilesArray = member.user_profiles as { profile_json: ProfileJson }[] | null
        const userProfile = userProfilesArray && userProfilesArray.length > 0 ? userProfilesArray[0] : null
        const profile = userProfile?.profile_json || null
        
        // Build scheduling context
        const context: UserSchedulingContext = {
          userId: member.user_id,
          orgId: member.org_id,
          level: member.level,
          profile,
          lastSessionsByAgent,
          pendingSessions: (pendingSessions || []).map(s => s.agent_code),
        }
        
        // Determine sessions to schedule
        const sessionsToSchedule = determineSessionsToSchedule(context)
        
        // Create sessions
        for (const sessionToSchedule of sessionsToSchedule) {
          const { error: insertError } = await supabase
            .from('sessions')
            .insert({
              org_id: member.org_id,
              user_id: member.user_id,
              agent_code: sessionToSchedule.agentCode,
              scheduled_for: new Date().toISOString(),
              source: 'autopilot',
            })
          
          if (insertError) {
            results.errors.push(`Failed to create session for user ${member.user_id}: ${insertError.message}`)
          } else {
            results.sessionsCreated++
          }
        }
        
        results.processed++
      } catch (err) {
        results.errors.push(`Error processing user ${member.user_id}: ${err}`)
      }
    }
    
    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('Scheduler error:', error)
    return NextResponse.json({ error: 'Scheduler failed' }, { status: 500 })
  }
}

// Also support GET for Vercel cron (which sends GET requests)
export async function GET(request: Request) {
  // For GET requests, check for cron secret in query params or headers
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret') || request.headers.get('x-cron-secret')
  const schedulerSecret = process.env.SCHEDULER_SECRET
  
  if (!schedulerSecret || secret !== schedulerSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Create a new request with the secret in the auth header
  const newRequest = new Request(request.url, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${schedulerSecret}`,
    },
  })
  
  return POST(newRequest)
}
