/**
 * Translation Utilities for Multi-Language Support
 * 
 * AI AGENT INSTRUCTIONS:
 * - Use translateToEnglish() for non-English user inputs
 * - Use getLanguageDisplayName() for UI display
 * - Always store both original and translated text
 * - Check org.allow_translation before translating
 * 
 * @see MASTER_PROJECT_CONTEXT.md for architecture
 * @see FEATURE_UPDATE_EXECUTION_PLAN.md Phase 4 for requirements
 */

import { getOpenAIClient } from '@/lib/ai/openai'

// Supported language codes (ISO 639-1)
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
] as const

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code']

export interface TranslationResult {
  translatedText: string
  confidence: number
  detectedLanguage?: string
}

export interface LanguageConfig {
  userLanguage: LanguageCode
  allowTranslation: boolean
}

/**
 * Get display name for a language code
 */
export function getLanguageDisplayName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code)
  return lang ? lang.name : code.toUpperCase()
}

/**
 * Get native name for a language code
 */
export function getLanguageNativeName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code)
  return lang ? lang.nativeName : code.toUpperCase()
}

/**
 * Check if a language code is supported
 */
export function isLanguageSupported(code: string): boolean {
  return SUPPORTED_LANGUAGES.some(l => l.code === code)
}

/**
 * Detect language of text using OpenAI
 */
export async function detectLanguage(text: string): Promise<string> {
  if (!text || text.trim().length < 3) {
    return 'en' // Default to English for very short text
  }

  try {
    const openai = getOpenAIClient()
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a language detection system. Respond with ONLY the ISO 639-1 language code (e.g., "en", "es", "fr"). No other text.'
        },
        {
          role: 'user',
          content: `Detect the language of this text: "${text.substring(0, 500)}"`
        }
      ],
      max_tokens: 5,
      temperature: 0
    })

    const detected = response.choices[0]?.message?.content?.trim().toLowerCase() || 'en'
    
    // Validate the detected code is supported
    return isLanguageSupported(detected) ? detected : 'en'
  } catch (error) {
    console.error('Language detection failed:', error)
    return 'en' // Default to English on error
  }
}

/**
 * Translate text to English using OpenAI
 */
export async function translateToEnglish(
  text: string,
  sourceLanguage?: string
): Promise<TranslationResult> {
  // If already English, return as-is
  if (sourceLanguage === 'en') {
    return {
      translatedText: text,
      confidence: 1.0,
      detectedLanguage: 'en'
    }
  }

  if (!text || text.trim().length === 0) {
    return {
      translatedText: text,
      confidence: 1.0,
      detectedLanguage: sourceLanguage || 'en'
    }
  }

  try {
    const openai = getOpenAIClient()
    
    // Detect language if not provided
    const detectedLanguage = sourceLanguage || await detectLanguage(text)
    
    // If detected as English, return original
    if (detectedLanguage === 'en') {
      return {
        translatedText: text,
        confidence: 1.0,
        detectedLanguage: 'en'
      }
    }

    const sourceLangName = getLanguageDisplayName(detectedLanguage)
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following ${sourceLangName} text to English. 
Preserve the original meaning, tone, and context as accurately as possible.
Respond with ONLY the English translation, no explanations or additional text.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 2000,
      temperature: 0.3
    })

    const translatedText = response.choices[0]?.message?.content?.trim() || text
    
    // Estimate confidence based on response quality
    // Higher confidence for longer, more complete translations
    const confidence = translatedText.length > 0 ? 0.9 : 0.5

    return {
      translatedText,
      confidence,
      detectedLanguage
    }
  } catch (error) {
    console.error('Translation failed:', error)
    return {
      translatedText: text, // Return original on error
      confidence: 0,
      detectedLanguage: sourceLanguage
    }
  }
}

/**
 * Translate text from English to target language
 */
export async function translateFromEnglish(
  text: string,
  targetLanguage: LanguageCode
): Promise<string> {
  // If target is English, return as-is
  if (targetLanguage === 'en') {
    return text
  }

  if (!text || text.trim().length === 0) {
    return text
  }

  try {
    const openai = getOpenAIClient()
    const targetLangName = getLanguageDisplayName(targetLanguage)
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following English text to ${targetLangName}.
Preserve the original meaning, tone, and context as accurately as possible.
Respond with ONLY the ${targetLangName} translation, no explanations or additional text.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 2000,
      temperature: 0.3
    })

    return response.choices[0]?.message?.content?.trim() || text
  } catch (error) {
    console.error('Translation failed:', error)
    return text // Return original on error
  }
}

/**
 * Get language instruction for AI agent system prompt
 */
export function getLanguageSystemPrompt(languageCode: LanguageCode): string {
  if (languageCode === 'en') {
    return '' // No special instruction needed for English
  }

  const langName = getLanguageDisplayName(languageCode)
  return `\n\nIMPORTANT: The user prefers to communicate in ${langName}. 
Please respond in ${langName} and ask questions in ${langName}.
Keep the conversation natural and friendly in ${langName}.`
}

/**
 * Process answer for storage - handles translation if needed
 */
export async function processAnswerForStorage(
  answerText: string,
  userLanguageCode: LanguageCode,
  allowTranslation: boolean
): Promise<{
  language_code: string
  answer_text: string // Original text
  translated_text_en: string | null
  translation_confidence: number | null
  was_translated: boolean
}> {
  // If English or translation not allowed, minimal processing
  if (userLanguageCode === 'en' || !allowTranslation) {
    return {
      language_code: userLanguageCode,
      answer_text: answerText,
      translated_text_en: userLanguageCode === 'en' ? answerText : null,
      translation_confidence: userLanguageCode === 'en' ? 1.0 : null,
      was_translated: false
    }
  }

  // Translate non-English text
  const translation = await translateToEnglish(answerText, userLanguageCode)

  return {
    language_code: translation.detectedLanguage || userLanguageCode,
    answer_text: answerText,
    translated_text_en: translation.translatedText,
    translation_confidence: translation.confidence,
    was_translated: true
  }
}

/**
 * Get the English text for analytics (uses translation if available)
 */
export function getEnglishTextForAnalytics(
  answerText: string,
  translatedTextEn: string | null
): string {
  return translatedTextEn || answerText
}
