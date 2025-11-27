/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/lib/ai/agents/pulse.ts
 * PURPOSE: Pulse Check AI agent - morale, workload, and burnout assessment
 * EXPORTS: PulseAgent (class), pulseAgent (singleton instance)
 * 
 * OUTPUT SCHEMA: { rating: 1-5, reason: string, workload_rating: 1-5, burnout_risk: 'low'|'medium'|'high' }
 * 
 * CONVERSATION FLOW:
 * 1. Opens with friendly question about how work is going
 * 2. Collects 2 user messages minimum before completing
 * 3. Extracts structured data via separate LLM call
 * 
 * DEPENDENCIES: ../openai, ./base, @/types/database
 */

import { PulseOutput } from '@/types/database'
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

const PULSE_SYSTEM_PROMPT = `You are a friendly workplace check-in assistant focused on understanding employee morale and workload.

Your goals:
1. Understand how the employee is feeling about work (morale)
2. Gauge their current workload level
3. Identify any early signs of burnout
4. Keep the conversation brief and natural (2-3 exchanges max)

Guidelines:
- Be warm, conversational, and empathetic
- Ask one question at a time
- Don't be overly formal or clinical
- If they mention stress or concerns, acknowledge them genuinely
- Keep responses short (1-2 sentences + a question)
- Don't explicitly mention you're collecting data or ratings

CONTEXT ABOUT THE USER:
{USER_CONTEXT}

Start by asking how they're feeling about work lately.`

const EXTRACTION_PROMPT = `Based on the conversation below, extract the following information in JSON format:

{
  "rating": <1-5 morale rating where 1=very negative, 3=neutral, 5=very positive>,
  "reason": "<brief summary of why they feel this way>",
  "workload_rating": <1-5 where 1=very light, 3=balanced, 5=overwhelmed>,
  "burnout_risk": "<'low', 'medium', or 'high' based on signals>"
}

Conversation:
{CONVERSATION}

Respond with ONLY the JSON object, no other text.`

export class PulseAgent implements Agent {
  code = 'pulse' as const
  name = 'Pulse Check'

  async getOpeningMessage(context: AgentContext): Promise<string> {
    const userContext = buildContextPrompt(context)
    const systemPrompt = PULSE_SYSTEM_PROMPT.replace('{USER_CONTEXT}', userContext)
    
    const response = await createConversation(
      systemPrompt,
      [],
      { temperature: 0.8 }
    )
    
    return response || `Hey ${context.userName}! How are you feeling about work lately?`
  }

  async processTurn(
    context: AgentContext,
    userMessage: string
  ): Promise<AgentTurnResult> {
    const userContext = buildContextPrompt(context)
    const systemPrompt = PULSE_SYSTEM_PROMPT.replace('{USER_CONTEXT}', userContext)
    
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
        systemPrompt + '\n\nThis is the final exchange. Thank them briefly and let them know you appreciate them sharing.',
        fullHistory,
        { temperature: 0.8 }
      )
      
      return {
        message: closingResponse || "Thanks for sharing! I appreciate you taking the time to check in.",
        isComplete: true,
        extractedData: extractedData ? { type: 'pulse', data: extractedData } : undefined
      }
    }
    
    // Continue the conversation
    const response = await createConversation(
      systemPrompt,
      fullHistory,
      { temperature: 0.8 }
    )
    
    return {
      message: response || "Thanks for sharing. How would you describe your current workload?",
      isComplete: false,
      followUpHint: 'Ask about workload or any specific concerns'
    }
  }

  async extractData(context: AgentContext): Promise<AgentOutput | null> {
    const data = await this.extractDataFromHistory(context.conversationHistory)
    if (data) {
      return { type: 'pulse', data }
    }
    return null
  }

  private async extractDataFromHistory(
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<PulseOutput | null> {
    if (history.length < 2) return null
    
    const conversationText = formatConversationHistory(history)
    const prompt = EXTRACTION_PROMPT.replace('{CONVERSATION}', conversationText)
    
    const { parsed } = await createChatCompletion<PulseOutput>(
      'You are a data extraction assistant. Extract structured data from conversations.',
      prompt,
      { temperature: 0.2 }
    )
    
    if (parsed && typeof parsed.rating === 'number') {
      return {
        rating: Math.min(5, Math.max(1, parsed.rating)),
        reason: parsed.reason || 'No specific reason provided',
        workload_rating: Math.min(5, Math.max(1, parsed.workload_rating || 3)),
        burnout_risk: parsed.burnout_risk || 'low'
      }
    }
    
    return null
  }
}

export const pulseAgent = new PulseAgent()
