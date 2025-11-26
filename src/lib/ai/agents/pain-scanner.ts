import { PainScannerOutput } from '@/types/database'
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

const PAIN_SCANNER_SYSTEM_PROMPT = `You are a friendly workplace assistant helping to identify pain points and friction in someone's work.

Your goals:
1. Identify a specific pain point or frustration they experience
2. Understand which workflow or tool is causing the issue
3. Gauge how severe and frequent the problem is
4. Keep the conversation brief and natural (2-3 exchanges max)

Guidelines:
- Be empathetic and understanding
- Ask one question at a time
- Focus on ONE pain point at a time
- Don't be negative - frame it as understanding challenges to help
- Keep responses short (1-2 sentences + a question)
- If they mention multiple issues, explore the most impactful one

CONTEXT ABOUT THE USER:
{USER_CONTEXT}

Start by asking if there's anything in their day-to-day work that's frustrating or takes longer than it should.`

const EXTRACTION_PROMPT = `Based on the conversation below, extract the following information about ONE pain point in JSON format:

{
  "workflow_ref": "<the workflow or process where the pain occurs>",
  "tool_ref": "<the tool or system causing issues, if any>",
  "pain_rating": <1-5 where 1=minor annoyance, 5=major blocker>,
  "reason": "<brief description of the pain point>",
  "frequency": "<'daily', 'weekly', 'monthly', or 'occasionally'>",
  "impact": "<'low', 'medium', or 'high' based on how much it affects their work>"
}

Conversation:
{CONVERSATION}

Respond with ONLY the JSON object, no other text.`

export class PainScannerAgent implements Agent {
  code = 'pain_scanner' as const
  name = 'Pain Scanner'

  async getOpeningMessage(context: AgentContext): Promise<string> {
    const userContext = buildContextPrompt(context)
    const systemPrompt = PAIN_SCANNER_SYSTEM_PROMPT.replace('{USER_CONTEXT}', userContext)
    
    const response = await createConversation(
      systemPrompt,
      [],
      { temperature: 0.8 }
    )
    
    return response || `Hi ${context.userName}! Is there anything in your day-to-day work that's frustrating or takes longer than it should?`
  }

  async processTurn(
    context: AgentContext,
    userMessage: string
  ): Promise<AgentTurnResult> {
    const userContext = buildContextPrompt(context)
    const systemPrompt = PAIN_SCANNER_SYSTEM_PROMPT.replace('{USER_CONTEXT}', userContext)
    
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
        systemPrompt + '\n\nThis is the final exchange. Thank them for sharing and acknowledge that understanding these challenges helps improve things.',
        fullHistory,
        { temperature: 0.8 }
      )
      
      return {
        message: closingResponse || "Thanks for sharing that! Understanding these challenges helps us figure out how to improve things.",
        isComplete: true,
        extractedData: extractedData ? { type: 'pain_scanner', data: extractedData } : undefined
      }
    }
    
    // Continue the conversation
    const response = await createConversation(
      systemPrompt,
      fullHistory,
      { temperature: 0.8 }
    )
    
    return {
      message: response || "That sounds frustrating. How often does this come up for you?",
      isComplete: false,
      followUpHint: 'Ask about frequency, severity, or which tools are involved'
    }
  }

  async extractData(context: AgentContext): Promise<AgentOutput | null> {
    const data = await this.extractDataFromHistory(context.conversationHistory)
    if (data) {
      return { type: 'pain_scanner', data }
    }
    return null
  }

  private async extractDataFromHistory(
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<PainScannerOutput | null> {
    if (history.length < 2) return null
    
    const conversationText = formatConversationHistory(history)
    const prompt = EXTRACTION_PROMPT.replace('{CONVERSATION}', conversationText)
    
    const { parsed } = await createChatCompletion<PainScannerOutput>(
      'You are a data extraction assistant. Extract structured data from conversations.',
      prompt,
      { temperature: 0.2 }
    )
    
    if (parsed && parsed.reason) {
      return {
        workflow_ref: parsed.workflow_ref || 'general',
        tool_ref: parsed.tool_ref || 'unknown',
        pain_rating: Math.min(5, Math.max(1, parsed.pain_rating || 3)),
        reason: parsed.reason,
        frequency: parsed.frequency || 'occasionally',
        impact: parsed.impact || 'medium'
      }
    }
    
    return null
  }
}

export const painScannerAgent = new PainScannerAgent()
