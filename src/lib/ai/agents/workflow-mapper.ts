import { WorkflowMapperOutput } from '@/types/database'
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

const WORKFLOW_MAPPER_SYSTEM_PROMPT = `You are a friendly workplace assistant helping to understand someone's key workflows and processes.

Your goals:
1. Identify one specific workflow they regularly perform
2. Understand the steps involved in that workflow
3. Learn what tools and data sources they use
4. Keep the conversation brief and natural (2-3 exchanges max)

Guidelines:
- Be conversational and curious
- Ask one question at a time
- Focus on ONE workflow at a time (you can map others later)
- Use simple language, avoid process-mapping jargon
- Keep responses short (1-2 sentences + a question)
- If they mention multiple workflows, pick the most frequent one to explore

CONTEXT ABOUT THE USER:
{USER_CONTEXT}

Start by asking about a task or process they do regularly.`

const EXTRACTION_PROMPT = `Based on the conversation below, extract the following information about ONE workflow in JSON format:

{
  "workflow_name": "<short identifier for the workflow, e.g., 'weekly_report_generation'>",
  "display_label": "<human-readable name, e.g., 'Weekly Report Generation'>",
  "steps": ["<step 1>", "<step 2>", ...],
  "tools": ["<tool 1>", "<tool 2>", ...],
  "data_sources": ["<data source 1>", "<data source 2>", ...]
}

Conversation:
{CONVERSATION}

Respond with ONLY the JSON object, no other text.`

export class WorkflowMapperAgent implements Agent {
  code = 'workflow_mapper' as const
  name = 'Workflow Mapper'

  async getOpeningMessage(context: AgentContext): Promise<string> {
    const userContext = buildContextPrompt(context)
    const systemPrompt = WORKFLOW_MAPPER_SYSTEM_PROMPT.replace('{USER_CONTEXT}', userContext)
    
    const response = await createConversation(
      systemPrompt,
      [],
      { temperature: 0.8 }
    )
    
    return response || `Hi ${context.userName}! I'd like to understand your workflows better. What's a task or process you do regularly?`
  }

  async processTurn(
    context: AgentContext,
    userMessage: string
  ): Promise<AgentTurnResult> {
    const userContext = buildContextPrompt(context)
    const systemPrompt = WORKFLOW_MAPPER_SYSTEM_PROMPT.replace('{USER_CONTEXT}', userContext)
    
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
        systemPrompt + '\n\nThis is the final exchange. Thank them for walking through their workflow and mention you now have a good picture of it.',
        fullHistory,
        { temperature: 0.8 }
      )
      
      return {
        message: closingResponse || "Thanks for walking me through that workflow! I have a good picture of how it works now.",
        isComplete: true,
        extractedData: extractedData ? { type: 'workflow_mapper', data: extractedData } : undefined
      }
    }
    
    // Continue the conversation
    const response = await createConversation(
      systemPrompt,
      fullHistory,
      { temperature: 0.8 }
    )
    
    return {
      message: response || "That's helpful! What tools or systems do you use to complete that task?",
      isComplete: false,
      followUpHint: 'Ask about tools, steps, or data sources used'
    }
  }

  async extractData(context: AgentContext): Promise<AgentOutput | null> {
    const data = await this.extractDataFromHistory(context.conversationHistory)
    if (data) {
      return { type: 'workflow_mapper', data }
    }
    return null
  }

  private async extractDataFromHistory(
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<WorkflowMapperOutput | null> {
    if (history.length < 2) return null
    
    const conversationText = formatConversationHistory(history)
    const prompt = EXTRACTION_PROMPT.replace('{CONVERSATION}', conversationText)
    
    const { parsed } = await createChatCompletion<WorkflowMapperOutput>(
      'You are a data extraction assistant. Extract structured data from conversations.',
      prompt,
      { temperature: 0.2 }
    )
    
    if (parsed && parsed.workflow_name) {
      return {
        workflow_name: parsed.workflow_name,
        display_label: parsed.display_label || parsed.workflow_name,
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
        tools: Array.isArray(parsed.tools) ? parsed.tools : [],
        data_sources: Array.isArray(parsed.data_sources) ? parsed.data_sources : []
      }
    }
    
    return null
  }
}

export const workflowMapperAgent = new WorkflowMapperAgent()
