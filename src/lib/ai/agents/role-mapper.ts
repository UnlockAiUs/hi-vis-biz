/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/lib/ai/agents/role-mapper.ts
 * PURPOSE: Role Mapper AI agent - job role discovery and responsibilities
 * EXPORTS: RoleMapperAgent (class), roleMapperAgent (singleton instance)
 * 
 * OUTPUT SCHEMA: { role_summary: string, primary_duties: string[], customer_facing: boolean, kpis_known: boolean }
 * 
 * CONVERSATION FLOW:
 * 1. Opens by asking about day-to-day responsibilities
 * 2. Collects 2 user messages minimum before completing
 * 3. Extracts structured data via separate LLM call
 * 
 * DEPENDENCIES: ../openai, ./base, @/types/database
 */

import { RoleMapperOutput } from '@/types/database'
import { createConversation, createChatCompletion } from '../openai'
import { 
  Agent, 
  AgentContext, 
  AgentTurnResult, 
  AgentOutput,
  buildContextPrompt,
  hasMinimumInfo,
  formatConversationHistory
} from './base'

const ROLE_MAPPER_SYSTEM_PROMPT = `You are a friendly workplace assistant helping to understand someone's role and responsibilities.

Your goals:
1. Understand their main role/job function in plain language
2. Identify their key responsibilities and duties
3. Learn if they interact with customers/clients
4. Keep the conversation brief and natural (2-3 exchanges max)

Guidelines:
- Be conversational and curious
- Ask one question at a time
- Use simple language, not corporate jargon
- Show genuine interest in what they do
- Keep responses short (1-2 sentences + a question)
- If their role is unclear, ask clarifying questions

CONTEXT ABOUT THE USER:
{USER_CONTEXT}

Start by asking them to describe what they do in their role.`

const EXTRACTION_PROMPT = `Based on the conversation below, extract the following information in JSON format:

{
  "role_summary": "<2-3 sentence summary of their role>",
  "primary_duties": ["<duty 1>", "<duty 2>", ...],
  "customer_facing": <true if they interact with customers/clients, false otherwise>,
  "kpis_known": <true if they mentioned any metrics or KPIs, false otherwise>
}

Conversation:
{CONVERSATION}

Respond with ONLY the JSON object, no other text.`

export class RoleMapperAgent implements Agent {
  code = 'role_mapper' as const
  name = 'Role Mapper'

  async getOpeningMessage(context: AgentContext): Promise<string> {
    const userContext = buildContextPrompt(context)
    const systemPrompt = ROLE_MAPPER_SYSTEM_PROMPT.replace('{USER_CONTEXT}', userContext)
    
    const response = await createConversation(
      systemPrompt,
      [],
      { temperature: 0.8 }
    )
    
    return response || `Hi ${context.userName}! I'd love to learn more about your role. Can you tell me what you do day-to-day?`
  }

  async processTurn(
    context: AgentContext,
    userMessage: string
  ): Promise<AgentTurnResult> {
    const userContext = buildContextPrompt(context)
    const systemPrompt = ROLE_MAPPER_SYSTEM_PROMPT.replace('{USER_CONTEXT}', userContext)
    
    // Add the new user message to history
    const fullHistory = [
      ...context.conversationHistory,
      { role: 'user' as const, content: userMessage }
    ]
    
    // Check if we have enough information (at least 2 user messages)
    const shouldComplete = hasMinimumInfo(fullHistory, 2)
    
    if (shouldComplete) {
      // Try to extract data and wrap up
      const extractedData = await this.extractDataFromHistory(fullHistory)
      
      // Generate a closing message
      const closingResponse = await createConversation(
        systemPrompt + '\n\nThis is the final exchange. Thank them for explaining their role and let them know this helps understand how to support them better.',
        fullHistory,
        { temperature: 0.8 }
      )
      
      return {
        message: closingResponse || "Thanks for explaining your role! This really helps me understand what you do.",
        isComplete: true,
        extractedData: extractedData ? { type: 'role_mapper', data: extractedData } : undefined
      }
    }
    
    // Continue the conversation
    const response = await createConversation(
      systemPrompt,
      fullHistory,
      { temperature: 0.8 }
    )
    
    return {
      message: response || "That's interesting! Do you work directly with customers or clients in your role?",
      isComplete: false,
      followUpHint: 'Ask about customer interaction or main responsibilities'
    }
  }

  async extractData(context: AgentContext): Promise<AgentOutput | null> {
    const data = await this.extractDataFromHistory(context.conversationHistory)
    if (data) {
      return { type: 'role_mapper', data }
    }
    return null
  }

  private async extractDataFromHistory(
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<RoleMapperOutput | null> {
    if (history.length < 2) return null
    
    const conversationText = formatConversationHistory(history)
    const prompt = EXTRACTION_PROMPT.replace('{CONVERSATION}', conversationText)
    
    const { parsed } = await createChatCompletion<RoleMapperOutput>(
      'You are a data extraction assistant. Extract structured data from conversations.',
      prompt,
      { temperature: 0.2 }
    )
    
    if (parsed && parsed.role_summary) {
      return {
        role_summary: parsed.role_summary,
        primary_duties: Array.isArray(parsed.primary_duties) ? parsed.primary_duties : [],
        customer_facing: Boolean(parsed.customer_facing),
        kpis_known: Boolean(parsed.kpis_known)
      }
    }
    
    return null
  }
}

export const roleMapperAgent = new RoleMapperAgent()
