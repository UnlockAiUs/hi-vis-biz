/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/lib/ai/agents/index.ts
 * PURPOSE: Central agent registry and router
 * EXPORTS:
 *   - getAgent(code) - returns agent by code
 *   - getAllAgents() - returns all agents
 *   - isValidAgentCode(code) - validates agent code
 *   - processAgentTurn(code, context, message) - processes conversation turn
 *   - getAgentOpeningMessage(code, context) - gets opening message
 *   - agentMetadata - UI metadata for agents (name, description, icon)
 *   - Individual agent exports (pulseAgent, roleMapperAgent, etc.)
 * AGENTS: pulse, role_mapper, workflow_mapper, pain_scanner, focus_tracker
 */

// Agent exports and router
import { Agent, AgentCode, AgentContext, AgentTurnResult, AgentOutput } from './base'
import { pulseAgent } from './pulse'
import { roleMapperAgent } from './role-mapper'
import { workflowMapperAgent } from './workflow-mapper'
import { painScannerAgent } from './pain-scanner'
import { focusTrackerAgent } from './focus-tracker'

// Re-export types
export type { Agent, AgentCode, AgentContext, AgentTurnResult, AgentOutput }
export { 
  buildContextPrompt, 
  hasMinimumInfo, 
  formatConversationHistory 
} from './base'

// Agent registry
const agents: Record<AgentCode, Agent> = {
  pulse: pulseAgent,
  role_mapper: roleMapperAgent,
  workflow_mapper: workflowMapperAgent,
  pain_scanner: painScannerAgent,
  focus_tracker: focusTrackerAgent,
}

// Get agent by code
export function getAgent(code: AgentCode): Agent {
  const agent = agents[code]
  if (!agent) {
    throw new Error(`Unknown agent code: ${code}`)
  }
  return agent
}

// Get all agents
export function getAllAgents(): Agent[] {
  return Object.values(agents)
}

// Check if code is a valid agent code
export function isValidAgentCode(code: string): code is AgentCode {
  return code in agents
}

// Export individual agents for direct access
export { pulseAgent } from './pulse'
export { roleMapperAgent } from './role-mapper'
export { workflowMapperAgent } from './workflow-mapper'
export { painScannerAgent } from './pain-scanner'
export { focusTrackerAgent } from './focus-tracker'

// Agent metadata for UI
export const agentMetadata: Record<AgentCode, { name: string; description: string; icon: string }> = {
  pulse: {
    name: 'Pulse Check',
    description: 'Quick morale and workload check-in',
    icon: '💓',
  },
  role_mapper: {
    name: 'Role Mapper',
    description: 'Understand your role and responsibilities',
    icon: '🎯',
  },
  workflow_mapper: {
    name: 'Workflow Mapper',
    description: 'Map out your key workflows and processes',
    icon: '🔄',
  },
  pain_scanner: {
    name: 'Pain Scanner',
    description: 'Identify friction points and challenges',
    icon: '🔍',
  },
  focus_tracker: {
    name: 'Focus Tracker',
    description: 'Track current priorities and focus areas',
    icon: '🎯',
  },
}

// Helper to process a conversation turn with any agent
export async function processAgentTurn(
  agentCode: AgentCode,
  context: AgentContext,
  userMessage: string
): Promise<AgentTurnResult> {
  const agent = getAgent(agentCode)
  return agent.processTurn(context, userMessage)
}

// Helper to get opening message from any agent
export async function getAgentOpeningMessage(
  agentCode: AgentCode,
  context: AgentContext
): Promise<string> {
  const agent = getAgent(agentCode)
  return agent.getOpeningMessage(context)
}
