/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/lib/ai/agents/base.ts
 * PURPOSE: Base types, interfaces, and helpers for AI agent system
 * EXPORTS:
 *   - AgentCode type: 'pulse' | 'role_mapper' | 'workflow_mapper' | 'pain_scanner' | 'focus_tracker'
 *   - AgentContext interface: context passed to every agent
 *   - Agent interface: base interface all agents implement (processTurn, getOpeningMessage, extractData)
 *   - AgentOutput union type: typed outputs for each agent
 *   - Helper functions: buildContextPrompt, extractSupervisorMention, hasMinimumInfo, formatConversationHistory
 * DEPENDENCIES: Types from src/types/database.ts
 */

import { ProfileJson, PulseOutput, RoleMapperOutput, WorkflowMapperOutput, PainScannerOutput, FocusTrackerOutput } from '@/types/database'

// Agent codes as defined in the database
export type AgentCode = 'pulse' | 'role_mapper' | 'workflow_mapper' | 'pain_scanner' | 'focus_tracker'

// Context provided to every agent
export interface AgentContext {
  // User information
  userId: string
  userName: string
  jobTitle?: string
  department?: string
  level?: 'exec' | 'manager' | 'ic' | null
  
  // Organization context
  orgId: string
  orgName: string
  
  // Current profile state (for context-aware conversations)
  profile?: ProfileJson
  
  // Session information
  sessionId: string
  topicCode: string
  
  // Supervisor/Manager information
  hasSupervisor: boolean
  supervisorName?: string
  
  // Conversation history for this session
  conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

// Message in a conversation
export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
}

// Result from an agent turn
export interface AgentTurnResult {
  // The agent's response message
  message: string
  
  // Whether the conversation is complete
  isComplete: boolean
  
  // Extracted structured data (when conversation is complete)
  extractedData?: AgentOutput
  
  // Suggested follow-up question (if not complete)
  followUpHint?: string
}

// Union of all agent output types
export type AgentOutput = 
  | { type: 'pulse'; data: PulseOutput }
  | { type: 'role_mapper'; data: RoleMapperOutput }
  | { type: 'workflow_mapper'; data: WorkflowMapperOutput }
  | { type: 'pain_scanner'; data: PainScannerOutput }
  | { type: 'focus_tracker'; data: FocusTrackerOutput }

// Base agent interface that all agents must implement
export interface Agent {
  // The agent's code identifier
  code: AgentCode
  
  // Human-readable name
  name: string
  
  // Process a conversation turn
  processTurn(
    context: AgentContext,
    userMessage: string
  ): Promise<AgentTurnResult>
  
  // Get the opening message for a new conversation
  getOpeningMessage(context: AgentContext): Promise<string>
  
  // Extract structured data from the conversation
  extractData(context: AgentContext): Promise<AgentOutput | null>
}

// Helper to build the system prompt with user context
export function buildContextPrompt(context: AgentContext): string {
  const parts: string[] = []
  
  parts.push(`You are speaking with ${context.userName}.`)
  
  if (context.jobTitle) {
    parts.push(`Their job title is ${context.jobTitle}.`)
  }
  
  if (context.department) {
    parts.push(`They work in the ${context.department} department.`)
  }
  
  if (context.level) {
    const levelName = {
      exec: 'an executive',
      manager: 'a manager',
      ic: 'an individual contributor'
    }[context.level]
    parts.push(`They are ${levelName}.`)
  }
  
  if (context.hasSupervisor && context.supervisorName) {
    parts.push(`They report to ${context.supervisorName}.`)
  } else if (!context.hasSupervisor && context.level !== 'exec') {
    parts.push(`IMPORTANT: They have not set who they report to yet. If natural in conversation, ask who their direct manager is.`)
  }
  
  if (context.profile?.role_summary) {
    parts.push(`Role summary: ${context.profile.role_summary}`)
  }
  
  if (context.profile?.current_focus) {
    parts.push(`Current focus: ${context.profile.current_focus.label}`)
  }
  
  return parts.join(' ')
}

// Helper to check if supervisor info was mentioned in user message
export function extractSupervisorMention(message: string): string | null {
  // Look for patterns like "I report to [Name]", "My manager is [Name]", "[Name] is my boss"
  const patterns = [
    /(?:i report to|my manager is|my boss is|i work for|my supervisor is|my lead is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+is my (?:manager|boss|supervisor|lead)/i,
  ]
  
  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  return null
}

// Helper to check if we have enough information to extract data
export function hasMinimumInfo(
  conversationHistory: AgentMessage[],
  minTurns: number = 2
): boolean {
  const userMessages = conversationHistory.filter(m => m.role === 'user')
  return userMessages.length >= minTurns
}

// Helper to format conversation history for the AI
export function formatConversationHistory(history: AgentMessage[]): string {
  return history
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n')
}
