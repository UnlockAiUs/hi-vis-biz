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
  
  if (context.profile?.role_summary) {
    parts.push(`Role summary: ${context.profile.role_summary}`)
  }
  
  if (context.profile?.current_focus) {
    parts.push(`Current focus: ${context.profile.current_focus.label}`)
  }
  
  return parts.join(' ')
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
