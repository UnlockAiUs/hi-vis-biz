/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CRITICAL: AI AGENTS - READ BEFORE MODIFYING                                   ║
 * ║ If you modify this file, you MUST update MASTER_PROJECT_CONTEXT.md            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * FILE: src/lib/ai/openai.ts
 * PURPOSE: OpenAI client singleton and helper functions
 * EXPORTS:
 *   - getOpenAIClient() - returns singleton OpenAI client
 *   - AI_CONFIG - default model configuration (gpt-4o-mini, temp 0.7, 1000 tokens)
 *   - createChatCompletion<T>(system, user, options) - single-turn with optional JSON parsing
 *   - createConversation(system, messages, options) - multi-turn conversation
 * ENV VARS: OPENAI_API_KEY (server-side only)
 */

import OpenAI from 'openai'

// OpenAI client singleton
let openaiClient: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }
    
    openaiClient = new OpenAI({
      apiKey,
    })
  }
  
  return openaiClient
}

// Default model configuration
export const AI_CONFIG = {
  model: 'gpt-4o-mini', // Cost-effective model for conversational tasks
  temperature: 0.7,
  maxTokens: 1000,
} as const

// Helper to create a chat completion with structured output
export async function createChatCompletion<T>(
  systemPrompt: string,
  userMessage: string,
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }
): Promise<{ content: string; parsed?: T }> {
  const client = getOpenAIClient()
  
  const response = await client.chat.completions.create({
    model: options?.model ?? AI_CONFIG.model,
    temperature: options?.temperature ?? AI_CONFIG.temperature,
    max_tokens: options?.maxTokens ?? AI_CONFIG.maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })
  
  const content = response.choices[0]?.message?.content ?? ''
  
  // Try to parse JSON from the response
  let parsed: T | undefined
  try {
    // Look for JSON in the response (between ```json and ```, or just parse directly)
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    const jsonString = jsonMatch ? jsonMatch[1] : content
    parsed = JSON.parse(jsonString)
  } catch {
    // Response is not valid JSON, that's okay
    parsed = undefined
  }
  
  return { content, parsed }
}

// Helper for multi-turn conversations
export async function createConversation(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }
): Promise<string> {
  const client = getOpenAIClient()
  
  const response = await client.chat.completions.create({
    model: options?.model ?? AI_CONFIG.model,
    temperature: options?.temperature ?? AI_CONFIG.temperature,
    max_tokens: options?.maxTokens ?? AI_CONFIG.maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  })
  
  return response.choices[0]?.message?.content ?? ''
}
