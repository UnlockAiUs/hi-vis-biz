import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { EmployeeEntry, DepartmentEntry, OrganizationData } from '@/lib/utils/onboarding-wizard'

// Use service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface SetupRequest {
  organization: OrganizationData
  departments: DepartmentEntry[]
  employees: EmployeeEntry[]
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user already has an organization
    const { data: existingMembership } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()
    
    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of an organization' },
        { status: 400 }
      )
    }
    
    // Parse request body
    const body: SetupRequest = await request.json()
    const { organization, departments, employees } = body
    
    // Validate required data
    if (!organization?.name || !organization?.timezone || !organization?.sizeBand) {
      return NextResponse.json(
        { error: 'Organization data is incomplete' },
        { status: 400 }
      )
    }
    
    if (!departments || departments.length === 0) {
      return NextResponse.json(
        { error: 'At least one department is required' },
        { status: 400 }
      )
    }
    
    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { error: 'At least one employee is required' },
        { status: 400 }
      )
    }
    
    // Start the setup process
    
    // 1. Create the organization with trial period
    const trialStartedAt = new Date().toISOString()
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: organization.name,
        timezone: organization.timezone,
        size_band: organization.sizeBand,
        trial_started_at: trialStartedAt,
        trial_ends_at: trialEndsAt,
        subscription_status: 'trialing',
      })
      .select()
      .single()
    
    if (orgError || !org) {
      console.error('Error creating organization:', orgError)
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      )
    }
    
    // 2. Add the current user as owner
    const { error: ownerError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'owner',
        display_name: user.email?.split('@')[0] || 'Owner',
        invite_status: 'accepted',
        can_view_reports: true,
        has_direct_reports: true,
      })
    
    if (ownerError) {
      console.error('Error adding owner:', ownerError)
      // Try to cleanup
      await supabaseAdmin.from('organizations').delete().eq('id', org.id)
      return NextResponse.json(
        { error: 'Failed to add organization owner' },
        { status: 500 }
      )
    }
    
    // 2b. Create owner's user profile
    await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: user.id,
        profile_json: {
          name: user.email?.split('@')[0] || 'Owner',
          role: 'owner',
        },
      })
    
    // 3. Create departments
    const departmentMap = new Map<string, string>() // name -> id
    
    for (const dept of departments) {
      const { data: deptData, error: deptError } = await supabaseAdmin
        .from('departments')
        .insert({
          organization_id: org.id,
          name: dept.name,
        })
        .select()
        .single()
      
      if (deptError) {
        console.error('Error creating department:', deptError)
        // Continue with other departments
      } else if (deptData) {
        departmentMap.set(dept.name.toLowerCase(), deptData.id)
      }
    }
    
    // 4. Create a mapping of temp employee IDs to supervisor IDs for later
    const employeeTempIdToDbId = new Map<string, string>()
    
    // 5. Create organization_members for each employee (without supervisor initially)
    const employeeResults: { email: string; success: boolean; error?: string }[] = []
    
    for (const emp of employees) {
      // Find the department ID
      const deptId = departmentMap.get(emp.department.toLowerCase())
      
      if (!deptId) {
        employeeResults.push({
          email: emp.email,
          success: false,
          error: `Department "${emp.department}" not found`,
        })
        continue
      }
      
      // Create the organization member record
      const { data: memberData, error: memberError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          organization_id: org.id,
          department_id: deptId,
          user_id: null, // Will be set when user accepts invite
          role: 'member',
          display_name: emp.name,
          job_title: emp.title,
          has_direct_reports: emp.hasDirectReports,
          can_view_reports: emp.canViewReports,
          invite_status: 'pending',
          invited_email: emp.email,
        })
        .select()
        .single()
      
      if (memberError) {
        console.error('Error creating member:', memberError)
        employeeResults.push({
          email: emp.email,
          success: false,
          error: 'Failed to create member record',
        })
        continue
      }
      
      if (memberData) {
        employeeTempIdToDbId.set(emp.id, memberData.id)
      }
      
      employeeResults.push({
        email: emp.email,
        success: true,
      })
    }
    
    // 6. Update supervisor relationships
    for (const emp of employees) {
      if (emp.supervisorId) {
        const empDbId = employeeTempIdToDbId.get(emp.id)
        const supervisorDbId = employeeTempIdToDbId.get(emp.supervisorId)
        
        if (empDbId && supervisorDbId) {
          await supabaseAdmin
            .from('organization_members')
            .update({ supervisor_id: supervisorDbId })
            .eq('id', empDbId)
        }
      }
    }
    
    // 7. Send invitation emails
    const inviteResults: { email: string; success: boolean; error?: string }[] = []
    
    for (const emp of employees) {
      const memberId = employeeTempIdToDbId.get(emp.id)
      if (!memberId) continue
      
      try {
        // Send invite via Supabase Auth
        const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          emp.email,
          {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
            data: {
              organization_id: org.id,
              member_id: memberId,
              display_name: emp.name,
            },
          }
        )
        
        if (inviteError) {
          console.error('Error sending invite to', emp.email, ':', inviteError)
          inviteResults.push({
            email: emp.email,
            success: false,
            error: inviteError.message,
          })
          continue
        }
        
        // Update invite status
        await supabaseAdmin
          .from('organization_members')
          .update({
            invite_status: 'sent',
            invite_sent_at: new Date().toISOString(),
          })
          .eq('id', memberId)
        
        inviteResults.push({
          email: emp.email,
          success: true,
        })
      } catch (err) {
        console.error('Error processing invite for', emp.email, ':', err)
        inviteResults.push({
          email: emp.email,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }
    
    // Calculate summary
    const successfulInvites = inviteResults.filter(r => r.success).length
    const failedInvites = inviteResults.filter(r => !r.success)
    
    return NextResponse.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
      },
      summary: {
        departments: departmentMap.size,
        employees: employees.length,
        invitesSent: successfulInvites,
        invitesFailed: failedInvites.length,
      },
      failedInvites: failedInvites.length > 0 ? failedInvites : undefined,
    })
    
  } catch (error) {
    console.error('Setup complete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
