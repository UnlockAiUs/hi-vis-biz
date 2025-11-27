/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/lib/ai/agents/focus-tracker.ts
 * PURPOSE: Focus Tracker AI agent - current work priorities and focus tracking
 * EXPORTS: FocusTrackerAgent (class), focusTrackerAgent (singleton instance)
 * 
 * OUTPUT SCHEMA: { current_focus_label: string, current_focus_tags: string[], still_primary_focus: boolean, 
 *                  focus_rating: 1-5, change_vs_last_time: string, reason: string }
 * 
 * SPECIAL BEHAVIOR: Uses previous focus from profile to ask about changes
 * 
 * CONVERSATION FLOW:
 * 1. Opens by asking about current main priority (or checking if previous focus is still active)
 * 2. Collects 2 user messages minimum before completing
 * 3. Extracts structured data via separate LLM call
 * 
 * DEPENDENCIES: ../openai, ./base, @/types/database
 */

import { FocusTrackerOutput } from '@/types/database'
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

const FOCUS_TRACKER_SYSTEM_PROMPT = `You are a friendly workplace assistant helping to understand someone's current work focus and priorities.

Your goals:
1. Understand what they're currently focused on at work
2. Determine if this focus has changed recently
3. Gauge how well they can maintain focus on priorities
4. Keep the conversation brief and natural (2-3 exchanges max)

Guidelines:
- Be conversational and supportive
- Ask one question at a time
- Show interest in their projects/priorities
- Keep responses short (1-2 sentences + a question)
- If they seem scattered, be understanding not judgmental

CONTEXT ABOUT THE USER:
{USER_CONTEXT}

Start by asking what their main focus or priority is right now.`

const EXTRACTION_PROMPT = `Based on the conversation below, extract the following information about their current focus in JSON format:

{
  "current_focus_label": "<brief label for their main focus, e.g., 'Q4 Sales Push'>",
  "current_focus_tags": ["<tag1>", "<tag2>", ...],
  "still_primary_focus": <true if this has been their consistent focus, false if it changed recently>,
  "focus_rating": <1-5 where 1=very scattered, 3=moderately focused, 5=laser focused>,
  "change_vs_last_time": "<'same', 'shifted', or 'completely_different'>",
  "reason": "<brief explanation of their focus situation>"
}

Conversation:
{CONVERSATION}

Respond with ONLY the JSON object, no other text.`

export class FocusTrackerAgent implements Agent {
  code = 'focus_tracker' as const
  name = 'Focus Tracker'

  async getOpeningMessage(context: AgentContext): Promise<string> {
    const userContext = buildContextPrompt(context)
    const systemPrompt = FOCUS_TRACKER_SYSTEM_PROMPT.replace('{USER_CONTEXT}', userContext)
    
    // Check if we have previous focus info
    const previousFocus = context.profile?.current_focus?.label
    
    let customSystemPrompt = systemPrompt
    if (previousFocus) {
      customSystemPrompt += `\n\nNote: Last time they mentioned their focus was "${previousFocus}". Ask if that's still their main priority.`
    }
    
    const response = await createConversation(
      customSystemPrompt,
      [],
      { temperature: 0.8 }
    )
    
    if (previousFocus) {
      return response || `Hi ${context.userName}! Last time we talked, you were focused on "${previousFocus}". Is that still your main priority?`
    }
    
    return response || `Hi ${context.userName}! What's your main focus or priority at work right now?`
  }

  async processTurn(
    context: AgentContext,
    userMessage: string
  ): Promise<AgentTurnResult> {
    const userContext = buildContextPrompt(context)
    const systemPrompt = FOCUS_TRACKER_SYSTEM_PROMPT.replace('{USER_CONTEXT}', userContext)
    
    // Add the new user message to history
    const fullHistory = [
      ...context.conversationHistory,
      { role: 'user' as const, content: userMessage }
    ]
    
    // Check if we have enough information (at least 2 user messages)
    const shouldComplete = hasMinimumInfo(fullHistory, 2)
    
    if (shouldComplete) {
      // Try to extract data and wrap up
      const extractedData = await this.extractDataFromHistory(fullHistory, context.profile?.current_focus?.label)
      
      // Generate a closing message
      const closingResponse = await createConversation(
        systemPrompt + '\n\nThis is the final exchange. Thank them for the update and wish them well with their focus area.',
        fullHistory,
        { temperature: 0.8 }
      )
      
      return {
        message: closingResponse || "Thanks for the update! Good luck with your priorities.",
        isComplete: true,
        extractedData: extractedData ? { type: 'focus_tracker', data: extractedData } : undefined
      }
    }
    
    // Continue the conversation
    const response = await createConversation(
      systemPrompt,
      fullHistory,
      { temperature: 0.8 }
    )
    
    return {
      message: response || "How well are you able to stay focused on that priority?",
      isComplete: false,
      followUpHint: 'Ask about ability to focus or if priorities have shifted'
    }
  }

  async extractData(context: AgentContext): Promise<AgentOutput | null> {
    const data = await this.extractDataFromHistory(
      context.conversationHistory,
      context.profile?.current_focus?.label
    )
    if (data) {
      return { type: 'focus_tracker', data }
    }
    return null
  }

  private async extractDataFromHistory(
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    previousFocus?: string
  ): Promise<FocusTrackerOutput | null> {
    if (history.length < 2) return null
    
    const conversationText = formatConversationHistory(history)
    let prompt = EXTRACTION_PROMPT.replace('{CONVERSATION}', conversationText)
    
    if (previousFocus) {
      prompt += `\n\nNote: Their previous focus was "${previousFocus}". Use this to determine change_vs_last_time.`
    }
    
    const { parsed } = await createChatCompletion<FocusTrackerOutput>(
      'You are a data extraction assistant. Extract structured data from conversations.',
      prompt,
      { temperature: 0.2 }
    )
    
    if (parsed && parsed.current_focus_label) {
      return {
        current_focus_label: parsed.current_focus_label,
        current_focus_tags: Array.isArray(parsed.current_focus_tags) ? parsed.current_focus_tags : [],
        still_primary_focus: Boolean(parsed.still_primary_focus),
        focus_rating: Math.min(5, Math.max(1, parsed.focus_rating || 3)),
        change_vs_last_time: parsed.change_vs_last_time || 'same',
        reason: parsed.reason || 'No specific reason provided'
      }
    }
    
    return null
  }
}

export const focusTrackerAgent = new FocusTrackerAgent()
