/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/lib/utils/ai-logger.ts
 * PURPOSE: Utility for logging AI agent calls for debugging and monitoring
 * EXPORTS: logAICall, AILogEntry
 * 
 * USAGE:
 * - Call logAICall() after any AI agent invocation
 * - Pass success/failure status, agent name, timing info
 * - Logs are stored in ai_logs table (requires migration 011)
 * 
 * PRIVACY:
 * - Does NOT log actual prompts or responses
 * - Only logs metadata (agent name, timing, success/failure)
 */

import { createClient } from '@supabase/supabase-js'

export interface AILogEntry {
  agent_name: string
  org_id?: string
  user_id?: string
  session_id?: string
  success: boolean
  error_type?: string
  error_message?: string
  duration_ms?: number
  input_tokens?: number
  output_tokens?: number
  model?: string
}

/**
 * Log an AI agent call to the database
 * Uses service role client to bypass RLS
 */
export async function logAICall(entry: AILogEntry): Promise<void> {
  try {
    // Create a service role client for logging (bypasses RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[AI Logger] Missing Supabase credentials, skipping log')
      return
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { error } = await supabase
      .from('ai_logs')
      .insert({
        agent_name: entry.agent_name,
        org_id: entry.org_id || null,
        user_id: entry.user_id || null,
        session_id: entry.session_id || null,
        success: entry.success,
        error_type: entry.error_type || null,
        error_message: entry.error_message ? entry.error_message.substring(0, 500) : null, // Truncate long errors
        duration_ms: entry.duration_ms || null,
        input_tokens: entry.input_tokens || null,
        output_tokens: entry.output_tokens || null,
        model: entry.model || 'gpt-4o-mini'
      })
    
    if (error) {
      // Don't throw - logging failures shouldn't break the app
      console.error('[AI Logger] Failed to log AI call:', error.message)
    }
  } catch (err) {
    // Silently fail - logging should never break the main flow
    console.error('[AI Logger] Unexpected error:', err)
  }
}

/**
 * Helper to measure AI call duration
 * Returns a function to call when the operation completes
 */
export function startAITimer(): () => number {
  const start = Date.now()
  return () => Date.now() - start
}

/**
 * Wrapper for AI calls that automatically logs success/failure
 */
export async function withAILogging<T>(
  agentName: string,
  operation: () => Promise<T>,
  context?: {
    org_id?: string
    user_id?: string
    session_id?: string
  }
): Promise<T> {
  const stopTimer = startAITimer()
  
  try {
    const result = await operation()
    
    // Log successful call
    await logAICall({
      agent_name: agentName,
      success: true,
      duration_ms: stopTimer(),
      ...context
    })
    
    return result
  } catch (error) {
    const err = error as Error
    
    // Determine error type
    let errorType = 'unknown'
    if (err.message?.includes('timeout')) {
      errorType = 'timeout'
    } else if (err.message?.includes('rate limit')) {
      errorType = 'rate_limit'
    } else if (err.message?.includes('API')) {
      errorType = 'api_error'
    } else if (err.message?.includes('parse') || err.message?.includes('JSON')) {
      errorType = 'parse_error'
    }
    
    // Log failed call
    await logAICall({
      agent_name: agentName,
      success: false,
      error_type: errorType,
      error_message: err.message,
      duration_ms: stopTimer(),
      ...context
    })
    
    // Re-throw the error
    throw error
  }
}
