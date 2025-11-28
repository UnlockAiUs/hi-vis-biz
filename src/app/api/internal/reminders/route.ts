/**
 * @file Internal Reminders API
 * @description Sends check-in reminder emails to employees with pending sessions
 * 
 * SECURITY: Protected by SCHEDULER_REMINDERS_SECRET
 * IDEMPOTENCE: Uses email_logs table to prevent duplicate sends
 * 
 * Called by Vercel cron job daily (configured in vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmailWithRetry, isEmailConfigured } from '@/lib/email/client';
import { generateCheckinReminderEmail } from '@/lib/email/templates/checkin-reminder';

// ============================================================================
// TYPES
// ============================================================================

interface PendingSession {
  id: string;
  user_id: string;
  org_id: string;
  agent_code: string;
  scheduled_for: string;
}

interface MemberInfo {
  user_id: string;
  invited_email: string;
  first_name: string | null;
  org_id: string;
  org_name: string;
}

interface ReminderResult {
  userId: string;
  sessionCount: number;
  status: 'sent' | 'skipped' | 'failed';
  reason?: string;
  messageId?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SCHEDULER_REMINDERS_SECRET = process.env.SCHEDULER_REMINDERS_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vizdots.com';

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  // 1. Verify secret
  const authHeader = request.headers.get('authorization');
  const querySecret = request.nextUrl.searchParams.get('secret');
  const providedSecret = authHeader?.replace('Bearer ', '') || querySecret;
  
  if (!SCHEDULER_REMINDERS_SECRET || providedSecret !== SCHEDULER_REMINDERS_SECRET) {
    console.error('[Reminders] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 2. Check if email is configured
  if (!isEmailConfigured()) {
    console.log('[Reminders] Email not configured - skipping reminders');
    return NextResponse.json({
      success: true,
      message: 'Email not configured - reminders skipped',
      results: [],
    });
  }
  
  // 3. Initialize Supabase with service role
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Reminders] Missing Supabase configuration');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const results: ReminderResult[] = [];
    
    // 4. Get all pending sessions for today
    const { data: pendingSessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, user_id, org_id, agent_code, scheduled_for')
      .gte('scheduled_for', `${today}T00:00:00`)
      .lte('scheduled_for', `${today}T23:59:59`)
      .is('completed_at', null)
      .is('started_at', null); // Only sessions not yet started
    
    if (sessionsError) {
      console.error('[Reminders] Error fetching sessions:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
    
    if (!pendingSessions || pendingSessions.length === 0) {
      console.log('[Reminders] No pending sessions for today');
      return NextResponse.json({
        success: true,
        message: 'No pending sessions for today',
        results: [],
      });
    }
    
    // 5. Group sessions by user
    const sessionsByUser = new Map<string, PendingSession[]>();
    for (const session of pendingSessions) {
      const existing = sessionsByUser.get(session.user_id) || [];
      existing.push(session as PendingSession);
      sessionsByUser.set(session.user_id, existing);
    }
    
    console.log(`[Reminders] Found ${pendingSessions.length} sessions for ${sessionsByUser.size} users`);
    
    // 6. Get member info for all users
    const userIds = Array.from(sessionsByUser.keys());
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select(`
        user_id,
        invited_email,
        first_name,
        organization_id,
        organizations!inner(name)
      `)
      .in('user_id', userIds)
      .eq('status', 'active');
    
    if (membersError) {
      console.error('[Reminders] Error fetching members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch member info' }, { status: 500 });
    }
    
    // 7. Build member lookup
    const memberLookup = new Map<string, MemberInfo>();
    for (const member of members || []) {
      memberLookup.set(member.user_id, {
        user_id: member.user_id,
        invited_email: member.invited_email,
        first_name: member.first_name,
        org_id: member.organization_id,
        org_name: (member.organizations as any)?.name || 'your organization',
      });
    }
    
    // 8. Process each user
    for (const [userId, sessions] of sessionsByUser) {
      const member = memberLookup.get(userId);
      
      if (!member) {
        console.warn(`[Reminders] No member info for user ${userId} - skipping`);
        results.push({
          userId,
          sessionCount: sessions.length,
          status: 'skipped',
          reason: 'No member info found',
        });
        continue;
      }
      
      // Check idempotency - have we already sent a reminder today?
      const idempotencyKey = `reminder:${userId}:${today}`;
      
      const { data: existingLog } = await supabase
        .from('email_logs')
        .select('id')
        .eq('idempotency_key', idempotencyKey)
        .single();
      
      if (existingLog) {
        console.log(`[Reminders] Already sent reminder to ${userId} today - skipping`);
        results.push({
          userId,
          sessionCount: sessions.length,
          status: 'skipped',
          reason: 'Already reminded today',
        });
        continue;
      }
      
      // Generate email content
      const emailContent = generateCheckinReminderEmail({
        recipientFirstName: member.first_name || undefined,
        sessionCount: sessions.length,
        dashboardUrl: `${APP_URL}/dashboard`,
        orgName: member.org_name,
      });
      
      // Send email
      const sendResult = await sendEmailWithRetry({
        to: [member.invited_email],
        subject: emailContent.subject,
        htmlBody: emailContent.htmlBody,
        textBody: emailContent.textBody,
        logicalType: 'checkin_reminder',
        tags: {
          org_id: member.org_id,
          user_id: userId,
          session_count: String(sessions.length),
        },
      });
      
      // Log the result
      await supabase.from('email_logs').insert({
        org_id: member.org_id,
        user_id: userId,
        recipient_email: member.invited_email,
        email_type: 'checkin_reminder',
        session_id: sessions[0].id, // Link to first session
        status: sendResult.success ? 'sent' : 'failed',
        message_id: sendResult.messageId,
        error_code: sendResult.error ? sendResult.error.substring(0, 100) : null,
        idempotency_key: idempotencyKey,
        metadata: {
          session_count: sessions.length,
          session_ids: sessions.map((s: PendingSession) => s.id),
        },
      });
      
      results.push({
        userId,
        sessionCount: sessions.length,
        status: sendResult.success ? 'sent' : 'failed',
        reason: sendResult.error,
        messageId: sendResult.messageId,
      });
    }
    
    // 9. Summary
    const sent = results.filter(r => r.status === 'sent').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    console.log(`[Reminders] Complete: ${sent} sent, ${skipped} skipped, ${failed} failed`);
    
    return NextResponse.json({
      success: true,
      summary: { sent, skipped, failed },
      results,
    });
    
  } catch (error) {
    console.error('[Reminders] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Only allow POST
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
